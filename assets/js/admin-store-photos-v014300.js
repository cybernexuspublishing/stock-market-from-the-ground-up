/* Owner-only product photo upload and gallery attached to existing book editor.
 * Supabase Storage RLS enforces Owner identity, file type/size, and per-product path.
 * Photo records are in the existing catalog's dependent image table; no checkout change.
 */
(()=>{'use strict';
if(!/^\/admin(?:\.html)?$/.test(location.pathname))return;
const bucket='gu-store-photos',gallery='gu_store_product_photos_v014300';
const note=(host,s)=>{host.textContent=s;};
const el=(name,value)=>{const x=document.createElement(name);if(value!==undefined)x.textContent=value;return x;};
let armed=false;
async function owner(){
 const sb=await window.getSupabaseClient?.();if(!sb)throw Error('Sign in as Owner to upload product photos.');
 const {data,error}=await sb.rpc('gu_store_owner_v014297');
 if(error||data!==true)throw Error('Owner permission required for media upload.');
 const {data:auth,error:authError}=await sb.auth.getUser();
 if(authError||!auth?.user?.id)throw Error('Authenticated Owner session required.');
 return {sb,user:auth.user};
}
async function mount(editor){
 if(!editor||editor.dataset.storeMediaMounted)return;
 editor.dataset.storeMediaMounted='1';
 const row=editor.closest('.admin-field')||editor.parentElement;
 const container=el('div');container.id='gu-store-product-photos';container.className='admin-card';
 const heading=el('h3','Item photo gallery');const status=el('p','Checking Owner permissions…');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const file=el('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.multiple=true;
 file.setAttribute('aria-label','Select up to six product photos (JPEG, PNG, WebP, 5MB each)');
 const button=el('button','Upload selected photos');button.type='button';button.className='btn secondary';
 const list=el('div');list.className='admin-grid';list.setAttribute('aria-label','Current product photos');
 container.append(heading,el('p','Save a new product first. Once it has an existing SKU, you can upload up to six images. The first uploaded image can be used as the Store cover. Images are publicly visible once your item is published.'),file,button,status,list);
 row.after(container);
 const code=document.getElementById('dlg-p-code')?.value||'';
 const refresh=async()=>{
  list.replaceChildren();
  const {sb}=await owner();
  const q=await sb.from(gallery).select('id,storage_path,alt_text,sort_order').eq('product_code',code).order('sort_order').order('created_at');
  if(q.error)throw Error(q.error.message);for(const item of q.data||[]){
   const card=el('article');card.className='admin-card';
   const image=el('img');const publicUrl=sb.storage.from(bucket).getPublicUrl(item.storage_path).data.publicUrl;
   image.src=publicUrl;image.alt=item.alt_text||'Product photograph';image.loading='lazy';image.style.cssText='max-width:160px;max-height:140px;object-fit:cover;border-radius:8px';
   const caption=el('input');caption.value=item.alt_text||'';caption.maxLength=180;caption.placeholder='Image description for accessibility';caption.setAttribute('aria-label','Photo description');
   const save=el('button','Save description');save.type='button';save.className='btn secondary';
   save.onclick=async()=>{try{const r=await sb.from(gallery).update({alt_text:caption.value.trim()}).eq('id',item.id);if(r.error)throw r.error;note(status,'Saved photo description.');}catch(e){note(status,e.message);}};
   const cover=el('button','Set as cover');cover.type='button';cover.className='btn secondary';cover.onclick=()=>{
    editor.value=publicUrl;editor.dispatchEvent(new Event('input',{bubbles:true}));note(status,'Cover URL added to editor. Save the product to publish this cover.');
   };
   const remove=el('button','Remove photo');remove.type='button';remove.className='btn secondary';
   remove.onclick=async()=>{
    if(!confirm('Remove this uploaded product photo?'))return;
    try{const d=await sb.from(gallery).delete().eq('id',item.id).select('id');if(d.error||!d.data?.length)throw d.error||Error('Removal was not confirmed.');
      const v=await sb.storage.from(bucket).remove([item.storage_path]);
      note(status,v.error?'The photo record was removed; its storage object needs Owner cleanup.':'Photo removed.');
      await refresh();
    }catch(e){note(status,e.message);}
   };
   card.append(image,caption,save,cover,remove);list.append(card);
  }
  note(status,(q.data||[]).length+' / 6 photos saved.');
  return (q.data||[]).length;
 };
 if(!/^[A-Z0-9_]{3,64}$/.test(code)){
  button.disabled=true;file.disabled=true;note(status,'Save an item with an uppercase product SKU first, then reopen the editor to upload photographs.');return;
 }
 try{await refresh();}catch(e){button.disabled=true;file.disabled=true;note(status,e.message);return;}
 button.addEventListener('click',async()=>{
  button.disabled=true;
  try{
   const {sb,user}=await owner();
   const exists=await sb.from('catalog_products').select('product_code').eq('product_code',code).maybeSingle();
   if(exists.error||!exists.data)throw Error('Save this item before uploading photos.');
   const files=[...file.files||[]],prior=await refresh();
   if(!files.length)throw Error('Choose at least one photo.');
   if(prior+files.length>6)throw Error('A product may have at most six photos.');
   for(const selected of files){
    if(!['image/jpeg','image/png','image/webp'].includes(selected.type)||selected.size>5*1024*1024||selected.size<100)
     throw Error('Each image must be a real JPEG, PNG or WebP file under 5MB.');
    const ext=selected.type==='image/png'?'png':selected.type==='image/webp'?'webp':'jpg';
    const token=crypto.randomUUID().replace(/-/g,'').slice(0,24);
    const path=user.id+'/'+code+'/'+token+'.'+ext;
    const uploaded=await sb.storage.from(bucket).upload(path,selected,{contentType:selected.type,upsert:false});
    if(uploaded.error)throw uploaded.error;
    const added=await sb.from(gallery).insert({product_code:code,storage_path:path,created_by:user.id,
     alt_text:code.replaceAll('_',' ')+' product photo',sort_order:100+prior}).select('id');
    if(added.error||!added.data?.length){
     await sb.storage.from(bucket).remove([path]);
     throw added.error||Error('Photo record was not committed.');
    }
    prior++;
   }
   file.value='';await refresh();note(status,'Photos saved in the verified product gallery.');
  }catch(e){note(status,'Upload failed: '+(e.message||'Owner photo service unavailable.'));}
  finally{button.disabled=false;}
 });
}
function start(){
 if(armed)return;armed=true;
 const observer=new MutationObserver(()=>{
  const editor=document.getElementById('dlg-p-cover');
  if(editor&&!editor.dataset.storeMediaMounted)void mount(editor);
 });
 observer.observe(document.body,{childList:true,subtree:true});
 const editor=document.getElementById('dlg-p-cover');if(editor)void mount(editor);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();