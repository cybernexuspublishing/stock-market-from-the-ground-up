/* Optional password re-confirmation for protected OWNER/ADMIN operations.
 * No second factor; Supabase Auth validates both password and Turnstile CAPTCHA.
 * Password stays in memory only and is never stored client-side.
 */
(()=>{'use strict';if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
let inflight=null,installed=false;
const protectedError=e=>/PASSWORD_RECONFIRM_REQUIRED|OWNER_MFA_REQUIRED|OWNER_AAL2_REQUIRED|OWNER_ROLE_REQUIRED_FOR_PROTECTED_SETTING/i.test(String(e?.message||e||''));
const node=(t,content)=>{const x=document.createElement(t);if(content!==undefined)x.textContent=content;return x};
async function ensure(){if(inflight)return inflight;inflight=new Promise((resolve,reject)=>{
 const shade=node('div');shade.className='gu-pw-shade';shade.setAttribute('role','presentation');
 const box=node('section');box.className='gu-pw-dialog';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Confirm password for sensitive action');
 const title=node('h2','Confirm your password');const info=node('p','Sensitive account settings and private shipping details require a recent password confirmation. No authenticator application or MFA is required.');
 const form=node('form');const label=node('label','Current account password');const password=node('input');password.type='password';password.required=true;password.disabled=true;password.autocomplete='current-password';password.maxLength=1024;label.append(password);
 const challenge=node('div');const status=node('p','Loading human verification…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const verify=node('button','Confirm Password');verify.type='submit';verify.disabled=true;const cancel=node('button','Cancel');cancel.type='button';
 // Never invite password entry when human verification has not been configured.
 const setup=node('div');setup.className='gu-pw-setup';setup.hidden=true;
 setup.append(node('strong','Human verification needs to be set up first.'),
  node('p','Your website owner must connect Cloudflare Turnstile and Supabase before password confirmation will work. Your password cannot be confirmed until then.'));
 const guide=node('ol');for(const item of [
  'Create a Cloudflare Turnstile widget for the website address.',
  'Add its site key and secret to the Cloudflare Pages environment and turn on the CAPTCHA setting.',
  'Enter the same Turnstile secret in Supabase Authentication → Bot and Abuse Protection, then redeploy and test.'
 ])guide.append(node('li',item));
 const cloudflare=node('a','Open Cloudflare Turnstile setup');cloudflare.href='https://dash.cloudflare.com/';cloudflare.target='_blank';cloudflare.rel='noopener noreferrer';
 const supabase=node('a','Open Supabase CAPTCHA instructions');supabase.href='https://supabase.com/docs/guides/auth/auth-captcha';supabase.target='_blank';supabase.rel='noopener noreferrer';
 setup.append(guide,cloudflare,node('br'),supabase);
 form.append(label,challenge,verify,cancel,status,setup);box.append(title,info,form);shade.append(box);document.body.append(shade);
 const previous=document.activeElement;let widgetId=null,token='',complete=false;
 const close=(err)=>{if(complete)return;complete=true;password.value='';if(widgetId!==null)try{window.turnstile?.remove(widgetId)}catch{}shade.remove();previous?.focus?.();inflight=null;if(err)reject(err);else resolve(true)};
 cancel.onclick=()=>close(Error('Password confirmation canceled.'));
 const dialogKeys=e=>{if(e.key==='Escape')close(Error('Password confirmation canceled.'));
  if(e.key!=='Tab')return;
  const active=[...box.querySelectorAll('input,button,[tabindex]')].filter(x=>!x.disabled&&x.getAttribute('tabindex')!=='-1');
  if(!active.length)return;
  if(e.shiftKey&&document.activeElement===active[0]){e.preventDefault();active.at(-1).focus()}
  else if(!e.shiftKey&&document.activeElement===active.at(-1)){e.preventDefault();active[0].focus()}
 };shade.addEventListener('keydown',dialogKeys);
 async function load(){try{
  const cfg=await fetch('/api/auth-guard-v0135',{cache:'no-store'}).then(r=>r.json());
  if(!cfg?.enabled||!cfg.sitekey)throw Error('Human verification has not been set up for this website. Please follow the steps below.');
  if(!window.turnstile){await new Promise((yes,no)=>{const existing=document.querySelector('script[data-gu-pw-turnstile]');if(existing){const check=setInterval(()=>{if(window.turnstile){clearInterval(check);yes()}},120);setTimeout(()=>{clearInterval(check);no(Error('Human verification unavailable.'))},12000);return}
   const s=document.createElement('script');s.dataset.guPwTurnstile='1';s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.onload=yes;s.onerror=()=>no(Error('Human verification could not load.'));document.head.append(s)})}
  widgetId=window.turnstile.render(challenge,{sitekey:cfg.sitekey,action:'admin_stepup',theme:'auto',callback:t=>{token=t;verify.disabled=false;status.textContent='Human verification complete.'},'expired-callback':()=>{token='';verify.disabled=true;status.textContent='Verification expired.'},'error-callback':()=>{token='';verify.disabled=true;status.textContent='Verification failed.'}});
  setup.hidden=true;password.disabled=false;status.textContent='Complete the human verification, then enter your password.';password.focus();
 }catch(e){password.disabled=true;password.value='';verify.disabled=true;setup.hidden=false;status.textContent=e.message||'Human verification is unavailable. Follow the setup steps below.'}}
 form.onsubmit=async e=>{e.preventDefault();if(password.disabled||!token||!password.value)return;verify.disabled=true;status.textContent='Confirming your credentials…';
  try{const sb=await window.getSupabaseClient();const {data:{session}}=await sb.auth.getSession();if(!session)throw Error('Your session has expired.');
   const r=await fetch('/api/admin-password-confirm-v01432r1',{method:'POST',cache:'no-store',headers:{'content-type':'application/json',authorization:'Bearer '+session.access_token},body:JSON.stringify({password:password.value,captchaToken:token})});
   const out=await r.json();if(!r.ok||!out.ok)throw Error(out.error||'Password confirmation failed.');close();
  }catch(e){status.textContent=e.message||'Verification denied.';password.value='';token='';if(widgetId!==null)window.turnstile?.reset(widgetId);verify.disabled=true}
 };
 void load();
 });return inflight}
window.GroundUpAdminPasswordConfirm=Object.freeze({ensure,protectedError});
// SDK RPC wrapper: if an action requires reconfirmation, prompt and retry once.
// The database is authoritative. This code NEVER bypasses a failed database check.
async function install(){if(installed||typeof window.getSupabaseClient!=='function')return;
 try{const sb=await window.getSupabaseClient();if(installed||!sb?.rpc)return;const original=sb.rpc.bind(sb);
 sb.rpc=async(...args)=>{const result=await original(...args);if(result?.error&&protectedError(result.error)){
  try{await ensure()}catch(e){return {data:null,error:e}}return original(...args)}return result};installed=true;
 }catch{ /* retry after Supabase initializes */ }}
let tries=0;const timer=setInterval(()=>{void install();if(installed||++tries>140)clearInterval(timer)},150);
})();
