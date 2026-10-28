/* Sitewide page-mode selector; server enforces published pages and Owner preview. */
(()=>{'use strict';
 const page=location.pathname.split('/').pop()||'index.html';
 const desired=new URLSearchParams(location.search).get('workspace');
 async function init(){
  try{
   let token=null;
   if(typeof window.getSupabaseClient==='function'){
    try{const sb=await window.getSupabaseClient();token=(await sb.auth.getSession()).data?.session?.access_token||null}catch{}
   }
   const q=new URLSearchParams({page});if(desired)q.set('workspace',desired);
   const r=await fetch('/api/page-workspace-presentation?'+q.toString(),{
    headers:token?{authorization:'Bearer '+token}:{},cache:'no-store'});
   if(!r.ok)throw Error('No verified layout');
   const result=await r.json();
   if(result.ok!==true||!['classic','continuous'].includes(result.mode))throw Error('Invalid mode');
   document.body.dataset.clWorkspace=result.mode;
   document.body.dataset.clWorkspacePage=page;
   document.querySelectorAll('.cl-page-workspace-notice').forEach(x=>x.remove());
   if(result.ownerPreview){
    const box=document.createElement('div');box.className='cl-page-workspace-notice';
    box.setAttribute('role','status');
    const span=document.createElement('span');
    span.textContent=result.mode==='continuous'?
      (result.preview?'OWNER PREVIEW · Continuous full-page workspace · Customer layout unchanged':'Continuous full-page workspace · Owner comparison'):
      'Classic full-page layout';
    const link=document.createElement('a'),next=new URL(location.href);
    next.searchParams.set('workspace',result.mode==='continuous'?'classic':'continuous');
    link.href=next.pathname+next.search+next.hash;
    link.textContent=result.mode==='continuous'?'Compare classic':'Preview continuous workspace';
    box.append(span,link);document.querySelector('main')?.before(box);
   }
   requestAnimationFrame(()=>dispatchEvent(new Event('resize')));
  }catch{
   document.body.dataset.clWorkspace='classic';
   document.querySelectorAll('.cl-page-workspace-notice').forEach(x=>x.remove());
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else void init();
})();
