/* Source and mocked API regression for existing $29.99 INTERACTIVE_LEARNING
 * standalone entitlement. NO provider charge or member records created.
 * 83 Upcoming SITE lessons must not be an unintended bundled purchase.
 */
import assert from 'node:assert/strict';
import {onRequest as labContent} from '../functions/api/lab-content.js';
import {onRequest as labContext} from '../functions/api/lab-player-context.js';
import {onRequest as toolEndpoint} from '../functions/api/member-tool-access.js';
import {readFileSync} from 'node:fs';
import {SITE_BETA_BATCH,SITE_BETA_STATUS} from '../functions/_lib/site-exclusive-private-lesson-v014294.js';
const env={SUPABASE_URL:'https://mock.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const member='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const originalFetch=globalThis.fetch;
let interactive=true,training=false,hasBook=false,restricted=false,unauthenticated=false,failInteractive=false;
const reply=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}});
const siteContent={
 id:'SITE-018',book:6,lessonBatch:SITE_BETA_BATCH,
 exampleType:'ORIGINAL_FICTIONAL_EDUCATIONAL',
 publicationClaim:'DRAFT_AUTHORED_UNGRADED_SUBJECT_TO_INDIVIDUAL_EDITORIAL_REVIEW',
 historicalEvidence:'NOT_VERIFIED_NO_ACTUAL_MARKET_BARS',
 concept:'Recognize the limits of reported equity price evidence',
 objective:'Explain what an issuer announcement may or may not establish at a decision pause.',
 what:'Issuer disclosures are assertions that must be identified and checked independently.',
 why:'News timing, quote timing and licensed data provenance determine what was knowable.',
 when:'Use this source-evidence method before considering a practice trade decision.',
 commonError:'Mistaking article hindsight and a chart screenshot for an executable trading record.',
 limitation:'This teaching example has no real fills, private grading, or verified historical candles.',
 workedExample:'FICTIONAL: a source report after the pause cannot establish a trade at the earlier pause.',
 sourceURLs:['https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/types-orders'],
 steps:['Start','Learn','Experiment','Predict','Practice','Assess','Review','Transfer','Results']
  .map((x,i)=>x+' — Original fictional guided evidence step '+(i+1)+': log dated statements and uncertainty.')
};
const canonical={lab_id:'F2-C07-L01',book_number:2,source_status:'original_hypothetical_unreviewed_v01496',
 content:{id:'F2-C07-L01',book:2,concept:'Candlestick anatomy',objective:'Understand candle open, high, low and close.',
 why:'Candle reference prices express a bounded time interval.',
 steps:['Check open and close carefully','Compare the high and low price labels','Explain the body and full price range'],
 grader:'PRIVATE_NEVER_EXPOSED',correctAnswer:'PRIVATE_NEVER_EXPOSED'}};
globalThis.fetch=async (url,opt={})=>{
 const u=new URL(url),p=u.pathname;
 if(p.endsWith('/auth/v1/user'))return unauthenticated?reply({error:'Invalid token'},401):reply({id:member});
 if(p.endsWith('/profiles'))return reply([{account_kind:'member'}]);
 if(p.endsWith('/admin_user_flags'))return reply([{status:restricted?'suspended':'active'}]);
 if(p.endsWith('/rpc/user_has_tool_access')){
  const target=JSON.parse(opt.body||'{}').target_tool;
  if(target==='INTERACTIVE_LEARNING'&&failInteractive)return reply({error:'Unavailable'},503);
  return reply(target==='INTERACTIVE_LEARNING'?interactive:target==='ONDEMAND_TRAINING'?training:false);
 }
 if(p.endsWith('/platform_labs')) {
  const id=u.searchParams.get('lab_id')?.replace(/^eq\./,'')||'F2-C07-L01';
  return reply([{lab_id:id,active:true,registry_visible:true,
   book_code:id.startsWith('SITE-')?'SITE_EXCLUSIVE':'FOUNDATION_BOOK_2',
   title:'Authentic research skills and market risk',chapter_number:7,
   lab_type:'candle',metadata:{what:'A candlestick displays four reference prices during a time interval.',
    why:'It supports comparison but not a forecast or unknown trade order.',
    when:'Before writing a conditional analysis and no-trade plan.',
    objective:'Identify four prices and classify the current evidence.',
    how:['Locate the open','Identify the close','Measure the price range'],
    questions:['What does the body exclude?'],answer_key:'SECRET'}}]);
 }
 if(p.endsWith('/lab_instruction_v014')){
  const id=u.searchParams.get('lab_id')?.replace(/^eq\./,'');
  return reply(id==='SITE-018'?[{lab_id:'SITE-018',book_number:6,
   source_status:SITE_BETA_STATUS,content:siteContent}]:[canonical]);
 }
 if(p.endsWith('/user_library'))return reply(hasBook?[{product_code:'FOUNDATION_BOOK_2',expires_at:null}]:[]);
 if(p.endsWith('/book_key_redemptions')||p.endsWith('/user_plan_grants')||
   p.endsWith('/site_subscriptions')||p.endsWith('/admin_user_roles'))return reply([]);
 throw Error('Unexpected mocked route: '+p);
};
const request=(endpoint,id)=>new Request('https://mock.site'+endpoint+
 (id?'?id='+encodeURIComponent(id):''),{headers:{authorization:'Bearer member.jwt'}});
