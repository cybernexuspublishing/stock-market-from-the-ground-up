/* Chart Studio cash and QA-only mixed Lumen/Stripe TEST products.
 * All prices, entitlements and charges are verified by server endpoints.
 */
(()=>{'use strict';
 const products=[
  {sku:'CHART_ADVANCED_30D',tier:'ADVANCED',cents:999,title:'Crownlight Chart Studio Advanced — 30 Days',detail:'Advanced chart studies and drawing tools, plus Standard Studio.'},
  {sku:'CHART_PROFESSIONAL_30D',tier:'PROFESSIONAL',cents:1999,title:'Crownlight Chart Studio Professional — 30 Days',detail:'Professional multi-chart layouts, Advanced tools, and Standard Studio.'}
 ];
 const host=document.getElementById('store-chart-cash-upgrades');
 if(!host)return;
 const el=(tag,value)=>{const n=document.createElement(tag);n.textContent=value;return n};
 const usd=cents=>'$'+(cents/100).toFixed(2);
 let token=null,offers=[];
 async function requestJson(url,options={}){
  const response=await fetch(url,{...options,headers:{authorization:'Bearer '+token,...options.headers},cache:'no-store'});
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.ok)throw Error(data?.error||'Checkout verification unavailable.');
  return data;
 }
 async function loadAccess(){
  try{
   const client=await window.getSupabaseClient();
   token=(await client.auth.getSession()).data?.session?.access_token||null;
   if(!token)return;
   const d=await requestJson('/api/chart-cash-upgrade');
   offers=d.offers||[];
  }catch{offers=[]}
 }
 async function startCash(p,button,message){
  button.disabled=true;
  message.textContent='Creating Stripe TEST checkout…';
  try{
   const data=await requestJson('/api/chart-cash-upgrade',{method:'POST',
    headers:{'content-type':'application/json'},body:JSON.stringify({sku:p.sku})});
   if(data.testOnly!==true||data.amountCents!==p.cents)throw Error('Unexpected amount or mode.');
   const dest=new URL(data.url);
   if(dest.protocol!=='https:'||dest.hostname!=='checkout.stripe.com')throw Error('Unverified checkout destination.');
   window.location.assign(dest.href);
  }catch(e){message.textContent=e.message;button.disabled=false}
 }
 function cardFor(p){
  const offer=offers.find(x=>x.sku===p.sku&&x.tier===p.tier&&x.amountCents===p.cents&&x.durationDays===30&&x.oneTime===true&&x.renews===false);
  const included=offer?.included===true,eligible=!!token&&!!offer&&!included;
  const card=el('article','');
  card.className='v11-tool-card';
  if(included){card.classList.add('chart-upgrade-included');card.style.opacity='.56';card.style.filter='grayscale(.85)';card.style.borderStyle='dashed';card.setAttribute('data-purchase-blocked','included')}
  const title=el('h3',p.title),price=el('p',usd(p.cents)+' · one-time payment · 30 days');
  const detail=el('p',p.detail);
  const terms=el('p','Access expires 30 days after verified purchase. Refunds or disputes revoke access. Existing membership and Crownlight Lumens remain separate. No market-data redistribution rights included.');
  const state=el('p',!token?'Sign in to check eligibility.':!offer?'Eligibility temporarily unavailable.':included?'Already included in your current access.':offer.activeUntil?'Active until '+new Date(offer.activeUntil).toLocaleString():'Eligible for this upgrade.');
  state.setAttribute('role','status');
  const cash=el('button',included?'Already included — purchase blocked':offer?.checkoutEnabled?'Open Stripe TEST checkout':'Checkout not yet available');
  cash.type='button';cash.className='btn';
  cash.disabled=!eligible||offer?.checkoutEnabled!==true;
  cash.addEventListener('click',()=>void startCash(p,cash,state));
  const section=el('section','');section.style.marginTop='1rem';section.setAttribute('aria-label','Use Lumens with a TEST card payment');
  const heading=el('h4','Use Crownlight Lumens + credit card (TEST)');
  const explain=el('p','Choose whole Lumens to apply to this purchase, or use the standard card-only button above. Mixed payment is only available to authorized noncommercial QA accounts.');
  const label=el('label','Lumens to apply: '),input=document.createElement('input');
  input.type='number';input.min='1';input.max=String(Math.ceil(p.cents/7));input.step='1';input.value='10';input.style.width='6rem';
  input.disabled=!eligible;label.append(input);
  const preview=el('button','Preview Lumen discount');preview.type='button';preview.className='btn secondary';preview.disabled=!eligible;
  const summary=el('p',included?'Already included — no purchase is needed.':!token?'Sign in to see your balance and options.':'Choose an amount and select Preview Lumen discount.');
  summary.setAttribute('role','status');
  const buy=el('button','Open discounted Stripe TEST checkout');buy.type='button';buy.className='btn';buy.disabled=true;
  let quote=null,requestId=null,revision=0;
  const reset=()=>{revision++;quote=null;requestId=null;buy.disabled=true;preview.disabled=false;summary.textContent='Selection changed. Verifying your new Lumen quote…';preview.click()};
  input.addEventListener('change',reset);
  preview.addEventListener('click',async()=>{
   const currentRevision=++revision;
   buy.disabled=true;quote=null;requestId=null;
   const n=Number(input.value);
   if(!Number.isSafeInteger(n)||n<1||n>Math.ceil(p.cents/7)){summary.textContent='Enter a valid whole Lumen amount.';return}
   preview.disabled=true;summary.textContent='Checking current wallet, access and price…';
   try{
    const d=await requestJson('/api/chart-mixed-test-quote?sku='+encodeURIComponent(p.sku)+'&lumens='+n);
    if(currentRevision!==revision)return;
    if(d.originalCents!==p.cents||d.selectedLumens!==n)throw Error('Quote no longer matches the selection.');
    summary.textContent='Available: '+d.availableLumens+' Lumens · Apply: '+n+' · Discount: '+usd(d.discountCents)+' · Card due: '+usd(d.cashDueCents)+' · Balance after: '+d.remainingLumens+'.';
    if(!d.checkoutActive){summary.textContent+=' TEST checkout is not authorized for this account.';return}
    quote=d;buy.disabled=false;
    buy.textContent=d.fullyCovered?'Redeem Lumens — no card charge (TEST)':'Pay '+usd(d.cashDueCents)+' using Stripe TEST';
   }catch(e){if(currentRevision===revision)summary.textContent=e.message}
   finally{if(currentRevision===revision)preview.disabled=false}
  });
  buy.addEventListener('click',async()=>{
   if(!quote||!quote.checkoutActive||buy.disabled)return;
   buy.disabled=true;summary.textContent='Reserving verified Lumens and creating TEST checkout…';
   try{
    requestId=requestId||crypto.randomUUID();
    const data=await requestJson('/api/chart-mixed-test-checkout',{method:'POST',
     headers:{'content-type':'application/json'},body:JSON.stringify({action:'start',sku:p.sku,lumens:quote.selectedLumens,requestId})});
    if(data.testOnly!==true||data.cashDueCents!==quote.cashDueCents)throw Error('Unexpected cash amount.');
    if(data.fullyLumens===true&&data.cashDueCents===0){window.location.assign(data.redirect);return}
    const dest=new URL(data.url);
    if(dest.protocol!=='https:'||dest.hostname!=='checkout.stripe.com')throw Error('Unverified checkout destination.');
    window.location.assign(dest.href);
   }catch(e){summary.textContent=e.message;buy.disabled=false}
  });
  section.append(heading,explain,label,preview,summary,buy);
  card.append(title,price,detail,terms,state,cash,section);
  // Read-only automatic quote for eligible QA members. Payment still requires explicit click.
  if(eligible)void preview.click();
  return card;
 }
 async function cancelOnReturn(){
  const id=new URLSearchParams(location.search).get('chart_mixed_cancel');
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id||'')||!token)return;
  try{await requestJson('/api/chart-mixed-test-checkout',{method:'POST',
   headers:{'content-type':'application/json'},body:JSON.stringify({action:'cancel',upgradeId:id})})}catch{/* Signed Stripe expiration event remains authoritative. */}
 }
 async function render(){await loadAccess();host.replaceChildren(...products.map(cardFor));await cancelOnReturn()}
 void render();
})();
