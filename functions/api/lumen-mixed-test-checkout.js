/* Owner-only Stripe TEST mixed-cash/Lumen checkout.
 * TEST shadow credits + shadow access; never real wallet/entitlements/LIVE keys.
 */
import {config,db,owner,testMode,stripe,verifyFixture,quote,response,apiFailure,
 isUuid,assertTestSession,QA_PRODUCT,QA_SKU,QA_PRICE_CENTS} from '../_lib/lumen-mixed-test-v1.js';
const error=(message,status=409)=>Object.assign(new Error(message),{status});
async function intent(c,id,user){
 const rows=await db(c,'gu_mixed_qa_intents_v1?select=*&id=eq.'+encodeURIComponent(id)+
  '&user_id=eq.'+encodeURIComponent(user)+'&limit=1');
 return rows?.[0]||null;
}
async function state(c,user){
 const [wallet,intents,access,enabled]=await Promise.all([
  db(c,'gu_mixed_qa_wallet_v1?select=available&user_id=eq.'+encodeURIComponent(user)+'&limit=1'),
  db(c,'gu_mixed_qa_intents_v1?select=id,request_id,status,lumens_reserved,discount_cents,cash_due_cents,stripe_session_id,created_at&user_id=eq.'+encodeURIComponent(user)+'&order=created_at.desc&limit=15'),
  db(c,'gu_mixed_qa_access_v1?select=intent_id,active&user_id=eq.'+encodeURIComponent(user)+'&limit=15'),
  testMode(c)
 ]);
 return {ok:true,testOnly:true,shadowOnly:true,enabled,originalCents:QA_PRICE_CENTS,
  denominationCents:7,availableLumens:wallet?.[0]?.available??0,intents,
  shadowAccess:access,product:QA_SKU,
  notice:'This isolated QA product never grants a real site entitlement or spends a real Lumen.'};
}
export async function onRequestGet({request,env}){
 try{const c=config(env),user=await owner(request,c);return response(await state(c,user))}
 catch(e){return apiFailure(e)}
}
export async function onRequestPost({request,env}){
 try{
  if(request.headers.get('origin')!==new URL(request.url).origin)
   throw error('CROSS_SITE_TEST_DENIED',403);
  if(Number(request.headers.get('content-length')||0)>4096)
   throw error('REQUEST_TOO_LARGE',400);
  const bytes=new Uint8Array(await request.arrayBuffer());
  if(bytes.length>4096)throw error('REQUEST_TOO_LARGE',400);
  let input;try{input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}
  catch{throw error('INVALID_JSON',400)}
  if(!input||typeof input!=='object'||Array.isArray(input))
    throw error('INVALID_REQUEST',400);
  const c=config(env),user=await owner(request,c,{stepup:true});
  if(input.action==='seed'){
   if(!Number.isSafeInteger(input.balance)||input.balance<0||input.balance>1000)
    throw error('INVALID_TEST_SEED',400);
   const d=await db(c,'rpc/gu_mixed_qa_seed_v1','POST',
     {p_user:user,p_balance:input.balance});
   if(d?.ok!==true)throw error(String(d?.error||'TEST_SEED_REJECTED'));
   return response({...d,testing:true,realWalletUnchanged:true});
  }
  if(input.action==='expire'||input.action==='refund'){
   if(!isUuid(input.intentId))throw error('INVALID_TEST_INTENT',400);
   if(!await testMode(c))throw error('OWNER_TEST_MODE_DISABLED',423);
   await verifyFixture(c);
   const row=await intent(c,input.intentId,user);
   if(!row||!row.stripe_session_id)throw error('TEST_INTENT_NOT_FOUND');
   const session=await stripe(c,'checkout/sessions/'+encodeURIComponent(row.stripe_session_id));
   if(!assertTestSession(session,row,user)||session.livemode!==false)
     throw error('TEST_PAYMENT_PROOF_MISMATCH');
   if(input.action==='expire'){
    if(row.status!=='bound'||session.status!=='open'||session.payment_status!=='unpaid')
      throw error('SESSION_NOT_EXPIRABLE');
    const expired=await stripe(c,'checkout/sessions/'+encodeURIComponent(session.id)+'/expire',
       {body:'',idempotency:'gu-mixed-qa-expire-'+row.id});
    if(expired.id!==session.id||expired.status!=='expired')
      throw error('STRIPE_TEST_EXPIRATION_FAILED');
    return response({ok:true,testOnly:true,expired:true,
     notice:'Stripe TEST expiration requested; signed webhook must restore shadow Lumens.'});
   }
   if(row.status!=='fulfilled'||session.payment_status!=='paid'||
       !/^pi_[A-Za-z0-9_]+$/.test(session.payment_intent||''))
      throw error('TEST_PAYMENT_NOT_REFUNDABLE');
   const pi=await stripe(c,'payment_intents/'+encodeURIComponent(session.payment_intent));
   if(pi.livemode!==false||pi.status!=='succeeded'||
       pi.amount_received!==row.cash_due_cents||
       pi.metadata?.gu_mixed_qa_intent!==row.id)throw error('TEST_PAYMENT_PROOF_MISMATCH');
   const params=new URLSearchParams();
   params.set('payment_intent',pi.id);
   params.set('reason','requested_by_customer');
   params.set('metadata[gu_mixed_qa_intent]',row.id);
   const refunded=await stripe(c,'refunds',{
    body:params.toString(),idempotency:'gu-mixed-qa-refund-'+row.id});
   if(!/^re_[A-Za-z0-9_]+$/.test(refunded.id||'')||
       refunded.payment_intent!==pi.id)throw error('TEST_REFUND_PROOF_MISMATCH');
   return response({ok:true,testOnly:true,refundRequested:true,
    notice:'Stripe TEST refund requested; signed webhook must revoke shadow access and return shadow credits.'});
  }
  if(input.action!=='checkout')throw error('INVALID_TEST_ACTION',400);
  if(!isUuid(input.requestId)||!Number.isSafeInteger(input.lumens)||
     input.lumens<0||input.lumens>286)throw error('INVALID_TEST_SELECTION',400);
  if(!await testMode(c))throw error('OWNER_TEST_MODE_DISABLED',423);
  await verifyFixture(c);
  const balance=await db(c,'gu_mixed_qa_wallet_v1?select=available&user_id=eq.'+
   encodeURIComponent(user)+'&limit=1');
  const usable=balance?.[0]?.available??0;
  const existingRows=await db(c,'gu_mixed_qa_intents_v1?select=id,request_id,status,lumens_reserved,cash_due_cents&user_id=eq.'+
     encodeURIComponent(user)+'&request_id=eq.'+encodeURIComponent(input.requestId)+'&limit=1');
  const existing=existingRows?.[0]||null;
  if(existing&&existing.lumens_reserved!==input.lumens)
    throw error('REQUEST_REUSED');
  if(!existing){
   const expected=quote(usable,input.lumens);
   if(!expected.paymentSupported)throw error('BELOW_USD_MINIMUM');
  }
  const created=await db(c,'rpc/gu_mixed_qa_reserve_v1','POST',
   {p_user:user,p_request:input.requestId,p_lumens:input.lumens});
  if(created?.ok!==true)throw error(String(created?.error||'TEST_RESERVE_REJECTED'));
  if(created.cashCents===0){
   const zero=await db(c,'rpc/gu_mixed_qa_zero_v1','POST',
    {p_id:created.id,p_user:user});
   if(zero?.ok!==true)throw error(String(zero?.error||'ZERO_FULFILLMENT_REJECTED'));
   return response({ok:true,testOnly:true,shadowOnly:true,fullyCovered:true,
    intentId:created.id,spentLumens:created.lumens,discountCents:created.discountCents,
    cashDueCents:0,shadowAccess:true,notice:'No Stripe session or real entitlement created.'});
  }
  const row=await intent(c,created.id,user);
  if(!row||row.cash_due_cents!==created.cashCents||row.lumens_reserved!==input.lumens)
    throw error('TEST_INTENT_INCONSISTENT');
  if(row.status==='bound'&&row.stripe_session_id){
   const previous=await stripe(c,'checkout/sessions/'+encodeURIComponent(row.stripe_session_id));
   if(previous.status!=='open'||!assertTestSession(previous,row,user)||
       !previous.url?.startsWith('https://checkout.stripe.com/'))
     throw error('BOUND_SESSION_REQUIRES_RECONCILIATION');
   return response({ok:true,testOnly:true,restored:true,shadowOnly:true,
     intentId:row.id,checkoutUrl:previous.url,cashDueCents:row.cash_due_cents,
     lumensReserved:row.lumens_reserved});
  }
  if(row.status!=='reserved')throw error('TEST_INTENT_ALREADY_RESOLVED');
  const params=new URLSearchParams();
  params.set('mode','payment');
  params.set('payment_method_types[0]','card');
  params.set('line_items[0][price_data][currency]','usd');
  params.set('line_items[0][price_data][product]',QA_PRODUCT);
  params.set('line_items[0][price_data][unit_amount]',String(row.cash_due_cents));
  params.set('line_items[0][quantity]','1');
  params.set('client_reference_id',row.id);
  params.set('metadata[gu_mixed_qa_intent]',row.id);
  params.set('metadata[gu_mixed_qa_member]',user);
  params.set('metadata[gu_mixed_qa_cash]',String(row.cash_due_cents));
  params.set('payment_intent_data[metadata][gu_mixed_qa_intent]',row.id);
  params.set('payment_intent_data[metadata][gu_mixed_qa_member]',user);
  const origin=new URL(request.url).origin;
  params.set('success_url',origin+'/admin-lumen-mixed-test.html?result=success');
  params.set('cancel_url',origin+'/admin-lumen-mixed-test.html?result=cancelled');
  const session=await stripe(c,'checkout/sessions',{
   body:params.toString(),idempotency:'gu-mixed-qa-'+row.id});
  if(!/^cs_test_[A-Za-z0-9_]+$/.test(session.id||'')||session.status!=='open'||
      session.payment_status!=='unpaid'||!assertTestSession(session,row,user)||
      !session.url?.startsWith('https://checkout.stripe.com/'))
   throw error('TEST_SESSION_VERIFICATION_FAILED');
  const bind=await db(c,'rpc/gu_mixed_qa_bind_v1','POST',
   {p_id:row.id,p_user:user,p_session:session.id,p_cash:row.cash_due_cents});
  if(bind?.ok!==true)throw error(String(bind?.error||'TEST_SESSION_BIND_FAILED'));
  return response({ok:true,testOnly:true,shadowOnly:true,intentId:row.id,
   checkoutUrl:session.url,cashDueCents:row.cash_due_cents,
   lumensReserved:row.lumens_reserved,
   notice:'Stripe TEST card payment only. Signed webhook controls shadow fulfillment.'});
 }catch(e){return apiFailure(e)}
}
export function onRequest({request,...rest}){
 return request.method==='GET'?onRequestGet({request,...rest}):
 request.method==='POST'?onRequestPost({request,...rest}):
 response({ok:false,error:'METHOD_NOT_ALLOWED'},405);
}
