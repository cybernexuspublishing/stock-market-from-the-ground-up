/* v0.14.0.28 — digital-only Lemon Squeezy book checkout; print through Lulu Direct.
 * Plan/tool purchases continue through their pre-existing provider endpoint.
 */
(()=>{'use strict';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function req(url,opt={}){
 const sb=await window.getSupabaseClient(),{data:{session}}=await sb.auth.getSession();
 if(!session){location.replace('/signin.html?next='+encodeURIComponent(location.pathname+location.search));throw Error('Sign in required.')}
 const r=await fetch(url,{...opt,headers:{authorization:'Bearer '+session.access_token,'content-type':'application/json'},cache:'no-store'});
 const j=await r.json().catch(()=>({}));if(!r.ok||j.ok===false)throw Error(j.error||'Checkout unavailable.');return j;
}
async function init(){
 const q=new URLSearchParams(location.search),type=q.get('type')||'plan',code=q.get('code')||'FULL_MONTHLY';
 const books=['book','bundle'].includes(type),h=document.querySelector('#v13-checkout');if(!h)return;
 const formats=books?`<label for="v135-format">Available format</label><select id="v135-format" aria-label="Book checkout format"><option value="">Select...</option><option value="digital">Digital download — only after KDP Select exclusivity ends and downloads are enabled</option></select><p class="small">For a printed paperback or hardcover, return to <a href="/store.html">Store</a> and choose Amazon or Lulu Direct. Physical books are not sold through Lemon Squeezy.</p>`:'';
 h.innerHTML=`<section class="v13-card"><h2>Review purchase</h2><div id="v135-order-label">${escape(code)}</div>${formats}<p id="v135-amount"></p><label><input type="checkbox" id="terms-ok"> I agree to the <a href="/terms.html" target="_blank" rel="noopener">Terms</a>, <a href="/subscription-terms.html" target="_blank" rel="noopener">Billing Terms</a>, <a href="/refund-policy.html" target="_blank" rel="noopener">Refund Policy</a> and <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</label><div role="status" id="checkout-msg"></div><button type="button" class="btn" id="complete-checkout" disabled>Checkout not yet available</button></section>`;
 const btn=h.querySelector('#complete-checkout'),msg=h.querySelector('#checkout-msg');let current;
 async function quote(){
  const format=h.querySelector('#v135-format')?.value||'';btn.disabled=true;btn.textContent='Checking availability…';current=null;
  if(books&&!format){msg.textContent='Select the digital format to check availability. Print orders are placed from Store.';btn.textContent='Choose format';return}
  try{const target=books?'/api/checkout-v0135':'/api/checkout';
   const j=await req(`${target}?action=quote&type=${encodeURIComponent(type)}&code=${encodeURIComponent(code)}${books?'&format='+encodeURIComponent(format):''}`),it=j.item;
   current={target,type,code,format};h.querySelector('#v135-order-label').textContent=it.name+(books?' — '+format:'');
   h.querySelector('#v135-amount').textContent=(Number(it.amount||0)/100).toLocaleString(undefined,{style:'currency',currency:it.currency||'USD'});
   btn.disabled=!(j.checkoutEnabled&&it.enabled);btn.textContent=btn.disabled?'Checkout not yet activated':'Continue to secure payment';
   msg.textContent=btn.disabled?'Sales are unavailable until formally enabled.':'';
  }catch(err){btn.disabled=true;btn.textContent='Checkout not available';msg.textContent=err.message}
 }
 btn.onclick=async()=>{
  if(!current)return;if(!h.querySelector('#terms-ok').checked){msg.textContent='Accept the purchase terms before continuing.';return}
  btn.disabled=true;try{const j=await req(current.target+'?action=create',{method:'POST',body:JSON.stringify({type,code,format:current.format})});if(!/^https:\/\//.test(j.url||''))throw Error('Payment provider returned an invalid address.');location.assign(j.url)}
  catch(err){msg.textContent=err.message;btn.disabled=false}
 };
 h.querySelector('#v135-format')?.addEventListener('change',quote);await quote();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
