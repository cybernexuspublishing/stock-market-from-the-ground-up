/* Public product gallery, using exactly the audited photo rows belonging
 * to the existing catalog_products SKU. No direct order or payment logic.
 */
(()=>{'use strict';
if(!/^\/store-[a-z0-9_-]+\.html$/i.test(location.pathname))return;
async function render(){
 const root=document.getElementById('store-product-root');
 const code=String(root?.dataset?.productCode||'');
 if(!root||!code||!(/^[A-Z0-9_]{3,64}$/.test(code))||root.dataset.photoGalleryAdded)return;
 root.dataset.photoGalleryAdded='1';
 try{
  let sb=null;
  for(let i=0;i<35;i++){if(typeof window.getSupabaseClient==='function'){sb=await window.getSupabaseClient();break}
   await new Promise(r=>setTimeout(r,85));}
  if(!sb)return;
  const result=await sb.from('gu_store_product_photos_v014300')
   .select('storage_path,alt_text,sort_order').eq('product_code',code).order('sort_order').limit(6);
  if(result.error||!result.data?.length)return;
  const host=document.createElement('section');host.className='store-product-gallery';
  host.setAttribute('aria-label','Product photo gallery');host.style.cssText='margin:1.5rem auto;max-width:1000px';
  const heading=document.createElement('h2');heading.textContent='Product photos';host.append(heading);
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem';
  host.append(grid);
  const dialog=document.createElement('dialog');dialog.className='store-gallery-dialog';
  dialog.style.cssText='max-width:min(92vw,880px);background:#142035;color:#fff;border:1px solid #718096;border-radius:14px';
  const large=document.createElement('img');large.alt='';large.style.cssText='max-width:100%;height:auto;max-height:80vh;object-fit:contain';
  const close=document.createElement('button');close.type='button';close.textContent='Close photo';close.className='btn secondary';close.onclick=()=>dialog.close();
  dialog.append(close,large);host.append(dialog);
  for(const item of result.data){
   const url=sb.storage.from('gu-store-photos').getPublicUrl(item.storage_path).data.publicUrl;
   const imageURL=new URL(url);
   if(imageURL.protocol!=='https:'||!imageURL.hostname.endsWith('.supabase.co')||
    !imageURL.pathname.includes('/storage/v1/object/public/gu-store-photos/'))continue;
   const button=document.createElement('button');button.type='button';
   button.style.cssText='border:1px solid #7089ae;border-radius:9px;overflow:hidden;background:transparent;padding:5px;cursor:zoom-in';
   const photo=document.createElement('img');photo.src=url;photo.alt=item.alt_text||'Product photo';
   photo.loading='lazy';photo.style.cssText='width:100%;aspect-ratio:4/3;object-fit:cover';
   button.setAttribute('aria-label','Enlarge '+photo.alt);button.onclick=()=>{
    large.src=url;large.alt=photo.alt;dialog.showModal();close.focus();
   };button.append(photo);grid.append(button);
  }
  if(grid.children.length)root.after(host);
 }catch{/* Catalog photos are optional; an outage must not fabricate product photos or alter purchases. */}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else void render();
})();