/* Operational guide: never request, reveal, or save provider API keys in browser. */
(()=>{'use strict';if(!/^\/admin(?:\.html)?$/i.test(location.pathname))return;
const el=(tag,value)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;return n};
function mount(){const panel=document.querySelector('.admin-panel[data-admin-panel="commerce"]');if(!panel)return false;if(panel.querySelector('[data-gu-lemon-readiness]'))return true;
 const box=el('section');box.dataset.guLemonReadiness='1';box.className='admin-card';box.append(el('h2','Lemon Squeezy — Alternative Digital Provider Readiness'),el('p','Alternative digital provider for subscriptions, tools and eligible eBooks, available when selected by OWNER. This dashboard reports configuration evidence only; it cannot activate a merchant account.'));
 const button=el('button','Check Provider Configuration');button.type='button';button.className='btn secondary';const status=el('p','Pending');status.setAttribute('role','status');status.setAttribute('aria-live','polite');const list=el('div');box.append(button,status,list);panel.append(box);
 button.onclick=async()=>{button.disabled=true;status.textContent='Checking server-side settings without exposing credentials…';list.replaceChildren();try{
  const sb=await window.getSupabaseClient(),{data:{session}}=await sb.auth.getSession();if(!session)throw Error('Sign in required.');
  const r=await fetch('/api/lemon-setup-status-v01432r1',{headers:{authorization:'Bearer '+session.access_token},cache:'no-store'}),d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'Verification failed.');
  for(const [label,value] of [['Provider mode',d.mode],['API key configured',d.configured.apiKey],['Store ID configured',d.configured.storeId],['Webhook signing secret configured',d.configured.webhookSecret],['Private Supabase service configured',d.configured.supabaseService],['Worker checkout enabled',d.checkoutEnvironmentEnabled],['Database checkout enabled',d.databaseCheckoutEnabled]]){
   list.append(el('p',label+': '+(typeof value==='boolean'?(value?'YES':'NO'):value)));}
  list.append(el('p','Webhook endpoint: '+d.webhookEndpoint),el('p','Actual provider purchases, webhook replay and refunds must still pass test-mode acceptance.'));
  status.textContent='Configuration evidence loaded. Do not enable live checkout until sandbox acceptance passes.';
 }catch(e){status.textContent=e.message||'Readiness check unavailable'}finally{button.disabled=false}};
 return true;
}
let n=0;const t=setInterval(()=>{if(mount()||++n>120)clearInterval(t)},200);
})();
