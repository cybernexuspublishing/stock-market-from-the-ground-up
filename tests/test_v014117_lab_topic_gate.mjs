// v117 — refuse the original v96 seed rubric until a topic question exists.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/training-editor.js';
const src=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const register=src('docs/419_LAB_TOPIC_ALIGNMENT_REVIEW_v014117.csv').trim().split(/\r?\n/);
assert.equal(register.length,420);
assert.equal(new Set(register.slice(1).map(r=>r.split(',')[0])).size,419);
assert(register.some(r=>r.includes('F1-C07-L02')));
assert(src('assets/js/training-editor.js').includes('TOPIC-SPECIFIC QUESTION REQUIRED'));
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public',SUPABASE_SECRET_KEY:'secret'};
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let owner=true,approved=0,staleReview=false,sourceStatus='original_hypothetical_unreviewed_v01496',rubricVersion=96,questions=[
 {id:'EVIDENCE',kind:'choice',prompt:'First observation evidence question',explanation:'Observed evidence only.',options:['One','Two']},
 {id:'FOCUS',kind:'choice',prompt:'First observation focus question',explanation:'Focus on what is observable.',options:['One','Two']},
 {id:'ORIGINAL_MATH',kind:'number',prompt:'Observed price range arithmetic',explanation:'Price range is high minus low.',tolerance:0},
 {id:'BOUNDARY',kind:'choice',prompt:'Decision boundary question',explanation:'Commit before the next bar.',options:['One','Two']}
];
const baseKeys={EVIDENCE:'One',FOCUS:'One',ORIGINAL_MATH:50,BOUNDARY:'One'};
const original=globalThis.fetch;
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async (url,init={})=>{
 const u=String(url);
 if(u.endsWith('/auth/v1/user'))return json({id:uid});
 if(u.includes('/profiles?'))return json([{account_kind:'member'}]);
 if(u.includes('/admin_user_roles?'))return json(owner?[{role_code:'OWNER',expires_at:null}]:[]);
 if(u.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(u.includes('/lab_training_sets_v014?')&&init.method==='PATCH'){
  assert(u.includes('review_state=eq.draft')&&u.includes('updated_at=eq.'),'Review must use revision-locked update');
  if(staleReview)return json([]);
  approved++;return json([{lab_id:'F1-C07-L02',version:rubricVersion}]);
 }
 if(u.includes('/lab_training_sets_v014?'))return json([{
  lab_id:'F1-C07-L02',version:rubricVersion,review_state:'draft',updated_at:'2026-10-26T06:00:00.123456Z',
  source_status:sourceStatus,questions,
  answer_key:{...baseKeys,...(questions.some(q=>q.id==='ETF_INDEX_APPLICATION')?{ETF_INDEX_APPLICATION:'One'}:{}),
   ...(rubricVersion===97?{B01_APPLICATION:'A correct distinction',B01_LIMITATION:'A valid limitation'}:{})}
 }]);
 throw Error('Unexpected API call '+u);
};
const run=()=>onRequest({env,request:new Request('https://site.test/api/training-editor?action=review',{
 method:'POST',headers:{authorization:'Bearer test',origin:'https://site.test','content-type':'application/json'},
 body:JSON.stringify({labId:'F1-C07-L02',title:'ETF Versus Index',version:rubricVersion,confirmPhrase:'REVIEW BOOK RUBRIC'})
})});
try{
 let r=await run();assert.equal(r.status,409);assert.equal(approved,0);
 const originalChoiceOptions=questions[0].options;
 questions[0].options=['One',' one '];
 r=await run();assert.equal(r.status,400,'Duplicate and whitespace-equivalent choice distractors must be rejected for every rubric');
 assert.equal(approved,0);
 questions[0].options=originalChoiceOptions;
 baseKeys.EVIDENCE=' One ';
 r=await run();assert.equal(r.status,400,'Whitespace-ambiguous answer key must be rejected');
 assert.equal(approved,0);
 baseKeys.EVIDENCE='One';
 const numericSeed=questions[2];
 questions[2]={...numericSeed,partialTolerance:10,partialCreditPct:50,criticalOnWrong:true};
 r=await run();assert.equal(r.status,409,'Valid optional grading metadata must not bypass individual rubric review');
 assert.equal(approved,0);
 questions[2]={...numericSeed,partialTolerance:0,partialCreditPct:50};
 r=await run();assert.equal(r.status,400,'Partial tolerance must exceed exact-answer tolerance');
 assert.equal(approved,0);
 questions[2]={...numericSeed,partialTolerance:10,partialCreditPct:110};
 r=await run();assert.equal(r.status,400,'Partial credit percentage must be below 100');
 assert.equal(approved,0);
 questions[2]={...numericSeed,criticalOnWrong:'yes'};
 r=await run();assert.equal(r.status,400,'Critical error authoring must be typed boolean');
 assert.equal(approved,0);
 questions[2]=numericSeed;
 questions=[...questions,{id:'ETF_INDEX_APPLICATION',kind:'choice',
 prompt:'An index is a calculated benchmark while a listed ETF is an exchange-traded fund whose shares represent exposure to assets. Which response distinguishes them?',
 explanation:'A benchmark index is calculated using its defined rules; investors cannot directly buy the index. ETFs issue tradable fund shares, hold or replicate asset exposures, and can have expense ratios and tracking differences.',
 options:['One','Two']}];
 r=await run();assert.equal(r.status,200);assert.equal(approved,1);
 // Distinct B01 version: insufficient source cases may never bypass review.
 sourceStatus='original_hypothetical_b01_individual_review_pending_v01497';rubricVersion=97;
 const caseApplication={id:'B01_APPLICATION',kind:'choice',
  prompt:'FICTIONAL: An ETF is quoted at sixty dollars and an index is at twelve hundred points. Which investment can actually be purchased as a fund share?',
  explanation:'An ETF is a tradable fund share whereas an index is a benchmark calculation. Trading spreads, expenses and index-tracking differences must be explained.',
  options:['A correct distinction','A false distinction','An unsupported guarantee']};
 const caseLimitation={id:'B01_LIMITATION',kind:'choice',
  prompt:'What limitation applies to this index and ETF comparison?',
  explanation:'An ETF can diverge from its benchmark due to tracking, fees, transaction costs and execution prices.',
  options:['A valid limitation','A guaranteed match','Identical price units']};
 questions=questions.slice(0,4).concat(caseApplication);
 r=await run();assert([400,409].includes(r.status),'Missing B01 case must be rejected by validation or review gate');
 assert.equal(approved,1);
 questions=[...questions,caseLimitation];
 questions[5]={...caseLimitation,options:['A valid limitation','A valid limitation','Identical price units']};
 r=await run();assert([400,409].includes(r.status),'Duplicate distractors must fail B01 review');
 assert.equal(approved,1);
 questions[5]={...caseLimitation,explanation:'Too brief.'};
 r=await run();assert([400,409].includes(r.status),'Non-substantive explanation must fail B01 review');
 assert.equal(approved,1);
 questions[5]=caseLimitation;
 r=await run();assert.equal(r.status,409,
  'Two authored case questions never justify approving the four generic v96 templates');
 assert.equal(approved,1);
 questions[0]={id:'EVIDENCE',kind:'choice',
  prompt:'An index level and an ETF quote are visible. Which item can a fund investor actually purchase?',
  explanation:'A share in an ETF can be bought and sold under actual brokerage order conditions; a numerical index level is a calculated benchmark, not a tradable share.',
  options:['One','Two','Three']};
 questions[1]={id:'FOCUS',kind:'choice',
  prompt:'Which separate risks must a learner consider when comparing ETF and benchmark returns?',
  explanation:'Investor fund returns may be affected by fund costs, tracking variations and bid-ask spreads. Index points do not establish executable ETF prices or actual returns.',
  options:['One','Two','Three']};
 questions[2]={id:'ORIGINAL_MATH',kind:'number',
  prompt:'FICTIONAL: Ten ETF shares at $5 each have what gross position value in dollars, before fees?',
  explanation:'Multiply the ten fund shares by the five-dollar price to obtain the gross notional value; this illustration says nothing about eventual execution or investment profit.',
  tolerance:0};
 questions[3]={id:'BOUNDARY',kind:'choice',
  prompt:'Which claim exceeds what a simplified market index level can establish about ETF execution?',
  explanation:'The index is a calculated benchmark, so it cannot guarantee that a separate ETF trade is executable at an identical numerical value or without a spread.',
  options:['One','Two','Three']};
 const originalCase=questions[4];
 questions[4]={...originalCase,explanation:originalCase.explanation+
  ' This improperly repeats the private keyed selection: A correct distinction.'};
 r=await run();
 assert.equal(r.status,409,'An otherwise valid B01 draft must not quote its private keyed option');
 const privateEcho=await r.json();
 assert.match(privateEcho.error,/repeats an exact keyed choice/);
 assert.equal(approved,1,'Owner review must not update a keyed-echo draft');
 questions[4]=originalCase;
 r=await run();assert.equal(r.status,200,
  'Complete individualized six-question fixture is reviewable only through explicit Owner action');
 assert.equal(approved,2);
 const topicClean=questions[0];
 questions[0]={...topicClean,prompt:'In "ETF Versus Index", which learning method correctly distinguishes evidence from inference?'};
 r=await run();assert.equal(r.status,409,'Generic v96 question cannot be promoted as B01');
 questions[0]={...topicClean};
 const validBoundary=questions[3];
 questions[3]={...validBoundary,options:['One','One','Three']};
 r=await run();assert([400,409].includes(r.status),'Duplicate choices must fail closed');
 questions[3]=validBoundary;
 const numeric=questions[2];
 questions[2]={...numeric,prompt:'Original observed high and low range in cents?'};
 r=await run();assert.equal(r.status,409,'Unrelated generic arithmetic cannot be promoted');
 questions[2]=numeric;
 assert.equal(approved,2,'Invalid review attempts must never mutate review state');
 staleReview=true;
 r=await run();assert.equal(r.status,409,'Concurrent update must reject Owner review');
 assert.equal(approved,2,'Stale approval cannot mutate reviewed state');
 staleReview=false;
 owner=false;r=await run();assert.equal(r.status,403);assert.equal(approved,2);
}finally{globalThis.fetch=original}
console.log('PASS v117: 419 canonical candidate register, unamended v96 approval denied, added topic question and Owner ACL required.');
