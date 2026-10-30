import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {onRequest as journal} from '../functions/api/watchlist-journal-transfer-v3.js';
import {onRequest as chart} from '../functions/api/watchlist-chart-context-v3.js';
import {onRequest as alerts} from '../functions/api/watchlist-alerts-v3.js';
const require=createRequire(import.meta.url);
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const U='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://testfixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',
 SUPABASE_SECRET_KEY:'sb_secret_fixture'};
const sent=[];
let restricted=false,hasRight=true,archived=false,missingCandidate=false,duplicate=false;
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
const candidate={id:11,title:'FICT',updated_at:'2026-10-29T11:00:00Z',
 payload:{folder:'Test Research',workflowStage:'MONITOR',asOf:'2026-10-29T10:00:00Z',
 sourceNote:'Fictional licensed-free research fixture',invalidation:'No trade if unverified',archived:false,
 chartAnnotations:[{kind:'RESISTANCE',at:'2026-10-29T10:00:00Z',price:15.5,timeframe:'5m',note:'Manual research reference'},
 {kind:'SCRIPT',at:'2026-10-29T10:00:00Z',price:1,note:'Should never return'},
 {kind:'SUPPORT',at:'2099-01-01T00:00:00Z',price:12,note:'Future reference'}],
 monitoringRules:[{type:'ABOVE_REFERENCE',low:15.3,note:'Manual study condition'},
 {type:'BELOW_REFERENCE',low:10,note:'No alert expected'}],
 privateNote:'Never expose private raw payload'}};
const session=()=>({authorization:'Bearer fixture'});
const req=(method,path,body,options={})=>new Request('https://example.pages.dev'+path,{
 method,headers:{...session(),...(method==='POST'?{origin:'https://example.pages.dev','content-type':'application/json'}:{}),...options},
 body:body===undefined?undefined:JSON.stringify(body)});
