import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/learning-replay-v01492.js';
import {fictionalReplayPermitted} from '../functions/_lib/fictional-replay-policy-v1.js';

const owner='00000000-0000-4000-8000-000000000111';
const other='00000000-0000-4000-8000-000000000222';
const sid='00000000-0000-4000-8000-000000000333';
const code='GUSIM_DT_C01_L01';
const original=globalThis.fetch;
let suspended=false,started=null,callCount=0;
const fixture={dataset_code:code,title:'FICTIONAL ORIGINAL teaching scenario',ticker:'SIMULATION',
 dataset_type:'ohlcv',status:'published',source_attribution:'Original computer-created fictional educational price series',
 license_note:'Original invented teaching data: permission to display for education',
 metadata:{original_synthetic:true,real_market_security:false,historical_evidence_verified:false,
  licensed_for_member_display:true,educational_only:true,invented_timestamp_year:2040}};
const bars=[0,1,2].map(i=>({bar_index:i,bar_at:new Date(Date.parse('2040-02-06T14:30:00Z')+i*300000).toISOString(),
 open:10+i*.1,high:10.2+i*.1,low:9.8+i*.1,close:10.1+i*.1,volume:24000}));
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SECRET_KEY:'mock_only',
 SUPABASE_PUBLISHABLE_KEY:'publishable_only',GU_REPLAY_JOURNAL_V01494_ENABLED:'true'};
