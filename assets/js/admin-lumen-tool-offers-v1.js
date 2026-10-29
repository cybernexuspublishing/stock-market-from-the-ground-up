/* Owner-only Lumen valuation proposal and fixed-term tool price editor.
 * Proposing a new redemption rate does not activate it or modify past sales.
 */
(()=>{'use strict';
 const host=document.getElementById('admin-lumen-tool-offers');if(!host)return;
 const mk=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x};
 const currency=String.fromCharCode(36);
 const title=mk('h3','Lumen Tool Offers and Global Value');
 const explanation=mk('p','Manage fixed-term tool prices in cash cents or set an independent whole-Lumen cost. Only separately verified release gates can activate selling.');
 const status=mk('p','Verifying Owner access…');status.setAttribute('role','status');
 const grid=mk('div');grid.className='admin-grid';
 host.append(title,explanation,status,grid);
 async function api(input){
  const client=await window.getSupabaseClient();
  const session=(await client.auth.getSession()).data?.session;
  if(!session?.access_token)throw Error('Owner sign-in required.');
  const r=await fetch('/api/owner-lumen-tool-offers',{
   method:input?'POST':'GET',credentials:'same-origin',cache:'no-store',
   headers:{authorization:'Bearer '+session.access_token,...(input?{'content-type':'application/json'}:{})},
   body:input?JSON.stringify(input):undefined
  });
  const data=await r.json().catch(()=>null);
  if(!r.ok||data?.ok!==true)throw Error(data?.error||'Lumen pricing unavailable.');
  return data;
 }
 function pricePreview(cents,custom,unit){
  if(cents===null)return 'No cash price: this offer remains Draft.';
  const cost=custom===null?Math.ceil(cents/unit):custom;
  return cost+' Lumens for '+currency+(cents/100).toFixed(2)+
   (custom===null?' (automatic)':' (Owner-defined Lumen cost)');
 }
 function createUnitEditor(policy){
  const card=mk('section');card.className='admin-card';
  card.append(mk('h4','Global Lumen redemption value'));
  const active=policy.active_cents,proposed=policy.proposed_cents;
  card.append(mk('p','Active value: '+currency+(active/100).toFixed(2)+' per Lumen. Proposed value: '+currency+
   (proposed/100).toFixed(2)+'. Changing the proposal does not alter checkout until independent Stripe, Supabase, Cloudflare, legal and member-acceptance checks pass.'));
  const form=mk('form'),lab=mk('label','Proposed whole USD cents per Lumen (1–100) ');
  const input=mk('input');input.type='number';input.min='1';input.max='100';input.step='1';input.value=String(proposed);lab.append(input);
  const save=mk('button','Save proposed value');save.type='submit';save.className='btn secondary';
  const msg=mk('span','');msg.setAttribute('role','status');
  form.append(lab,save,msg);card.append(form);
  form.addEventListener('submit',async e=>{
   e.preventDefault();const cents=Number(input.value);
   if(!Number.isSafeInteger(cents)||cents<1||cents>100){msg.textContent='Choose a whole cent value from 1 to 100.';return}
   if(!window.confirm('Propose '+currency+(cents/100).toFixed(2)+
    ' per Lumen? Active member pricing stays at '+currency+(active/100).toFixed(2)+
    ' until release verification is completed.'))return;
   save.disabled=true;msg.textContent='Saving audited proposal…';
   try{await api({action:'propose_unit_value',proposedCents:cents,revision:policy.revision});await refresh()}
   catch(err){msg.textContent=err.message;save.disabled=false}
  });
  return card;
 }
 function createOfferEditor(offer,unit){
  const card=mk('section');card.className='admin-card';
  card.append(mk('h4',offer.tool_code+' — '+offer.duration_days+' days'));
  const form=mk('form');
  const priceLabel=mk('label','USD price in cents (required before active purchase) ');
  const cash=mk('input');cash.type='number';cash.step='1';cash.min='1';cash.max='50000000';
  cash.placeholder='Unpriced';cash.value=offer.price_cents==null?'':String(offer.price_cents);
  priceLabel.append(cash);
  const lumenLabel=mk('label','Optional custom item price in whole Lumens ');
  const lumens=mk('input');lumens.type='number';lumens.min='1';lumens.max='10000000';lumens.step='1';
  lumens.placeholder='Automatic from cash price';
  lumens.value=offer.custom_lumens_cost==null?'':String(offer.custom_lumens_cost);
  lumenLabel.append(lumens);
  const stateLabel=mk('label',' Availability '),state=mk('select');
  for(const key of ['draft','active','retired']){
   const option=mk('option',key==='draft'?'Draft — not sellable':key==='active'?'Active — only if fully release-tested':'Retired');
   option.value=key;state.append(option);
  }
  state.value=offer.state;stateLabel.append(state);
  const estimate=mk('p','');
  const refreshEstimate=()=>{
   const c=cash.value===''?null:Number(cash.value);
   const q=lumens.value===''?null:Number(lumens.value);
   estimate.textContent=pricePreview(c,q,unit);
  };
  cash.addEventListener('input',refreshEstimate);lumens.addEventListener('input',refreshEstimate);
  refreshEstimate();
  const save=mk('button','Save tool price');save.className='btn secondary';save.type='submit';
  const msg=mk('span','');msg.setAttribute('role','status');
  form.append(priceLabel,lumenLabel,stateLabel,estimate,save,msg);card.append(form);
  form.addEventListener('submit',async e=>{
   e.preventDefault();
   const cents=cash.value===''?null:Number(cash.value);
   const cost=lumens.value===''?null:Number(lumens.value);
   if(cents!==null&&(!Number.isSafeInteger(cents)||cents<1||cents>50000000)){
    msg.textContent='Invalid whole-cent cash price.';return;
   }
   if(cost!==null&&(!Number.isSafeInteger(cost)||cost<1||cost>10000000)){
    msg.textContent='Invalid whole-Lumen custom item price.';return;
   }
   if(state.value==='active'){
    if(cents===null){msg.textContent='Enter a verified cash price before attempting activation.';return}
    if(!window.confirm('Request ACTIVE selling for this tool? The backend will reject unverified product gates.'))return;
   }
   save.disabled=true;msg.textContent='Saving audited product price…';
   try{
    await api({offerCode:offer.offer_code,version:offer.version,priceCents:cents,customLumensCost:cost,state:state.value});
    await refresh();
   }catch(err){msg.textContent=err.message;save.disabled=false}
  });
  return card;
 }
 async function refresh(){
  grid.replaceChildren();status.textContent='Refreshing current policy and draft prices…';
  try{
   const data=await api(),policy=data.policy;
   if(!policy||!Number.isSafeInteger(policy.active_cents))throw Error('Lumen settings unavailable.');
   status.textContent=data.offers.length+' fixed-term offers. Active value: '+currency+
    (policy.active_cents/100).toFixed(2)+'. New offer activation requires accepted release gates.';
   grid.append(createUnitEditor(policy));
   for(const offer of data.offers)grid.append(createOfferEditor(offer,policy.active_cents));
  }catch(err){status.textContent=err.message||'Owner pricing temporarily unavailable.'}
 }
 void refresh();
})();
