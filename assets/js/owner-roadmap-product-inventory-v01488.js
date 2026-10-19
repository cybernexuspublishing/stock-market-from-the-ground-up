/* v0.14.0.88 — Private Owner tool-development & membership coverage views.
 * Data comes ONLY from the Owner-authorized /api/owner-roadmap GET response.
 * No browser service-role credentials, payment write, rights change or new DB.
 */
(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
const validRoute=route=>{
 const raw=String(route||'');
 return /^\/?[a-z0-9][a-z0-9_-]*\.html(?:#[a-z0-9_-]+)?$/i.test(raw)?(raw.startsWith('/')?raw:'/'+raw):'';
};
const validCode=code=>/^[A-Z][A-Z0-9_]{0,60}$/.test(String(code||''));
const planRoutes={FREE:'/store-membership-free.html',FULL_MONTHLY:'/store-membership-full-monthly.html',
 FULL_ANNUAL:'/store-membership-full-annual.html',LIFETIME:'/store-membership-lifetime.html',
 ONDEMAND_MONTHLY:'/store-membership-ondemand-monthly.html'};
const toolRoutes={INTERACTIVE_LEARNING:'/store-tool-interactive-learning.html',
 JOURNAL_ANALYTICS:'/store-tool-journal-analytics.html',MARKET_SIMULATOR:'/store-tool-market-simulator.html',
 MARKET_TUTOR:'/store-tool-market-tutor.html'};
let inventory=null,actionHandler=null;
const dollars=c=>Number.isFinite(Number(c))&&Number(c)>=0
 ?Number(c/100).toLocaleString('en-US',{style:'currency',currency:'USD'}):'Price not verified';
const billing=c=>({month:'/month',year:'/year',lifetime:' one-time',none:''})[c]||' — billing schedule unverified';
const li=items=>Array.isArray(items)&&items.length?'<ul>'+items.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':'<p class="or-muted">Not documented in the reviewed customer product guidance; Owner review required.</p>';
const link=(url,label)=>validRoute(url)?'<a class="or-button or-secondary" href="'+esc(url)+'">'+esc(label)+'</a>':'';
const allowedPlan=p=>validCode(p.plan_code)&&!/^(?:QA_|TEST|ZERO_)/i.test(p.plan_code);
const safeItems=items=>Array.isArray(items)?items:[];
const summary=(target,msg,bad=false)=>{const el=$(target);if(el){el.textContent=msg;el.classList.toggle('or-error',bad)}};
function isCatalog(s){return s==='products'}
function action(label,code,name,category,focus){
 const prefix=category==='Premium tool'?'Improve and validate':'Create improvement task';
 const detail='Product/capability: '+name+' ('+code+').\\nCurrent scope: '+(focus||'Validate the implementation against its published purpose.')+
  '\\nAcceptance: independently verify functionality, accessibility, authorization, market/educational accuracy, negative permissions and regression tests. Do not change membership rights or payment flags without separate approval.';
 return '<button type="button" class="or-button or-secondary" data-or-product-task="true" data-name="'+esc(prefix+': '+name)+'" data-category="'+esc(category)+'" data-detail="'+esc(detail)+'">'+esc(label)+'</button>';
}
function bindActions(){
 if(actionHandler)return;
 actionHandler=e=>{
  const b=e.target.closest('button[data-or-product-task]');if(!b)return;
  const form=$('or-new-task');if(!form)return;
  const heading=form.querySelector('[name=title]'),area=form.querySelector('[name=area]'),detail=form.querySelector('[name=detail]');
  if(!heading||!area||!detail)return;
  heading.value=(b.dataset.name||'Review learning feature').slice(0,180);
  area.value=(b.dataset.category||'Learning tools').slice(0,90);
  detail.value=(b.dataset.detail||'').replace(/\\n/g,'\n').slice(0,2400);
  const core=$('or-tab-core');core?.click();
  form.scrollIntoView({block:'center',behavior:'auto'});
  heading.focus();
  $('or-evidence').textContent='Improvement task prepared. Review the details, then click Add task to save it through the existing Owner-authorized roadmap.';
 };
 $('or-app')?.addEventListener('click',actionHandler);
}

function editor(type,code,name,description,updatedAt){
 if(!validCode(code)||!updatedAt)return '<p class="or-muted">Editing is unavailable until the catalog supplies a verified revision. You can still create a development task.</p>';
 return '<details class="or-editor"><summary>Edit product name and description</summary>'+
 '<form class="or-products-copy-form" data-type="'+esc(type)+'" data-code="'+esc(code)+'" data-revision="'+esc(updatedAt)+'">'+
 '<label>Name / customer-facing title<input name="name" required minlength="3" maxlength="180" value="'+esc(name)+'"></label>'+
 '<label>Product description<textarea name="description" maxlength="4000" rows="5">'+esc(description||'')+'</textarea></label>'+
 '<p class="or-muted">This saves only the actual catalog name and description. Price, Stripe synchronization, product availability, customer entitlements, KDP restrictions and publication rights are intentionally controlled separately. No changes occur until Save is selected.</p>'+
 '<button class="or-button" type="submit">Save product description</button></form></details>';
}
function booksView(){
 const holder=$('or-book-products');if(!holder)return;
 if(!inventory?.available){holder.innerHTML='<div class="or-catalog-warning">Book catalog verification unavailable. No changes allowed.</div>';return}
 const books=safeItems(inventory.books);
 summary('or-catalog-book-summary',books.length+' configured book records. Book rights, Amazon/KDP listings and fulfillment channels must be verified separately.');
 holder.innerHTML=books.map(b=>'<article class="or-product-card"><header><span class="or-tag">Book</span><span class="or-product-stage">'+esc(b.publication_status||'Publication status unavailable')+' · '+esc(b.sales_status||'Sales status unavailable')+'</span></header>'+
 '<h3>'+esc(b.title)+'</h3><p>'+esc(b.description||'Publisher synopsis is pending.')+'</p>'+
 '<dl class="or-product-facts"><dt>Product code</dt><dd>'+esc(b.product_code)+'</dd><dt>Store visibility</dt><dd>'+esc(b.store_visible===false?'Hidden':'Configured visible')+'</dd>'+
 '<dt>Amazon KDP</dt><dd>'+esc([b.amazon_kindle_url,b.amazon_paperback_url,b.amazon_hardcover_url].filter(Boolean).length+' configured retailer links')+'</dd>'+
 '<dt>Direct digital</dt><dd>'+esc(b.direct_digital_enabled?'Configuration enabled; verify distribution rights':'Not configured for direct sale')+'</dd>'+
 '<dt>Direct print</dt><dd>'+esc(b.direct_physical_enabled?'Configuration enabled; verify fulfillment':'Not configured for direct sale')+'</dd></dl>'+
 '<div class="or-card-actions">'+link('/store-product.html?type=book&code='+encodeURIComponent(b.product_code),'Customer details')+
 action('Plan improvement',b.product_code,b.title,'Book catalog','Verify product synopsis, learning outcomes, edition prices, publication rights and storefront offer.')+'</div>'+
 editor('book',b.product_code,b.title,b.description,b.updated_at)+'</article>').join('');
}
async function saveCopy(event){
 const form=event.target.closest('.or-products-copy-form');if(!form)return;event.preventDefault();
 const button=form.querySelector('button[type="submit"]');if(button?.disabled)return;
 const info=$('or-products-editor-feedback');const name=form.querySelector('[name=name]').value.trim(),description=form.querySelector('[name=description]').value.trim();
 if(name.length<3||name.length>180||description.length>4000){if(info)info.textContent='Check the product name and description lengths.';return}
 button.disabled=true; if(info)info.textContent='Saving product copy with Owner authorization…';
 try{
  const sb=await window.getSupabaseClient();const session=(await sb.auth.getSession()).data.session;
  if(!session?.access_token)throw Error('Owner session required.');
  const response=await fetch('/api/owner-roadmap',{method:'POST',cache:'no-store',credentials:'same-origin',
    headers:{authorization:'Bearer '+session.access_token,'content-type':'application/json','accept':'application/json'},
    body:JSON.stringify({action:'product_copy',productType:form.dataset.type,code:form.dataset.code,
      expectedUpdatedAt:form.dataset.revision,name,description})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.ok)throw Error(result.error||'Product editorial update failed.');
  if(info)info.textContent=result.auditLogged?'Description saved in the catalog and audit logged. Reloading inventory…':'Description saved, but audit logging was not confirmed; review logs.';
  $('or-refresh')?.click();
 }catch(e){if(info)info.textContent=String(e.message||'Save failed.');}
 finally{button.disabled=false}
}
function initProductFilters(){
 document.querySelectorAll('[data-product-section]').forEach(button=>button.addEventListener('click',()=>{
  const key=button.dataset.productSection;
  for(const b of document.querySelectorAll('[data-product-section]'))b.setAttribute('aria-pressed',String(b===button));
  const panels={memberships:$('or-catalog-memberships'),books:$('or-catalog-books'),tools:$('or-catalog-tools')};
  for(const [name,panel] of Object.entries(panels))if(panel)panel.hidden=key!=='all'&&key!==name;
 }));
 $('or-products-console')?.addEventListener('submit',saveCopy);
}
function toolDetails(t,guide){
 const code=String(t.tool_code||'');
 const name=String(t.name||code);
 const released=t.status==='live'&&t.active===true&&t.public_visible===true;
 const sales=t.active&&t.public_visible&&released&&Number(t.individual_price_cents)>0;
 const status=sales?'Catalog: released premium offer':(!t.active||!t.public_visible)?'Private/disabled catalog entry':'Catalog: '+String(t.status||'unreviewed');
 const focus=safeItems(guide?.outcomes);
 return '<article class="or-product-card" data-tool="'+esc(code)+'"><header><span class="or-tag">'+esc(t.category||'Tool')+'</span><span class="or-product-stage">'+esc(status)+'</span></header>'+
 '<h3>'+esc(name)+'</h3><p>'+esc(t.description||'No catalog description provided.')+'</p>'+
 '<dl class="or-product-facts"><dt>Tool code</dt><dd><code>'+esc(code)+'</code></dd><dt>Individual price</dt><dd>'+ (sales?esc(dollars(t.individual_price_cents))+'/month':'No currently verified independent offer')+'</dd>'+
 '<dt>Free preview</dt><dd>'+ (t.free_preview?'Indicated in catalog (verify user limits)':'Not indicated')+'</dd><dt>Data/input needs</dt><dd>'+esc(t.data_requirement||guide?.requirements||'Confirm in tool requirements')+'</dd></dl>'+
 '<details><summary>Learning objectives and planned improvements</summary><h4>What it teaches</h4>'+li(focus)+
 '<h4>Included / available scope</h4>'+li(guide?.included)+'<h4>Exclusions</h4>'+li(guide?.excluded)+
 '<h4>QA work before approving feature improvements</h4>'+li([
 'Verify released screens and outcomes against this catalog record.',
 'Test per-user free preview, active membership, individual pass and canceled pass.',
 'Validate stored data integrity, accessible workflows and educational/market accuracy.',
 'Verify negative access, signed data sources and production error recovery.'
 ])+'</details><div class="or-card-actions">'+link(toolRoutes[code]||'', 'Customer product details')+' '+link(validRoute(t.href),'Open existing tool')+' '+
 action('Plan improvement',code,name,'Premium tool',focus.join(' '))+'</div>'+editor('tool',code,name,t.description,t.updated_at)+'</article>';
}
function supportingDetails(p){
 const code=String(p.code||''),name=String(p.name||code);
 return '<article class="or-product-card or-capability" data-tool="'+esc(code)+'"><header><span class="or-tag">'+esc(p.category||'Supporting capability')+'</span><span class="or-product-stage">Existing site route · not an individual Stripe SKU</span></header>'+
 '<h3>'+esc(name)+'</h3><p>'+esc(p.description||'')+'</p>'+
 '<details><summary>Improvement and acceptance work</summary>'+li(p.buildFocus)+
 '<p class="or-muted">The presence of a page is not evidence that every workflow is released, authenticated, licensed or correct.</p></details>'+
 '<div class="or-card-actions">'+link(validRoute(p.route),'Open site feature')+' '+
 action('Plan improvement',code,name,'Supporting learning capability',safeItems(p.buildFocus).join(' '))+'</div></article>';
}
function renderTools(){
 const root=$('or-tool-catalog');if(!root)return;
 if(!inventory){root.innerHTML='';summary('or-catalog-tool-summary','Owner tool inventory has not loaded.');return}
 const tools=safeItems(inventory.tools),extras=safeItems(inventory.capabilities);
 if(!inventory.available){root.innerHTML='<div class="or-catalog-warning" role="alert">'+esc(inventory.error||'Live catalog unavailable.')+'</div>'+
  '<h3>Existing supporting learning features (code routes only)</h3><div class="or-product-grid">'+extras.map(supportingDetails).join('')+'</div>';
  summary('or-catalog-tool-summary','Live Supabase SKU records unavailable; showing existing website capabilities only.',true);return}
 const guides=inventory.guides?.tools||{};
 const priced=tools.filter(t=>t.status==='live'&&t.active===true&&t.public_visible===true&&Number(t.individual_price_cents)>0);
 summary('or-catalog-tool-summary',tools.length+' Supabase tool records · '+priced.length+' eligible released/visible premium tool SKUs · '+extras.length+' supporting website capabilities. Product status is not a QA approval.');
 const query=String($('or-catalog-tool-search')?.value||'').toLowerCase().trim();
 const hits=t=>!query||[t.name,t.tool_code,t.description,t.category,t.data_requirement,JSON.stringify(guides[t.tool_code]||{})].join(' ').toLowerCase().includes(query);
 const base=tools.filter(hits);
 const relevant=extras.filter(t=>!query||[t.name,t.code,t.description,t.category,...(t.buildFocus||[])].join(' ').toLowerCase().includes(query));
 root.innerHTML='<h3>Supabase product tools ('+base.length+')</h3><div class="or-product-grid">'+(base.map(t=>toolDetails(t,guides[t.tool_code])).join('')||'<div class="or-empty">No matching tool records.</div>')+
 '</div><h3>Supporting learning features and platform services ('+relevant.length+')</h3><p class="or-muted">These routes support the education workflow. They are NOT additional independent subscription SKUs merely because they exist.</p>'+
 '<div class="or-product-grid">'+(relevant.map(supportingDetails).join('')||'<div class="or-empty">No matching supporting features.</div>')+'</div>';
}
function cardPlan(p,guide,linked){
 const code=String(p.plan_code||''),name=String(p.name||code);
 const publicly=p.active===true&&p.public_visible===true;
 const eligible=publicly&&p.checkout_enabled===true;
 const extra=guide?.learn||[];
 const title=publicly?'Public catalog membership':'Draft/hidden membership — NOT for sale';
 const tools=linked.map(x=>x.name||x.tool_code).join(', ');
 const priced=Number.isFinite(Number(p.price_cents))?dollars(p.price_cents)+billing(p.billing_interval):'Unverified price';
 return '<article class="or-product-card or-plan-card" data-plan="'+esc(code)+'"><header><span class="or-tag">'+esc(title)+'</span><span class="or-product-stage">'+(eligible?'Database checkout flag ON':'Database checkout flag OFF / not public')+'</span></header>'+
 '<h3>'+esc(name)+'</h3><p class="or-plan-price">'+esc(priced)+'</p><p>'+esc(p.description||guide?.summary||'No reviewed description supplied.')+'</p>'+
 '<div class="or-plan-columns"><div><h4>Included with this membership</h4>'+li(guide?.included)+'</div><div><h4>Not included / limitations</h4>'+li(guide?.excluded)+'</div></div>'+
 '<details><summary>Learning outcomes, configured entitlement and billing</summary>'+
 '<h4>Learning outcomes</h4>'+li(extra)+
 '<h4>Database tool coverage</h4><p>'+ (linked.length?esc(tools):'No direct released tool coverage mapped in this snapshot; see the matrix and reviewed exclusions.')+'</p>'+
 '<dl class="or-product-facts"><dt>Includes all released tools</dt><dd>'+ (p.includes_all_tools===true?'Yes (database plan flag; access must still be validated)':'Not configured as full-tool entitlement')+'</dd>'+
 '<dt>Includes all book companions</dt><dd>'+(p.includes_all_books===true?'Yes (database flag)':'Not configured for universal companion access')+'</dd>'+
 '<dt>Advertising flag</dt><dd>'+(p.ad_free?'Ad-free flag set':'Ad-free flag not set; see published sponsor-placement terms')+'</dd>'+
 '<dt>Billing and access</dt><dd>'+esc(guide?.terms||'No reviewed billing conditions supplied. Do not market until reviewed.')+'</dd></dl></details>'+
 '<div class="or-card-actions">'+link(planRoutes[code],'View customer membership page')+' '+
 action('Plan coverage work',code,name,'Membership coverage',safeItems(guide?.included).join(' '))+'</div>'+editor('membership',code,name,p.description,p.updated_at)+'</article>';
}
function matrix(plans,tools,access){
 const mount=$('or-membership-matrix');if(!mount)return;
 const eligible=plans.filter(allowedPlan),set=new Set(access.map(a=>String(a.plan_code)+'|'+String(a.tool_code)));
 if(!eligible.length||!tools.length){mount.innerHTML='<p class="or-muted">No verified plan/tool matrix could be assembled from Supabase.</p>';return}
 const guide=inventory.guides?.plans||{};
 const evalTool=(p,t)=>{
  if(t.status!=='live'||!t.active||!t.public_visible)return 'Not released / not publicly offered';
  if(p.includes_all_tools===true||set.has(p.plan_code+'|'+t.tool_code))return 'Included — configured';
  if(p.plan_code==='FREE'&&t.free_preview)return 'Limited free preview only';
  return 'Not configured as included';
 };
 const rows=[
  ...tools.map(t=>[t.name||t.tool_code,t.tool_code,p=>evalTool(p,t)]),
  ['Book companion learning','',p=>p.includes_all_books===true?'Included — configured':p.plan_code==='ONDEMAND_MONTHLY'?'Book-aligned replay instruction; not all companions':'Not configured as all companions'],
  ['Downloadable eBook files','',p=>p.plan_code==='LIFETIME'?'Five designated editions subject to release and legal digital-distribution rights':'Not included by membership'],
  ['Advertising','',p=>p.plan_code==='LIFETIME'?'Ad-free':p.plan_code==='FULL_ANNUAL'?'Minimal sponsor placements':p.plan_code==='FULL_MONTHLY'?'Limited sponsor placements':'Standard sponsor placement terms apply'],
  ['External brokerage/data/software','',()=>'Not included']
 ];
 mount.innerHTML='<table class="or-membership-table"><caption>Owner-only membership entitlements. Green configured status is NOT proof of successful payment or actual access. Any missing mapping must be investigated.</caption><thead><tr><th scope="col">Feature</th>'+
 eligible.map(p=>'<th scope="col">'+(planRoutes[p.plan_code]?'<a href="'+planRoutes[p.plan_code]+'">'+esc(p.name)+'</a>':esc(p.name))+
 '<small>'+esc(p.active&&p.public_visible?'Public catalog':'Inactive/hidden')+'</small></th>').join('')+'</tr></thead><tbody>'+
 rows.map(([label,code,fn])=>'<tr><th scope="row">'+(toolRoutes[code]?'<a href="'+esc(toolRoutes[code])+'">'+esc(label)+'</a>':esc(label))+'</th>'+
 eligible.map(p=>'<td>'+esc(fn(p))+'</td>').join('')+'</tr>').join('')+
 '</tbody></table><p class="or-muted">Read alongside the detailed inclusions/exclusions above. No entitlement change is made here. Review actual server-side grants, terms and test results before declaring a feature available.</p>';
}
function renderMemberships(){
 const root=$('or-membership-details');if(!root)return;
 if(!inventory?.available){root.innerHTML='<div class="or-catalog-warning" role="alert">'+esc(inventory?.error||'Live membership catalog not available.')+'</div>'; $('or-membership-matrix').innerHTML='';summary('or-catalog-membership-summary','Membership details cannot be verified without the existing Supabase catalog.',true);return}
 const plans=safeItems(inventory.plans).filter(allowedPlan),tools=safeItems(inventory.tools),set=new Set(safeItems(inventory.explicitAccess).map(a=>a.plan_code+'|'+a.tool_code));
 const guides=inventory.guides?.plans||{};
 const live=tools.filter(t=>t.active&&t.public_visible&&t.status==='live');
 const mapped=p=>live.filter(t=>p.includes_all_tools===true||set.has(p.plan_code+'|'+t.tool_code));
 summary('or-catalog-membership-summary',plans.length+' membership records · '+plans.filter(p=>p.active&&p.public_visible).length+' publicly listed configurations · '+tools.length+' mapped tool records. Current tool permissions are determined by server-side access checks.');
 root.innerHTML=plans.map(p=>cardPlan(p,guides[p.plan_code],mapped(p))).join('')||'<div class="or-empty">No memberships in the verified catalog.</div>';
 matrix(plans,tools,safeItems(inventory.explicitAccess));
}
function render(response){
 inventory=response?.productInventory||null;bindActions();renderTools();renderMemberships();booksView();
}
function isAvailable(){return !!inventory?.available}
document.addEventListener('DOMContentLoaded',()=>{
 initProductFilters();
 $('or-catalog-tool-search')?.addEventListener('input',()=>renderTools());
});
window.OwnerRoadmapProductsV88={render,isCatalog,isAvailable};
})();
