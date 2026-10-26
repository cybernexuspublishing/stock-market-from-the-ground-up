/* 83 original Site-exclusive Guided Beta lessons: member permission and confidentiality.
 * TEST FIXTURES ONLY, no actual account, market prices, Stripe or CAPTCHA changes.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BETA_UPCOMING_IDS,BETA_CANDIDATE_IDS} from '../functions/_lib/lab-beta-scope-v014286.js';
import {authoredSiteExclusiveBetaLesson,SITE_BETA_BATCH,SITE_BETA_STATUS} from '../functions/_lib/site-exclusive-private-lesson-v014294.js';
import {publicGuidedLesson,onRequest as lesson} from '../functions/api/lab-content.js';
import {onRequest as memberContext} from '../functions/api/lab-player-context.js';
import {onRequest as availability} from '../functions/api/lab-release-availability.js';
import {onRequest as training} from '../functions/api/interactive-training.js';
const LAB='SITE-018',actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
assert.equal(BETA_UPCOMING_IDS.length,83);
assert.equal(BETA_CANDIDATE_IDS.length,336);
assert.equal(BETA_UPCOMING_IDS[0],LAB);
const STAGES=['Start','Learn','Experiment','Predict','Practice','Assess','Review','Transfer','Results'];
const privateMarker='PRIVATE_UNPUBLISHED_GRADING_KEY_NEVER_TO_BROWSER';
const content={
 id:LAB,book:6,concept:'Trading Journal & Performance Analytics — Why It Matters',
 objective:'Differentiate documented decisions from outcomes in a dated research review.',
 what:'A dated journal records a predeclared plan, actual decisions and a post-event audit.',
 why:'A remembered winning trade hides selection bias, missing fills and deviation from the plan.',
 when:'After a hypothetical study; avoid claims of provider-confirmed fills unless separately proven.',
 commonError:'A hindsight-selected chart cannot prove the member followed the plan at the earlier time.',
 limitation:'Every example is fictional and no real-market transaction, price or performance is inferred.',
 workedExample:'FICTIONAL: +2R, -1R and -2R yields net -1R, average -0.33R before costs.',
 lessonBatch:SITE_BETA_BATCH,exampleType:'ORIGINAL_FICTIONAL_EDUCATIONAL',
 historicalEvidence:'NOT_VERIFIED_NO_ACTUAL_MARKET_BARS',
 publicationClaim:'DRAFT_AUTHORED_UNGRADED_SUBJECT_TO_INDIVIDUAL_EDITORIAL_REVIEW',
 sourceURLs:['https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/executing-order'],
 privateReviewerRubric:privateMarker,answer_key:privateMarker,
 steps:STAGES.map(stage=>stage+' — Teach this beginner with timestamped fictional records. Explain evidence, a no-trade outcome, a mistake and an independent correction.'),
 teaching:{what:'A timestamped journal is a study record, not a brokerage trade confirmation.'}
};
const row={lab_id:LAB,book_number:6,source_status:SITE_BETA_STATUS,content};
assert.equal(authoredSiteExclusiveBetaLesson(row),true);
for(const alt of [
 {...row,source_status:'original_hypothetical_unreviewed_v01496'},
 {...row,book_number:1},
 {...row,content:{...content,steps:[...content.steps.slice(0,8)]}},
 {...row,content:{...content,sourceURLs:[]}},
 {...row,content:{...content,lessonBatch:'other-release'}},
 {...row,content:{...content,sourceURLs:['https://attacker.example/market']}}
]) assert.equal(authoredSiteExclusiveBetaLesson(alt),false);
const publicContent=publicGuidedLesson(content,LAB,6);
assert.equal(publicContent.book,6);
assert.equal(publicContent.steps.length,9);
assert.equal(publicContent.sourceLinks.length,1);
assert(!JSON.stringify(publicContent).includes(privateMarker));

const realFetch=globalThis.fetch;
const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',
 SUPABASE_SECRET_KEY:'sb_secret_fixture'};
let premium=true,member=true,suspended=false,complete=true;
const seen=[];
const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
const request=path=>new Request('https://website.example'+path,{headers:{authorization:'Bearer genuine-fixture-token'}});
globalThis.fetch=async (value,opts={})=>{
 const uri=new URL(value),name=uri.pathname.split('/').at(-1);
 seen.push(uri.pathname+uri.search);
 assert.equal(opts.cache,'no-store','Private calls must never use a shared cache');
 if(uri.pathname==='/auth/v1/user')return respond({id:actor});
 if(name==='profiles')return respond([{account_kind:member?'member':'showcase'}]);
 if(name==='admin_user_flags')return respond([{status:suspended?'suspended':'active'}]);
 if(name==='user_has_tool_access')return respond(premium);
 if(name==='platform_labs')return respond([{lab_id:LAB,title:content.concept,
  book_code:'SITE_EXCLUSIVE',active:true,registry_visible:true,lab_type:'supplemental',metadata:{},
  what:'Original journal review',why:'Purpose-driven evidence',objective:content.objective,how:['one','two','three']}]);
 if(name==='lab_instruction_v014') {
  if(!complete)return respond([]);
  // PostgREST projects named JSON fields into columns for the public ID-only gate.
  if(uri.searchParams.get('select')?.includes('lesson_batch:'))
   return respond([{lab_id:LAB,book_number:6,source_status:SITE_BETA_STATUS,
    reviewed_by:null,reviewed_at:null,concept:content.concept,
    objective:content.objective,why:content.why,steps:content.steps,
    lesson_batch:SITE_BETA_BATCH,example_type:content.exampleType,
    sources:content.sourceURLs}]);
  return respond([row]);
 }
 if(['user_library','book_key_redemptions','user_plan_grants','site_subscriptions',
     'user_tool_passes','admin_user_roles'].includes(name))return respond([]);
 if(name==='lab_training_sets_v014')return respond([]);
 throw Error('Unexpected fixture data request '+uri);
};
try {
 let r=await lesson({request:request('/api/lab-content?id='+LAB),env});
 assert.equal(r.status,200);let x=await r.json();
 assert.equal(x.lab.id,LAB);assert.equal(x.lab.steps.length,9);
 assert.equal(x.lab.book,6);assert.equal(x.sourceStatus,'site_exclusive_original_authored_guided_beta_ungraded');
 assert.equal(x.gradedCreditEligible,false);assert.equal(x.assessmentReviewed,false);
 assert(!JSON.stringify(x).includes(privateMarker));
 r=await lesson({request:request('/api/lab-content?action=list'),env});
 assert.equal(r.status,200);x=await r.json();
 assert.deepEqual(x.labs.map(l=>l.id),[LAB]);
 assert.equal(x.labs[0].learningAccess,'authorized_site_exclusive_beta');
 assert.equal(x.labs[0].officialGradingAvailable,false);
 r=await memberContext({request:request('/api/lab-player-context?id='+LAB),env});
 assert.equal(r.status,200);x=await r.json();
 assert.equal(x.lab.practiceSteps.length,9);
 assert.equal(x.assessmentReviewed,false);assert.equal(x.instructionReviewed,false);
 assert.equal(x.sourceStatus,'site_exclusive_original_authored_guided_beta_ungraded');
 assert(!JSON.stringify(x).includes(privateMarker));
 r=await availability({request:request('/api/lab-release-availability'),env});
 assert.equal(r.status,200);x=await r.json();
 assert(x.guidedBetaIds.includes(LAB));
 assert(!x.publishedIds.includes(LAB),'No unreviewed grade');
 assert(!JSON.stringify(x).includes(privateMarker));
 r=await training({request:request('/api/interactive-training?action=available&labId='+LAB),env});
 assert.equal(r.status,404,'Unreviewed Site-exclusive labs must not unlock grading');
 premium=false;
 r=await lesson({request:request('/api/lab-content?id='+LAB),env});
 assert.equal(r.status,403,'No paid or QA learning right');
 r=await memberContext({request:request('/api/lab-player-context?id='+LAB),env});
 assert.equal(r.status,403);
 premium=true;member=false;
 r=await lesson({request:request('/api/lab-content?id='+LAB),env});
 assert.equal(r.status,403,'Showcase cannot inspect private teaching');
 member=true;suspended=true;
 r=await lesson({request:request('/api/lab-content?id='+LAB),env});
 assert.equal(r.status,403,'Restricted member cannot inspect private teaching');
 suspended=false;complete=false;
 r=await lesson({request:request('/api/lab-content?id='+LAB),env});
 assert.equal(r.status,404,'Missing instruction denies Start');
 r=await memberContext({request:request('/api/lab-player-context?id='+LAB),env});
 assert.equal(r.status,404);
 r=await lesson({request:new Request('https://website.example/api/lab-content?id='+LAB),env});
 assert.equal(r.status,401,'Anonymous guests cannot read private teaching');
 const activeUI=readFileSync('assets/js/labs.js','utf8');
 assert(activeUI.includes('guidedBetaLabs.has(x.id)')&&activeUI.includes('Open guided beta practice (ungraded)'));
 const source=readFileSync('functions/api/lab-content.js','utf8');
 assert(!/return send\(\{ok:true,lab:row\.content\b/.test(source));
 assert(seen.some(x=>x.includes('lab_instruction_v014')));
 console.log('PASS 83 Site-exclusive Labs: private 9-stage content, matched scope, ungraded access, no rubric leak, owner test entitlement, Showcase/restricted/anonymous/missing-source denial');
}finally{globalThis.fetch=realFetch}
