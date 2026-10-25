/* v0.14.0.174 per-item Store face editor. Owner edit only; never checkout. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const states=[['in_development','In development'],['coming_soon','Coming Soon'],['ready_for_review','Ready for release review'],['listed','Listed — information only'],['for_sale','For sale (requires independent release approval)'],['paused','Paused']];
let items=[],isOwner=false,wired=false,loading=false;
async function auth(){const sb=await window.getSupabaseClient(),r=await sb.auth.getSession();if(!r?.data?.session?.access_token)throw Error('Sign in to manage Store items.');return r.data.session.access_token}
async function admin(action,body){const r=await fetch('/api/admin?action='+encodeURIComponent(action),{method:body?'POST':'GET',headers:{authorization:'Bearer '+await auth(),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});const d=await r.json().catch(()=>null);if(!r.ok||!d?.ok)throw Error(d?.error||'Store administration unavailable');return d}
function card(x){
 const canSell=x.sale_ready===true;
 return '<article class="admin-card gu174-admin-card" data-gu174-sku="'+esc(x.sku)+'"><div class="eyebrow">'+esc(x.category)+'</div>'+
 '<h3>'+esc(x.display_name)+'</h3><p class="small">Product code: <code>'+esc(x.sku)+'</code></p>'+
 '<p class="gu174-admin-price">'+esc(x.price_label||'Pricing to be announced')+' '+esc(x.duration_label||'')+'</p>'+
 '<p class="small">Current status: '+esc(states.find(z=>z[0]===x.status)?.[1]||x.status)+(x.visible?' · Visible':' · Hidden')+'</p>'+
 '<a href="store-item.html?sku='+encodeURIComponent(x.sku)+'" target="_blank" rel="noopener" class="btn secondary">View customer product face</a>'+
 '<details><summary>Edit this listing</summary><div class="gu174-admin-fields">'+
 '<label>Customer-facing name<input data-gu174-field="display_name" maxlength="160" value="'+esc(x.display_name)+'" '+(!isOwner?'disabled':'')+'></label>'+
 '<label>Description<textarea data-gu174-field="description" maxlength="2400" rows="4" '+(!isOwner?'disabled':'')+'>'+esc(x.description||'')+'</textarea></label>'+
 '<label>Store status<select data-gu174-field="status" '+(!isOwner?'disabled':'')+'>'+states.map(([v,n])=>'<option value="'+v+'" '+(x.status===v?'selected ':'')+((v==='for_sale'&&!canSell)?'disabled ':'')+'>'+esc(n)+'</option>').join('')+'</select></label>'+
 '<label class="gu174-check"><input type="checkbox" data-gu174-field="visible" '+(x.visible?'checked ':'')+(!isOwner?'disabled':'')+'> Display this item in Store</label>'+
 '<p class="small">'+(canSell?'A separate server readiness approval exists; sale remains governed by the real payment contract.':'Sale activation blocked until independent financial, content, rights, security and fulfillment checks pass.')+'</p>'+
 '<p class="small">The Store controls here do not edit Stripe prices, enrollment, existing members, ebook rights, or checkout.</p>'+
 (isOwner?'<button type="button" class="btn" data-gu174-save="'+esc(x.sku)+'">Save this item</button>':'<p>Owner role required to edit.</p>')+
 '</div></details></article>';
}
function render(){
 const root=$('admin-storefront-grid');if(!root)return;
 const query=($('admin-storefront-search')?.value||'').trim().toLowerCase();
 const subset=items.filter(x=>!query||(x.sku+' '+x.display_name+' '+x.description+' '+x.category).toLowerCase().includes(query));
 root.innerHTML=subset.map(card).join('')||'<p>No Store records match this search.</p>';
 $('admin-storefront-count').textContent=subset.length+' shown of '+items.length+' Store items. Edit one item at a time; changes are saved to the server.';
}
function wire(){
 if(wired)return;wired=true;
 $('admin-storefront-search')?.addEventListener('input',render);
 $('admin-storefront-grid')?.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-gu174-save]');if(!b)return;
  const sku=b.dataset.gu174Save;const x=items.find(row=>row.sku===sku);if(!x||!isOwner)return;
  const p=b.closest('[data-gu174-sku]');if(!p)return;
  const field=k=>p.querySelector('[data-gu174-field="'+k+'"]');
  const payload={sku,expected_version:x.version,display_name:field('display_name').value.trim(),description:field('description').value.trim(),status:field('status').value,visible:field('visible').checked};
  if(payload.status==='for_sale'&&!x.sale_ready){alert('This product has not passed independent release approval. It cannot be sold yet.');return}
  if(!payload.display_name){alert('A customer-facing name is required.');return}
  if(!confirm('Save this product face? This will change public Store information but will NOT activate payment or member entitlement.'))return;
  b.disabled=true;const count=$('admin-storefront-count');
  try{const answer=await admin('storefront_item_save',payload);
   count.textContent=answer.notice||'Store listing saved.';await load(true);
   const next=$('admin-storefront-grid')?.querySelectorAll('[data-gu174-sku]');
   for(const item of next||[])if(item.dataset.gu174Sku===sku){item.querySelector('details').open=true;break}
  }catch(e){count.textContent='Store item not saved: '+e.message;}
  finally{b.disabled=false}
 });
}
async function load(force=false){
 if(loading&&!force)return;loading=true;
 try{
  wire();
  const [context,catalog]=await Promise.all([admin('context'),admin('storefront_items')]);
  isOwner=context.roles?.includes('OWNER')&&context.permissions?.includes('catalog.manage');
  items=Array.isArray(catalog.items)?catalog.items:[];
  render();
 }catch(e){const el=$('admin-storefront-count');if(el)el.textContent='Store catalog could not be verified: '+e.message;}
 finally{loading=false}
}
window.GroundUpAdminStorefront={load};
})();