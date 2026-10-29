/* Catalog-wide Owner cost editor; drafts only. An SKU's cost in Lumens
 * is independent of how many USD cents a Lumen covers at mixed checkout.
 */
(()=>{'use strict';
 const host=document.getElementById('admin-lumen-item-prices');if(!host)return;
 const el=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x};
 const h=el('h3','Lumen Prices — All Store Items');
 const note=el('p','Set a separate whole-Lumen cost for any existing Store product, or leave it blank for automatic conversion. These are pricing DRAFTS; saving does not activate checkout, change Stripe prices, publish an item, or debit a wallet.');
 const filter=el('input');filter.type='search';filter.placeholder='Search product, SKU or category';filter.setAttribute('aria-label','Filter Store products');
 const status=el('p','Checking private Owner catalog…');status.setAttribute('role','status');
 const list=el('div');list.className='admin-grid';
 host.append(h,note,filter,status,list);
 let products=[],cents=7;
 async function api(payload){
  const sb=await window.getSupabaseClient(),session=(await sb.auth.getSession()).data?.session;
  if(!session?.access_token)throw Error('Owner sign-in required');
  const r=await fetch('/api/owner-lumen-item-prices',{method:payload?'POST':'GET',
   headers:{authorization:'Bearer '+session.access_token,...(payload?{'content-type':'application/json'}:{})},
   credentials:'same-origin',cache:'no-store',
   body:payload?JSON.stringify(payload):undefined});
  const d=await r.json().catch(()=>null);
  if(!r.ok||d?.ok!==true)throw Error(d?.error||'Pricing service unavailable');
  return d;
 }
 function card(item){
  const c=el('article');c.className='admin-card';
  const title=el('h4',item.display_name);
  c.append(title,el('p',item.sku+' · '+item.category+' · '+item.status));
  const rule=item.rule;
  if(!rule){c.append(el('p','This new Store item has no pricing row yet; run catalog synchronization before editing.'));return c}
  const form=el('form');
  const label=el('label','Custom full-item price (Lumens) ');
  const input=el('input');input.type='number';input.min='1';input.max='10000000';input.step='1';
  input.placeholder='Auto: cash price ÷ active value';
  input.value=rule.custom_full_lumens===null?'':String(rule.custom_full_lumens);
  label.append(input);
  const partialLabel=el('label'),partial=el('input');partial.type='checkbox';partial.checked=rule.partial_discount_allowed;
  partialLabel.append(partial,document.createTextNode(' Allow partial Lumen discounts after provider acceptance'));
  const fullLabel=el('label'),full=el('input');full.type='checkbox';full.checked=rule.full_redemption_allowed;
  fullLabel.append(full,document.createTextNode(' Allow full-Lumen redemption after entitlement/fulfillment acceptance'));
  const state=el('label'),dropdown=el('select');
  for(const key of ['draft','review_required','retired']){const option=el('option',key.replaceAll('_',' '));option.value=key;dropdown.append(option)}
  dropdown.value=rule.release_state;state.append(' Draft policy ',dropdown);
  const button=el('button','Save Lumen cost');button.className='btn secondary';button.type='submit';
  const msg=el('span','');msg.setAttribute('role','status');
  form.append(label,partialLabel,fullLabel,state,button,msg);
  form.addEventListener('submit',async e=>{
   e.preventDefault();
   const n=input.value===''?null:Number(input.value);
   if(n!==null&&(!Number.isSafeInteger(n)||n<1||n>10000000)){
    msg.textContent='Enter a whole Lumen price between 1 and 10,000,000.';return}
   button.disabled=true;msg.textContent='Saving private draft…';
   try{
    await api({sku:item.sku,version:rule.version,customFullLumens:n,
     partialDiscountAllowed:partial.checked,fullRedemptionAllowed:full.checked,
     releaseState:dropdown.value});
    await load();
   }catch(err){msg.textContent=err.message;button.disabled=false}
  });
  c.append(form);return c;
 }
 function render(){
  list.replaceChildren();
  const query=filter.value.trim().toLowerCase();
  const matches=products.filter(x=>!query||[x.display_name,x.sku,x.category].some(y=>String(y).toLowerCase().includes(query)));
  const count=el('p',matches.length+' matching Store items · active redemption value $'+(cents/100).toFixed(2));
  list.append(count);
  for(const item of matches)list.append(card(item));
 }
 async function load(){
  try{
   const d=await api();products=d.items||[];cents=d.activeCents||7;
   status.textContent=products.length+' existing Store SKUs. Draft-only editor; member purchases are still controlled by the verified release gates.';
   render();
  }catch(e){status.textContent=e.message||'Unable to verify Owner catalog.'}
 }
 filter.addEventListener('input',render);
 void load();
})();
