/* Human-verification readiness guidance only. Never displays secrets or bypasses CAPTCHA. */
(()=>{'use strict';if(!/^\/admin(?:\.html)?$/.test(location.pathname))return;
const make=(tag,txt)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;return e};
function install(){if(document.querySelector('[data-gu34-captcha]'))return true;
 const panel=document.querySelector('.admin-panel[data-admin-panel="settings"]');if(!panel)return false;
 const box=make('section');box.className='admin-card';box.dataset.gu34Captcha='1';
 const heading=make('h2','Human Verification (CAPTCHA)');
 const summary=make('p','Protect sign-in, account creation, password reset and sensitive Admin changes from automated requests. No authenticator app is required.');
 const status=make('p','Checking website setup…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const button=make('button','Check Human Verification');button.type='button';button.className='btn secondary';
 const instructions=make('details');const title=make('summary','How to finish setup');
 const steps=make('ol');[
  'In Cloudflare, create a Turnstile widget and add '+window.location.hostname+' as an allowed hostname.',
  'In Cloudflare Pages, add TURNSTILE_SITE_KEY and the secret TURNSTILE_SECRET_KEY. Set ENFORCE_AUTH_TURNSTILE_V135 to true, then redeploy.',
  'In Supabase Authentication → Bot and Abuse Protection, enable Cloudflare Turnstile using the same secret.',
  'Verify sign-in, registration, password reset, and Admin password confirmation in a test account.'
 ].forEach(item=>steps.append(make('li',item)));
 const cf=make('a','Cloudflare dashboard');cf.href='https://dash.cloudflare.com/';cf.target='_blank';cf.rel='noopener noreferrer';
 const sp=make('a','Supabase CAPTCHA guide');sp.href='https://supabase.com/docs/guides/auth/auth-captcha';sp.target='_blank';sp.rel='noopener noreferrer';
 instructions.append(title,steps,cf,make('br'),sp);
 box.append(heading,summary,status,button,instructions);panel.prepend(box);
 const check=async()=>{button.disabled=true;status.textContent='Checking public website CAPTCHA configuration…';
  try{const r=await fetch('/api/auth-guard-v0135',{cache:'no-store'});const j=await r.json();
   if(r.ok&&j.ok===true&&j.enabled===true&&typeof j.sitekey==='string'&&j.sitekey.length>5)
    status.textContent='Website CAPTCHA keys appear configured. Supabase verification still needs a real sign-in and password-confirmation test.';
   else{status.textContent='CAPTCHA setup is incomplete. Follow the setup steps below. Password confirmation stays blocked until it is configured.';instructions.open=true}
  }catch{status.textContent='Could not check CAPTCHA setup. Sensitive actions remain blocked until verified.';instructions.open=true}
  finally{button.disabled=false}};
 button.onclick=check;void check();return true;
}
let count=0;const timer=setInterval(()=>{if(install()||++count>150)clearInterval(timer)},200);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
