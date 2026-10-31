/* TEST ONLY: Lumen reservation, zero-cash settlement, or reduced Stripe checkout.
 * Only account-verified QA members; no production LIVE grant path.
 */
import {memberIdentity} from './member-tool-access.js';
import {crownlightChartEntitlement} from './chart-tier-access.js';
import {OFFERS,rank,config,db,stripe,verifyPrice,validId} from '../_lib/chart-cash-test-v1.js';
import {verifyChartMixedQa} from '../_lib/chart-mixed-test-guard-v1.js';
const respond=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private,no-store','x-content-type-options':'nosniff'}});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function rpc(c,name,values){return db(c,'rpc/'+name,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(values)})}
export async function onRequestPost({request,env}){
 try{
  if(env.CHART_MIXED_TEST_ENABLED!=='true'||env.CHART_STUDIO_TEST_CHECKOUT_ENABLED!=='true')return respond({ok:false,error:'MIXED_TEST_DISABLED'},503);
  const url=new URL(request.url);
  if(request.headers.get('origin')!==url.origin||request.headers.get('content-type')?.split(';')[0]!=='application/json')
   return respond({ok:false,error:'INVALID_ORIGIN'},403);
  const raw=await request.text();if(raw.length>2048)return respond({ok:false,error:'TOO_LARGE'},413);
  let input;try{input=JSON.parse(raw)}catch{return respond({ok:false,error:'INVALID_JSON'},400)}
  if(!input||typeof input!=='object'||Array.isArray(input))return respond({ok:false,error:'INVALID_REQUEST'},400);
  const identity=await memberIdentity(env,request),c=config(env);
  if(!await verifyChartMixedQa(env,identity.userId))return respond({ok:false,error:'NONCOMMERCIAL_QA_ONLY'},403);
  // Explicit QA switch of payment method. Never delete a Stripe session or
  // rewrite an unverified pending order; only the signed expiration webhook
  // may release its server-side pending entitlement.
  if(input.action==='cancel_card_pending'){
   if(!Object.hasOwn(OFFERS,input.sku))return respond({ok:false,error:'INVALID_SKU'},400);
   const candidates=await db(c,'crownlight_chart_cash_upgrades_v1?select=id,user_id,sku,state,stripe_session_id,stripe_price_id,amount_cents'+
    '&user_id=eq.'+encodeURIComponent(identity.userId)+'&sku=eq.'+encodeURIComponent(input.sku)+'&state=eq.pending&limit=2');
   if(!Array.isArray(candidates)||candidates.length!==1)return respond({ok:false,error:'NO_SINGLE_PENDING_CARD_CHECKOUT'},409);
   const pending=candidates[0];
   const mixed=await db(c,'crownlight_chart_mixed_test_v1?select=upgrade_id&upgrade_id=eq.'+encodeURIComponent(pending.id)+'&limit=1');
   if(mixed?.length)return respond({ok:false,error:'PENDING_MIXED_PAYMENT_REQUIRES_RECONCILIATION'},409);
   if(!validId(pending.stripe_session_id,'cs_test'))
    return respond({ok:false,error:'CARD_CHECKOUT_NOT_READY_TO_CANCEL'},409);
   const s=await stripe(env,'checkout/sessions/'+encodeURIComponent(pending.stripe_session_id));
   const offer=OFFERS[input.sku],m=s.metadata||{};
   if(s.id!==pending.stripe_session_id||s.livemode!==false||s.mode!=='payment'||
    s.client_reference_id!==pending.id||m.chart_cash_test_id!==pending.id||
    m.chart_cash_test_user!==identity.userId||m.chart_cash_test_sku!==input.sku||
    s.amount_subtotal!==offer.amountCents||pending.amount_cents!==offer.amountCents)
    return respond({ok:false,error:'CARD_CHECKOUT_PROVIDER_MISMATCH'},409);
   if(s.status==='complete'||s.payment_status==='paid'||s.payment_intent)
    return respond({ok:false,error:'PAYMENT_RECONCILIATION_REQUIRED'},409);
   if(s.status==='open'){
    const expired=await stripe(env,'checkout/sessions/'+encodeURIComponent(s.id)+'/expire',{method:'POST'});
    if(expired.id!==s.id||expired.livemode!==false||expired.status!=='expired')
     throw Error('CARD_CHECKOUT_EXPIRY_UNVERIFIED');
   }else if(s.status!=='expired')return respond({ok:false,error:'PAYMENT_RECONCILIATION_REQUIRED'},409);
   return respond({ok:true,testOnly:true,canceled:true,awaitingSignedWebhook:true,
    message:'The unpaid TEST checkout has expired. Its signed Stripe event must clear the pending order before switching to Lumens.'});
  }
  if(input.action==='refund_zero'){
   if(!UUID.test(input.upgradeId))return respond({ok:false,error:'INVALID_ORDER'},400);
   const orderRows=await db(c,'crownlight_chart_mixed_test_v1?select=*&upgrade_id=eq.'+
    encodeURIComponent(input.upgradeId)+'&user_id=eq.'+encodeURIComponent(identity.userId)+'&limit=1');
   const order=orderRows?.[0];
   if(!order||order.cash_cents!==0||order.status!=='active')return respond({ok:false,error:'ZERO_REFUND_NOT_AVAILABLE'},409);
   const result=await rpc(c,'chart_mixed_test_refund_zero_v1',{p_upgrade:order.upgrade_id,p_user:identity.userId});
   if(result?.ok!==true)return respond({ok:false,error:'ZERO_REFUND_FAILED'},503);
   return respond({ok:true,refundedLumens:result.refundedLumens||0,revoked:true});
  }
  if(input.action==='cancel'){
   if(!UUID.test(input.upgradeId))return respond({ok:false,error:'INVALID_ORDER'},400);
   const orders=await db(c,'crownlight_chart_mixed_test_v1?select=*&upgrade_id=eq.'+encodeURIComponent(input.upgradeId)+'&user_id=eq.'+encodeURIComponent(identity.userId)+'&limit=1');
   const order=orders?.[0];
   if(!order||order.status!=='bound'||!validId(order.stripe_session_id,'cs_test'))return respond({ok:false,error:'NOT_CANCELABLE'},409);
   const session=await stripe(env,'checkout/sessions/'+encodeURIComponent(order.stripe_session_id));
   if(session.status==='open'){
    const expired=await stripe(env,'checkout/sessions/'+encodeURIComponent(session.id)+'/expire',{method:'POST'});
    if(expired.status!=='expired')throw Error('STRIPE_EXPIRY_UNVERIFIED');
   }else if(session.status!=='expired')return respond({ok:false,error:'PAYMENT_RECONCILIATION_REQUIRED'},409);
   // Signed Stripe session.expired webhook releases the reserved credits.
   return respond({ok:true,canceled:true,releasePendingWebhook:true});
  }
  if(input.action!=='start'||!Object.hasOwn(OFFERS,input.sku)||!UUID.test(input.requestId)||
   !Number.isSafeInteger(input.lumens)||input.lumens<1)return respond({ok:false,error:'INVALID_SELECTION'},400);
  const offer=OFFERS[input.sku],entitlement=await crownlightChartEntitlement(env,request);
  if(entitlement.eligible!==true||rank[entitlement.tier]>=rank[offer.tier])return respond({ok:false,error:'ALREADY_INCLUDED_OR_INELIGIBLE'},409);
  const list=await db(c,'gu_storefront_items_v014174?select=sku,visible,status,sale_ready,price_label,duration_label&sku=eq.'+
   encodeURIComponent('addon:'+input.sku)+'&limit=1');
  const item=list?.[0];
  if(!item||item.visible!==true||item.status!=='listed'||item.sale_ready!==false||
   item.price_label!=='$'+(offer.amountCents/100).toFixed(2)+' one-time'||item.duration_label!=='30 days')
   return respond({ok:false,error:'TEST_PRODUCT_MISMATCH'},503);
  const [account,verified]=await Promise.all([stripe(env,'account'),verifyPrice(env,input.sku)]);
  if(account.id!==env.STRIPE_TEST_ACCOUNT_ID)throw Error('TEST_ACCOUNT_MISMATCH');
  const reservation=await rpc(c,'chart_mixed_test_reserve_v1',{p_user:identity.userId,p_sku:input.sku,
   p_request:input.requestId,p_lumens:input.lumens,p_price:verified.price_id});
  if(reservation?.ok!==true)return respond({ok:false,error:reservation?.error||'RESERVATION_REJECTED'},409);
  const upgradeId=reservation.upgradeId,cash=reservation.cashCents;
  if(!UUID.test(upgradeId)||!Number.isSafeInteger(cash))throw Error('INVALID_RESERVATION');
  if(cash===0){
   // One atomic database transaction activates access and retains the spent credits.
   const settled=await rpc(c,'chart_mixed_test_apply_v1',{p_upgrade:upgradeId,p_kind:'zero',p_event:'zero_'+upgradeId});
   if(settled?.ok!==true)return respond({ok:false,error:'ZERO_SETTLEMENT_PENDING_REVIEW'},503);
   return respond({ok:true,testOnly:true,fullyLumens:true,sku:input.sku,lumens:input.lumens,
    cashDueCents:0,upgradeId,verified:true,redirect:url.origin+'/purchase-thank-you.html?sku='+encodeURIComponent(input.sku)});
  }
  const orders=await db(c,'crownlight_chart_mixed_test_v1?select=*&upgrade_id=eq.'+encodeURIComponent(upgradeId)+'&user_id=eq.'+encodeURIComponent(identity.userId)+'&limit=1');
  const order=orders?.[0];
  if(!order||order.cash_cents!==cash||order.lumens!==input.lumens||order.sku!==input.sku)throw Error('RESERVATION_MISMATCH');
  let session;
  if(order.status==='bound'&&validId(order.stripe_session_id,'cs_test')){
   session=await stripe(env,'checkout/sessions/'+encodeURIComponent(order.stripe_session_id));
  }else if(order.status==='reserved'){
   const params=new URLSearchParams({mode:'payment',
    'line_items[0][price_data][currency]':'usd','line_items[0][price_data][product]':verified.product_id,
    'line_items[0][price_data][unit_amount]':String(cash),'line_items[0][quantity]':'1',
    client_reference_id:upgradeId,
    success_url:url.origin+'/purchase-thank-you.html?sku='+encodeURIComponent(input.sku),
    cancel_url:url.origin+'/store.html?chart_mixed_cancel='+encodeURIComponent(upgradeId),
    'metadata[chart_mixed_test_id]':upgradeId,'metadata[chart_mixed_test_user]':identity.userId,
    'metadata[chart_mixed_test_sku]':input.sku,
    'payment_intent_data[metadata][chart_mixed_test_id]':upgradeId,
    'payment_intent_data[metadata][chart_mixed_test_user]':identity.userId,
    'payment_intent_data[metadata][chart_mixed_test_sku]':input.sku
   });
   session=await stripe(env,'checkout/sessions',{method:'POST',headers:{
    'content-type':'application/x-www-form-urlencoded','idempotency-key':'chart-mixed-test-'+upgradeId},body:params});
   if(!validId(session.id,'cs_test')||session.livemode!==false||session.amount_subtotal!==cash||session.client_reference_id!==upgradeId)
    throw Error('STRIPE_SESSION_MISMATCH');
   const bound=await rpc(c,'chart_mixed_test_bind_v1',{p_upgrade:upgradeId,p_session:session.id});
   if(bound?.ok!==true)throw Error('SESSION_BIND_FAILED');
  }else return respond({ok:false,error:'ORDER_ALREADY_SETTLED'},409);
  if(session?.status!=='open'||session.payment_status==='paid'||session.mode!=='payment'||session.livemode!==false||
   session.client_reference_id!==upgradeId||session.amount_subtotal!==cash||
   new URL(session.url).hostname!=='checkout.stripe.com')throw Error('INVALID_STRIPE_CHECKOUT');
  return respond({ok:true,testOnly:true,fullyLumens:false,sku:input.sku,lumens:input.lumens,
    cashDueCents:cash,upgradeId,url:session.url});
 }catch(e){return respond({ok:false,error:e.status===401?'SIGN_IN_REQUIRED':'MIXED_TEST_CHECKOUT_UNAVAILABLE'},e.status===401?401:503)}
}
export function onRequestGet(){return respond({ok:false,error:'POST_ONLY'},405)}
