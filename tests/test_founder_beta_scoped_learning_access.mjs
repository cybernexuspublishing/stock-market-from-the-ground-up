/* Founding 600 B01 beta release policy; no real customers, payments or protected keys.
 * The Founding plan grants learning access, NOT a purchased ebook, and an
 * unreviewed draft must never cause an official score or mastery award.
 */
import assert from 'node:assert/strict';
import {onRequest as lesson} from '../functions/api/lab-content.js';
import {onRequest as graded} from '../functions/api/interactive-training.js';
import {authoredB01BetaLesson,activeFoundingBetaLearningPlan,foundingBetaLearningAccessKind} from '../functions/_lib/founding-beta-learning-access.js';
const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const LAB='F1-C02-L02',NEXT='SITE-018';
const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fake',
 SUPABASE_SECRET_KEY:'sb_secret_fake'};
const content={lessonBatch:'2026-10-25-B01',
 authoringStatus:'ORIGINAL_AUTHORED_EDUCATIONAL_DRAFT_NOT_EDITORIALLY_OR_GRADING_ACCEPTED',
 concept:'Blind replay observation setup',
 objective:'Explain which observation a blind replay exercise may show at its decision point.',
 why:'Seeing candles or prints that occurred after the decision supplies future information and invalidates an independent test of trading recognition.',
 steps:['Choose the fictional ticker and replay time before observing the chart.',
  'Hide all later candles and state the evidence available at the decision point.',
  'Record the decision and the invalidation condition before revealing subsequent outcomes.']};
const draft={lab_id:LAB,book_number:1,
 source_status:'original_hypothetical_unreviewed_v01496',content};
const oldFetch=globalThis.fetch;
let member=true,suspended=false,grant=true,premium=true,reviewed=false,qaPass=false,ownerIssuer=true,catalogOverflow=false,seen=[];
const respond=(value,status=200)=>new Response(JSON.stringify(value),{status,
 headers:{'content-type':'application/json'}});
