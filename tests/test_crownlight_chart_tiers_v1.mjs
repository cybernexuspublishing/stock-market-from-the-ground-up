import assert from 'node:assert/strict';
import {onRequestGet as chartTier} from '../functions/api/chart-tier-access.js';
import {onRequestGet as founderOffer} from '../functions/api/founding-offer-status.js';
const uuid='11111111-1111-4111-8111-111111111111',base='https://mockchart.supabase.co';
const env={SUPABASE_URL:base,SUPABASE_SECRET_KEY:'secret_fixture',SUPABASE_PUBLISHABLE_KEY:'pub_fixture'};
const now=Date.now(),before=new Date(now-3600000).toISOString(),after=new Date(now+3600000).toISOString();
const state={plan:null,publicLaunch:false,full:false,revoked:false,reversed:false,expired:false,restricted:false,grant:null,profile:true};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
const original=globalThis.fetch;let calls=[];
globalThis.fetch=async(url,opt={})=>{
 const u=new URL(url);assert.equal(u.hostname,'mockchart.supabase.co');calls.push(u.pathname);
 if(u.pathname==='/auth/v1/user')return json({id:uuid});
 if(u.pathname==='/rest/v1/profiles')return json(state.profile?[{account_kind:'member',deleted_at:null}]:[]);
 if(u.pathname==='/rest/v1/admin_user_flags')return json(state.restricted?[{status:'restricted'}]:[]);
 if(u.pathname==='/rest/v1/admin_user_roles')return json([]);
 if(u.pathname==='/rest/v1/rpc/user_has_tool_access')return json(false);
 if(u.pathname==='/rest/v1/gu_founder_release_v014173')return json([{public_launch_open:state.publicLaunch,enrollment_enabled:true}]);
 if(u.pathname==='/rest/v1/gu_founder_members_v014173'){
  if(u.searchParams.has('user_id'))return json(state.plan?[{revoked_at:state.revoked?before:null}]:[]);
  return json(state.full?Array.from({length:600},(_,i)=>({founder_number:i+1})):[]);
 }
 if(u.pathname==='/rest/v1/gu_founder_paid_cycles_v014173')return json(state.plan?[{
  plan_code:state.plan,billing_start:before,billing_end:state.expired?before:after,
  reversed_at:state.reversed?before:null}]:[]);
 if(u.pathname==='/rest/v1/gu_founder_reservations_v014173')return json([]);
 if(u.pathname==='/rest/v1/user_plan_grants')return json(state.grant?[{
  plan_code:state.grant,status:'active',starts_at:before,ends_at:after}]:[]);
 throw Error('Unexpected provider request '+u.pathname);
};
const request=()=>new Request('https://website.test/api/chart-tier-access',{headers:{authorization:'Bearer mocked-access-token'}});
async function check(tier){
 const r=await chartTier({request:request(),env}),b=await r.json();
 assert.equal(r.status,200);assert.equal(b.tier,tier);
 assert.deepEqual(b.allowed,tier==='STANDARD'?['STANDARD']:tier==='ADVANCED'?['STANDARD','ADVANCED']:
  ['STANDARD','ADVANCED','PROFESSIONAL']);
}
try{
 await check('STANDARD');
 state.plan='FOUNDING_14';await check('STANDARD');
 state.plan='FOUNDING_30';await check('ADVANCED');
 state.plan='FOUNDING_60';await check('PROFESSIONAL');
 state.expired=true;await check('STANDARD');state.expired=false;
 state.reversed=true;await check('STANDARD');state.reversed=false;
 state.revoked=true;await check('STANDARD');state.revoked=false;
 state.plan=null;state.grant='FULL_MONTHLY';await check('STANDARD');
 state.publicLaunch=true;await check('PROFESSIONAL');
 state.grant=null;state.publicLaunch=false;
 let offer=await (await founderOffer({env})).json();
 assert.equal(offer.offersVisible,true);assert.equal(offer.remaining,600);
 state.full=true;offer=await (await founderOffer({env})).json();
 assert.equal(offer.offersVisible,false);assert.equal(offer.remaining,0);
 state.full=false;state.publicLaunch=true;offer=await (await founderOffer({env})).json();
 assert.equal(offer.offersVisible,false);assert.equal(offer.phase,'public');
 state.publicLaunch=false;state.restricted=true;
 const deny=await (await chartTier({request:request(),env})).json();
 assert.deepEqual(deny.allowed,[]);assert.equal(deny.eligible,false);
 state.restricted=false;state.profile=false;
 const ineligible=await (await chartTier({request:request(),env})).json();assert.deepEqual(ineligible.allowed,[]);
 const guest=await chartTier({request:new Request('https://website.test/api/chart-tier-access'),env});
 assert.equal(guest.status,401);
 console.log('PASS Crownlight Chart Tiers: Free / Founding 14/30/60 / reversed / expired / revoked / post-launch full / 600 sold-out / public-launch / restricted / guest');
}finally{globalThis.fetch=original}
