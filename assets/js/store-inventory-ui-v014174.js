/* v0.14.0.175: public catalog overlays; purchase controls remain in existing store. */
(()=>{'use strict';
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const base=Array.isArray(window.GroundUpPrelaunchInventory)?window.GroundUpPrelaunchInventory:[];
const $=id=>document.getElementById(id);
const detail=p=>p.href||('store-upcoming-product.html?sku='+encodeURIComponent(p.sku));
let all=base.filter(p=>p.status==='existing_catalog'); // fail-closed: upcoming visibility requires server approval
function init(){
 const list=$('inventory-list'),root=$('inventory-detail'),search=$('inventory-search'),category=$('inventory-category'),status=$('inventory-status');
 const render=()=>{
  if(list){
   const q=(search?.value||'').trim().toLowerCase(),cat=category?.value||'';
   const selected=all.filter(p=>(!cat||p.category===cat)&&(!q||(p.name+' '+p.sku+' '+p.description).toLowerCase().includes(q)));
   list.innerHTML=selected.map(p=>'<article class="product-card store-sell-card"><div class="eyebrow">'+escapeHtml(p.category)+'</div><h2>'+escapeHtml(p.name)+'</h2><p>'+escapeHtml(p.description)+'</p><p class="small">Product ID: '+escapeHtml(p.sku)+'</p><p class="store-soon-label">'+(p.status==='existing_catalog'?'See product page for current availability':'Coming Soon · Checkout unavailable')+'</p><a class="btn secondary" href="'+escapeHtml(detail(p))+'">View product details</a></article>').join('')||'<p>No matching products.</p>';
   status.textContent=selected.length+' of '+all.length+' catalog items shown.';
  }
  if(root){
   const sku=new URLSearchParams(location.search).get('sku')||'',p=all.find(x=>x.sku===sku&&!x.href);
   if(!p){root.innerHTML='<h1>Product not available</h1><p>This item is currently not listed.</p>';return;}
   document.title=p.name+' | The Stock Market: From the Ground Up';
   root.innerHTML='<div class="eyebrow">'+escapeHtml(p.category)+'</div><h1>'+escapeHtml(p.name)+'</h1><p>'+escapeHtml(p.description)+'</p><p><strong>Availability:</strong> Coming Soon — checkout unavailable.</p><p><strong>Price:</strong> Pricing to be announced or confirmed at release.</p>'+(p.duration?'<p><strong>Program length:</strong> '+escapeHtml(p.duration)+'</p>':'')+'<p><strong>Catalog identifier:</strong> '+escapeHtml(p.sku)+'</p><p>Final benefits, assessments, rights, access terms and delivery will be confirmed before purchase opens.</p><a class="btn secondary" href="store-all-products.html">Back to all products</a>';
  }
 };
 search?.addEventListener('input',render);category?.addEventListener('change',render);render();
 fetch('/api/store-product-overrides',{cache:'no-store'}).then(async response=>{if(!response.ok)throw Error('Unavailable');return response.json()}).then(data=>{
  if(!data.ok)return;
  const bySku=new Map((data.items||[]).map(x=>[x.sku,x])),hidden=new Set(data.hidden||[]);
  all=base.filter(p=>p.status==='existing_catalog'||(bySku.has(p.sku)&&!hidden.has(p.sku))).map(p=>{
   const o=p.status==='coming_soon'?bySku.get(p.sku):null;
   return o?{...p,name:o.title,description:o.description,status:'coming_soon'}:p;
  });
  render();
 }).catch(()=>{if(status)status.textContent='Upcoming catalog temporarily unavailable; existing products remain accessible.';});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
