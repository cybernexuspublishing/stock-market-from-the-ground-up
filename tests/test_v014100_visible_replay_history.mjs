// v0.14.0.100 | A reloaded Chart must restore only the member's already
// revealed bars. Never accept the browser as an authority for visibility.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/learning-replay-v01492.js';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 sid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',
 SUPABASE_SECRET_KEY:'sb_secret_test'};
let actor=id,rights=true,account='member',replayAccess=true,replayCursor=2,corrupt=false;
const calls=[],old=globalThis.fetch;
const mockJSON=(value,status=200)=>new Response(JSON.stringify(value),{status,
 headers:{'content-type':'application/json'}});
const dataset={dataset_code:'GUSIM_SITE_001',dataset_type:'ohlcv',status:'published',
 ticker:'SIMULATION',source_attribution:'Crown & Lantern Press — fictional',
 license_note:'Original authored data',metadata:{original_synthetic:true,
 licensed_for_member_display:true,evidence_verified:true,corporate_action_policy:'N/A',
 historical_evidence_verified:false}};
const bar=i=>({bar_index:i,bar_at:new Date(Date.UTC(2040,0,3,14,30+5*i)).toISOString(),
 open:10+i,high:11+i,low:9+i,close:10.5+i,volume:200});
globalThis.fetch=async(url,opts={})=>{
 const path=String(url);calls.push(path);
 if(path.endsWith('/auth/v1/user'))return mockJSON({id:actor});
 if(path.includes('/profiles?'))return mockJSON([{account_kind:account}]);
 if(path.includes('/admin_user_flags?'))return mockJSON([{status:'active'}]);
 if(path.includes('/rpc/user_has_tool_access')){
  const code=JSON.parse(opts.body).target_tool;
  return mockJSON(code==='MARKET_SIMULATOR'?false:code==='ONDEMAND_TRAINING'&&replayAccess);
 }
 if(path.includes('/gu_replay_sessions_v01492?'))return mockJSON(
 actor===id?[{id:sid,user_id:id,dataset_code:dataset.dataset_code,decision_locked:true,
 decision:'WATCH',decision_plan:null,current_index:replayCursor,status:'active',
 expires_at:'2099-01-01T00:00:00Z'}]:[]);
 if(path.includes('/market_datasets?'))return mockJSON([{...dataset,status:rights?'published':'archived'}]);
 if(path.includes('/gu_replay_bars_v01492?')){
  assert(path.includes('&bar_index=lte.'+replayCursor),'Server query must never include future bars');
  assert(path.includes('&order=bar_index.desc&limit=40'),'Bound private history');
  const now=[bar(2),bar(1),bar(0)].filter(x=>x.bar_index<=replayCursor);
  if(corrupt&&now.length>=2)now[1].bar_at=now[0].bar_at;
  return mockJSON(now);
 }
 throw Error('Unexpected fetch '+path);
};
const call=async(url='https://site.example/api/learning-replay-v01492?action=visible&sessionId='+sid)=>{
 const r=await onRequest({request:new Request(url,{headers:{authorization:'Bearer mock-member'}}),env});
 return [r.status,await r.json()];
};
try{
 let [status,body]=await call();
 assert.equal(status,200);
 assert.deepEqual(body.bars.map(x=>x.index),[0,1,2]);
 assert.equal(body.currentIndex,2);
 assert.equal(body.sessionId,sid);
 assert.equal(body.hasEarlierBars,false);
 assert.equal(body.bars.some(x=>x.index>2),false);
 assert(!JSON.stringify(body).includes('2040-01-03T14:45:00'));
 // Even a parameter asking for future bars is ignored, not trusted.
 [status,body]=await call('https://site.example/api/learning-replay-v01492?action=visible&sessionId='+sid+'&index=22');
 assert.equal(status,200);
 assert.deepEqual(body.bars.map(x=>x.index),[0,1,2]);
 actor=other;[status]=await call();assert.equal(status,404,'Other member owns no such replay');
 actor=id;rights=false;[status]=await call();assert.equal(status,403,'Revoked publication rights block historical retrieval');
 rights=true;account='showcase';[status]=await call();assert.equal(status,403,'Showcase must never receive private history');
 account='member';replayAccess=false;[status]=await call();assert.equal(status,403);
 replayAccess=true;corrupt=true;[status]=await call();
 assert.equal(status,503,'Corrupt chronological source must fail closed without leaking a fragment');
 const client=readFileSync(new URL('../assets/js/verified-replay-v01492.js',import.meta.url),'utf8');
 assert(client.includes("['current','visible'].includes(action)"));
 assert(client.includes("const visible=await api('visible')"));
 assert(client.includes("for(const b of visible.bars)addBar(b)"));
 console.log('PASS v100: original replay restores only server-cursor visible OHLCV, enforces ownership/rights, rejects chronological corruption and ignores client future-index injection.');
}finally{globalThis.fetch=old}
