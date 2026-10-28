(function(){'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=d=>d&&!Number.isNaN(new Date(d).getTime())?new Date(d).toLocaleString():'—';
  let SB,USER,forums=[],FOUNDER_ALLOWED=false,FOUNDER_COUNCIL=false,STAFF_READ=false;
  const IS_FOUNDER=String(location.pathname||'').endsWith('/founders-commons.html');
  const PAGE=IS_FOUNDER?'founders-commons.html':'market-commons.html';
  async function initAuth(){SB=await window.getSupabaseClient();const session=typeof SB.auth.getSession==='function'?(await SB.auth.getSession()).data?.session:null;const user=session?.user||(await SB.auth.getUser()).data?.user;if(!user){location.replace(`signin.html?next=${encodeURIComponent(location.pathname+location.search)}`);return false}USER=user;
    // Independently verified staff oversight is visibility only; no founder ballots or paid privileges.
    try{const staff=await SB.rpc('gu_commons_staff_read_v20261028');STAFF_READ=!staff.error&&staff.data===true}catch{STAFF_READ=false}
    if(IS_FOUNDER){
      // The Founders route itself must verify founder or noncommercial QA entitlement,
      // even if a public Commons session is otherwise valid.
      try{
       const access=await SB.rpc('gu_founder_commons_access_v014174',{p_scope:'shared'});
       if((access.error||access.data!==true)&&!STAFF_READ)return false;
       FOUNDER_ALLOWED=true;
       const member=await SB.rpc('gu_founder_my_status_v014174');
       FOUNDER_COUNCIL=STAFF_READ||(!member.error&&member.data?.council===true);
      }catch{return false}
    }
    // Show the private community link only to a server-authorized Founder/Owner.
    try{
      const {data:eligible,error}=await SB.rpc('gu_founder_commons_access_v014174',{p_scope:'shared'});
      FOUNDER_ALLOWED=STAFF_READ||(!error&&eligible===true);
      if(FOUNDER_ALLOWED){
        const nav=document.getElementById('v134-commons-member-nav');
        if(nav&&!nav.querySelector('[data-founders-commons-link], a[href="founders-commons.html"]')){
          const a=document.createElement('a');
          a.href='founders-commons.html';a.textContent='Founders Commons';
          a.setAttribute('data-founders-commons-link','true');nav.append(a);
        }
      }
    }catch{/* Main Commons remains available when the optional founder service is down. */}
    const spotlight=document.getElementById('gu-commons-founder-spotlight');if(spotlight)spotlight.innerHTML=founderEntry();
    return true}
  function memberNav(){if(document.getElementById('v134-commons-member-nav'))return '';return `<nav class="v133-commons-nav" aria-label="Member navigation">
    <a href="index.html">Home</a><a href="dashboard.html">Dashboard</a><a href="dashboard.html?tab=skills">Skill Development</a><a href="labs.html">Labs</a><a href="simulator.html">Simulator</a><a href="journal.html">Journal</a><a href="market-tutor.html">Market Tutor</a><a href="tools.html">All Tools</a><a href="store.html">Store</a><a href="dashboard.html?tab=help">Help</a>${FOUNDER_ALLOWED?'<a href="founders-commons.html" data-founders-commons-link="true">Founders Commons</a>':''}
  </nav>`}
  function shellTop(){return `${IS_FOUNDER?'':memberNav()}<div class="v132-forum-toolbar"><a class="btn secondary" href="${PAGE}">Forum Index</a><a class="btn secondary" href="market-commons.html#gu-commons-directory">Browse forums</a><a class="btn secondary" href="market-commons.html#gu-commons-recent">Recent discussions</a><a class="btn secondary" href="community-guidelines.html">Community Guidelines</a><button class="btn" id="v13-new-topic">New Discussion</button></div>`}
  function renderGuideBody(raw){
    const lines=String(raw||'').replace(/\r/g,'').split('\n'),out=[];let list=null;
    const close=()=>{if(list){out.push(`</${list}>`);list=null}};
    const inline=s=>{
      // Start with escaped text and only recognize explicit HTTP(S) references.
      // This makes verified source citations usable without granting users arbitrary HTML.
      const safe=esc(s).replace(/https?:\/\/[^\s<>"'\x60]+/gi,token=>{
        let value=token,tail='';
        while(value&&/[.,;!?:)]$/.test(value)){tail=value.slice(-1)+tail;value=value.slice(0,-1)}
        if(!value)return token;
        return '<a href="'+value+'" target="_blank" rel="noopener noreferrer nofollow">'+value+'</a>'+tail;
      });
      return safe.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\x60([^\x60]+)\x60/g,'<code>$1</code>');
    };
    for(const line0 of lines){const line=line0.trim();if(!line){close();continue}
      let m;if((m=line.match(/^###\s+(.+)$/))){close();out.push(`<h3>${inline(m[1])}</h3>`);continue}
      if((m=line.match(/^##\s+(.+)$/))){close();out.push(`<h2>${inline(m[1])}</h2>`);continue}
      if((m=line.match(/^#\s+(.+)$/))){close();out.push(`<h2>${inline(m[1])}</h2>`);continue}
      if((m=line.match(/^[-*]\s+(.+)$/))){if(list!=='ul'){close();list='ul';out.push('<ul>')}out.push(`<li>${inline(m[1])}</li>`);continue}
      if((m=line.match(/^\d+[.)]\s+(.+)$/))){if(list!=='ol'){close();list='ol';out.push('<ol>')}out.push(`<li>${inline(m[1])}</li>`);continue}
      close();out.push(`<p>${inline(line)}</p>`)
    }close();return out.join('')
  }
  function renderMemberBody(raw){return window.GroundUpForumEditor?.render(raw)||String(raw||'').split(/\n{2,}/).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('')}
  // Avoid downloading every Commons discussion when a member opens one sub-forum.
  // Index displays a bounded recent-activity snapshot; per-forum pages are authoritative.
  const FORUM_PAGE_SIZE=30;
  async function load(){
    const host=document.getElementById('v13-commons'),q=new URLSearchParams(location.search);
    const topic=q.get('topic'),forum=q.get('forum')||'';
    const dir=SB.from('commons_forums').select('*');if(!STAFF_READ)dir.eq('active',true);
    const {data:f,error:fe}=await (IS_FOUNDER?dir.eq('section_name','Founders Commons'):dir).order('sort_order');
    if(fe){host.textContent='Market Commons is unavailable: '+fe.message;return}
    forums=(f||[]).filter(x=>!IS_FOUNDER||x.forum_code!=='F600_COUNCIL'||FOUNDER_COUNCIL);
    if(topic){const id=Number(topic);if(!Number.isSafeInteger(id)||id<=0){host.textContent='Invalid discussion identifier.';return}return renderTopic(host,id)}
    const fields='id,forum_code,title,ticker,status,is_pinned,is_locked,is_official,reply_count,last_post_at,created_at,author_label,profiles:author_user_id(username)';
    if(forum){
      if(!forums.some(x=>x.forum_code===forum)){host.textContent='This sub-forum is not available.';return}
      const requested=Number(q.get('page')||'1');
      const page=Number.isSafeInteger(requested)&&requested>=1&&requested<=10000?requested:1;
      const from=(page-1)*FORUM_PAGE_SIZE;
      const query=SB.from('commons_topics').select(fields,{count:'exact'});if(!STAFF_READ)query.eq('status','published');
      const {data:t,error,count}=await query.eq('forum_code',forum).order('is_pinned',{ascending:false})
        .order('last_post_at',{ascending:false}).range(from,from+FORUM_PAGE_SIZE-1);
      if(error){host.textContent='Unable to load discussions: '+error.message;return}
      return renderForum(host,forum,t||[],{page,count:count??null});
    }
    const query=SB.from('commons_topics').select(fields);if(!STAFF_READ)query.eq('status','published');
    const {data:t,error}=await query.in('forum_code',forums.map(x=>x.forum_code))
      .order('is_pinned',{ascending:false}).order('last_post_at',{ascending:false}).limit(200);
    if(error){host.textContent='Unable to load recent discussions: '+error.message;return}
    return renderForumIndex(host,t||[]);
  }
  function founderEntry(){return `<section class="gu-commons-founder-entry" aria-labelledby="gu-commons-founder-heading"><div class="gu-commons-founder-mark" aria-hidden="true"><span>F</span><small>MEMBERS</small></div><div class="gu-commons-founder-copy"><span class="eyebrow">Private member forum · Founding Members</span><h2 id="gu-commons-founder-heading">Founders Commons</h2><p>Your forum for founder announcements, conversations, ideas and product feedback.</p><div class="gu-commons-founder-channels"><span>Founder discussions</span><span>Announcements</span><span>Ideas &amp; feedback</span><span>Extended Design Council</span></div><small>${FOUNDER_ALLOWED?'Your account is authorized to enter. Design Council access is verified separately.':'Private discussions require eligible founding membership. Extended Design Council access has additional eligibility requirements.'}</small></div><div class="gu-commons-founder-actions"><a class="btn ${FOUNDER_ALLOWED?'':'secondary'}" href="${FOUNDER_ALLOWED?'founders-commons.html':'store.html#founders'}">${FOUNDER_ALLOWED?'Enter Founders Commons ↗':'Explore Founding Memberships ↗'}</a><span>Private discussions · Verified member access</span></div></section>`}

  function guideCallout(){if(IS_FOUNDER)return `<section class="v133-commons-guide-callout"><div><span class="eyebrow">Private founding community</span><h2>Discuss, report and improve.</h2><p>Use the same member discussion tools as Market Commons, with founder-only categories and protected records.</p></div><a class="btn secondary" href="founders-commons.html?forum=F600_HEADQUARTERS">Open Founders Headquarters</a></section>`;return `<section class="v133-commons-guide-callout"><div><span class="eyebrow">New to the community?</span><h2>Start with the official guides.</h2><p>Learn the tools, posting standards and evidence boundaries before joining a discussion.</p></div><a class="btn secondary" href="${PAGE}?forum=START_HERE">Open Start Here ↗</a></section>`}
  function renderForumIndex(host,topics){
    const groups={};forums.forEach(x=>(groups[x.section_name]??=[]).push(x));
    const latest=[...topics].sort((a,b)=>new Date(b.last_post_at||b.created_at)-new Date(a.last_post_at||a.created_at)).slice(0,8);
    host.className='v132-forum-index';
    host.innerHTML=`${shellTop()}${guideCallout()}<div class="gu-commons-index-heading"><h2 id="gu-commons-directory">Forum directory</h2><span>${forums.length} sub-forums</span></div><div class="v132-forum-search"><label for="v13-topic-search">Find a sub-forum or discussion</label><input id="v13-topic-search" type="search" placeholder="Search the directory and recent discussions…" aria-label="Search Market Commons"></div><p class="small gu-commons-snapshot">Counts reflect the recent snapshot of up to 200 visible discussions. Open a sub-forum for its complete paginated listing.</p><p id="gu-commons-search-status" class="small" role="status" aria-live="polite"></p>${Object.entries(groups).map(([section,arr])=>`<section class="v132-forum-category"><div class="v132-category-head"><h2>${esc(section)}</h2><span>Topics*</span><span>Posts*</span><span>Latest discussion</span></div>${arr.map(f=>{
      const xs=topics.filter(t=>t.forum_code===f.forum_code),posts=xs.reduce((n,t)=>n+1+Number(t.reply_count||0),0),last=[...xs].sort((a,b)=>new Date(b.last_post_at||b.created_at)-new Date(a.last_post_at||a.created_at))[0];
      return `<a class="v132-forum-row" data-search="${esc(`${f.name} ${f.description||''} ${xs.map(t=>t.title).join(' ')}`)}" href="${PAGE}?forum=${encodeURIComponent(f.forum_code)}"><div class="gu-commons-board"><span class="gu-commons-board-icon" aria-hidden="true">≡</span><div><strong>${esc(f.name)}</strong><p>${esc(f.description||'')}</p></div></div><span class="gu-commons-count"><b>${xs.length}</b><small>topics*</small></span><span class="gu-commons-count"><b>${posts}</b><small>posts*</small></span><span class="gu-commons-last">${last?`<strong>${esc(last.title)}</strong><small>${esc(last.author_label||last.profiles?.username||'Member')} · ${esc(fmt(last.last_post_at||last.created_at))}</small>`:'<small>No discussions yet</small>'}</span></a>`
    }).join('')}</section>`).join('')}${latest.length?`<section class="gu-commons-latest"><div class="gu-commons-index-heading"><h2 id="gu-commons-recent">Recent discussions</h2><span>Latest visible activity</span></div><div class="v132-forum-topic-table"><div class="v132-topic-head"><span>Discussion / started by</span><span>Replies</span><span>Last activity</span></div>${latest.map(topicRow).join('')}</div></section>`:''}<section class="v13-card v132-forum-info"><h3>Community standards</h3><p>Share evidence, explain your reasoning and keep private account information private. No guaranteed-return claims, coordinated promotions or unverified rumors presented as facts.</p><a href="community-guidelines.html">Read Community Guidelines ↗</a></section>`;
    bindTop();loadRecentReplies(host).catch(()=>{});
    document.getElementById('v13-topic-search').oninput=e=>{
      const term=e.target.value.toLowerCase().trim();let visible=0;
      host.querySelectorAll('.v132-forum-row').forEach(r=>{r.hidden=!r.dataset.search.toLowerCase().includes(term);if(!r.hidden)visible++});
      host.querySelectorAll('.v132-forum-category').forEach(s=>{s.hidden=![...s.querySelectorAll('.v132-forum-row')].some(r=>!r.hidden)});
      host.querySelectorAll('.gu-commons-latest .v132-topic-row').forEach(r=>{r.hidden=!r.textContent.toLowerCase().includes(term);if(!r.hidden)visible++});
      document.getElementById('gu-commons-search-status').textContent=term?(visible?`${visible} matching sub-forums or recent discussions.`:'No matches in the directory or recent discussions. Try another search.') : '';
    };
  }
  async function loadRecentReplies(host){
   // Only show replies whose parent topics are visible through existing RLS.
   const {data:posts,error}=await SB.from('commons_posts').select('topic_id,created_at,author_label').eq('status','published').order('created_at',{ascending:false}).limit(15);
   if(error||!posts?.length||!host.isConnected)return;
   const ids=[...new Set(posts.map(x=>Number(x.topic_id)).filter(x=>Number.isSafeInteger(x)&&x>0))];if(!ids.length)return;
   const {data:topics,error:te}=await SB.from('commons_topics').select('id,title').in('id',ids).in('forum_code',forums.map(x=>x.forum_code)).eq('status','published');if(te||!topics?.length)return;
   const allowed=new Map(topics.map(t=>[Number(t.id),t.title]));
   const rows=posts.filter(x=>allowed.has(Number(x.topic_id))).slice(0,10);if(!rows.length)return;
   const recent=document.createElement('section');recent.className='v13-card gu-recent-forum-replies';
   recent.innerHTML='<h2>Recent Replies</h2><p class="small">Latest published replies visible to your account.</p><ul>'+rows.map(x=>`<li><a href="${PAGE}?topic=${Number(x.topic_id)}">${esc(allowed.get(Number(x.topic_id)))}</a> <span class="small">— ${esc(x.author_label||'Member')} · ${fmt(x.created_at)}</span></li>`).join('')+'</ul>';
   if(host.isConnected)host.appendChild(recent);
  }
  function renderForum(host,forum,topics,{page=1,count=null}={}){const f=forums.find(x=>x.forum_code===forum);host.className='v132-forum-detail';host.innerHTML=`${shellTop()}<nav class="v132-forum-breadcrumbs"><a href="${PAGE}">Market Commons</a><span>›</span><span>${esc(f?.section_name||'Forum')}</span><span>›</span><strong>${esc(f?.name||'Sub-forum')}</strong></nav><header class="gu-commons-subforum-heading"><div class="eyebrow">${esc(f?.section_name||'Community')}</div><h2>${esc(f?.name||'Sub-forum')}</h2><p>${esc(f?.description||'')}</p></header><div class="v132-forum-search"><input id="v13-topic-search" type="search" placeholder="Search discussions on this page…" aria-label="Search this page of discussions"></div><section class="v132-forum-topic-table"><div class="v132-topic-head"><span>Discussion</span><span>Replies</span><span>Last post</span></div>${topics.length?topics.map(topicRow).join(''):'<div class="fe-state"><strong>No discussions yet</strong><span>Start the first evidence-based discussion in this sub-forum.</span></div>'}</section><nav class="v13575-forum-pages" aria-label="Discussion pages">${page>1?`<a class="btn secondary" href="${PAGE}?forum=${encodeURIComponent(forum)}&page=${page-1}">Previous page</a>`:''}<span>Page ${page}${count!==null?` of ${Math.max(1,Math.ceil(count/FORUM_PAGE_SIZE))}`:''}</span>${count!==null&&page*FORUM_PAGE_SIZE<count?`<a class="btn secondary" href="${PAGE}?forum=${encodeURIComponent(forum)}&page=${page+1}">Next page</a>`:''}</nav><aside class="v13-card"><h3>About this sub-forum</h3><p>${esc(f?.description||'')}</p></aside>`;bindTop();const inp=document.getElementById('v13-topic-search');if(inp)inp.oninput=e=>{const s=e.target.value.toLowerCase();host.querySelectorAll('.v132-topic-row').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(s))}}
  function topicRow(x){return `<a class="v132-topic-row ${x.is_official?'v133-official-topic':''}" href="${PAGE}?topic=${x.id}"><div><div class="v13-topic-tags">${x.is_pinned?'<span class="v13-topic-tag">Pinned</span>':''}${x.is_official?'<span class="v13-topic-tag">Official Guide</span>':''}${x.is_locked?'<span class="v13-topic-tag">Locked</span>':''}${STAFF_READ&&x.status!=='published'?`<span class="v13-topic-tag">${esc(x.status)}</span>`:''}${x.ticker?`<span class="v13-topic-tag">$${esc(x.ticker)}</span>`:''}</div><strong>${esc(x.title)}</strong><small><span data-community-avatar-user="${esc(x.author_user_id||'')}"></span>Started by ${esc(x.author_label||x.profiles?.username||'Member')}</small></div><span class="gu-commons-reply-count"><b>${Number(x.reply_count||0)}</b><small>replies</small></span><span class="gu-commons-topic-date">${esc(fmt(x.last_post_at||x.created_at))}</span></a>`}
  async function renderTopic(host,id){const requestedPage=Number(new URLSearchParams(location.search).get('repliesPage')||'1');const repliesPage=Number.isSafeInteger(requestedPage)&&requestedPage>=1&&requestedPage<=10000?requestedPage:1;
  const repliesPageSize=50;const from=(repliesPage-1)*repliesPageSize;
  const topicQuery=SB.from('commons_topics').select('*,profiles:author_user_id(username)').eq('id',id).in('forum_code',forums.map(x=>x.forum_code));
  const repliesQuery=SB.from('commons_posts').select('*,profiles:author_user_id(username)',{count:'exact'}).eq('topic_id',id);
  if(!STAFF_READ){topicQuery.eq('status','published');repliesQuery.eq('status','published')}
  const [{data:t,error},{data:p,error:postError,count:replyCount}]=await Promise.all([
    topicQuery.maybeSingle(),
    repliesQuery.order('created_at').range(from,from+repliesPageSize-1)
  ]);if(error||!t){host.innerHTML=`${shellTop()}<div class="fe-state"><strong>Topic not found</strong><span>The discussion may have been removed or is unavailable.</span></div>`;bindTop();return}const f=forums.find(x=>x.forum_code===t.forum_code);host.className='v13-topic-detail';host.innerHTML=`${shellTop()}<nav class="v132-forum-breadcrumbs"><a href="${PAGE}">Market Commons</a><span>›</span><a href="${PAGE}?forum=${encodeURIComponent(t.forum_code)}">${esc(f?.name||t.forum_code)}</a><span>›</span><strong>${esc(t.title)}</strong></nav><article data-forum-content="topic" data-content-id="${id}" class="v13-post ${t.is_official?'v133-official-post':''}"><div class="v13-post-head"><span data-community-avatar-user="${esc(t.author_user_id||'')}"></span><div><strong>${esc(t.author_label||t.profiles?.username||'Member')}</strong><small>${t.is_official?'Official Platform Guide':'Topic starter'}</small></div><span>${fmt(t.created_at)}</span></div><div class="v13-topic-tags">${t.is_pinned?'<span class="v13-topic-tag">Pinned</span>':''}${t.is_official?'<span class="v13-topic-tag">Official Guide</span>':''}${t.is_locked?'<span class="v13-topic-tag">Locked</span>':''}${t.ticker?`<span class="v13-topic-tag">$${esc(t.ticker)}</span>`:''}</div><h1>${esc(t.title)}</h1><div class="v13-post-body ${t.is_official?'v133-guide-body':''}">${t.is_official?renderGuideBody(t.body):renderMemberBody(t.body)}</div><button class="btn secondary gu-report-button" type="button" data-commons-report="topic" data-report-id="${id}">Report discussion</button></article>${postError?`<div class="notice" role="alert">Replies could not be loaded. Please retry.</div>`:(p||[]).map((x,i)=>`<article data-forum-content="post" data-content-id="${x.id}" class="v13-post"><div class="v13-post-head"><span data-community-avatar-user="${esc(x.author_user_id||'')}"></span><div><strong>${esc(x.author_label||x.profiles?.username||'Member')}</strong><small>Reply #${from+i+1}</small></div><span>${fmt(x.created_at)}</span></div><div class="v13-post-body">${renderMemberBody(x.body)}</div><button class="btn secondary gu-report-button" type="button" data-commons-report="post" data-report-id="${x.id}">Report reply</button></article>`).join('')}<nav class="v13575-forum-pages" aria-label="Discussion replies">${repliesPage>1?`<a class="btn secondary" href="${PAGE}?topic=${id}&repliesPage=${repliesPage-1}">Previous replies</a>`:''}<span>Replies page ${repliesPage}${replyCount!==null?` of ${Math.max(1,Math.ceil(replyCount/repliesPageSize))}`:''}</span>${replyCount!==null&&repliesPage*repliesPageSize<replyCount?`<a class="btn secondary" href="${PAGE}?topic=${id}&repliesPage=${repliesPage+1}">Next replies</a>`:''}</nav>${t.is_locked||t.status!=='published'?'<div class="notice">This discussion is not open for replies.</div>':`<form class="v13-card" id="v13-reply"><h3>Quick Reply</h3><textarea data-forum-composer aria-label="Quick reply message" rows="8" maxlength="10000" required placeholder="Add evidence, a question, or your reasoning…"></textarea><div class="actions"><button class="btn">Post Reply</button></div><div class="status-message"></div></form>`}`;bindTop();window.GroundUpForumEditor?.decorateAll(host);window.GroundUpForumMemberControls?.bind('commons',id);host.onclick=e=>{const btn=e.target.closest('[data-commons-report]');if(btn)reportContent(btn)};const r=host.querySelector('#v13-reply');
  if(r){const actions=r.querySelector('.actions');if(actions){const quote=document.createElement('button');quote.type='button';quote.className='btn secondary';quote.textContent='Quote discussion';quote.onclick=()=>{const textarea=r.querySelector('textarea');if(!textarea)return;const insertion='[quote]'+String(t.body||'').slice(0,900)+'[/quote]\n';textarea.setRangeText(insertion,textarea.selectionStart,textarea.selectionEnd,'end');textarea.focus();textarea.dispatchEvent(new Event('input',{bubbles:true}))};actions.appendChild(quote)}}
  if(r)r.onsubmit=async e=>{e.preventDefault();const body=r.querySelector('textarea').value.trim(),msg=r.querySelector('.status-message');if(body.length<2||body.length>10000){msg.textContent='Write a reply of 2–10,000 characters.';return}const button=r.querySelector('button[type=submit],button');if(button?.disabled)return;if(button)button.disabled=true;msg.textContent='Posting…';try{const {error}=await SB.rpc('commons_create_reply',{p_topic_id:id,p_body:body});if(error){msg.textContent=error.message;return}location.reload()}catch(ex){msg.textContent=ex.message||'Unable to post reply.'}finally{if(button)button.disabled=false}}}
  async function reportContent(btn){
    if(btn.disabled)return;
    const kind=btn.dataset.commonsReport,id=Number(btn.dataset.reportId);
    if(!['topic','post'].includes(kind)||!Number.isSafeInteger(id)||id<1)return;
    let dialog=document.getElementById('gu-commons-report-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='gu-commons-report-dialog';dialog.className='gu-report-dialog';dialog.innerHTML='<form method="dialog"><h2>Report community content</h2><p>Reports are private to authorized moderation staff. Do not include passwords or private contact information.</p><label>Reason<select name="reason" required><option value="spam">Spam</option><option value="scam">Scam / manipulation</option><option value="harassment">Harassment</option><option value="privacy">Private information</option><option value="misinformation">Misleading market claims</option><option value="other">Other</option></select></label><label>Details (optional)<textarea name="details" maxlength="500" rows="4"></textarea></label><div class="actions"><button type="button" class="btn" data-send>Submit report</button><button class="btn secondary" value="cancel">Cancel</button></div><p role="status" aria-live="polite" data-result></p></form>';document.body.append(dialog)}
    const send=dialog.querySelector('[data-send]'),status=dialog.querySelector('[data-result]');status.textContent='';dialog.showModal();
    send.onclick=async()=>{if(send.disabled)return;send.disabled=true;status.textContent='Submitting report…';try{
      const {data:{session}}=await SB.auth.getSession();if(!session)throw Error('Sign in to submit a report.');
      const r=await fetch('/api/commons-report',{method:'POST',headers:{authorization:'Bearer '+session.access_token,'content-type':'application/json'},body:JSON.stringify({id,type:kind,reason:dialog.querySelector('[name=reason]').value,details:dialog.querySelector('[name=details]').value})}),j=await r.json().catch(()=>({}));
      if(!r.ok||!j.ok)throw Error(j.error||'Unable to submit report.');status.textContent=j.message||'Submitted.';setTimeout(()=>{if(dialog.open)dialog.close()},1200);
    }catch(err){status.textContent=err.message}finally{send.disabled=false}}
  }
  function bindTop(){const b=document.getElementById('v13-new-topic');if(b)b.onclick=openTopic}
  function openTopic(){const d=document.getElementById('v13-topic-dialog'),s=d.querySelector('#v13-topic-forum');s.innerHTML=forums.filter(x=>x.active).map(x=>`<option value="${esc(x.forum_code)}">${esc(x.section_name)} — ${esc(x.name)}</option>`).join('');const current=new URLSearchParams(location.search).get('forum');if(current)s.value=current;d.querySelector('#v13-topic-msg').textContent='';window.GroundUpForumEditor?.decorateAll(d);d.showModal()}
  async function bindDialog(){const d=document.getElementById('v13-topic-dialog');d.querySelector('#v13-topic-cancel').onclick=()=>d.close();d.querySelector('#v13-topic-form').addEventListener('submit',e=>{e.preventDefault();d.querySelector('#v13-topic-save').click()});d.querySelector('#v13-topic-save').onclick=async()=>{const msg=d.querySelector('#v13-topic-msg'),args={p_forum_code:d.querySelector('#v13-topic-forum').value,p_title:d.querySelector('#v13-topic-title').value.trim(),p_body:d.querySelector('#v13-topic-body').value.trim(),p_ticker:d.querySelector('#v13-topic-ticker').value.trim()||null};
    const icon=d.querySelector('#v13-topic-icon')?.value||'';
    const tags=String(d.querySelector('#v13-topic-tags')?.value||'').split(',').map(x=>x.trim().replace(/[^A-Za-z0-9_ -]/g,'').replace(/\s+/g,'-').slice(0,24)).filter(Boolean).slice(0,5);
    if(icon)args.p_title=icon+' '+args.p_title;
    if(tags.length)args.p_body+='\n\nKeywords: '+tags.map(x=>'#'+x).join(' ');
    if(args.p_title.length<5||args.p_title.length>180||args.p_body.length<10||args.p_body.length>10000){msg.textContent='Title: 5–180 characters. Discussion: 10–10,000 characters.';return}const button=d.querySelector('#v13-topic-save');if(button.disabled)return;button.disabled=true;msg.textContent='Posting…';try{const {data,error}=await SB.rpc('commons_create_topic',args);if(error){msg.textContent=error.message;return}location.href=`${PAGE}?topic=${data}`}catch(ex){msg.textContent=ex.message||'Unable to create discussion.'}finally{button.disabled=false}}}
  document.addEventListener('DOMContentLoaded',async()=>{if(!(await initAuth()))return;await bindDialog();await load()})
})();
