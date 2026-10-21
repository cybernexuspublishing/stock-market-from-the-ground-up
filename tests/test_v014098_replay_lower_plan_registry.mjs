// v0.14.0.143 | Historical Replay membership: exclusively Owner-approved authentic venue evidence.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/learning-replay-v01492.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const simulated={dataset_code:'GUSIM_SITE_001',title:'Original fictional chart',ticker:'SIMULATION',
 dataset_type:'ohlcv',status:'published',source_attribution:'Crown & Lantern Press',
 license_note:'Author-created and labeled fictional',metadata:{original_synthetic:true,
 evidence_verified:true,licensed_for_member_display:true,corporate_action_policy:'Not applicable',
 historical_evidence_verified:false}};
const historical={...simulated,dataset_code:'LICENSED_HIST_1',title:'Authentic rights-approved history',ticker:'AAPL',
 metadata:{...simulated.metadata,original_synthetic:false,evidence_verified:true,
 historical_evidence_verified:true,ondemand_training_approved:true,real_market_security:true,historical_evidence_verified:true,trading_conditions_reviewed:true,packet_integrity_reviewed:true,license_publication_reviewed:true,corporate_actions_reviewed:true,data_source:'IEX_HIST',venue_scope:'IEX_SINGLE_VENUE',source_date:'2024-05-03',source_sha256:'a'.repeat(64),reviewed_by:'Independent Owner review',reviewed_at:'2026-10-21T14:00:00Z'}};
const env={SUPABASE_URL:'https://fixture.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
let full=false,replay=true,account='member',sessions=[],requests=[];
const original=globalThis.fetch,respond=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,options={})=>{
 const u=String(url);requests.push(u);
 if(u.endsWith('/auth/v1/user'))return respond({id:uid});
 if(u.includes('/profiles?'))return respond([{account_kind:account}]);
 if(u.includes('/admin_user_flags?'))return respond([{status:'active'}]);
 if(u.includes('/rpc/user_has_tool_access')){
  const tool=JSON.parse(options.body||'{}').target_tool;
  return respond(tool==='MARKET_SIMULATOR'?full:tool==='ONDEMAND_TRAINING'?replay:false);
 }
 if(u.includes('/market_datasets?')){
  if(u.includes('order=dataset_code.asc'))return respond([simulated,historical]);
  const code=/dataset_code=eq\.([^&]+)/.exec(u)?.[1];
  return respond([simulated,historical].filter(d=>d.dataset_code===decodeURIComponent(code||'')));
 }
 if(u.includes('/gu_replay_bars_v01492?')){
  const n=Number(/bar_index=eq\.(\d+)/.exec(u)?.[1]);
  return respond([{bar_index:n,bar_at:new Date(Date.UTC(2040,0,3,14,30+5*n)).toISOString(),
   open:10+n,high:11+n,low:9+n,close:10.5+n,volume:10000}]);
 }
 if(u.includes('/gu_replay_sessions_v01492')&&options.method==='PATCH')return respond([]);
 if(u.endsWith('/gu_replay_sessions_v01492')&&options.method==='POST'){
  sessions.push({...JSON.parse(options.body),id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'});
  return respond([sessions.at(-1)]);
 }
 if(u.includes('/gu_replay_sessions_v01492?'))return respond(sessions.filter(x=>u.includes('id=eq.')||u.includes('user_id=eq.')));
 throw Error('Unexpected '+u);
};
async function check(action,body,allowToken=true){
 const r=await onRequest({env,request:new Request('https://school.example/api/learning-replay-v01492?action='+action,{
 method:body?'POST':'GET',headers:{...(allowToken?{authorization:'Bearer authenticated'}:{}),
 ...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})});
 return [r.status,await r.json()];
}
try{
 let [status,body]=await check('catalog');assert.equal(status,200);
 assert.deepEqual(body.datasets.map(x=>x.code),['LICENSED_HIST_1']);
 assert(body.datasets[0].synthetic!==true);
 [status]=await check('start',{datasetCode:'GUSIM_SITE_001'});assert.equal(status,403);
 const earlier=requests.length;
 [status,body]=await check('start',{datasetCode:'LICENSED_HIST_1'});assert.equal(status,201);
 assert.equal(body.bar.index,0);
 assert.equal(JSON.stringify(body).includes('2040-01-03T14:35'),false);
 assert(requests.length>earlier);
 full=true;[status,body]=await check('catalog');assert.equal(status,200);
 assert.deepEqual(body.datasets.map(x=>x.code),['LICENSED_HIST_1']);
 full=false;replay=false;[status]=await check('catalog');assert.equal(status,403);
 replay=true;account='showcase';[status]=await check('catalog');assert.equal(status,403);
 const source=readFileSync(new URL('../assets/js/lab-registry.js',import.meta.url),'utf8');
 assert(source.includes("data-lab-record data-lab-id"),'Filter must only inspect real current page rows');
 assert(source.includes("targetLab=inferred?query:''"),'Lab ID deep-link selects the canonical collection');
 assert(source.includes("Math.floor(ranked.count/PAGE_SIZE)"),'Deep link must find page beyond first 50');
 assert(source.includes('Reflection Saved (Ungraded)'),'Self-report must not appear to be a graded pass');
 assert(source.includes("const PAGE_SIZE=50"),'Do not fetch all 419 for every member search');
 console.log('PASS v143: Replay-only access to approved historical cases; fictional data blocked; Showcase denied; hidden future bars remain private.');
}finally{globalThis.fetch=original}
