/* v0.14.0.19 — preserved filename for already deployed loader.
 * Centralizes the approved new-tab composer and fixes reply navigation after a confirmed RPC.
 * No optimistic success, no client-granted permissions, no localStorage submission replay.
 */
(()=>{'use strict';
 const commons=/^\/market-commons(?:\.html)?$/i.test(location.pathname);
 const legacy=/^\/(?:forum|forum-topic)(?:\.html)?$/i.test(location.pathname);
 if(!commons&&!legacy)return;
 const qs=new URLSearchParams(location.search),rawTopic=Number(qs.get('topic'));
 const topic=Number.isSafeInteger(rawTopic)&&rawTopic>0?rawTopic:null;
 const PAGE_SIZE=50;
 function openComposer(){
   const f=commons?qs.get('forum'):null;
   const url='/new-discussion.html'+(f?'?forum='+encodeURIComponent(f):'');
   const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';
   document.body.append(a);a.click();a.remove();
 }
 // Original legacy markup uses inline onclick and in-page dialogs; interception happens
 // before those handlers, without altering approved thread-list code or RPC security.
 document.addEventListener('click',e=>{
   const b=e.target.closest?.(commons?'#v13-new-topic':'button[onclick="toggleNewTopic()"]');
   if(!b)return;
   e.preventDefault();e.stopImmediatePropagation();openComposer();
 },true);
 function anchorReplies(root=document){
   const elements=root.querySelectorAll?.('[data-forum-content="post"][data-content-id]')||[];
   for(const post of elements){const id=Number(post.dataset.contentId);if(Number.isSafeInteger(id)&&id>0){post.id='gu-reply-'+id;if(!post.hasAttribute('tabindex'))post.tabIndex=-1}}
   const jump=Number(qs.get('reply'));if(!Number.isSafeInteger(jump)||jump<=0)return;
   const post=document.getElementById('gu-reply-'+jump);
   if(post&&post.dataset.guReplyFocused!=='true'){
     post.dataset.guReplyFocused='true';post.scrollIntoView({behavior:'auto',block:'center'});post.focus({preventScroll:true});
   }
 }
 if(commons&&topic){
   // Page content is rendered asynchronously by the existing Market Commons controller.
   const start=()=>{
     anchorReplies();const host=document.getElementById('v13-commons');if(!host)return;
     let pending=false;
     new MutationObserver(records=>{if(pending||!records.some(x=>x.addedNodes.length))return;
       pending=true;requestAnimationFrame(()=>{pending=false;anchorReplies(host)})
     }).observe(host,{childList:true,subtree:true});
   };
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 }
 async function submitReply(form){
   const box=form.querySelector('textarea');const button=form.querySelector('button[type="submit"],button');
   const output=form.querySelector('.status-message')||document.createElement('p');
   if(!output.isConnected){output.className='status-message';form.append(output)}
   output.setAttribute('role','status');output.setAttribute('aria-live','polite');
   if(form.dataset.guPosting==='true')return;
   const content=String(box?.value||'').trim();
   if(content.length<2||content.length>10000){output.textContent='A reply must contain 2–10,000 characters.';box?.focus();return}
   form.dataset.guPosting='true';if(button)button.disabled=true;output.textContent='Publishing reply…';
   let sent=false;
   try{
     const sb=await window.getSupabaseClient();const {data:{session}}=await sb.auth.getSession();
     if(!session?.user?.id)throw Error('Session expired. Sign in again before posting.');
     const {data,error}=await sb.rpc('commons_create_reply',{p_topic_id:topic,p_body:content});
     if(error)throw error;sent=true;
     // Use a returned server ID when available. Otherwise, correlate the published
     // reply with the authenticated author and exact submitted text, not an unrelated latest post.
     let id=Number(data?.id??data?.post_id??data);
     if(!Number.isSafeInteger(id)||id<=0){
       const {data:rows,error:readError}=await sb.from('commons_posts')
         .select('id,body,created_at').eq('topic_id',topic).eq('author_user_id',session.user.id)
         .eq('status','published').eq('body',content)
         .order('created_at',{ascending:false}).order('id',{ascending:false}).limit(1);
       if(!readError&&rows?.length)id=Number(rows[0].id);
     }
     const {count,error:countError}=await sb.from('commons_posts').select('id',{count:'exact',head:true})
       .eq('topic_id',topic).eq('status','published');
     if(countError||!Number.isSafeInteger(count))throw Error('Reply accepted, but the destination page cannot be verified. Open this discussion to locate it; do not repost.');
     const page=Math.max(1,Math.ceil(count/PAGE_SIZE));
     const url=new URL('/market-commons.html',location.origin);url.searchParams.set('topic',String(topic));url.searchParams.set('repliesPage',String(page));
     if(Number.isSafeInteger(id)&&id>0){url.searchParams.set('reply',String(id));url.hash='gu-reply-'+id}
     output.textContent='Reply published. Opening the discussion…';
     location.assign(url.pathname+url.search+url.hash);
   }catch(e){
     output.textContent=sent?'Reply may have been published, but the destination could not be verified. Review this discussion before trying again.':(e.message||'Unable to post.');
     if(!sent){form.dataset.guPosting='false';if(button)button.disabled=false}
   }
 }
 // Capture before legacy form.onsubmit so only one RPC submission can be sent.
 if(commons&&topic){document.addEventListener('submit',e=>{
   if(e.target?.id!=='v13-reply')return;
   e.preventDefault();e.stopImmediatePropagation();submitReply(e.target);
 },true)}
})();
