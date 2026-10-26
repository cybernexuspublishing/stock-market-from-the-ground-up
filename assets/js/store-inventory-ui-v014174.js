/* v0.14.0.175: public catalog overlays; purchase controls remain in existing store. */
(()=>{'use strict';
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const base=Array.isArray(window.GroundUpPrelaunchInventory)?window.GroundUpPrelaunchInventory:[];
const $=id=>document.getElementById(id);
const categoryName=p=>/^FOUNDING_(30|60)$/.test(p.sku)?'Founding Memberships':p.category;
const detail=p=>/^FOUNDING_(30|60)$/.test(p.sku)?'store.html#founders':p.href||('store-upcoming-product.html?sku='+encodeURIComponent(p.sku));

const primaryTraining=Object.freeze({
 'BC-05-TRUTH':'bootcamp-academy.html?program=truth5',
 'BC-07-WATCH':'bootcamp-academy.html?program=watchlist7',
 'BC-10-SCAN':'bootcamp-academy.html?program=scanners10',
 'BC-30-CORE':'bootcamp.html',
 'BC-45-CHART':'bootcamp-academy.html?program=charts45',
 'BC-60-RISK':'bootcamp-academy.html?program=risk60',
 'BC-90-PRACT':'bootcamp-academy.html?program=practicum90'
});
// Existing approved training membership, never individual Boot Camp checkout.
function sharedTrainingStudy(p){
 const route=primaryTraining[p.sku];if(!route)return '';
 return '<section class="store-training-access" aria-label="Available guided beta study">'+
 '<h2>Guided beta study through an existing membership</h2>'+
 '<p>This Boot Camp is not priced or sold standalone. Its current guided curriculum may be studied through an authorized Historical Replay Learning membership. Learning assessments and independent mastery evidence are separate from ungraded practice.</p>'+
 '<div class="actions"><a class="btn secondary" href="'+escapeHtml(route)+'">Explore in Academy</a> '+
 '<a class="btn secondary" href="store-membership-ondemand-monthly.html">Review training membership</a></div>'+
 '<p class="small">Account authorization and lesson availability are checked at the destination. No payment is initiated here.</p></section>';
}

let verified=false;let all=base.filter(p=>p.status==='existing_catalog'); // fail-closed: upcoming visibility requires server approval
function init(){
 const list=$('inventory-list'),root=$('inventory-detail'),search=$('inventory-search'),category=$('inventory-category'),status=$('inventory-status');
 const render=()=>{
  if(list){
   if(!verified){list.innerHTML='<p role="status">Checking current product availability…</p>';if(status)status.textContent='Checking product availability…';}
   else {
   const q=(search?.value||'').trim().toLowerCase(),cat=category?.value||'';
   const selected=all.filter(p=>(!cat||categoryName(p)===cat)&&(!q||(p.name+' '+p.sku+' '+p.description).toLowerCase().includes(q)));
   list.innerHTML=selected.map(p=>'<article class="product-card store-sell-card"><div class="eyebrow">'+escapeHtml(categoryName(p))+'</div><h2>'+escapeHtml(p.name)+'</h2><p>'+escapeHtml(p.description)+'</p><p class="small">Product ID: '+escapeHtml(p.sku)+'</p><p class="store-soon-label">'+(p.status==='existing_catalog'?'See product page for current availability':'Coming Soon · Checkout unavailable')+'</p><a class="btn secondary" href="'+escapeHtml(detail(p))+'">View product details</a></article>').join('')||'<p>No matching products.</p>';
   status.textContent=selected.length+' of '+all.length+' catalog items shown.';
   }
  }
  if(root){
   const sku=new URLSearchParams(location.search).get('sku')||'',p=all.find(x=>x.sku===sku&&!x.href);
   if(!p){root.innerHTML=verified?'<h1>Product not available</h1><p>This item is not currently published in the Store.</p><a href="store-all-products.html">Back to all products</a>':'<h1>Checking product availability</h1><p>Confirming this listing with the Store.</p>';return;}
   document.title=p.name+' | The Stock Market: From the Ground Up';
   root.innerHTML='<div class="eyebrow">'+escapeHtml(categoryName(p))+'</div><h1>'+escapeHtml(p.name)+'</h1><p>'+escapeHtml(p.description)+'</p><p><strong>Availability:</strong> Coming Soon — checkout unavailable.</p><p><strong>Price:</strong> Pricing to be announced or confirmed at release.</p>'+(p.duration?'<p><strong>Program length:</strong> '+escapeHtml(p.duration)+'</p>':'')+'<p><strong>Catalog identifier:</strong> '+escapeHtml(p.sku)+'</p><p>Standalone sale requires separately approved pricing, delivery, and assessment terms.</p>'+sharedTrainingStudy(p)+'<a class="btn secondary" href="store-all-products.html">Back to all products</a>';
  }
 };
 search?.addEventListener('input',render);category?.addEventListener('change',render);render();
 fetch('/api/store-product-overrides',{cache:'no-store'}).then(async response=>{if(!response.ok)throw Error('Unavailable');return response.json()}).then(data=>{
  if(!data.ok)throw Error('Catalog response unavailable');
  const bySku=new Map((data.items||[]).map(x=>[x.sku,x]));
  all=base.filter(p=>p.status==='existing_catalog'||bySku.has(p.sku)).map(p=>{
   const o=p.status==='coming_soon'?bySku.get(p.sku):null;
   return o?{...p,name:o.title,description:o.description,status:'coming_soon'}:p;
  });
  verified=true;render();
 }).catch(()=>{verified=true;all=base.filter(p=>p.status==='existing_catalog');render();if(status)status.textContent='Upcoming catalog temporarily unavailable; existing products remain accessible.';if(root)root.innerHTML='<h1>Product availability unavailable</h1><p>This product cannot be displayed until its current publication state is confirmed. No checkout is available here.</p><a href="store-all-products.html">Back to all products</a>';});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
