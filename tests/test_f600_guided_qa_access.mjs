// Existing Owner account-editor passes allow real Founding beta testers to
// study privately authored B01 lessons without inventing paid founder members.
// Deterministic mocked Supabase HTTP: source TESTED only, not live member proof.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {activeFoundingBetaLearningPlan,authoredB01BetaLesson}
 from '../functions/_lib/founding-beta-learning-access.js';

const MEMBER='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OWNER='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const env={SUPABASE_URL:'https://example.supabase.co/',SUPABASE_SECRET_KEY:'sb_secret_testonly'};
const start=new Date(Date.now()-60*1000).toISOString();
const end=new Date(Date.now()+30*24*60*60*1000).toISOString();
const basePass={
 tool_code:'ONDEMAND_TRAINING',status:'active',starts_at:start,ends_at:end,
 provider:null,provider_subscription_id:null,
 metadata:{admin_manual:true,source:'owner_manual',adminGrantedBy:OWNER,
 reason:'F600_GUIDED_QA_V1: Owner-authorized 30-day noncommercial Lab and Boot Camp testing.'}
};
const goodOwner=[{role_code:'OWNER',expires_at:null}];
let pass={...basePass},roles=goodOwner,grants=[],subscriptions=[],providerOutage=false;
const old=globalThis.fetch;
let examined=[];
globalThis.fetch=async(url,init={})=>{
 const u=new URL(url),route=u.pathname.split('/').at(-1);
 examined.push({route,url:u.toString()});
 assert.equal(init.cache,'no-store','No cached beta entitlements');
 if(providerOutage)return new Response('{}',{status:503});
 if(route==='user_plan_grants'||route==='site_subscriptions'||route==='user_tool_passes')
  assert.equal(u.searchParams.get('user_id'),'eq.'+MEMBER,'Account-scoped entitlement read');
 const data=route==='user_plan_grants'?grants:route==='site_subscriptions'?subscriptions:
  route==='user_tool_passes'?(pass?[pass]:[]):route==='admin_user_roles'?roles:null;
 if(data===null)throw Error('Unexpected provider read: '+route);
 if(route==='admin_user_roles')assert.equal(u.searchParams.get('user_id'),'eq.'+OWNER);
 return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});
};
try{
 assert.equal(await activeFoundingBetaLearningPlan(env,MEMBER),true,
  'Owner-issued 30-day manual training pass must enable original guided B01 study');
 assert(examined.some(x=>x.route==='admin_user_roles'),
  'A truthful QA pass must independently verify its issuer is an Owner');
 examined=[];
 roles=[];
 assert.equal(await activeFoundingBetaLearningPlan(env,MEMBER),false,'Non-Owner issuer denied');
 roles=goodOwner;pass={...basePass,provider:'STRIPE_MANAGED'};
 assert.equal(await activeFoundingBetaLearningPlan(env,MEMBER),false,'Paid/provider pass cannot masquerade as noncommercial QA');
 pass={...basePass,metadata:{...basePass.metadata,reason:'ordinary tool grant'}};
 assert.equal(await activeFoundingBetaLearningPlan(env,MEMBER),false,'Unscoped manual passes cannot expose B01 private book teaching');
 pass={...basePass,ends_at:new Date(Date.now()+60*24*60*60*1000).toISOString()};
 assert.equal(await activeFoundingBetaLearningPlan(env,MEMBER),false,'Long-lived QA claim must be refused');
 pass={...basePass,ends_at:new Date(Date.now()-1000).toISOString()};
 assert.equal(await activeFoundingBetaLearningPlan(env,MEMBER),false,'Expired QA must be refused');
 pass=null;grants=[{plan_code:'FOUNDING_30',status:'active',
  starts_at:start,ends_at:end}];
 assert.equal(await activeFoundingBetaLearningPlan(env,MEMBER),true,
  'Existing active Founding plan grant behavior is preserved');
 grants=[];providerOutage=true;
 assert.equal(await activeFoundingBetaLearningPlan(env,MEMBER),false,
  'Missing all provider evidence must not invent entitlement');
 assert.equal(await activeFoundingBetaLearningPlan(env,'not-a-user'),false);
}finally{globalThis.fetch=old}

assert.equal(authoredB01BetaLesson({
 lab_id:'F1-C02-L01',source_status:'original_hypothetical_unreviewed_v01496',
 content:{lessonBatch:'2026-10-25-B01',
 authoringStatus:'ORIGINAL_AUTHORED_EDUCATIONAL_DRAFT_NOT_EDITORIALLY_OR_GRADING_ACCEPTED',
 concept:'Identifying issuer evidence',objective:'Distinguish public company claims from reposts',
 why:'A promotional screenshot alone lacks publication time, original issuer and precise reporting periods.',
 steps:['Identify the first-party issuer and filing time',
        'Compare statements against the original filing',
        'Record missing evidence before considering a trade']}
}),true);
const ui=readFileSync('assets/js/account-management-entitlements-v01478.js','utf8');
assert(ui.includes('data-f600-qa-start'));
assert(ui.includes("info.permissions?.owner===true"));
assert(ui.includes("account.type==='member'"));
assert(ui.includes("'grant_resource'"));
assert(ui.includes("kind:'manual_tool'"));
assert(ui.includes("code:'ONDEMAND_TRAINING'"));
assert(ui.includes("F600_GUIDED_QA_V1:"));
assert(ui.includes('Date.now()+30*24*60*60*1000'));
const labService=readFileSync('functions/api/lab-content.js','utf8');
assert(labService.includes('premium&&authoredB01BetaLesson(row)'));
assert(labService.includes('activeFoundingBetaLearningPlan(env,actor.userId)'));
assert(labService.includes('gradedCreditEligible:false'));
console.log('PASS F600 noncommercial QA: Owner-only issuer provenance, 30-day scope, private authored B01 access, unrelated tool denial, no fabricated grading.');
