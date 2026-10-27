/* Current first-party Supabase storefront display. No payment or entitlement changes.
 * Live public catalog is authoritative; checked-in historical inventory is a
 * display-only fallback when the API cannot be reached.
 */
(()=>{'use strict';
const escapeHtml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categoryLabels=Object.freeze({membership:'Memberships',founding:'Founding Memberships',
 book:'Books',tool:'Tools',bootcamp:'Boot Camps',addon:'Add-ons',feature:'Included Features'});
const base=Array.isArray(window.GroundUpPrelaunchInventory)?window.GroundUpPrelaunchInventory:[];
// If the authoritative visible-only API fails, expose only previously approved
// Founding and book catalog identities. Upcoming/private overlays stay hidden.
const listedCore=p=>/^FOUNDING_(30|60)$/.test(p.sku)||(p.category==='Books'&&p.status==='existing_catalog');
const $=id=>document.getElementById(id);
const clean=x=>String(x??'').trim();
let all=[],isVerified=false,isFull=false;
function fromLocal(x){return {sku:x.sku,name:x.name,description:x.description||'',
 category:x.category||'Upcoming',price:x.status==='existing_catalog'?'See product details':'Pricing to be announced',
 duration:x.duration||'',status:x.status==='existing_catalog'?'listed':'coming_soon',
 saleReady:false,page:/^[a-z0-9-]+\.html$/.test(x.href||'')?x.href:null};}
function normalize(x){return {...x,category:categoryLabels[x.category]||x.category};}
function detail(x){
 if(x.page)return x.page;
 if(x.category==='Founding Memberships')return 'founding600.html';
 const code=clean(x.sku).split(':').pop();
 return 'store-upcoming-product.html?sku='+encodeURIComponent(code);
}
function label(x){
 return x.saleReady?'Purchase subject to secure checkout verification':
 x.status==='coming_soon'?'Coming Soon · Beta / development':
 x.status==='listed'?'Listed · Purchasing not yet enabled':'Not available to purchase';
}
function cards(items){
 return items.map(x=>`<article class="product-card store-sell-card" data-store-sku="${escapeHtml(x.sku)}">
 <div class="eyebrow">${escapeHtml(x.category)}</div>
 <span class="store-soon-label">${escapeHtml(label(x))}</span>
 <h2>${escapeHtml(x.name)}</h2>
 <p>${escapeHtml(x.description)}</p>
 <p><strong>Price:</strong> ${escapeHtml(x.price||'Pricing to be confirmed')}</p>
 ${x.duration?`<p><strong>Term:</strong> ${escapeHtml(x.duration)}</p>`:''}
 <p class="small">Catalog ID: ${escapeHtml(x.sku)}</p>
 <a class="btn secondary" href="${escapeHtml(detail(x))}">${x.saleReady?'Review checkout availability':'View product details'}</a>
 </article>`).join('');
}
function show(){
 const list=$('inventory-list'),root=$('inventory-detail'),search=$('inventory-search'),filter=$('inventory-category'),status=$('inventory-status');
 if(list){
  const term=clean(search?.value).toLowerCase(),cat=clean(filter?.value);
  const rows=all.filter(x=>(!cat||x.category===cat)&&(!term||
   (x.name+' '+x.sku+' '+x.description+' '+x.category).toLowerCase().includes(term)));
  list.innerHTML=cards(rows)||'<p>No matching products.</p>';
  if(status)status.textContent=rows.length+' of '+all.length+' available catalog listings shown. '+
   (isFull?'Current production catalog verified.':'A reduced fallback catalog is shown.')+
   ' Listings do not imply payment availability.';
 }
 if(root){
  const raw=new URLSearchParams(location.search).get('sku')||'';
  const x=all.find(x=>x.sku===raw||x.sku.split(':').pop()===raw);
  if(!x){
   root.innerHTML='<h1>Product currently unavailable</h1><p>Its current catalog information could not be verified. No purchase has been initiated.</p><a href="store-all-products.html">Back to all products</a>';
   return;
  }
  document.title=x.name+' | The Stock Market: From the Ground Up';
  root.innerHTML='<div class="eyebrow">'+escapeHtml(x.category)+'</div><h1>'+escapeHtml(x.name)+'</h1>'+
   '<p>'+escapeHtml(x.description)+'</p><p><strong>Price:</strong> '+escapeHtml(x.price||'Pricing to be confirmed')+'</p>'+
   (x.duration?'<p><strong>Term:</strong> '+escapeHtml(x.duration)+'</p>':'')+
   '<p><strong>Availability:</strong> '+escapeHtml(label(x))+'</p>'+
   '<p>Catalog ID: '+escapeHtml(x.sku)+'</p>'+
   '<p>Checkout requires separately verified price, delivery, legal and payment authorization; viewing a listing never creates an order.</p>'+
   (x.category==='Boot Camps'?'<a class="btn secondary" href="bootcamp-academy.html">Explore the Boot Camp Academy</a> ':'' )+
   '<a class="btn secondary" href="store-all-products.html">Back to all products</a>';
 }
}
async function load(){
 try{
  const r=await fetch('/api/storefront-public-catalog',{cache:'no-store',credentials:'same-origin'});
  if(!r.ok)throw Error('Current catalog unavailable');
  const j=await r.json();
  if(j.ok!==true||j.source!=='verified_storefront'||!Array.isArray(j.items)||
    j.count!==j.items.length||j.items.length<50||j.items.length>150||
    new Set(j.items.map(x=>x.sku)).size!==j.items.length)
   throw Error('Catalog integrity check failed');
  all=j.items.map(normalize);isFull=true;
 }catch{
  const core=base.filter(listedCore);
  all=core.map(fromLocal);
 }
 isVerified=true;
 const category=$('inventory-category');
 if(category){
  const options=['',...new Set(all.map(x=>x.category))].sort((a,b)=>a?b?a.localeCompare(b):1:-1);
  category.replaceChildren();
  for(const label of options){const o=document.createElement('option');o.value=label;o.textContent=label||'All categories';category.append(o)}
  const requested=new URLSearchParams(location.search).get('category');
  if(requested&&options.includes(requested))category.value=requested;
 }
 show();
}
function init(){
 $('inventory-search')?.addEventListener('input',show);
 $('inventory-category')?.addEventListener('change',show);
 const status=$('inventory-status');if(status)status.textContent='Verifying the current Store inventory…';
 void load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();