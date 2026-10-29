/* Universal Lumen checkout selection, priced from private verified catalog.
 * Preview only until provider-cash receipt + credit capture is atomically wired.
 * At 0 Lumens, existing checkout remains unchanged. Never mutate wallet here.
 */
(()=>{'use strict';
 const usd=cents=>(cents/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
 const by=id=>document.getElementById(id);
 const state={selected:0,price:null,balance:0,sku:null,verified:false,onChange:null,revision:0};
 const draw=()=>{
  if(!state.verified)return;
  const applied=Math.min(state.selected*7,state.price);
  const max=Math.min(state.balance,Math.ceil(state.price/7));
  by('lumen-used').textContent=String(state.selected);
  by('lumen-discount').textContent=usd(applied);
  by('lumen-cash-due').textContent=usd(state.price-applied);
  by('lumen-after').textContent=String(state.balance-state.selected);
  by('lumen-slider').value=String(state.selected);
  by('lumen-number').value=String(state.selected);
  by('lumen-max').textContent='Use max ('+max+')';
  const tooSmall=state.price-applied>0&&state.price-applied<50;
  by('lumen-status').textContent=tooSmall?'This selection leaves less than $0.50 payable. Choose fewer Lumens for an eligible card payment, or use enough to cover the whole product price.':state.selected===0?
   'You have selected no Lumens. The existing secure checkout will charge the verified full price.':
   'Preview only: the current payment flow does not apply Lumen discounts yet. A discounted checkout cannot proceed until payment and credit reservation are connected.';
  state.onChange?.(state.selected>0);
 };
 const set=(value)=>{
  if(!state.verified)return;
  const max=Math.min(state.balance,Math.ceil(state.price/7));
  const x=Number(value);
  state.selected=Number.isSafeInteger(x)?Math.max(0,Math.min(x,max)):0;
  draw();
 };
 async function mount({sku,expectedPriceCents,root,onChange}){
  state.revision++;const rev=state.revision;
  state.selected=0;state.price=null;state.balance=0;state.sku=sku;
  state.verified=false;state.onChange=onChange;
  if(!root)return;
  root.replaceChildren();
  const section=document.createElement('section');section.className='v13-card';section.id='lumen-selector';
  section.setAttribute('aria-label','Use Crownlight Lumens on this purchase');
  const h=document.createElement('h3');h.textContent='Use Crownlight Lumens';
  const expl=document.createElement('p');
  expl.textContent='Choose exactly how many whole Lumens to use. Each Lumen reduces the eligible price by $0.07; you may use some, all, or none of your balance.';
  const status=document.createElement('p');status.id='lumen-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent='Verifying price and Lumen balance…';
  const controls=document.createElement('div');controls.className='lumen-controls';
  const l=document.createElement('label');l.htmlFor='lumen-slider';l.textContent='Lumens to apply';
  const slider=document.createElement('input');slider.id='lumen-slider';slider.type='range';slider.min='0';slider.max='0';slider.step='1';slider.disabled=true;
  const number=document.createElement('input');number.id='lumen-number';number.type='number';number.min='0';number.step='1';number.disabled=true;
  const max=document.createElement('button');max.id='lumen-max';max.type='button';max.textContent='Use max';max.disabled=true;
  const zero=document.createElement('button');zero.type='button';zero.textContent='Use 0 Lumens';zero.disabled=true;
  controls.append(l,slider,number,max,zero);
  const summary=document.createElement('dl');summary.className='lumen-price-summary';
  for(const [label,id] of [['Lumens applied','lumen-used'],['Discount','lumen-discount'],['Cash due before tax/shipping','lumen-cash-due'],['Lumens remaining','lumen-after']]){
    const dt=document.createElement('dt');dt.textContent=label;
    const dd=document.createElement('dd');dd.id=id;dd.textContent='—';summary.append(dt,dd);
  }
  const foot=document.createElement('p');foot.className='small';
  foot.textContent='Subscription quotes apply to the current eligible payment only, not future renewals. Taxes, shipping, and separate fees are not reduced. A final Lumen can cover a smaller remainder than seven cents; no cash change.';
  section.append(h,expl,status,controls,summary,foot);root.append(section);
  try{
   const sb=await window.getSupabaseClient();
   const session=(await sb.auth.getSession()).data?.session;
   if(!session?.access_token)throw Error('Sign in to apply Lumens.');
   const r=await fetch('/api/member-lumen-checkout-quote?sku='+encodeURIComponent(sku)+'&lumens=0',
    {headers:{authorization:'Bearer '+session.access_token},cache:'no-store'});
   const d=await r.json().catch(()=>null);
   if(rev!==state.revision)return;
   if(!r.ok||d?.ok!==true)throw Error(d?.error||'No Lumen quote available.');
   if(d.alreadyIncluded){status.textContent='This product is already included. No purchase or Lumen deduction is needed.';return}
   if(!Number.isSafeInteger(d.priceCents)||d.priceCents!==expectedPriceCents||
      !Number.isSafeInteger(d.availableLumens)||d.unitValueCents!==7)
    throw Error('Product prices do not match. Lumen selection is unavailable; no discount will be applied.');
   const fresh=(await sb.auth.getSession()).data?.session;
   if(rev!==state.revision||fresh?.user?.id!==session.user.id)
    throw Error('Account changed before Lumen selection.');
   state.price=d.priceCents;state.balance=d.availableLumens;state.verified=true;
   const usable=d.maxLumensUsable;
   slider.max=String(usable);number.max=String(usable);
   slider.disabled=number.disabled=max.disabled=zero.disabled=false;
   slider.addEventListener('input',()=>set(slider.value));
   number.addEventListener('input',()=>set(number.value));
   max.addEventListener('click',()=>set(usable));
   zero.addEventListener('click',()=>set(0));
   draw();
  }catch(err){if(rev!==state.revision)return;
   status.textContent=(err.message||'Unable to verify Lumen balance.')+
    ' No Lumens will be deducted. Full-price checkout remains subject to its own verification.';
  }
 }
 window.CrownlightLumenCheckoutV1=Object.freeze({
  mount,
  getSelection:()=>state.verified?state.selected:0,
  clear:()=>{state.revision++;state.verified=false;state.selected=0;state.onChange?.(false)}
 });
})();
