/* Signed GU39 Stripe TEST events for Crownlight mixed-payment QA.
 * The caller verifies HMAC, event timestamp and expected TEST Connect account.
 * This handler independently retrieves provider payment, price and session proof.
 * Every database effect is against isolated GU_MIXED_QA shadow tables only.
 */
import {config,db,stripe,assertTestSession,isUuid,QA_TEST_ACCOUNT,QA_PRODUCT}
 from './lumen-mixed-test-v1.js';
const id=(v,p)=>typeof v==='string'&&new RegExp('^'+p+'_[A-Za-z0-9_]{6,}$').test(v);
const pick=x=>typeof x==='string'?x:x?.id;
async function fetchIntent(c,uuid){
 if(!isUuid(uuid))return null;
 const rows=await db(c,'gu_mixed_qa_intents_v1?select=*&id=eq.'+encodeURIComponent(uuid)+'&limit=1');
 return rows?.[0]||null;
}
async function verifySession(c,sessionId,expectedIntent=null){
 if(!id(sessionId,'cs_test'))return null;
 const ss=await stripe(c,'checkout/sessions/'+encodeURIComponent(sessionId));
 const intentId=ss.metadata?.gu_mixed_qa_intent;
 if(!isUuid(intentId))return null;
 const i=await fetchIntent(c,intentId);
 if(!i||i.stripe_session_id!==ss.id||i.sku!=='tool:MIXED_CHECKOUT_QA'||
    (expectedIntent&&i.id!==expectedIntent)||
    !assertTestSession(ss,i,i.user_id))throw Error('MIXED_QA_SESSION_MISMATCH');
 const lines=await stripe(c,'checkout/sessions/'+encodeURIComponent(ss.id)+'/line_items?limit=2');
 const line=lines?.data?.[0];
 if(lines?.has_more!==false||lines?.data?.length!==1||line?.quantity!==1||
    pick(line.price?.product)!==QA_PRODUCT||line.price?.currency!=='usd'||
    line.price?.unit_amount!==i.cash_due_cents||line.amount_subtotal!==i.cash_due_cents)
   throw Error('MIXED_QA_LINE_PRICE_MISMATCH');
 return {s:ss,i};
}
async function verifiedPaid(c,sessionId){
 const found=await verifySession(c,sessionId);
 if(!found)return null;
 const {s,i}=found;
 const piId=pick(s.payment_intent);
 if(s.status!=='complete'||s.payment_status!=='paid'||!id(piId,'pi')||
    i.status!=='bound')throw Error('MIXED_QA_NOT_PAID');
 const pi=await stripe(c,'payment_intents/'+encodeURIComponent(piId));
 if(pi.id!==piId||pi.livemode!==false||pi.status!=='succeeded'||
    pi.currency!=='usd'||pi.amount_received!==i.cash_due_cents||
    pi.metadata?.gu_mixed_qa_intent!==i.id||
    pi.metadata?.gu_mixed_qa_member!==i.user_id)
   throw Error('MIXED_QA_PAYMENT_PROOF_MISMATCH');
 return {s,i,pi};
}
async function serviceEvent(c,payload){
 const result=await db(c,'rpc/gu_mixed_qa_reconcile_v1','POST',payload);
 if(result?.ok!==true)throw Error('MIXED_QA_SHADOW_RECONCILIATION_RETRY');
 return {body:result.duplicate?'MIXED_QA_DUPLICATE':'MIXED_QA_RECONCILED',status:200};
}
export async function handleLumenMixedTest(event,env){
 const obj=event?.data?.object||{},type=event?.type||'';
 if(!['checkout.session.completed','checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed','checkout.session.expired',
  'charge.refunded','charge.dispute.created'].includes(type))return null;
 const sid=type.startsWith('checkout.session.')?obj.id:null;
 if(sid&&(!id(sid,'cs_test')||!isUuid(obj.metadata?.gu_mixed_qa_intent)))return null;
 const c=config(env);
 if(!sid){
   const chargeId=type==='charge.refunded'?obj.id:pick(obj.charge);
   if(!id(chargeId,'ch'))return null;
   const charge=await stripe(c,'charges/'+encodeURIComponent(chargeId));
   if(charge.id!==chargeId||charge.livemode!==false||!id(pick(charge.payment_intent),'pi'))return null;
   const pi=await stripe(c,'payment_intents/'+encodeURIComponent(pick(charge.payment_intent)));
   if(pi.livemode!==false||!isUuid(pi.metadata?.gu_mixed_qa_intent))return null;
   const account=await stripe(c,'account');
   if(account.id!==QA_TEST_ACCOUNT)throw Error('MIXED_QA_WRONG_STRIPE_ACCOUNT');
   const result=await stripe(c,'checkout/sessions?payment_intent='+encodeURIComponent(pi.id)+'&limit=2');
   if(result?.data?.length!==1||result.has_more!==false)
     throw Error('MIXED_QA_AMBIGUOUS_PAYMENT');
   const pair=await verifySession(c,result.data[0].id,pi.metadata.gu_mixed_qa_intent);
   if(!pair||pick(pair.s.payment_intent)!==pi.id)return null;
   if(type==='charge.refunded'){
     if(charge.refunded!==true||charge.amount_refunded!==charge.amount)
       return {body:'MIXED_QA_PARTIAL_REFUND_REVIEW',status:200};
     return serviceEvent(c,{p_id:pair.i.id,p_event:event.id,p_action:'refunded',
       p_pi:pi.id,p_session:pair.s.id,p_paid:pair.i.cash_due_cents});
   }
   if(charge.disputed!==true)return {body:'MIXED_QA_DISPUTE_NOT_VERIFIED',status:200};
   return serviceEvent(c,{p_id:pair.i.id,p_event:event.id,p_action:'disputed',
     p_pi:pi.id,p_session:pair.s.id,p_paid:pair.i.cash_due_cents});
 }
 const account=await stripe(c,'account');
 if(account.id!==QA_TEST_ACCOUNT)throw Error('MIXED_QA_WRONG_STRIPE_ACCOUNT');
 if(type==='checkout.session.completed'||type==='checkout.session.async_payment_succeeded'){
   const s=await stripe(c,'checkout/sessions/'+encodeURIComponent(sid));
   if(s.payment_status!=='paid')return {body:'MIXED_QA_WAITING_PAYMENT',status:200};
   const proof=await verifiedPaid(c,sid);
   return serviceEvent(c,{p_id:proof.i.id,p_event:event.id,p_action:'paid',
     p_session:proof.s.id,p_pi:proof.pi.id,p_paid:proof.i.cash_due_cents});
 }
 const pair=await verifySession(c,sid);
 if(!pair)return null;
 if(type==='checkout.session.expired'){
  if(pair.s.status!=='expired'||pair.s.payment_status==='paid')
    throw Error('MIXED_QA_EXPIRE_PROOF_MISSING');
  return serviceEvent(c,{p_id:pair.i.id,p_event:event.id,p_action:'expired',
    p_session:sid});
 }
 if(pair.s.payment_status==='paid')throw Error('MIXED_QA_CANNOT_FAIL_PAID_SESSION');
 const piId=pick(pair.s.payment_intent);
 if(id(piId,'pi')){
  const pi=await stripe(c,'payment_intents/'+encodeURIComponent(piId));
  if(pi.status==='succeeded'||pi.amount_received>0)
    throw Error('MIXED_QA_FAILED_EVENT_HAS_FUNDS');
 }
 return serviceEvent(c,{p_id:pair.i.id,p_event:event.id,p_action:'failed',
   p_session:sid});
}
