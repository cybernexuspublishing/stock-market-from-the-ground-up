import assert from 'node:assert/strict';
import {createHmac,webcrypto} from 'node:crypto';
import {onRequestPost,onRequestGet} from '../functions/api/lumen-mixed-test-checkout.js';
import {onRequestPost as signedWebhook} from '../functions/api/gu39-stripe-webhook.js';
import {quote} from '../functions/_lib/lumen-mixed-test-v1.js';
import {readFileSync} from 'node:fs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const U='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fake',SUPABASE_SECRET_KEY:'sb_secret_fake',
 GU39_SANDBOX_SHADOW_GATE:'true',GU39_STRIPE_TEST_SECRET_KEY:'sk_test_fake',
 GU39_STRIPE_TEST_WEBHOOK_SECRET:'whsec_example_valid_test_only'};
let owner=true,stepup=true,mode=true,wallet=0,sessions=new Map(),intents=new Map(),
 access=new Map(),events=new Set(),stripeCreates=0,realWalletRequests=0;
const send=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
const urlpath=url=>new URL(url).pathname;
const orig=globalThis.fetch;
const short='tool:MIXED_CHECKOUT_QA';
function act(kind,id,more={}){
 const entry=intents.get(id);
 if(!entry)return {ok:false,error:'NOT_FOUND'};
 if(kind==='paid'){
  if(entry.status!=='bound'&&entry.status!=='fulfilled')return {ok:false,error:'PAYMENT_MISMATCH'};
  if(entry.status==='fulfilled')return {ok:true,duplicate:true};
  entry.status='fulfilled';access.set(entry.id,true);return {ok:true,status:'fulfilled'};
 }
 if(kind==='expired'||kind==='failed'){
  if(!['reserved','bound'].includes(entry.status))return {ok:false,error:'NOT_RELEASEABLE'};
  entry.status='released';wallet+=entry.lumens_reserved;return {ok:true,status:'released'};
 }
 if(kind==='refunded'){
  if(entry.status!=='fulfilled')return {ok:false,error:'REFUND_NEEDS_REVIEW'};
  entry.status='refunded';wallet+=entry.lumens_reserved;access.set(entry.id,false);
  return {ok:true,status:'refunded'};
 }
 if(kind==='disputed'){
  if(entry.status!=='fulfilled')return {ok:false,error:'DISPUTE_NEEDS_REVIEW'};
  entry.status='disputed';access.set(entry.id,false);return {ok:true,status:'disputed'};
 }
}
globalThis.fetch=async(url,opts={})=>{
 const u=new URL(url),path=u.pathname,form=opts.body&&typeof opts.body==='string'?
 new URLSearchParams(opts.body):null,method=opts.method||'GET';
 if(path.includes('groundup_question_pass_buckets')||/sk_live_|api\.stripe\.com\/v1\/charges.*POST/.test(url))
  realWalletRequests++;
 if(path==='/auth/v1/user')return send({id:U});
 if(path.endsWith('/rpc/gu_staff_role_v01432r1'))
  return send({ok:true,role:owner?'OWNER':'ADMIN'});
 if(path.endsWith('/rpc/gu_staff_stepup_active_v01432r1'))return send(stepup);
 if(path.endsWith('/gu39_sandbox_settings'))return send([{enabled:mode}]);
 if(path.endsWith('/gu_mixed_qa_wallet_v1'))return send([{available:wallet}]);
 if(path.endsWith('/gu_mixed_qa_intents_v1')){
  const id=u.searchParams.get('id')?.replace(/^eq\./,'');
  const requestId=u.searchParams.get('request_id')?.replace(/^eq\./,'');
  const rows=[...intents.values()].filter(v=>(!id||v.id===id)&&(!requestId||v.request_id===requestId));
  return send(rows);
 }
 if(path.endsWith('/gu_mixed_qa_access_v1'))
  return send([...access].map(([intent_id,active])=>({intent_id,active})));
 if(path.endsWith('/rpc/gu_mixed_qa_seed_v1')){
  const b=JSON.parse(opts.body);
  if([...intents.values()].some(x=>['reserved','bound','disputed','review'].includes(x.status)))
   return send({ok:false,error:'OPEN_TEST_INTENT'});
  wallet=b.p_balance;return send({ok:true,available:wallet,shadowOnly:true});
 }
 if(path.endsWith('/rpc/gu_mixed_qa_reserve_v1')){
  const p=JSON.parse(opts.body);
  if(!mode)return send({ok:false,error:'QA_SWITCH_DISABLED'});
  const prior=[...intents.values()].find(x=>x.request_id===p.p_request);
  if(prior)return send({ok:true,id:prior.id,status:prior.status,cashCents:prior.cash_due_cents,
   lumens:prior.lumens_reserved,discountCents:prior.discount_cents,alreadyReserved:true});
  if(p.p_lumens>wallet)return send({ok:false,error:'INSUFFICIENT_TEST_LUMENS'});
  const discount=Math.min(1999,p.p_lumens*7),cash=1999-discount;
  if(cash>0&&cash<50)return send({ok:false,error:'BELOW_USD_MINIMUM'});
  const id='bbbbbbbb-bbbb-4bbb-8bbb-'+String(intents.size+1).padStart(12,'0');
  const i={id,request_id:p.p_request,user_id:U,sku:short,
    lumens_reserved:p.p_lumens,discount_cents:discount,cash_due_cents:cash,
    stripe_session_id:null,stripe_payment_intent_id:null,status:'reserved'};
  intents.set(id,i);wallet-=p.p_lumens;
  return send({ok:true,id,cashCents:cash,lumens:p.p_lumens,discountCents:discount,status:'reserved'});
 }
 if(path.endsWith('/rpc/gu_mixed_qa_zero_v1')){
  const p=JSON.parse(opts.body),i=intents.get(p.p_id);
  if(!i||i.cash_due_cents!==0)return send({ok:false});
  i.status='fulfilled';access.set(i.id,true);return send({ok:true,shadowAccess:true});
 }
 if(path.endsWith('/rpc/gu_mixed_qa_bind_v1')){
  const p=JSON.parse(opts.body),i=intents.get(p.p_id);
  if(!i||i.cash_due_cents!==p.p_cash)return send({ok:false});
  i.stripe_session_id=p.p_session;i.status='bound';return send({ok:true});
 }
 if(path.endsWith('/rpc/gu_mixed_qa_reconcile_v1')){
  const p=JSON.parse(opts.body);
  if(events.has(p.p_event))return send({ok:true,duplicate:true});
  const result=act(p.p_action,p.p_id);
  if(result.ok){events.add(p.p_event);if(p.p_action==='paid')intents.get(p.p_id).stripe_payment_intent_id=p.p_pi}
  return send(result);
 }
 if(path==='/v1/account')return send({id:'acct_1URGkDJY9FI7byHB'});
 if(path==='/v1/products/prod_VX8wHOixVrXRMd')
  return send({id:'prod_VX8wHOixVrXRMd',active:true,livemode:false,
   metadata:{gu_shadow_only:'true'}});
 if(path==='/v1/prices/price_1UW4f3JY9FI7byHBWiVEFL8Z')
  return send({id:'price_1UW4f3JY9FI7byHBWiVEFL8Z',product:'prod_VX8wHOixVrXRMd',
   livemode:false,active:true,unit_amount:1999,currency:'usd',type:'one_time'});
 if(path==='/v1/checkout/sessions'&&method==='POST'){
  stripeCreates++;
  assert.equal(form.get('managed_payments[enabled]'),'true','TEST Checkout must match GU39 Managed Payments');
  const id='cs_test_QA'+stripeCreates+'abcde',intentId=form.get('client_reference_id');
  const amount=Number(form.get('line_items[0][price_data][unit_amount]'));
  const s={id,livemode:false,status:'open',payment_status:'unpaid',currency:'usd',
    amount_subtotal:amount,amount_total:amount,mode:'payment',client_reference_id:intentId,
    metadata:{gu_mixed_qa_intent:intentId,gu_mixed_qa_member:U,gu_mixed_qa_cash:String(amount)},
    payment_intent:null,url:'https://checkout.stripe.com/test/'+id};
  sessions.set(id,s);return send(s);
 }
 if(path.startsWith('/v1/checkout/sessions/')&&path.endsWith('/expire')){
  const id=path.split('/')[4],s=sessions.get(id);s.status='expired';return send(s);
 }
 if(path.startsWith('/v1/checkout/sessions/')&&path.endsWith('/line_items')){
  const s=sessions.get(path.split('/')[4]);
  return send({data:[{quantity:1,price:{id:'price_generated_qa',product:'prod_VX8wHOixVrXRMd',
   currency:'usd',unit_amount:s.amount_subtotal},amount_subtotal:s.amount_subtotal}],has_more:false});
 }
 if(path.startsWith('/v1/checkout/sessions/')&&method==='GET')
  return send(sessions.get(path.split('/')[4]));
 if(path==='/v1/checkout/sessions'&&u.searchParams.has('payment_intent')){
  const found=[...sessions.values()].filter(s=>s.payment_intent===u.searchParams.get('payment_intent'));
  return send({data:found,has_more:false});
 }
 if(path.startsWith('/v1/payment_intents/')){
  const s=[...sessions.values()].find(s=>s.payment_intent===path.split('/')[3]);
  return send({id:s.payment_intent,livemode:false,status:s.payment_status==='paid'?'succeeded':'requires_payment_method',
   currency:'usd',amount_received:s.payment_status==='paid'?s.amount_total:0,
   metadata:{gu_mixed_qa_intent:s.client_reference_id,gu_mixed_qa_member:U}});
 }
 if(path==='/v1/refunds'&&method==='POST'){
  const pi=form.get('payment_intent'),s=[...sessions.values()].find(s=>s.payment_intent===pi);
  if(!s)return send({error:{message:'bad payment'}},400);
  s.refunded=true;return send({id:'re_QA123456',payment_intent:pi,status:'succeeded'});
 }
 if(path.startsWith('/v1/charges/')){
  const s=[...sessions.values()].find(s=>s.payment_intent==='pi_QA123456');
  return send({id:path.split('/')[3],livemode:false,
    payment_intent:s?.payment_intent||null,amount:s?.amount_total||0,
    amount_refunded:s?.refunded?s.amount_total:0,refunded:s?.refunded||false,disputed:!!s?.disputed});
 }
 throw Error('UNMOCKED_NETWORK '+method+' '+path);
};
const req=(action,more={})=>new Request('https://example.pages.dev/api/lumen-mixed-test-checkout',{
 method:'POST',headers:{origin:'https://example.pages.dev',authorization:'Bearer QA_OWNER',
 'content-type':'application/json'},body:JSON.stringify({action,...more})});
