/* Free Foundations verification. Executes real Academy content library and HTTP
 * handler with simulated external GoTrue/PostgREST responses, NOT a production
 * member acceptance run, and never grades study or injects market history.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {academyCatalog,academyByCode,freeFoundationsProgram} from '../functions/_lib/bootcamp-academy-v014168.js';
import {onRequest} from '../functions/api/bootcamp-academy.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('bootcamp-academy.html'),client=read('assets/js/bootcamp-academy-v014168.js');
assert.equal(academyCatalog.length,10,'Canonical number of Boot Camps must be ten');
assert.equal(new Set(academyCatalog.map(x=>x.code)).size,10);
assert(!academyCatalog.some(x=>x.code==='free5'),'Free five-day starter is NOT an eighth official Boot Camp');
assert.equal(freeFoundationsProgram.days,5);
assert.equal(academyByCode.free5,freeFoundationsProgram);
assert.equal(academyByCode.foundations30.days,30,'Original thirty competencies untouched');
assert.equal(freeFoundationsProgram.entitlement,'ELIGIBLE_FREE_MEMBER');
assert.equal(freeFoundationsProgram.curriculum.length,5);
for(const [i,d] of freeFoundationsProgram.curriculum.entries()){
 assert.equal(d.day,i+1);assert.equal(d.programCode,'free5');
 assert.deepEqual(d.relatedLabs,[],'Free path must not claim paid Lab access');
 assert.equal(d.officiallyGraded,false);assert.equal(d.masteryAwarded,false);
 assert.match(d.lesson.workedExample,/FICTIONAL/i);
 for(const key of ['explanation','why','workedExample','selfCheck','reviewGuide','error','transfer','whenNot','investigation']){
  assert(d.lesson[key]?.length>75, 'Free day '+d.day+' missing authored '+key);
 }
 assert(d.lesson.sourceProcedure.length>=4);
 assert(Array.isArray(d.lesson.reviewPrompts)&&d.lesson.reviewPrompts.length===4,
  'Every Free day needs 4 subject-specific prompts for independent feedback');
 assert(d.lesson.reviewPrompts.every(prompt=>prompt.length>45&&prompt.endsWith('?')),
  'Formative review prompts must be instructive questions, not automatically scored rubrics');
}
assert(html.includes('bootcamp-academy.html?program=free5'));
assert(client.includes("['free5',5]"),'Free must be a direct eligible member route');
assert(client.includes('!Array.isArray(x.relatedLabs)))'),'All daily Lab links are optional reference lists');
assert(!client.includes("code!=='free5'&&x.relatedLabs.length===0"),'No Boot Camp may be blocked solely because an optional Lab reference is unavailable');
assert(client.includes('lesson.why')&&client.includes('lesson.whenNot'));
assert(client.includes('lesson.reviewPrompts'),'Talia must present lesson-specific reasoning corrections without grades');
const u1='00000000-0000-4000-8000-000000000123';
const u2='00000000-0000-4000-8000-000000000456';
const prev=globalThis.fetch;
const state={restricted:false,showcase:false,paid:false,enrollment:new Map(),progress:new Map(),writes:0};
const answer=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(target,opts={})=>{
 const u=new URL(target),p=u.pathname,auth=opts.headers?.authorization||'';
 const member=auth==='Bearer member-one'?u1:auth==='Bearer member-two'?u2:null;
 if(p==='/auth/v1/user')return member?answer({id:member}):answer({code:'invalid'},401);
 if(p==='/rest/v1/profiles')return answer([{account_kind:state.showcase?'showcase':'member'}]);
 if(p==='/rest/v1/admin_user_flags')return answer(state.restricted?[{status:'restricted'}]:[]);
 if(p==='/rest/v1/admin_user_roles')return answer([]);
 if(p==='/rest/v1/rpc/user_has_tool_access')return answer(state.paid);
 if(p==='/rest/v1/gu_bootcamp_academy_enrollments_v014168'){
  const id=u.searchParams.get('user_id')?.slice(3);
  const code=u.searchParams.get('program_code')?.slice(3);
  return answer(state.enrollment.get(id+':'+code)?[{program_code:code,status:'active',program_version:'0.14.0.168'}]:[]);
 }
 if(p==='/rest/v1/gu_bootcamp_academy_progress_v014168')return answer([]);
 if(p==='/rest/v1/rpc/gu_bootcamp_academy_save_v014168'){
  const x=JSON.parse(opts.body);
  assert([u1,u2].includes(x.p_user),'must bind write to verified Auth subject');
  assert.equal(x.p_program,'free5');
  state.writes++;
  if(x.p_action==='enroll'){
   state.enrollment.set(x.p_user+':free5',true);
   return answer({ok:true,program:'free5',enrollment:'active',graded:false,competencyMasteryAwarded:false});
  }
  return answer({program:'free5',day:x.p_day,revision:1,status:'in_progress',
   reflection:null,graded:false,competencyMasteryAwarded:false,marketOutcomeClaimed:false});
 }
 throw Error('Unrecognized fixture path '+p);
};
async function call({method='GET',token='member-one',query='?program=free5',payload,origin}={}){
 const headers={};
 if(token)headers.authorization='Bearer '+token;
 if(payload)headers['content-type']='application/json';
 if(origin)headers.origin=origin;
 const request=new Request('https://course.fixture/api/bootcamp-academy'+query,{
  method,headers,...(payload?{body:JSON.stringify(payload)}:{})
 });
 const response=await onRequest({request,env:{
  SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SECRET_KEY:'test-only',
  SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'
 }});
 return {status:response.status,data:await response.json()};
}
try{
 const catalog=await call({query:'?action=catalog',token:''});
 assert.equal(catalog.status,200);assert.equal(catalog.data.programs.length,7);
 const free=await call();
 assert.equal(free.status,200);assert.equal(free.data.program.code,'free5');
 assert.equal(free.data.curriculum.length,5);
 assert.equal(free.data.progressAvailable,true);
 assert.equal(free.data.enrolled,false);
 const locked=await call({query:'?program=watchlist7'});
 assert.equal(locked.status,403,'Free member cannot inherit paid Watchlist Boot Camp');
 let ret=await call({method:'POST',payload:{version:'0.14.0.168',program:'free5',day:0,action:'enroll'}});
 assert.equal(ret.status,200);assert.equal(ret.data.enrolled,true);
 ret=await call();
 assert.equal(ret.data.enrolled,true);
 ret=await call({method:'POST',payload:{version:'0.14.0.168',program:'free5',day:1,action:'start'}});
 assert.equal(ret.status,200);assert.equal(ret.data.progress.graded,false);
 ret=await call({token:'member-two'});
 assert.equal(ret.status,200);assert.equal(ret.data.enrolled,false,'member two cannot inherit first member enrollment');
 ret=await call({method:'POST',payload:{version:'0.14.0.168',program:'watchlist7',day:0,action:'enroll'}});
 assert.equal(ret.status,403);
 ret=await call({method:'POST',origin:'https://another.example',payload:{version:'0.14.0.168',program:'free5',day:0,action:'enroll'}});
 assert.equal(ret.status,403);
 ret=await call({token:''});assert.equal(ret.status,401);
 state.restricted=true;ret=await call();assert.equal(ret.status,403);
 state.restricted=false;state.showcase=true;ret=await call();assert.equal(ret.status,403);
 state.showcase=false;state.paid=true;ret=await call();assert.equal(ret.status,200,'Paid members may read foundational Free study too');
 assert.equal(state.writes,2,'only two authorized safe Free member writes');
 console.log('PASS Free Foundations: seven official Boot Camps retained, five full guided lessons, real handler auth, Free read/save, paid course denial, cross-account privacy and no grades.');
}finally{globalThis.fetch=prev}
