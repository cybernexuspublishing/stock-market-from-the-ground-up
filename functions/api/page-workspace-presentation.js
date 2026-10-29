/* Public page presentation, with authenticated OWNER-only unpublished preview.
 * Does not grant any premium tools or bypass membership/data permissions.
 */
import {toolAccess} from './member-tool-access.js';
const KEY='feature.crownlight_continuous_workspace_v1';
const PAGES=new Set(["simulator.html","dashboard.html","labs.html","learn.html","market-tutor.html","journal.html","bootcamp-academy.html","my-library.html","account.html","market-commons.html","forum.html","skills.html","membership.html","store.html","index.html"]);
const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
export async function onRequestGet({request,env}){
 const u=new URL(request.url),page=u.searchParams.get('page')||'';
 if(!PAGES.has(page))return send({ok:false,error:'Unsupported page'},400);
 try{
  const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),secret=String(env.SUPABASE_SECRET_KEY||'');
  if(!base||!secret)throw Error('Missing private configuration');
  const headers={apikey:secret,accept:'application/json'};
  if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))
   headers.authorization='Bearer '+secret;
  const settingsResponse=await fetch(base+'/rest/v1/site_settings?select=value&setting_key=eq.'+encodeURIComponent(KEY)+'&limit=1',{headers,cache:'no-store'});
  if(!settingsResponse.ok)throw Error('Setting unavailable');
  const settings=await settingsResponse.json();
  if(!Array.isArray(settings))throw Error('Invalid setting');
  const setting=settings[0]?.value||{};
  const enabled=setting.enabled===true;
  const selected=(Array.isArray(setting.pages)?setting.pages:['simulator.html']).filter(p=>PAGES.has(p));
  // Per-page preset. Older saved settings without a style map retain Continuous.
  const PRESETS=new Set(['classic','continuous','focus','compact','spacious','list','table']);
  const savedRaw=setting.styles&&typeof setting.styles==='object'&&!Array.isArray(setting.styles)?setting.styles[page]:null;
  const savedStyle=PRESETS.has(savedRaw)?savedRaw:'continuous';
  const published=enabled&&selected.includes(page)&&savedStyle!=='classic';
  let owner=false;
  if(/^Bearer\s+\S+$/i.test(request.headers.get('authorization')||'')){
   try{
    const actor=await toolAccess(env,request,'MARKET_SIMULATOR');
    if(actor.freeEligible===true){
     const rolesResponse=await fetch(base+'/rest/v1/admin_user_roles?select=role_code,expires_at&role_code=eq.OWNER&user_id=eq.'+
      encodeURIComponent(actor.userId)+'&limit=10',{headers,cache:'no-store'});
     if(!rolesResponse.ok)throw Error('Role verification unavailable');
     const roles=await rolesResponse.json();
     owner=Array.isArray(roles)&&roles.some(r=>r.role_code==='OWNER'&&
      (r.expires_at==null||(Number.isFinite(Date.parse(r.expires_at))&&Date.parse(r.expires_at)>Date.now())));
    }
   }catch{owner=false}
  }
  const requested=u.searchParams.get('workspace');
  // Query strings are never entitlements. Only a verified OWNER can preview
  // an unpublished style or override a published choice to compare Classic.
  const mode=owner&&PRESETS.has(requested)?requested:(published?savedStyle:'classic');
  return send({ok:true,page,mode,savedStyle,published,ownerPreview:owner,
   preview:owner&&mode!=='classic'&&(!published||mode!==savedStyle)});
 }catch{return send({ok:false,error:'Page presentation unavailable'},503)}
}
