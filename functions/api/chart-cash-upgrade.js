/* Existing member commerce, TEST-only one-time Chart Studio upgrade. LIVE is absent. */
import {memberIdentity} from './member-tool-access.js';
import {crownlightChartEntitlement} from './chart-tier-access.js';
import {OFFERS,rank,config,db,stripe,catalog,verifyPrice,rows,validId} from '../_lib/chart-cash-test-v1.js';
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
const fail=(code,status)=>reply({ok:false,error:code},status);
const active=x=>x.state==='active'&&!x.revoked_at&&Number.isFinite(Date.parse(x.expires_at))&&Date.parse(x.expires_at)>Date.now();
async function context(env,request){
 const identity=await memberIdentity(env,request);
 const entitlement=await crownlightChartEntitlement(env,request);
 if(entitlement.eligible!==true)throw Object.assign(Error('INELIGIBLE_MEMBER'),{status:403});
 return {identity,entitlement,c:config(env)};
}
export async function onRequestGet({request,env}){
 try{
  const {identity,entitlement,c}=await context(env,request);
  const purchases=await rows(c,identity.userId);
  return reply({ok:true,tier:entitlement.tier,offers:Object.entries(OFFERS).map(([sku,o])=>({
   sku,...o,oneTime:true,renews:false,checkoutEnabled:env.CHART_STUDIO_TEST_CHECKOUT_ENABLED==='true',
   included:rank[entitlement.tier]>=rank[o.tier],
   activeUntil:purchases.find(p=>p.sku===sku&&active(p))?.expires_at||null
  }))});
 }catch(e){return fail(e.status===401?'SIGN_IN_REQUIRED':e.status===403?'INELIGIBLE_MEMBER':'CHART_UPGRADE_UNAVAILABLE',e.status||503)}
}
export async function onRequestPost({request,env}){
 try{
  if(env.CHART_STUDIO_TEST_CHECKOUT_ENABLED!=='true')return fail('TEST_CHECKOUT_DISABLED',503);
  const url=new URL(request.url);
  if(request.headers.get('origin')!==url.origin||
    request.headers.get('content-type')?.split(';')[0].toLowerCase()!=='application/json')
   return fail('INVALID_CHECKOUT_ORIGIN',403);
  const raw=await request.text();if(raw.length>2048)return fail('REQUEST_TOO_LARGE',413);
  let input;try{input=JSON.parse(raw)}catch{return fail('INVALID_REQUEST',400)}
  if(!input||typeof input!=='object'||Array.isArray(input)||!Object.hasOwn(OFFERS,input.sku))
   return fail('UNKNOWN_CHART_SKU',400);
  const {identity,entitlement,c}=await context(env,request),offer=OFFERS[input.sku];
  const listings=await db(c,'gu_storefront_items_v014174?select=sku,visible,status,sale_ready,price_label,duration_label&sku=eq.'+
   encodeURIComponent('addon:'+input.sku)+'&limit=1');
  const listing=listings?.[0];
  if(!listing||listing.visible!==true||listing.status!=='listed'||listing.sale_ready!==false||
     listing.price_label!=='$'+(offer.amountCents/100).toFixed(2)+' one-time'||
     listing.duration_label!=='30 days')return fail('CHART_CATALOG_MISMATCH',503);
  // A TEST charge must never become a public path to paid production access.
  // Only the pre-existing server-created noncommercial Chart QA identities
  // may open this TEST-only checkout. Production LIVE sale is a separate gate.
  const authHeaders={apikey:c.key,...(c.key.startsWith('sb_secret_')?{}:{authorization:'Bearer '+c.key})};
  const qaResponse=await fetch(c.base+'/auth/v1/admin/users/'+encodeURIComponent(identity.userId),
   {headers:authHeaders,cache:'no-store'});
  if(!qaResponse.ok)throw Error('CHART_QA_IDENTITY_UNAVAILABLE');
  const qaPayload=await qaResponse.json(),qaUser=qaPayload.user||qaPayload,meta=qaUser.app_metadata||{};
  // Existing QA batch or explicitly authorized James_Test, expiring automatically.
  // Authorization is read from server-controlled Auth Admin app_metadata only.
  const legacyQa=meta.smfgu_qa_only===true&&meta.noncommercial===true&&
    meta.qa_chart_batch==='SMFGU-CHART-3-20261028';
  // Narrow service-role-only permission is linked to this verified existing account.
  // No changes to its Free membership, Auth metadata, or user-controlled profile.
  const qaRows=identity.userId==='f42f9301-18e6-43a3-8531-32d371fd22c1'?
    await db(c,'crownlight_chart_cash_qa_allow_v1?select=purpose,expires_at,revoked_at&user_id=eq.'+
      encodeURIComponent(identity.userId)+'&limit=1'):[];
  const grant=qaRows?.[0];
  const jamesQa=identity.userId==='f42f9301-18e6-43a3-8531-32d371fd22c1'&&
    qaUser.email==='adissel89@gmail.com'&&grant?.purpose==='CHART_CASH_TEST_ONLY'&&
    !grant.revoked_at&&Number.isFinite(Date.parse(grant.expires_at))&&
    Date.parse(grant.expires_at)>Date.now()&&
    Date.parse(grant.expires_at)<=Date.parse('2026-11-02T00:00:00Z');
  if(qaUser.id!==identity.userId||!qaUser.email_confirmed_at||qaUser.deleted_at||
    !(legacyQa||jamesQa))return fail('NONCOMMERCIAL_QA_ONLY',403);
  if(rank[entitlement.tier]>=rank[offer.tier])return fail('TIER_ALREADY_INCLUDED',409);
  const existing=await rows(c,identity.userId);
  if(existing.some(x=>active(x)&&rank[x.tier]>=rank[offer.tier]))return fail('TIER_ALREADY_INCLUDED',409);
  const account=await stripe(env,'account');
  if(account.id!==env.STRIPE_TEST_ACCOUNT_ID)
   throw Error('CHART_TEST_ACCOUNT_MISMATCH');
  const item=await verifyPrice(env,input.sku);
  let pending=existing.find(x=>x.sku===input.sku&&x.state==='pending');
  if(!pending){
   const created=await db(c,'crownlight_chart_cash_upgrades_v1',{method:'POST',
    headers:{'content-type':'application/json',prefer:'return=representation'},
    body:JSON.stringify({user_id:identity.userId,sku:input.sku,tier:offer.tier,
     stripe_price_id:item.price_id,amount_cents:offer.amountCents})});
   pending=created?.[0];
  }
  if(!pending?.id||pending.stripe_price_id!==item.price_id)throw Error('CHART_PENDING_MISMATCH');
  let session;
  if(validId(pending.stripe_session_id,'cs_test')){
   session=await stripe(env,'checkout/sessions/'+encodeURIComponent(pending.stripe_session_id));
  }else{
   const params=new URLSearchParams({mode:'payment',
    'line_items[0][price]':item.price_id,'line_items[0][quantity]':'1',
    client_reference_id:pending.id,
    success_url:url.origin+'/purchase-thank-you.html?sku='+encodeURIComponent(input.sku),
    cancel_url:url.origin+'/store.html?chart_test_cancel=1',
    'metadata[chart_cash_test_id]':pending.id,
    'metadata[chart_cash_test_user]':identity.userId,
    'metadata[chart_cash_test_sku]':input.sku,
    'payment_intent_data[metadata][chart_cash_test_id]':pending.id,
    'payment_intent_data[metadata][chart_cash_test_user]':identity.userId,
    'payment_intent_data[metadata][chart_cash_test_sku]':input.sku});
   session=await stripe(env,'checkout/sessions',{method:'POST',
    headers:{'content-type':'application/x-www-form-urlencoded','idempotency-key':'chart-cash-test-'+pending.id},body:params});
   if(!validId(session.id,'cs_test'))throw Error('CHART_SESSION_INVALID');
   const bound=await db(c,'crownlight_chart_cash_upgrades_v1?id=eq.'+pending.id+'&state=eq.pending&stripe_session_id=is.null',{
    method:'PATCH',headers:{'content-type':'application/json',prefer:'return=representation'},
    body:JSON.stringify({stripe_session_id:session.id})});
   if(bound?.length!==1)throw Error('CHART_SESSION_BIND_FAILED');
  }
  const destination=new URL(session.url);
  if(session.livemode!==false||session.mode!=='payment'||session.status!=='open'||
    session.client_reference_id!==pending.id||destination.protocol!=='https:'||
    destination.hostname!=='checkout.stripe.com')throw Error('CHART_SESSION_INVALID');
  return reply({ok:true,testOnly:true,url:destination.href,sku:input.sku,amountCents:offer.amountCents});
 }catch(e){return fail(e.status===401?'SIGN_IN_REQUIRED':e.status===403?'INELIGIBLE_MEMBER':'CHART_TEST_CHECKOUT_UNAVAILABLE',e.status||503)}
}
