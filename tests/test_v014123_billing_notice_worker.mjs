import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequestPost} from '../functions/api/internal-billing-notices-v014123.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/v0.14.0.123_BILLING_OUTBOX_OWNER_REVIEW_REQUIRED.sql');
for(const x of ['SKIP LOCKED','lease_token','gu58_live_checkout_intents',
 'AFTER INSERT OR UPDATE','ON CONFLICT(dedup_key) DO NOTHING',
 'SECURITY INVOKER','service_role',"delivery_status='leased'"])
 assert(sql.includes(x),'SQL invariant missing '+x);
const webhook=read('functions/api/stripe-live-webhook-v01458.js');
for(const e of ['invoice.payment_action_required','customer.subscription.paused',
 'customer.subscription.resumed'])
 assert(webhook.includes(e),'Signed lifecycle event not handled '+e);
const env={
 SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
 SUPABASE_SECRET_KEY:'sb_secret_mock',
 GU_BILLING_TASK_SECRET:'0123456789abcdef0123456789abcdef0123',
 GU_BILLING_RESEND_API_KEY:'re_TESTINGFAKETESTING12345',
 GU_BILLING_FROM_EMAIL:'billing@example.edu',
 GU_BILLING_SITE_ORIGIN:'https://course.example'
};
const q={id:'11111111-1111-4111-8111-111111111111',
 user_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 notice_kind:'payment_failed',source_kind:'plan',
 lease_token:'22222222-2222-4222-8222-222222222222',
 current_period_end:'2026-11-15T00:00:00Z'};
let claim=0,send=0,ack=0,succeed=true;
const old=globalThis.fetch;
globalThis.fetch=async(url,opt={})=>{
 const s=String(url);
 const json=(x,status=200)=>new Response(JSON.stringify(x),
 {status,headers:{'content-type':'application/json'}});
 if(s.endsWith('/rpc/gu_v014123_claim_notices')){
   claim++;assert.equal(opt.method,'POST');return json([q]);}
 if(s.endsWith('/auth/v1/admin/users/'+q.user_id))return json({
   id:q.user_id,email:'member@example.edu',email_confirmed_at:'2026-01-01T00:00:00Z'});
 if(s.endsWith('/rpc/gu_v014123_ack_notice')){
   ack++;const body=JSON.parse(opt.body);
   assert.equal(body.p_id,q.id);assert.equal(body.p_token,q.lease_token);
   assert.equal(body.p_sent,succeed);return json(true);}
 if(s==='https://api.resend.com/emails'){
  send++;const body=JSON.parse(opt.body);
  assert.equal(body.to[0],'member@example.edu');
  assert(!body.text.includes('sb_secret_'));assert(!body.text.includes('password'));
  assert.equal(opt.headers['Idempotency-Key'],q.id);
  return succeed?json({id:'email_fake_id123'}):json({message:'Provider down'},503);}
 throw Error('Unexpected URL: '+s);
};
const call=(token=env.GU_BILLING_TASK_SECRET,e=env)=>onRequestPost({
 request:new Request('https://course.example/api/internal-billing-notices-v014123',{
  method:'POST',headers:{authorization:'Bearer '+token},body:'{}'}),env:e});
try{
 let r=await call('incorrect');assert.equal(r.status,403);assert.equal(claim,0);
 r=await call(env.GU_BILLING_TASK_SECRET,{...env,GU_BILLING_RESEND_API_KEY:''});
 assert.equal(r.status,503);assert.equal(claim,0,'Must not reserve jobs without sender');
 r=await call();assert.equal(r.status,200);let d=await r.json();
 assert.equal(d.sent,1);assert.equal(d.failed,0);
 succeed=false;r=await call();assert.equal(r.status,207);d=await r.json();
 assert.equal(d.sent,0);assert(d.failed>=1);assert.equal(ack,2);
 console.log('PASS v123: authenticated scheduled email worker, confirmed recipient, provider-idempotency, retry ack and fail closed');
}finally{globalThis.fetch=old}
