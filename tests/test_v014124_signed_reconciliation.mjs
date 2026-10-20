import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequestPost} from '../functions/api/internal-billing-reconcile-v014124.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/v0.14.0.124_SIGNED_STRIPE_RECONCILIATION_OWNER_REVIEW_REQUIRED.sql');
for(const x of ['FOR UPDATE','service_role','gu58_live_checkout_intents','LEFT JOIN',
 'SECURITY INVOKER','issue_kind','resolved_at','p_issue=\'ok\'']){
 assert(sql.includes(x),'Missing reconciliation SQL guard: '+x);
}
const code=read('functions/api/internal-billing-reconcile-v014124.js');
assert(!code.includes('gu58_live_stripe_apply_event'),
 'Reconciler may NOT silently forge event IDs or grant learning entitlements');
const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',intent='11111111-1111-4111-8111-111111111111';
const env={
 SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
 SUPABASE_SECRET_KEY:'sb_secret_mock',
 GU58_STRIPE_LIVE_SECRET_KEY:'sk_live_SANDBOXFAKEKEY',
 GU58_STRIPE_LIVE_ACCOUNT_ID:'acct_VERIFIED123',
 GU_BILLING_TASK_SECRET:'0123456789abcdef0123456789abcdef0123'
};
let mutators=0,issues=[],fetches=0,forcedMismatch=false,accountMismatch=false;
const old=globalThis.fetch,reply=(v,status=200)=>new Response(JSON.stringify(v),
 {status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,opt={})=>{
 const s=String(url);fetches++;
 if(s.endsWith('/v1/account'))return reply({id:accountMismatch?'acct_EVIL':'acct_VERIFIED123'});
 if(s.endsWith('/rpc/gu_v014124_next_reconcile_batch')){
  const data=JSON.parse(opt.body);
  if(data.p_kind==='tool')return reply({kind:'tool',rows:[],wrapped:true});
  return reply({kind:'plan',rows:[{id:5,user_id:user,intent_id:intent,price_id:'price_RIGHT123',
   provider_subscription_id:'sub_VERIFIED123',
   status:forcedMismatch?'past_due':'active',
   current_period_end:'2026-11-19T00:00:00Z'}],wrapped:false});
 }
 if(s.endsWith('/rpc/gu_v014124_record_reconcile_result')){
  const body=JSON.parse(opt.body);
  assert.equal(body.p_kind,'plan');assert.equal(body.p_local_id,5);issues.push(body.p_issue);
  return reply(true);
 }
 if(s.includes('/v1/subscriptions/sub_VERIFIED123'))
  return reply({id:'sub_VERIFIED123',livemode:true,status:'active',
   metadata:{gu58_intent:intent},current_period_end:1795046400,
   latest_invoice:'in_VALID123',
   items:{data:[{price:{id:'price_RIGHT123'},current_period_end:1795046400}]}});
 if(s.includes('/v1/invoices/in_VALID123'))
  return reply({id:'in_VALID123',livemode:true,status:'paid'});
 if(s.includes('/v1/checkout/sessions')||s.includes('gu58_live_stripe_apply_event')){
  mutators++;throw Error('Reconciler attempted to alter payment state');}
 throw Error('Unexpected URL: '+s);
};
const attempt=(token=env.GU_BILLING_TASK_SECRET)=>onRequestPost({env,request:new Request(
 'https://course.example/api/internal-billing-reconcile-v014124',{
 method:'POST',headers:{authorization:'Bearer '+token},body:'{}'})});
try{
 let r=await attempt('not valid');assert.equal(r.status,403);assert.equal(fetches,0);
 r=await attempt();assert.equal(r.status,200);
 let b=await r.json();assert.equal(b.checked,1);assert.equal(b.discrepancies,0);
 assert.deepEqual(issues,['ok']);
 forcedMismatch=true;r=await attempt();assert.equal(r.status,200);
 b=await r.json();assert.equal(b.discrepancies,1);
 assert.equal(issues.at(-1),'state_mismatch');
 accountMismatch=true;r=await attempt();assert.equal(r.status,503);
 assert.equal(issues.length,2,'Merchant mismatch must stop before DB scan');
 assert.equal(mutators,0);
 console.log('PASS v124: verified merchant/intent/price+invoice reconciliation, private issue write, no fake entitlements');
}finally{globalThis.fetch=old}
