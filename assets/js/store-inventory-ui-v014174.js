/* Current first-party Supabase storefront display. No payment or entitlement changes.
 * Live public catalog is authoritative; checked-in historical inventory is a
 * display-only fallback when the API cannot be reached.
 */
(()=>{'use strict';
const escapeHtml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categoryLabels=Object.freeze({membership:'Memberships',founding:'Founding Memberships',course:'Boot Camps',
 book:'Books',tool:'Tools',bootcamp:'Boot Camps',addon:'Add-ons',feature:'Included Features'});
const base=Array.isArray(window.GroundUpPrelaunchInventory)?window.GroundUpPrelaunchInventory:[];
// If the authoritative visible-only API fails, expose only previously approved
// Founding and book catalog identities. Upcoming/private overlays stay hidden.
// On a catalog outage, hide founder sales instead of reviving retired marketing.
const listedCore=p=>p.category==='Books'&&p.status==='existing_catalog';
const $=id=>document.getElementById(id);
const clean=x=>String(x??'').trim();
let all=[],isVerified=false,isFull=false,pageNumber=1,layout={catalog_columns:5,catalog_rows:3};
const currentItem=x=>x.saleReady===true||['published','selling','for_sale','listed','release_ready'].includes(x.status);
const orderNewest=(a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))||
 (Number(a.displayOrder??9999)-Number(b.displayOrder??9999))||String(a.sku).localeCompare(String(b.sku));
function groups(items){
 const byType=new Map();
 for(const x of items){if(!byType.has(x.category))byType.set(x.category,[]);byType.get(x.category).push(x)}
 return [...byType].map(([category,rows])=>'<section class="gu-inventory-type"><h2>'+escapeHtml(category)+'</h2><div class="gu-inventory-type-grid">'+cards(rows)+'</div></section>').join('');
}
function paging(host,total,select){
 if(!host)return;host.replaceChildren();if(total<=1)return;
 const back=document.createElement('button'),next=document.createElement('button'),number=document.createElement('span');
 back.type='button';next.type='button';back.textContent='Previous';next.textContent='Next';
 back.disabled=pageNumber<=1;next.disabled=pageNumber>=total;number.textContent='Page '+pageNumber+' of '+total;
 back.addEventListener('click',()=>select(pageNumber-1));next.addEventListener('click',()=>select(pageNumber+1));
 host.append(back,number,next);
}
function fromLocal(x){return {sku:x.sku,name:x.name,description:x.description||'',
 category:/^FOUNDING_(14|30|60)$/.test(x.sku)?'Founding Memberships':x.category||'Upcoming',price:x.status==='existing_catalog'?'See product details':'Pricing to be announced',
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
 return x.betaTestingReady===true&&x.saleReady===true&&String(x.sku).startsWith('tool:')?
 'Beta Testing Ready · Founding 600 member testing pending; checkout independently verified':
 x.saleReady?'Purchase subject to secure checkout verification':
 x.status==='coming_soon'?'Coming Soon · Beta / development':
 x.status==='listed'?(x.category==='Books'?'Book listed · See retailer availability':'Listed · Purchasing not yet enabled'):'Not available to purchase';
}
function image(x){const m=window.GroundUpCatalogVisuals?.resolve?.(x);return m?
 '<a class="gu-catalog-card-image" href="'+escapeHtml(detail(x))+'" aria-label="View '+escapeHtml(x.name)+'"><img src="'+escapeHtml(m.src)+'" alt="'+escapeHtml(m.alt)+'" loading="lazy" width="340" height="190"></a>':''}
function summary(x){const d=clean(x.description).replace(/\s+/g,' ');return d.length>132?
 '<span>'+escapeHtml(d.slice(0,132).trimEnd())+'…</span> <a class="gu-catalog-read-more" href="'+escapeHtml(detail(x))+'">Read more</a>':escapeHtml(d);}
function cards(items){
 return items.map(x=>`<article class="product-card store-sell-card" data-store-sku="${escapeHtml(x.sku)}">
 ${image(x)}<div class="eyebrow">${escapeHtml(x.category)}</div>
 <span class="${x.betaTestingReady===true?'store-beta-ribbon':'store-soon-label'}">${escapeHtml(label(x))}</span>
 <h2>${escapeHtml(x.name)}</h2>
 <p class="gu-catalog-summary">${summary(x)}</p>
 <p><strong>Price:</strong> ${escapeHtml(x.price||'Pricing to be confirmed')}</p>
 ${x.duration?`<p><strong>Term:</strong> ${escapeHtml(x.duration)}</p>`:''}
 <p class="small">Catalog ID: ${escapeHtml(x.sku)}</p>
 <a class="btn secondary" href="${escapeHtml(detail(x))}">${x.saleReady?'Review checkout availability':'View product details'}</a>
 </article>`).join('');
}
function show(){
 const list=$('inventory-list'),root=$('inventory-detail'),search=$('inventory-search'),filter=$('inventory-category'),status=$('inventory-status');
 if(list){
  const term=clean(search?.value).toLowerCase(),cat=clean(filter?.value),release=clean($('inventory-release')?.value)||'all';
  const rows=all.filter(x=>x.category!=='Memberships'&&(!cat||x.category===cat)&&
    (release==='all'||(release==='current'?currentItem(x):!currentItem(x)))&&(!term||
   (x.name+' '+x.sku+' '+x.description+' '+x.category).toLowerCase().includes(term))).sort(orderNewest);
  const pageSize=Math.max(2,Math.min(72,layout.catalog_columns*layout.catalog_rows));
  const pages=Math.max(1,Math.ceil(rows.length/pageSize));
  pageNumber=Math.min(pages,Math.max(1,pageNumber));
  const subset=rows.slice((pageNumber-1)*pageSize,pageNumber*pageSize);
  list.innerHTML=groups(subset)||'<p>No matching products.</p>';
  list.style.setProperty('--gu-catalog-columns',String(layout.catalog_columns));
  paging($('inventory-pagination'),pages,p=>{
    pageNumber=p;const url=new URL(location.href);
    url.searchParams.set('page',String(p));history.replaceState(history.state,'',url);
    show();list.scrollIntoView({block:'start',behavior:'auto'});
  });
  if(status)status.textContent=rows.length+' verified catalog listings · '+subset.length+
   ' on page '+pageNumber+' of '+pages+' · sorted by latest catalog update.'+
   (isFull?'':' Reduced fallback catalog.')+' Purchase availability is shown individually.';
 }
 if(root){
  const raw=new URLSearchParams(location.search).get('sku')||'';
  const x=all.find(x=>x.sku===raw||x.sku.split(':').pop()===raw);
  if(!x){
   root.innerHTML='<h1>Product currently unavailable</h1><p>Its current catalog information could not be verified. No purchase has been initiated.</p><a href="store-all-products.html">Back to all products</a>';
   return;
  }
  document.title=x.name+' | The Stock Market: From the Ground Up';
  root.innerHTML='<div class="gu-product-detail-art">'+image(x)+'</div><div class="eyebrow">'+escapeHtml(x.category)+'</div><h1>'+escapeHtml(x.name)+'</h1>'+
   '<p>'+escapeHtml(x.description)+'</p><p><strong>Price:</strong> '+escapeHtml(x.price||'Pricing to be confirmed')+'</p>'+
   (x.duration?'<p><strong>Term:</strong> '+escapeHtml(x.duration)+'</p>':'')+
   '<p><strong>Availability:</strong> '+escapeHtml(label(x))+'</p>'+
   '<p>Catalog ID: '+escapeHtml(x.sku)+'</p>'+
   '<p>Checkout requires separately verified price, delivery, legal and payment authorization; viewing a listing never creates an order.</p>'+
   (x.category==='Boot Camps'?'<p>This Boot Camp is not priced or sold standalone. Review the existing OnDemand Training membership for current access and eligibility.</p>'+
   '<a class="btn secondary" href="store-membership-ondemand-monthly.html">Review OnDemand Training membership</a> '+
   '<a class="btn secondary" href="bootcamp-academy.html">Explore the Boot Camp Academy</a> ':'' )+
   '<a class="btn secondary" href="store-all-products.html">Back to all products</a>';
 }
}
async function load(){
 try{
  const r=await fetch('/api/storefront-public-catalog',{cache:'no-store',credentials:'same-origin'});
  if(!r.ok)throw Error('Current catalog unavailable');
  const j=await r.json();
  if(j.ok!==true||j.source!=='verified_storefront'||!Array.isArray(j.items)||
    j.count!==j.items.length||j.items.length>150||
    new Set(j.items.map(x=>x.sku)).size!==j.items.length)
   throw Error('Catalog integrity check failed');
  all=j.items.map(normalize);isFull=true;
  if(j.layout&&typeof j.layout==='object')for(const k of Object.keys(layout)){
   const n=Number(j.layout[k]);if(Number.isInteger(n)&&n>=1&&n<=12)layout[k]=n;
  }
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
  const params=new URLSearchParams(location.search);
  const requested=params.get('category');
  if(requested&&options.includes(requested))category.value=requested;
 }
 const params2=new URLSearchParams(location.search),mode=params2.get('status');
 if($('inventory-release')&&['current','upcoming','all'].includes(mode))$('inventory-release').value=mode;
 const number=Number(params2.get('page'));pageNumber=Number.isSafeInteger(number)&&number>0?number:1;
 show();
}
function init(){
 $('inventory-search')?.addEventListener('input',()=>{pageNumber=1;show()});
 $('inventory-category')?.addEventListener('change',()=>{pageNumber=1;show()});
 $('inventory-release')?.addEventListener('change',()=>{pageNumber=1;
  const url=new URL(location.href);url.searchParams.set('status',$('inventory-release').value);url.searchParams.delete('page');
  history.replaceState(history.state,'',url);show()});
 const status=$('inventory-status');if(status)status.textContent='Verifying the current Store inventory…';
 void load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();