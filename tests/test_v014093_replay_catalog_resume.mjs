// v0.14.0.93 — No real database, market-data provider, money or credentials.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/learning-replay-v01492.js';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fake',SUPABASE_SECRET_KEY:'sb_secret_fake'};
const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
let authorized=true,restricted=false,rights=true,started=false,locked=false,index=0,fetches=[];
const dataset={dataset_code:'LICENSED_1',title:'Verified educational source',ticker:'MOCK',dataset_type:'ohlcv',status:'published',source_attribution:'Reviewed educational evidence',license_note:'Rights checked separately',metadata:{evidence_verified:true,licensed_for_member_display:true,corporate_action_policy:'Raw corporate action review'}};
const unverified={...dataset,dataset_code:'UNREVIEWED_1',metadata:{...dataset.metadata,evidence_verified:false}};
const original=globalThis.fetch;
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,init={})=>{
 const u=String(url);fetches.push(u);
 if(u.endsWith('/auth/v1/user'))return json({id:user});
 if(u.includes('/rest/v1/profiles?'))return json([{account_kind:'member'}]);
 if(u.includes('/rest/v1/admin_user_flags?'))return json([{status:restricted?'restricted':'active'}]);
 if(u.includes('/rest/v1/rpc/user_has_tool_access'))return json(authorized);
 if(u.includes('/rest/v1/market_datasets?')){
  const good=rights?dataset:{...dataset,status:'archived'};
  if(u.includes('order=dataset_code.asc'))return json([good,unverified].filter(x=>x.status==='published'));
  return json([good]);
 }
 if(u.includes('/rest/v1/gu_replay_bars_v01492?')){
  const i=Number(/bar_index=eq\.(\d+)/.exec(u)?.[1]);
  return json([{bar_index:i,bar_at:new Date(Date.UTC(2024,4,3,13,30+i)).toISOString(),open:10+i,high:11+i,low:9+i,close:10+i,volume:1000}]);
 }
 if(u.includes('/rest/v1/gu_replay_sessions_v01492')&&init.method==='POST'){started=true;return json([{id}]);}
 if(u.includes('/rest/v1/gu_replay_sessions_v01492?')&&init.method==='PATCH'){
  const b=JSON.parse(init.body);
  if(b.decision_locked){locked=true;return json([{id}]);}
  return json([{id}]);
 }
 if(u.includes('/rest/v1/gu_replay_sessions_v01492?'))return json(started?[{id,dataset_code:'LICENSED_1',current_index:index,decision_locked:locked,decision:locked?'WATCH':null,status:'active',expires_at:'2099-01-01T00:00:00Z'}]:[]);
 if(u.includes('/rest/v1/rpc/v01492_replay_advance')){
  const body=JSON.parse(init.body);
  if(body.p_expected_index!==index)return json(-1);
  index++;return json(index);
 }
 throw Error('Unexpected request: '+u);
};
const req=(action,body,token=true)=>new Request('https://education.example/api/learning-replay-v01492?action='+action,{
 method:body===undefined?'GET':'POST',
 headers:{...(token?{authorization:'Bearer synthetic-account'}:{}),...(body!==undefined?{'content-type':'application/json'}:{})},
 ...(body===undefined?{}:{body:JSON.stringify(body)})
});
const query=async(action,body,token=true)=>{const r=await onRequest({request:req(action,body,token),env});return [r.status,await r.json()]};
try{
 let [status]=await query('catalog',undefined,false);assert.equal(status,401);
 [status]=await query('catalog');assert.equal(status,200);
 let [_,catalog]=await query('catalog');assert.deepEqual(catalog.datasets.map(x=>x.code),['LICENSED_1']);
 assert(!JSON.stringify(catalog).includes('UNREVIEWED_1'),'unverified data must stay absent');
 let [__,empty]=await query('resume');assert.equal(empty.session,null);
 [status]=await query('start',{datasetCode:'LICENSED_1'});assert.equal(status,201);
 let [___,resumed]=await query('resume');assert.equal(resumed.session.currentIndex,0);
 assert.equal(resumed.session.bar.close,10);
 assert.equal(JSON.stringify(resumed).includes('2024-05-03T13:31:00.000Z'),false,'no next bar leaked');
 [status]=await query('lock',{sessionId:id,decision:'WATCH',reasoning:'I need an observed price structure and clear invalidation.'});assert.equal(status,200);
 [status]=await query('advance',{sessionId:id,expectedIndex:0});assert.equal(status,200);
 [___,resumed]=await query('resume');assert.equal(resumed.session.currentIndex,1);assert.equal(resumed.session.decisionLocked,true);
 assert.equal(resumed.session.bar.close,11);
 assert.equal(JSON.stringify(resumed).includes('2024-05-03T13:32:00.000Z'),false,'future bar leaked');
 rights=false;
 [status]=await query('current',undefined,true);assert.equal(status,400,'a current request requires sessionId');
 [status]=await query('resume');assert.equal(status,403,'Owner revocation must immediately suppress resume');
 [status]=await query('catalog');assert.equal(status,200);
 const [,after]=await query('catalog');assert.equal(after.datasets.length,0);
 rights=true;restricted=true;
 [status]=await query('resume');assert.equal(status,403,'restricted accounts must not get private observations');
 restricted=false;authorized=false;
 [status]=await query('catalog');assert.equal(status,403,'no entitlement means no catalog');
 assert(!fetches.some(x=>x.includes('api.openai.com')),'no model traffic');
 const client=readFileSync(new URL('../assets/js/verified-replay-v01492.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../verified-replay.html',import.meta.url),'utf8');
 assert(client.includes("async function catalog()")&&client.includes("async function resume()"));
 for(const name of ['vr-dataset','vr-refresh','vr-resume'])assert(html.includes('id="'+name+'"'));
 console.log('PASS v93: scoped published dataset discovery, no-lookahead restore, status revocation, auth isolation and already-existing replay UI wiring.');
}finally{globalThis.fetch=original}
