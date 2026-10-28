function fesc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let topicUser=null, topicId=null, topicLocked=false, topicSourceBody='';
async function loadTopic(){
  const sb=await window.getSupabaseClient(); const gate=document.getElementById('topic-gate'); const content=document.getElementById('topic-content');
  const {data:{user}}=await sb.auth.getUser(); topicUser=user; if(!user){gate.innerHTML='<div class="notice">Sign in to read the member forum. <a href="signin.html?next='+encodeURIComponent(location.pathname+location.search)+'">Sign in</a></div>';return}
  topicId=Number(new URLSearchParams(location.search).get('id')); if(!topicId){gate.textContent='Topic not found.';return}
  const {data:topics,error}=await sb.rpc('forum_get_topic',{target_topic_id:topicId}); if(error||!topics?.length){gate.textContent=error?.message||'Topic not found.';return}
  const t=topics[0]; topicLocked=t.is_locked; topicSourceBody=t.body||'';
  document.title=`${t.title} | Member Forum`;
  document.getElementById('topic-title').textContent=t.title;
  document.getElementById('topic-category').textContent=t.category_name;
  document.getElementById('topic-author').textContent=`@${t.author_username}`;
  if(t.author_id)document.getElementById('topic-author').insertAdjacentHTML('beforebegin','<span data-community-avatar-user="'+fesc(t.author_id)+'"></span>');
  document.getElementById('topic-date').textContent=new Date(t.created_at).toLocaleString();
  const ticker=document.getElementById('topic-ticker'); if(t.ticker){ticker.textContent=`$${t.ticker}`;ticker.hidden=false}
  const lab=document.getElementById('topic-lab'); if(t.lab_id&&lab){lab.textContent=t.lab_id;lab.href=`lab-player.html?lab=${encodeURIComponent(t.lab_id)}`;lab.hidden=false}
  if(t.lab_id && t.discussion_unlocked===false){
    document.getElementById('topic-body').innerHTML=`<div class="notice"><strong>Complete your own attempt first.</strong> This Historical Lab discussion stays hidden until you save an interactive attempt for ${fesc(t.lab_id)}. This prevents another member's reasoning from becoming future information before you make your own decision. <a href="lab-player.html?lab=${encodeURIComponent(t.lab_id)}">Open the lab</a>.</div>`;
    document.getElementById('reply-form').hidden=true;
    document.getElementById('topic-replies').innerHTML='<div class="small">Replies unlock after your own attempt is saved.</div>';
    gate.innerHTML=''; content.hidden=false; return;
  }
  document.getElementById('topic-body').innerHTML=window.GroundUpForumEditor?.render(t.body)||fesc(t.body).replace(/\n/g,'<br>');
  if(topicLocked){document.getElementById('reply-form').hidden=true;document.getElementById('topic-locked').hidden=false}
  gate.innerHTML=''; content.hidden=false; await loadPosts();await window.GroundUpForumMemberControls?.bind('legacy',topicId);
}
async function loadPosts(){
  const sb=await window.getSupabaseClient(); const list=document.getElementById('topic-replies');
  const {data,error}=await sb.rpc('forum_list_posts',{target_topic_id:topicId}); if(error){list.innerHTML=`<div class="notice">${fesc(error.message)}</div>`;return}
  list.innerHTML=(data||[]).map(p=>`<article class="forum-post" id="post-${p.post_id}"><div class="forum-post-head"><span data-community-avatar-user="${fesc(p.author_id||'')}"></span><strong>@${fesc(p.author_username)}</strong><span class="small">${new Date(p.created_at).toLocaleString()}</span></div><div class="forum-post-body">${window.GroundUpForumEditor?.render(p.body)||fesc(p.body).replace(/\n/g,'<br>')}</div><button class="link-button small" type="button" onclick="reportPost(${p.post_id})">Report</button></article>`).join('')||'<div class="small">No replies yet.</div>';
}
async function addReply(e){
  e?.preventDefault(); if(topicLocked)return;
  const body=document.getElementById('reply-body').value.trim(); const msg=document.getElementById('reply-message'); if(body.length<2){msg.textContent='Enter a reply.';return}
  const sb=await window.getSupabaseClient(); const {error}=await sb.from('forum_posts').insert({topic_id:topicId,author_id:topicUser.id,body}); if(error){msg.textContent=error.message;return}
  document.getElementById('reply-body').value='';msg.textContent='Reply posted.';await loadPosts();
}
let pendingLegacyReport=null;
function submitReport(targetType,targetId){
  if(!topicUser||!Number.isSafeInteger(Number(targetId))||Number(targetId)<1)return;
  if(!['topic','post'].includes(targetType))return;
  pendingLegacyReport={type:targetType,id:Number(targetId),topicId};
  const dlg=document.getElementById('legacy-report-dialog');
  if(!dlg)return;
  const form=document.getElementById('legacy-report-form');form.reset();
  document.getElementById('legacy-report-status').textContent='';
  dlg.showModal();
}
function reportPost(id){submitReport('post',id)}
function reportTopic(){submitReport('topic',topicId)}
async function sendLegacyReport(e){
  e.preventDefault();
  const target=pendingLegacyReport, form=e.currentTarget;
  const status=document.getElementById('legacy-report-status');
  const button=form.querySelector('button[type=submit]');
  if(!target||button.disabled)return;
  button.disabled=true;status.textContent='Submitting report…';
  try{
    const sb=await window.getSupabaseClient();
    const {data:{session}}=await sb.auth.getSession();
    if(!session)throw Error('Sign in to submit a report.');
    const r=await fetch('/api/commons-report',{
      method:'POST',
      headers:{authorization:'Bearer '+session.access_token,'content-type':'application/json'},
      body:JSON.stringify({...target,scope:'legacy',reason:form.elements.reason.value,details:form.elements.details.value})
    });
    const body=await r.json().catch(()=>({}));
    if(!r.ok||!body.ok)throw Error(body.error||'Unable to submit report.');
    status.textContent='Report submitted for moderator review.';
    pendingLegacyReport=null;
    setTimeout(()=>{const dlg=document.getElementById('legacy-report-dialog');if(dlg?.open)dlg.close()},1000);
  }catch(err){status.textContent=err.message||'Unable to submit report.';}
  finally{button.disabled=false;}
}
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('legacy-report-form')?.addEventListener('submit',sendLegacyReport);
  document.getElementById('quote-topic')?.addEventListener('click',()=>{
    const field=document.getElementById('reply-body');
    const quoted=topicSourceBody.slice(0,1200);
    const insertion=`[quote]${quoted}[/quote]\n`;
    field.setRangeText(insertion,field.selectionStart,field.selectionEnd,'end');field.focus();field.dispatchEvent(new Event('input',{bubbles:true}));
  });loadTopic();
});