assert.equal(fictionalReplayPermitted(fixture),true);
assert.equal(fictionalReplayPermitted({...fixture,metadata:{...fixture.metadata,historical_evidence_verified:true}}),false);
assert.equal(fictionalReplayPermitted({...fixture,status:'draft'}),false);
globalThis.fetch=async(raw,init={})=>{
 const u=new URL(raw),p=u.pathname,actor=init.headers?.authorization?.includes('SECOND')?other:owner;
 callCount++;
 if(p==='/auth/v1/user'){
  if(!String(init.headers?.authorization||'').includes('Bearer QA_')&&!String(init.headers?.authorization||'').includes('Bearer SECOND'))return json({},401);
  return json({id:actor});
 }
 if(p==='/rest/v1/profiles')return json([{account_kind:'member',deleted_at:null}]);
 if(p==='/rest/v1/admin_user_flags')return json(suspended?[{status:'suspended'}]:[]);
 if(p==='/rest/v1/admin_user_roles')return json([]);
 if(p==='/rest/v1/rpc/user_has_tool_access')return json(false);
 if(p==='/rest/v1/market_datasets'){
  if(u.searchParams.has('dataset_code')){
   return json(u.searchParams.get('dataset_code')==='eq.'+code?[fixture]:[]);
  }
  return json([fixture]);
 }
 if(p==='/rest/v1/gu_replay_bars_v01492'){
  const index=u.searchParams.get('bar_index')||'';
  if(index.startsWith('eq.'))return json(bars.filter(x=>x.bar_index===Number(index.slice(3))));
  if(index.startsWith('lte.'))return json(bars.filter(x=>x.bar_index<=Number(index.slice(4))).reverse());
  throw Error('Replay fixture unexpectedly requested all future bars');
 }
 if(p==='/rest/v1/gu_replay_sessions_v01492'){
  if(init.method==='POST'){
   started={id:sid,user_id:actor,dataset_code:code,current_index:0,decision_locked:false,
    status:'active',expires_at:new Date(Date.now()+3600000).toISOString(),
    created_at:new Date().toISOString(),decision:null,decision_plan:null};return json([started],201);
  }
  if(init.method==='PATCH'){
   if(!started||u.searchParams.get('user_id')!=='eq.'+started.user_id)return json([]);
   if(u.searchParams.has('decision_locked')&&started.decision_locked)return json([]);
   if(u.searchParams.has('current_index')&&Number(u.searchParams.get('current_index').slice(3))!==started.current_index)return json([]);
   const patch=JSON.parse(init.body);Object.assign(started,patch);
   return json([started]);
  }
  if(!started||u.searchParams.get('user_id')!=='eq.'+started.user_id||started.status!=='active')return json([]);
  return json([started]);
 }
 if(p==='/rest/v1/rpc/v01492_replay_advance'){
  const b=JSON.parse(init.body);
  if(!started||started.user_id!==b.p_user||started.id!==b.p_session||
   !started.decision_locked||started.current_index!==b.p_expected_index||
   started.current_index>=bars.length-1)return json(-1);
  started.current_index++;return json(started.current_index);
 }
 throw Error('Unexpected private service call: '+p);
};
async function request(action,{method='GET',token='QA_REAL',payload=null,scope='fictional',origin}={}){
 const url='https://site.example/api/learning-replay-v01492?scope='+scope+'&action='+action+
 (payload?.sessionId?'':'');
 const headers={...(token?{authorization:'Bearer '+token}:{}),
  ...(payload?{'content-type':'application/json'}:{}),...(origin?{origin}:{})};
 const req=new Request(url,{method,headers,body:payload?JSON.stringify(payload):undefined});
 const reply=await onRequest({request:req,env});
 return{status:reply.status,body:await reply.json()};
}
try{
 let r=await request('catalog',{token:''});
 assert.equal(r.status,401,'guest must not browse authorized practice');
 r=await request('catalog',{scope:'historical'});
 assert.equal(r.status,403,'Free must not bypass paid historical replay');
 r=await request('catalog');
 assert.equal(r.status,200);
 assert.equal(r.body.classification,'FICTIONAL');
 assert.equal(r.body.datasets.length,1);
 assert.equal(r.body.datasets[0].synthetic,true);
 assert(!JSON.stringify(r.body).includes('bar_at'),'catalog cannot leak future candles');
 r=await request('start',{method:'POST',payload:{datasetCode:code},origin:'https://evil.example'});
 assert.equal(r.status,403,'cross origin writes rejected');
 r=await request('start',{method:'POST',payload:{datasetCode:code}});
 assert.equal(r.status,201);
 assert.equal(r.body.bar.index,0);assert.equal(r.body.bar.timestamp,bars[0].bar_at);
 assert.equal(r.body.scope,'fictional');
 assert(!JSON.stringify(r.body).includes(bars[1].bar_at),'starting cannot reveal next timestamp');
 const sessionId=r.body.sessionId;
 r=await request('visible',{payload:null,scope:'fictional'});
 assert.equal(r.status,400,'session must be supplied for bounded reads');
 const call=async(a,options={})=>{
  const {method='GET',token='QA_REAL',payload=null}=options;
  const endpoint='https://site.example/api/learning-replay-v01492?scope=fictional&action='+a+'&sessionId='+sessionId;
  const req=new Request(endpoint,{method,headers:{authorization:'Bearer '+token,
   ...(payload?{'content-type':'application/json'}:{})},body:payload?JSON.stringify({...payload,sessionId}):undefined});
  const response=await onRequest({request:req,env});
  return{status:response.status,body:await response.json()};
 };
 r=await call('visible');
 assert.equal(r.status,200);assert.deepEqual(r.body.bars.map(x=>x.index),[0]);
 r=await call('advance',{method:'POST',payload:{expectedIndex:0}});
 assert.equal(r.status,403,'must lock independent decision before next candle');
 r=await call('lock',{method:'POST',payload:{decision:'NO_TRADE',reasoning:'Fictional information is insufficient to justify entering a position; observe rather than trade.',plan:null}});
 assert.equal(r.status,200);
 assert.equal(started.decision_locked,true);
 r=await call('advance',{method:'POST',payload:{expectedIndex:0}});
 assert.equal(r.status,200);assert.equal(r.body.currentIndex,1);
 assert.equal(r.body.execution,null,'no fictional fills');
 assert.equal(r.body.bar.timestamp,bars[1].bar_at);
 assert(!JSON.stringify(r.body).includes(bars[2].bar_at),'never leak future bars');
 r=await call('visible');
 assert.deepEqual(r.body.bars.map(x=>x.index),[0,1]);
 r=await call('advance',{method:'POST',payload:{expectedIndex:0}});
 assert.equal(r.status,409,'stale expected cursor denied');
 r=await request('resume');
 assert.equal(r.status,200);assert.equal(r.body.session.currentIndex,1);
 r=await call('current',{token:'SECOND'});
 assert.equal(r.status,404,'other real identity must not read private session');
 suspended=true;
 r=await call('current');
 assert.equal(r.status,403,'revoked account denied immediately');
 suspended=false;
 r=await call('finish',{method:'POST',payload:{}});
 assert.equal(r.status,200);assert.equal(r.body.journalLinked,false,'do not invent Journal evidence');
 assert.equal(r.body.scope,'fictional');
 assert(!('journalId' in r.body),'no private grade or journal claimed');
 assert(callCount<170,'bounded free replay backend requests');
 console.log('PASS Free server-controlled fictional replay: guest/paid separation, no lookahead, 2040 source, ownership, CAS, revocation, no fills/grades, no LIVE payments.');
}finally{globalThis.fetch=original;}
