/* Owner Sparks pricing editor. Catalog-controlled prices; no arbitrary access grants. */
(()=>{'use strict';
const root=()=>document.getElementById('admin-sparks-pricing-root');
const el=(tag,cls,txt)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(txt!==undefined)node.textContent=String(txt);return node;};
const control=(label,value,kind='text')=>{
 const wrap=el('label','sp-price-field');wrap.append(el('span','',label));
 const input=el('input');input.type=kind;input.value=value??'';input.setAttribute('aria-label',label);
 if(kind==='number'){input.min='1';input.max='100000';input.step='1';input.inputMode='numeric';}
 wrap.append(input);return {wrap,input};
};
const stateSelect=value=>{
 const select=el('select');select.setAttribute('aria-label','Offer release status');
 for(const [v,t] of [['active','Active'],['planned','Planned'],['disabled','Disabled']]){
  const option=new Option(t,v);select.add(option);
 }
 select.value=value;return select;
};
async function api(action,body){
 const client=await window.getSupabaseClient();
 const session=(await client.auth.getSession()).data?.session;
 if(!session?.access_token)throw Error('Owner session expired. Sign in again.');
 const response=await fetch('/api/admin?action='+encodeURIComponent(action),{
  method:body?'POST':'GET',
  headers:{authorization:'Bearer '+session.access_token,...(body?{'content-type':'application/json'}:{})},
  credentials:'same-origin',cache:'no-store',body:body?JSON.stringify(body):undefined
 });
 const result=await response.json().catch(()=>({}));
 if(!response.ok||result.ok!==true)throw Error(result.error||'Admin pricing request failed');
 return result;
}
const status=(node,message,error=false)=>{node.textContent=message;node.classList.toggle('sp-error',error);};
function editablePrice(offer,refresh){
 const card=el('article','admin-card sp-price-card');
 card.append(el('h3','',offer.label),el('p','sp-price-sku',offer.sku));
 const info=el('p','sp-price-note',offer.description||'No description');
 card.append(info);
 const meta=el('p','sp-price-meta',
   offer.category+' · '+offer.fulfillment+
   (offer.duration_hours?' · '+offer.duration_hours+' hours':' · Action-based')+
   ' · Revision '+offer.version);
 card.append(meta);
 const grid=el('div','sp-price-fields');
 const cost=control('Spark cost',offer.sparks_cost,'number');
 const label=control('Customer-facing name',offer.label);
 const description=control('Description',offer.description);
 const stateLabel=el('label','sp-price-field');
 stateLabel.append(el('span','','Release status'));
 const select=stateSelect(offer.state);stateLabel.append(select);
 if(offer.fulfillment==='UNINTEGRATED')select.querySelector('option[value="active"]').disabled=true;
 grid.append(cost.wrap,label.wrap,description.wrap,stateLabel);
 card.append(grid);
 const row=el('div','sp-price-actions');
 const save=el('button','btn secondary','Save price');save.type='button';
 const feedback=el('span','sp-price-feedback');feedback.setAttribute('role','status');
 save.onclick=async()=>{
  const number=Number(cost.input.value);
  const payload={sku:offer.sku,version:offer.version,sparks_cost:number,
   label:label.input.value.trim(),description:description.input.value.trim(),state:select.value};
  if(!Number.isSafeInteger(number)||number<1||number>100000){status(feedback,'Enter a whole Spark amount from 1 to 100,000.',true);return}
  if(!confirm('Change '+offer.sku+' to '+number+' Sparks? Existing redemptions retain their original cost.'))return;
  save.disabled=true;status(feedback,'Saving and recording audit…');
  try{await api('sparks_price_save',payload);status(feedback,'Saved and audited.');await refresh();}
  catch(e){status(feedback,String(e.message||e),true)}
  finally{save.disabled=false}
 };
 row.append(save,feedback);card.append(row);return card;
}
function draftForm(refresh){
 const card=el('article','admin-card sp-price-card');
 card.append(el('h2','','Add a Spark-priced item'),
  el('p','sp-price-note','Create a planned catalog entry in any category. Every new item starts unavailable: entering a price alone never unlocks a feature, charges Sparks, or creates an entitlement.'));
 const grid=el('div','sp-price-fields');
 const sku=control('SKU (capital letters and underscores)','');
 const label=control('Customer-facing name','');
 const cost=control('Spark cost','1','number');
 const description=control('Description','');
 const categoryLabel=el('label','sp-price-field');
 categoryLabel.append(el('span','','Catalog category'));
 const category=el('select');
 category.setAttribute('aria-label','New item catalog category');
 for(const [value,text] of [
  ['OTHER','Other / Future'],['CHART_STUDIO','Chart Studio'],
  ['AD_FREE','Ad-free'],['PRACTICE','Learning and Practice']
 ])category.add(new Option(text,value));
 categoryLabel.append(category);
 const duration=control('Planned duration (hours; optional)','', 'number');
 duration.input.min='1';duration.input.max='8760';
 duration.input.placeholder='Leave blank for action-based pricing';
 grid.append(sku.wrap,label.wrap,cost.wrap,description.wrap,categoryLabel,duration.wrap);card.append(grid);
 const feedback=el('span','sp-price-feedback');feedback.setAttribute('role','status');
 const save=el('button','btn','Add planned item');save.type='button';
 save.onclick=async()=>{
  save.disabled=true;status(feedback,'Creating planned catalog item…');
  try{await api('sparks_price_save',{sku:sku.input.value.trim().toUpperCase(),
   label:label.input.value.trim(),description:description.input.value.trim(),
   category:category.value,duration_hours:duration.input.value.trim()===''?null:Number(duration.input.value),
   sparks_cost:Number(cost.input.value),state:'planned'});await refresh();}
  catch(e){status(feedback,String(e.message||e),true)}
  finally{save.disabled=false}
 };
 const actions=el('div','sp-price-actions');actions.append(save,feedback);card.append(actions);return card;
}
async function load(){
 const host=root();if(!host)return;host.replaceChildren();
 const loading=el('p','','Loading server-authoritative Sparks prices…');host.append(loading);
 try{
  const data=await api('sparks_prices');
  const entries=Array.isArray(data.prices)?data.prices:[];
  host.replaceChildren();
  const controls=el('div','sp-price-toolbar');
  const search=control('Filter SKU or feature','');
  const group=el('select');group.setAttribute('aria-label','Filter Spark category');
  for(const text of ['ALL','CHART_STUDIO','AD_FREE','PRACTICE','OTHER'])
   group.add(new Option(text.replaceAll('_',' '),text));
  const reload=el('button','btn secondary','Refresh prices');reload.type='button';
  reload.onclick=()=>void load();controls.append(search.wrap,group,reload);host.append(controls);
  const notice=el('p','sp-price-note','Owner-controlled prices apply to new, server-confirmed redemption requests only. Existing pass durations and historical debits cannot be repriced retroactively. New catalog entries are planned and cannot be activated until their server-side fulfillment and acceptance are separately completed.');
  host.append(notice);
  const overview=el('p','sp-price-summary',
   entries.length+' catalog items · '+entries.filter(x=>x.state==='active').length+
   ' active · '+entries.filter(x=>x.state!=='active').length+' planned/disabled');
  host.append(overview);
  const list=el('div','sp-price-grid');host.append(list);
  const paint=()=>{
   list.replaceChildren();
   const q=search.input.value.trim().toLowerCase();
   for(const entry of entries.filter(x=>(group.value==='ALL'||x.category===group.value)&&
     (!q||(x.sku+' '+x.label+' '+x.description).toLowerCase().includes(q))))
      list.append(editablePrice(entry,load));
   if(!list.children.length)list.append(el('p','','No matching Sparks prices.'));
  };
  search.input.oninput=paint;group.onchange=paint;paint();
  host.append(draftForm(load));
 }catch(e){status(loading,'Pricing manager unavailable: '+String(e.message||e),true)}
}
window.GroundUpSparksAdmin={load};
})();