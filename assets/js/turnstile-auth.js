/* v0.14.0.38: SINGLE authentication challenge owner. Supabase Auth verifies token.
   Distinguish a challenge and its status text; never mount two widgets on one form. */
(()=>{'use strict';
  if (window.__guAuthTurnstileBooted) return;
  window.__guAuthTurnstileBooted=true;
  const path=location.pathname.toLowerCase();
  const signin=/^\/(signin|login)(?:\.html)?$/.test(path);
  const signup=/^\/create-account(?:\.html)?$/.test(path);
  if(!signin&&!signup)return;
  const action=signin?'auth_signin':'auth_signup';
  let token='',widget=null,enabled=false,clientPatched=false;
  const form=()=>document.querySelector('.auth-card form')||document.querySelector('form');
  const button=()=>form()?.querySelector('button[type="submit"],button.auth-submit');
  const lock=on=>{const b=button();if(b){b.disabled=on;b.setAttribute('aria-busy',on?'true':'false')}};
  function note(message){let n=document.getElementById('v135-auth-captcha-status');if(!n){n=document.createElement('p');n.id='v135-auth-captcha-status';n.className='small';n.setAttribute('role','status');form()?.append(n)}if(n)n.textContent=message;}
  const getToken=()=>{if(enabled&&!token)throw Error('Complete human verification before continuing.');return token||undefined};
  const reset=()=>{token='';if(widget!==null&&window.turnstile?.reset)window.turnstile.reset(widget);if(enabled)lock(true)};
  // A single shared API for native email/password and the server-side username gateway.
  window.GroundUpTurnstile={getToken,reset,get required(){return enabled}};
  async function start(){
    lock(true);
    try{
      const response=await fetch('/api/auth-guard-v0135',{cache:'no-store'});
      const config=await response.json();
      if(!response.ok||!config.ok)throw Error('Verification settings unavailable.');
      enabled=config.enabled===true;
      if(!enabled){lock(false);return}
      if(!/^[-_A-Za-z0-9]{8,100}$/.test(config.sitekey||''))throw Error('Human verification not configured.');
      const f=form();if(!f)throw Error('Sign-in form missing.');
      // Existing CAPTCHA markup may come from a previous frontend integration.
      // Do not render a second challenge; fail closed and surface a repair message.
      const external=f.querySelector('.cf-turnstile:not(#v135-turnstile), .h-captcha, [data-other-captcha]');
      if(external)throw Error('More than one verification integration was detected. Remove the old widget.');
      let mount=f.querySelector('#v135-turnstile');
      if(!mount){mount=document.createElement('div');mount.id='v135-turnstile';mount.dataset.guSingleCaptcha='1';f.append(mount)}
      // Never inject the Cloudflare loader repeatedly. Explicit rendering does not implicitly create widgets.
      if(!window.turnstile){await new Promise((resolve,reject)=>{
        let script=document.querySelector('script[data-gu-turnstile-sdk]');
        if(!script){script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.dataset.guTurnstileSdk='1';script.async=true;document.head.append(script)}
        const wait=()=>window.turnstile?resolve():reject(Error('Human verification could not initialize.'));
        if(window.turnstile)resolve();else{script.addEventListener('load',wait,{once:true});script.addEventListener('error',()=>reject(Error('Human verification is unavailable.')),{once:true});setTimeout(()=>{if(!window.turnstile)reject(Error('Human verification timed out.'))},12000)}
      })}
      if(mount.dataset.guWidgetMounted==='1')return;
      mount.dataset.guWidgetMounted='1';
      widget=window.turnstile.render(mount,{sitekey:config.sitekey,action,theme:'auto',appearance:'interaction-only',
        callback:t=>{token=t;lock(!clientPatched);note('Human verification complete.')},
        'expired-callback':()=>{token='';lock(true);note('Verification expired; please try again.')},
        'error-callback':()=>{token='';lock(true);note('Verification failed; please retry.')}});
      // Patch the already-instantiated Supabase Auth object once; no duplicate token redemption.
      const sb=await window.getSupabaseClient();
      if(!sb?.auth)throw Error('Account service unavailable.');
      if(!sb.auth.__guCaptchaPatched){
        for(const method of ['signUp','signInWithPassword','resetPasswordForEmail']){
          const original=sb.auth[method]?.bind(sb.auth);if(!original)continue;
          sb.auth[method]=async function(first,second){const t=getToken();try{
            if(method==='resetPasswordForEmail')return await original(first,{...(second||{}),captchaToken:t});
            return await original({...first,options:{...(first.options||{}),captchaToken:t}});
          }finally{reset()}};
        }
        sb.auth.__guCaptchaPatched=true;
      }
      clientPatched=true;if(token)lock(false);else note('Complete the human verification to sign in.');
    }catch(e){lock(true);note(e.message||'Human verification unavailable.');}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
