function pct(done, total) {
  return total ? Math.round((done / total) * 100) : 0;
}

function safeDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function titleFromKey(value) {
  return String(value || 'Learning Membership')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function activeEntitlements(rows) {
  const now = Date.now();
  return (rows || []).filter(e => {
    if (!['active', 'trialing'].includes(e.status)) return false;
    if (e.starts_at && new Date(e.starts_at).getTime() > now) return false;
    return !e.ends_at || new Date(e.ends_at).getTime() > now;
  });
}

function statusLabel(status) {
  if (status === 'completed') return 'Self-tracked complete · not graded';
  if (status === 'in_progress') return 'In progress';
  return 'Not started';
}

function statusClass(status) {
  if (status === 'completed') return 'activity-completed';
  if (status === 'in_progress') return 'activity-progress';
  return 'activity-neutral';
}

function setupFreeStartingPoint(){
 const button=document.getElementById('free-start-choose');
 if(!button)return;
 button.addEventListener('click',()=>{
  const day=Number(document.getElementById('free-start-level')?.value);
  if(!Number.isInteger(day)||day<1||day>3)return;
  const link=document.getElementById('free-next-action');
  if(!link)return;
  link.dataset.manualChoice='true';
  link.href='bootcamp-academy.html?program=free5&day='+day;
  link.textContent='Open suggested Free lesson '+day;
  setText('free-start-result',day===1?
   'Talia recommends Day 1: shares, quotations and what a market does. This is a learning preference, not assessed mastery.':
   day===2?
   'Talia recommends Day 2: read your first fictional five-minute candle, then revisit Day 1 if needed. No mastery has been awarded.':
   'Talia recommends Day 3: verify news sources and publication time. Days 1–2 remain available. No skill was certified.');
 });
}
async function renderRecentFreeJournal(sb,memberId){
 const detail=document.querySelector('.free-learning-recent');
 const list=document.getElementById('free-recent-journal-list');
 if(!detail||!list)return;
 let everLoaded=false;
 detail.addEventListener('toggle',()=>{if(!detail.open||everLoaded)return;
  everLoaded=true;
  void(async()=>{
   try{
    const result=await sb.from('decision_journal')
     .select('id,ticker,journal_type,status,updated_at')
     .eq('user_id',memberId).order('updated_at',{ascending:false}).limit(3);
    const current=await sb.auth.getUser();
    if(current.data?.user?.id!==memberId){list.replaceChildren();return;}
    if(result.error||!Array.isArray(result.data))throw Error('The private Journal is unavailable.');
    list.replaceChildren();
    for(const row of result.data){
     const id=Number(row.id);
     if(!Number.isSafeInteger(id)||id<1)continue;
     const item=document.createElement('li');
     const link=document.createElement('a');
     link.href='journal-entry.html?id='+id;
     link.textContent='Record #'+id+' · '+String(row.ticker||'Observation')+
      ' · '+String(row.journal_type||'member record')+' · '+String(row.status||'saved');
     item.append(link);list.append(item);
    }
    setText('free-recent-journal-status',list.children.length?
     'Your three most recently updated private Journal records; values and trading outcomes are not independently verified.':
     'No Journal records saved yet. Your fictional practice can be documented in the Journal when ready.');
   }catch{setText('free-recent-journal-status','Recent Journal work could not be verified. Your existing records were not changed.');everLoaded=false}
  })();
 });
}

async function renderFreeFoundationEvidence(sb,memberId) {
 const status=document.getElementById('free-next-detail');
 if(!status)return;
 try{
  const {data:{session}}=await sb.auth.getSession();
  if(!session||session.user?.id!==memberId)throw Error('Sign in to continue.');
  const response=await fetch('/api/bootcamp-academy?program=free5',{
   method:'GET',headers:{authorization:'Bearer '+session.access_token},
   credentials:'same-origin',cache:'no-store'
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data.ok!==true||data.program?.code!=='free5'||
   !Array.isArray(data.curriculum)||data.curriculum.length!==5||
   data.progressAvailable!==true||!Array.isArray(data.progress))
   throw Error('Free study progress could not be verified.');
  // Late replies for a previously signed-in member must never be shown.
  const identity=await sb.auth.getUser();
  if(identity.data?.user?.id!==memberId)return;
  const byDay=new Map(data.progress.map(row=>[row.day,row]));
  if(byDay.size!==data.progress.length||
   data.progress.some(row=>!Number.isInteger(row.day)||row.day<1||row.day>5||
     !['in_progress','reflection_saved'].includes(row.status)))
   throw Error('Invalid private study evidence.');
  const saved=Array.from(byDay.values()).filter(row=>row.status==='reflection_saved');
  const next=data.curriculum.find(day=>byDay.get(day.day)?.status!=='reflection_saved')||
   data.curriculum[4];
  if(!next||!Number.isInteger(next.day)||next.day<1||next.day>5)
   throw Error('Free curriculum revision mismatch.');
  setText('free-next-detail',saved.length===5?
   'You saved all five ungraded reflections. Review your final no-trade and source-check lesson before advanced independent assessment.':
   'Day '+next.day+' of 5 — '+next.title+'. '+next.objective);
  const link=document.getElementById('free-next-action');
  if(link){
   if(link.dataset.manualChoice!=='true'){
    link.href='bootcamp-academy.html?program=free5&day='+next.day;
    link.textContent=saved.length===5?'Review Free Foundations':'Continue Free lesson '+next.day;
   }
  }
  setText('free-reflection-progress',saved.length+' of 5 private study reflections saved. Practice evidence only; no official mastery awarded.');
  const domainDays={knowledge:[1,3],recognition:[2],decision:[4],process:[5]};
  for(const [domain,days] of Object.entries(domainDays)){
   const practice=days.filter(day=>byDay.get(day)?.status==='reflection_saved').length;
   setText('free-skill-'+domain,practice+
    ' / '+days.length+' guided reflections · Not Yet Assessed');
  }
 }catch{
  setText('free-next-detail','We could not verify your private Free Foundations progress. You can still read the lessons; no saved work is being assumed.');
  for(const name of ['knowledge','recognition','decision','process'])
   setText('free-skill-'+name,'Not Yet Assessed');
 }
}

async function renderFreeLearningDashboard(sb) {
 const panel=document.getElementById('free-learning-launchpad');
 if(!panel)return;
 panel.hidden=false;
 const status=document.getElementById('free-learning-usage-status');
 try{
  // Existing Auth-scoped RPC reads only auth.uid(); never accept a browser user id.
  const {data,error}=await sb.rpc('gu_v014121_my_free_week_usage');
  if(error||!data||typeof data!=='object')throw Error('Free usage is unavailable');
  const allowed=(count,limit)=>Number.isSafeInteger(count)&&count>=0&&
   Number.isSafeInteger(limit)&&limit>=0;
  if(!allowed(data.journalUsed,data.journalLimit)||
   !allowed(data.simulatorSavesUsed,data.simulatorSaveLimit))throw Error('Invalid weekly usage contract');
  setText('free-learning-journal-usage',
   data.journalUnlimited?'Premium unlimited':data.journalUsed+' / '+data.journalLimit);
  setText('free-learning-sim-usage',
   data.simulatorUnlimited?'Premium unlimited':data.simulatorSavesUsed+' / '+data.simulatorSaveLimit);
  const at=new Date(data.resetsAtUtc);
  if(Number.isNaN(at.getTime()))throw Error('Invalid weekly reset date');
  status.textContent='Saved practice is counted by the existing server ledger. Resets '+
   at.toLocaleString('en-US',{timeZone:'UTC',timeZoneName:'short',weekday:'long',month:'short',day:'numeric',
    hour:'2-digit',minute:'2-digit'})+'. Unsaved browser replay does not count.';
 }catch{
  setText('free-learning-journal-usage','Unavailable');
  setText('free-learning-sim-usage','Unavailable');
  status.textContent='Current usage could not be verified. Existing server-side weekly limits still apply; no additional allowance has been assumed.';
 }
}

async function initDashboard() {
  // Existing beta bookmarks lead to the established, permission-checked
  // Founders Commons. This redirects; it never awards a founder entitlement.
  if (new URLSearchParams(location.search).get('tab') === 'beta') {
    window.location.replace('founders-commons.html');
    return;
  }

  const sb = await window.getSupabaseClient();
  const gate = document.getElementById('dashboard-gate');
  const content = document.getElementById('dashboard-content');
  if (!sb) {
    gate.innerHTML = '<div class="notice">Account backend is not connected.</div>';
    return;
  }

  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    gate.innerHTML = '<div class="notice">Sign in to view synchronized learning progress. <a href="account.html">Go to Account</a>.</div>';
    return;
  }

  gate.innerHTML = '';
  const activeTab = new URLSearchParams(location.search).get('tab');
  const viewingSupport = activeTab === 'support';
  content.hidden = viewingSupport;
  if (viewingSupport) {
    // Existing private Support is the only non-overview Dashboard workspace.
    const title = document.querySelector('.gu-dashboard-intro h1');
    const explanation = document.querySelector('.gu-dashboard-intro p.small');
    const shortcuts = document.querySelector('.gu-dashboard-quick');
    if (title) title.textContent = 'Private Member Support';
    if (explanation) explanation.textContent = 'Submit and follow up on private support requests.';
    if (shortcuts) shortcuts.hidden = true;
    return;
  }

  const [labs, profileResult, progressResult, entitlementResult, attemptResult, redemptionResult] = await Promise.all([
    loadJSON('data/labs.json'),
    sb.from('profiles').select('username').eq('id', user.id).maybeSingle(),
    sb.from('lab_progress').select('lab_id,status,score,updated_at,completed_at').eq('user_id', user.id),
    sb.from('entitlements').select('product_key,status,starts_at,ends_at').eq('user_id', user.id),
    sb.from('lab_attempts').select('lab_id,mode,process_score,mistakes,skill_code,completed_at').eq('user_id', user.id),
    sb.rpc('my_book_key_redemptions')
  ]);

  const profile = profileResult.data || {};
  const labIds = new Set(labs.map(l => l.id));
  const progress = (progressResult.data || []).filter(p => labIds.has(p.lab_id));
  const entitlements = entitlementResult.data || [];
  const attempts = attemptResult.data || [];
  const attemptMistakes = attempts.flatMap(a => Array.isArray(a.mistakes) ? a.mistakes : []);
  setText('attempt-count-dash', attempts.length);
  setText('blind-count-dash', attempts.filter(a => ['blind','assessment'].includes(a.mode)).length);
  setText('mistake-count-dash', attemptMistakes.length);
  setText('avg-process-dash', `${attempts.length ? Math.round(attempts.reduce((sum,a)=>sum+Number(a.process_score||0),0)/attempts.length) : 0}%`);
  const active = activeEntitlements(entitlements);
  const redeemedBooks = redemptionResult.data || [];
  const completedSet = new Set(progress.filter(p => p.status === 'completed').map(p => p.lab_id));
  const inProgressSet = new Set(progress.filter(p => p.status === 'in_progress').map(p => p.lab_id));
  const notStartedCount = Math.max(0, labs.length - completedSet.size - inProgressSet.size);

  setText('member-name', profile.username ? `@${profile.username}` : (user.email || 'Member'));
  setText('member-email', user.email || '');

  const tier = document.getElementById('membership-tier');
  const membershipCard = document.getElementById('membership-summary');
  if (active.length) {
    tier.textContent = active.some(e => e.status === 'trialing') ? 'Learning Member — Trial' : 'Learning Member';
    tier.classList.add('pill-active');
    const primary = active[0];
    setText('membership-plan-name', titleFromKey(primary.product_key));
    setText('membership-plan-status', primary.status === 'trialing' ? 'Trialing' : 'Active');
    setText('membership-plan-end', primary.ends_at ? `Access through ${safeDate(primary.ends_at)}` : 'Active until cancelled or changed');
    membershipCard?.classList.add('membership-active');
  } else if (redeemedBooks.length) {
    tier.textContent = 'Book Owner';
    tier.classList.add('pill-active');
    setText('membership-plan-name', 'Book Owner Companion Access');
    setText('membership-plan-status', 'Guided Mode retained for redeemed books');
    setText('membership-plan-end', redeemedBooks.map(r => r.book_label || r.book_code).join(' · '));
  } else {
    tier.textContent = 'Free Membership';
    setText('membership-plan-name', 'Free Membership');
    setText('membership-plan-status', 'No active Full Learning Access');
    setText('membership-plan-end', 'Registry search, selected Guided samples, and synchronized basic progress are included.');
  }

  setText('labs-completed', completedSet.size);
  if (!active.length) {
   void renderFreeLearningDashboard(sb);
   void renderFreeFoundationEvidence(sb,user.id);
   setupFreeStartingPoint();
   void renderRecentFreeJournal(sb,user.id);
  }
  setText('labs-in-progress', inProgressSet.size);
  setText('labs-not-started', notStartedCount);
  setText('overall-progress', `${pct(completedSet.size, labs.length)}%`);
  setText('labs-total', labs.length);

  [1, 2, 3].forEach(book => {
    const bookLabs = labs.filter(l => Number(l.book) === book);
    const done = bookLabs.filter(l => completedSet.has(l.id)).length;
    const working = bookLabs.filter(l => inProgressSet.has(l.id)).length;
    const waiting = Math.max(0, bookLabs.length - done - working);
    const p = pct(done, bookLabs.length);
    const bar = document.getElementById(`book-${book}-bar`);
    if (bar) {
      bar.style.width = `${p}%`;
      bar.setAttribute('aria-valuenow', String(p));
    }
    setText(`book-${book}-label`, `${done} of ${bookLabs.length} self-tracked complete (${p}%)`);
    setText(`book-${book}-counts`, `${working} in progress · ${waiting} not started`);
  });

  const inProgressRows = progress
    .filter(p => p.status === 'in_progress')
    .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
  const nextId = inProgressRows[0]?.lab_id || labs.find(l => !completedSet.has(l.id))?.id;
  const nextLab = labs.find(l => l.id === nextId);
  const next = document.getElementById('next-lab');
  if (nextLab) {
    next.href = `lab-player.html?lab=${encodeURIComponent(nextLab.id)}`;
    next.textContent = inProgressSet.has(nextLab.id) ? 'Continue this lab' : 'Start this lab';
    setText('next-lab-id', nextLab.id);
    setText('next-lab-concept', nextLab.concept || 'Historical simulator exercise');
    setText('next-lab-location', `Book ${nextLab.book}, Chapter ${nextLab.chapter} — ${nextLab.chapterTitle}`);
    setText('next-lab-market', `${nextLab.ticker || '—'} · ${nextLab.date || '—'} · ${nextLab.timeframe || 'See book'}`);
  } else {
    next.removeAttribute('href');
    next.textContent = 'All current labs self-tracked complete';
    setText('next-lab-id', 'Complete');
    setText('next-lab-concept', 'All current Foundations labs are marked complete by you; assessed mastery is separate.');
    setText('next-lab-location', 'Use the registry to review completed work.');
    setText('next-lab-market', '');
  }

  const recent = progress
    .filter(p => ['completed', 'in_progress'].includes(p.status))
    .sort((a, b) => new Date(b.updated_at || b.completed_at || 0) - new Date(a.updated_at || a.completed_at || 0))
    .slice(0, 6);
  const recentList = document.getElementById('recent-activity');
  if (recent.length) {
    recentList.innerHTML = '';
    recent.forEach(p => {
      const lab = labs.find(l => l.id === p.lab_id);
      const li = document.createElement('li');
      li.className = 'activity-row';

      const text = document.createElement('div');
      const link = document.createElement('a');
      link.href = `lab-player.html?lab=${encodeURIComponent(p.lab_id)}`;
      link.textContent = `${p.lab_id}${lab?.concept ? ` — ${lab.concept}` : ''}`;
      text.appendChild(link);
      const detail = document.createElement('div');
      detail.className = 'small';
      detail.textContent = safeDate(p.updated_at || p.completed_at) || 'Recent activity';
      text.appendChild(detail);

      const badge = document.createElement('span');
      badge.className = `activity-badge ${statusClass(p.status)}`;
      badge.textContent = statusLabel(p.status);
      li.append(text, badge);
      recentList.appendChild(li);
    });
  } else {
    recentList.innerHTML = '<li class="activity-empty">No lab activity yet. Open the registry and mark a lab in progress when you begin.</li>';
  }
}

document.addEventListener('DOMContentLoaded', initDashboard);
