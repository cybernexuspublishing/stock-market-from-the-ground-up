import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const endpoint=read('functions/api/talia-watchlist-reports-v1.js');
const client=read('assets/js/watchlist-talia-workstation-v4.js');
const migration=read('supabase/migrations/20261030_talia_watchlist_reports_v1.sql');
const build=read('scripts/build-pages.sh');
for(const expected of ['ENABLE ROW LEVEL SECURITY','TO authenticated USING (user_id=(SELECT auth.uid()))',
 'PRIMARY KEY(user_id,event_id)','ON CONFLICT(user_id) DO UPDATE',
 'AFTER INSERT','REFERENCES auth.users(id) ON DELETE CASCADE',
 'SECURITY INVOKER','REVOKE ALL','GRANT EXECUTE ON FUNCTION public.gu_talia_watchlist_clear_v1(uuid) TO service_role']){
 assert(migration.includes(expected),'Missing DB security/durability property '+expected);
}
for(const forbidden of ['GRANT INSERT ON public.gu_talia_watchlist_checkpoints_v1 TO authenticated',
 'GRANT UPDATE ON public.gu_talia_watchlist_reports_v1 TO anon','SECURITY DEFINER']){
 assert(!migration.includes(forbidden),'Unsafe SQL: '+forbidden);
}
assert(client.includes("'/api/talia-watchlist-reports-v1'"));
assert(client.includes('let persistentReport=null'),'Private report state must be declared');
assert(!/\bpersistedReport\b/.test(client),'Undeclared persistedReport state crashed the member report');
assert(client.includes("request('POST',pendingRequest.body)"));
assert(client.includes("request('DELETE',{confirm:'DELETE_ALL_TALIA_RESEARCH'})"));
assert(client.includes("request('GET',undefined,'?limit=100&offset=0')"));
assert(client.includes('root.crypto.randomUUID()'));
assert(client.includes('if(!loaded)'));
assert(!client.includes('localStorage.'));
assert(build.includes('node tests/test_talia_watchlist_persistence_v1.mjs'));
let data=[],rollup=null,unauthorized=false,fetches=[];
function recalc(){
 const dimensions={},mistakes={},topics={};
 for(const r of data){
  dimensions[r.dimension]=(dimensions[r.dimension]||0)+1;
  if(r.misconception!=='NONE')mistakes[r.misconception]=(mistakes[r.misconception]||0)+1;
  topics[r.topic_id]=(topics[r.topic_id]||0)+1;
 }
 rollup=data.length?{user_id:'member-a',total_attempts:data.length,dimension_counts:dimensions,
  misconception_counts:mistakes,topic_counts:topics,first_saved_at:'2026-10-30T00:00:00Z',
  last_saved_at:'2026-10-30T00:01:00Z',data_status:'MEMBER_REPORTED_UNGRADED'}:null;
}
function makeResponse(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}})}
async function mockFetch(url,opts){
 const u=new URL(url);fetches.push({path:u.pathname,method:opts.method,authorization:opts.headers.authorization});
 if(u.pathname.endsWith('/gu_talia_watchlist_reports_v1'))return makeResponse(rollup?[rollup]:[]);
 if(u.pathname.endsWith('/gu_talia_watchlist_checkpoints_v1')){
  if(opts.method==='POST'){
   const obj=JSON.parse(opts.body);assert.equal(obj.user_id,'member-a');
   const existing=data.find(x=>x.event_id===obj.event_id&&x.user_id===obj.user_id);
   if(existing)return makeResponse([]);
   const row={...obj,created_at:'2026-10-30T00:01:00Z'};
   data.push(row);recalc();return makeResponse([row],201);
  }
  const id=u.searchParams.get('user_id');
  assert.equal(id,'eq.member-a');
  const found=u.searchParams.get('event_id');
  let rows=data.filter(x=>x.user_id==='member-a'&&(!found||found==='eq.'+x.event_id));
  rows=rows.slice(Number(u.searchParams.get('offset')||0),
   Number(u.searchParams.get('offset')||0)+Number(u.searchParams.get('limit')||100));
  return makeResponse(rows);
 }
 if(u.pathname.endsWith('/rpc/gu_talia_watchlist_clear_v1')){
  assert.equal(JSON.parse(opts.body).p_user,'member-a');const n=data.length;data=[];recalc();return makeResponse(n);
 }
 throw Error('Unexpected DB route '+url);
}
const transformed=endpoint
 .replace("import {toolAccess} from './member-tool-access.js';","const toolAccess=globalThis.__toolAccess;")
 .replace('export async function onRequest({request,env})','async function onRequest({request,env})')+
 '\nglobalThis.__handle=onRequest;';
