/* v0.14.0.175 — extend existing Admin Products (read-only prelaunch list until secure editing API exists).
   Never derive payment authorization from public catalog flags. */
(()=>{'use strict';
const enc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mount(){
 const panel=document.getElementById('admin-products-panel');
 if(!panel||document.getElementById('admin-products-prelaunch'))return;
 const all=Array.isArray(window.GroundUpPrelaunchInventory)?window.GroundUpPrelaunchInventory:[];
 if(!all.length)return;
 const distinct=all.filter(p=>p.status==='coming_soon');
 const section=document.createElement('section');section.id='admin-products-prelaunch';section.setAttribute('aria-label','Prelaunch product inventory');
 const h=document.createElement('h3');h.textContent='Prelaunch Product Inventory ('+distinct.length+')';section.append(h);
 const note=document.createElement('p');note.textContent='These are catalog-only previews. Existing Membership, Books and Tools editors remain authoritative; individual release switches require the server-side product-management contract. No checkout or entitlements can be enabled here.';section.append(note);
 const label=document.createElement('label');label.textContent='Search upcoming product names ';label.htmlFor='admin-prelaunch-search';section.append(label);
 const input=document.createElement('input');input.id='admin-prelaunch-search';input.type='search';input.autocomplete='off';section.append(input);
 const status=document.createElement('p');status.id='admin-prelaunch-count';status.setAttribute('role','status');section.append(status);
 const listing=document.createElement('div');listing.id='admin-prelaunch-list';listing.className='admin-grid';section.append(listing);
 function render(){
  const q=input.value.trim().toLowerCase();let filtered=distinct.filter(p=>(p.name+' '+p.sku+' '+p.category).toLowerCase().includes(q));
  status.textContent=filtered.length+' of '+distinct.length+' upcoming products';
  listing.innerHTML=filtered.map(p=>'<article class="admin-card product-admin-card"><div class="eyebrow">'+enc(p.category)+'</div><h4>'+enc(p.name)+'</h4><p>'+enc(p.description)+'</p><p class="small">SKU: '+enc(p.sku)+'</p><p class="product-admin-status">Coming Soon · Checkout locked</p><a class="btn secondary" href="store-upcoming-product.html?sku='+encodeURIComponent(p.sku)+'" target="_blank" rel="noopener">View Product Face</a></article>').join('');
 }
 input.addEventListener('input',render);render();panel.append(section);
}
function init(){if(!Array.isArray(window.GroundUpPrelaunchInventory)){const s=document.createElement('script');s.src='assets/js/store-inventory-v014174.js';s.addEventListener('load',mount);document.head.append(s)}else mount();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();