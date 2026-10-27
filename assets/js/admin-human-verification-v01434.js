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
 const ownerControl=make('section');ownerControl.className='admin-card';
 const ownerStatus=make('p','Checking Owner CAPTCHA controls…');ownerStatus.setAttribute('role','status');ownerStatus.setAttribute('aria-live','polite');
 const ownerToggle=make('button','Disable website CAPTCHA');ownerToggle.type='button';ownerToggle.className='btn secondary';ownerToggle.hidden=true;ownerToggle.disabled=true;
 const ownerHelp=make('p','The switch must change both Supabase Auth and Cloudflare website verification. If the management credential is missing, no partial disable is permitted.');ownerHelp.className='small';
 ownerControl.append(ownerStatus,ownerToggle,ownerHelp);
 box.append(ownerControl);
 let actual=null;
 async function ownerToken(){const sb=await window.getSupabaseClient();const {data:{session}}=await sb.auth.getSession();
  if(!session?.access_token)throw Error('Owner sign-in required');return session.access_token}
 async function ownerCheck(){
  try{
   const jwt=await ownerToken(),r=await fetch('/api/owner-captcha-control',{cache:'no-store',headers:{authorization:'Bearer '+jwt}});
   const data=await r.json();
   if(r.status===403||r.status===401){ownerControl.hidden=true;return}
   ownerControl.hidden=false;
   if(!r.ok||data?.ok!==true)throw Error(data?.error||'CAPTCHA control status unavailable');
   actual=data;
   ownerToggle.hidden=false;ownerToggle.disabled=!data.available||!data.synchronized;
   ownerToggle.textContent=data.websiteEnabled?'Disable website CAPTCHA':'Enable website CAPTCHA';
   ownerStatus.textContent=data.available?
    ('Website '+(data.websiteEnabled?'ENABLED':'DISABLED')+'; Supabase Auth '+(data.supabaseEnabled?'ENABLED':'DISABLED')+'. '+(data.synchronized?'Both layers agree.':'Settings do not match.')) :
    'One-click CAPTCHA control requires a Supabase Management API credential in Cloudflare Production (SUPABASE_MANAGEMENT_ACCESS_TOKEN). CAPTCHA remains enabled.';
  }catch(err){ownerToggle.disabled=true;ownerStatus.textContent=err.message||'Owner CAPTCHA state unavailable'}
 }
 ownerToggle.addEventListener('click',async()=>{
  if(!actual?.available||!actual.synchronized)return;
  const enabled=!actual.websiteEnabled;
  if(!window.confirm((enabled?'ENABLE':'DISABLE')+' CAPTCHA for sign-in, signup and password reconfirmation in BOTH Supabase Auth and the website? This changes production security immediately.'))return;
  ownerToggle.disabled=true;ownerStatus.textContent='Synchronizing CAPTCHA state with Supabase Auth and the website…';
  try{
   const step=window.GroundUpAdminPasswordConfirm?.ensure;
   if(typeof step!=='function')throw Error('Owner password verification is unavailable');
   await step();
   const r=await fetch('/api/owner-captcha-control',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+await ownerToken()},
    body:JSON.stringify({enabled,confirm:'CHANGE_PRODUCTION_CAPTCHA'})});
   const result=await r.json().catch(()=>null);
   if(!r.ok||result?.ok!==true)throw Error(result?.error||'CAPTCHA change failed');
   ownerStatus.textContent='Updated website and Supabase Auth CAPTCHA setting. Refreshing verified state…';
  }catch(err){ownerStatus.textContent='CAPTCHA change was not completed: '+(err.message||'unknown error')}
  await ownerCheck();
 });
 void ownerCheck();

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
