/* v0.14.0.175 — extend existing Admin Products (read-only prelaunch list until secure editing API exists).
   Never derive payment authorization from public catalog flags. */
(()=>{'use strict';
const enc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mount(){
 const panel=document.getElementById('admin-products-panel');
 if(!panel||document.getElementById('admin-products-prelaunch'))return;
 const all=Array.isArray(window.GroundUpPrelaunchInventory)?window.GroundUpPrelaunchInventory:[];
 if(!all.length)return;
 const distinct=all.filter(p=>p.status==='coming_soon');let overrides=new Map();
 const section=document.createElement('section');section.id='admin-products-prelaunch';section.setAttribute('aria-label','Prelaunch product inventory');
 const h=document.createElement('h3');h.textContent='Prelaunch Product Inventory ('+distinct.length+')';section.append(h);
 const note=document.createElement('p');note.textContent='These are catalog-only previews. Existing Membership, Books and Tools editors remain authoritative; individual release switches require the server-side product-management contract. No checkout or entitlements can be enabled here.';section.append(note);
 const label=document.createElement('label');label.textContent='Search upcoming product names ';label.htmlFor='admin-prelaunch-search';section.append(label);
 const input=document.createElement('input');input.id='admin-prelaunch-search';input.type='search';input.autocomplete='off';section.append(input);
 const status=document.createElement('p');status.id='admin-prelaunch-count';status.setAttribute('role','status');section.append(status);
 const listing=document.createElement('div');listing.id='admin-prelaunch-list';listing.className='admin-grid';section.append(listing);
 async function api(action,body){
  const supabase=await window.getSupabaseClient(),session=(await supabase.auth.getSession()).data.session;
  if(!session?.access_token)throw Error('Owner sign-in required');
  const resp=await fetch('/api/admin?action='+encodeURIComponent(action),{method:body?'POST':'GET',headers:{authorization:'Bearer '+session.access_token,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const data=await resp.json();if(!resp.ok||!data.ok)throw Error(data.error||'Admin API unavailable');return data;
 }
 function render(){
  const q=input.value.trim().toLowerCase(),filtered=distinct.filter(p=>(p.name+' '+p.sku+' '+p.category).toLowerCase().includes(q));
  status.textContent=filtered.length+' of '+distinct.length+' upcoming products';
  listing.innerHTML=filtered.map(p=>{
   const o=overrides.get(p.sku)||{},v=o.version||0;
   return '<form class="admin-card product-admin-card" data-product-overlay="'+enc(p.sku)+'">'+
    '<div class="eyebrow">'+enc(p.category)+'</div><h4>'+enc(p.name)+'</h4>'+
    '<label>Store title<input name="title" maxlength="160" required value="'+enc(o.title||p.name)+'"></label>'+
    '<label>Store description<textarea name="description" maxlength="2400" rows="3">'+enc(o.description??p.description)+'</textarea></label>'+
    '<label>Availability<select name="lifecycle">'+['draft','coming_soon','paused','release_ready'].map(k=>'<option value="'+k+'"'+((o.lifecycle||'coming_soon')===k?' selected':'')+'>'+k.replaceAll('_',' ')+'</option>').join('')+'</select></label>'+
    '<label><input name="store_visible" type="checkbox" '+((o.store_visible??true)?'checked':'')+'> Visible in upcoming Store (requires publication API)</label>'+
    '<p class="small">SKU: '+enc(p.sku)+' · Revision '+v+' · Checkout remains locked</p>'+
    '<button class="btn secondary" type="submit">Save Product Draft</button> '+
    '<a class="btn secondary" href="store-upcoming-product.html?sku='+encodeURIComponent(p.sku)+'" target="_blank" rel="noopener">View Product Face</a></form>';
  }).join('');
 }
 listing.addEventListener('submit',async event=>{
   const form=event.target.closest('form[data-product-overlay]');if(!form)return;event.preventDefault();
   const sku=form.dataset.productOverlay,p=distinct.find(x=>x.sku===sku);if(!p)return;
   const submit=form.querySelector('button[type=submit]');submit.disabled=true;
   try{
    const result=await api('store_product_overlay_save',{sku,title:form.elements.title.value.trim(),
      description:form.elements.description.value.trim(),lifecycle:form.elements.lifecycle.value,
      store_visible:form.elements.store_visible.checked,expected_version:overrides.get(sku)?.version||0});
    overrides.set(sku,result.item);status.textContent='Saved '+sku+' · revision '+result.item.version+'; no checkout enabled.';
    render();
   }catch(e){status.textContent='Could not save '+sku+': '+e.message}
   finally{submit.disabled=false}
 });
 api('store_product_overrides').then(result=>{overrides=new Map((result.items||[]).map(x=>[x.sku,x]));render();}).catch(e=>{status.textContent='Read-only preview: '+e.message;});
 input.addEventListener('input',render);render();panel.append(section);
}
function init(){if(!Array.isArray(window.GroundUpPrelaunchInventory)){const s=document.createElement('script');s.src='assets/js/store-inventory-v014174.js';s.addEventListener('load',mount);document.head.append(s)}else mount();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();