/* Additive CAPTCHA adapter: preserves existing email/username sign-in, signup, book key,
 * password reset and post-signin navigation. Requires Supabase Auth CAPTCHA to be
 * enabled separately. Tokens are never persisted in localStorage. */
(()=>{'use strict';
 const path=location.pathname.toLowerCase(),signup=path.endsWith('/create-account.html')||path==='/create-account',signin=path.endsWith('/signin.html')||path==='/signin';
 if(!signup&&!signin)return;
 const action=signin?'auth_signin':'auth_signup';let enabled=false,ready=false,patched=false,token='',widget=null,sitekey='';
 const allButtons=()=>[...document.querySelectorAll('button[type="submit"],button.auth-submit')];
 const lock=state=>allButtons().forEach(b=>{b.disabled=state;b.setAttribute('aria-busy',state?'true':'false')});
 function status(t){let p=document.getElementById('v135-auth-captcha-status');if(!p){p=document.createElement('p');p.id='v135-auth-captcha-status';p.className='small';p.setAttribute('role','status');const f=document.querySelector('.auth-card form')||document.querySelector('form');f?.append(p)}if(p)p.textContent=t}
 function reset(){token='';if(widget!==null&&window.turnstile?.reset)window.turnstile.reset(widget);if(enabled)lock(true)}
 function get(){if(enabled&&!token)throw Error('Complete human verification before continuing.');return token||undefined}
 async function initialize(){lock(true);try{
  const r=await fetch('/api/auth-guard-v0135',{cache:'no-store'}),d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'Verification configuration unavailable.');enabled=!!d.enabled;sitekey=d.sitekey||'';
  window.GroundUpTurnstile={getToken:get,reset,required:enabled};
  if(!enabled){ready=true;lock(false);return}
  const f=document.querySelector('.auth-card form')||document.querySelector('form');if(!f)throw Error('Account form is unavailable.');
  const mount=document.createElement('div');mount.id='v135-turnstile';f.append(mount);status('Human verification is required for this account action.');
  await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.onload=resolve;script.onerror=()=>reject(new Error('Unable to load human verification.'));document.head.append(script)});
  widget=window.turnstile.render(mount,{sitekey,action,theme:'auto',callback:value=>{token=value;ready=true;if(patched)lock(false);status('Human verification complete.')},'expired-callback':()=>{token='';lock(true);status('Verification expired. Complete it again.')},'error-callback':()=>{token='';lock(true);status('Verification failed. Try again.')}});
  // The password-reset button is separate from the login form and consumes the same token.
  // Supabase Auth performs final CAPTCHA verification for all native Auth calls.
  const sb=await window.getSupabaseClient();
  const originalSignUp=sb.auth.signUp.bind(sb.auth),originalSignIn=sb.auth.signInWithPassword.bind(sb.auth),originalReset=sb.auth.resetPasswordForEmail.bind(sb.auth);
  sb.auth.signUp=async credentials=>{const t=get();try{return await originalSignUp({...credentials,options:{...(credentials.options||{}),captchaToken:t}})}finally{reset()}};
  sb.auth.signInWithPassword=async credentials=>{const t=get();try{return await originalSignIn({...credentials,options:{...(credentials.options||{}),captchaToken:t}})}finally{reset()}};
  sb.auth.resetPasswordForEmail=async (email,options={})=>{const t=get();try{return await originalReset(email,{...options,captchaToken:t})}finally{reset()}};
  patched=true;if(token)lock(false);
 }catch(e){ready=false;lock(true);status('Human verification unavailable: '+e.message+' Contact support if this persists.')}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);else initialize();
})();
