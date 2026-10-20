// v119: outcome evidence is only accessible after a locked note + explicit reveal.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/journal-replay-review-v014118.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('assets/js/review-queue.js');
assert(ui.includes("action=evidence&reviewId=")&&ui.includes('replayEvidenceHTML(evidence)'));
const env={SUPABASE_URL:'https://mock.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fake',SUPABASE_SECRET_KEY:'sb_secret_fake'};
const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',session='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
let revealed=false,allowed=true,revoked=false,wrongOwner=false,badBar=false,observedQueries=0;
const old=globalThis.fetch;
const response=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url)=>{
 const path=String(url);
 if(path.endsWith('/auth/v1/user'))return response({id:actor});
 if(path.includes('/profiles?'))return response([{account_kind:'member'}]);
 if(path.includes('/admin_user_flags?'))return response([{status:'active'}]);
 if(path.includes('/rpc/user_has_tool_access'))return response(allowed);
 if(path.includes('/gu_replay_review_locks_v014118?'))return response(wrongOwner?[]:
  [{review_id:7,journal_id:11,revealed_at:revealed?'2026-10-20T16:00:00Z':null}]);
 if(path.includes('/gu_replay_journal_links_v01494?'))return response([{session_id:session,dataset_code:'GUSIM_TEST'}]);
 if(path.includes('/gu_replay_sessions_v01492?'))return response([
  {id:session,user_id:actor,dataset_code:'GUSIM_TEST',status:'finished',current_index:1}]);
 if(path.includes('/market_datasets?'))return response([{
  status:revoked?'withdrawn':'published',dataset_type:'ohlcv',
  source_attribution:'Original course exercise',license_note:'Author-owned',
  metadata:{licensed_for_member_display:true,evidence_verified:true,
  corporate_action_policy:'not_applicable',original_synthetic:true}}]);
 if(path.includes('/gu_replay_bars_v01492?')){
  observedQueries++;assert(path.includes('bar_index=lte.1')&&path.includes('limit=40'));
  return response([{bar_index:1,bar_at:'2026-01-01T14:35:00Z',open:100,high:101,low:99,
   close:badBar?-1:100.5,volume:900}]);
 }
 throw Error('Unknown mock path: '+path);
};
const query=()=>onRequest({env,request:new Request(
 'https://test.example/api/journal-replay-review-v014118?action=evidence&reviewId=7',
 {headers:{authorization:'Bearer legitimate-user-token'}})});
try{
 let r=await query();assert.equal(r.status,403);assert.equal(observedQueries,0);
 revealed=true;wrongOwner=true;r=await query();assert.equal(r.status,403);assert.equal(observedQueries,0);
 wrongOwner=false;revoked=true;r=await query();assert.equal(r.status,403);assert.equal(observedQueries,0);
 revoked=false;badBar=true;r=await query();assert.equal(r.status,503);
 badBar=false;r=await query();assert.equal(r.status,200);
 const body=await r.json();
 assert.equal(body.observations.length,1);assert.equal(body.observations[0].index,1);
 assert.equal(body.originalSynthetic,true);
 assert(!('actualEntry' in body)&&!('netPnl' in body));
 allowed=false;r=await query();assert.equal(r.status,403);
 console.log('PASS v119: review-visible candles require member, locked/revealed state, rights and bounded server cursor; reject malformed bars.');
}finally{globalThis.fetch=old}
