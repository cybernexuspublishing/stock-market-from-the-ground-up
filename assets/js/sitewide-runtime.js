/* v0.14.0.19 — conservative sitewide semantics and release metadata normalization.
 * Adds labels only for known controls; does not impersonate backend functionality.
 */
(()=>{'use strict';
 const VERSION='v0.14.0.19';
 const labels={
   'admin-user-search':'Search accounts by email, username, or display name',
   'forum-search':'Search discussion title or ticker',
   'forum-category':'Filter discussion category',
   'v13-topic-search':'Search Market Commons discussions',
   'new-topic-title':'New discussion title',
   'new-topic-category':'Discussion category',
   'new-topic-body':'Discussion message',
   'gu-topic-forum':'Sub-forum',
   'gu-topic-title':'Discussion title',
   'gu-topic-body':'Discussion text',
   'gu-topic-tags':'Discussion keywords',
   'gu-topic-ticker':'Optional ticker symbol'
 };
 function patch(root=document){
   for(const [id,label] of Object.entries(labels)){
     const el=root.getElementById?.(id)||root.querySelector?.('#'+id);
     if(!el||el.getAttribute('aria-label')||el.getAttribute('aria-labelledby'))continue;
     const explicit=[...document.querySelectorAll('label[for]')].some(x=>x.htmlFor===id);
     if(!explicit)el.setAttribute('aria-label',label);
   }
   const main=document.querySelector('main');if(main&&!main.id)main.id='main-content';
   if(main&&!document.getElementById('gu-skip-link')){
     const link=document.createElement('a');link.id='gu-skip-link';link.href='#'+main.id;link.textContent='Skip to main content';link.className='gu-skip-link';document.body.prepend(link);
   }
   document.querySelectorAll('meta[name="application-version"]').forEach(m=>m.content=VERSION);
   if(document.body)document.body.dataset.build=VERSION;
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>patch(),{once:true});else patch();
 let delayed;
 new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length)){clearTimeout(delayed);delayed=setTimeout(()=>patch(),100)}}).observe(document.documentElement,{childList:true,subtree:true});
})();
