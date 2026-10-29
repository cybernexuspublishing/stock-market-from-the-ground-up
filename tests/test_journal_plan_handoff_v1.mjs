import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/journal-plan-prefill.js';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'pub_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const mock=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
const saved={id:17,record_type:'scenario_review',created_at:'2026-10-28T10:02:00Z',payload:{
 kind:'ADVANCED_TRADE_PLAN_SNAPSHOT_V1',data:{
  symbol:'TEST',pattern:'VWAP hold',direction:'LONG',decision:'PLAN',asOf:'2026-10-27T16:00:00Z',
  source:'Primary filing',sourceAt:'2026-10-27T15:00:00Z',sourceUrl:'https://example.com/filing',
  thesis:'Member thesis',trigger:'HOD break',invalidation:'Loss of VWAP',
  trend:'up',levels:'HOD 5.20',catalyst:'Filing disclosed',
  cancel:'Spread widens',alternative:'Reject on low volume',
  entry:5,stop:4.8,target1:5.6,target2:6,stretch:6.3,holding:'day',
  stopMechanism:'STOP MARKET (slippage possible)'
 },modeled:{size:124}}};
const original=globalThis.fetch;
let access=true,member=id,query='';
globalThis.fetch=async(url,options={})=>{
 const u=new URL(url),path=u.pathname;
 if(path==='/auth/v1/user')return mock({id:member});
 if(path==='/rest/v1/profiles')return mock([{account_kind:'member',deleted_at:null}]);
 if(path==='/rest/v1/admin_user_flags')return mock([]);
 if(path==='/rest/v1/admin_user_roles')return mock([]);
 if(path==='/rest/v1/platform_tools')return mock([{tool_code:'WATCHLIST_WORKBENCH',name:'Workbench',
  description:'Research',category:'RESEARCH',status:'beta',active:true,free_preview:true,individual_price_cents:500}]);
 if(path==='/rest/v1/rpc/user_has_tool_access')return mock(access);
 if(path==='/rest/v1/gu_product_access_config_v1')return mock([]);
 if(path==='/rest/v1/tool_workspace_records'){
   query=u.searchParams.toString();
   assert.match(query,/user_id=eq\.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/);
   assert.match(query,/tool_code=eq\.WATCHLIST_WORKBENCH/);
   assert.match(query,/record_type=eq\.scenario_review/);
   return mock(member===id?[saved]:[]);
 }
 throw Error('Unexpected URL '+u);
};
const make=(planId,method='GET',token=true)=>new Request('https://site.example/api/journal-plan-prefill?planId='+planId,{
 method,headers:token?{authorization:'Bearer valid'}:{}});
try{
 let r=await onRequest({request:make('17'),env});let body=await r.json();
 assert.equal(r.status,200);assert.equal(body.journalDraft.ticker,'TEST');
 assert.equal(body.journalDraft.decision,'WATCH','PLAN cannot imply an executed trade');
 assert.equal(body.journalDraft.share_quantity,124);
 assert.equal(body.journalDraft.planned_stop,4.8);
 assert.match(body.journalDraft.evidence,/member-entered/i);
 assert.equal(body.neverLockAutomatically,true);
 r=await onRequest({request:make('bad'),env});assert.equal(r.status,400);
 r=await onRequest({request:make('17','POST'),env});assert.equal(r.status,405);
 r=await onRequest({request:make('17','GET',false),env});assert.equal(r.status,401);
 access=false;r=await onRequest({request:make('17'),env});assert.equal(r.status,403);
 assert.equal((await r.json()).ok,false);
 access=true;member='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 // Fixture returns a nonmember private record on purpose; no real service
 // would do so, so the request's user_id filter is what must be checked.
 r=await onRequest({request:make('17'),env});assert.equal(r.status,404,'Other members cannot import a private saved plan');
 const frontend=readFileSync(new URL('../assets/js/journal-plan-transfer-v1.js',import.meta.url),'utf8');
 const list=readFileSync(new URL('../assets/js/journal.js',import.meta.url),'utf8');
 const detail=readFileSync(new URL('../assets/js/journal-entry.js',import.meta.url),'utf8');
 assert.match(frontend,/source_plan/);
 assert.match(frontend,/plan_locked_at/);
 assert.match(frontend,/Save Draft/);
 assert.match(frontend,/member-owned/i);
 assert.match(list,/from\('decision_journal'\)\.insert\(row\)/);
 assert.match(list,/source_plan/);
 assert.match(detail,/lock_trade_plan/);
 console.log('PASS owner-scoped saved-plan handoff; no auto-lock/execute; Free Journal original insertion and quota preserved');
}finally{globalThis.fetch=original}
