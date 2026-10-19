import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/learning-replay-v01492.js';
import {normalizeBars,visibleThrough,bracketOutcome} from '../functions/_lib/replay-engine-v01492.js';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
let active=true,accountKind='member',locked=false,idx=0,created=false,called=[],allowed=true;
const previous=globalThis.fetch;
const json=(o,status=200)=>new Response(JSON.stringify(o),{status,headers:{'content-type':'application/json'}});
const session='11111111-2222-4333-8444-555555555555';
const id='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const bar=n=>({bar_index:n,bar_at:'2024-05-03T13:3'+n+':00Z',open:10+n,high:11+n,low:9+n,close:10+n,volume:1000});
globalThis.fetch=async(path,opts={})=>{
 const u=String(path);called.push(u);
 if(u.endsWith('/auth/v1/user'))return json({id:session});
 if(u.includes('/profiles?'))return json([{account_kind:accountKind}]);
 if(u.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(u.includes('rpc/user_has_tool_access'))return json(allowed);
 if(u.includes('/market_datasets?'))return json([{dataset_code:'CASE_A',title:'Owner reviewed sample',ticker:'TEST',dataset_type:'ohlcv',status:'published',source_attribution:'Documented rights source',license_note:'Learning permitted',metadata:{licensed_for_member_display:active,evidence_verified:true,corporate_action_policy:'raw valid'}}]);
 if(u.includes('/gu_replay_bars_v01492?')){const n=Number(/bar_index=eq\.(\d+)/.exec(u)?.[1]);return json([bar(n)]);}
 if(u.includes('/gu_replay_sessions_v01492?') && opts.method==='POST'){created=true;return json([{id}]);}
 if(u.includes('/gu_replay_sessions_v01492?') && opts.method==='PATCH'){
  const body=JSON.parse(opts.body);
  if(body.decision_locked){if(locked)return json([]);locked=true;return json([{id}]);}
  return json([{id}]);
 }
 if(u.includes('/gu_replay_sessions_v01492?'))return json(created?[{id,dataset_code:'CASE_A',current_index:idx,decision_locked:locked,
  decision:'WATCH',decision_plan:null,status:'active',expires_at:'2099-01-01T00:00:00Z'}]:[]);
 if(u.includes('rpc/v01492_replay_advance')){
  const body=JSON.parse(opts.body);
  if(!locked||body.p_expected_index!==idx)return json(-1);
  idx++;return json(idx);
 }
 throw Error('Unexpected mock '+u);
};
const req=(action,body={},token=true)=>new Request('https://test.example/api/learning-replay-v01492?action='+action,{
 method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer test-member'}:{})},body:JSON.stringify(body)});
try {
 let response=await onRequest({request:req('start',{datasetCode:'CASE_A'},false),env});
 assert.equal(response.status,401);
 active=false;response=await onRequest({request:req('start',{datasetCode:'CASE_A'}),env});assert.equal(response.status,403);assert.equal(created,false);
 active=true;response=await onRequest({request:req('start',{datasetCode:'CASE_A'}),env});assert.equal(response.status,201);
 const start=await response.json();assert.equal(start.bar.index,0);assert(!JSON.stringify(start).includes('2024-05-03T13:31'));
 response=await onRequest({request:req('advance',{sessionId:id,expectedIndex:0}),env});assert.equal(response.status,403);
 response=await onRequest({request:req('lock',{sessionId:id,decision:'WATCH',reasoning:'Observed one candle and cannot infer the next outcome.'}),env});assert.equal(response.status,200);
 response=await onRequest({request:req('advance',{sessionId:id,expectedIndex:0}),env});
 const step=await response.json();assert.equal(step.currentIndex,1);assert.equal(step.bar.index,1);
 response=await onRequest({request:req('advance',{sessionId:id,expectedIndex:0}),env});assert.equal(response.status,409);
 accountKind='showcase';response=await onRequest({request:req('advance',{sessionId:id,expectedIndex:1}),env});assert.equal(response.status,403);
 const bars=normalizeBars([{timestamp:'2024-05-03T13:30:00Z',open:10,high:11,low:9,close:10,volume:1000},{timestamp:'2024-05-03T13:31:00Z',open:11,high:12,low:10,close:11,volume:1000}]);
 assert.equal(visibleThrough(bars,0).length,1);
 assert.equal(bracketOutcome({side:'LONG',stop:10,target:12},{low:9,high:13}).result,'AMBIGUOUS');
 console.log('PASS v92: server-only first bar, locked decision before advance, stale cursor rejection, source rights, account isolation.');
}finally{globalThis.fetch=previous}
