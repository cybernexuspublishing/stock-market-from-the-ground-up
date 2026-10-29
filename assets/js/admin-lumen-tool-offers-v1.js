/* Owner-only Lumen fixed-term pass price editor in existing Admin Tools.
 * No direct wallet writes, billing or membership grants. Prices remain drafts
 * unless the Owner explicitly confirms activation.
 */
(()=>{'use strict';
const host=document.getElementById('admin-lumen-tool-offers');if(!host)return;
const mk=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el};
host.append(mk('h3','Lumen Tool Offers — Owner Pricing'));
host.append(mk('p','Configure five fixed durations per tool. A draft is not on sale. Activating an offer makes it eligible for a 100% Lumen-only purchase, without Stripe or automatic renewal. Every purchase still checks the buyer and included entitlements.'));
const status=mk('p','Verifying Owner access…');status.setAttribute('role','status');host.append(status);
const grid=mk('div');grid.className='admin-grid';host.append(grid);
async function api(input){
 const sb=await window.getSupabaseClient(),ses=(await sb.auth.getSession()).data?.session;
 if(!ses?.access_token)throw Error('Owner sign-in required');
 const r=await fetch('/api/owner-lumen-tool-offers',{method:input?'POST':'GET',cache:'no-store',
  credentials:'same-origin',headers:{authorization:'Bearer '+ses.access_token,
   ...(input?{'content-type':'application/json'}:{})},
  body:input?JSON.stringify(input):undefined});
 const j=await r.json().catch(()=>null);
 if(!r.ok||j?.ok!==true)throw Error(j?.error||'Owner offer management unavailable');
 return j;
}
async function refresh(){
 grid.replaceChildren();
 try{
  const data=await api(),offers=data.offers||[];
  const liveCents=data.policy?.active_cents||7;
  const proposedCents=data.policy?.proposed_cents||liveCents;
  status.textContent=offers.length+' Lumen tool duration offers. Active redemption rate: 
  for(const offer of offers){
   const card=mk('section');card.className='admin-card';
   card.append(mk('h4',offer.tool_code+' · '+offer.duration_days+' days'));
   const form=mk('form'),label=mk('label','One-time product price (USD cents) ');
   const price=mk('input');price.type='number';price.min='1';price.max='50000000';price.step='1';
   price.placeholder='Not priced';price.value=offer.price_cents==null?'':String(offer.price_cents);
   label.append(price);
   const stateLabel=mk('label',' Availability '),state=mk('select');
   for(const v of ['draft','active','retired']){
    const op=mk('option',v==='draft'?'Draft — hidden':v==='active'?'Active — purchasable':'Retired — not for sale');
    op.value=v;state.append(op);
   }state.value=offer.state;stateLabel.append(state);
   const customLabel=mk('label','Custom item price (whole Lumens; blank = automatic) ');
   const customInput=mk('input');customInput.type='number';customInput.min='1';
   customInput.max='10000000';customInput.step='1';
   customInput.placeholder='Automatic from USD price';
   customInput.value=offer.custom_lumens_cost==null?'':String(offer.custom_lumens_cost);
   customLabel.append(customInput);
   const estimate=mk('p',offer.price_cents==null?'Unpriced':
    offer.redemption_lumens_cost+' Lumens'+
    (offer.custom_lumens_cost==null?' (automatic from cash price)':' (Owner-defined item cost)'));
   const button=mk('button','Save offer');button.type='submit';button.className='btn';
   const message=mk('span','');message.setAttribute('role','status');
   form.append(label,customLabel,stateLabel,estimate,button,message);
   const updateEstimate=()=>{
    const cents=Number(price.value),override=customInput.value===''?null:Number(customInput.value);
    estimate.textContent=Number.isSafeInteger(cents)&&cents>0?
      (override==null?Math.ceil(cents/liveCents):override)+
      ' whole Lumens for 
   form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const cents=price.value===''?null:Number(price.value);
    if(cents!==null&&(!Number.isSafeInteger(cents)||cents<1)){
     message.textContent='Set a positive whole-cent price or leave Draft unpriced.';return}
    const custom=customInput.value===''?null:Number(customInput.value);
    if(custom!=null&&(!Number.isSafeInteger(custom)||custom<1||custom>10000000)){
     message.textContent='Enter a valid whole-Lumen item price.';return}
    const cost=custom??Math.ceil(cents/liveCents);
    if(state.value==='active'&&!window.confirm('ACTIVATE '+offer.tool_code+' for '+
      offer.duration_days+' days at '+cost+
      ' Lumens? Members will be able to redeem REAL non-expiring Lumens for this fixed-term, non-renewing offer.'))return;
    button.disabled=true;message.textContent='Saving…';
    try{
     await api({offerCode:offer.offer_code,version:offer.version,priceCents:cents,customLumensCost:custom,state:state.value});
     await refresh();
    }catch(e){message.textContent=e.message||'Could not save this offer';button.disabled=false}
   });
   card.append(form);grid.append(card);
  }
 }catch(e){status.textContent=e.message||'Only the Owner can edit these offers.'}
}
void refresh();
})();
+
   (liveCents/100).toFixed(2)+' per Lumen. All edits require verified Owner authorization.';
  const value=mk('section');value.className='admin-card';
  value.append(mk('h4','Global Lumen redemption value'));
  const expl=mk('p','The active rate is 
  for(const offer of offers){
   const card=mk('section');card.className='admin-card';
   card.append(mk('h4',offer.tool_code+' · '+offer.duration_days+' days'));
   const form=mk('form'),label=mk('label','One-time product price (USD cents) ');
   const price=mk('input');price.type='number';price.min='1';price.max='50000000';price.step='1';
   price.placeholder='Not priced';price.value=offer.price_cents==null?'':String(offer.price_cents);
   label.append(price);
   const stateLabel=mk('label',' Availability '),state=mk('select');
   for(const v of ['draft','active','retired']){
    const op=mk('option',v==='draft'?'Draft — hidden':v==='active'?'Active — purchasable':'Retired — not for sale');
    op.value=v;state.append(op);
   }state.value=offer.state;stateLabel.append(state);
   const estimate=mk('p',offer.price_cents==null?'Unpriced':offer.lumens_cost+' Lumens at $0.07 each');
   const button=mk('button','Save offer');button.type='submit';button.className='btn';
   const message=mk('span','');message.setAttribute('role','status');
   form.append(label,stateLabel,estimate,button,message);
   price.addEventListener('input',()=>{
    const cents=Number(price.value);
    estimate.textContent=Number.isSafeInteger(cents)&&cents>0?
      Math.ceil(cents/7)+' whole Lumens for $'+(cents/100).toFixed(2):'Unpriced';
   });
   form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const cents=price.value===''?null:Number(price.value);
    if(cents!==null&&(!Number.isSafeInteger(cents)||cents<1)){
     message.textContent='Set a positive whole-cent price or leave Draft unpriced.';return}
    if(state.value==='active'&&!window.confirm('ACTIVATE '+offer.tool_code+' for '+
      offer.duration_days+' days at '+Math.ceil(cents/7)+
      ' Lumens? Members will be able to redeem REAL non-expiring Lumens for this fixed-term, non-renewing offer.'))return;
    button.disabled=true;message.textContent='Saving…';
    try{
     await api({offerCode:offer.offer_code,version:offer.version,priceCents:cents,state:state.value});
     await refresh();
    }catch(e){message.textContent=e.message||'Could not save this offer';button.disabled=false}
   });
   card.append(form);grid.append(card);
  }
 }catch(e){status.textContent=e.message||'Only the Owner can edit these offers.'}
}
void refresh();
})();
+(liveCents/100).toFixed(2)+
   ' per Lumen. You can save a PROPOSED new rate here. It will not affect member wallets, historical purchases, or active checkouts until all provider, legal, and beta release tests have passed.');
  const valueForm=mk('form'),vlabel=mk('label','Proposed US cents per Lumen (1–100) ');
  const vinput=mk('input');vinput.type='number';vinput.min='1';vinput.max='100';vinput.step='1';
  vinput.value=String(proposedCents);vlabel.append(vinput);
  const vsubmit=mk('button','Save proposed Lumen value');vsubmit.type='submit';vsubmit.className='btn secondary';
  const vfeedback=mk('span',data.policy?.value_activation_state==='review_required'?
   ' Valuation change proposed; independent release verification required.':' No change to the active rate.');
  vfeedback.setAttribute('role','status');
  valueForm.append(vlabel,vsubmit,vfeedback);value.append(expl,valueForm);
  grid.append(value);
  valueForm.addEventListener('submit',async e=>{
   e.preventDefault();
   const cents=Number(vinput.value);
   if(!Number.isSafeInteger(cents)||cents<1||cents>100){
    vfeedback.textContent='Enter a whole-cent value from 1–100.';return}
   if(!window.confirm('Record proposed Lumen value 
  for(const offer of offers){
   const card=mk('section');card.className='admin-card';
   card.append(mk('h4',offer.tool_code+' · '+offer.duration_days+' days'));
   const form=mk('form'),label=mk('label','One-time product price (USD cents) ');
   const price=mk('input');price.type='number';price.min='1';price.max='50000000';price.step='1';
   price.placeholder='Not priced';price.value=offer.price_cents==null?'':String(offer.price_cents);
   label.append(price);
   const stateLabel=mk('label',' Availability '),state=mk('select');
   for(const v of ['draft','active','retired']){
    const op=mk('option',v==='draft'?'Draft — hidden':v==='active'?'Active — purchasable':'Retired — not for sale');
    op.value=v;state.append(op);
   }state.value=offer.state;stateLabel.append(state);
   const estimate=mk('p',offer.price_cents==null?'Unpriced':offer.lumens_cost+' Lumens at $0.07 each');
   const button=mk('button','Save offer');button.type='submit';button.className='btn';
   const message=mk('span','');message.setAttribute('role','status');
   form.append(label,stateLabel,estimate,button,message);
   price.addEventListener('input',()=>{
    const cents=Number(price.value);
    estimate.textContent=Number.isSafeInteger(cents)&&cents>0?
      Math.ceil(cents/7)+' whole Lumens for $'+(cents/100).toFixed(2):'Unpriced';
   });
   form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const cents=price.value===''?null:Number(price.value);
    if(cents!==null&&(!Number.isSafeInteger(cents)||cents<1)){
     message.textContent='Set a positive whole-cent price or leave Draft unpriced.';return}
    if(state.value==='active'&&!window.confirm('ACTIVATE '+offer.tool_code+' for '+
      offer.duration_days+' days at '+Math.ceil(cents/7)+
      ' Lumens? Members will be able to redeem REAL non-expiring Lumens for this fixed-term, non-renewing offer.'))return;
    button.disabled=true;message.textContent='Saving…';
    try{
     await api({offerCode:offer.offer_code,version:offer.version,priceCents:cents,state:state.value});
     await refresh();
    }catch(e){message.textContent=e.message||'Could not save this offer';button.disabled=false}
   });
   card.append(form);grid.append(card);
  }
 }catch(e){status.textContent=e.message||'Only the Owner can edit these offers.'}
}
void refresh();
})();
+(cents/100).toFixed(2)+
    '? The effective rate will remain 
  for(const offer of offers){
   const card=mk('section');card.className='admin-card';
   card.append(mk('h4',offer.tool_code+' · '+offer.duration_days+' days'));
   const form=mk('form'),label=mk('label','One-time product price (USD cents) ');
   const price=mk('input');price.type='number';price.min='1';price.max='50000000';price.step='1';
   price.placeholder='Not priced';price.value=offer.price_cents==null?'':String(offer.price_cents);
   label.append(price);
   const stateLabel=mk('label',' Availability '),state=mk('select');
   for(const v of ['draft','active','retired']){
    const op=mk('option',v==='draft'?'Draft — hidden':v==='active'?'Active — purchasable':'Retired — not for sale');
    op.value=v;state.append(op);
   }state.value=offer.state;stateLabel.append(state);
   const estimate=mk('p',offer.price_cents==null?'Unpriced':offer.lumens_cost+' Lumens at $0.07 each');
   const button=mk('button','Save offer');button.type='submit';button.className='btn';
   const message=mk('span','');message.setAttribute('role','status');
   form.append(label,stateLabel,estimate,button,message);
   price.addEventListener('input',()=>{
    const cents=Number(price.value);
    estimate.textContent=Number.isSafeInteger(cents)&&cents>0?
      Math.ceil(cents/7)+' whole Lumens for $'+(cents/100).toFixed(2):'Unpriced';
   });
   form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const cents=price.value===''?null:Number(price.value);
    if(cents!==null&&(!Number.isSafeInteger(cents)||cents<1)){
     message.textContent='Set a positive whole-cent price or leave Draft unpriced.';return}
    if(state.value==='active'&&!window.confirm('ACTIVATE '+offer.tool_code+' for '+
      offer.duration_days+' days at '+Math.ceil(cents/7)+
      ' Lumens? Members will be able to redeem REAL non-expiring Lumens for this fixed-term, non-renewing offer.'))return;
    button.disabled=true;message.textContent='Saving…';
    try{
     await api({offerCode:offer.offer_code,version:offer.version,priceCents:cents,state:state.value});
     await refresh();
    }catch(e){message.textContent=e.message||'Could not save this offer';button.disabled=false}
   });
   card.append(form);grid.append(card);
  }
 }catch(e){status.textContent=e.message||'Only the Owner can edit these offers.'}
}
void refresh();
})();
+(liveCents/100).toFixed(2)+
    ' until all finance and member beta tests are accepted.'))return;
   vsubmit.disabled=true;
   try{
    await api({action:'propose_unit_value',proposedCents:cents,revision:data.policy.revision});
    await refresh();
   }catch(e){vfeedback.textContent=e.message;vsubmit.disabled=false}
  });
  for(const offer of offers){
   const card=mk('section');card.className='admin-card';
   card.append(mk('h4',offer.tool_code+' · '+offer.duration_days+' days'));
   const form=mk('form'),label=mk('label','One-time product price (USD cents) ');
   const price=mk('input');price.type='number';price.min='1';price.max='50000000';price.step='1';
   price.placeholder='Not priced';price.value=offer.price_cents==null?'':String(offer.price_cents);
   label.append(price);
   const stateLabel=mk('label',' Availability '),state=mk('select');
   for(const v of ['draft','active','retired']){
    const op=mk('option',v==='draft'?'Draft — hidden':v==='active'?'Active — purchasable':'Retired — not for sale');
    op.value=v;state.append(op);
   }state.value=offer.state;stateLabel.append(state);
   const estimate=mk('p',offer.price_cents==null?'Unpriced':offer.lumens_cost+' Lumens at $0.07 each');
   const button=mk('button','Save offer');button.type='submit';button.className='btn';
   const message=mk('span','');message.setAttribute('role','status');
   form.append(label,stateLabel,estimate,button,message);
   price.addEventListener('input',()=>{
    const cents=Number(price.value);
    estimate.textContent=Number.isSafeInteger(cents)&&cents>0?
      Math.ceil(cents/7)+' whole Lumens for $'+(cents/100).toFixed(2):'Unpriced';
   });
   form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const cents=price.value===''?null:Number(price.value);
    if(cents!==null&&(!Number.isSafeInteger(cents)||cents<1)){
     message.textContent='Set a positive whole-cent price or leave Draft unpriced.';return}
    if(state.value==='active'&&!window.confirm('ACTIVATE '+offer.tool_code+' for '+
      offer.duration_days+' days at '+Math.ceil(cents/7)+
      ' Lumens? Members will be able to redeem REAL non-expiring Lumens for this fixed-term, non-renewing offer.'))return;
    button.disabled=true;message.textContent='Saving…';
    try{
     await api({offerCode:offer.offer_code,version:offer.version,priceCents:cents,state:state.value});
     await refresh();
    }catch(e){message.textContent=e.message||'Could not save this offer';button.disabled=false}
   });
   card.append(form);grid.append(card);
  }
 }catch(e){status.textContent=e.message||'Only the Owner can edit these offers.'}
}
void refresh();
})();
+(cents/100).toFixed(2)+
      (override==null?' — auto price at 
   form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const cents=price.value===''?null:Number(price.value);
    if(cents!==null&&(!Number.isSafeInteger(cents)||cents<1)){
     message.textContent='Set a positive whole-cent price or leave Draft unpriced.';return}
    if(state.value==='active'&&!window.confirm('ACTIVATE '+offer.tool_code+' for '+
      offer.duration_days+' days at '+Math.ceil(cents/7)+
      ' Lumens? Members will be able to redeem REAL non-expiring Lumens for this fixed-term, non-renewing offer.'))return;
    button.disabled=true;message.textContent='Saving…';
    try{
     await api({offerCode:offer.offer_code,version:offer.version,priceCents:cents,state:state.value});
     await refresh();
    }catch(e){message.textContent=e.message||'Could not save this offer';button.disabled=false}
   });
   card.append(form);grid.append(card);
  }
 }catch(e){status.textContent=e.message||'Only the Owner can edit these offers.'}
}
void refresh();
})();
+
   (liveCents/100).toFixed(2)+' per Lumen. All edits require verified Owner authorization.';
  const value=mk('section');value.className='admin-card';
  value.append(mk('h4','Global Lumen redemption value'));
  const expl=mk('p','The active rate is 
  for(const offer of offers){
   const card=mk('section');card.className='admin-card';
   card.append(mk('h4',offer.tool_code+' · '+offer.duration_days+' days'));
   const form=mk('form'),label=mk('label','One-time product price (USD cents) ');
   const price=mk('input');price.type='number';price.min='1';price.max='50000000';price.step='1';
   price.placeholder='Not priced';price.value=offer.price_cents==null?'':String(offer.price_cents);
   label.append(price);
   const stateLabel=mk('label',' Availability '),state=mk('select');
   for(const v of ['draft','active','retired']){
    const op=mk('option',v==='draft'?'Draft — hidden':v==='active'?'Active — purchasable':'Retired — not for sale');
    op.value=v;state.append(op);
   }state.value=offer.state;stateLabel.append(state);
   const estimate=mk('p',offer.price_cents==null?'Unpriced':offer.lumens_cost+' Lumens at $0.07 each');
   const button=mk('button','Save offer');button.type='submit';button.className='btn';
   const message=mk('span','');message.setAttribute('role','status');
   form.append(label,stateLabel,estimate,button,message);
   price.addEventListener('input',()=>{
    const cents=Number(price.value);
    estimate.textContent=Number.isSafeInteger(cents)&&cents>0?
      Math.ceil(cents/7)+' whole Lumens for $'+(cents/100).toFixed(2):'Unpriced';
   });
   form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const cents=price.value===''?null:Number(price.value);
    if(cents!==null&&(!Number.isSafeInteger(cents)||cents<1)){
     message.textContent='Set a positive whole-cent price or leave Draft unpriced.';return}
    if(state.value==='active'&&!window.confirm('ACTIVATE '+offer.tool_code+' for '+
      offer.duration_days+' days at '+Math.ceil(cents/7)+
      ' Lumens? Members will be able to redeem REAL non-expiring Lumens for this fixed-term, non-renewing offer.'))return;
    button.disabled=true;message.textContent='Saving…';
    try{
     await api({offerCode:offer.offer_code,version:offer.version,priceCents:cents,state:state.value});
     await refresh();
    }catch(e){message.textContent=e.message||'Could not save this offer';button.disabled=false}
   });
   card.append(form);grid.append(card);
  }
 }catch(e){status.textContent=e.message||'Only the Owner can edit these offers.'}
}
void refresh();
})();
+(liveCents/100).toFixed(2)+
   ' per Lumen. You can save a PROPOSED new rate here. It will not affect member wallets, historical purchases, or active checkouts until all provider, legal, and beta release tests have passed.');
  const valueForm=mk('form'),vlabel=mk('label','Proposed US cents per Lumen (1–100) ');
  const vinput=mk('input');vinput.type='number';vinput.min='1';vinput.max='100';vinput.step='1';
  vinput.value=String(proposedCents);vlabel.append(vinput);
  const vsubmit=mk('button','Save proposed Lumen value');vsubmit.type='submit';vsubmit.className='btn secondary';
  const vfeedback=mk('span',data.policy?.value_activation_state==='review_required'?
   ' Valuation change proposed; independent release verification required.':' No change to the active rate.');
  vfeedback.setAttribute('role','status');
  valueForm.append(vlabel,vsubmit,vfeedback);value.append(expl,valueForm);
  grid.append(value);
  valueForm.addEventListener('submit',async e=>{
   e.preventDefault();
   const cents=Number(vinput.value);
   if(!Number.isSafeInteger(cents)||cents<1||cents>100){
    vfeedback.textContent='Enter a whole-cent value from 1–100.';return}
   if(!window.confirm('Record proposed Lumen value 
  for(const offer of offers){
   const card=mk('section');card.className='admin-card';
   card.append(mk('h4',offer.tool_code+' · '+offer.duration_days+' days'));
   const form=mk('form'),label=mk('label','One-time product price (USD cents) ');
   const price=mk('input');price.type='number';price.min='1';price.max='50000000';price.step='1';
   price.placeholder='Not priced';price.value=offer.price_cents==null?'':String(offer.price_cents);
   label.append(price);
   const stateLabel=mk('label',' Availability '),state=mk('select');
   for(const v of ['draft','active','retired']){
    const op=mk('option',v==='draft'?'Draft — hidden':v==='active'?'Active — purchasable':'Retired — not for sale');
    op.value=v;state.append(op);
   }state.value=offer.state;stateLabel.append(state);
   const estimate=mk('p',offer.price_cents==null?'Unpriced':offer.lumens_cost+' Lumens at $0.07 each');
   const button=mk('button','Save offer');button.type='submit';button.className='btn';
   const message=mk('span','');message.setAttribute('role','status');
   form.append(label,stateLabel,estimate,button,message);
   price.addEventListener('input',()=>{
    const cents=Number(price.value);
    estimate.textContent=Number.isSafeInteger(cents)&&cents>0?
      Math.ceil(cents/7)+' whole Lumens for $'+(cents/100).toFixed(2):'Unpriced';
   });
   form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const cents=price.value===''?null:Number(price.value);
    if(cents!==null&&(!Number.isSafeInteger(cents)||cents<1)){
     message.textContent='Set a positive whole-cent price or leave Draft unpriced.';return}
    if(state.value==='active'&&!window.confirm('ACTIVATE '+offer.tool_code+' for '+
      offer.duration_days+' days at '+Math.ceil(cents/7)+
      ' Lumens? Members will be able to redeem REAL non-expiring Lumens for this fixed-term, non-renewing offer.'))return;
    button.disabled=true;message.textContent='Saving…';
    try{
     await api({offerCode:offer.offer_code,version:offer.version,priceCents:cents,state:state.value});
     await refresh();
    }catch(e){message.textContent=e.message||'Could not save this offer';button.disabled=false}
   });
   card.append(form);grid.append(card);
  }
 }catch(e){status.textContent=e.message||'Only the Owner can edit these offers.'}
}
void refresh();
})();
+(cents/100).toFixed(2)+
    '? The effective rate will remain 
  for(const offer of offers){
   const card=mk('section');card.className='admin-card';
   card.append(mk('h4',offer.tool_code+' · '+offer.duration_days+' days'));
   const form=mk('form'),label=mk('label','One-time product price (USD cents) ');
   const price=mk('input');price.type='number';price.min='1';price.max='50000000';price.step='1';
   price.placeholder='Not priced';price.value=offer.price_cents==null?'':String(offer.price_cents);
   label.append(price);
   const stateLabel=mk('label',' Availability '),state=mk('select');
   for(const v of ['draft','active','retired']){
    const op=mk('option',v==='draft'?'Draft — hidden':v==='active'?'Active — purchasable':'Retired — not for sale');
    op.value=v;state.append(op);
   }state.value=offer.state;stateLabel.append(state);
   const estimate=mk('p',offer.price_cents==null?'Unpriced':offer.lumens_cost+' Lumens at $0.07 each');
   const button=mk('button','Save offer');button.type='submit';button.className='btn';
   const message=mk('span','');message.setAttribute('role','status');
   form.append(label,stateLabel,estimate,button,message);
   price.addEventListener('input',()=>{
    const cents=Number(price.value);
    estimate.textContent=Number.isSafeInteger(cents)&&cents>0?
      Math.ceil(cents/7)+' whole Lumens for $'+(cents/100).toFixed(2):'Unpriced';
   });
   form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const cents=price.value===''?null:Number(price.value);
    if(cents!==null&&(!Number.isSafeInteger(cents)||cents<1)){
     message.textContent='Set a positive whole-cent price or leave Draft unpriced.';return}
    if(state.value==='active'&&!window.confirm('ACTIVATE '+offer.tool_code+' for '+
      offer.duration_days+' days at '+Math.ceil(cents/7)+
      ' Lumens? Members will be able to redeem REAL non-expiring Lumens for this fixed-term, non-renewing offer.'))return;
    button.disabled=true;message.textContent='Saving…';
    try{
     await api({offerCode:offer.offer_code,version:offer.version,priceCents:cents,state:state.value});
     await refresh();
    }catch(e){message.textContent=e.message||'Could not save this offer';button.disabled=false}
   });
   card.append(form);grid.append(card);
  }
 }catch(e){status.textContent=e.message||'Only the Owner can edit these offers.'}
}
void refresh();
})();
+(liveCents/100).toFixed(2)+
    ' until all finance and member beta tests are accepted.'))return;
   vsubmit.disabled=true;
   try{
    await api({action:'propose_unit_value',proposedCents:cents,revision:data.policy.revision});
    await refresh();
   }catch(e){vfeedback.textContent=e.message;vsubmit.disabled=false}
  });
  for(const offer of offers){
   const card=mk('section');card.className='admin-card';
   card.append(mk('h4',offer.tool_code+' · '+offer.duration_days+' days'));
   const form=mk('form'),label=mk('label','One-time product price (USD cents) ');
   const price=mk('input');price.type='number';price.min='1';price.max='50000000';price.step='1';
   price.placeholder='Not priced';price.value=offer.price_cents==null?'':String(offer.price_cents);
   label.append(price);
   const stateLabel=mk('label',' Availability '),state=mk('select');
   for(const v of ['draft','active','retired']){
    const op=mk('option',v==='draft'?'Draft — hidden':v==='active'?'Active — purchasable':'Retired — not for sale');
    op.value=v;state.append(op);
   }state.value=offer.state;stateLabel.append(state);
   const estimate=mk('p',offer.price_cents==null?'Unpriced':offer.lumens_cost+' Lumens at $0.07 each');
   const button=mk('button','Save offer');button.type='submit';button.className='btn';
   const message=mk('span','');message.setAttribute('role','status');
   form.append(label,stateLabel,estimate,button,message);
   price.addEventListener('input',()=>{
    const cents=Number(price.value);
    estimate.textContent=Number.isSafeInteger(cents)&&cents>0?
      Math.ceil(cents/7)+' whole Lumens for $'+(cents/100).toFixed(2):'Unpriced';
   });
   form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const cents=price.value===''?null:Number(price.value);
    if(cents!==null&&(!Number.isSafeInteger(cents)||cents<1)){
     message.textContent='Set a positive whole-cent price or leave Draft unpriced.';return}
    if(state.value==='active'&&!window.confirm('ACTIVATE '+offer.tool_code+' for '+
      offer.duration_days+' days at '+Math.ceil(cents/7)+
      ' Lumens? Members will be able to redeem REAL non-expiring Lumens for this fixed-term, non-renewing offer.'))return;
    button.disabled=true;message.textContent='Saving…';
    try{
     await api({offerCode:offer.offer_code,version:offer.version,priceCents:cents,state:state.value});
     await refresh();
    }catch(e){message.textContent=e.message||'Could not save this offer';button.disabled=false}
   });
   card.append(form);grid.append(card);
  }
 }catch(e){status.textContent=e.message||'Only the Owner can edit these offers.'}
}
void refresh();
})();
+(liveCents/100).toFixed(2):' — custom item price'):
      'Enter a cash price to make a SKU sellable; the Lumen override can be saved as a Draft.';
   };
   price.addEventListener('input',updateEstimate);
   customInput.addEventListener('input',updateEstimate);
   form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const cents=price.value===''?null:Number(price.value);
    if(cents!==null&&(!Number.isSafeInteger(cents)||cents<1)){
     message.textContent='Set a positive whole-cent price or leave Draft unpriced.';return}
    if(state.value==='active'&&!window.confirm('ACTIVATE '+offer.tool_code+' for '+
      offer.duration_days+' days at '+Math.ceil(cents/7)+
      ' Lumens? Members will be able to redeem REAL non-expiring Lumens for this fixed-term, non-renewing offer.'))return;
    button.disabled=true;message.textContent='Saving…';
    try{
     await api({offerCode:offer.offer_code,version:offer.version,priceCents:cents,state:state.value});
     await refresh();
    }catch(e){message.textContent=e.message||'Could not save this offer';button.disabled=false}
   });
   card.append(form);grid.append(card);
  }
 }catch(e){status.textContent=e.message||'Only the Owner can edit these offers.'}
}
void refresh();
})();
+
   (liveCents/100).toFixed(2)+' per Lumen. All edits require verified Owner authorization.';
  const value=mk('section');value.className='admin-card';
  value.append(mk('h4','Global Lumen redemption value'));
  const expl=mk('p','The active rate is 
  for(const offer of offers){
   const card=mk('section');card.className='admin-card';
   card.append(mk('h4',offer.tool_code+' · '+offer.duration_days+' days'));
   const form=mk('form'),label=mk('label','One-time product price (USD cents) ');
   const price=mk('input');price.type='number';price.min='1';price.max='50000000';price.step='1';
   price.placeholder='Not priced';price.value=offer.price_cents==null?'':String(offer.price_cents);
   label.append(price);
   const stateLabel=mk('label',' Availability '),state=mk('select');
   for(const v of ['draft','active','retired']){
    const op=mk('option',v==='draft'?'Draft — hidden':v==='active'?'Active — purchasable':'Retired — not for sale');
    op.value=v;state.append(op);
   }state.value=offer.state;stateLabel.append(state);
   const estimate=mk('p',offer.price_cents==null?'Unpriced':offer.lumens_cost+' Lumens at $0.07 each');
   const button=mk('button','Save offer');button.type='submit';button.className='btn';
   const message=mk('span','');message.setAttribute('role','status');
   form.append(label,stateLabel,estimate,button,message);
   price.addEventListener('input',()=>{
    const cents=Number(price.value);
    estimate.textContent=Number.isSafeInteger(cents)&&cents>0?
      Math.ceil(cents/7)+' whole Lumens for $'+(cents/100).toFixed(2):'Unpriced';
   });
   form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const cents=price.value===''?null:Number(price.value);
    if(cents!==null&&(!Number.isSafeInteger(cents)||cents<1)){
     message.textContent='Set a positive whole-cent price or leave Draft unpriced.';return}
    if(state.value==='active'&&!window.confirm('ACTIVATE '+offer.tool_code+' for '+
      offer.duration_days+' days at '+Math.ceil(cents/7)+
      ' Lumens? Members will be able to redeem REAL non-expiring Lumens for this fixed-term, non-renewing offer.'))return;
    button.disabled=true;message.textContent='Saving…';
    try{
     await api({offerCode:offer.offer_code,version:offer.version,priceCents:cents,state:state.value});
     await refresh();
    }catch(e){message.textContent=e.message||'Could not save this offer';button.disabled=false}
   });
   card.append(form);grid.append(card);
  }
 }catch(e){status.textContent=e.message||'Only the Owner can edit these offers.'}
}
void refresh();
})();
+(liveCents/100).toFixed(2)+
   ' per Lumen. You can save a PROPOSED new rate here. It will not affect member wallets, historical purchases, or active checkouts until all provider, legal, and beta release tests have passed.');
  const valueForm=mk('form'),vlabel=mk('label','Proposed US cents per Lumen (1–100) ');
  const vinput=mk('input');vinput.type='number';vinput.min='1';vinput.max='100';vinput.step='1';
  vinput.value=String(proposedCents);vlabel.append(vinput);
  const vsubmit=mk('button','Save proposed Lumen value');vsubmit.type='submit';vsubmit.className='btn secondary';
  const vfeedback=mk('span',data.policy?.value_activation_state==='review_required'?
   ' Valuation change proposed; independent release verification required.':' No change to the active rate.');
  vfeedback.setAttribute('role','status');
  valueForm.append(vlabel,vsubmit,vfeedback);value.append(expl,valueForm);
  grid.append(value);
  valueForm.addEventListener('submit',async e=>{
   e.preventDefault();
   const cents=Number(vinput.value);
   if(!Number.isSafeInteger(cents)||cents<1||cents>100){
    vfeedback.textContent='Enter a whole-cent value from 1–100.';return}
   if(!window.confirm('Record proposed Lumen value 
  for(const offer of offers){
   const card=mk('section');card.className='admin-card';
   card.append(mk('h4',offer.tool_code+' · '+offer.duration_days+' days'));
   const form=mk('form'),label=mk('label','One-time product price (USD cents) ');
   const price=mk('input');price.type='number';price.min='1';price.max='50000000';price.step='1';
   price.placeholder='Not priced';price.value=offer.price_cents==null?'':String(offer.price_cents);
   label.append(price);
   const stateLabel=mk('label',' Availability '),state=mk('select');
   for(const v of ['draft','active','retired']){
    const op=mk('option',v==='draft'?'Draft — hidden':v==='active'?'Active — purchasable':'Retired — not for sale');
    op.value=v;state.append(op);
   }state.value=offer.state;stateLabel.append(state);
   const estimate=mk('p',offer.price_cents==null?'Unpriced':offer.lumens_cost+' Lumens at $0.07 each');
   const button=mk('button','Save offer');button.type='submit';button.className='btn';
   const message=mk('span','');message.setAttribute('role','status');
   form.append(label,stateLabel,estimate,button,message);
   price.addEventListener('input',()=>{
    const cents=Number(price.value);
    estimate.textContent=Number.isSafeInteger(cents)&&cents>0?
      Math.ceil(cents/7)+' whole Lumens for $'+(cents/100).toFixed(2):'Unpriced';
   });
   form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const cents=price.value===''?null:Number(price.value);
    if(cents!==null&&(!Number.isSafeInteger(cents)||cents<1)){
     message.textContent='Set a positive whole-cent price or leave Draft unpriced.';return}
    if(state.value==='active'&&!window.confirm('ACTIVATE '+offer.tool_code+' for '+
      offer.duration_days+' days at '+Math.ceil(cents/7)+
      ' Lumens? Members will be able to redeem REAL non-expiring Lumens for this fixed-term, non-renewing offer.'))return;
    button.disabled=true;message.textContent='Saving…';
    try{
     await api({offerCode:offer.offer_code,version:offer.version,priceCents:cents,state:state.value});
     await refresh();
    }catch(e){message.textContent=e.message||'Could not save this offer';button.disabled=false}
   });
   card.append(form);grid.append(card);
  }
 }catch(e){status.textContent=e.message||'Only the Owner can edit these offers.'}
}
void refresh();
})();
+(cents/100).toFixed(2)+
    '? The effective rate will remain 
  for(const offer of offers){
   const card=mk('section');card.className='admin-card';
   card.append(mk('h4',offer.tool_code+' · '+offer.duration_days+' days'));
   const form=mk('form'),label=mk('label','One-time product price (USD cents) ');
   const price=mk('input');price.type='number';price.min='1';price.max='50000000';price.step='1';
   price.placeholder='Not priced';price.value=offer.price_cents==null?'':String(offer.price_cents);
   label.append(price);
   const stateLabel=mk('label',' Availability '),state=mk('select');
   for(const v of ['draft','active','retired']){
    const op=mk('option',v==='draft'?'Draft — hidden':v==='active'?'Active — purchasable':'Retired — not for sale');
    op.value=v;state.append(op);
   }state.value=offer.state;stateLabel.append(state);
   const estimate=mk('p',offer.price_cents==null?'Unpriced':offer.lumens_cost+' Lumens at $0.07 each');
   const button=mk('button','Save offer');button.type='submit';button.className='btn';
   const message=mk('span','');message.setAttribute('role','status');
   form.append(label,stateLabel,estimate,button,message);
   price.addEventListener('input',()=>{
    const cents=Number(price.value);
    estimate.textContent=Number.isSafeInteger(cents)&&cents>0?
      Math.ceil(cents/7)+' whole Lumens for $'+(cents/100).toFixed(2):'Unpriced';
   });
   form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const cents=price.value===''?null:Number(price.value);
    if(cents!==null&&(!Number.isSafeInteger(cents)||cents<1)){
     message.textContent='Set a positive whole-cent price or leave Draft unpriced.';return}
    if(state.value==='active'&&!window.confirm('ACTIVATE '+offer.tool_code+' for '+
      offer.duration_days+' days at '+Math.ceil(cents/7)+
      ' Lumens? Members will be able to redeem REAL non-expiring Lumens for this fixed-term, non-renewing offer.'))return;
    button.disabled=true;message.textContent='Saving…';
    try{
     await api({offerCode:offer.offer_code,version:offer.version,priceCents:cents,state:state.value});
     await refresh();
    }catch(e){message.textContent=e.message||'Could not save this offer';button.disabled=false}
   });
   card.append(form);grid.append(card);
  }
 }catch(e){status.textContent=e.message||'Only the Owner can edit these offers.'}
}
void refresh();
})();
+(liveCents/100).toFixed(2)+
    ' until all finance and member beta tests are accepted.'))return;
   vsubmit.disabled=true;
   try{
    await api({action:'propose_unit_value',proposedCents:cents,revision:data.policy.revision});
    await refresh();
   }catch(e){vfeedback.textContent=e.message;vsubmit.disabled=false}
  });
  for(const offer of offers){
   const card=mk('section');card.className='admin-card';
   card.append(mk('h4',offer.tool_code+' · '+offer.duration_days+' days'));
   const form=mk('form'),label=mk('label','One-time product price (USD cents) ');
   const price=mk('input');price.type='number';price.min='1';price.max='50000000';price.step='1';
   price.placeholder='Not priced';price.value=offer.price_cents==null?'':String(offer.price_cents);
   label.append(price);
   const stateLabel=mk('label',' Availability '),state=mk('select');
   for(const v of ['draft','active','retired']){
    const op=mk('option',v==='draft'?'Draft — hidden':v==='active'?'Active — purchasable':'Retired — not for sale');
    op.value=v;state.append(op);
   }state.value=offer.state;stateLabel.append(state);
   const estimate=mk('p',offer.price_cents==null?'Unpriced':offer.lumens_cost+' Lumens at $0.07 each');
   const button=mk('button','Save offer');button.type='submit';button.className='btn';
   const message=mk('span','');message.setAttribute('role','status');
   form.append(label,stateLabel,estimate,button,message);
   price.addEventListener('input',()=>{
    const cents=Number(price.value);
    estimate.textContent=Number.isSafeInteger(cents)&&cents>0?
      Math.ceil(cents/7)+' whole Lumens for $'+(cents/100).toFixed(2):'Unpriced';
   });
   form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const cents=price.value===''?null:Number(price.value);
    if(cents!==null&&(!Number.isSafeInteger(cents)||cents<1)){
     message.textContent='Set a positive whole-cent price or leave Draft unpriced.';return}
    if(state.value==='active'&&!window.confirm('ACTIVATE '+offer.tool_code+' for '+
      offer.duration_days+' days at '+Math.ceil(cents/7)+
      ' Lumens? Members will be able to redeem REAL non-expiring Lumens for this fixed-term, non-renewing offer.'))return;
    button.disabled=true;message.textContent='Saving…';
    try{
     await api({offerCode:offer.offer_code,version:offer.version,priceCents:cents,state:state.value});
     await refresh();
    }catch(e){message.textContent=e.message||'Could not save this offer';button.disabled=false}
   });
   card.append(form);grid.append(card);
  }
 }catch(e){status.textContent=e.message||'Only the Owner can edit these offers.'}
}
void refresh();
})();
