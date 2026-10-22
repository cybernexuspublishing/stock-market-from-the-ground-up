import assert from 'node:assert/strict';
import {summarize,onRequest} from '../functions/api/advanced-journal-insights-v014146.js';
const paper=Array.from({length:19},(_,i)=>({journal_type:'paper',setup:'A',status:'closed',r_multiple:i%2?1:-1,mfe_r:2,mae_r:-1}));
const samples=summarize([...paper,{journal_type:'live',setup:'A',status:'closed',r_multiple:null},
 {journal_type:'paper',setup:'A',status:'closed',r_multiple:null},
 {journal_type:'paper',setup:'B',status:'draft',r_multiple:100}]);
assert.equal(samples.length,2,'paper/live must remain separate');
assert.equal(samples[0].journalType,'paper');
assert.equal(samples[0].records,20);
assert.equal(samples[0].measured,19,'missing R is never counted as a loss');
assert.equal(samples[0].winPct,null,'19 observations cannot show a misleading win rate');
assert.equal(samples[1].journalType,'live');
const grown=summarize([...paper,
 {journal_type:'paper',setup:'A',status:'closed',r_multiple:0}]);
assert.equal(grown[0].measured,20);
assert.equal(grown[0].winPct,45);
assert.equal(grown[0].averageR,-0.05);
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const env={SUPABASE_URL:'https://mock.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_opaque-test'};
const old=globalThis.fetch;let member='member',role='MEMBER',flag='active',authorized=true;
const requests=[];
const response=(data,s=200)=>new Response(JSON.stringify(data),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,options={})=>{
 const u=String(url);requests.push({u,options});
 if(u.endsWith('/auth/v1/user'))return response({id});
 if(u.includes('/profiles?'))return response([{account_kind:member}]);
 if(u.includes('/admin_user_flags?'))return response([{status:flag}]);
 if(u.includes('/admin_user_roles?'))return response([{role_code:role,expires_at:null}]);
 if(u.includes('/platform_tools?'))return response([{tool_code:u.includes('TRADE_REVIEW_REPLAY')?
  'TRADE_REVIEW_REPLAY':'STRATEGY_VALIDATION',name:'Testing tool',description:'',category:'Research',
  status:'beta',active:true,free_preview:false,individual_price_cents:0}]);
 if(u.endsWith('/rpc/user_has_tool_access'))return response(authorized);
 if(u.includes('/decision_journal?')){
  assert(u.includes('user_id=eq.'+id));
  assert(!u.includes(other));
  assert.equal(options.headers.apikey,env.SUPABASE_SECRET_KEY);
  assert.equal(options.headers.authorization,undefined,'modern sb_secret cannot be used as JWT');
  if(u.includes('order=created_at.desc'))return response([{id:12,ticker:'ABC',journal_type:'paper',
   setup:'Setup',trade_date:'2026-10-20',status:'closed',secret_note:'MUST_NOT_LEAK'}]);
  return response([{journal_type:'paper',status:'closed',setup:'Setup',
   r_multiple:'1.5',mfe_r:2,mae_r:-0.5,plan_followed:true,secret_note:'MUST_NOT_LEAK'}]);
 }
 throw Error('Unexpected mock URL '+u);
};
const call=(action,method='GET')=>onRequest({env,request:new Request(
 'https://platform.example/api/advanced-journal-insights-v014146?action='+action,
 {method,headers:{authorization:'Bearer user-session'}})});
try{
 let r=await call('review'),value=await r.json();
 assert.equal(r.status,200);
 assert.equal(value.tool,'TRADE_REVIEW_REPLAY');
 assert.equal(value.records[0].id,12);
 assert(!JSON.stringify(value).includes('MUST_NOT_LEAK'),'no raw journal notes');
 r=await call('strategy');value=await r.json();
 assert.equal(r.status,200);
 assert.equal(value.recordCount,1);
 assert.equal(value.groups.length,1);
 assert.equal(value.groups[0].winPct,null);
 assert(!JSON.stringify(value).includes('MUST_NOT_LEAK'));
 authorized=false;r=await call('strategy');assert.equal(r.status,403);
 authorized=true;flag='suspended';r=await call('review');assert.equal(r.status,403);
 flag='active';member='showcase';r=await call('strategy');assert.equal(r.status,403);
 member='member';role='SHOWCASE_VIEWER';r=await call('strategy');assert.equal(r.status,403);
 role='MEMBER';r=await call('strategy','POST');assert.equal(r.status,405);
 assert.equal((await r.json()).ok,false);
 r=await call('unknown');assert.equal(r.status,404);
 console.log('PASS D06: server-scoped journal insights, per-tool rights, modern opaque service keys, paper/live boundaries, no raw notes, denied roles.');
}finally{globalThis.fetch=old}
