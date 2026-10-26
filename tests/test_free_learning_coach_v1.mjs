import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/free-learning-coach.js';
const uid='00000000-0000-4000-8000-000000000555';
const other='00000000-0000-4000-8000-000000000666';
let stored=null,restricted=false,progress=[{day_number:1,status:'reflection_saved'}];
const original=globalThis.fetch;let accessedOwnerOnly=true;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async (url,init={})=>{
 const u=new URL(url),p=u.pathname;
 const actor=String(init.headers?.authorization||'').includes('OTHER')?other:uid;
 if(p==='/auth/v1/user')return json({id:actor});
 if(p==='/rest/v1/profiles')return json([{account_kind:'member',deleted_at:null}]);
 if(p==='/rest/v1/admin_user_flags')return json(restricted?[{status:'suspended'}]:[]);
 if(p==='/rest/v1/admin_user_roles')return json([]);
 if(p==='/rest/v1/rpc/user_has_tool_access')return json(false);
 if(p==='/rest/v1/gu_free_learning_preferences_v1'){
  assert(u.searchParams.get('user_id')==='eq.'+actor||init.method==='POST','owner filter required');
  if(init.method==='POST'){
   if(stored)return json({message:'duplicate'},409);
   const x=JSON.parse(init.body);stored={...x,revision:1,updated_at:'2026-10-26T20:00:00Z'};
   return json([stored],201);
  }
  if(init.method==='PATCH'){
   const expected=Number(u.searchParams.get('revision')?.slice(3));
   if(!stored||stored.user_id!==actor||stored.revision!==expected)return json([]);
   const x=JSON.parse(init.body);stored={...stored,...x,updated_at:'2026-10-26T21:00:00Z'};
   return json([stored]);
  }
  return json(stored?.user_id===actor?[stored]:[]);
 }
 if(p==='/rest/v1/gu_bootcamp_academy_progress_v014168'){
  assert.equal(u.searchParams.get('user_id'),'eq.'+actor);
  assert.equal(u.searchParams.get('program_code'),'eq.free5');
  return json(actor===uid?progress:[]);
 }
 throw Error('Unexpected service '+p);
};
const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SECRET_KEY:'mock_secret_only',
 SUPABASE_PUBLISHABLE_KEY:'mock_public_only'};
async function call(method='GET',form=null,token='QA',origin=null){
 const request=new Request('https://site.example/api/free-learning-coach',{
  method,headers:{authorization:'Bearer '+token,...(form?{'content-type':'application/json'}:{}),
   ...(origin?{origin}:{})},body:form?JSON.stringify(form):undefined});
 const res=await onRequest({request,env});return {status:res.status,body:await res.json(),headers:res.headers};
}
try{
 let r=await call();
 assert.equal(r.status,200);
 assert.equal(r.body.preferences.saved,false);
 assert.equal(r.body.recommendation.day,2);
 assert.equal(r.body.recommendation.savedReflections,1);
 assert.equal(r.body.recommendation.pace,'standard_session');
 assert.match(r.headers.get('cache-control'),/no-store/);
 r=await call('POST',{focus:'CANDLES',experience:'NEW',sessionMinutes:5,expectedRevision:0},'QA','https://evil.example');
 assert.equal(r.status,403);
 r=await call('POST',{focus:'CANDLES',experience:'NEW',sessionMinutes:5,expectedRevision:0});
 assert.equal(r.status,200);assert.equal(r.body.preferences.revision,1);
 r=await call();
 assert.equal(r.body.preferences.focus,'CANDLES');
 assert.equal(r.body.recommendation.day,2,'self-report cannot skip incomplete prerequisite');
 assert.equal(r.body.recommendation.practice.url,'verified-replay.html?scope=fictional');
 assert.equal(r.body.recommendation.teachingDepth,'absolute_beginner');
 r=await call('POST',{focus:'RISK',experience:'RETURNING',sessionMinutes:20,expectedRevision:0});
 assert.equal(r.status,409,'duplicate creation must not overwrite');
 r=await call('POST',{focus:'RISK',experience:'RETURNING',sessionMinutes:20,expectedRevision:1});
 assert.equal(r.status,200);assert.equal(r.body.preferences.revision,2);
 r=await call('POST',{focus:'CANDLES',experience:'NEW',sessionMinutes:10,expectedRevision:1});
 assert.equal(r.status,409,'stale revision must never clobber latest preferences');
 r=await call('GET',null,'OTHER');
 assert.equal(r.status,200);assert.equal(r.body.preferences.saved,false,'separate member must not see private preferences');
 assert.equal(r.body.recommendation.savedReflections,0,'separate member must not receive completed lessons');
 restricted=true;
 r=await call();
 assert.equal(r.status,403);
 restricted=false;
 progress=[1,2,3,4,5].map(day_number=>({day_number,status:'reflection_saved'}));
 r=await call();
 assert.equal(r.body.recommendation.savedReflections,5);
 assert.equal(r.body.recommendation.day,5);
 assert.match(r.body.recommendation.notice,/do not certify mastery/i);
 assert(!JSON.stringify(r.body).includes('answer_key'));
 console.log('PASS Free Talia preferences: private Auth, CAS, focus/pacing, prerequisites, cross-member isolation, suspension, no grades or exposed answer keys.');
}finally{globalThis.fetch=original;}
