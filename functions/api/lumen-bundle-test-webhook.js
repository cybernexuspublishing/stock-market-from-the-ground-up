/* Signed Stripe TEST-only Lumen bundle fulfillment and refunds.
 * Credits ONLY gu_lumen_bundle_test_shadow_credits_v1; real wallets untouched.
 */
import {config,stripe,db,accountOK,reply,uuid} from '../_lib/book-stripe-test-v1.js';
import {TEST_OFFERS} from './lumen-bundle-test-checkout.js';
const accepted=new Set(['checkout.session.completed','checkout.session.async_payment_succeeded',
 'checkout.session.async_payment_failed','checkout.session.expired','charge.refunded','charge.dispute.created']);
const valid=(value,prefix)=>new RegExp('^'+prefix+'_[A-Za-z0-9_]{6,}$').test(String(value||''));
async function signed(payload,header,secret){
 const fields=String(header||'').split(',').map(x=>x.trim().split('='));
 const stamp=Number(fields.find(x=>x[0]==='t')?.[1]);
 const matches=fields.filter(x=>x[0]==='v1'&&/^[a-f0-9]{64}$/i.test(x[1]||'')).map(x=>x[1].toLowerCase());
 if(!Number.isSafeInteger(stamp)||Math.abs(Math.floor(Date.now()/1000)-stamp)>300||!matches.length)return false;
 const e=new TextEncoder();const key=await crypto.subtle.importKey('raw',e.encode(secret),
   {name:'HMAC',hash:'SHA-256'},false,['sign']);
 const h=new Uint8Array(await crypto.subtle.sign('HMAC',key,e.encode(stamp+'.'+payload)));
 const hex=[...h].map(x=>x.toString(16).padStart(2,'0')).join('');
 return matches.some(sig=>{let x=0;for(let i=0;i<64;i++)x|=hex.charCodeAt(i)^sig.charCodeAt(i);return x===0});
}
const tag=s=>{
 const m=s?.metadata||{},offer=TEST_OFFERS[m.gu_lumen_bundle_qa_sku];
 if(!offer||!uuid(m.gu_lumen_bundle_qa_id)||!uuid(m.gu_lumen_bundle_qa_user)||
    s.client_reference_id!==m.gu_lumen_bundle_qa_id)return null;
 return {id:m.gu_lumen_bundle_qa_id,user:m.gu_lumen_bundle_qa_user,sku:m.gu_lumen_bundle_qa_sku,offer};
};
async function recorded(c,id){
 const endpoint=c.base+'/rest/v1/gu_lumen_bundle_test_orders_v1?select=*&id=eq.'+encodeURIComponent(id)+'&limit=1';
 const headers={apikey:c.service,...(c.service.startsWith('eyJ')?{authorization:'Bearer '+c.service}:{})};
 const r=await fetch(endpoint,{headers,cache:'no-store'});
 const rows=await r.json().catch(()=>null);
 if(!r.ok||!Array.isArray(rows)||rows.length!==1)throw Error('ORDER_NOT_RECORDED');
 return rows[0];
}
async function verify(c,sessionId){
 if(!valid(sessionId,'cs_test'))throw Error('NOT_TEST_SESSION');
 const s=await stripe(c,'checkout/sessions/'+encodeURIComponent(sessionId)),m=tag(s);
 if(!m||s.id!==sessionId||s.livemode!==false||s.mode!=='payment'||
    s.currency!=='usd'||s.amount_subtotal!==m.offer.cents)
   throw Error('UNBOUND_TEST_SESSION');
 const row=await recorded(c,m.id);
 if(row.user_id!==m.user||row.sku!==m.sku||row.quantity!==m.offer.qty||
   row.amount_cents!==m.offer.cents||row.stripe_price_id!==m.offer.price||
   row.stripe_session_id!==s.id||!['bound','paid','refunded','disputed'].includes(row.status))
   throw Error('QA_ORDER_MISMATCH');
 const lines=await stripe(c,'checkout/sessions/'+encodeURIComponent(s.id)+'/line_items?limit=2');
 const line=lines.data?.[0];
 if(lines.has_more!==false||lines.data?.length!==1||line?.price?.id!==m.offer.price||
    line.price.product!==m.offer.product||line.quantity!==1||
    line.amount_subtotal!==m.offer.cents)throw Error('TEST_LINE_ITEM_MISMATCH');
 return {s,m,row};
}
async function paymentProof(c,id){
 const {s,m,row}=await verify(c,id);
 if(s.status!=='complete'||s.payment_status!=='paid'||!valid(s.payment_intent,'pi'))
  throw Error('TEST_PAYMENT_NOT_COMPLETE');
 const pi=await stripe(c,'payment_intents/'+encodeURIComponent(s.payment_intent));
 if(pi.id!==s.payment_intent||pi.livemode!==false||pi.currency!=='usd'||
  pi.status!=='succeeded'||Number(pi.amount_received)!==m.offer.cents||
  pi.metadata?.gu_lumen_bundle_qa_id!==m.id||pi.metadata?.gu_lumen_bundle_qa_user!==m.user||
  pi.metadata?.gu_lumen_bundle_qa_sku!==m.sku)
  throw Error('TEST_PAYMENT_INTENT_MISMATCH');
 return {s,m,row,pi};
}
async function apply(c,args){
 const output=await db(c,'gu_lumen_bundle_test_apply_v1',args);
 if(output?.ok!==true)throw Error('TEST_SHADOW_RECONCILIATION_FAILED');
 return reply({ok:true,shadowOnly:true,duplicate:output.duplicate===true});
}
export async function onRequestPost({request,env}){
 try{
  const c=config(env,{requireEnabled:false});
  if(Number(request.headers.get('content-length')||0)>262144)return reply({ok:false,error:'Too large'},413);
  const raw=await request.text();
  if(new TextEncoder().encode(raw).length>262144)return reply({ok:false,error:'Too large'},413);
  if(!await signed(raw,request.headers.get('stripe-signature'),c.webhook))
    return reply({ok:false,error:'Invalid TEST webhook signature'},401);
  let event;try{event=JSON.parse(raw)}catch{return reply({ok:false,error:'Invalid TEST JSON'},400)}
  if(!valid(event?.id,'evt')||event.livemode!==false||
     !Number.isSafeInteger(event.created)||event.account!==undefined&&event.account!=='acct_1URGkDJY9FI7byHB')
    return reply({ok:false,error:'Invalid TEST account event'},400);
  if(!accepted.has(event.type))return reply({ok:true,ignored:true});
  await accountOK(c);
  const obj=event.data?.object||{};
  if(event.type.startsWith('checkout.session.')){
   if(!valid(obj.id,'cs_test'))return reply({ok:true,ignored:true});
   const current=await stripe(c,'checkout/sessions/'+encodeURIComponent(obj.id));
   if(!tag(current))return reply({ok:true,ignored:true});
   if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
    if(current.payment_status!=='paid')return reply({ok:true,pending:true});
    const v=await paymentProof(c,obj.id);
    return apply(c,{p_id:v.m.id,p_event:event.id,p_kind:'paid',p_session:v.s.id,
      p_pi:v.pi.id,p_amount:v.m.offer.cents});
   }
   const v=await verify(c,obj.id);
   if(event.type==='checkout.session.expired'&&v.s.status!=='expired')
    return reply({ok:true,ignored:true});
   if(v.s.payment_status==='paid')throw Error('CANNOT_FAIL_PAID_TEST_ORDER');
   return apply(c,{p_id:v.m.id,p_event:event.id,
     p_kind:event.type==='checkout.session.expired'?'expired':'failed',p_session:v.s.id});
  }
  const chargeId=event.type==='charge.refunded'?obj.id:obj.charge;
  if(!valid(chargeId,'ch'))return reply({ok:true,ignored:true});
  const charge=await stripe(c,'charges/'+encodeURIComponent(chargeId));
  if(charge.livemode!==false||!valid(charge.payment_intent,'pi'))
    return reply({ok:true,ignored:true});
  const pi=await stripe(c,'payment_intents/'+encodeURIComponent(charge.payment_intent));
  if(!uuid(pi.metadata?.gu_lumen_bundle_qa_id))return reply({ok:true,ignored:true});
  const sessions=await stripe(c,'checkout/sessions?payment_intent='+encodeURIComponent(pi.id)+'&limit=2');
  if(sessions.data?.length!==1||sessions.has_more!==false)
    throw Error('TEST_REFUND_SESSION_AMBIGUOUS');
  const v=await paymentProof(c,sessions.data[0].id);
  if(v.pi.id!==pi.id)throw Error('TEST_REFUND_PAYMENT_MISMATCH');
  if(event.type==='charge.refunded'){
   if(Number(charge.amount_refunded)<Number(charge.amount))
    return reply({ok:true,partialRefundReview:true});
   if(charge.refunded!==true)throw Error('TEST_REFUND_NOT_CONFIRMED');
  }else if(charge.disputed!==true)throw Error('TEST_DISPUTE_NOT_CONFIRMED');
  return apply(c,{p_id:v.m.id,p_event:event.id,
   p_kind:event.type==='charge.refunded'?'refunded':'disputed',
   p_session:v.s.id,p_pi:v.pi.id});
 }catch{return reply({ok:false,error:'Signed TEST bundle reconciliation requires retry'},503)}
}
export function onRequestGet(){return reply({ok:false,error:'POST required'},405)}
