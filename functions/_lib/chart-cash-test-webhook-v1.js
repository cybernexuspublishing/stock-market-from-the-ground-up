/* Called only after the unified TEST webhook verifies Stripe's signature. */
import {OFFERS,config,db,stripe,verifyPrice,validId} from './chart-cash-test-v1.js';
const uuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(x||''));
const fail=()=>{throw Error('CHART_TEST_PAYMENT_UNVERIFIED')};
async function record(c,id){
 const values=await db(c,'crownlight_chart_cash_upgrades_v1?select=*&id=eq.'+encodeURIComponent(id)+'&limit=1');
 if(values?.length!==1)fail();return values[0];
}
async function apply(c,event,row,kind,session=null,pi=null){
 const result=await db(c,'rpc/crownlight_chart_cash_apply_test_v1',{method:'POST',
  headers:{'content-type':'application/json'},body:JSON.stringify({p_upgrade:row.id,p_event:event.id,
   p_kind:kind,p_session:session,p_payment_intent:pi,p_price:row.stripe_price_id})});
 if(result?.ok!==true)fail();return true;
}
export async function acceptChartCashTestEvent(event,env){
 const obj=event.data?.object;
 if(['checkout.session.completed','checkout.session.async_payment_succeeded',
      'checkout.session.expired'].includes(event.type)){
  // Event metadata only selects a candidate; canonical Stripe objects and
  // database binding below still establish payment and ownership.
  if(!obj?.metadata?.chart_cash_test_id)return false;
  const c=config(env);
  if(!validId(obj?.id,'cs_test'))return false;
  const s=await stripe(env,'checkout/sessions/'+encodeURIComponent(obj.id));
  if(!s.metadata?.chart_cash_test_id)return false;
  const m=s.metadata;
  if(!uuid(m.chart_cash_test_id)||!uuid(m.chart_cash_test_user)||
     !Object.hasOwn(OFFERS,m.chart_cash_test_sku)||s.id!==obj.id||s.livemode!==false||
     s.client_reference_id!==m.chart_cash_test_id)fail();
  const row=await record(c,m.chart_cash_test_id),offer=OFFERS[m.chart_cash_test_sku];
  if(row.user_id!==m.chart_cash_test_user||row.sku!==m.chart_cash_test_sku||
     row.tier!==offer.tier||row.amount_cents!==offer.amountCents||
     row.stripe_session_id!==s.id)fail();
  if(event.type==='checkout.session.expired'){
   if(s.status!=='expired')fail();
   return apply(c,event,row,'expired',s.id);
  }
  if(s.payment_status!=='paid')return true;
  if(s.status!=='complete'||s.mode!=='payment'||s.currency!=='usd'||
     s.amount_subtotal!==offer.amountCents||!validId(s.payment_intent,'pi'))fail();
  const item=await verifyPrice(env,row.sku);
  const [lines,pi]=await Promise.all([
   stripe(env,'checkout/sessions/'+encodeURIComponent(s.id)+'/line_items?limit=2'),
   stripe(env,'payment_intents/'+encodeURIComponent(s.payment_intent))]);
  if(lines.data?.length!==1||lines.has_more===true||lines.data[0].price?.id!==item.price_id||
     lines.data[0].quantity!==1||lines.data[0].amount_subtotal!==offer.amountCents||
     pi.id!==s.payment_intent||pi.livemode!==false||pi.status!=='succeeded'||
     pi.currency!=='usd'||pi.amount_received<offer.amountCents||
     pi.metadata?.chart_cash_test_id!==row.id||pi.metadata?.chart_cash_test_user!==row.user_id||
     pi.metadata?.chart_cash_test_sku!==row.sku)fail();
  return apply(c,event,row,'paid',s.id,pi.id);
 }
 if(!['charge.refunded','charge.dispute.created'].includes(event.type))return false;
 const c=config(env);
 const chargeId=event.type==='charge.refunded'?obj?.id:obj?.charge;
 if(!validId(chargeId,'ch'))return false;
 const charge=await stripe(env,'charges/'+encodeURIComponent(chargeId));
 if(!validId(charge.payment_intent,'pi'))return false;
 const pi=await stripe(env,'payment_intents/'+encodeURIComponent(charge.payment_intent));
 const m=pi.metadata||{};
 if(!m.chart_cash_test_id)return false;
 if(!uuid(m.chart_cash_test_id)||!uuid(m.chart_cash_test_user)||
    !Object.hasOwn(OFFERS,m.chart_cash_test_sku)||pi.id!==charge.payment_intent||
    pi.livemode!==false||charge.livemode!==false)fail();
 const row=await record(c,m.chart_cash_test_id);
 if(row.user_id!==m.chart_cash_test_user||row.sku!==m.chart_cash_test_sku||
    row.stripe_payment_intent_id!==pi.id)fail();
 if(event.type==='charge.refunded'){
  if(Number(charge.amount_refunded)<Number(charge.amount))return true;
  return apply(c,event,row,'refunded',null,pi.id);
 }
 return apply(c,event,row,'disputed',null,pi.id);
}
