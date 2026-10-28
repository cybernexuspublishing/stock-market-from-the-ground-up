import assert from 'node:assert/strict';
import {onRequestGet as chartTier} from '../functions/api/chart-tier-access.js';
import {onRequestGet as founderOffer} from '../functions/api/founding-offer-status.js';
const uuid='11111111-1111-4111-8111-111111111111',base='https://mockchart.supabase.co';
const env={SUPABASE_URL:base,SUPABASE_SECRET_KEY:'secret_fixture',SUPABASE_PUBLISHABLE_KEY:'pub_fixture'};
const now=Date.now(),before=new Date(now-3600000).toISOString(),after=new Date(now+3600000).toISOString();
const state={plan:null,publicLaunch:false,full:false,revoked:false,reversed:false,expired:false,restricted:false,grant:null,profile:true,qa:null,qaExpired:false,manualTier:null,manualExpired:false,manualRevoked:false,manualScope:'CHART_STUDIO_ONLY'};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
const original=globalThis.fetch;let calls=[];
globalThis.fetch=async(url,opt={})=>{
 const u=new URL(url);assert.equal(u.hostname,'mockchart.supabase.co');calls.push(u.pathname);
 if(u.pathname==='/auth/v1/user')return json({id:uuid});
 if(u.pathname==='/auth/v1/admin/users/'+uuid){
  if(!state.qa)return json({id:uuid,app_metadata:{},email_confirmed_at:after});
  const tag={FREE:'free',FOUNDING_30:'founding-30',FOUNDING_60:'founding-60'}[state.qa];
  const qaTier={FREE:'STANDARD',FOUNDING_30:'ADVANCED',FOUNDING_60:'PROFESSIONAL'}[state.qa];
  return json({id:uuid,email:'stockmarketfromthegroundup+test-'+tag+'-20261027@gmail.com',
   email_confirmed_at:before,app_metadata:{smfgu_qa_only:true,noncommercial:true,
    qa_batch:'SMFGU-MEMBERSHIP-9-20261027',qa_chart_batch:'SMFGU-CHART-3-20261028',
    qa_chart_tier:qaTier,qa_target_plan:state.qa,
    qa_chart_expires_at:state.qaExpired?before:after}});
 }
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
 if(u.pathname==='/rest/v1/gu_storefront_items_v014174')return json([
  {sku:'founding:FOUNDING_30',visible:true,sale_ready:true,status:'for_sale'},
  {sku:'founding:FOUNDING_60',visible:true,sale_ready:true,status:'for_sale'}
 ]);
 if(u.pathname==='/rest/v1/user_plan_grants')return json(state.grant?[{
  plan_code:state.grant,status:'active',starts_at:before,ends_at:after}]:[]);
 if(u.pathname==='/rest/v1/gu_sparks_chart_passes_v1')return json([]);
 if(u.pathname==='/rest/v1/crownlight_chart_qa_grants_v1')return json(state.manualTier?[{
  tier:state.manualTier,scope:state.manualScope,starts_at:before,
  ends_at:state.manualExpired?before:after,revoked_at:state.manualRevoked?before:null}]:[]);
 throw Error('Unexpected provider request '+u.pathname);
};
const request=()=>new Request('https://website.test/api/chart-tier-access',{headers:{authorization:'Bearer mocked-access-token'}});
async function check(tier){
 const r=await chartTier({request:request(),env}),b=await r.json();
 assert.equal(r.status,200,JSON.stringify({tier,response:b,lastCalls:calls.slice(-15)}));assert.equal(b.tier,tier);
 assert.deepEqual(b.allowed,tier==='STANDARD'?['STANDARD']:tier==='ADVANCED'?['STANDARD','ADVANCED']:
  ['STANDARD','ADVANCED','PROFESSIONAL']);
}
try{
 await check('STANDARD');
 state.manualTier='ADVANCED';await check('ADVANCED');
 const temporary=await (await chartTier({request:request(),env})).json();
 assert.equal(temporary.temporaryAccess?.kind,'QA');
 assert.equal(temporary.temporaryAccess?.tier,'ADVANCED');
 assert.equal(temporary.temporaryAccess?.expiresAt,after);
 assert.equal(temporary.sparksChartPasses?.enabled,true,'Server-priced Studio offers enabled');
 state.manualTier='PROFESSIONAL';await check('PROFESSIONAL');
 state.manualRevoked=true;await check('STANDARD');state.manualRevoked=false;
 state.manualExpired=true;await check('STANDARD');state.manualExpired=false;
 state.manualScope='UNRELATED_PREMIUM';await check('STANDARD');state.manualScope='CHART_STUDIO_ONLY';
 state.manualTier=null;await check('STANDARD');
 state.qa='FREE';await check('STANDARD');
 state.qa='FOUNDING_30';await check('ADVANCED');
 state.qa='FOUNDING_60';await check('PROFESSIONAL');
 state.qaExpired=true;await check('STANDARD');state.qaExpired=false;state.qa=null;
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
 console.log('PASS Crownlight Chart Tiers: Free / reversible scoped Advanced & Professional chart QA / expired / revoked / Founding 14/30/60 / reversed / public-launch / restricted / guest');
}finally{globalThis.fetch=original}
