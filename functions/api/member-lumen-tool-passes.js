/* Full Lumen-only fixed-term tool purchases, no Stripe payment. An active
 * server-priced offer and an atomic Supabase RPC are mandatory for redemption.
 * Draft offers are never visible or redeemable as live purchases.
 */
import {memberIdentity} from './member-tool-access.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const out=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:H});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sku=/^[A-Z][A-Z0-9_]{2,79}$/;
const secretHeaders=key=>({apikey:key,accept:'application/json','content-type':'application/json',
 ...(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)?{authorization:'Bearer '+key}:{})});
async function rest(actor,path,body){
 const r=await fetch(actor.config.base+'/rest/v1/'+path,{method:body?'POST':'GET',
  headers:secretHeaders(actor.config.secret),body:body?JSON.stringify(body):undefined,cache:'no-store'});
 if(!r.ok)throw Error('Lumen tool service temporarily unavailable');
 return await r.json();
}
export async function onRequest({request,env}){
 if(!['GET','POST'].includes(request.method))return out({ok:false,error:'METHOD_NOT_ALLOWED'},405);
 try{
  const actor=await memberIdentity(env,request),uid=encodeURIComponent(actor.userId);
  const [profiles,flags,roles]=await Promise.all([
   rest(actor,'profiles?select=account_kind,deleted_at&id=eq.'+uid+'&limit=1'),
   rest(actor,'admin_user_flags?select=status&user_id=eq.'+uid+'&limit=20'),
   rest(actor,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+uid+'&limit=30')
  ]);
  if(profiles?.[0]?.account_kind!=='member'||profiles[0]?.deleted_at!=null||
   flags?.some(f=>['suspended','restricted'].includes(String(f?.status||'').toLowerCase()))||
   roles?.some(r=>r.role_code==='SHOWCASE_VIEWER'&&(!r.expires_at||Date.parse(r.expires_at)>Date.now())))
   return out({ok:false,error:'NOT_ELIGIBLE'},403);
  const isOwner=roles?.some(r=>r.role_code==='OWNER'&&(!r.expires_at||Date.parse(r.expires_at)>Date.now()));
  if(request.method==='GET'){
   const [offers,policies]=await Promise.all([
    rest(actor,'gu_lumen_tool_offers_v1?select=offer_code,tool_code,duration_days,price_cents,custom_lumens_cost,redemption_lumens_cost,state&state=eq.active&order=tool_code.asc,duration_days.asc'),
    rest(actor,'gu_lumen_value_settings_v1?select=active_cents&singleton=eq.true&limit=1')
   ]);
   const cents=policies?.[0]?.active_cents;
   if(!Number.isSafeInteger(cents)||cents<1||cents>100)
    return out({ok:false,error:'VALUATION_UNAVAILABLE'},503);
   return out({ok:true,ownerIncluded:!!isOwner,offers:(offers||[]).filter(o=>
    o&&sku.test(o.offer_code)&&Number.isSafeInteger(o.price_cents)&&o.price_cents>0&&
    Number.isSafeInteger(o.redemption_lumens_cost)&&o.redemption_lumens_cost>0&&
    (o.custom_lumens_cost!=null||o.redemption_lumens_cost===Math.ceil(o.price_cents/cents))).map(o=>({
    code:o.offer_code,tool:o.tool_code,durationDays:o.duration_days,priceCents:o.price_cents,
    costLumens:o.redemption_lumens_cost,priceMode:o.custom_lumens_cost==null?'automatic':'custom',nonRecurring:true
   })),unitValueCents:cents});
  }
  if(request.headers.get('origin')!==new URL(request.url).origin)
   return out({ok:false,error:'ORIGIN_MISMATCH'},403);
  const raw=await request.text();if(new TextEncoder().encode(raw).byteLength>1024)
   return out({ok:false,error:'INVALID_REQUEST'},413);
  let b;try{b=JSON.parse(raw)}catch{return out({ok:false,error:'INVALID_REQUEST'},400)}
  if(!b||typeof b.offerCode!=='string'||!sku.test(b.offerCode)||
   typeof b.requestId!=='string'||!uuid.test(b.requestId)||
   !Number.isSafeInteger(b.expectedCostLumens)||b.expectedCostLumens<1||
   b.expectedCostLumens>10000000)return out({ok:false,error:'INVALID_REQUEST'},400);
  if(isOwner)return out({ok:false,error:'ALREADY_INCLUDED_OWNER'},409);
  const result=await rest(actor,'rpc/gu_lumen_tool_redeem_v1',{
   p_user_id:actor.userId,p_offer_code:b.offerCode,p_request_id:b.requestId,
   p_expected_cost:b.expectedCostLumens
  });
  return out(result,result?.ok===true?200:
   result?.error==='INSUFFICIENT_LUMENS'?402:
   result?.error==='ALREADY_INCLUDED'?409:
   result?.error==='PRICE_CHANGED'?409:403);
 }catch(e){return out({ok:false,error:e?.status===401?'AUTH_REQUIRED':'LUMEN_TOOL_SERVICE_UNAVAILABLE'},
  e?.status===401?401:503)}
}
