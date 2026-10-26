import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/bootcamp-academy.js';

// Deterministic service-boundary contract fixture. NOT a provider/login/browser
// acceptance test, and no production data or keys are accessed.
test('Academy progress end-to-end API contract: auth, persistence, revision and errors',async()=>{
 const prior=globalThis.fetch;
 const uid='00000000-0000-4000-8000-000000000123';
 const other='00000000-0000-4000-8000-000000000456';
 const env={SUPABASE_URL:'https://fixture.supabase.co',
   SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock_only',
   SUPABASE_SECRET_KEY:'sb_secret_mock_only'};
 const state={enrollment:null,record:null,rejected:false,available:true};
 const now='2026-10-26T15:30:00Z';
 const j=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
 globalThis.fetch=async (raw,opts={})=>{
  const u=new URL(raw);const path=u.pathname;
  if(path==='/auth/v1/user')return opts.headers?.authorization==='Bearer REAL_FIXTURE'
   ?j({id:uid}):opts.headers?.authorization==='Bearer OTHER_FIXTURE'
   ?j({id:other}):j({error:'invalid'},401);
  if(path==='/rest/v1/profiles')return j([{account_kind:state.rejected?'showcase':'member'}]);
  if(path==='/rest/v1/admin_user_flags')return j([]);
  if(path==='/rest/v1/rpc/user_has_tool_access')return j(true);
  if(path==='/rest/v1/gu_bootcamp_academy_enrollments_v014168')return state.available?
   j(u.searchParams.get('user_id')==='eq.'+uid&&state.enrollment?
    [{program_code:'truth5',status:'active',program_version:'0.14.0.168'}]:[]):j({error:'outage'},503);
  if(path==='/rest/v1/gu_bootcamp_academy_progress_v014168')return state.available?
   j(u.searchParams.get('user_id')==='eq.'+uid&&state.record?
    [{day_number:state.record.day,status:state.record.status,revision:state.record.revision,
     reflection:state.record.reflection,started_at:now,updated_at:now}]:[]):j({error:'outage'},503);
  if(path==='/rest/v1/rpc/gu_bootcamp_academy_save_v014168'){
   const p=JSON.parse(opts.body);
   assert.equal(p.p_user,uid);
   assert.equal(p.p_version,'0.14.0.168');
   if(p.p_action==='enroll'){
    state.enrollment=true;
    return j({ok:true,program:'truth5',enrollment:'active',graded:false,competencyMasteryAwarded:false});
   }
   if(!state.enrollment)return j({error:'no enrollment'},400);
   if(p.p_action==='start'){
    state.record??={day:p.p_day,status:'in_progress',revision:1,reflection:null};
   }else if(p.p_action==='save_reflection'){
    if((state.record?.revision||0)!==p.p_expected_revision)
     return j({conflict:true,actualRevision:state.record?.revision||0});
    state.record={day:p.p_day,status:'reflection_saved',
      revision:(state.record?.revision||0)+1,reflection:p.p_reflection};
   }
   return j({program:'truth5',day:state.record.day,revision:state.record.revision,
    status:state.record.status,reflection:state.record.reflection,
    startedAt:now,firstReflectedAt:state.record.status==='reflection_saved'?now:null,
    updatedAt:now,graded:false,competencyMasteryAwarded:false,marketOutcomeClaimed:false});
  }
  throw Error('Unexpected mock service path '+path);
 };
 const call=async({method='GET',token='REAL_FIXTURE',query='?program=truth5',
  body,origin})=>{
  const headers=new Headers();
  if(token)headers.set('authorization','Bearer '+token);
  if(body!==undefined)headers.set('content-type','application/json');
  if(origin)headers.set('origin',origin);
  const req=new Request('https://member.fixture/api/bootcamp-academy'+query,{
   method,headers,...(body!==undefined?{body:JSON.stringify(body)}:{})
  });
  const reply=await onRequest({request:req,env});
  return {status:reply.status,headers:reply.headers,body:await reply.json()};
 };
 const payload=(action,extra={})=>({version:'0.14.0.168',program:'truth5',
  action,day:action==='enroll'?0:2,...extra});
 try{
  let result=await call({token:''});
  assert.equal(result.status,401);
  result=await call({});
  assert.equal(result.status,200);
  assert.equal(result.body.curriculum.length,5);
  assert.equal(result.body.progressAvailable,true);
  assert.equal(result.body.enrolled,false);
  assert.deepEqual(result.body.progress,[]);
  result=await call({method:'POST',body:payload('enroll')});
  assert.equal(result.status,200);
  assert.equal(result.body.enrolled,true);
  result=await call({method:'POST',body:payload('start')});
  assert.equal(result.status,200);
  assert.equal(result.body.progress.revision,1);
  result=await call({method:'POST',body:payload('start')});
  assert.equal(result.body.progress.revision,1,'start must be idempotent');
  const reflection='FICTIONAL: I identified the source and dated filing, checked what could be known at the pause, '+
   'kept later events hidden, acknowledged spread and liquidity limits, and selected no trade without evidence.';
  result=await call({method:'POST',body:payload('save_reflection',{reflection,expectedRevision:1})});
  assert.equal(result.status,200);
  assert.equal(result.body.progress.revision,2);
  assert.equal(result.body.progress.graded,false);
  assert.equal(result.body.progress.competencyMasteryAwarded,false);
  assert.equal(result.body.progress.marketOutcomeClaimed,false);
  result=await call({});
  assert.equal(result.status,200);
  assert.equal(result.body.progress[0].revision,2);
  assert.equal(result.body.progress[0].reflection,reflection);
  const isolated=await call({token:'OTHER_FIXTURE'});
  assert.equal(isolated.status,200,'different genuine Auth identity can request its own Academy');
  assert.deepEqual(isolated.body.progress,[],'member B must never receive member A private notes');
  assert.equal(isolated.body.enrolled,false,'member B must not inherit member A enrollment');
  result=await call({method:'POST',
   body:payload('save_reflection',{reflection:reflection+' stale',expectedRevision:1})});
  assert.equal(result.status,409,'concurrent/stale edits must be rejected');
  assert.equal(state.record.reflection,reflection,'stale write cannot clobber data');
  result=await call({method:'POST',
   body:payload('save_reflection',{reflection:reflection+' forbidden',expectedRevision:2}),
   origin:'https://untrusted.example'});
  assert.equal(result.status,403);
  assert.equal(state.record.revision,2);
  result=await call({method:'POST',body:{...payload('start'),day:100}});
  assert.equal(result.status,400);
  result=await call({method:'POST',body:{...payload('start'),version:'obsolete'}});
  assert.equal(result.status,409);
  state.rejected=true;
  result=await call({});
  assert.equal(result.status,403,'Showcase may not view production Academy');
  state.rejected=false;state.available=false;
  result=await call({});
  assert.equal(result.status,200,'lessons can remain readable during storage outage');
  assert.equal(result.body.progressAvailable,false,'never invent stored progress during failure');
  assert.equal(result.body.enrolled,false);
  assert.equal(result.body.progress,null);
  assert.match(result.headers.get('cache-control'),/no-store/);
  console.log('PASS Academy API: guest isolation, five-day content, CAS, save/reload, no mastery, cross-site denial, expiry and fail-closed outage contract.');
 }finally{globalThis.fetch=prior;}
});
