/* v0.14.0.18 — delegated fixes for established Market Commons UI.
   Uses existing RPCs and RLS; does not create backend capabilities. */
(()=>{'use strict';
 const commons=/^\/(?:market-commons)(?:\.html)?$/.test(location.pathname);
 if(!commons)return;
 const params=new URLSearchParams(location.search);
 const topic=Number(params.get('topic'));
 const newDiscussion=()=>{
   const f=params.get('forum');const target='/new-discussion.html'+(f?'?forum='+encodeURIComponent(f):'');
   // An anchor is synthesized from the original trusted button event to preserve user activation.
   const a=document.createElement('a');a.href=target;a.target='_blank';a.rel='noopener noreferrer';
   document.body.append(a);a.click();a.remove();
 };
 // Capture before legacy onclick handler, which would otherwise open the old dialog.
 document.addEventListener('click',e=>{
   const btn=e.target.closest?.('#v13-new-topic');
   if(!btn)return;
   e.preventDefault();e.stopImmediatePropagation();newDiscussion();
 },true);
 // A posted reply has an asynchronous legacy RPC flow that currently reloads page one.
 // Record only a short-lived local navigation intent, then resolve the authoritative count
 // after that reload. Errors do not generate false success messages or duplicate posts.
 const key='gu-v014018-reply-navigation';
 document.addEventListener('submit',e=>{
   if(!e.target?.matches?.('#v13-reply')||!Number.isSafeInteger(topic)||topic<1)return;
   try{sessionStorage.setItem(key,JSON.stringify({topic,at:Date.now(),page:params.get('repliesPage')||'1'}))}catch{}
 },true);
 async function finishPending(){
   let pending;try{pending=JSON.parse(sessionStorage.getItem(key)||'null')}catch{}
   if(!pending||!Number.isSafeInteger(pending.topic)||pending.topic!==topic||Date.now()-pending.at>90000){
     try{sessionStorage.removeItem(key)}catch{};return;
   }
   // Allow the established submit handler to complete or fail; this runs only on navigation.
   try{
     const sb=await window.getSupabaseClient();const {data,error,count}=await sb.from('commons_posts')
       .select('id',{count:'exact'}).eq('topic_id',topic).eq('status','published')
       .order('created_at',{ascending:false}).order('id',{ascending:false}).limit(1);
     if(error||!Array.isArray(data)||!data.length)return;
     const total=Number(count);if(!Number.isSafeInteger(total)||total<1)return;
     const page=Math.max(1,Math.ceil(total/50)),lastId=Number(data[0].id);
     const current=Number(params.get('repliesPage')||'1');
     const requestedAnchor=Number.isSafeInteger(lastId)&&lastId>0?'#gu-last-reply-'+lastId:'';
     if(current!==page){location.replace('/market-commons.html?topic='+topic+'&repliesPage='+page+requestedAnchor);return}
     try{sessionStorage.removeItem(key)}catch{}
     // Existing posts lack stable IDs in v0.14.0.17. Focus latest rendered reply instead.
     const focusNewest=()=>{
       const host=document.getElementById('v13-commons');
       const replies=[...document.querySelectorAll('[data-forum-content="post"]')];
       if(!replies.length)return false;
       const last=replies.at(-1);last.tabIndex=-1;
       last.scrollIntoView({block:'center',behavior:'auto'});
       last.focus({preventScroll:true});return true;
     };
     if(!focusNewest()){
       const host=document.getElementById('v13-commons');
       if(host){const observer=new MutationObserver(()=>{if(focusNewest())observer.disconnect()});observer.observe(host,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),8000)}
     }
   }catch{}
 }
 // Detect the prior navigation intent before performing any network request.
 if(topic>0)finishPending();
})();
