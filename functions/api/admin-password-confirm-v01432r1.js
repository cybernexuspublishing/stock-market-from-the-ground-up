import {effectiveCaptchaEnabled} from '../_lib/auth-captcha-state-v1.js';
/* v0.14.0.32-R1 — Owner/Admin password reconfirmation, no MFA or reusable code.
 * The password is verified by Supabase Auth, never stored, logged or returned.
 * Bot challenge is consumed by Supabase Auth (single-use Turnstile token).
 */
const j=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, private','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
function setup(env){const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');if(!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(base)||!env.SUPABASE_PUBLISHABLE_KEY||!env.SUPABASE_SECRET_KEY)throw Error('Password confirmation requires configured Supabase Auth CAPTCHA and server credentials.');return {base,publicKey:env.SUPABASE_PUBLISHABLE_KEY,serviceKey:env.SUPABASE_SECRET_KEY};}
async function call(url,options){const res=await fetch(url,{...options,cache:'no-store'});const data=await res.json().catch(()=>({}));return {ok:res.ok,status:res.status,data};}
function payload(jwt){try{const b64=jwt.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(b64));}catch{return{}}}
function uuid(v){return typeof v==='string'&&/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(v)}
export async function onRequestPost({request,env}){
 const ownOrigin=new URL(request.url).origin,origin=request.headers.get('origin');
 if(origin!==ownOrigin)return j({ok:false,error:'Same-origin verification required.'},403);
 if(Number(request.headers.get('content-length')||0)>9000)return j({ok:false,error:'Invalid request.'},413);
 const jwt=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!jwt)return j({ok:false,error:'Sign in required.'},401);
 let body;
 try{body=await request.json()}catch{return j({ok:false,error:'Invalid request.'},400)}
 const password=body?.password,token=body?.captchaToken;
 const captchaEnabled=await effectiveCaptchaEnabled(env);
 if(typeof password!=='string'||password.length<1||password.length>1024||(captchaEnabled&&(typeof token!=='string'||token.length<10||token.length>2048)))return j({ok:false,error:'Password and human verification are required.'},400);
 let cfg;try{cfg=setup(env)}catch{return j({ok:false,error:'Sensitive-action verification is not configured.'},503)}
 try{
  // JWT's session ID is trusted only AFTER GoTrue validates the exact bearer.
  const user=await call(cfg.base+'/auth/v1/user',{headers:{apikey:cfg.publicKey,authorization:'Bearer '+jwt}});
  const claim=payload(jwt);
  if(!user.ok||!uuid(user.data?.id)||user.data.id!==claim.sub||!uuid(claim.session_id)||typeof user.data.email!=='string')return j({ok:false,error:'Current session unavailable.'},401);
  const auth={apikey:cfg.publicKey,authorization:'Bearer '+jwt,'content-type':'application/json'};
  const staff=await call(cfg.base+'/rest/v1/rpc/gu_staff_role_v01432r1',{method:'POST',headers:auth,body:'{}'});
  if(!staff.ok||!staff.data?.ok||!['OWNER','ADMIN'].includes(staff.data.role))return j({ok:false,error:'Authorized OWNER or ADMIN account required.'},403);
  const serviceHeaders={apikey:cfg.serviceKey,authorization:'Bearer '+cfg.serviceKey,'content-type':'application/json'};
  const params=JSON.stringify({p_user:claim.sub});
  const status=await call(cfg.base+'/rest/v1/rpc/gu_staff_stepup_rate_status_v01432r1',{method:'POST',headers:serviceHeaders,body:params});
  if(!status.ok)return j({ok:false,error:'Verification service unavailable.'},503);
  if(status.data?.blocked)return j({ok:false,error:'Too many attempts. Retry in 15 minutes.'},429);
  // Turnstile token is consumed precisely once by Supabase Auth; do not call
  // Cloudflare Siteverify first (that would make this CAPTCHA token invalid).
  const confirmed=await call(cfg.base+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:cfg.publicKey,'content-type':'application/json'},body:JSON.stringify({email:user.data.email,password,...(captchaEnabled?{gotrue_meta_security:{captcha_token:token}}:{})})});
  let valid=confirmed.ok&&confirmed.data?.user?.id===claim.sub&&!!confirmed.data?.access_token;
  // GoTrue password grant creates a new short-lived sign-in session. Destroy
  // that disposable session immediately; never leave untracked sessions behind.
  if(confirmed.ok&&confirmed.data?.access_token){
    const revoked=await call(cfg.base+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:cfg.publicKey,authorization:'Bearer '+confirmed.data.access_token}});
    if(!revoked.ok)valid=false;
  }
  const write=await call(cfg.base+'/rest/v1/rpc/gu_staff_stepup_attempt_v01432r1',{method:'POST',headers:serviceHeaders,body:JSON.stringify({p_user:claim.sub,p_session:claim.session_id,p_password_ok:valid})});
  if(!write.ok)return j({ok:false,error:'Verification service unavailable.'},503);
  if(write.data?.blocked)return j({ok:false,error:'Too many attempts. Retry in 15 minutes.'},429);
  if(!valid||write.data?.ok!==true)return j({ok:false,error:'Password or human verification unsuccessful.'},403);
  return j({ok:true,expiresInSeconds:300});
 }catch{return j({ok:false,error:'Verification service temporarily unavailable.'},503)}
}
export async function onRequestGet(){return j({ok:false,error:'POST required.'},405)}
