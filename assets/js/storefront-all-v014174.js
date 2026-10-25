/* v0.14.0.174: authoritative public Store faces, independent of checkout. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const groups=[
 ['membership','Memberships'],['founding','Founding 600'],['book','Books & Bundles'],
 ['bootcamp','Boot Camps & Clinics'],['tool','Learning Tools'],['addon','Practice Add-ons'],
 ['feature','Supporting Learning Features']
];
const labels={in_development:'In development',coming_soon:'Coming Soon',ready_for_review:'Release review',listed:'Listed — review details',for_sale:'Available — review purchase terms',paused:'Paused'};
const safeRoute=x=>/^[A-Za-z0-9_-]+\.html$/.test(x||'')?x:'';
let source=[],selection='all';
let sharedCatalogPromise=null;
function getCatalog(){
 if(!sharedCatalogPromise)sharedCatalogPromise=fetch('/api/storefront-catalog-v014174',{cache:'no-store',headers:{accept:'application/json'}}).then(async response=>{
  const data=await response.json();
  if(!response.ok||!data?.ok||!Array.isArray(data.items))throw Error('Unable to verify Store catalog');
  return data.items.filter(x=>x&&x.visible===true&&typeof x.sku==='string');
 });
 return sharedCatalogPromise;
}
window.GroundUpPublicStorefaces=getCatalog;
const details=sku=>'store-item.html?sku='+encodeURIComponent(sku);
const itemCard=x=>'<article class="product-card gu174-product" data-sku="'+esc(x.sku)+'" data-group="'+esc(x.category)+'">'+
 '<span class="gu174-state">'+esc(labels[x.status]||'Coming Soon')+'</span>'+
 '<div class="eyebrow">'+esc(groups.find(v=>v[0]===x.category)?.[1]||'Education')+'</div>'+
 '<h3><a href="'+esc(details(x.sku))+'">'+esc(x.display_name)+'</a></h3>'+
 '<p>'+esc(x.description||'Additional product information is being prepared.')+'</p>'+
 '<p class="gu174-price">'+esc(x.price_label||'Pricing to be announced')+'</p>'+
 (x.duration_label?'<p class="small">'+esc(x.duration_label)+'</p>':'')+
 '<p class="small">SKU: '+esc(x.sku)+'</p>'+
 '<a class="btn secondary" href="'+esc(details(x.sku))+'">View product details</a>'+
 '</article>';
const searchable=x=>(x.display_name+' '+x.description+' '+x.sku).toLowerCase();
function render(){
 const root=$('store-full-catalog'),query=($('store-all-search')?.value||'').trim().toLowerCase();if(!root)return;
 const items=source.filter(x=>(selection==='all'||x.category===selection)&&(!query||searchable(x).includes(query)));
 root.innerHTML=groups.filter(([cat])=>items.some(x=>x.category===cat)).map(([cat,label])=>{
  const set=items.filter(x=>x.category===cat);
  return '<section class="dashboard-space gu174-category"><h2>'+esc(label)+' <small>('+set.length+')</small></h2><div class="commerce-grid">'+set.map(itemCard).join('')+'</div></section>';
 }).join('')||'<div class="notice">No matching items. Try another category or search.</div>';
 const status=$('store-all-count');if(status)status.textContent=items.length+' items displayed out of '+source.length+' listed Store items.';
}
function filters(){
 const nav=$('store-all-filters');if(!nav)return;
 const options=[['all','All items'],...groups];
 nav.innerHTML=options.map(([id,label])=>'<button type="button" class="btn secondary" data-gu174-category="'+esc(id)+'" aria-pressed="'+String(id===selection)+'">'+esc(label)+'</button>').join(' ');
 nav.addEventListener('click',event=>{
  const button=event.target.closest('[data-gu174-category]');if(!button)return;
  selection=button.dataset.gu174Category;
  nav.querySelectorAll('[data-gu174-category]').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));
  render();
 });
 $('store-all-search')?.addEventListener('input',render);
}
function detail(){
 const root=$('store-item-details');if(!root)return;
 const sku=new URLSearchParams(location.search).get('sku')||'';
 const x=source.find(p=>p.sku===sku);
 if(!x){root.innerHTML='<h1>Product not available</h1><p>This listing is unavailable or not publicly displayed.</p><a href="store.html#all" class="btn secondary">Browse Store</a>';return}
 let page=safeRoute(x.product_page);
 // Existing reviewed learning routes are not payment links.
 if(!page&&x.category==='tool'&&/^tool:[A-Z0-9_-]+$/.test(x.sku))page='advanced-tool.html?tool='+encodeURIComponent(x.sku.slice(5));
 if(!page&&x.category==='bootcamp')page='bootcamp-academy.html';
 if(!page&&x.category==='founding')page='founding600.html';
 if(!page&&x.category==='addon')page='store.html#tools';
 if(!page&&x.category==='book')page='store.html#books';
 document.title=x.display_name+' | The Stock Market: From the Ground Up';
 root.innerHTML='<div class="eyebrow">'+esc(groups.find(v=>v[0]===x.category)?.[1]||'Product')+'</div>'+
 '<h1>'+esc(x.display_name)+'</h1><p class="gu174-state">'+esc(labels[x.status]||'Coming Soon')+'</p>'+
 '<p class="section-intro">'+esc(x.description||'Full teaching and purchase information is being prepared.')+'</p>'+
 '<p class="gu174-price">'+esc(x.price_label||'Pricing to be announced')+'</p>'+
 (x.duration_label?'<p>'+esc(x.duration_label)+'</p>':'')+
 '<p class="small">Product code: '+esc(x.sku)+'</p>'+
 (x.status==='for_sale'?'<p>Any purchase is subject to independent secure checkout, account eligibility, availability and final purchase terms.</p>':
 '<p>This listing does not offer direct checkout. It may be a free program, external-retailer item, unreleased offering or catalog preview. Review the product page for current eligibility.</p>')+
 '<div class="actions">'+(page?'<a class="btn" href="'+esc(page)+'">Explore full product information</a>':'')+
 '<a class="btn secondary" href="store.html#all">Return to all products</a></div>'+
 '<p class="small">Stock-market education does not guarantee trading performance. Brokerages, paid third-party data and financial advice are not included unless an individual product expressly states otherwise.</p>';
}
async function init(){
 const loading=$('store-all-count')||$('store-item-details');
 try{
  source=await getCatalog();
  if($('store-full-catalog')){filters();render();}
  detail();
 }catch(e){
  if($('store-full-catalog'))$('store-full-catalog').innerHTML='<p class="notice">The complete catalog is temporarily unavailable. No purchase is offered from this listing.</p>';
  if($('store-all-count'))$('store-all-count').textContent='Catalog availability could not be verified.';
  if($('store-item-details'))$('store-item-details').innerHTML='<h1>Store listing unavailable</h1><p>Please return to the Store and try again.</p><a href="store.html#all" class="btn secondary">Return to Store</a>';
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();