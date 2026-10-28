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
   if(result.ok!==true||!['classic','continuous','focus','compact','spacious'].includes(result.mode))throw Error('Invalid mode');
   document.body.dataset.clWorkspace=result.mode;
   document.body.dataset.clWorkspacePage=page;
   document.querySelectorAll('.cl-page-workspace-notice').forEach(x=>x.remove());
   if(result.ownerPreview){
    const box=document.createElement('div');box.className='cl-page-workspace-notice';
    box.setAttribute('role','status');
    const span=document.createElement('span');
    span.textContent=result.mode==='classic'?'Original page layout':(
      (result.preview?'OWNER PREVIEW · ':'')+result.mode.charAt(0).toUpperCase()+result.mode.slice(1)+
      ' page style'+(result.preview?' · Visitor layout unchanged':''));

    const link=document.createElement('a'),next=new URL(location.href);
    next.searchParams.set('workspace',result.mode==='classic'?'continuous':'classic');
    link.href=next.pathname+next.search+next.hash;
    link.textContent=result.mode==='classic'?'Preview Continuous Desk':'Restore original view';
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
