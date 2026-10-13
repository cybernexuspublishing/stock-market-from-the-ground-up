function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function forumMsg(text,type=''){const e=document.getElementById('forum-message'); if(e){e.className=`inline-status ${type}`;e.textContent=text||''}}
let forumUser=null, forumProfile=null, categories=[];
async function loadForum(){
  const sb=await window.getSupabaseClient();
  const gate=document.getElementById('forum-gate'); const content=document.getElementById('forum-content');
  const {data:{user}}=await sb.auth.getUser(); forumUser=user;
  if(!user){gate.innerHTML='<div class="notice"><strong>Member forum:</strong> sign in to read or participate. <a href="signin.html?next=/forum.html">Sign in</a> or <a href="create-account.html">create an account</a>.</div>';return}
  const {data:p}=await sb.from('profiles').select('username').eq('id',user.id).maybeSingle(); forumProfile=p;
  if(!p?.username) document.getElementById('forum-username-warning').hidden=false;
  const linkedLab=new URLSearchParams(location.search).get('lab');
  if(linkedLab){
    const labInput=document.getElementById('new-topic-lab-id'); if(labInput)labInput.value=linkedLab;
    const notice=document.getElementById('forum-linked-lab'); if(notice){notice.hidden=false;notice.innerHTML=`<strong>Linked Historical Lab:</strong> ${esc(linkedLab)}. Discussion is intended for learners who have already recorded their own observation.`}
    document.getElementById('new-topic-panel').hidden=false;
  }
  const {data:cats,error:ce}=await sb.from('forum_categories').select('id,slug,name,description').eq('is_active',true).order('sort_order');
  if(ce){gate.textContent=ce.message;return} categories=cats||[];
  const filter=document.getElementById('forum-category'); const createCat=document.getElementById('new-topic-category');
  categories.forEach(c=>{filter.insertAdjacentHTML('beforeend',`<option value="${esc(c.slug)}">${esc(c.name)}</option>`);createCat.insertAdjacentHTML('beforeend',`<option value="${c.id}">${esc(c.name)}</option>`)});
  if(linkedLab){ const cat=categories.find(c=>c.slug==='books-labs'); if(cat)createCat.value=String(cat.id); const title=document.getElementById('new-topic-title'); if(title&&!title.value)title.value=`Discussion: ${linkedLab}`; }
  gate.innerHTML=''; content.hidden=false; await renderTopics();
}
async function renderTopics(){
  const sb=await window.getSupabaseClient(); const list=document.getElementById('forum-topics'); list.innerHTML='<div class="small">Loading topics…</div>';
  const category=document.getElementById('forum-category').value||null; const search=document.getElementById('forum-search').value.trim()||null;
  const {data,error}=await sb.rpc('forum_list_topics',{category_filter:category,search_filter:search});
  if(error){list.innerHTML=`<div class="notice">${esc(error.message)}</div>`;return}
  if(!data?.length){list.innerHTML='<div class="card"><strong>No topics found.</strong><div class="small">Start the first discussion in this category.</div></div>';return}
  list.innerHTML=data.map(t=>`<article class="forum-topic-row"><div class="forum-topic-main"><div class="forum-topic-meta"><span class="pill">${esc(t.category_name)}</span>${t.ticker?`<span class="ticker-badge">$${esc(t.ticker)}</span>`:''}${t.lab_id?`<span class="lab-id-badge">${esc(t.lab_id)}</span>`:''}${t.is_pinned?'<span class="pill">Pinned</span>':''}</div><h3><a href="forum-topic.html?id=${t.topic_id}">${esc(t.title)}</a></h3><div class="small">Started by @${esc(t.author_username)} · ${new Date(t.created_at).toLocaleString()}</div></div><div class="forum-replies"><strong>${Number(t.reply_count)||0}</strong><span>replies</span></div></article>`).join('');
}
async function createTopic(e){
  e?.preventDefault(); if(!forumUser)return;
  if(!forumProfile?.username)return forumMsg('Set your username in Settings before creating forum topics.','error');
  const sb=await window.getSupabaseClient(); const categoryId=Number(document.getElementById('new-topic-category').value); const title=document.getElementById('new-topic-title').value.trim(); const body=document.getElementById('new-topic-body').value.trim(); let ticker=document.getElementById('new-topic-ticker').value.trim().toUpperCase(); ticker=ticker||null; const labId=document.getElementById('new-topic-lab-id')?.value.trim()||null;
  if(title.length<5||body.length<10)return forumMsg('Enter a title of at least 5 characters and a post of at least 10 characters.','error');
  const {data,error}=await sb.from('forum_topics').insert({category_id:categoryId,author_id:forumUser.id,title,body,ticker,lab_id:labId}).select('id').single();
  if(error)return forumMsg(error.message,'error');
  location.href=`forum-topic.html?id=${data.id}`;
}
function toggleNewTopic(){const p=document.getElementById('new-topic-panel');p.hidden=!p.hidden;if(!p.hidden)p.scrollIntoView({behavior:'smooth',block:'start'})}
document.addEventListener('DOMContentLoaded',()=>{loadForum();document.getElementById('forum-category')?.addEventListener('change',renderTopics);document.getElementById('forum-search')?.addEventListener('input',()=>{clearTimeout(window._forumTimer);window._forumTimer=setTimeout(renderTopics,300)})});
