/* Entitlement boundary regression: executes the production member access handler
 * with explicitly simulated GoTrue, private PostgREST and tool-entitlement replies.
 * No real payment, real account or production database writes.
 */
import assert from 'node:assert/strict';
import {toolAccess,onRequest} from '../functions/api/member-tool-access.js';
const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fixture_pub',SUPABASE_SECRET_KEY:'sb_secret_fixture'};
const owner='00000000-0000-4000-8000-000000000123';
const other='00000000-0000-4000-8000-000000000456';
const scenario={profile:'member',deleted:false,flags:[],roles:[],entitled:false,rpcValid:true,roleResponseValid:true,lookups:[]};
const previous=globalThis.fetch;
const respond=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(raw,opts={})=>{
 const url=new URL(raw),path=url.pathname;scenario.lookups.push(path);
 if(path==='/auth/v1/user')return opts.headers.authorization==='Bearer memberA'?respond({id:owner}):
  opts.headers.authorization==='Bearer memberB'?respond({id:other}):respond({error:'invalid session'},401);
 if(path==='/rest/v1/profiles')return respond([{account_kind:scenario.profile,deleted_at:scenario.deleted?'2026-10-01T00:00:00Z':null}]);
 if(path==='/rest/v1/admin_user_flags')return respond(scenario.flags.map(status=>({status})));
 if(path==='/rest/v1/admin_user_roles')return respond(scenario.roleResponseValid?scenario.roles:{invalid:true});
 if(path==='/rest/v1/rpc/user_has_tool_access'){
  const params=JSON.parse(opts.body);
  assert.equal(params.target_user,opts.__other?other:owner);
  assert(['ONDEMAND_TRAINING','MARKET_SIMULATOR','MARKET_TUTOR'].includes(params.target_tool));
  return respond(scenario.rpcValid?scenario.entitled:{allowed:true});
 }
 throw Error('Unexpected test endpoint '+path);
};
const call=async(tool='MARKET_SIMULATOR',token='memberA')=>
 toolAccess(env,new Request('https://fixture.example/api/member-tool-access',{headers:{authorization:'Bearer '+token}}),tool);
const reset=()=>Object.assign(scenario,{profile:'member',deleted:false,flags:[],roles:[],entitled:false,rpcValid:true,roleResponseValid:true,lookups:[]});
try {
 reset();
 let v=await call();
 assert.equal(v.freeEligible,true,'Free learner may use narrowly approved fictional study');
 assert.equal(v.authorized,false,'Free must never gain premium simulator');
 assert.equal(v.denialCode,'premium_entitlement_required');
 v=await call('ONDEMAND_TRAINING');
 assert.equal(v.authorized,false,'Free must not gain paid Academy training');
 v=await call('MARKET_TUTOR');
 assert.equal(v.authorized,false,'Free must not gain paid AI tool');
 reset();scenario.entitled=true;
 v=await call('ONDEMAND_TRAINING');assert.equal(v.authorized,true);
 assert.equal(v.freeEligible,true,'Paid learners retain foundational content');
 reset();scenario.profile='showcase';v=await call();assert.equal(v.freeEligible,false);assert.equal(v.authorized,false);
 assert(!scenario.lookups.includes('/rest/v1/rpc/user_has_tool_access'),'Showcase blocked before paid RPC');
 reset();scenario.deleted=true;v=await call();assert.equal(v.freeEligible,false);
 reset();scenario.flags=['suspended'];v=await call();assert.equal(v.freeEligible,false);
 reset();scenario.flags=['restricted'];v=await call();assert.equal(v.freeEligible,false);
 reset();scenario.roles=[{role_code:'SHOWCASE_VIEWER',expires_at:null}];
 v=await call();assert.equal(v.freeEligible,false,'Showcase role denied even on member account');
 reset();scenario.roles=[{role_code:'SHOWCASE_VIEWER',expires_at:'2020-01-01T00:00:00Z'}];
 v=await call();assert.equal(v.freeEligible,true,'Expired Showcase role does not indefinitely deny an eligible member');
 reset();scenario.roleResponseValid=false;
 await assert.rejects(()=>call(),e=>e.status===503,'Malformed privileged-role response must fail closed');
 reset();scenario.rpcValid=false;
 await assert.rejects(()=>call(),e=>e.status===503,'Malformed tool grant response must fail closed');
 reset();await assert.rejects(()=>call('MARKET_SIMULATOR','invalid'),e=>e.status===401);
 reset();const response=await onRequest({request:new Request('https://fixture.example/api/member-tool-access?tool=MARKET_SIMULATOR',{headers:{authorization:'Bearer memberA'}}),env});
 assert.equal(response.status,200);
 const publicDecision=await response.json();
 assert.equal(publicDecision.freeEligible,true);
 assert.equal(publicDecision.authorized,false);
 assert.equal(publicDecision.denialCode,'premium_entitlement_required');
 assert(!JSON.stringify(publicDecision).includes('sb_secret_fixture'),'Never expose credentials');
 console.log('PASS: Free is expressly eligible for ungraded practice only; paid tools, Showcase, deleted, suspended, invalid/malformed permissions denied.');
} finally {globalThis.fetch=previous}
