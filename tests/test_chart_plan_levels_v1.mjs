import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {onRequest} from '../functions/api/chart-plan-levels-v1.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
for(const name of ['functions/api/chart-plan-levels-v1.js',
 'assets/js/chart-plan-handoff-v1.js','assets/js/crownlight-chart-studio-v2.js',
 'assets/js/advanced-trade-plan-v1.js'])
 execFileSync(process.execPath,['--check',new URL('../'+name,import.meta.url).pathname]);
const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://mock.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const original=globalThis.fetch,json=(data)=>new Response(JSON.stringify(data),{
 status:200,headers:{'content-type':'application/json'}});
let entitled=true,lookupCount=0,record=null;
const valid={symbol:'GUSIM',direction:'LONG',asOf:'2026-10-21T09:30:00-04:00',
 sourceAt:'2026-10-21T09:00:00-04:00',entry:'5',stop:'4.80',target1:'5.60',
 target2:'6.00',stretch:'6.50'};
record={id:71,payload:{kind:'ADVANCED_TRADE_PLAN_SNAPSHOT_V1',data:valid}};
globalThis.fetch=async(url,opts={})=>{
 const u=String(url);
 if(u.endsWith('/auth/v1/user'))return json({id:user});
 if(u.includes('/profiles?'))return json([{account_kind:'member'}]);
 if(u.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(u.includes('/admin_user_roles?'))return json([{role_code:'MEMBER',expires_at:null}]);
 if(u.includes('/platform_tools?'))return json([{tool_code:'WATCHLIST_WORKBENCH',active:true,status:'beta',free_preview:true}]);
 if(u.endsWith('/rpc/user_has_tool_access'))return json(entitled);
 if(u.includes('/tool_workspace_records?')){
  lookupCount++;
  assert.match(u,/user_id=eq\.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/);
  assert.match(u,/tool_code=eq\.WATCHLIST_WORKBENCH/);
  assert.equal(opts.headers.apikey,env.SUPABASE_SECRET_KEY);
  assert.equal(opts.headers.authorization,undefined);
  return json(record?[record]:[]);
 }
 throw Error('Unexpected mock endpoint: '+u);
};
const make=(id=71,method='GET')=>new Request(
 'https://site.example/api/chart-plan-levels-v1?planId='+id,
 {method,headers:{authorization:'Bearer valid-member-session'}});
try{
 let r=await onRequest({request:make(),env}),data=await r.json();
 assert.equal(r.status,200);assert.equal(data.ok,true);
 assert.equal(data.symbol,'GUSIM');assert.equal(data.planId,71);
 assert.deepEqual(data.levels.map(l=>l.kind),['ENTRY','STOP','TARGET 1','TARGET 2','STRETCH']);
 assert.equal(data.levels[0].price,5);
 assert.equal(data.levels[1].price,4.8);
 assert.ok(!JSON.stringify(data).includes('sourceUrl'),'Do not transfer private research notes');
 assert.match(r.headers.get('cache-control'),/no-store/);
 r=await onRequest({request:make(71,'POST'),env});assert.equal(r.status,405);
 r=await onRequest({request:make('invalid'),env});assert.equal(r.status,400);
 record={id:71,payload:{kind:'ADVANCED_TRADE_PLAN_SNAPSHOT_V1',
  data:{...valid,sourceAt:'2026-10-21T10:00:00-04:00'}}};
 r=await onRequest({request:make(),env});assert.equal(r.status,409,'No look-ahead source time');
 record={id:71,payload:{kind:'ADVANCED_TRADE_PLAN_SNAPSHOT_V1',
  data:{...valid,stop:'5.2'}}};
 r=await onRequest({request:make(),env});assert.equal(r.status,409,'Stop side invalid');
 record=null;
 r=await onRequest({request:make(),env});assert.equal(r.status,404,'No other member plan rows');
 entitled=false;const before=lookupCount;
 r=await onRequest({request:make(),env});assert.equal(r.status,403);
 assert.equal(lookupCount,before,'No private plan lookup without current paid rights');
 const studio=read('assets/js/crownlight-chart-studio-v2.js');
 assert.match(studio,/setTemporaryPlanLevels/);
 assert.match(studio,/state\.tempPlan=null/);
 assert.match(studio,/currentSymbol===plan\.symbol/);
 assert.match(studio,/shownAt>observedAt/);
 assert.match(studio,/state\.userId===plan\.userId/);
 const handoff=read('assets/js/chart-plan-handoff-v1.js');
 assert.doesNotMatch(handoff,/localStorage|sessionStorage/);
 assert.match(handoff,/getSupabaseClient/);
 assert.match(handoff,/clearTemporaryPlanLevels/);
 assert.match(read('simulator.html'),/chart-plan-handoff-v1\.js/);
 assert.match(read('assets/js/advanced-trade-plan-v1.js'),/simulator\.html\?trade_plan=/);
 console.log('PASS Chart Studio saved plan levels: authorized owner, 5 levels, no future source, strict symbol/time and account scope');
}finally{globalThis.fetch=original}