const oldFetch=globalThis.fetch;
globalThis.fetch=async(input,init={})=>{
 const url=new URL(input),path=url.pathname;
 sent.push({path,method:init.method||'GET',body:init.body?JSON.parse(init.body):null,url:url.href});
 if(path==='/auth/v1/user')return response({id:U});
 if(path.endsWith('/profiles'))return response([{account_kind:'member',deleted_at:null}]);
 if(path.endsWith('/admin_user_flags'))return response(restricted?[{status:'suspended'}]:[]);
 if(path.endsWith('/admin_user_roles'))return response([{role_code:'OWNER',expires_at:null}]);
 if(path.endsWith('/platform_tools'))return response([{tool_code:'WATCHLIST_WORKBENCH',
  status:'beta',active:true,free_preview:false,name:'Research Workbench'}]);
 if(path.endsWith('/rpc/user_has_tool_access'))return response(hasRight);
 if(path.endsWith('/gu_product_access_config_v1'))return response([]);
 if(path.endsWith('/rpc/gu_watchlist_to_journal_v3'))
  return response({ok:true,journalId:304,alreadyExists:duplicate,status:'draft',journalType:'observation'});
 if(path.endsWith('/tool_workspace_records'))return response(missingCandidate?[]:[{...candidate,
  payload:{...candidate.payload,archived}}]);
 if(path.endsWith('/gu_watchlist_alert_events_v3')){
  if((init.method||'GET')==='GET')return response([{id:40,rule_kind:'ABOVE_REFERENCE',
   observation_at:'2026-10-29T10:30:00Z',price:15.9,read_at:null}]);
  if(init.method==='PATCH')return response([{id:40,read_at:'2026-10-29T11:00:00Z'}]);
  const rows=JSON.parse(init.body);return response(rows.map((x,i)=>({id:41+i,candidate_id:x.candidate_id,
   rule_kind:x.rule_kind,rule_index:x.rule_index})));
 }
 throw Error('Unexpected network path '+url.href);
};
try{
 const unsafe=await journal({request:req('POST','/api/watchlist-journal-transfer-v3',
  {planId:22,user_id:U}),env});assert.equal(unsafe.status,400,'client user override denied');
 const missing=await journal({request:req('POST','/api/watchlist-journal-transfer-v3',{planId:0}),env});
 assert.equal(missing.status,400);
 const created=await journal({request:req('POST','/api/watchlist-journal-transfer-v3',{planId:22}),env});
 assert.equal(created.status,200);let result=await created.json();
 assert.equal(result.journalId,304);assert.equal(result.hasTradeExecution,false);
 assert.equal(result.allowance,'EXISTING_JOURNAL_TRIGGER');
 assert.equal(sent.filter(x=>x.path.endsWith('/rpc/gu_watchlist_to_journal_v3')).length,1);
 const call=sent.find(x=>x.path.endsWith('/rpc/gu_watchlist_to_journal_v3'));
 assert.deepEqual(call.body,{p_user:U,p_plan:22});
 duplicate=true;
 const retry=await (await journal({request:req('POST','/api/watchlist-journal-transfer-v3',{planId:22}),env})).json();
 assert.equal(retry.alreadyExists,true);
 const info=await chart({request:req('GET','/api/watchlist-chart-context-v3?candidateId=11'),env});
 assert.equal(info.status,200);result=await info.json();
 assert.equal(result.symbol,'FICT');assert.equal(result.annotations.length,1);
 assert.equal(result.annotations[0].price,15.5);
 assert.equal(result.chartDataIncluded,false);assert.equal(result.livePriceIncluded,false);
 assert.equal('privateNote' in result,false);
 const wrong=await chart({request:req('GET','/api/watchlist-chart-context-v3?candidateId=11',
 undefined,{authorization:''}),env});assert.equal(wrong.status,401);
 missingCandidate=true;
 const missingData=await chart({request:req('GET','/api/watchlist-chart-context-v3?candidateId=88'),env});
 assert.equal(missingData.status,404);
 missingCandidate=false;
 const feed=await (await alerts({request:req('GET','/api/watchlist-alerts-v3'),env})).json();
 assert.equal(feed.events.length,1);assert.equal(feed.pushDelivery,false);
 const data={action:'evaluate',candidateId:11,price:15.9,
  observedAt:'2026-10-29T11:00:00Z',sourceNote:'Personally provided fictional dated sample'};
 const trigger=await alerts({request:req('POST','/api/watchlist-alerts-v3',data),env});
 assert.equal(trigger.status,200);const ev=await trigger.json();
 assert.equal(ev.matched,1);assert.equal(ev.newEvents,1);
 const logged=sent.findLast(x=>x.path.endsWith('/gu_watchlist_alert_events_v3')&&x.method==='POST');
 assert.equal(logged.body.length,1);assert.equal(logged.body[0].user_id,U);
 assert.equal(logged.body[0].rule_kind,'ABOVE_REFERENCE');
 assert.ok(logged.url.includes('on_conflict=user_id'));
 const future=await alerts({request:req('POST','/api/watchlist-alerts-v3',{
  ...data,observedAt:'2099-01-01T00:00:00Z'}),env});
 assert.equal(future.status,400);
 archived=true;
 const ignored=await alerts({request:req('POST','/api/watchlist-alerts-v3',data),env});
 assert.equal(ignored.status,409);archived=false;
 const read=await alerts({request:req('POST','/api/watchlist-alerts-v3',{action:'markRead',eventId:40}),env});
 assert.equal((await read.json()).read,true);
 hasRight=false;
 const rejected=await journal({request:req('POST','/api/watchlist-journal-transfer-v3',{planId:22}),env});
 assert.equal(rejected.status,403,'Free preview cannot create premium Journal transfers');
 hasRight=true;restricted=true;
 assert.equal((await chart({request:req('GET','/api/watchlist-chart-context-v3?candidateId=11'),env})).status,403);
 restricted=false;
 const v3=readFileSync(new URL('../supabase/migrations/20261030_watchlist_journal_auto_v3.sql',import.meta.url),'utf8');
 assert.match(v3,/gu_watchlist_to_journal_v3/);
 assert.match(v3,/INSERT INTO public\.decision_journal/);
 assert.match(v3,/gu_journal_research_links_v1/);
 assert.match(v3,/gu_watchlist_journal_transfers_v3/);
 assert.doesNotMatch(v3,/DISABLE TRIGGER|ALTER TABLE public\.decision_journal DISABLE/i);
 const view=readFileSync(new URL('../assets/js/watchlist-chart-handoff-v3.js',import.meta.url),'utf8');
 assert.match(view,/replaceChildren/);assert.match(view,/watchlist-chart-context-v3/);
 assert.doesNotMatch(view,/innerHTML\s*=/);
 const learning=require('../assets/js/watchlist-learning-v3.js');
 assert.equal(Object.keys(learning.packs).length,8);
 for(const k of ['DISCOVER','RESEARCH','ANALYZE','MONITOR','PLAN','PRACTICE','REVIEW','LEARN']){
  assert.ok(learning.forStage(k).exercise.length>20);
 }
 const panel=readFileSync(new URL('../assets/js/watchlist-intelligence-v2.js',import.meta.url),'utf8');
 for(const k of ['watchlist-journal-transfer-v3','watchlist-alerts-v3',
   'simulator.html?watchlist_candidate=','GroundUpWatchlistLearningV3','TALIA_RESEARCH_REFLECTION'])
  assert.ok(panel.includes(k),'Missing connected V3 flow '+k);
 const chartPage=readFileSync(new URL('../simulator.html',import.meta.url),'utf8');
 assert.match(chartPage,/watchlist-chart-handoff-v3\.js/);
 console.log('PASS Watchlist V3: premium Journal auth/idempotency/Free boundaries, owned chart context and manual annotations, safe in-app review events, Talia eight-stage ungraded instruction and no price-feed claim');
}finally{globalThis.fetch=oldFetch}
