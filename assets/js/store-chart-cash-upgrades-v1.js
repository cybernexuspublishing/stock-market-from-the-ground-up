/* Approved one-time Studio offers. Checkout is TEST-only and server gated. */
(()=>{'use strict';
 const catalog=[
  {sku:'CHART_ADVANCED_30D',tier:'ADVANCED',cents:999,title:'Crownlight Chart Studio Advanced — 30 Days',
   detail:'Advanced chart studies and drawing tools, plus Standard Studio.'},
  {sku:'CHART_PROFESSIONAL_30D',tier:'PROFESSIONAL',cents:1999,title:'Crownlight Chart Studio Professional — 30 Days',
   detail:'Professional multi-chart layouts, Advanced tools, and Standard Studio.'}
 ];
 const host=document.getElementById('store-chart-cash-upgrades');if(!host)return;
 const el=(tag,text)=>{const x=document.createElement(tag);x.textContent=text;return x};
 let token=null,offers=null;
 async function status(){
  try{
   const client=await window.getSupabaseClient();
   token=(await client.auth.getSession()).data?.session?.access_token||null;
   if(!token)return;
   const r=await fetch('/api/chart-cash-upgrade',{headers:{authorization:'Bearer '+token},cache:'no-store'});
   const data=await r.json();
   if(r.ok&&data.ok===true)offers=data.offers;
  }catch{/* Public terms remain visible; purchase stays disabled. */}
 }
 async function render(){
  await status();host.replaceChildren();
  for(const product of catalog){
   const offer=offers?.find(x=>x.sku===product.sku&&x.tier===product.tier&&
    x.amountCents===product.cents&&x.durationDays===30&&x.oneTime===true&&x.renews===false);
   const card=el('article','');card.className='v11-tool-card';
   const price=el('p','$'+(product.cents/100).toFixed(2)+' · one payment · 30 days');
   const note=el('p','Access expires 30 days after verified payment. A full refund or dispute revokes this upgrade. Existing membership and Crownlight Lumens remain unchanged. No historical market data or redistribution license is included.');
   const state=el('p',!token?'Sign in to check eligibility.':!offer?'Eligibility temporarily unavailable.':
    offer.included?'Your current access already includes this tier.':
    offer.activeUntil?'Active until '+new Date(offer.activeUntil).toLocaleString():
    'Eligible for this independent Studio upgrade.');
   state.setAttribute('role','status');
   const button=el('button','Open Stripe TEST checkout');button.type='button';button.className='btn';
   button.disabled=!token||!offer||offer.included||offer.checkoutEnabled!==true;
   if(!offer?.checkoutEnabled)button.textContent='Checkout not yet available';
   button.addEventListener('click',async()=>{
    button.disabled=true;state.textContent='Verifying eligibility and creating TEST checkout…';
    try{
     const r=await fetch('/api/chart-cash-upgrade',{method:'POST',
      headers:{authorization:'Bearer '+token,'content-type':'application/json'},
      body:JSON.stringify({sku:product.sku})});
     const data=await r.json();
     if(!r.ok||data.ok!==true||data.testOnly!==true||data.amountCents!==product.cents)
      throw Error(data.error||'Checkout unavailable');
     const destination=new URL(data.url);
     if(destination.protocol!=='https:'||destination.hostname!=='checkout.stripe.com')throw Error('Invalid checkout destination');
     window.location.assign(destination.href);
    }catch(e){state.textContent=String(e.message||e);button.disabled=false}
   });
   card.append(el('h3',product.title),price,el('p',product.detail),note,state,button);
   host.append(card);
  }
 }
 void render();
})();
