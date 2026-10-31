import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/academy-protected-assessment-v1.js';
import {onRequest as original} from '../functions/api/assessment-v0135.js';
const src=readFileSync('functions/api/academy-protected-assessment-v1.js','utf8');
const old=readFileSync('functions/api/assessment-v0135.js','utf8');
const schema=readFileSync('supabase/migrations/20261031_academy_protected_case_routing_v1.sql','utf8');
const variants={tape10:10,indicators10:10,filings7:7};
assert(src.includes("env?.ACADEMY_THREE_CAMPS_ENABLED!=='true'"));
assert(src.includes("toolAccess(env,request,'ONDEMAND_TRAINING')"));
assert(src.includes('gu_bootcamp_academy_enrollments_v014168?select=status'));
assert(src.includes("m.source_status!=='approved'"));
assert(src.includes("c.active!==true||!c.reviewed_by||!c.reviewed_at"));
assert(src.includes("rpc/submit_competency_case_v135"));
assert(src.includes("result?.reason==='already_submitted'?409:400"));
assert(src.includes('const used=new Set(attempts.map(a=>a.case_code))'));
assert(src.includes("if(mapped.length===0)return{reason:'assessment_not_authored',attempts:0}"));
assert(src.includes('return{caseCode:c.case_code'));
assert(!src.includes('answer_key'),'Protected assessment route must never select or publish keys');
assert(old.includes("startsWith('BC3_')"),'Existing case endpoint must reject Academy case bypass');
assert(schema.includes('enable row level security'));
assert(schema.includes('revoke all on public.gu_academy_protected_cases_v1 from public,anon,authenticated'));
assert(!schema.includes('answer_key'),'Routing migration must not publish keys');
const saved=globalThis.fetch;
let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No provider request should occur before release');};
try{
 for(const [program,max] of Object.entries(variants)){
  for(const day of [1,max]){
   for(const method of ['GET','POST']){
    const request=new Request('https://member.example/api/academy-protected-assessment-v1?program='+program+'&day='+day,{method,
     headers:{authorization:'Bearer fictitious',...(method==='POST'?{origin:'https://member.example'}:{})}});
    const result=await onRequest({request,env:{ACADEMY_THREE_CAMPS_ENABLED:'false'}});
    assert.equal(result.status,404);
    assert.equal((await result.json()).ok,false);
   }
  }
 }
 assert.equal(calls,0,'No disabled Academy route should touch authentication or private storage');
 const bad=await onRequest({request:new Request('https://member.example/api/academy-protected-assessment-v1?program=tape10&day=11'),env:{ACADEMY_THREE_CAMPS_ENABLED:'true'}});
 assert.equal(bad.status,404);
 assert.equal(calls,0);
 console.log('PASS Academy private assessment: disabled access, enrollment and reviewer gates, immutable case ordering, no secret-key projection');
}finally{globalThis.fetch=saved}
