// v0.14.0.94 — isolated authorization, idempotency and atomic RPC contract.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/learning-replay-v01492.js';

const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fake',SUPABASE_SECRET_KEY:'sb_secret_fake',GU_REPLAY_JOURNAL_V01494_ENABLED:'true'};
const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const session='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
let allowed=true,locked=true,revoked=false,linked=null,rpcCalls=0;
const oldFetch=globalThis.fetch;
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,init={})=>{
 const u=String(url);
 if(u.endsWith('/auth/v1/user'))return json({id:user});
 if(u.includes('/rest/v1/profiles?'))return json([{account_kind:'member'}]);
 if(u.includes('/rest/v1/admin_user_flags?'))return json([{status:'active'}]);
 if(u.includes('/rest/v1/rpc/user_has_tool_access'))return json(allowed);
 if(u.includes('/rest/v1/gu_replay_sessions_v01492?'))return json([{dataset_code:'IEX_APPROVED_1'}]);
 if(u.includes('/rest/v1/market_datasets?'))return json([{
  dataset_code:'IEX_APPROVED_1',ticker:'AAPL',dataset_type:'ohlcv',
  status:'published',source_attribution:'Data provided for free by IEX',license_note:'License reviewed',
  metadata:{original_synthetic:false,real_market_security:true,
  historical_evidence_verified:true,evidence_verified:true,licensed_for_member_display:true,
  trading_conditions_reviewed:true,packet_integrity_reviewed:true,license_publication_reviewed:true,
  corporate_actions_reviewed:true,corporate_action_policy:'raw split checked',
  data_source:'IEX_HIST',venue_scope:'IEX_SINGLE_VENUE',source_date:'2026-10-07',
  source_sha256:'a'.repeat(64),reviewed_by:'Owner',reviewed_at:'2026-10-21T10:00:00Z'}}]);
 if(u.includes('/rest/v1/rpc/v01494_replay_finish_to_journal')){
  rpcCalls++;
  assert.equal(init.method,'POST');
  assert.deepEqual(JSON.parse(init.body),{p_session:session,p_user:user});
  if(!locked||revoked)return json({message:'Replay not eligible for finalization'},409);
  if(linked!==null)return json({journalId:linked,barsSeen:2,alreadyLinked:true});
  linked=341;return json({journalId:linked,barsSeen:2,alreadyLinked:false});
 }
 throw Error('Unexpected request: '+u);
};
const call=async(token=true,id=session,method='POST')=>{
 const req=new Request('https://example.test/api/learning-replay-v01492?action=finish',{
  method,headers:{...(token?{authorization:'Bearer fake-access-token'}:{}),
    ...(method==='POST'?{'content-type':'application/json'}:{})},
  ...(method==='POST'?{body:JSON.stringify({sessionId:id})}:{})
 });
 const r=await onRequest({request:req,env});return [r.status,await r.json()];
};
try{
 let [status]=await call(false);assert.equal(status,401);assert.equal(rpcCalls,0);
 allowed=false;[status]=await call();assert.equal(status,403);assert.equal(rpcCalls,0);
 allowed=true;[status]=await call(true,'invalid');assert.equal(status,400);assert.equal(rpcCalls,0);
 locked=false;[status]=await call();assert.equal(status,503);assert.equal(linked,null);
 locked=true;revoked=true;[status]=await call();assert.equal(status,503);assert.equal(linked,null);
 revoked=false;
 let response;[status,response]=await call();assert.equal(status,200);
 assert.equal(response.journalId,341);assert.equal(response.barsSeen,2);
 assert.equal(response.alreadyLinked,false);
 assert(!('execution' in response)&&!('processScore' in response)&&!('bar' in response));
 [status,response]=await call();assert.equal(status,200);
 assert.equal(response.journalId,341);assert.equal(response.alreadyLinked,true);
 assert.equal(rpcCalls,4);
 const sql=readFileSync(new URL('../supabase/migrations/v0.14.0.94_REPLAY_JOURNAL_ATOMIC_OWNER_REVIEW_REQUIRED.sql',import.meta.url),'utf8');
 const api=readFileSync(new URL('../functions/api/learning-replay-v01492.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../assets/js/verified-replay-v01492.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../verified-replay.html',import.meta.url),'utf8');
 for(const required of [
  'FOR UPDATE','FOR SHARE','licensed_for_member_display','evidence_verified',
  'CREATE TABLE IF NOT EXISTS public.gu_replay_journal_links_v01494',
  'INSERT INTO public.decision_journal','INSERT INTO public.trade_plan_snapshots',
  'UPDATE public.gu_replay_sessions_v01492',
  'REVOKE ALL ON FUNCTION public.v01494_replay_finish_to_journal',
  'GRANT EXECUTE ON FUNCTION public.v01494_replay_finish_to_journal',
  "'outcomeVerified',false","'graded',false"
 ])assert(sql.includes(required),'SQL safety/transaction contract missing: '+required);
 assert(!/INSERT INTO public.lab_attempts/i.test(sql),'No automatic graded lab attempts');
 assert(!/gross_pnl|actual_entry|actual_exit|process_score/i.test(sql),'No manufactured trade outcomes');
 assert(api.includes("GU_REPLAY_JOURNAL_V01494_ENABLED==='true'"),'Private transaction must be opt-in until migration is installed');
 assert(api.includes('journalLinked:false'),'Uninstalled DB must keep existing replay finish available');
 assert(ui.includes("journal-entry.html?id=")&&html.includes('id="vr-journal-link"'));
 console.log('PASS v94: signed-in member scope, no duplicate finalization, linked Journal navigation, SQL atomicity and no fabricated outcomes.');
}finally{globalThis.fetch=oldFetch}