try{
 let r=await toolEndpoint({env,request:new Request('https://mock.site/api/member-tool-access?tool=INTERACTIVE_LEARNING',
  {headers:{authorization:'Bearer member.jwt'}})});
 assert.equal(r.status,200);assert.equal((await r.json()).authorized,true);

 r=await labContext({env,request:request('/api/lab-player-context','F2-C07-L01')});
 assert.equal(r.status,200,'Paid Interactive Learning must open canonical Lab orientation');
 let result=await r.json();
 assert.equal(result.guidedAllowed,true);
 assert.equal(result.advancedAllowed,true);
 assert.equal(result.sourceStatus,'canonical_registry_safe_orientation_only');
 assert(!JSON.stringify(result).includes('SECRET'));

 r=await labContent({env,request:request('/api/lab-content','F2-C07-L01')});
 assert.equal(r.status,404,'Purchase does not grant separate Book II authored private lesson');
 r=await labContent({env,request:request('/api/lab-content','SITE-018')});
 assert.equal(r.status,404,'Purchase does not grant the 83 separately scoped Upcoming SITE private lessons');
 r=await labContext({env,request:request('/api/lab-player-context','SITE-018')});
 assert.equal(r.status,403,'No Upcoming SITE study from Interactive Learning alone');

 hasBook=true;
 r=await labContent({env,request:request('/api/lab-content','F2-C07-L01')});
 assert.equal(r.status,200,'Independent Book II ownership permits the corresponding lesson');
 result=await r.json();
 assert.equal(result.gradedCreditEligible,false);
 assert(!JSON.stringify(result).includes('PRIVATE_NEVER_EXPOSED'));
 hasBook=false;

 training=true;
 r=await labContent({env,request:request('/api/lab-content','SITE-018')});
 assert.equal(r.status,200,'An independent training entitlement can open strictly authored ungraded SITE QA lessons');
 assert.equal((await r.json()).gradedCreditEligible,false);
 training=false;interactive=false;
 r=await labContext({env,request:request('/api/lab-player-context','F2-C07-L01')});
 assert.equal(r.status,403,'No active purchase, no unowned Lab');
 interactive=true;restricted=true;
 r=await labContext({env,request:request('/api/lab-player-context','F2-C07-L01')});
 assert.equal(r.status,403,'Suspended account is not reauthorized by a paid product');
 restricted=false;unauthenticated=true;
 r=await toolEndpoint({env,request:new Request('https://mock.site/api/member-tool-access?tool=INTERACTIVE_LEARNING')});
 assert.equal(r.status,401,'Anonymous user cannot invoke tool entitlement');
 unauthenticated=false;failInteractive=true;
 r=await labContext({env,request:request('/api/lab-player-context','F2-C07-L01')});
 assert.equal(r.status,503,'A failing required entitlement RPC cannot invent access');
 const src=readFileSync('functions/api/lab-content.js','utf8');
 assert(src.includes("toolAccess(env,request,'INTERACTIVE_LEARNING')"));
 assert(src.includes('(siteLesson&&training)'));
 assert(src.includes('gradedCreditEligible:false'));
 console.log('PASS Interactive Learning: paid canonical orientation, no Book II text, no SITE private QA, matched-book access, independent training, anonymous/restricted/outage denial.');
}finally{globalThis.fetch=originalFetch}
