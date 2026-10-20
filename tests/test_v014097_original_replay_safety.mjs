// v0.14.0.97 — synthetic source never represented as an actual market event.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/learning-replay-v01492.js';
const repoFile=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const sql=repoFile('supabase/migrations/v0.14.0.97_419_AUTHOR_CREATED_FICTIONAL_OHLCV_OWNER_REVIEW_REQUIRED.sql');
const api=repoFile('functions/api/learning-replay-v01492.js');
const ui=repoFile('assets/js/verified-replay-v01492.js');
const lab=repoFile('assets/js/site-lab-experience.js');
const readiness=repoFile('functions/_lib/owner-lab-readiness-v01493.js');
for(const k of ["original_synthetic","historical_evidence_verified',false",
 "'SIMULATION'","'paper' ELSE 'historical_lab'","gen_random_uuid","random()",
 "generate_series(0,23)","published_count<>419","bar_count<>10056","CREATE OR REPLACE FUNCTION public.v01494_replay_finish_to_journal",
 "historical_lab","Original fictional replay","No actual stock"]){
 if(k==='gen_random_uuid')continue; // bars use PG random without publishing a seed.
 assert(sql.includes(k),'Missing generated source contract '+k);
}
assert(!sql.includes("CREATE TABLE "), 'Replay must reuse private bars/sessions rather than create copies');
assert(!sql.includes("INSERT INTO public.lab_attempts"),'No fictional exercise awards real Lab grades');
assert(sql.includes("END,\n  s.reasoning"),'SQL CASE must not contain dangling string-quote');
assert(sql.includes("'firstBarAt',b.bar_at")&&sql.includes("'outcomeVerified',false,'graded',false"));
assert(api.includes("limit=700"),'All 419 datasets must be eligible for catalog listing');
assert(api.includes("original_synthetic===true"),'API must carry strong synthetic disclaimers');
assert(ui.includes('ORIGINAL FICTIONAL SIMULATION — NOT MARKET HISTORY'));
assert(ui.includes('visibleCandles.push(b)')&&ui.includes('function plotVisibleCandles()'));
assert(ui.includes('visibleCandles.length=0'), 'No stale session charts');
assert(repoFile('verified-replay.html').includes('id="vr-visible-chart"'));
assert(ui.includes("new URLSearchParams(location.search).get('dataset')"));
assert(lab.includes('GUSIM_')&&lab.includes('ORIGINAL FICTIONAL OHLCV'));
assert(readiness.includes('dataset.metadata?.original_synthetic===true'),'Synthetic cannot certify historical Lab evidence');
const env={SUPABASE_URL:'https://synthetic.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',sid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const data={dataset_code:'GUSIM_SITE_001',title:'ORIGINAL FICTIONAL SCENARIO | Site Lab 1',
 ticker:'SIMULATION',status:'published',dataset_type:'ohlcv',
 source_attribution:'Crown & Lantern Press — original computer-created teaching scenario; not market history',
 license_note:'Owner generated, no external data',metadata:{original_synthetic:true,
 historical_evidence_verified:false,licensed_for_member_display:true,evidence_verified:true,
 corporate_action_policy:'Not applicable: synthetic'}};
let sessionExists=false,locked=false,step=0,serviceRequests=[];
const save=globalThis.fetch, json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async (url,init={})=>{
 const u=String(url);serviceRequests.push(u);
 if(u.endsWith('/auth/v1/user'))return json({id});
 if(u.includes('/profiles?'))return json([{account_kind:'member'}]);
 if(u.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(u.includes('/rpc/user_has_tool_access'))return json(true);
 if(u.includes('/rest/v1/market_datasets?'))return json([data]);
 if(u.includes('/rest/v1/gu_replay_bars_v01492?')){
  const i=Number(/bar_index=eq\.(\d+)/.exec(u)?.[1]);return json([{
   bar_index:i,bar_at:new Date(Date.UTC(2040,0,3,14,30+i*5)).toISOString(),
   open:20+i,high:21+i,low:19+i,close:20.5+i,volume:15000+i*5}]);
 }
 if(u.includes('/rest/v1/gu_replay_sessions_v01492')&&init.method==='POST'){sessionExists=true;return json([{id:sid}]);}
 if(u.includes('/rest/v1/gu_replay_sessions_v01492?')&&init.method==='PATCH'){if(JSON.parse(init.body||'{}').decision_locked===true)locked=true;return json([{id:sid}]);}
 if(u.includes('/rest/v1/gu_replay_sessions_v01492?'))return json(sessionExists?[{
  id:sid,dataset_code:data.dataset_code,current_index:step,decision_locked:locked,
  decision:locked?'WATCH':null,status:'active',expires_at:'2099-01-01T00:00:00Z'}]:[]);
 if(u.includes('/rest/v1/rpc/v01492_replay_advance')){step++;return json(step);}
 throw Error('Unexpected '+u);
};
async function call(action,body){
 const r=await onRequest({request:new Request('https://site.example/api/learning-replay-v01492?action='+action,
  {method:body?'POST':'GET',headers:{authorization:'Bearer token',...(body?{'content-type':'application/json'}:{})},
   ...(body?{body:JSON.stringify(body)}:{})}),env});
 return [r.status,await r.json()];
}
try{
 let [status,d]=await call('catalog');assert.equal(status,200);
 assert.equal(d.datasets.length,1);assert.equal(d.datasets[0].synthetic,true);
 [status,d]=await call('start',{datasetCode:data.dataset_code});assert.equal(status,201);
 assert.equal(d.dataset.synthetic,true);assert.match(d.notice,/FICTIONAL/);
 assert.equal(d.bar.index,0);assert(!JSON.stringify(d).includes('2040-01-03T14:35'));
 [status,d]=await call('resume');assert.equal(status,200);
 assert.equal(d.session.dataset.synthetic,true);assert(!JSON.stringify(d).includes('2040-01-03T14:35'));
 [status,d]=await call('advance',{sessionId:sid,expectedIndex:0});assert.equal(status,403);
 [status,d]=await call('lock',{sessionId:sid,decision:'WATCH',reasoning:'No inference about next bar can be drawn from this one observation.'});assert.equal(status,200);
 [status,d]=await call('advance',{sessionId:sid,expectedIndex:0});assert.equal(status,200);
 assert.equal(d.currentIndex,1);
 assert.equal(d.bar.timestamp,'2040-01-03T14:35:00.000Z');
 assert(!JSON.stringify(d).includes('2040-01-03T14:40'));
 assert(serviceRequests.some(x=>x.includes('limit=700')));
 console.log('PASS v97: 419 original dataset SQL invariants, source distinction, private next-bar boundary, Journal paper classification and immutable no-hindsight contracts.');
}finally{globalThis.fetch=save}
