/* Real edge assessment handler with intentionally poisoned provider fixture.
 * Synthetic case metadata is NOT a real reviewed/published production set.
 */
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/assessment-v0135.js';
import {readFileSync} from 'node:fs';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',good='case_approved';
const original=globalThis.fetch;
const json=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{'content-type':'application/json'}});
const dims=['knowledge','recognition','decision','process'];
const questions=dims.map((d,i)=>({
 id:'Q'+(i+1),dimension:d,prompt:'What evidence supports the decision at the observed time?',
 options:[{code:'A',label:'Document observed evidence',correct:true,graderNote:'SECRET RUBRIC'},
          {code:'B',label:'Guess future price',incorrect:true,gradingWeight:123}],
 answer_key:'SECRET',critical:true,explanation:'PRIVATE',rubric:{answers:['SECRET']},
 solution:'SECRET',futureCandles:[{close:999}],verifiedAnswer:'SECRET'
}));
const cases=[
 {case_code:good,title:'Original fictional decision case',description:'Self-contained illustrative review',
  competency_code:'TEST_PROCESS',version:1,questions,
  answer_key:{Q1:'A'},reviewed_at:'2026-10-26T00:00:00Z'},
 {case_code:'broken_case',title:'Incomplete example',version:1,questions:[questions[0]]}
];
let calls=[],allow=true,kind='member';
globalThis.fetch=async(url,init={})=>{
 const u=String(url);calls.push({u,init});
 if(u.endsWith('/auth/v1/user'))return json({id:uid});
 if(u.includes('/profiles?'))return json([{account_kind:kind}]);
 if(u.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(u.includes('/rpc/my_platform_access'))return json({allTools:allow});
 if(u.includes('/competency_cases_v135?'))return json(cases);
 if(u.includes('/competency_attempts_v135?'))return json([]);
 if(u.includes('/rpc/submit_competency_case_v135')){
  return json({ok:true,score:75,criticalErrors:0});
 }
 throw Error('Unexpected request: '+u);
};
const env={SUPABASE_URL:'https://fixtures.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',
 SUPABASE_SECRET_KEY:'sb_secret_fixture'};
const request=(action='list',method='GET',body)=>new Request(
 'https://example.test/api/assessment-v0135?action='+action,{
 method,headers:{authorization:'Bearer signed-member',
 ...(body?{'content-type':'application/json'}:{})},
 ...(body?{body:JSON.stringify(body)}:{})});
try{
 let r=await onRequest({env,request:request()}),data=await r.json();
 assert.equal(r.status,200);
 assert.equal(data.cases.length,1,'Malformed reviewed cases are not offered for grading');
 assert.equal(data.cases[0].code,good);
 assert.equal(data.cases[0].questions.length,4);
 assert.deepEqual(Object.keys(data.cases[0].questions[0]),['id','dimension','prompt','options']);
 assert.deepEqual(Object.keys(data.cases[0].questions[0].options[0]),['code','label']);
 const body=JSON.stringify(data);
 for(const forbidden of ['SECRET','answer_key','correct','graderNote','rubric',
   'futureCandles','gradingWeight','verifiedAnswer','solution','critical']){
  assert(!body.includes(forbidden),'Protected or extra case field leaked: '+forbidden);
 }
 assert(calls.find(x=>x.u.includes('competency_cases_v135?')).u.includes('reviewed_at=not.is.null'),
  'Only reviewed active questions should be listed');
 const dbCalls=calls.filter(x=>x.u.includes('/rest/v1/')&&!x.u.includes('rpc/my_platform_access'));
 assert(dbCalls.every(x=>x.init.headers.apikey==='sb_secret_fixture'));
 assert(dbCalls.every(x=>!x.init.headers.authorization),
  'Supabase sb_secret_* may not be sent as Bearer JWT');
 const access=calls.find(x=>x.u.includes('/rpc/my_platform_access'));
 assert.equal(access.init.headers.authorization,'Bearer signed-member',
  'Authorization for member-scoped access still uses their actual JWT');
 r=await onRequest({env,request:request('submit','POST',{
  caseCode:good,answers:{Q1:'A',Q2:'B',Q3:'A',Q4:'B'}
 })});
 assert.equal(r.status,200);
 const submission=await r.json();
 assert.equal(submission.result.score,75);
 assert(!JSON.stringify(submission).includes('SECRET'));
 allow=false;
 r=await onRequest({env,request:request()});
 assert.equal(r.status,403,'No premium access means no reviewed case JSON');
 allow=true;kind='showcase';
 r=await onRequest({env,request:request()});
 assert.equal(r.status,403,'Showcase cannot receive protected assessment');
 const src=readFileSync('functions/api/assessment-v0135.js','utf8');
 assert(src.includes('questions,')&&src.includes('return null'));
 assert(!src.includes('questions:c.questions'));
 console.log('PASS protected assessment list DTO: no answer/rubric/future fields, reviewed only, modern Supabase auth and entitlement gates.');
}finally{globalThis.fetch=original}
