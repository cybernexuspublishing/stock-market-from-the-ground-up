/* v0.14.0.32-R2 — payment-provider routing and fail-closed customer checkout.
 * Stripe Managed is the preferred DIGITAL integration but cannot take live
 * website payments until signed fulfillment/entitlements are production-tested.
 * Lemon Squeezy remains optional through independently reviewed settings.
 */
(()=>{'use strict';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function token(){const sb=await window.getSupabaseClient(),{data:{session}}=await sb.auth.getSession();
 if(!session){location.replace('/signin.html?next='+encodeURIComponent(location.pathname+location.search));throw Error('Sign in required.')}
 return session.access_token;
}
async function req(url,opt={}){const t=await token();const r=await fetch(url,{...opt,headers:{authorization:'Bearer '+t,'content-type':'application/json'},cache:'no-store'});
 const j=await r.json().catch(()=>({}));if(!r.ok||j.ok===false)throw Error(j.error||'Checkout unavailable.');return j;
}
async function init(){
 const q=new URLSearchParams(location.search),type=q.get('type')||'plan',code=q.get('code')||'FULL_MONTHLY';
 const books=['book','bundle'].includes(type),root=document.querySelector('#v13-checkout');if(!root)return;
 const formats=books?`<label for="v135-format">Available format</label><select id="v135-format" aria-label="Book checkout format"><option value="">Select...</option><option value="digital">Digital download (after KDP Select exclusivity ends)</option></select><p class="small">For a personally signed paperback or hardcover, use <a href="/store.html">Store</a>. Signed print and Lulu are separate payment channels.</p>`:'';
 root.innerHTML=`<section class="v13-card"><h2>Review purchase</h2><div id="v135-order-label">${escape(code)}</div>${formats}<p id="v135-amount"></p><label><input type="checkbox" id="terms-ok"> I agree to the <a href="/terms.html" target="_blank" rel="noopener">Terms</a>, <a href="/subscription-terms.html" target="_blank" rel="noopener">Billing Terms</a>, <a href="/refund-policy.html" target="_blank" rel="noopener">Refund Policy</a> and <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</label><div role="status" aria-live="polite" id="checkout-msg"></div><button type="button" class="btn" id="complete-checkout" disabled>Checking secure payment options</button></section>`;
 const btn=root.querySelector('#complete-checkout'),msg=root.querySelector('#checkout-msg');let current=null;
 async function quote(){
  const format=root.querySelector('#v135-format')?.value||'';btn.disabled=true;btn.textContent='Checking availability…';current=null;
  if(books&&!format){msg.textContent='Select an eBook format to check availability.';btn.textContent='Choose format';return}
  try{
   const route=await fetch('/api/digital-payment-route-v01432r2',{cache:'no-store'}).then(async r=>{const data=await r.json().catch(()=>null);if(!r.ok||!data?.ok)throw Error('Payment provider setup is not yet complete.');return data});
   if(route.provider==='STRIPE_MANAGED'){
    btn.textContent='Stripe Managed Payments — integration pending';
    msg.textContent='Stripe Managed Payments is being configured. Customer purchases remain disabled until verified checkout, signed webhooks and digital delivery are ready.';
    return;
   }
   if(route.provider!=='LEMON_SQUEEZY'||route.enabled!==true||route.checkoutEnabled!==true){
    btn.textContent='Checkout not available';msg.textContent='Digital checkout is currently disabled by the Owner.';return;
   }
   const target=books?'/api/checkout-v0135':'/api/checkout';
   const j=await req(`${target}?action=quote&type=${encodeURIComponent(type)}&code=${encodeURIComponent(code)}${books?'&format='+encodeURIComponent(format):''}`),it=j.item;
   current={target,type,code,format,provider:'LEMON_SQUEEZY'};
   root.querySelector('#v135-order-label').textContent=it.name+(books?' — '+format:'');
   root.querySelector('#v135-amount').textContent=(Number(it.amount||0)/100).toLocaleString(undefined,{style:'currency',currency:it.currency||'USD'});
   btn.disabled=!(j.checkoutEnabled&&it.enabled);btn.textContent=btn.disabled?'Checkout not yet activated':'Continue to secure payment';
   msg.textContent=btn.disabled?'Checkout is not activated.':'';
  }catch(err){btn.disabled=true;btn.textContent='Checkout not available';msg.textContent=err.message}
 }
 btn.onclick=async()=>{
  if(!current)return;
  if(!root.querySelector('#terms-ok').checked){msg.textContent='Accept the purchase terms before continuing.';return}
  btn.disabled=true;
  try{const route=await fetch('/api/digital-payment-route-v01432r2',{cache:'no-store'}).then(r=>r.json());
   if(route.provider!=='LEMON_SQUEEZY'||route.checkoutEnabled!==true)throw Error('Digital checkout is disabled.');
   const j=await req(current.target+'?action=create',{method:'POST',body:JSON.stringify({type,code,format:current.format})});
   const link=new URL(j.url);if(link.protocol!=='https:'||link.hostname!=='lemonsqueezy.com'&&!link.hostname.endsWith('.lemonsqueezy.com'))throw Error('Unexpected payment provider address.');
   location.assign(link.href);
  }catch(err){msg.textContent=err.message||'Checkout unavailable.';btn.disabled=false}
 };
 root.querySelector('#v135-format')?.addEventListener('change',quote);await quote();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
