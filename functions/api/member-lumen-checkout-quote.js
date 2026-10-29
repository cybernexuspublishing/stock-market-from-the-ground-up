/* Read-only, member-specific Lumen price preview for the unified Checkout.
 * Never creates a payment, reserves credits, or grants an entitlement.
 * Source prices are registered product prices, NOT client-supplied numbers.
 * CASH+LUMENS CHECKOUT MUST NOT BE ACTIVATED BY THIS QUOTE ENDPOINT.
 */
import {memberIdentity} from './member-tool-access.js';
import {previewLumenDiscount,lumenDiscountPolicy} from '../_lib/lumen-discount-policy-v1.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const out=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
const error=(message,status=400)=>Object.assign(new Error(message),{status});
const skuPattern=/^(?:addon|book|course|feature|membership|plan|tool):[A-Z0-9_-]{2,90}$/;
const kinds=Object.freeze({addon:'addon',book:'digital_book',course:'digital_course',
 feature:'feature',membership:'membership',plan:'subscription',tool:'digital_tool'});
const headers=key=>({apikey:key,accept:'application/json','content-type':'application/json',
 ...(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)?{authorization:'Bearer '+key}:{})});
async function get(c,path,body){
 const r=await fetch(c.base+'/rest/v1/'+path,{cache:'no-store',method:body?'POST':'GET',
  headers:headers(c.secret),body:body?JSON.stringify(body):undefined});
 if(!r.ok)throw error('Pricing or wallet service unavailable.',503);
 return r.json();
}
function eligibleStatus(row,sku){
 // A registry row is NOT proof that the site has released the product.
 return row?.visible===true&&row?.sale_ready===true&&row.sku===sku&&
  ['for_sale','selling','published'].includes(row.status);
}
export async function onRequestGet({request,env}){
 try{
  const u=new URL(request.url),sku=u.searchParams.get('sku')||'';
  const amount=u.searchParams.get('lumens')??'0';
  if(!skuPattern.test(sku)||!/^\d{1,9}$/.test(amount))
   throw error('An approved product and a nonnegative whole-Lumen amount are required.');
  const desired=Number(amount);
  if(!Number.isSafeInteger(desired))throw error('Invalid Lumen amount.');
  const {userId,config:c}=await memberIdentity(env,request);
  const uid=encodeURIComponent(userId),enc=encodeURIComponent(sku);
  const [profiles,flags,roles,products,registered,wallet,settings]=await Promise.all([
   get(c,'profiles?select=account_kind,deleted_at&id=eq.'+uid+'&limit=1'),
   get(c,'admin_user_flags?select=status&user_id=eq.'+uid+'&limit=20'),
   get(c,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+uid+'&limit=30'),
   get(c,'gu_storefront_items_v014174?select=sku,display_name,status,sale_ready,visible&sku=eq.'+enc+'&limit=1'),
   get(c,'gu_owner_stripe_registry_v1?select=sku,amount_cents,currency,billing_interval&sku=eq.'+enc+'&limit=1'),
   get(c,'rpc/groundup_question_pass_summary',{p_user_id:userId}),
   get(c,'gu_lumen_value_settings_v1?select=active_cents,mixed_checkout_enabled&singleton=eq.true&limit=1')
  ]);
  if(profiles?.length!==1||profiles[0].account_kind!=='member'||profiles[0].deleted_at!=null||
   flags?.some(x=>['suspended','restricted'].includes(String(x?.status||'').toLowerCase()))||
   roles?.some(x=>x?.role_code==='SHOWCASE_VIEWER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now())))
   throw error('Member account is not eligible for purchase.',403);
  const registeredItem=registered?.[0],item=products?.[0];
  if(!registeredItem||!eligibleStatus(item,sku)||
   registeredItem.sku!==sku||registeredItem.currency!=='usd'||
   !Number.isSafeInteger(registeredItem.amount_cents)||registeredItem.amount_cents<=0)
   throw error('This product has no verified released sale price.',409);
  const cents=settings?.[0]?.active_cents;
  if(!Number.isSafeInteger(cents)||cents<1||cents>100)
   throw error('Lumen value is temporarily unavailable.',503);
  const balance=wallet?.available;
  if(!Number.isSafeInteger(balance)||balance<0||balance>1000000000)
   throw error('Lumen wallet balance could not be verified.',503);
  const owner=roles?.some(x=>x?.role_code==='OWNER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now()));
  const kind=kinds[sku.split(':')[0]];
  let included=!!owner;
  if(!included&&sku.startsWith('tool:')){
   const result=await get(c,'rpc/user_has_tool_access',{target_user:userId,target_tool:sku.slice(5)});
   if(typeof result!=='boolean')throw error('Current entitlement could not be verified.',503);
   included=result;
  }
  if(included)return out({ok:true,sku,name:item.display_name,alreadyIncluded:true,
   unitValueCents:cents,availableLumens:balance,eligibleNetCents:0,lumensApplied:0,
   discountCents:0,cashDueCents:0,remainingLumens:balance,
   checkoutDiscountActive:false,notice:'This program is already included. No additional purchase is required.'});
  const quote=previewLumenDiscount({eligibleNetCents:registeredItem.amount_cents,
   availableLumens:balance,requestedLumens:desired,productKind:kind},{...lumenDiscountPolicy,denominationCents:cents});
  if(!quote.eligible)throw error('This item is excluded from Lumen discounts.',409);
  return out({ok:true,sku,name:item.display_name,alreadyIncluded:false,
   currency:'USD',billingInterval:registeredItem.billing_interval,
   priceCents:registeredItem.amount_cents,unitValueCents:cents,
   availableLumens:balance,requestedLumens:desired,
   maxLumensUsable:Math.min(balance,Math.ceil(registeredItem.amount_cents/cents)),
   lumensApplied:quote.appliedLumens,discountCents:quote.discountCents,
   cashDueCents:quote.remainingSubtotalCents,remainingLumens:quote.remainingLumens,
   fullyCovered:quote.fullyCovered,checkoutDiscountActive:false,
   cashPaymentSupported:quote.remainingSubtotalCents===0||quote.remainingSubtotalCents>=50,
   minimumCashChargeCents:50,
   renewalNotice:registeredItem.billing_interval!=='one_time'?
     'Credits apply only to the current purchase price in this preview. Future automatic renewals are not discounted without separate authorization.':null,
   exclusions:'Shipping, taxes and other separately assessed amounts are not included in this preliminary subtotal.',
   notice:'Read-only illustration. Select an amount now; cash+Lumen checkout is not activated until an atomic wallet reservation and verified provider payment can be reconciled.'});
 }catch(e){const status=[400,401,403,409,503].includes(e?.status)?e.status:503;
  return out({ok:false,error:e.message||'Member quote unavailable.'},status)}
}
export const onRequest=({request,env})=>request.method==='GET'?onRequestGet({request,env}):
 out({ok:false,error:'Read-only quote; no payment or wallet deduction.'},405);
