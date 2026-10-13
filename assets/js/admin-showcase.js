/* v0.13.5 Owner-only synthetic Showcase creation UI, feature OFF unless owner enables.
   Original v0.13.4 action remains intentionally blocked by middleware. */
(()=>{'use strict';
const q=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function create(){try{
 const sb=await window.getSupabaseClient(),{data:{session}}=await sb.auth.getSession();if(!session)throw Error('Sign in to continue.');
 const res=await fetch('/api/showcase-v0135',{method:'POST',cache:'no-store',headers:{authorization:'Bearer '+session.access_token,'content-type':'application/json'},body:JSON.stringify({action:'create'})}),r=await res.json();if(!res.ok||!r.ok)throw Error(r.error||'Unable to create Showcase account.');
 const a=r.account,d=document.createElement('dialog');d.className='v134-account-dialog';d.innerHTML=`<form method="dialog"><h2>Synthetic Showcase Account</h2><p>This login has <strong>no actual Lifetime, book, tool, or assessed-skill entitlements.</strong></p><p>Username: <strong>${esc(a.username)}</strong><br>Email: <strong>${esc(a.email)}</strong></p><p>Temporary password:</p><div data-password style="overflow-wrap:anywhere;font-family:monospace">••••••••••••••••••••••••</div><div class="actions"><button class="btn secondary" data-reveal type="button">Show for 30 seconds</button><button class="btn secondary" data-copy type="button">Copy</button><button class="btn" value="close">Close</button></div></form>`;document.body.appendChild(d);const box=d.querySelector('[data-password]');let timeout;const hide=()=>{box.textContent='••••••••••••••••••••••••';clearTimeout(timeout)};
 d.querySelector('[data-reveal]').onclick=()=>{box.textContent=a.password;timeout=setTimeout(hide,30000)};d.querySelector('[data-copy]').onclick=()=>navigator.clipboard?.writeText(a.password);d.addEventListener('close',()=>{hide();d.remove()},{once:true});d.showModal();
 }catch(err){alert(err.message||'Showcase provisioning is unavailable.')}}
function adapt(){for(const b of document.querySelectorAll('[data-v134-showcase]')){if(b.dataset.v135Adapted)return;b.dataset.v135Adapted='1';b.onclick=create}}
const observer=new MutationObserver(adapt);observer.observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',adapt,{once:true});else adapt();
})();
