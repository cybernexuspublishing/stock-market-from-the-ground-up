/* Owner-only all-Store-item draft Lumen price rules.
 * Custom whole-Lumen item cost is NOT the same as a valuation change.
 * No GET/POST path activates checkout, debits credits or edits Stripe.
 */
import {memberIdentity} from './member-tool-access.js';
import {safeAdvancedConfig,privateJson} from '../_lib/advanced-tool-access-v014110.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const out=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:H});
const err=(s,message)=>Object.assign(new Error(message),{status:s});
const sku=/^(plan|book|tool|course|founding|addon|feature):[A-Z0-9_-]{2,100}$/;
async function owner(env,request){
 const actor=await memberIdentity(env,request),c=safeAdvancedConfig(env),id=encodeURIComponent(actor.userId);
 const [p,r,f]=await Promise.all([
  privateJson(c,'profiles?select=account_kind,deleted_at&id=eq.'+id+'&limit=1'),
  privateJson(c,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+id+'&limit=30'),
  privateJson(c,'admin_user_flags?select=status&user_id=eq.'+id+'&limit=20')
 ]);
 if(p?.[0]?.account_kind!=='member'||p[0]?.deleted_at!=null||
  !r?.some(x=>x.role_code==='OWNER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now()))||
  r.some(x=>x.role_code==='SHOWCASE_VIEWER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now()))||
  f?.some(x=>['suspended','restricted'].includes(String(x.status||'').toLowerCase())))
  throw err(403,'Owner authorization required.');
 return {c,userId:actor.userId};
}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))return out({ok:false,error:'METHOD_NOT_ALLOWED'},405);
  const actor=await owner(env,request);
  if(request.method==='GET'){
   const [items,pricing,policies]=await Promise.all([
    privateJson(actor.c,'gu_storefront_items_v014174?select=sku,category,display_name,status,visible,sale_ready&order=category.asc,display_name.asc&limit=150'),
    privateJson(actor.c,'gu_lumen_item_prices_v1?select=sku,custom_full_lumens,partial_discount_allowed,full_redemption_allowed,release_state,version,updated_at&limit=150'),
    privateJson(actor.c,'gu_lumen_value_settings_v1?select=active_cents,proposed_cents,revision&singleton=eq.true&limit=1')
   ]);
   const settings=policies?.[0];
   if(!Array.isArray(items)||!Array.isArray(pricing)||!settings||items.length>150)throw err(503,'Lumen catalog unavailable.');
   const bySku=new Map(pricing.map(x=>[x.sku,x]));
   const rows=items.filter(x=>sku.test(x.sku)).map(x=>({...x,
    rule:bySku.get(x.sku)||null}));
   return out({ok:true,items:rows,activeCents:settings.active_cents,
    proposedCents:settings.proposed_cents,
    explanation:'Custom full-item costs are separate from the active cents-per-Lumen checkout discount. All custom price records remain draft/review until independently accepted.'});
  }
  if(request.headers.get('origin')!==new URL(request.url).origin)throw err(403,'Origin mismatch.');
  const raw=await request.text();if(new TextEncoder().encode(raw).length>1600)throw err(413,'Too large.');
  let b;try{b=JSON.parse(raw)}catch{throw err(400,'Invalid JSON.')}
  if(!b||!sku.test(b.sku||'')||!Number.isSafeInteger(b.version)||b.version<1||
   (b.customFullLumens!==null&&
    (!Number.isSafeInteger(b.customFullLumens)||b.customFullLumens<1||b.customFullLumens>10000000))||
   typeof b.partialDiscountAllowed!=='boolean'||typeof b.fullRedemptionAllowed!=='boolean'||
   !['draft','review_required','retired'].includes(b.releaseState))
   throw err(400,'Invalid per-item price or revision.');
  const changed=await privateJson(actor.c,
   'gu_lumen_item_prices_v1?sku=eq.'+encodeURIComponent(b.sku)+'&version=eq.'+b.version,
   'PATCH',{custom_full_lumens:b.customFullLumens,
    partial_discount_allowed:b.partialDiscountAllowed,
    full_redemption_allowed:b.fullRedemptionAllowed,
    release_state:b.releaseState,version:b.version+1,
    updated_by:actor.userId,updated_at:new Date().toISOString()},
   'return=representation');
  if(!Array.isArray(changed)||changed.length!==1)throw err(409,'Item changed or missing. Refresh.');
  return out({ok:true,rule:changed[0],
   notice:'Draft cost saved and audited. No item was enabled for Lumen or cash checkout.'});
 }catch(e){const status=[400,401,403,405,409,413].includes(e?.status)?e.status:503;
  return out({ok:false,error:status===503?'Owner pricing temporarily unavailable.':e.message},status)}
}
