/* Public, read-only website background. All URLs originate from the
 * server-filtered site design endpoint and a single public image bucket. */
(()=>{'use strict';
 const prefix='/storage/v1/object/public/gu-store-photos/';
 function valid(u){
  try{const x=new URL(u);return x.protocol==='https:'&&/^[a-z0-9-]+\.supabase\.co$/i.test(x.hostname)&&
   x.pathname.includes(prefix)&&/\/SITE_BACKGROUND\/[a-z0-9_-]{10,60}\.(?:jpg|jpeg|png|webp)$/i.test(x.pathname)}
  catch{return false}
 }
 function apply(b){
  const root=document.documentElement;
  if(!b||b.enabled!==true||!valid(b.imageUrl)){delete root.dataset.guSiteBackground;return}
  const opacity=Number(b.overlay);
  root.style.setProperty('--gu-site-bg-image','url("'+new URL(b.imageUrl).href+'")');
  root.style.setProperty('--gu-site-bg-overlay',Number.isFinite(opacity)?String(Math.max(.35,Math.min(.92,opacity))):'.76');
  root.style.setProperty('--gu-site-bg-position',['top','bottom','center'].includes(b.position)?b.position:'center');
  root.dataset.guSiteBackground='image';
 }
 async function reload(){
  try{
   const r=await fetch('/api/website-design',{cache:'no-store'});
   if(!r.ok)throw Error('Background settings unavailable');
   const result=await r.json();
   apply(result.background);
  }catch{/* Preserve standard site design on fetch or validation failure. */}
 }
 window.GroundUpSiteBackground={apply,reload};
 reload();
})();
