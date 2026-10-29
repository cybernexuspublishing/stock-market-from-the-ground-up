/* v0.14.0.89 — one Admin Products workspace for all three Store categories.
 * Reuses existing authenticated /api/admin, audited Owner plan availability,
 * and existing book/tool editors. Never creates checkout or grants rights.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id),e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=c=>(Number(c||0)/100).toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2});
const cycle=x=>({month:'/month',year:'/year',lifetime:' one-time',none:''})[x]||'';
const planPages={FREE:'store-membership-free.html',FULL_MONTHLY:'store-membership-full-monthly.html',FULL_ANNUAL:'store-membership-full-annual.html',LIFETIME:'store-membership-lifetime.html',ONDEMAND_MONTHLY:'store-membership-ondemand-monthly.html'};
const toolPages={INTERACTIVE_LEARNING:'store-tool-interactive-learning.html',JOURNAL_ANALYTICS:'store-tool-journal-analytics.html',MARKET_SIMULATOR:'store-tool-market-simulator.html',MARKET_TUTOR:'store-tool-market-tutor.html'};
const urlFor=(kind,code)=>({plan:planPages,tool:toolPages}[kind]?.[code]||('store-product.html?type='+encodeURIComponent(kind)+'&code='+encodeURIComponent(code)));
let context=null,live=null,current='memberships',pending=false;
const msg=(s,error=false)=>{const x=$('admin-products-message');if(x){x.textContent=s;x.classList.toggle('admin-products-error',error)}};
async function token(){
 const sb=await window.getSupabaseClient(),{data:{session}}=await sb.auth.getSession();
 if(!session?.access_token)throw Error('Administrator sign-in is required.');
 return session.access_token;
}
async function request(url,body){
 const r=await fetch(url,{method:body?'POST':'GET',headers:{authorization:'Bearer '+await token(),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const data=await r.json().catch(()=>null);
 if(!r.ok||!data?.ok)throw Error(data?.error||'Products service is unavailable ('+r.status+').');
 return data;
}
const admin=(name,body)=>request('/api/admin?action='+encodeURIComponent(name),body);
const plan=(body)=>request('/api/plan-controls',body);
const can=p=>context?.permissions?.includes(p)||false;
const owner=()=>context?.roles?.includes('OWNER')||false;
function show(tab){
 current=tab;
 for(const name of ['books','tools','memberships','founding','sparks']){
  const x=$('admin-products-'+name),button=$('admin-products-tab-'+name),selected=tab===name;
  if(x)x.hidden=!selected;
  if(button){button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1}
 }
 history.replaceState(null,'','#products'+(tab==='memberships'?'':'-'+tab));
}
function chartCoverage(plan){
 const code=String(plan.plan_code||'');
 if(!plan.active)return 'Not currently offered; historical configuration';
 if(['FREE','PICK_WHAT_YOU_WANT','ONDEMAND_MONTHLY','FOUNDING_14'].includes(code))
  return 'Standard + Apache ECharts (foundational access)';
 if(code==='FOUNDING_30')return 'Standard + Apache ECharts + Advanced';
 if(['FOUNDING_60','FULL_MONTHLY','FULL_ANNUAL','LIFETIME'].includes(code))
  return 'Standard + Apache ECharts + Advanced + Professional';
 return 'No tier-specific Chart Studio benefit published';
}
function membershipCard(p){
 const enabled=p.active&&p.public_visible;
 const price=p.plan_code==='PICK_WHAT_YOU_WANT'?'$0.00 base fee · individual tools priced separately':money(p.price_cents)+cycle(p.billing_interval);
 const buttons=owner()&&can('commerce.view')?
  '<div class="product-admin-fields"><label><input type="checkbox" data-flag="active" '+(p.active?'checked':'')+
  (p.plan_code==='FREE'?' disabled':'')+'> Available for new enrollment</label><label><input type="checkbox" data-flag="public" '+(p.public_visible?'checked':'')+'> Listed in Store</label><label><input type="checkbox" data-flag="pause"> Pause NEW checkout (cannot enable from here)</label>'+
  '<button class="btn secondary" type="button" data-plan-save="'+e(p.plan_code)+'">Save Visibility</button></div>':
 '<p class="small">Owner authorization is required to change membership availability.</p>';
 const copy=owner()&&can('plans.manage')?
 '<details class="product-admin-copy"><summary>Edit Customer-Facing Name &amp; Description</summary>'+
 '<label>Membership name<input data-copy="name" maxlength="160" value="'+e(p.name)+'"></label>'+
 '<label>Store description<textarea data-copy="description" maxlength="2400" rows="4">'+e(p.description||'')+'</textarea></label>'+
 '<p class="small">Copy must accurately reflect the published benefits, exclusions and billing terms. This does not edit contractual inclusions, prices or Stripe mappings.</p>'+
 '<button class="btn secondary" type="button" data-plan-copy="'+e(p.plan_code)+'">Save Description</button></details>':'';
 const status=enabled?p.checkout_enabled?'Listed · Database checkout ON':'Listed · Checkout not enabled':'Hidden / disabled';
 return '<article class="admin-card product-admin-card" data-plan="'+e(p.plan_code)+'">'+
 '<div class="eyebrow">Membership</div><h3>'+e(p.name)+'</h3>'+
 '<p class="product-admin-price">'+e(price)+'</p><p class="small">USD price = database price_cents ÷ 100. Stripe/provider billing is separate and must be checked before price changes.</p><p class="small"><strong>Chart Studio:</strong> '+e(chartCoverage(p))+(p.plan_code==='PICK_WHAT_YOU_WANT'?' · Premium engines require a separately verified entitlement or Sparks pass.':'')+'</p><p>'+e(p.description||'Membership product description not yet provided.')+'</p>'+
 '<p class="product-admin-status">'+e(status)+'</p>'+
 '<div class="product-admin-actions"><a class="btn secondary" target="_blank" rel="noopener" href="'+e(urlFor('plan',p.plan_code))+'">View Customer Page</a></div>'+copy+buttons+
 '<p class="small">Publishing a membership makes its approved Store listing visible but does not enable checkout. Founders also require the Owner Store product overlay to be visible, and an independently approved provider/fulfillment release. Hidden and unavailable membership direct checkout URLs remain blocked.</p><p class="small">Changing a Stripe-linked membership price, billing interval or included entitlements requires synchronized provider mapping, customer disclosure, and a separate audited rollout. This editor never changes those terms silently.</p></article>';
}
function toolCard(t){
 const published=t.active&&t.public_visible;
 const betaReady=published&&t.status==='live'&&t.checkout_enabled===true&&
  t.metadata?.beta_testing?.status==='ready_for_beta_testing';
 const price=t.status==='live'&&Number(t.individual_price_cents)>0?money(t.individual_price_cents)+'/month':'Pricing not announced';
 const state=t.status==='live'?(t.checkout_enabled?'Listed · Checkout ON':'Released · Checkout not enabled'):
 'Coming Soon · '+String(t.status||'planned').replaceAll('_',' ');
 return '<article class="admin-card product-admin-card"><div class="eyebrow">À-la-Carte</div><h3>'+e(t.name)+'</h3>'+
 '<p class="product-admin-price">'+e(price)+'</p><p>'+e(t.description||'Further product details are being prepared.')+'</p>'+
 '<p class="product-admin-status">'+e(state)+(published?'':' · Not publicly displayed')+'</p>'+
 (betaReady?'<p class="product-admin-status">Beta Testing Ready · Founding 600 member acceptance pending</p>':'')+
 '<p class="small">SKU: <code>'+e(t.tool_code)+'</code> · Preview: '+(t.free_preview?'Configured':'Not configured')+'</p>'+
 '<div class="product-admin-actions"><a class="btn secondary" href="'+e(urlFor('tool',t.tool_code))+'" target="_blank" rel="noopener">View Customer Page</a>'+
 (can('tools.manage')?'<button type="button" class="btn" data-tool-edit="'+e(t.tool_code)+'">Edit Tool</button>':'')+'</div></article>';
}
function upcomingAdmin(){
 const records=Array.isArray(window.GroundUpUpcomingOfferings)?window.GroundUpUpcomingOfferings:[];
 const existing=new Set((live?.tools||[]).map(x=>x.tool_code));
 const pending=records.filter(x=>!existing.has(x.code));
 return pending.length?'<section class="product-upcoming-admin"><h3>Planned / Supporting Learning Offers ('+pending.length+')</h3>'+
 '<p class="small">These website features are not approved as separate Stripe products. Create a planned tool record only after deciding to offer the feature independently; keep checkout disabled until release and provider price mapping are verified.</p>'+
 '<div class="admin-grid">'+pending.map(t=>'<article class="admin-card product-admin-card"><div class="eyebrow">'+e(t.category||'Planned learning')+'</div><h4>'+e(t.name)+'</h4>'+
 '<p>'+e(t.description)+'</p><p class="product-admin-price">Price to be announced</p><p class="product-admin-status">Coming Soon — Not an independently purchasable SKU</p>'+
 '<div class="product-admin-actions"><a class="btn secondary" href="'+e(t.route)+'" target="_blank" rel="noopener">Preview Existing Feature</a>'+
 (can('tools.manage')?'<button type="button" class="btn secondary" data-upcoming-create="'+e(t.code)+'">Create Planned SKU</button>':'')+
 '</div></article>').join('')+'</div></section>':'';
}
function wire(){
 const root=$('admin-products-panel');if(!root||root.dataset.wired)return;root.dataset.wired='true';
 // Central Stripe import: Cloudflare reads the same canonical Supabase
 // mappings at runtime. Creating a catalog item never silently sells it.
 if(!root.querySelector('[data-stripe-product-import]')){
  const panel=document.createElement('section');panel.className='admin-card';panel.dataset.stripeProductImport='1';
  const heading=document.createElement('h3');heading.textContent='Connect an existing Stripe LIVE product';
  const explain=document.createElement('p');
  explain.textContent='Enter the Stripe LIVE Product ID and Price ID. Verify to retrieve its existing SKU or select a category to generate a permanent one. Publish synchronizes Stripe metadata, Supabase and the Cloudflare-backed Store without changing paid checkout.';
  const form=document.createElement('form');form.className='admin-grid';
  const fields={};
  for(const [key,name,placeholder] of [['productId','Stripe Product ID','prod_…'],['priceId','Stripe Price ID','price_…']]){
   const label=document.createElement('label');label.textContent=name;
   const input=document.createElement('input');input.required=true;input.name=key;
   input.autocomplete='off';input.maxLength=160;input.placeholder=placeholder;
   label.append(input);form.append(label);fields[key]=input;
  }
  const categoryLabel=document.createElement('label');categoryLabel.textContent='Store category — automatic or select for a new product';
  const category=document.createElement('select');category.name='category';
  for(const [code,title] of [['','Auto-detect from Stripe and Supabase'],
   ['tool','Learning Tool'],['book','Book'],['course','Boot Camp / Course'],
   ['plan','Membership'],['founding','Founding Membership'],
   ['addon','Crownlight Sparks / Add-on'],['feature','Included Feature']]){
   const opt=document.createElement('option');opt.value=code;opt.textContent=title;category.append(opt);
  }
  categoryLabel.append(category);form.append(categoryLabel);
  const verify=document.createElement('button');verify.type='button';verify.className='btn secondary';
  verify.textContent='Verify Stripe IDs & Resolve SKU';
  const save=document.createElement('button');save.type='submit';save.className='btn';
  save.textContent='Save & Publish Product';save.disabled=true;
  const resolved=document.createElement('p');resolved.setAttribute('role','status');
  resolved.setAttribute('aria-live','polite');resolved.textContent='SKU will be resolved from Stripe.';
  const report=document.createElement('p');report.setAttribute('role','status');report.setAttribute('aria-live','polite');
  form.append(verify,save);panel.append(heading,explain,form,resolved,report);root.prepend(panel);
  let checked=null,busy=false;
  const input=()=>({productId:fields.productId.value.trim(),priceId:fields.priceId.value.trim(),category:category.value});
  const clear=()=>{checked=null;save.disabled=true;resolved.textContent='Verify the Stripe IDs again after changing any field.';};
  for(const el of [fields.productId,fields.priceId,category])el.addEventListener('input',clear);
  verify.addEventListener('click',async()=>{
   if(!owner()){report.textContent='An Owner session is required.';return}
   if(!form.reportValidity()||busy)return;
   busy=true;verify.disabled=true;save.disabled=true;
   report.textContent='Verifying LIVE Stripe Price and resolving the canonical SKU…';
   try{
    const ensure=window.GroundUpAdminPasswordConfirm?.ensure;
    if(typeof ensure!=='function')throw Error('Owner password confirmation is not available.');
    await ensure();
    checked=await request('/api/owner-stripe-product-sync',{operation:'preview',...input()});
    const cadence=checked.billingInterval==='one_time'?' one-time':' every '+checked.billingIntervalCount+' '+checked.billingInterval;
    resolved.textContent='Verified Store SKU: '+checked.sku+' · '+checked.productName+' · '+money(checked.priceCents)+cadence+
      ' · '+(checked.generated?'new permanent SKU':'existing '+checked.source.replaceAll('_',' '))+
      '. No checkout permissions will change.';
    report.textContent='Ready to save and publish.';save.disabled=false;
   }catch(err){checked=null;resolved.textContent='SKU not verified.';report.textContent='Verification failed: '+(err.message||'Unknown error')}
   finally{busy=false;verify.disabled=false}
  });
  form.addEventListener('submit',async event=>{
   event.preventDefault();
   if(!checked||busy){report.textContent='Verify both Stripe IDs first.';return}
   if(!owner()){report.textContent='An Owner session is required.';return}
   if(!confirm('Publish '+checked.productName+' ('+checked.sku+') to Stripe metadata and the Cloudflare-backed Supabase Store? This does not enable independent paid checkout.'))return;
   busy=true;verify.disabled=true;save.disabled=true;
   report.textContent='Synchronizing verified Stripe metadata, Supabase and the public Store…';
   try{
    const result=await request('/api/owner-stripe-product-sync',{operation:'save',...input(),expectedSku:checked.sku});
    resolved.textContent='Store SKU: '+result.sku+'.';
    report.textContent='Synchronized '+result.sku+' across Stripe, Supabase and the Cloudflare-backed Store. '+
     (result.newStoreItem?'New listing published.':'Existing listing linked.')+' Paid checkout unchanged.';
    checked=null;window.dispatchEvent(new Event('groundup-product-updated'));
   }catch(err){checked=null;report.textContent='Sync not confirmed: '+(err.message||'Unknown error')+'. Re-verify the same IDs before retrying.'}
   finally{busy=false;verify.disabled=false;save.disabled=true}
  });
 }
 $('admin-open-digital-books')?.addEventListener('click',()=>{
  // Book upload belongs to the selected book edit form, never Commerce.
  show('books');
  msg('Choose Edit on the book you want to upload. PDF/EPUB files and publishing rights are managed in the same editor.');
  const first=$('admin-catalog-list')?.querySelector('.admin-edit-product');
  first?.focus({preventScroll:true});
  $('admin-products-books')?.scrollIntoView({behavior:'smooth',block:'start'});
 });
 root.querySelectorAll('[data-product-tab]').forEach(button=>{
  button.addEventListener('click',()=>show(button.dataset.productTab));
  button.addEventListener('keydown',ev=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(ev.key))return;
   ev.preventDefault();const names=['books','tools','memberships','founding','sparks'],n=names.indexOf(button.dataset.productTab);
   const i=ev.key==='Home'?0:ev.key==='End'?names.length-1:ev.key==='ArrowRight'?(n+1)%names.length:(n+names.length-1)%names.length;
   show(names[i]);$('admin-products-tab-'+names[i]).focus();
  });
 });
 $('admin-products-open-sparks')?.addEventListener('click',()=>{const target=document.querySelector('#admin-tabs [data-panel="sparks"]');if(!target||target.hidden||target.disabled){msg('Sparks editor is restricted to the authorized Owner.',true);return;}target.click();});
 $('admin-products-new-tool')?.addEventListener('click',()=>{try{window.GroundUpAdminToolEditor?.add()}catch(ex){msg(ex.message,true)}});
 root.addEventListener('click',async ev=>{
  const upcoming=ev.target.closest('[data-upcoming-create]');
  if(upcoming){
   if(!can('tools.manage')){msg('Tool editing permission required.',true);return}
   const item=(window.GroundUpUpcomingOfferings||[]).find(x=>x.code===upcoming.dataset.upcomingCreate);
   if(!item)return;
   // Existing tool editor enforces planned-only creation and never activates checkout.
   try{window.GroundUpAdminToolEditor?.add({tool_code:item.code,name:item.name,category:item.category,
     description:item.description,href:item.route})}catch(ex){msg(ex.message,true)}
   return;
  }
  const tool=ev.target.closest('[data-tool-edit]');
  if(tool){
   const item=live?.tools?.find(x=>x.tool_code===tool.dataset.toolEdit);
   if(!item)return;
   try{window.GroundUpAdminToolEditor?.edit(item)}catch(ex){msg(ex.message,true)}
   return;
  }
  const copy=ev.target.closest('[data-plan-copy]');
  if(copy){
    const p=live?.plans?.find(x=>x.plan_code===copy.dataset.planCopy);
    if(!p||!owner()||!can('plans.manage')){msg('Owner plan-editing permission required.',true);return}
    const card=copy.closest('[data-plan]'),name=card.querySelector('[data-copy="name"]').value.trim();
    const description=card.querySelector('[data-copy="description"]').value.trim();
    if(!name){msg('Membership name is required.',true);return}
    if(!confirm('Publish the updated membership name and description? Pricing, included benefits, Stripe settings and existing subscriptions will NOT change.'))return;
    copy.disabled=true;
    try{const result=await admin('plan_copy_save',{plan_code:p.plan_code,name,description,expected_updated_at:p.updated_at});
     msg(result.notice||'Membership copy updated.');await load();
    }catch(ex){msg('Membership description was not saved: '+ex.message,true)}
    finally{copy.disabled=false}
    return;
  }
  const btn=ev.target.closest('[data-plan-save]');if(!btn)return;
  const p=live?.plans?.find(x=>x.plan_code===btn.dataset.planSave);
  if(!p||!owner()){msg('Owner authorization is required.',true);return}
  const card=btn.closest('[data-plan]');
  const active=card.querySelector('[data-flag="active"]').checked;
  const publicVisible=card.querySelector('[data-flag="public"]').checked;
  const pauseCheckout=card.querySelector('[data-flag="pause"]').checked;
  if(!confirm('Update visibility for '+p.name+'? Existing paid accounts are not cancelled. Pausing paid checkout requires a separate activation process to undo.'))return;
  btn.disabled=true;
  try{await plan({planCode:p.plan_code,active,publicVisible,pauseCheckout});
   msg('Saved membership visibility through the existing audited Owner authorization.');await load();
  }catch(ex){msg('Membership not changed: '+ex.message,true)}
  finally{btn.disabled=false}
 });
 window.addEventListener('groundup-product-updated',()=>load());
}
async function load(){
 if(pending)return;pending=true;
 try{
  wire();
  context=await admin('context');
  const syncPanel=root.querySelector('[data-stripe-product-import]');
  if(syncPanel)syncPanel.hidden=!owner();
  const requests=[can('commerce.view')?admin('platform'):Promise.resolve({plans:[],tools:[]}),
   can('catalog.view')?window.GroundUpAdminBookEditor?.load():Promise.resolve()];
  const result=await Promise.allSettled(requests);
  if(result[0].status!=='fulfilled')throw result[0].reason;
  live=result[0].value;
  const isFounding=p=>/FOUNDING|FOUNDER/i.test(String(p.plan_code||''));
  $('admin-products-membership-list').innerHTML=live.plans.some(p=>!isFounding(p))?live.plans.filter(p=>!isFounding(p)).map(membershipCard).join(''):'<p>Membership catalog is restricted or unavailable.</p>';
  $('admin-products-founding-list').innerHTML=live.plans.some(isFounding)?live.plans.filter(isFounding).map(membershipCard).join(''):'<p>No founding plans are available to this administrative account.</p>';
  $('admin-products-tool-list').innerHTML=(live.tools.length?live.tools.map(toolCard).join(''):'<p>Tool catalog is restricted or unavailable.</p>')+upcomingAdmin();
  $('admin-products-new-tool').hidden=!can('tools.manage');
  if(result[1].status!=='fulfilled')msg('Books could not be loaded: '+result[1].reason?.message,true);
  else msg((live.plans?.length||0)+' membership configurations · '+(live.tools?.length||0)+' tool records. Book listings are managed in the Books tab.');
  const hash=location.hash.slice(1);const selected=hash.match(/^products-(books|tools|memberships|founding|sparks)$/)?.[1];show(selected||current);
 }catch(ex){msg('Products catalog unavailable: '+ex.message,true)}
 finally{pending=false}
}
window.GroundUpAdminProducts={load,show};
})();
