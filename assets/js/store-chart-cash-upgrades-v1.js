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
   const included=offer?.included===true;
   if(included){card.classList.add('chart-upgrade-included');card.setAttribute('data-purchase-blocked','included');
    card.style.opacity='0.56';card.style.filter='grayscale(0.85)';card.style.borderStyle='dashed';}
   const price=el('p','$'+(product.cents/100).toFixed(2)+' · one payment · 30 days');
   const note=el('p','Access expires 30 days after verified payment. A full refund or dispute revokes this upgrade. Existing membership and Crownlight Lumens remain unchanged. No historical market data or redistribution license is included.');
   const state=el('p',!token?'Sign in to check eligibility.':!offer?'Eligibility temporarily unavailable.':
    offer.included?'Your current access already includes this tier.':
    offer.activeUntil?'Active until '+new Date(offer.activeUntil).toLocaleString():
    'Eligible for this independent Studio upgrade.');
   state.setAttribute('role','status');
   const button=el('button','Open Stripe TEST checkout');button.type='button';button.className='btn';
   button.disabled=!token||!offer||included||offer.checkoutEnabled!==true;
   if(included){button.textContent='Already included — purchase blocked';button.title='Your effective membership or active access already includes this Chart Studio tier.';}
   else if(!offer?.checkoutEnabled)button.textContent='Checkout not yet available';
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
   const creditBox=el('section','');creditBox.style.marginTop='1rem';creditBox.setAttribute('aria-label','TEST mixed payment');
   const creditTitle=el('h4','Lumens + card — TEST checkout');
   const creditLabel=el('label','Apply Lumens (whole credits)');
   const creditInput=document.createElement('input');creditInput.type='number';creditInput.min='0';creditInput.step='1';creditInput.value='0';creditInput.style.maxWidth='9rem';
   creditLabel.append(creditInput);
   const creditSummary=el('p',included?'This product is already included.':'Sign in to preview your Lumen discount.');
   creditSummary.setAttribute('role','status');
   const mixedButton=el('button','Purchase with Lumens + card (TEST)');mixedButton.className='btn secondary';mixedButton.type='button';mixedButton.disabled=true;
   let current=null,requestId=null;
   async function updateMixed(){
    mixedButton.disabled=true;current=null;requestId=null;
    if(!token||included||!offer){creditInput.disabled=true;return}
    const requested=Number(creditInput.value);
    if(!Number.isSafeInteger(requested)||requested<0){creditSummary.textContent='Enter a nonnegative whole number of Lumens.';return}
    try{
     const response=await fetch('/api/chart-mixed-test-quote?sku='+encodeURIComponent(product.sku)+'&lumens='+requested,
      {headers:{authorization:'Bearer '+token},cache:'no-store'});
     const quote=await response.json();
     if(!response.ok||quote.ok!==true){creditSummary.textContent=quote.error||'Quote unavailable';return}
     current=quote;creditInput.max=String(quote.maxLumensUsable);
     const dollars=v=>'
   host.append(card);
  }
 }
 void render();
 // The member may cancel an unpaid Stripe TEST session; expire it through Stripe before returning Lumens.
 const cancellation=new URLSearchParams(location.search).get('chart_mixed_cancel');
 if(/^[0-9a-f-]{36}$/i.test(cancellation||'')){
  (async()=>{try{const client=await window.getSupabaseClient();const token=(await client.auth.getSession()).data?.session?.access_token;if(!token)return;
   await fetch('/api/chart-mixed-test-checkout',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
    body:JSON.stringify({action:'cancel',upgradeId:cancellation})});}catch{/* Signed expiry webhook reconciles outstanding credits. */}})();
 }

})();
+(v/100).toFixed(2);
     creditSummary.textContent='Available: '+quote.availableLumens+' Lumens · Use: '+quote.selectedLumens+
      ' · Discount: '+dollars(quote.discountCents)+' · Card due: '+dollars(quote.cashDueCents)+
      ' · Balance after: '+quote.remainingLumens+'.';
     if(requested===0){creditSummary.textContent+=' To pay entirely by card, use the standard checkout button above.';return}
     if(!quote.checkoutActive){creditSummary.textContent+=' Mixed TEST checkout is not enabled for this account.';return}
     mixedButton.disabled=false;
     mixedButton.textContent=quote.fullyCovered?'Redeem Lumens for access (TEST)':'Pay '+dollars(quote.cashDueCents)+' with Stripe TEST';
    }catch{creditSummary.textContent='Could not verify wallet and price.'}
   }
   creditInput.addEventListener('change',()=>void updateMixed());
   mixedButton.addEventListener('click',async()=>{
    if(!current?.checkoutActive||current.selectedLumens<=0)return;
    mixedButton.disabled=true;creditSummary.textContent='Reserving Lumens and verifying TEST checkout…';
    try{
     if(!requestId)requestId=crypto.randomUUID();
     const r=await fetch('/api/chart-mixed-test-checkout',{method:'POST',headers:{
      authorization:'Bearer '+token,'content-type':'application/json'},
      body:JSON.stringify({action:'start',sku:product.sku,lumens:current.selectedLumens,requestId})});
     const d=await r.json();
     if(!r.ok||d.ok!==true||d.testOnly!==true)throw Error(d.error||'TEST checkout unavailable');
     if(d.fullyLumens===true&&d.cashDueCents===0){location.assign(d.redirect);return}
     const destination=new URL(d.url);
     if(destination.protocol!=='https:'||destination.hostname!=='checkout.stripe.com')throw Error('Unexpected checkout destination');
     location.assign(destination.href);
    }catch(e){creditSummary.textContent=String(e.message||e);mixedButton.disabled=false}
   });
   creditBox.append(creditTitle,creditLabel,creditSummary,mixedButton);
   card.append(el('h3',product.title),price,el('p',product.detail),note,state,button,creditBox);\n   if(token&&!included&&offer)void updateMixed();
   host.append(card);
  }
 }
 void render();
})();
