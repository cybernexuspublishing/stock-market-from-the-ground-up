/* Crownlight chart-tier access V1. A signed-in member's verified paid-cycle or
 * plan grant determines premium chart engine access. Never trust client labels.
 * No additional entitlement to books, paid Labs, market data or paper accounts.
 */
import {toolAccess} from './member-tool-access.js';
import {foundingOfferState} from '../_lib/founder-offer-gate-v1.js';
const rank={STANDARD:0,ADVANCED:1,PROFESSIONAL:2};
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
export async function crownlightChartEntitlement(env,request){
 const free=await toolAccess(env,request,'MARKET_SIMULATOR');
 if(free.freeEligible!==true)return {ok:true,eligible:false,tier:null,allowed:[]};
 const uid=encodeURIComponent(free.userId),now=Date.now(),c=cfg(env);
 const [founder,cycles,grants,launch]=await Promise.all([
  rows(c,'gu_founder_members_v014173?select=revoked_at&user_id=eq.'+uid+'&limit=1'),
  rows(c,'gu_founder_paid_cycles_v014173?select=plan_code,billing_start,billing_end,reversed_at&user_id=eq.'+uid+'&limit=100'),
  rows(c,'user_plan_grants?select=plan_code,status,starts_at,ends_at&user_id=eq.'+uid+'&limit=100'),
  foundingOfferState(env)
 ]);
 let tier='STANDARD',reason='Free Membership';
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
 return {ok:true,eligible:true,tier,reason,allowed:['STANDARD',...(rank[tier]>=1?['ADVANCED']:[]),
  ...(rank[tier]>=2?['PROFESSIONAL']:[])],
  advancedEngine:'KLineChart 10.1.0',professionalEngine:'Enhanced KLineChart 10.1.0',
  temporaryBetaAccess:false};
}
export async function onRequestGet({request,env}){
 try{return json(await crownlightChartEntitlement(env,request))}
 catch(e){return json({ok:false,eligible:false,tier:null,allowed:[],error:e?.status===401?
  'Sign in required':'Chart access cannot be verified'},e?.status===401?401:503)}
}
