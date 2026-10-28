/* Crownlight chart-tier access V1. A signed-in member's verified paid-cycle or
 * plan grant determines premium chart engine access. Never trust client labels.
 * No additional entitlement to books, paid Labs, market data or paper accounts.
 */
import {toolAccess} from './member-tool-access.js';
import {foundingOfferState} from '../_lib/founder-offer-gate-v1.js';
const rank={STANDARD:0,ADVANCED:1,PROFESSIONAL:2};
const QA_BATCH='SMFGU-MEMBERSHIP-9-20261027',CHART_BATCH='SMFGU-CHART-3-20261028';
const QA_PLANS={FREE:['STANDARD','free'],FOUNDING_30:['ADVANCED','founding-30'],FOUNDING_60:['PROFESSIONAL','founding-60']};
const tierOf={FOUNDING_14:'STANDARD',FOUNDING_30:'ADVANCED',FOUNDING_60:'PROFESSIONAL',
 FULL_MONTHLY:'PROFESSIONAL',FULL_ANNUAL:'PROFESSIONAL',LIFETIME:'PROFESSIONAL'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'
}});
function cfg(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const secret=String(env.SUPABASE_SECRET_KEY||'');
 if(!base||!secret)throw Error('Chart entitlement service unavailable');
 const headers={apikey:secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))headers.authorization='Bearer '+secret;
 return {base,headers};
}
async function rows(c,path){
 const r=await fetch(c.base+'/rest/v1/'+path,{headers:c.headers,cache:'no-store'});
 if(!r.ok)throw Error('Chart membership could not be verified');
 const data=await r.json();if(!Array.isArray(data))throw Error('Invalid membership response');return data;
}
async function verifiedNoncommercialChartTier(c,uid,now){
 // A real, email-confirmed Auth Admin-created QA identity is NOT a paid subscription.
 // App metadata is controlled by GoTrue Admin, never user_metadata or browser labels.
 try{
  const r=await fetch(c.base+'/auth/v1/admin/users/'+uid,{headers:c.headers,cache:'no-store'});
  if(!r.ok)return null;
  const response=await r.json();
  const user=response?.user||response,meta=user?.app_metadata||{};
  const plan=String(meta.qa_target_plan||''),spec=QA_PLANS[plan];
  if(!spec||meta.smfgu_qa_only!==true||meta.noncommercial!==true||
     meta.qa_batch!==QA_BATCH||meta.qa_chart_batch!==CHART_BATCH||
     meta.qa_chart_tier!==spec[0]||user?.id!==decodeURIComponent(uid)||
     user?.email!=='stockmarketfromthegroundup+test-'+spec[1]+'-20261027@gmail.com'||
     !user.email_confirmed_at||user.deleted_at)return null;
  const until=Date.parse(meta.qa_chart_expires_at||'');
  if(!Number.isFinite(until)||until<=now||until-now>14*86400000+300000)return null;
  return {tier:spec[0],expiresAt:new Date(until).toISOString()};
 }catch{return null}
}
export async function crownlightChartEntitlement(env,request){
 const free=await toolAccess(env,request,'MARKET_SIMULATOR');
 if(free.freeEligible!==true)return {ok:true,eligible:false,tier:null,allowed:[]};
 const uid=encodeURIComponent(free.userId),now=Date.now(),c=cfg(env);
 const [founder,cycles,grants,launch,chartQA,chartPasses]=await Promise.all([
  rows(c,'gu_founder_members_v014173?select=revoked_at&user_id=eq.'+uid+'&limit=1'),
  rows(c,'gu_founder_paid_cycles_v014173?select=plan_code,billing_start,billing_end,reversed_at&user_id=eq.'+uid+'&limit=100'),
  rows(c,'user_plan_grants?select=plan_code,status,starts_at,ends_at&user_id=eq.'+uid+'&limit=100'),
  foundingOfferState(env),
  // Independent, time-limited chart access; never treated as a paid plan.
  rows(c,'crownlight_chart_qa_grants_v1?select=tier,scope,starts_at,ends_at,revoked_at&user_id=eq.'+uid+'&limit=2'),
  rows(c,'gu_sparks_chart_passes_v1?select=tier,expires_at&user_id=eq.'+uid+'&limit=2')
 ]);
 let tier='STANDARD',reason='Free Membership',temporaryAccess=null;
 const consider=(plan,label)=>{const t=tierOf[plan];if(t&&rank[t]>rank[tier]){tier=t;reason=label}};
 if(founder.length===1&&founder[0].revoked_at==null){
  for(const x of cycles){
   const start=Date.parse(x.billing_start),end=Date.parse(x.billing_end);
   if(['FOUNDING_14','FOUNDING_30','FOUNDING_60'].includes(x.plan_code)&&x.reversed_at==null&&
      Number.isFinite(start)&&start<=now&&Number.isFinite(end)&&end>now)
    consider(x.plan_code,'Verified active '+x.plan_code+' paid term');
  }
 }
 if(launch.publicLaunch){
  for(const g of grants){
   const start=g.starts_at?Date.parse(g.starts_at):0,end=g.ends_at?Date.parse(g.ends_at):Infinity;
   if(g.status==='active'&&Number.isFinite(start)&&start<=now&&end>now&&
      ['FULL_MONTHLY','FULL_ANNUAL','LIFETIME'].includes(g.plan_code))
    consider(g.plan_code,'Active '+g.plan_code+' plan grant');
  }
 }
 for(const pass of chartPasses){
  const until=Date.parse(pass.expires_at);
  if(['ADVANCED','PROFESSIONAL'].includes(pass.tier)&&Number.isFinite(until)&&until>now&&rank[pass.tier]>rank[tier]){
   tier=pass.tier;reason='Active Crownlight Sparks Chart Studio pass';
   temporaryAccess={kind:'SPARKS',tier:pass.tier,expiresAt:new Date(until).toISOString()};
  }
 }
 // OWNER is a server-verified administrative role, not a purchased plan.
 // Allow professional chart UI inspection without altering commercial grants,
 // Sparks, data licensing, Lab access, or brokerage entitlements.
 const staffRows=await rows(c,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+uid+'&role_code=in.(OWNER,ADMIN,MODERATOR)&limit=20');
 const activeStaff=staffRows.filter(r=>['OWNER','ADMIN','MODERATOR'].includes(r.role_code)&&
  (r.expires_at==null||(Number.isFinite(Date.parse(r.expires_at))&&Date.parse(r.expires_at)>now)));
 const staffChartRole=['OWNER','ADMIN','MODERATOR'].find(role=>activeStaff.some(r=>r.role_code===role))||null;
 const ownerChartAccess=staffChartRole==='OWNER';
 const qa=await verifiedNoncommercialChartTier(c,uid,now);
 if(qa&&rank[qa.tier]>rank[tier]){tier=qa.tier;reason='Noncommercial Chart Studio QA — no paid membership or founder seat';temporaryAccess={kind:'QA',tier:qa.tier,expiresAt:qa.expiresAt};}
 else if(qa&&tier==='STANDARD')reason='Noncommercial Chart Studio Standard QA';
 // Scoped manual QA grants are service-role-only. They never unlock books,
 // Labs, trading data, Sparks, subscriptions, or Founder 600 benefits.
 const manuallyAuthorized=chartQA.length===1&&chartQA[0].scope==='CHART_STUDIO_ONLY'&&
  ['ADVANCED','PROFESSIONAL'].includes(chartQA[0].tier)&&
  chartQA[0].revoked_at===null&&
  Number.isFinite(Date.parse(chartQA[0].starts_at))&&Date.parse(chartQA[0].starts_at)<=now&&
  Number.isFinite(Date.parse(chartQA[0].ends_at))&&Date.parse(chartQA[0].ends_at)>now&&
  Date.parse(chartQA[0].ends_at)-Date.parse(chartQA[0].starts_at)<=14*86400000;
 if(manuallyAuthorized&&rank[chartQA[0].tier]>rank[tier]){
  tier=chartQA[0].tier;
  reason='Temporary noncommercial Chart Studio testing — chart-only';
  temporaryAccess={kind:'QA',tier:chartQA[0].tier,expiresAt:new Date(chartQA[0].ends_at).toISOString()};
 }
 if(staffChartRole){
  tier='PROFESSIONAL';reason='Verified '+staffChartRole+' — Chart Studio interfaces (noncommercial)';
  temporaryAccess=null;
 }
 return {ok:true,eligible:true,tier,reason,ownerChartAccess,staffChartRole,allowed:['STANDARD',...(rank[tier]>=1?['ADVANCED']:[]),
  ...(rank[tier]>=2?['PROFESSIONAL']:[])],
  advancedEngine:'KLineChart 10.1.0',professionalEngine:'Enhanced KLineChart 10.1.0',
  temporaryBetaAccess:!!qa||manuallyAuthorized,noncommercialChartQa:!!qa||manuallyAuthorized,
  temporaryAccess,
  sparksChartPasses:{enabled:true,source:'server-catalog'}};
}
export async function onRequestGet({request,env}){
 try{return json(await crownlightChartEntitlement(env,request))}
 catch(e){return json({ok:false,eligible:false,tier:null,allowed:[],error:e?.status===401?
  'Sign in required':'Chart access cannot be verified'},e?.status===401?401:503)}
}
