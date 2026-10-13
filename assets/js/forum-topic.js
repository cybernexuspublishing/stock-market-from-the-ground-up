function fesc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let topicUser=null, topicId=null, topicLocked=false;
async function loadTopic(){
  const sb=await window.getSupabaseClient(); const gate=document.getElementById('topic-gate'); const content=document.getElementById('topic-content');
  const {data:{user}}=await sb.auth.getUser(); topicUser=user; if(!user){gate.innerHTML='<div class="notice">Sign in to read the member forum. <a href="signin.html?next='+encodeURIComponent(location.pathname+location.search)+'">Sign in</a></div>';return}
  topicId=Number(new URLSearchParams(location.search).get('id')); if(!topicId){gate.textContent='Topic not found.';return}
  const {data:topics,error}=await sb.rpc('forum_get_topic',{target_topic_id:topicId}); if(error||!topics?.length){gate.textContent=error?.message||'Topic not found.';return}
  const t=topics[0]; topicLocked=t.is_locked;
  document.title=`${t.title} | Member Forum`;
  document.getElementById('topic-title').textContent=t.title;
  document.getElementById('topic-category').textContent=t.category_name;
  document.getElementById('topic-author').textContent=`@${t.author_username}`;
  document.getElementById('topic-date').textContent=new Date(t.created_at).toLocaleString();
  const ticker=document.getElementById('topic-ticker'); if(t.ticker){ticker.textContent=`$${t.ticker}`;ticker.hidden=false}
  const lab=document.getElementById('topic-lab'); if(t.lab_id&&lab){lab.textContent=t.lab_id;lab.href=`lab-player.html?lab=${encodeURIComponent(t.lab_id)}`;lab.hidden=false}
  if(t.lab_id && t.discussion_unlocked===false){
    document.getElementById('topic-body').innerHTML=`<div class="notice"><strong>Complete your own attempt first.</strong> This Historical Lab discussion stays hidden until you save an interactive attempt for ${fesc(t.lab_id)}. This prevents another member's reasoning from becoming future information before you make your own decision. <a href="lab-player.html?lab=${encodeURIComponent(t.lab_id)}">Open the lab</a>.</div>`;
    document.getElementById('reply-form').hidden=true;
    document.getElementById('topic-replies').innerHTML='<div class="small">Replies unlock after your own attempt is saved.</div>';
    gate.innerHTML=''; content.hidden=false; return;
  }
  document.getElementById('topic-body').textContent=t.body;
  if(topicLocked){document.getElementById('reply-form').hidden=true;document.getElementById('topic-locked').hidden=false}
  gate.innerHTML=''; content.hidden=false; await loadPosts();
}
async function loadPosts(){
  const sb=await window.getSupabaseClient(); const list=document.getElementById('topic-replies');
  const {data,error}=await sb.rpc('forum_list_posts',{target_topic_id:topicId}); if(error){list.innerHTML=`<div class="notice">${fesc(error.message)}</div>`;return}
  list.innerHTML=(data||[]).map(p=>`<article class="forum-post" id="post-${p.post_id}"><div class="forum-post-head"><strong>@${fesc(p.author_username)}</strong><span class="small">${new Date(p.created_at).toLocaleString()}</span></div><div class="forum-post-body">${fesc(p.body).replace(/\n/g,'<br>')}</div><button class="link-button small" type="button" onclick="reportPost(${p.post_id})">Report</button></article>`).join('')||'<div class="small">No replies yet.</div>';
}
async function addReply(e){
  e?.preventDefault(); if(topicLocked)return;
  const body=document.getElementById('reply-body').value.trim(); const msg=document.getElementById('reply-message'); if(body.length<2){msg.textContent='Enter a reply.';return}
  const sb=await window.getSupabaseClient(); const {error}=await sb.from('forum_posts').insert({topic_id:topicId,author_id:topicUser.id,body}); if(error){msg.textContent=error.message;return}
  document.getElementById('reply-body').value='';msg.textContent='Reply posted.';await loadPosts();
}
async function submitReport(targetType,targetId){
  const reason=prompt('Briefly describe the concern (spam, harassment, manipulation, misinformation, personal information, other):'); if(!reason)return;
  const sb=await window.getSupabaseClient(); const row={reporter_id:topicUser.id,reason:reason.slice(0,80)}; row[targetType==='topic'?'topic_id':'post_id']=targetId;
  const {error}=await sb.from('forum_reports').insert(row); alert(error?error.message:'Report submitted for review.');
}
function reportPost(id){submitReport('post',id)}
function reportTopic(){submitReport('topic',topicId)}
document.addEventListener('DOMContentLoaded',loadTopic);
