// v0.14.0.104: Owner-only first-party AI service operational audit.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/owner-roadmap.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',
 SUPABASE_SECRET_KEY:'sb_secret_mock',AI_TUTOR_API_KEY:'must-stay-private',AI_TUTOR_MODEL:'mock-model',
 AI_SERVICE_ENABLED:'true',AI_SERVICE_MEMBER_DAILY_LIMIT:'5',
 AI_SERVICE_GLOBAL_DAILY_LIMIT:'80',AI_SERVICE_GLOBAL_MONTHLY_LIMIT:'600'};
let role='OWNER',kind='member',status='active',meterAvailable=true;
const urls=[];const prior=globalThis.fetch;
const json=(d,code=200)=>new Response(JSON.stringify(d),{status:code,headers:{'content-type':'application/json'}});
globalThis.fetch=async (url,opts={})=>{
 const u=String(url);urls.push({u,opts});
 if(u.endsWith('/auth/v1/user'))return json({id:uid});
 if(u.includes('/profiles?'))return json([{account_kind:kind}]);
 if(u.includes('/admin_user_roles?'))return json([{role_code:role,expires_at:null}]);
 if(u.includes('/admin_user_flags?'))return json([{status}]);
 if(u.includes('/gu_ai_service_requests_v014103?')){
  if(!meterAvailable)return json({message:'not installed'},404);
  assert.equal(opts.headers.apikey,env.SUPABASE_SECRET_KEY);
  assert.equal(opts.headers.authorization,undefined,'Modern secret must not be Bearer JWT');
  assert.equal(opts.headers.prefer,'count=exact');
  const n=urls.filter(x=>x.u.includes('gu_ai_service_requests_v014103?')).length;
  return new Response(JSON.stringify([{id:1}]),{headers:{'content-type':'application/json','content-range':'0-0/'+(n%2===1?12:75)}});
 }
 throw Error('Unexpected Owner service '+u);
};
const req=(authenticated=true)=>new Request('https://example.org/api/owner-roadmap?action=ai-service-audit',{
 headers:authenticated?{authorization:'Bearer owner-session'}:{}});
try{
 let r=await onRequest({request:req(false),env});assert.equal(r.status,401);
 assert(!urls.some(x=>x.u.includes('gu_ai_service_requests_v014103')),'No ledger access before authentication');
 role='ADMIN';r=await onRequest({request:req(),env});assert.equal(r.status,403);
 assert(!urls.some(x=>x.u.includes('gu_ai_service_requests_v014103')),'Non-Owner cannot inspect AI usage');
 role='OWNER';kind='showcase';r=await onRequest({request:req(),env});assert.equal(r.status,403);
 kind='member';status='restricted';r=await onRequest({request:req(),env});assert.equal(r.status,403);
 status='active';r=await onRequest({request:req(),env});let body=await r.json();
 assert.equal(r.status,200);assert.equal(body.ok,true);assert.equal(body.aiServiceAudit.available,true);
 assert.equal(body.aiServiceAudit.reservedToday,12);assert.equal(body.aiServiceAudit.reservedMonth,75);
 assert.equal(body.aiServiceAudit.globalDailyLimit,80);
 assert.equal(body.aiServiceAudit.monthlyHeadroom,525);
 assert.equal(body.aiServiceAudit.providerBillingVerified,false);
 assert(!JSON.stringify(body).includes(uid),'No member IDs are returned');
 assert(!JSON.stringify(body).includes('must-stay-private'),'Never expose provider credentials');
 assert(!('productInventory' in body),'Lazy operations API must not load catalog or full owner roadmap');
 meterAvailable=false;r=await onRequest({request:req(),env});body=await r.json();
 assert.equal(r.status,200);assert.equal(body.aiServiceAudit.available,false);
 assert.equal(body.aiServiceAudit.reservedToday,null,'Missing ledger must not be reported as zero usage');
 const html=readFileSync(new URL('../owner-roadmap.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../assets/js/owner-roadmap-product-readiness-v01491.js',import.meta.url),'utf8');
 assert(html.includes('id="or-ai-service-audit-load"'));
 assert(html.includes('id="or-ai-service-audit-data"'));
 assert(js.includes('async function loadAiOwnerAudit()'));
 assert(js.includes("action=ai-service-audit"));
 console.log('PASS v104: Owner-only private AI reservations, aggregate no PII, disabled accounts denied, missing SQL fails visibly, privileged key never exposed.');
}finally{globalThis.fetch=prior}