globalThis.fetch=async(input,init={})=>{
 const url=new URL(input),p=url.pathname,search=url.search;
 seen.push(p+search);
 if(p==='/auth/v1/user')return respond({id:user});
 if(p.endsWith('/profiles'))return respond([{account_kind:member?'member':'showcase'}]);
 if(p.endsWith('/admin_user_flags'))return respond([{status:suspended?'suspended':'active'}]);
 if(p.endsWith('/admin_user_roles'))return respond(
  qaPass&&search.includes('role_code=eq.OWNER')&&ownerIssuer
   ?[{role_code:'OWNER',expires_at:null}]:[]);
 if(p.endsWith('/rpc/user_has_tool_access'))return respond(premium);
 if(p.endsWith('/platform_labs'))return respond([{lab_id:LAB,book_code:'FOUNDATION_BOOK_1',active:true,registry_visible:true}]);
 if(p.endsWith('/lab_instruction_v014'))return respond(catalogOverflow?Array.from({length:500},()=>draft):[draft]);
 if(p.endsWith('/lab_training_sets_v014'))return respond(reviewed?[{
  lab_id:LAB,version:97,review_state:'reviewed',source_status:'original_hypothetical_b01_individual_review_pending_v01497',
  questions:[{id:'CASE',prompt:'What is the first observable candle?',kind:'choice',options:['A','B'],explanation:'Private explanatory feedback'}]
 }]:[]);
 if(p.endsWith('/user_library'))return respond([]);
 if(p.endsWith('/book_key_redemptions'))return respond([]);
 if(p.endsWith('/user_plan_grants'))return respond(grant?[{
  plan_code:'FOUNDING_30',status:'active',starts_at:'2026-10-01T00:00:00Z',
  ends_at:'2026-11-01T00:00:00Z',platform_plans:{includes_all_books:false}}]:[]);
 if(p.endsWith('/site_subscriptions'))return respond([]);
 if(p.endsWith('/platform_plans'))return respond([{
  plan_code:'FOUNDING_30',active:true,includes_all_books:false,billing_interval:'none'
 }]);
 if(p.endsWith('/user_tool_passes'))return respond(qaPass?[{
   tool_code:'ONDEMAND_TRAINING',status:'active',starts_at:'2026-10-26T06:00:00Z',
   ends_at:'2026-11-20T06:00:00Z',provider:null,provider_subscription_id:null,
   metadata:{admin_manual:true,source:'owner_manual',adminGrantedBy:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
     reason:'F600_GUIDED_QA_V1: Owner-authorized 30-day noncommercial learning test.'}
 }]:[]);
 if(p.endsWith('/admin_user_roles'))return respond(qaPass&&search.includes('role_code=eq.OWNER')&&ownerIssuer?[{role_code:'OWNER',expires_at:null}]:[]);
 if(p.endsWith('/rpc/v014_training_start'))return respond({
  id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',lab_id:LAB,set_version:97,mode:'assessment',step_index:0,completed_at:null,resumed:false
 });
 throw Error('Unexpected test fetch '+p+search);
};
const request=(path)=>new Request('https://site.test'+path,{headers:{authorization:'Bearer signed-in-session'}});
try{
 assert.equal(authoredB01BetaLesson(draft),true);
 assert.equal(authoredB01BetaLesson({...draft,content:{...content,lessonBatch:'old-unreviewed-template'}}),false);
 assert.equal(await activeFoundingBetaLearningPlan(env,user),true);
 let r=await lesson({request:request('/api/lab-content?id='+LAB),env});
 assert.equal(r.status,200,'Founder learning grant must open the authored beta lesson');
 let body=await r.json();
 assert.equal(body.foundingBetaStudy,true);assert.equal(body.gradedCreditEligible,false);
 assert.equal(body.sourceStatus,'founding600_authored_b01_guided_beta_ungraded');
 assert.equal(body.lab.concept,content.concept);
 assert.equal(body.lab.objective,content.objective);
 assert.deepEqual(body.lab.steps,content.steps);
 assert.equal(body.lab.lessonBatch,undefined,'Protected editorial metadata never reaches the member');
 assert.equal(body.lab.authoringStatus,undefined,'Member receives only allowlisted teaching');
 assert(!JSON.stringify(body).includes('answer_key'));
 // The companion collection must show the same authorized B01 lesson, rather
 // than hiding it solely because the founder has not purchased the ebook.
 r=await lesson({request:request('/api/lab-content?action=list'),env});
 assert.equal(r.status,200);
 body=await r.json();
 assert.deepEqual(body.labs.map(x=>x.id),[LAB]);
 assert.equal(body.labs[0].learningAccess,'scoped_beta');
 assert.equal(body.labs[0].officialGradingAvailable,false);
 catalogOverflow=true;
 r=await lesson({request:request('/api/lab-content?action=list'),env});
 assert.equal(r.status,503,'A truncated catalog cannot silently claim beta learning is empty or complete');
 assert.match((await r.json()).error,/catalog incomplete/i);
 catalogOverflow=false;
 assert.equal(body.labs[0].authoringStatus,undefined);

 r=await graded({request:request('/api/interactive-training?action=available&labId='+LAB),env});
 assert.equal(r.status,200);
 body=await r.json();assert.equal(body.available,false,'No reviewed rubric: no graded assessment');
 assert(!JSON.stringify(body).includes('Private explanatory feedback'));

 reviewed=true;
 r=await graded({request:request('/api/interactive-training?action=available&labId='+LAB),env});
 assert.equal(r.status,200,'Reviewed pinned rubric may be enumerated to entitled founder');
 body=await r.json();assert.equal(body.available,true);
 assert.equal(body.questionCount,1);
 assert(!JSON.stringify(body).includes('Private explanatory feedback'));
 // Actual founding entitlement can attempt reviewed Assessment, without
 // transferring book ownership or exposing pre-answer explanations.
 r=await graded({request:new Request('https://site.test/api/interactive-training?action=start',{
  method:'POST',headers:{authorization:'Bearer signed-in-session','content-type':'application/json'},
  body:JSON.stringify({labId:LAB,mode:'assessment'})}),env});
 assert.equal(r.status,201,'Genuine active founding plan may start a reviewed assessment');
 body=await r.json();assert.equal(body.question?.explanation,undefined);

 // Owner-issued temporary QA passes allow teaching, never official Assessment.
 grant=false;qaPass=true;
 assert.equal(await foundingBetaLearningAccessKind(env,user),'owner_qa');
 r=await lesson({request:request('/api/lab-content?id='+LAB),env});
 assert.equal(r.status,200,'Owner-issued time-limited QA access permits authored B01 lesson');
 body=await r.json();assert.equal(body.ownerQAStudy,true);
 assert.equal(body.sourceStatus,'owner_authorized_b01_guided_beta_ungraded');
 assert.equal(body.gradedCreditEligible,false);
 r=await lesson({request:request('/api/lab-content?action=list'),env});
 assert.equal(r.status,200);
 body=await r.json();assert.deepEqual(body.labs.map(x=>x.id),[LAB]);
 assert.equal(body.labs[0].learningAccess,'scoped_beta');
 r=await graded({request:new Request('https://site.test/api/interactive-training?action=start',{
  method:'POST',headers:{authorization:'Bearer signed-in-session','content-type':'application/json'},
  body:JSON.stringify({labId:LAB,mode:'assessment'})}),env});
 assert.equal(r.status,403,'Owner QA pass cannot start official Assessment');
 assert.match((await r.json()).error,/official Assessment requires/i);
 ownerIssuer=false;
 r=await lesson({request:request('/api/lab-content?id='+LAB),env});
 assert.notEqual(r.status,200,'Non-Owner manual pass cannot open private B01');
 ownerIssuer=true;qaPass=false;
 // An actual Owner-reviewed teaching record must stay accessible after the
 // private editorial source status advances: same authored B01, signed reviewer.
 draft.source_status='editorially_reviewed_educational_illustrative_b01_v1';
 draft.reviewed_by='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 draft.reviewed_at='2026-10-26T08:00:00Z';
 assert.equal(authoredB01BetaLesson(draft),true);
 grant=true;
 r=await lesson({request:request('/api/lab-content?id='+LAB),env});
 assert.equal(r.status,200,'Authenticated-reviewed private B01 remains teachable to founder');
 body=await r.json();assert.equal(body.instructionReviewed,true);
 assert.equal(body.sourceStatus,'founding600_editorially_reviewed_b01_guided_beta');
 draft.reviewed_by=null;
 assert.equal(authoredB01BetaLesson(draft),false,'Unsigned claimed lesson review is denied');
 draft.source_status='original_hypothetical_unreviewed_v01496';
 draft.reviewed_by=undefined;draft.reviewed_at=undefined;
 reviewed=false;grant=false;
 assert.equal(await activeFoundingBetaLearningPlan(env,user),false);
 r=await lesson({request:request('/api/lab-content?id='+LAB),env});
 assert.notEqual(r.status,200,'Ordinary premium member without book cannot open private B01');
 r=await graded({request:request('/api/interactive-training?action=available&labId='+LAB),env});
 assert.equal(r.status,403,'Ordinary non-founder premium member has no book access');
 r=await lesson({request:request('/api/lab-content?action=list'),env});
 assert.equal(r.status,200);
 body=await r.json();assert.deepEqual(body.labs,[], 'Unentitled users cannot enumerate private book-derived lessons');

 grant=true;suspended=true;
 r=await lesson({request:request('/api/lab-content?id='+LAB),env});
 assert.equal(r.status,403,'Suspended founder denied');
 suspended=false;member=false;
 r=await lesson({request:request('/api/lab-content?id='+LAB),env});
 assert.equal(r.status,403,'Showcase is not an eligible founding member');
 member=true;
 r=await lesson({request:request('/api/lab-content?id='+NEXT),env});
 assert.equal(r.status,404,'The 83 post-beta Labs remain unavailable');
 r=await lesson({request:new Request('https://site.test/api/lab-content?id='+LAB),env});
 assert.equal(r.status,401,'No session must not open private beta content');
 console.log('PASS Founding beta: private authored B01 accessible; no ebook/membership fabrication, no premature grade, excluded/no-access/suspended/showcase denied');
}finally{globalThis.fetch=oldFetch}
