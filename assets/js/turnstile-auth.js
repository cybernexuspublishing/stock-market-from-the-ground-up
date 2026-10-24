/* v0.14.0.43 — ONE manually initiated authentication Turnstile.
 * - No automatic challenge on page load or silent automatic verification.
 * - A human must explicitly check "Start human verification" before the
 *   visible Cloudflare Managed widget is rendered and executed.
 * - Turnstile / Supabase still validate the resulting signed token. The
 *   checkbox alone never provides verification or server-side authority.
 * - Fail closed when CAPTCHA is configured but SDK/token fails.
 */
(()=>{'use strict';
  if(window.__guAuthTurnstileBooted)return;
  window.__guAuthTurnstileBooted=true;
  const path=location.pathname.toLowerCase();
  const signin=/^\/(signin|login)(?:\.html)?$/.test(path);
  const signup=/^\/create-account(?:\.html)?$/.test(path);
  if(!signin&&!signup)return;
  const action=signin?'auth_signin':'auth_signup';
  let token='',widget=null,enabled=false,clientPatched=false,initialized=false,checkbox=null,mount=null,busy=false;
  const form=()=>document.querySelector('.auth-card form')||document.querySelector('form');
  const button=()=>form()?.querySelector('button[type="submit"],button.auth-submit');
  const lock=on=>{const b=button();if(b){b.disabled=on;b.setAttribute('aria-busy',on?'true':'false')}};
  function note(message){
    let n=document.getElementById('v135-auth-captcha-status');
    if(!n){n=document.createElement('p');n.id='v135-auth-captcha-status';n.className='small';n.setAttribute('role','status');n.setAttribute('aria-live','polite');form()?.append(n)}
    if(n)n.textContent=message;
  }
  function getToken(){
    if(enabled&&(!initialized||!checkbox?.checked||!token))throw Error('Select Start human verification and complete the challenge before continuing.');
    return token||undefined;
  }
  function removeWidget(){
    if(widget!==null)try{window.turnstile?.remove(widget)}catch{}
    widget=null;if(mount)mount.replaceChildren();
    if(mount)mount.hidden=true;
  }
  function reset(){
    token='';busy=false;removeWidget();
    if(checkbox){checkbox.checked=false;checkbox.disabled=!initialized}
    if(enabled){lock(true);note('To try again, select Start human verification.')}
  }
  window.GroundUpTurnstile={getToken,reset,get required(){return enabled},get manuallyInitiated(){return !!checkbox?.checked}};
  async function loadSdk(){
    if(window.turnstile)return;
    await new Promise((resolve,reject)=>{
      let settled=false;
      const finish=err=>{if(settled)return;settled=true;clearInterval(poll);clearTimeout(timer);err?reject(err):resolve()};
      let script=document.querySelector('script[data-gu-turnstile-sdk]');
      if(!script){script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.dataset.guTurnstileSdk='1';script.async=true;document.head.append(script)}
      const poll=setInterval(()=>{if(window.turnstile)finish()},80);
      const timer=setTimeout(()=>finish(Error('Human verification could not load. Try refreshing the page.')),12000);
      script.addEventListener('error',()=>finish(Error('The verification service is temporarily unavailable.')),{once:true});
      if(window.turnstile)finish();
    });
  }
  function addManualControl(f){
    const old=f.querySelector('.cf-turnstile:not(#v135-turnstile), .h-captcha, [data-other-captcha]');
    if(old)throw Error('Duplicate human verification widget detected. Contact support.');
    const submit=button();
    if(!submit)throw Error('Cannot locate account submit control.');
    let box=f.querySelector('#v143-manual-human');
    if(!box){
      box=document.createElement('fieldset');box.id='v143-manual-human';box.className='gu-manual-human';
      const legend=document.createElement('legend');legend.textContent='Human verification';
      const label=document.createElement('label');label.className='gu-human-check';
      checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.id='v143-start-human';checkbox.disabled=true;
      checkbox.setAttribute('aria-describedby','v143-human-help');
      const labelText=document.createElement('span');labelText.textContent='Start human verification';
      label.append(checkbox,labelText);
      const help=document.createElement('p');help.id='v143-human-help';help.className='small';
      help.textContent='Select this checkbox to start the verification challenge. Verification will not run automatically.';
      mount=document.createElement('div');mount.id='v135-turnstile';mount.dataset.guSingleCaptcha='1';mount.hidden=true;
      box.append(legend,label,help,mount);
      // Sign-in keeps the primary button above verification; it stays
      // disabled until a successful server-verifiable challenge. Sign-up
      // retains its existing verification-before-submit sequence.
      if(signin)submit.after(box);else submit.before(box);
    }else{
      checkbox=box.querySelector('#v143-start-human');
      mount=box.querySelector('#v135-turnstile');
    }
    if(!checkbox||!mount)throw Error('Human verification interface is incomplete.');
    checkbox.addEventListener('change',()=>{
      token='';removeWidget();lock(true);
      if(!checkbox.checked){note('Select Start human verification to continue.');return;}
      if(!initialized||busy){checkbox.checked=false;return;}
      busy=true;mount.hidden=false;note('Starting verification. Follow any Cloudflare instructions shown below.');
      try{
        widget=window.turnstile.render(mount,{
          sitekey:window.__guTurnstileSitekey,action,theme:'auto',appearance:'always',execution:'execute',
          'refresh-expired':'manual','refresh-timeout':'manual',
          callback:t=>{
            if(!checkbox?.checked){token='';lock(true);return}
            token=t;busy=false;lock(!clientPatched);note('Human verification complete. You can now continue.');
          },
          'expired-callback':()=>{token='';busy=false;lock(true);note('Verification expired. Uncheck and select Start human verification again.')},
          'timeout-callback':()=>{token='';busy=false;lock(true);note('Verification timed out. Uncheck and select Start human verification again.')},
          'error-callback':()=>{token='';busy=false;lock(true);note('Verification failed. Uncheck and select Start human verification again.')}
        });
        window.turnstile.execute(widget);
      }catch{
        token='';busy=false;lock(true);note('Could not start human verification. Uncheck and try again.');
      }
    });
  }
  async function patchSupabase(){
    const sb=await window.getSupabaseClient();
    if(!sb?.auth)throw Error('Account service is unavailable.');
    if(!sb.auth.__guCaptchaPatched){
      for(const method of ['signUp','signInWithPassword','resetPasswordForEmail']){
        const original=sb.auth[method]?.bind(sb.auth);if(!original)continue;
        sb.auth[method]=async function(first,second){
          const t=getToken();
          try{
            if(method==='resetPasswordForEmail')return await original(first,{...(second||{}),captchaToken:t});
            return await original({...first,options:{...(first.options||{}),captchaToken:t}});
          }finally{reset()}
        };
      }
      sb.auth.__guCaptchaPatched=true;
    }
    clientPatched=true;
  }
  async function start(){
    lock(true);
    try{
      const response=await fetch('/api/auth-guard-v0135',{cache:'no-store'});
      const cfg=await response.json();
      if(!response.ok||cfg.ok!==true)throw Error('Human verification configuration is unavailable.');
      enabled=cfg.enabled===true;
      if(!enabled){lock(false);note('Human verification is not active on this website.');return}
      if(!/^[-_A-Za-z0-9]{8,100}$/.test(cfg.sitekey||''))throw Error('Human verification is not configured correctly.');
      const f=form();if(!f)throw Error('Account form is unavailable.');
      window.__guTurnstileSitekey=cfg.sitekey;
      addManualControl(f);
      await loadSdk();
      await patchSupabase();
      initialized=true;checkbox.disabled=false;
      lock(true);note('Select Start human verification to continue.');
    }catch(e){initialized=false;lock(true);note(e.message||'Human verification unavailable. Refresh and try again.');}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
