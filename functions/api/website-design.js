/* Website design: public read, Owner-only atomic activation. No Stripe changes. */
import {memberIdentity} from './member-tool-access.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const reply=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:H});
function config(env){const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');const secret=String(env.SUPABASE_SECRET_KEY||'');if(!/^https:\/\/[^/]+$/.test(base)||!secret)throw Object.assign(Error('Design service unavailable'),{status:503});const headers={apikey:secret,accept:'application/json','content-type':'application/json'};if(/^eyJ[^.]+\.eyJ[^.]+\.[^.]+$/.test(secret))headers.authorization='Bearer '+secret;return {base,headers}}
async function db(env,path,opt={}){const c=config(env);const r=await fetch(c.base+'/rest/v1/'+path,{method:opt.method||'GET',headers:c.headers,body:opt.data===undefined?undefined:JSON.stringify(opt.data),cache:'no-store'});if(!r.ok)throw Object.assign(Error('Design change was not confirmed'),{status:r.status===409?409:503});return r.json()}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))return reply({ok:false,error:'Method not allowed'},405);
  if(request.method==='GET'){
   const rows=await db(env,'site_settings?select=value&setting_key=eq.website_design_theme_v014168&public_read=is.true&limit=1');
   // Public image settings are separately validated; never return arbitrary
   // URLs from administrator-authored JSON or expose private storage objects.
   let background={enabled:false};
   try{
    const b=await db(env,'site_settings?select=value&setting_key=eq.website_background_v1&public_read=is.true&limit=1');
    const v=b?.[0]?.value||{},path=String(v.path||'');
    if(v.enabled===true&&/^[a-f0-9-]{36}\/SITE_BACKGROUND\/[a-z0-9_-]{10,60}\.(?:jpg|jpeg|png|webp)$/.test(path)){
     const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
     background={enabled:true,imageUrl:base+'/storage/v1/object/public/gu-store-photos/'+path.split('/').map(encodeURIComponent).join('/'),
      overlay:Number.isFinite(v.overlay)?Math.max(.35,Math.min(.92,v.overlay)):.76,
      position:['center','top','bottom'].includes(v.position)?v.position:'center'};
    }
   }catch{/* The standard theme remains usable while background service is unavailable. */}
   return reply({ok:true,design:rows?.[0]?.value||{theme:'premium-dark',revision:1},background});
  }
  const origin=request.headers.get('origin');
  if(!origin||new URL(origin).origin!==new URL(request.url).origin)return reply({ok:false,error:'Invalid request origin'},403);
  const {userId}=await memberIdentity(env,request);
  const [profile,roles,flags]=await Promise.all([
   db(env,'profiles?select=account_kind&id=eq.'+encodeURIComponent(userId)+'&limit=1'),
   db(env,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(userId)),
   db(env,'admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(userId)+'&limit=1')]);
  if(profile?.length!==1||!Array.isArray(roles)||!Array.isArray(flags)||
   ['test','showcase'].includes(profile[0].account_kind)||
   !roles.some(x=>x.role_code==='OWNER'&&(!x.expires_at||Date.parse(x.expires_at)>Date.now()))||
   ['suspended','restricted'].includes(String(flags?.[0]?.status||'').toLowerCase()))
   return reply({ok:false,error:'Owner access required'},403);
  const raw=await request.text();if(raw.length>512)return reply({ok:false,error:'Request too large'},413);
  let body;try{body=JSON.parse(raw)}catch{return reply({ok:false,error:'Invalid JSON'},400)}
  if(!['premium-dark','premium-light'].includes(body?.theme)||!Number.isInteger(body?.expectedRevision))
   return reply({ok:false,error:'Invalid theme or revision'},400);
  const updated=await db(env,'rpc/gu_activate_website_design_v014168',{method:'POST',data:{
   p_actor:userId,p_theme:body.theme,p_expected_revision:body.expectedRevision
  }});
  return reply({ok:true,design:updated});
 }catch(e){
  // Do not expose provider errors, internal table names, or authorization details.
  const status=[400,403,405,409,413].includes(e?.status)?e.status:503;
  const message=status===409?'Website design changed; refresh before retrying.':
   status===403?'Owner access required.':
   status===413?'Request too large.':
   'Website design service is temporarily unavailable. No change confirmed.';
  return reply({ok:false,error:message},status);
 }
}
