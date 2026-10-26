/* v0.14.0.38: no mandatory MFA redirect. Single, server-verified CAPTCHA. */
function signinMessage(text,type=''){const el=document.getElementById('signin-message');if(el){el.className=`inline-status ${type}`;el.textContent=text||''}}
/* A Pages deployment hash is a preview hostname, not the hostname approved
 * on the Yahoo production Turnstile widget. Redirect login BEFORE attempting
 * a single-use CAPTCHA on a host the widget has not authorized. */
function canonicalYahooSignin(){
 const canonical='stock-market-from-the-ground-up-d1r.pages.dev';
 const host=String(location.hostname||'').toLowerCase();
 if(host.endsWith('.'+canonical)){
  location.replace('https://'+canonical+location.pathname+location.search+location.hash);
  return true;
 }
 return false;
}
function signinAuthError(err){
 const code=String(err?.code||err?.error_code||'').toLowerCase();
 const raw=String(err?.message||'');
 if(code==='captcha_failed'||/captcha protection: request disallowed/i.test(raw)){
  if(/invalid-input-secret|missing-input-secret/i.test(raw))
   return 'Human verification is not correctly configured with the authentication service. Your password has not been checked. Please contact support.';
  return 'Human verification was not accepted. Select Start human verification, finish a new challenge, and try again. Your password may not have been checked.';
 }
 return raw||'Unable to sign in.';
}
function nextDestination(){const original=new URLSearchParams(location.search).get('next'),fallback='/dashboard.html';if(!original||original.length>2048||!original.startsWith('/')||original.startsWith('//')||/[\\\u0000-\u001f\u007f]/.test(original)||/^\/(?:%2f|%5c)/i.test(original))return fallback;try{const target=new URL(original,location.origin);if(target.origin!==location.origin)return fallback;if(['/signin','/signin.html','/create-account','/create-account.html','/update-password','/update-password.html'].includes(target.pathname.toLowerCase()))return fallback;return target.pathname+target.search+target.hash}catch{return fallback}}
async function doSignIn(e){e?.preventDefault();if(canonicalYahooSignin())return;signinMessage('Signing in…');const identifier=document.getElementById('login-identifier')?.value.trim()||'',password=document.getElementById('login-password')?.value||'';
 if(!identifier||!password)return signinMessage('Enter your email or username and password.','error');
 try{const sb=await window.getSupabaseClient();if(!sb)throw Error('Account service unavailable.');
  // A single token is consumed once by either Supabase Auth or username-login, not both.
  if(identifier.includes('@')){const {error}=await sb.auth.signInWithPassword({email:identifier,password});if(error)throw error}
  else{const captcha=window.GroundUpTurnstile?.getToken?.();const res=await fetch('/api/username-login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:identifier,password,captchaToken:captcha||''}),cache:'no-store'});window.GroundUpTurnstile?.reset?.();const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||'Invalid login credentials.');const {error}=await sb.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token});if(error)throw error}
  window.SiteSession?.startSessionClock();location.assign(nextDestination());
 }catch(err){signinMessage(signinAuthError(err),'error');window.GroundUpTurnstile?.reset?.()}}
async function sendPasswordReset(){const email=document.getElementById('reset-email')?.value.trim(),msg=document.getElementById('reset-message');if(!email){if(msg)msg.textContent='Enter your account email.';return}try{const sb=await window.getSupabaseClient(),{error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/update-password.html`});if(msg)msg.textContent=error?error.message:'If this address is registered, a password-reset email will be sent.'}catch(e){if(msg)msg.textContent=e.message}}
document.addEventListener('DOMContentLoaded',async()=>{if(canonicalYahooSignin())return;const p=new URLSearchParams(location.search);if(p.get('expired'))signinMessage('Your session timed out. Sign in again to continue.','error');try{const sb=await window.getSupabaseClient(),{data:{user}}=await sb.auth.getUser();if(user)location.replace(nextDestination())}catch{}});
