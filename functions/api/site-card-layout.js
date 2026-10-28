/* Crownlight Site Layout Studio: only presentation geometry, no auth or payment surfaces.
 * All writes require verified signed-in member session AND active Owner/Admin/Moderator role.
 */
import {memberIdentity} from './member-tool-access.js';
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const pageRe=/^[a-z0-9-]{1,64}$/,cardRe=/^[a-zA-Z0-9_:.-]{1,128}$/;
function cfg(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const secret=String(env.SUPABASE_SECRET_KEY||'');
 if(!base||!secret)throw Error('Layout service unavailable');
 return {base,headers:{apikey:secret,accept:'application/json',
  ...(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret)?{authorization:'Bearer '+secret}:{})}};
}
async function rest(env,path,opts={}){
 const c=cfg(env);
 const response=await fetch(c.base+'/rest/v1/'+path,{...opts,headers:{...c.headers,...opts.headers},cache:'no-store'});
 if(!response.ok)throw Error('Layout storage request failed');
 return response.status===204?[]:await response.json().catch(()=>[]);
}
async function editor(env,request){
 const actor=await memberIdentity(env,request);
 const [profiles,flags,roles]=await Promise.all([
  rest(env,'profiles?select=account_kind,deleted_at&id=eq.'+encodeURIComponent(actor.userId)+'&limit=1'),
  rest(env,'admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(actor.userId)+'&limit=20'),
  rest(env,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(actor.userId)+'&limit=50')
 ]);
 if(profiles.length!==1||profiles[0].account_kind!=='member'||profiles[0].deleted_at)return null;
 if(flags.some(x=>['suspended','restricted'].includes(String(x.status).toLowerCase())))return null;
 const now=Date.now();
 return roles.some(r=>['OWNER','ADMIN','MOD','MODERATOR'].includes(r.role_code)&&
  (!r.expires_at||Date.parse(r.expires_at)>now))?actor.userId:null;
}
export async function onRequest({request,env}){
 const url=new URL(request.url),page=url.searchParams.get('page')||'';
 if(!pageRe.test(page))return reply({ok:false,error:'Invalid page layout key.'},400);
 try{
  if(request.method==='GET'){
   const rows=await rest(env,'gu_site_card_layout_v1?select=card_key,width_pct,min_height_px,sort_index&page_key=eq.'+
    encodeURIComponent(page)+'&order=card_key.asc&limit=300');
   let canEdit=false;
   if(request.headers.has('authorization'))canEdit=Boolean(await editor(env,request).catch(()=>null));
   return reply({ok:true,page,canEdit,items:rows});
  }
  if(!['POST','DELETE'].includes(request.method))return reply({ok:false,error:'Method not allowed.'},405);
  if(request.headers.get('origin')!==url.origin)return reply({ok:false,error:'Origin mismatch.'},403);
  const userId=await editor(env,request);
  if(!userId)return reply({ok:false,error:'Active Owner/Admin/Moderator privilege required.'},403);
  const body=await request.json().catch(()=>null);
  const card=String(body?.cardKey||'');
  if(!cardRe.test(card))return reply({ok:false,error:'Invalid card key.'},400);
  const path='gu_site_card_layout_v1?page_key=eq.'+encodeURIComponent(page)+'&card_key=eq.'+encodeURIComponent(card);
  if(request.method==='DELETE'){
   await rest(env,path,{method:'DELETE',headers:{prefer:'return=minimal'}});
   return reply({ok:true,cardKey:card,reset:true});
  }
  if(Object.keys(body).some(k=>!['cardKey','widthPct','minHeightPx','sortIndex'].includes(k)))
   return reply({ok:false,error:'Unsupported card layout field.'},400);
  const nullable=(v,min,max)=>v===null||v===undefined?null:Number.isInteger(v)&&v>=min&&v<=max?v:NaN;
  const width=nullable(body.widthPct,30,100),height=nullable(body.minHeightPx,80,1200),order=nullable(body.sortIndex,0,300);
  if([width,height,order].some(x=>Number.isNaN(x)))return reply({ok:false,error:'Layout dimensions outside permitted limits.'},400);
  const payload={page_key:page,card_key:card,width_pct:width,min_height_px:height,
   sort_index:order,updated_by:userId,updated_at:new Date().toISOString()};
  await rest(env,'gu_site_card_layout_v1?on_conflict=page_key,card_key',{method:'POST',
   headers:{'content-type':'application/json',prefer:'resolution=merge-duplicates,return=minimal'},
   body:JSON.stringify(payload)});
  return reply({ok:true,cardKey:card,saved:true});
 }catch{return reply({ok:false,error:'Layout settings are unavailable.'},503)}
}