const world={fetch:mockFetch,Response,URL,AbortSignal,TextEncoder,
 __toolAccess:async(env,req)=>req.headers.get('authorization')==='Bearer example'?
  {userId:'member-a',freeEligible:!unauthorized,reason:'Restricted'}:
  {userId:'',freeEligible:false,reason:'Missing credentials'}};
world.globalThis=world;
vm.runInNewContext(transformed,world,{filename:'talia-watchlist-reports-v1.js'});
const env={SUPABASE_URL:'https://tenant.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_fixture'};
const call=async(method,body,origin='https://example.com',qs='')=>{
 const req=new Request('https://example.com/api/talia-watchlist-reports-v1'+qs,{
  method,headers:{authorization:'Bearer example',origin},...(body?{body:JSON.stringify(body)}:{})});
 const response=await world.__handle({request:req,env});
 return {status:response.status,body:await response.json()};
};
const id='8e8d98d1-7bce-4db8-97df-81248ef26dbe';
const row={eventId:id,topic:'vwap',step:'Explain',dimension:'Knowledge',
 answer:'The bar approximation weights the completed typical prices by their recorded volume.',
 misconception:'INDICATOR_CERTAINTY',fictionalCase:'trend',cutoff:12,symbol:'GUSIM'};
let r=await call('GET',null,undefined,'?limit=100&offset=0');
assert.equal(r.status,200);assert.equal(r.body.report.totalAttempts,0);
r=await call('POST',row);assert.equal(r.status,200);assert.equal(r.body.report.totalAttempts,1);
assert.equal(r.body.saved.answer,row.answer);assert.equal(r.body.saved.source,'MEMBER_REPORTED_UNGRADED');
r=await call('POST',row);assert.equal(r.status,200);assert.equal(r.body.report.totalAttempts,1);
assert.equal(r.body.alreadySaved,true,'Network retries must be idempotent');
r=await call('POST',{...row,answer:'Another different decision with same event id.'});
assert.equal(r.status,409,'Reusing eventId for a changed answer must fail');
r=await call('POST',{...row,eventId:'e3638564-2221-409c-a7e4-187212872e92',dimension:'Decision'});
assert.equal(r.status,400,'Research action dictates its dimension');
r=await call('POST',{...row,eventId:'e3638564-2221-409c-a7e4-187212872e92',user_id:'victim'});
assert.equal(r.status,400,'Client user_id must be rejected');
r=await call('POST',{...row,eventId:'e3638564-2221-409c-a7e4-187212872e92'},'https://attacker.com');
assert.equal(r.status,403,'Cross-origin report mutation blocked');
r=await call('GET',null,undefined,'?limit=100&offset=0');
assert.equal(r.body.history.length,1);assert.equal(r.body.report.dimensionCounts.Knowledge,1);
unauthorized=true;
r=await call('GET');assert.equal(r.status,403,'Suspended accounts denied');
unauthorized=false;
r=await call('DELETE',{confirm:'DELETE_ALL_TALIA_RESEARCH'});
assert.equal(r.status,200);assert.equal(r.body.deletedCheckpoints,1);
r=await call('GET');assert.equal(r.body.report.totalAttempts,0);
assert(fetches.every(x=>!x.authorization),'Service credentials must not be returned to browser or passed as bearer in sb_secret environment');
console.log('PASS permanent Talia research reports: RLS migration contracts, auth scope, immutable API, idempotent writes, strict provenance, durable rollup, deletion and private UI integration');
