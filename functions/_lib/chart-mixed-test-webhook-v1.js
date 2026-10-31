/* Invoked only by signature-verified unified Stripe TEST endpoint.
 * Canonical Stripe objects + private order records establish charge and ownership.
 */
import {OFFERS,config,db,stripe,verifyPrice,validId} from './chart-cash-test-v1.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=()=>{throw Error('MIXED_PAYMENT_RECONCILIATION_REQUIRED')};
async function order(c,id){
 const rows=await db(c,'crownlight_chart_mixed_test_v1?select=*&upgrade_id=eq.'+encodeURIComponent(id)+'&limit=1');
 if(rows?.length!==1)fail();
 return rows[0];
}
async function apply(c,o,event,kind,session=null,pi=null){
 const r=await db(c,'rpc/chart_mixed_test_apply_v1',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
  p_upgrade:o.upgrade_id,p_kind:kind,p_event:event.id,p_session:session,p_intent:pi})});
 if(r?.ok!==true)fail();return true;
}
export async function acceptChartMixedTestEvent(event,env){
 const obj=event.data?.object;
 const sessionTypes=new Set(['checkout.session.completed','checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed','checkout.session.expired']);
 if(sessionTypes.has(event.type)){
  if(!obj?.metadata?.chart_mixed_test_id)return false;
  if(!validId(obj.id,'cs_test'))fail();
  const s=await stripe(env,'checkout/sessions/'+encodeURIComponent(obj.id));
  const m=s.metadata||{};
  if(!UUID.test(m.chart_mixed_test_id)||!UUID.test(m.chart_mixed_test_user)||
   !Object.hasOwn(OFFERS,m.chart_mixed_test_sku)||obj.id!==s.id||s.livemode!==false||
   s.client_reference_id!==m.chart_mixed_test_id)fail();
  const c=config(env),o=await order(c,m.chart_mixed_test_id),offer=OFFERS[m.chart_mixed_test_sku];
  if(o.user_id!==m.chart_mixed_test_user||o.sku!==m.chart_mixed_test_sku||
   o.original_cents!==offer.amountCents||o.cash_cents<50||
   o.original_cents!==o.cash_cents+o.discount_cents||o.lumens*7<o.discount_cents||
   o.stripe_session_id!==s.id||s.amount_subtotal!==o.cash_cents||
   s.amount_total!==o.cash_cents||s.currency!=='usd')fail();
  if(event.type==='checkout.session.expired'){
   if(s.status!=='expired'||s.payment_status==='paid')fail();
   return apply(c,o,event,'expired',s.id);
  }
  if(event.type==='checkout.session.async_payment_failed'){
   if(s.payment_status==='paid')fail();
   return apply(c,o,event,'expired',s.id);
  }
  if(s.payment_status!=='paid')return true;
  if(s.status!=='complete'||s.mode!=='payment'||!validId(s.payment_intent,'pi'))fail();
  const [lines,pi,item,upgradeRows]=await Promise.all([
   stripe(env,'checkout/sessions/'+encodeURIComponent(s.id)+'/line_items?limit=2'),
   stripe(env,'payment_intents/'+encodeURIComponent(s.payment_intent)),
   verifyPrice(env,o.sku),
   db(c,'crownlight_chart_cash_upgrades_v1?select=id,user_id,sku,state,stripe_price_id,amount_cents&id=eq.'+encodeURIComponent(o.upgrade_id)+'&limit=1')
  ]);
  const line=lines.data?.[0],upgrade=upgradeRows?.[0];
  if(lines.data?.length!==1||lines.has_more||line.quantity!==1||
   line.price?.product!==item.product_id||line.price?.unit_amount!==o.cash_cents||
   line.price?.currency!=='usd'||line.amount_subtotal!==o.cash_cents||
   upgrade?.user_id!==o.user_id||upgrade?.sku!==o.sku||
   upgrade?.stripe_price_id!==item.price_id||upgrade?.amount_cents!==o.original_cents||
   pi.id!==s.payment_intent||pi.livemode!==false||pi.status!=='succeeded'||
   pi.currency!=='usd'||pi.amount_received!==o.cash_cents||
   pi.metadata?.chart_mixed_test_id!==o.upgrade_id||
   pi.metadata?.chart_mixed_test_user!==o.user_id||
   pi.metadata?.chart_mixed_test_sku!==o.sku)fail();
  if(['active','refunded','disputed'].includes(o.status)&&o.stripe_payment_intent_id===pi.id)return true;
  return apply(c,o,event,'paid',s.id,pi.id);
 }
 if(event.type!=='charge.refunded'&&event.type!=='charge.dispute.created')return false;
 const chargeId=event.type==='charge.refunded'?obj?.id:obj?.charge;
 if(!validId(chargeId,'ch'))return false;
 const charge=await stripe(env,'charges/'+encodeURIComponent(chargeId));
 if(!validId(charge.payment_intent,'pi'))return false;
 const pi=await stripe(env,'payment_intents/'+encodeURIComponent(charge.payment_intent));
 const m=pi.metadata||{};
 if(!m.chart_mixed_test_id)return false;
 if(!UUID.test(m.chart_mixed_test_id)||!UUID.test(m.chart_mixed_test_user)||
  !Object.hasOwn(OFFERS,m.chart_mixed_test_sku)||pi.livemode!==false||charge.livemode!==false)fail();
 const c=config(env),o=await order(c,m.chart_mixed_test_id);
 if(o.user_id!==m.chart_mixed_test_user||o.sku!==m.chart_mixed_test_sku||
  o.stripe_payment_intent_id!==pi.id||charge.amount!==o.cash_cents)fail();
 if(event.type==='charge.refunded'){
  if(charge.amount_refunded<charge.amount)return true;
  return apply(c,o,event,'refunded',null,pi.id);
 }
 return apply(c,o,event,'disputed',null,pi.id);
}
