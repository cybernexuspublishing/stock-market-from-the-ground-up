// v0.14.0.120: verify one Postgres transaction replaces multi-REST v119 reads.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/journal-replay-review-v014118.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const api=read('functions/api/journal-replay-review-v014118.js');
assert(api.includes('rpc/gu_v014120_replay_review_evidence'));
assert(!api.includes("gu_replay_bars_v01492?select=bar_index"),
 'Review API must not read market bars through an unsecured multi-HTTP chain');
const sql=read('supabase/migrations/v0.14.0.120_ATOMIC_REPLAY_REVIEW_EVIDENCE_OWNER_REVIEW_REQUIRED.sql');
for(const term of ['SECURITY INVOKER','FOR SHARE','LIMIT 40',
 "AND b.bar_index<=session.current_index","REVOKE ALL ON FUNCTION","TO service_role",
 'source.metadata','revealed_at IS NOT NULL'])
 assert(sql.includes(term),'Missing v120 invariant '+term);
const env={SUPABASE_URL:'https://mock.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fake',SUPABASE_SECRET_KEY:'sb_secret_fake'};
const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const sid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
let allowed=true,err=false,badIndex=false,n=0,role='member',fake=false,revoked=false;
const old=globalThis.fetch;
const respond=(x,status=200)=>new Response(JSON.stringify(x),{status,
 headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,init={})=>{
 const path=String(url);
 if(path.endsWith('/auth/v1/user'))return respond({id:actor});
 if(path.includes('/profiles?'))return respond([{account_kind:role}]);
 if(path.includes('/admin_user_flags?'))return respond([{status:'active'}]);
 if(path.includes('/admin_user_roles?'))return respond([]);
 if(path.includes('/rpc/user_has_tool_access'))return respond(allowed);
 if(path.includes('/gu_replay_sessions_v01492?'))return respond([{dataset_code:'IEX_APPROVED_1'}]);
 if(path.includes('/market_datasets?'))return respond([{dataset_code:'IEX_APPROVED_1',ticker:'AAPL',
   status:revoked?'archived':'published',dataset_type:'ohlcv',
   source_attribution:'Data provided for free by IEX',license_note:'License reviewed',
   metadata:{original_synthetic:false,real_market_security:true,
    historical_evidence_verified:true,evidence_verified:true,licensed_for_member_display:true,
    trading_conditions_reviewed:true,packet_integrity_reviewed:true,license_publication_reviewed:true,
    corporate_actions_reviewed:true,corporate_action_policy:'raw split checked',
    data_source:'IEX_HIST',venue_scope:'IEX_SINGLE_VENUE',source_date:'2026-10-07',
    source_sha256:'a'.repeat(64),reviewed_by:'Owner',reviewed_at:'2026-10-21T10:00:00Z'}}]);
 if(path.includes('/rpc/gu_v014120_replay_review_evidence')){
  n++;
  assert.equal(init.method,'POST');
  const body=JSON.parse(init.body);
  assert.equal(body.p_actor,actor);
  assert.equal(body.p_review,7);
  assert.equal(init.headers.apikey,env.SUPABASE_SECRET_KEY);
  assert.equal(init.headers.authorization,undefined,'Never use opaque service keys as bearer');
  if(err)return respond({message:'Review source rights withdrawn'},400);
  return respond({ok:true,reviewId:7,sessionId:sid,observedThroughIndex:1,
   hasEarlierBars:false,originalSynthetic:fake,sourceAttribution:'Rights-reviewed historical IEX venue',
   observations:[{index:0,timestamp:'2026-01-01T14:30:00Z',open:100,high:102,low:98,
    close:101,volume:1000},{index:badIndex?3:1,timestamp:'2026-01-01T14:35:00Z',
    open:101,high:103,low:100,close:102,volume:1200}]});
 }
 throw Error('Unexpected fetch: '+path);
};
const run=(reviewId=7,token=true)=>onRequest({env,
 request:new Request('https://course.test/api/journal-replay-review-v014118?action=evidence&reviewId='+reviewId,
 {headers:token?{authorization:'Bearer mock-user-token'}:{}})});
try{
 let r=await run(7,false);assert.equal(r.status,401);assert.equal(n,0);
 allowed=false;r=await run();assert.equal(r.status,403);assert.equal(n,0);allowed=true;
 role='showcase';r=await run();assert.equal(r.status,403);assert.equal(n,0);role='member';
 r=await run('not-a-number');assert.equal(r.status,400);assert.equal(n,0);
 r=await run();assert.equal(r.status,200);
 let body=await r.json();assert.equal(body.observations.length,2);
 assert.equal(body.originalSynthetic,false);assert.equal(body.observedThroughIndex,1);
 assert(!('netPnl' in body));
 fake=true;r=await run();assert.equal(r.status,403,'previous fictional review observations cannot be displayed');
 fake=false;revoked=true;r=await run();assert.equal(r.status,403,'revoked rights cannot reveal reviewed observations');
 revoked=false;
 badIndex=true;r=await run();assert.equal(r.status,503,'rejects over-cursor/forged data');
 badIndex=false;err=true;r=await run();assert.equal(r.status,409,'DB-level review denial is fail-closed');
 assert.equal(n,5);
 console.log('PASS v120: atomic owner-and-reveal evidence RPC, auth, bad cursor and revoked-source failure paths');
}finally{globalThis.fetch=old}
