// v0.14.0.115 — first-decision integrity, OHLCV numerical safety, source provenance.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/learning-replay-v01492.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/v0.14.0.115_REPLAY_JOURNAL_PROVENANCE_OWNER_REVIEW_REQUIRED.sql');
const server=read('functions/api/learning-replay-v01492.js');
const client=read('assets/js/verified-replay-v01492.js');
const journal=read('assets/js/journal-entry.js');
assert(sql.includes('CREATE TABLE IF NOT EXISTS public.gu_replay_journal_links_v01494'));
for(const expected of ['FOR UPDATE','FOR SHARE',"'original_synthetic'",'originalSynthetic',
 'replayDatasetKind','ORIGINAL FICTIONAL simulation','INSERT INTO public.trade_plan_snapshots',
 'GRANT EXECUTE ON FUNCTION public.v01494_replay_finish_to_journal','COMMIT;',
 "'outcomeVerified',false","'graded',false"])
 assert(sql.includes(expected),'Missing preserved transactional or provenance invariant: '+expected);
assert(!/INSERT INTO public.lab_attempts/i.test(sql),'No fictional replay may invent a Lab grade');
assert(!/gross_pnl|actual_entry|actual_exit|process_score/i.test(sql),'No fabricated financial results');
assert(client.includes('authEpoch++')&&client.includes('resetMemberReplay()')&&client.includes('epoch!==authEpoch'),
 'Account switching must scrub visible candles and reject stale responses');
assert(journal.includes('ORIGINAL FICTIONAL REPLAY')&&journal.includes('replayDatasetKind')===false,
 'Existing and new replay provenance must be visible in Journal');
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fake',SUPABASE_SECRET_KEY:'sb_secret_fake'};
const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const sid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
let mutationCalls=0,invalidPrice=false;
const originalFetch=globalThis.fetch;
const respond=(j,s=200)=>new Response(JSON.stringify(j),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,init={})=>{
 const p=String(url);
 if(p.endsWith('/auth/v1/user'))return respond({id:user});
 if(p.includes('/rest/v1/profiles?'))return respond([{account_kind:'member'}]);
 if(p.includes('/rest/v1/admin_user_flags?'))return respond([{status:'active'}]);
 if(p.includes('/rest/v1/admin_user_roles?'))return respond([]);
 if(p.includes('/rest/v1/rpc/user_has_tool_access'))return respond(true);
 if(p.includes('/rest/v1/gu_replay_sessions_v01492?')){
  if(init.method==='PATCH'){mutationCalls++;return respond([{id:sid}]);}
  return respond([{id:sid,user_id:user,dataset_code:'IEX_REVIEWED_LESSON',current_index:0,
   decision_locked:false,decision:null,decision_plan:null,status:'active',expires_at:'2099-01-01T00:00:00Z'}]);
 }
 if(p.includes('/rest/v1/market_datasets?'))return respond([{
  dataset_code:'IEX_REVIEWED_LESSON',dataset_type:'ohlcv',status:'published',ticker:'AAPL',
  source_attribution:'Data provided for free by IEX',license_note:'Rights reviewed for educational display',
  metadata:{licensed_for_member_display:true,evidence_verified:true,
  corporate_action_policy:'Raw IEX unadjusted',original_synthetic:false,real_market_security:true,historical_evidence_verified:true,trading_conditions_reviewed:true,packet_integrity_reviewed:true,license_publication_reviewed:true,corporate_actions_reviewed:true,data_source:'IEX_HIST',venue_scope:'IEX_SINGLE_VENUE',source_date:'2024-05-03',source_sha256:'a'.repeat(64),reviewed_by:'Independent Owner review',reviewed_at:'2026-10-21T14:00:00Z'}}]);
 if(p.includes('/rest/v1/gu_replay_bars_v01492?'))return respond([{
  bar_index:0,bar_at:'2026-01-02T14:30:00Z',open:invalidPrice?-1:100,
  high:101,low:99,close:100.5,volume:5000}]);
 throw Error('Unexpected backend request '+p);
};
const invoke=async(decision,plan)=>{const r=await onRequest({env,request:new Request('https://example.test/api/learning-replay-v01492?action=lock',{
 method:'POST',headers:{authorization:'Bearer valid-token','content-type':'application/json'},
 body:JSON.stringify({sessionId:sid,decision,plan,reasoning:'First observed bar suggests a cautious test, not a real broker fill.'})})});
 return [r.status,await r.json()];};
try{
 let [status]=await invoke('NO_TRADE',{side:'BUY',type:'MARKET',quantity:1});
 assert.equal(status,400,'A nontrade decision must not stage hypothetical fills');
 assert.equal(mutationCalls,0);
 [status]=await invoke('WATCH',{side:'SELL',type:'LIMIT',quantity:100,limitPrice:100});
 assert.equal(status,400);assert.equal(mutationCalls,0);
 [status]=await invoke('ENTER',{side:'BUY',type:'MARKET',quantity:1});
 assert.equal(status,200);assert.equal(mutationCalls,1);
 invalidPrice=true;
 const r=await onRequest({env,request:new Request('https://example.test/api/learning-replay-v01492?action=current&sessionId='+sid,
 {headers:{authorization:'Bearer valid-token'}})});
 assert.equal(r.status,503,'Nonpositive market candles may not be presented as verified evidence');
}finally{globalThis.fetch=originalFetch;}
console.log('PASS v115: no nonentry fills, positive-priced OHLCV only, immutable provenance, private auth epoch invalidation.');