const post=async(...args)=>{const r=await onRequestPost({request:req(...args),env});
 return {status:r.status,body:await r.json()}};
const event=async(type,data,id)=>{
 const payload=JSON.stringify({id,type,livemode:false,account:'acct_1URGkDJY9FI7byHB',
 created:Math.floor(Date.now()/1000),data:{object:data}});
 const ts=Math.floor(Date.now()/1000);
 const sig=createHmac('sha256',env.GU39_STRIPE_TEST_WEBHOOK_SECRET).update(ts+'.'+payload).digest('hex');
 return signedWebhook({request:new Request('https://example.pages.dev/api/gu39-stripe-webhook',{
 method:'POST',headers:{'content-type':'application/json','stripe-signature':'t='+ts+',v1='+sig},
 body:payload}),env});
};
const paid=(s)=>{
 s.payment_status='paid';s.status='complete';s.payment_intent='pi_QA123456';return s;
};
try{
 assert.equal(quote(80,40).cashDueCents,1719);
 assert.equal(quote(80,80).cashDueCents,1439);
 assert.equal(quote(286,286).cashDueCents,0);
 assert.equal(quote(286,285).paymentSupported,false);
 let result=await post('seed',{balance:80});assert.equal(result.body.available,80);
 let id='cccccccc-cccc-4ccc-8ccc-000000000001';
 result=await post('checkout',{requestId:id,lumens:40});
 assert.equal(result.body.ok,true);assert.equal(result.body.cashDueCents,1719);
 assert.equal(wallet,40);assert.equal(stripeCreates,1);
 let s=[...sessions.values()][0];
 let retry=await post('checkout',{requestId:id,lumens:40});
 assert.equal(retry.body.restored,true);assert.equal(stripeCreates,1);assert.equal(wallet,40);
 let h=await event('checkout.session.completed',paid(s),'evt_QApaid123456');
 assert.equal(h.status,200);assert.equal(await h.text(),'MIXED_QA_RECONCILED');
 let i=[...intents.values()][0];assert.equal(i.status,'fulfilled');assert.equal(access.get(i.id),true);
 h=await event('checkout.session.completed',paid(s),'evt_QApaid123456');
 assert.equal(h.status,200);assert.equal(wallet,40);
 // Forged signature must not reach shadow ledger.
 const forged=await signedWebhook({env,request:new Request('https://example.pages.dev/api/gu39-stripe-webhook',
 {method:'POST',headers:{'stripe-signature':'t=1234567890,v1='+('0'.repeat(64))},
 body:'{}'})});
 assert.equal(forged.status,401);
 result=await post('refund',{intentId:i.id});assert.equal(result.body.refundRequested,true);
 h=await event('charge.refunded',{id:'ch_QA123456'},'evt_QArefund123456');
 assert.equal(h.status,200);assert.equal(wallet,80);assert.equal(access.get(i.id),false);
 assert.equal(i.status,'refunded');
 // A full-Lumen purchase must be entirely internal to QA, with no provider session.
 result=await post('seed',{balance:286});assert.equal(result.body.available,286);
 id='cccccccc-cccc-4ccc-8ccc-000000000002';
 result=await post('checkout',{requestId:id,lumens:286});
 assert.equal(result.body.fullyCovered,true);assert.equal(result.body.cashDueCents,0);
 assert.equal(stripeCreates,1);assert.equal(wallet,0);
 assert.equal([...intents.values()].at(-1).status,'fulfilled');
 // Insufficient USD remainder is blocked BEFORE wallet reservation.
 result=await post('seed',{balance:286});
 id='cccccccc-cccc-4ccc-8ccc-000000000003';
 result=await post('checkout',{requestId:id,lumens:285});
 assert.equal(result.status,409);assert.equal(wallet,286);
 // Unpaid Stripe TEST session can be expired and its shadow credits restored.
 result=await post('seed',{balance:80});
 id='cccccccc-cccc-4ccc-8ccc-000000000004';
 result=await post('checkout',{requestId:id,lumens:80});
 assert.equal(wallet,0);const si=[...sessions.values()].at(-1);
 result=await post('expire',{intentId:[...intents.values()].at(-1).id});
 assert.equal(result.body.expired,true);
 h=await event('checkout.session.expired',si,'evt_QAexpire123456');
 assert.equal(h.status,200);assert.equal(wallet,80);
 // No non-Owner can access the QA checkout.
 owner=false;result=await post('seed',{balance:10});
 assert.equal(result.status,403);owner=true;
 stepup=false;result=await post('seed',{balance:10});
 assert.equal(result.status,403);stepup=true;
 mode=false;result=await post('checkout',{requestId:crypto.randomUUID(),lumens:40});
 assert.equal(result.status,423);mode=true;
 assert.equal(realWalletRequests,0);
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const sql=read('supabase/migrations/20261029_lumen_mixed_stripe_test_shadow_end_to_end_v1.sql');
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/g);
 assert.match(sql,/gu_mixed_qa_reconcile_v1/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.gu_mixed_qa_reserve_v1/);
 assert.doesNotMatch(sql,/UPDATE public\.groundup_question_pass_buckets/);
 const replay=read('supabase/migrations/20261029_lumen_mixed_test_event_replay_guard_v1.sql');
 assert.match(replay,/SIGNED_EVENT_REUSED_FOR_DIFFERENT_ORDER/);
 const indexes=read('supabase/migrations/20261029_lumen_mixed_test_shadow_indexes_v1.sql');
 assert.match(indexes,/gu_mixed_qa_events_intent_v1_idx/);
 console.log('PASS TEST mixed cash/Lumen: 0,40,80,286; signed paid, duplicate/replay, forged signature, full refund, zero-cash access, expiration, minimum, Owner step-up, no real-wallet access');
}finally{globalThis.fetch=orig}
