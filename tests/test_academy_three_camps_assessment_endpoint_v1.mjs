/* Isolated server-owned grading authorization test: no production network. */
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/academy-protected-assessment-v1.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const original=globalThis.fetch;
const answers=new Map(),calls=[];
let allowed=true,enrolled=true,reviewed=true,approved=true;
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
const q=d=>({id:d,dimension:({Q1:'knowledge',Q2:'recognition',Q3:'decision',Q4:'process'})[d],
 prompt:'Which evidence and conditions are justified by this unfamiliar fictional case? '+d,
 options:[{code:'A',label:'Compare source, time, values and uncertainty.',graderNote:'PRIVATE'},
          {code:'B',label:'Assume the future outcome is certain.'}],
 critical:d==='Q3',rubric:'PRIVATE'});
globalThis.fetch=async(url,options={})=>{
 const u=String(url);calls.push({url:u,options});
 if(u.endsWith('/auth/v1/user'))return json({id:uid});
 if(u.includes('/profiles?'))return json([{account_kind:'member',deleted_at:null}]);
 if(u.includes('/admin_user_flags?'))return json([]);
 if(u.includes('/admin_user_roles?'))return json([]);
 if(u.includes('/rpc/user_has_tool_access'))return json(allowed);
 if(u.includes('/gu_product_access_config_v1?'))return json([]);
 if(u.includes('/gu_bootcamp_academy_enrollments_v014168?'))return json(enrolled?[{status:'active'}]:[]);
 if(u.includes('/gu_academy_protected_cases_v1?'))return json([
  {case_code:'BC3_TAPE10_D01_V1',variant:1,source_status:approved?'approved':'original_fictional_case_unreviewed'},
  {case_code:'BC3_TAPE10_D01_V2',variant:2,source_status:'approved'}
 ]);
 if(u.includes('/competency_attempts_v135?'))return json([...answers.keys()].map(code=>({case_code:code,submitted_at:'2026-10-31T01:00:00Z',final_score:75})));
 if(u.includes('/competency_cases_v135?')){
  const code=u.includes('V2')?'BC3_TAPE10_D01_V2':'BC3_TAPE10_D01_V1';
  return json([{case_code:code,title:'Fictional unseen research case',description:'Secure',
   competency_code:'TAPE_READING',questions:['Q1','Q2','Q3','Q4'].map(q),version:1,
   answer_key:{Q1:'A'},reviewed_by:reviewed?uid:null,reviewed_at:reviewed?'2026-10-31T01:00:00Z':null,active:true}]);
 }
 if(u.endsWith('/rpc/submit_competency_case_v135')){
  const body=JSON.parse(options.body||'{}');
  assert.equal(body.p_user,uid,'Authenticated identity must control grade ownership');
  assert(!answers.has(body.p_case),'Never send the same first submission twice');
  answers.set(body.p_case,body.p_answers);
  return json({ok:true,attemptId:'fixture',score:75,criticalErrors:0});
 }
 throw Error('Unexpected provider route '+u);
};
const env={ACADEMY_THREE_CAMPS_ENABLED:'true',SUPABASE_URL:'https://fixture.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const request=(method='GET',body,headers={})=>new Request('https://academy.example/api/academy-protected-assessment-v1?program=tape10&day=1',{
 method,headers:{authorization:'Bearer authorized-test-member',...(body?{'content-type':'application/json'}:{}),...headers},
 body:body===undefined?undefined:JSON.stringify(body)});
try{
 let res=await onRequest({request:request(),env}),data=await res.json();
 assert.equal(res.status,200);assert.equal(data.officialAssessment,true);
 assert.equal(data.assessment.caseCode,'BC3_TAPE10_D01_V1');
 assert.equal(data.assessment.questions.length,4);
 assert(!JSON.stringify(data).includes('PRIVATE'));
 assert(!JSON.stringify(data).includes('answer_key'));
 for(const q of data.assessment.questions)assert.deepEqual(Object.keys(q),['id','dimension','prompt','options']);
 const attempt=Object.fromEntries(['Q1','Q2','Q3','Q4'].map(id=>[id,'A']));
 res=await onRequest({request:request('POST',{caseCode:'BC3_TAPE10_D01_V1',answers:attempt},{origin:'https://evil.example'}),env});
 assert.equal(res.status,403,'Cross-origin attempt denied');
 assert.equal(answers.size,0);
 res=await onRequest({request:request('POST',{caseCode:'BC3_TAPE10_D01_V1',answers:attempt},{origin:'https://academy.example'}),env});
 assert.equal(res.status,200,'First case must grade server-side');
 assert.equal(answers.size,1);
 res=await onRequest({request:request(),env});data=await res.json();
 assert.equal(res.status,200);
 assert.equal(data.assessment.caseCode,'BC3_TAPE10_D01_V2','Retake must receive a different unseen case');
 assert.equal(data.priorSubmissions,1);
 res=await onRequest({request:request('POST',{caseCode:'BC3_TAPE10_D01_V1',answers:attempt}),env});
 assert.equal(res.status,400,'Cannot resubmit a previously used case to jump fresh-case order');
 assert.equal(answers.size,1);
 approved=false;res=await onRequest({request:request(),env});data=await res.json();
 assert.equal(data.assessment.caseCode,'BC3_TAPE10_D01_V2','Already submitted primary may remain reviewed');
 approved=true;reviewed=false;res=await onRequest({request:request(),env});data=await res.json();
 assert.equal(data.officialAssessment,false,'Unreviewed case is never served');
 reviewed=true;allowed=false;res=await onRequest({request:request(),env});assert.equal(res.status,403);
 allowed=true;enrolled=false;res=await onRequest({request:request(),env});assert.equal(res.status,403);
 enrolled=true;
 res=await onRequest({request:request(),env:{...env,ACADEMY_THREE_CAMPS_ENABLED:'false'}});
 assert.equal(res.status,404);
 console.log('PASS Academy 3-camp protected endpoint: member entitlement, enrollment, reviewer gate, no answer leakage, immutable first grade, fresh retake, CSRF, disabled release');
}finally{globalThis.fetch=original}
