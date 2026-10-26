/* Owner-managed product-family categories. Reuses catalog_products.family; no
 * alternate price, checkout, or product data store. All writes enforced by
 * Supabase RLS + audited trigger gu_store_category_lifecycle_v014298. */
(()=>{'use strict';
if(!/^\/admin(?:\.html)?$/.test(location.pathname))return;
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const normalize=x=>String(x||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);
let client=null,categories=[],mounted=false;
async function owner(){
 const sb=await window.getSupabaseClient?.();if(!sb)throw Error('Sign in to manage Store categories.');
 const {data,error}=await sb.rpc('gu_store_owner_v014297');
 if(error||data!==true)throw Error('Owner role required to manage Store categories.');
 client=sb;return sb;
}
function mount(){
 if(mounted)return;const root=document.getElementById('admin-products-panel');if(!root)return;
 mounted=true;
 const box=el('section');box.className='admin-card';box.id='admin-store-category-manager';
 box.innerHTML='<h2>Store Categories</h2><p class="small">Add, rename, hide or remove product categories. Category IDs remain stable so existing items and URLs retain their identities. A category in use cannot be deleted.</p>'+
 '<form id="store-add-category" class="admin-toolbar"><label>New category name<input name="name" required minlength="2" maxlength="90" autocomplete="off"></label>'+
 '<button class="btn" type="submit">Add Category</button></form>'+
 '<p role="status" aria-live="polite" id="store-category-admin-message"></p>'+
 '<div id="store-category-admin-list" class="admin-grid"></div>';
 root.append(box);
 box.querySelector('#store-add-category').addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget,name=String(new FormData(form).get('name')||'').trim(),slug=normalize(name);
  if(name.length<2||slug.length<2)return message('Enter a valid category name.',true);
  try{await owner();const r=await client.from('gu_store_categories_v014297').insert({slug,name});
   if(r.error)throw r.error;form.reset();message('Added '+name+'.');await load();}
  catch(e){message(e.message||'Category could not be added.',true);}
 });
 void load();
 const obs=new MutationObserver(()=>{
  const input=document.getElementById('dlg-p-family');
  if(!input||input.dataset.storeCategoryWired||!categories.length)return;
  input.dataset.storeCategoryWired='1';
  const select=el('select');select.id=input.id;
  const known=input.value,slugs=new Set(categories.filter(x=>x.active).map(x=>x.slug));
  for(const item of categories.filter(x=>x.active)){
   const option=el('option',item.name);option.value=item.slug;select.append(option);
  }
  if(known&&!slugs.has(known)){const legacy=el('option',known+' (existing category)');legacy.value=known;select.append(legacy);}
  select.value=known||categories[0].slug;
  input.replaceWith(select);
 });
 obs.observe(document.body,{subtree:true,childList:true});
}
function message(text,bad=false){const node=document.getElementById('store-category-admin-message');if(node){node.textContent=text;node.dataset.state=bad?'error':'ok';}}
async function load(){
 try{await owner();const result=await client.from('gu_store_categories_v014297')
  .select('slug,name,active,revision,sort_order').order('sort_order').order('slug');
  if(result.error)throw result.error;
  categories=result.data||[];render();message(categories.length+' Store categories loaded.');
 }catch(e){message(e.message||'Category service unavailable.',true);}
}
function render(){
 const list=document.getElementById('store-category-admin-list');if(!list)return;list.replaceChildren();
 for(const c of categories){
  const form=el('form');form.className='admin-card';form.dataset.slug=c.slug;
  const heading=el('strong','Category ID: '+c.slug);form.append(heading);
  const label=el('label','Display name '),input=el('input');input.value=c.name;input.name='name';input.required=true;input.maxLength=90;label.append(input);
  const active=el('input');active.type='checkbox';active.checked=c.active;active.name='active';
  const activeLabel=el('label',' Active / visible');activeLabel.prepend(active);
  const save=el('button','Save'),remove=el('button','Remove category');save.type='submit';save.className='btn secondary';
  remove.type='button';remove.className='btn secondary';form.append(label,activeLabel,save,remove);list.append(form);
  form.addEventListener('submit',async event=>{
   event.preventDefault();try{await owner();const name=input.value.trim();
    if(name.length<2)throw Error('Enter a category name.');
    const r=await client.from('gu_store_categories_v014297').update({name,active:active.checked})
     .eq('slug',c.slug).eq('revision',c.revision).select('slug,revision');
    if(r.error)throw r.error;if(!r.data?.length)throw Error('This category changed elsewhere; refresh before saving.');
    message('Saved '+c.slug+'.');await load();
   }catch(e){message(e.message||'Category update failed.',true);}
  });
  remove.addEventListener('click',async()=>{
   if(!confirm('Remove the category '+c.name+'? This is denied while items use the category.'))return;
   try{await owner();const r=await client.from('gu_store_categories_v014297').delete()
    .eq('slug',c.slug).eq('revision',c.revision).select('slug');
    if(r.error)throw r.error;if(!r.data?.length)throw Error('Category was already changed; refresh first.');
    message('Category removed.');await load();
   }catch(e){message(e.message||'Category is in use or cannot be removed.',true);}
  });
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();