/* Crownlight continuous-workspace presentation flag.
 * No trading access, premium chart privileges, or data entitlements are granted here.
 * Only a real active OWNER may preview an unpublished layout.
 */
import {toolAccess} from './member-tool-access.js';
const KEY='feature.crownlight_continuous_workspace_v1';
const output=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',
 'x-content-type-options':'nosniff'}});
export async function onRequestGet({request,env}){
 try{
  const access=await toolAccess(env,request,'MARKET_SIMULATOR');
  if(access.freeEligible!==true)return output({ok:false,error:'Member account unavailable'},403);
  const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),secret=String(env.SUPABASE_SECRET_KEY||'');
  if(!base||!secret)throw Error('Missing private config');
  const headers={apikey:secret,accept:'application/json'};
  if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))
   headers.authorization='Bearer '+secret;
  const uid=encodeURIComponent(access.userId);
  const [sr,rr]=await Promise.all([
   fetch(base+'/rest/v1/site_settings?select=value&setting_key=eq.'+encodeURIComponent(KEY)+'&limit=1',{headers,cache:'no-store'}),
   fetch(base+'/rest/v1/admin_user_roles?select=role_code,expires_at&role_code=eq.OWNER&user_id=eq.'+uid+'&limit=10',{headers,cache:'no-store'})
  ]);
  if(!sr.ok||!rr.ok)throw Error('Configuration lookup unavailable');
  const settings=await sr.json(),roles=await rr.json();
  if(!Array.isArray(settings)||!Array.isArray(roles))throw Error('Invalid settings response');
  const enabled=settings[0]?.value?.enabled===true;
  const owner=roles.some(r=>r.role_code==='OWNER'&&
   (r.expires_at==null||(Number.isFinite(Date.parse(r.expires_at))&&Date.parse(r.expires_at)>Date.now())));
  const requested=new URL(request.url).searchParams.get('workspace');
  const useContinuous=(enabled&&!(owner&&requested==='classic'))||(owner&&requested==='continuous');
  return output({ok:true,mode:useContinuous?'continuous':'classic',enabled,ownerPreview:owner,
   preview:owner&&!enabled&&useContinuous});
 }catch(err){return output({ok:false,error:err?.status===401?'Sign in required':'Workspace presentation could not be verified'},err?.status===401?401:503)}
}
