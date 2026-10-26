/* Username/password sign-in; account enumeration protected and CAPTCHA never bypassed.
 * Registered usernames only contain letters/digits/underscores. A human-typed
 * hyphen is treated as an underscore so legacy "James-Test" identifies James_Test.
 * This alias maps to the existing account, never creates a new one.
 */
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
export const normalizeLoginUsername=v=>String(v||'').trim().toLowerCase().replace(/-/g,'_');
const INVALID='Invalid login credentials.';
const CAPTCHA_UNAVAILABLE='Human verification is not working. Please contact support; your password has not been verified.';
const CAPTCHA_RETRY='Human verification failed. Please start a new verification challenge and try again.';
const credHeaders=secret=>({apikey:secret,...(String(secret).startsWith('sb_secret_')?{}:{authorization:'Bearer '+secret}),accept:'application/json'});
export async function onRequestPost({request,env}){
 const url=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const pub=env.SUPABASE_PUBLISHABLE_KEY,secret=env.SUPABASE_SECRET_KEY;
 if(!url||!pub||!secret)return json({error:'Sign-in service unavailable.'},503);
 const body=await request.json().catch(()=>null);
 if(!body||JSON.stringify(body).length>5500)return json({error:'Invalid request.'},400);
 const username=normalizeLoginUsername(body.username),password=String(body.password||''),
  captchaToken=String(body.captchaToken||'');
 if(!/^[a-z][a-z0-9_]{2,23}$/.test(username)||!password||password.length>512)
  return json({error:INVALID},401);
 if(env.ENFORCE_AUTH_TURNSTILE_V135==='true'&&
  (!env.TURNSTILE_SITE_KEY||!env.TURNSTILE_SECRET_KEY||!captchaToken||captchaToken.length>2048))
  return json({error:'Human verification required or unavailable.'},403);
 const h=credHeaders(secret);
 try{
  const profileUrl=new URL(url+'/rest/v1/profiles');
  profileUrl.searchParams.set('username','ilike.'+username);
  profileUrl.searchParams.set('select','id,username');
  profileUrl.searchParams.set('limit','20');
  const pr=await fetch(profileUrl,{headers:h,cache:'no-store'});
  if(!pr.ok)return json({error:pr.status>=500?'Sign-in service temporarily unavailable.':INVALID},
   pr.status>=500?503:401);
  const rows=await pr.json();
  // PostgREST ilike treats underscore as a wildcard. Require a literal,
  // case-insensitive match before retrieving the associated auth account.
  const uid=Array.isArray(rows)?rows.find(r=>String(r.username||'').toLowerCase()===username)?.id:null;
  if(!uid)return json({error:INVALID},401);
  const ur=await fetch(url+'/auth/v1/admin/users/'+encodeURIComponent(uid),{headers:h,cache:'no-store'});
  if(!ur.ok)return json({error:ur.status>=500?'Sign-in service temporarily unavailable.':INVALID},
   ur.status>=500?503:401);
  const email=(await ur.json())?.email;
  if(!email)return json({error:INVALID},401);
  // Supabase Auth owns token verification. Never pre-consume the Turnstile token
  // with Cloudflare Siteverify, and never retry without the CAPTCHA.
  const tr=await fetch(url+'/auth/v1/token?grant_type=password',{
   method:'POST',headers:{apikey:pub,'content-type':'application/json',accept:'application/json'},
   body:JSON.stringify({email,password,...(captchaToken?
    {gotrue_meta_security:{captcha_token:captchaToken}}:{})}),cache:'no-store'});
  if(!tr.ok){
   const e=await tr.json().catch(()=>({}));
   const msg=String(e.msg||e.message||e.error_description||'');
   if(e.error_code==='captcha_failed'||e.code==='captcha_failed'){
    const misconfigured=/invalid-input-secret|missing-input-secret/i.test(msg);
    return json({error:misconfigured?CAPTCHA_UNAVAILABLE:CAPTCHA_RETRY},misconfigured?503:403);
   }
   return json({error:INVALID},401);
  }
  const t=await tr.json();
  if(!t.access_token||!t.refresh_token)return json({error:'Sign-in service temporarily unavailable.'},503);
  return json({access_token:t.access_token,refresh_token:t.refresh_token,
   expires_in:t.expires_in,token_type:t.token_type});
 }catch{return json({error:'Sign-in service temporarily unavailable.'},503)}
}
