import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/lab-content.js';
import {SITE_BETA_BATCH,SITE_BETA_STATUS} from '../functions/_lib/site-exclusive-private-lesson-v014294.js';
// Mocked API regression, NOT a genuine signed-in production member trial.
const env={SUPABASE_URL:'https://unit.supabase.test',SUPABASE_PUBLISHABLE_KEY:'unit_public',SUPABASE_SECRET_KEY:'unit_secret'};
const originalFetch=globalThis.fetch;
const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let labId='DT-C01-L01',book=4,owned=true,training=true,storeUnavailable=false,sourceStatus='private_owner_authored';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
const stages=['Start','Learn','Experiment','Predict','Practice','Assess','Review','Transfer','Results'];
const source=()=>({
 id:'SITE-018',book:6,lessonBatch:SITE_BETA_BATCH,exampleType:'ORIGINAL_FICTIONAL_EDUCATIONAL',
 publicationClaim:'DRAFT_AUTHORED_UNGRADED_SUBJECT_TO_INDIVIDUAL_EDITORIAL_REVIEW',
 historicalEvidence:'NOT_VERIFIED_NO_ACTUAL_MARKET_BARS',
 concept:'Responsible source verification and uncertainty',
 objective:'Distinguish an issuer disclosure from a quote and market execution',
 what:'A price claim can come from different source types and needs verification.',
 why:'Source reliability, timing, and licensed observations affect conclusions.',
 when:'Before creating a watchlist, research assessment, or no-trade decision.',
 commonError:'Treating a reported statement as a verified broker execution.',
 limitation:'No verified historical bars, real fills, or assessment keys are included.',
 workedExample:'FICTIONAL: a source report appears after the decision pause and cannot support a prior trade.',
 steps:stages.map((x,i)=>x+' — Original ungraded educational prompt '+i+': identify a source, a time and an uncertainty.'),
 sourceURLs:['https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/types-orders']
});
globalThis.fetch=async url=>{
 const u=new URL(url);
 if(u.pathname.endsWith('/auth/v1/user'))return json({id:user});
 if(u.pathname.endsWith('/rpc/user_has_tool_access'))return json(training);
 if(u.pathname.endsWith('/lab_instruction_v014'))return storeUnavailable?json({code:'42P01'},404):json([{
  lab_id:labId,book_number:book,source_status:sourceStatus,
  content:book===6?source():{id:labId,book,concept:'Original fictional exercise',
   objective:'A protected educational objective.',why:'Understand bounded source evidence.',steps:['Start — Learn','Learn — Apply','Review — Transfer']}
 }]);
 if(u.pathname.endsWith('/profiles'))return json([{account_kind:'member'}]);
 if(u.pathname.endsWith('/admin_user_flags'))return json([{status:'active'}]);
 if(u.pathname.endsWith('/user_library')){
  const expected={1:'FOUNDATION_BOOK_1',4:'DAY_TRADING_BOOK_1',5:'READING_THE_TAPE'}[book];
  assert.equal(u.searchParams.get('product_code'),'eq.'+expected);
  return json(owned?[{product_code:expected,expires_at:null}]:[]);
 }
 if(u.pathname.endsWith('/book_key_redemptions')||u.pathname.endsWith('/user_plan_grants')||
    u.pathname.endsWith('/site_subscriptions')||u.pathname.endsWith('/admin_user_roles'))return json([]);
 throw Error('Unexpected request '+u.pathname);
};
const request=()=>new Request('https://site.test/api/lab-content?id='+labId,{headers:{authorization:'Bearer member.token'}});
try{
 for(const [lab,b] of [['DT-C01-L01',4],['TAPE-C01-L01',5]]){
  labId=lab;book=b;owned=true;training=false;sourceStatus='private_owner_authored';
  let r=await onRequest({request:request(),env});
  assert.equal(r.status,200,'Matching book unlocks its own source-protected instructional Lab');
  owned=false;r=await onRequest({request:request(),env});
  assert.equal(r.status,403,'A member without the matching book must not read private instruction');
 }
 // The 83 SITE Lab identifiers remain UPCOMING in the public Lab Registry.
 // Their separately authored private source may be inspected through an
 // authorized ungraded study route, with no Start/grade/mastery claim.
 labId='SITE-018';book=6;training=true;sourceStatus=SITE_BETA_STATUS;
 let r=await onRequest({request:request(),env});
 assert.equal(r.status,200,'A canonical SITE lesson with strict authored metadata requires training access');
 let body=await r.json();
 assert.equal(body.sourceStatus,'site_exclusive_original_authored_guided_beta_ungraded');
 assert.equal(body.gradedCreditEligible,false);
 training=false;r=await onRequest({request:request(),env});assert.equal(r.status,403);
 labId='F1-C02-L01';book=1;owned=true;sourceStatus='original_hypothetical_unreviewed_v01496';training=true;
 r=await onRequest({request:request(),env});assert.equal(r.status,200);
 assert.equal((await r.json()).sourceStatus,'private_unreviewed_conceptual_orientation');
 storeUnavailable=true;r=await onRequest({request:request(),env});assert.equal(r.status,503);
 assert.equal((await r.json()).code,'PRIVATE_LAB_STORE_UNAVAILABLE','The player may retry through independently authorized metadata only');
 console.log('PASS private Lab canonical book mapping, 83 Upcoming protected SITE source, no grade, entitlement denial, source outage fallback');
}finally{globalThis.fetch=originalFetch}
