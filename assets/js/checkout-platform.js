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
 root.innerHTML=`<section class="v13-card"><h2>Review purchase</h2><div id="v135-order-label">${escape(code)}</div>${formats}<p id="v135-amount"></p><div id="v135-lumen-selector"></div><label><input type="checkbox" id="terms-ok"> I agree to the <a href="/terms.html" target="_blank" rel="noopener">Terms</a>, <a href="/subscription-terms.html" target="_blank" rel="noopener">Billing Terms</a>, <a href="/refund-policy.html" target="_blank" rel="noopener">Refund Policy</a> and <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</label><div role="status" aria-live="polite" id="checkout-msg"></div><button type="button" class="btn" id="complete-checkout" disabled>Checking secure payment options</button></section>`;
 const btn=root.querySelector('#complete-checkout'),msg=root.querySelector('#checkout-msg');
 const amount=root.querySelector('#v135-amount'),orderLabel=root.querySelector('#v135-order-label');
 let current=null;
 const lumenHost=root.querySelector('#v135-lumen-selector');
 const onLumenChange=using=>{
  if(!current)return;
  if(using){
   btn.disabled=true;
   btn.textContent='Cash + Lumens checkout not active';
   msg.textContent='Your selected Lumens are only a quote. The existing cash checkout cannot apply them yet, so continuing is blocked to prevent an incorrect charge. Choose 0 Lumens to use the ordinary full-price checkout.';
  }else{
   btn.disabled=!current.checkoutReady;
   btn.textContent=current.checkoutReady?
    current.provider==='STRIPE_MANAGED_LIVE'?'Continue to secure Stripe checkout':'Continue to secure payment':
    'Checkout not yet activated';
   msg.textContent=current.checkoutReady?'No Lumens selected; the standard verified purchase amount applies.':'Checkout is not activated.';
  }
 };
 const loadLumen=(priceCents)=>window.CrownlightLumenCheckoutV1?.mount?.({
   root:lumenHost,sku:type+':'+code,expectedPriceCents:priceCents,onChange:onLumenChange
 });
 // v137: the button is never enabled on a mere boolean readiness response.
 // Display exact, server-verified base price and renewal cadence before a
 // member can consent to terms or request a Stripe Checkout Session.
 const expectedCadence=Object.freeze({
  'plan:FULL_MONTHLY':'month','plan:FULL_ANNUAL':'year',
  'plan:LIFETIME':'lifetime','plan:ONDEMAND_MONTHLY':'month',
  'tool:INTERACTIVE_LEARNING':'month','tool:JOURNAL_ANALYTICS':'month',
  'tool:MARKET_SIMULATOR':'month','tool:MARKET_TUTOR':'month'
 });
 const priceText=offer=>{
  if(!offer||offer.type!==type||offer.code!==code||
     offer.currency!=='USD'||!Number.isSafeInteger(offer.unitAmountCents)||
     offer.unitAmountCents<=0||offer.billingInterval!==expectedCadence[type+':'+code]||
     (offer.billingInterval==='lifetime'?offer.intervalCount!==null:offer.intervalCount!==1)||
     typeof offer.name!=='string'||!offer.name.trim()||offer.name.length>120)return null;
  const base=(offer.unitAmountCents/100).toLocaleString('en-US',
   {style:'currency',currency:'USD'});
  return {name:offer.name.trim(),display:base+
   (offer.billingInterval==='lifetime'?' one-time':
   offer.billingInterval==='month'?' per month':' per year')};
 };
 async function quote(){
  const format=root.querySelector('#v135-format')?.value||'';
  btn.disabled=true;btn.textContent='Checking availability…';current=null;
  window.CrownlightLumenCheckoutV1?.clear?.();
  lumenHost?.replaceChildren();
  amount.textContent='';
  if(books&&!format){msg.textContent='Select an eBook format to check availability.';btn.textContent='Choose format';return}
  try{
   const route=await fetch('/api/digital-payment-route-v01432r2',{cache:'no-store'}).then(async r=>{const data=await r.json().catch(()=>null);if(!r.ok||!data?.ok)throw Error('Payment provider setup is not yet complete.');return data});
   if(route.provider==='STRIPE_MANAGED'){
    // One production database. Owner-only GU39 TEST purchases stay in the
    // separate Admin shadow ledger, NEVER in customer checkout. Do not route
    // customer browsers to deprecated staging-specific v38/v61 endpoints.
    if(books){
      btn.textContent='Direct digital checkout unavailable';
      msg.textContent='Book purchases follow the separate publishing-rights and approved retailer checkout rules.';
      return;
    }
    const readyUrl='/api/stripe-live-checkout?type='+encodeURIComponent(type)+'&code='+encodeURIComponent(code);
    const readiness=route.enabled===true
      ?await fetch(readyUrl,{cache:'no-store'}).then(async r=>r.ok?await r.json():null).catch(()=>null)
      :null;
    const verified=readiness?.ok===true&&readiness.readOnly===true&&
     readiness.livePayments===false&&readiness.liveCheckoutAvailable===true&&
     route.enabled===true?priceText(readiness.offer):null;
    if(verified){
      orderLabel.textContent=verified.name;
      amount.textContent='Verified base price: '+verified.display+
       '. Applicable taxes, if any, and the final total are shown by Stripe before payment.';
      current={target:'/api/stripe-live-checkout',provider:'STRIPE_MANAGED_LIVE',type,code,checkoutReady:true};
      btn.disabled=false;btn.textContent='Continue to secure Stripe checkout';
      msg.textContent='Review the stated price and billing period. You will confirm any final taxes and total within Stripe before payment.';
      void loadLumen(readiness.offer.unitAmountCents);
    }else{
      btn.textContent='Price or secure checkout unavailable';
      msg.textContent='A current Stripe-verified USD price and billing period could not be confirmed. No payment will be initiated.';
    }
    return;
   }
   if(route.provider!=='LEMON_SQUEEZY'||route.enabled!==true||route.checkoutEnabled!==true){
    btn.textContent='Checkout not available';msg.textContent='Digital checkout is currently disabled by the Owner.';return;
   }
   const target=books?'/api/checkout-v0135':'/api/checkout';
   const j=await req(`${target}?action=quote&type=${encodeURIComponent(type)}&code=${encodeURIComponent(code)}${books?'&format='+encodeURIComponent(format):''}`),it=j.item;
   current={target,type,code,format,provider:'LEMON_SQUEEZY',checkoutReady:!!(j.checkoutEnabled&&it.enabled)};
   root.querySelector('#v135-order-label').textContent=it.name+(books?' — '+format:'');
   root.querySelector('#v135-amount').textContent=(Number(it.amount||0)/100).toLocaleString(undefined,{style:'currency',currency:it.currency||'USD'});
   btn.disabled=!(j.checkoutEnabled&&it.enabled);btn.textContent=btn.disabled?'Checkout not yet activated':'Continue to secure payment';
   msg.textContent=btn.disabled?'Checkout is not activated.':'';
   if(Number.isSafeInteger(Number(it.amount))&&Number(it.amount)>0&&String(it.currency||'USD').toUpperCase()==='USD')
    void loadLumen(Number(it.amount));
  }catch(err){btn.disabled=true;btn.textContent='Checkout not available';msg.textContent=err.message}
 }
 btn.onclick=async()=>{
  if(!current)return;
  // Defensive check: never redirect to unmodified full-price Stripe/Lemon
  // session if the member selected Lumens; mixed-payment collection is not
  // enabled until an atomic reservation and signed settlement path exists.
  if(window.CrownlightLumenCheckoutV1?.getSelection?.()>0){
   btn.disabled=true;
   msg.textContent='Mixed Lumen payment has not been activated. No credits or cash have been spent.';
   return;
  }
  if(!root.querySelector('#terms-ok').checked){msg.textContent='Accept the purchase terms before continuing.';return}
  btn.disabled=true;
  try{
   if(current.provider==='STRIPE_MANAGED_LIVE'){
     // The server revalidates amount/cadence/ownership on every POST; a
     // stale browser quote never authorizes a specific charge.
     const j=await req(current.target,{method:'POST',body:JSON.stringify({type,code})});
     const link=new URL(j.url);
     if(link.protocol!=='https:'||link.hostname!=='checkout.stripe.com')throw Error('Unexpected Stripe checkout address.');
     location.assign(link.href);return;
   }
   const route=await fetch('/api/digital-payment-route-v01432r2',{cache:'no-store'}).then(r=>r.json());
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
