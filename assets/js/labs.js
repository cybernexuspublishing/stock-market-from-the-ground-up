let allLabs = [];
let progressMap = new Map();
let currentUser = null;
let labSupabase = null;
let progressSessionEpoch = 0;
let memberProgressAvailable = false;
let publishedAssessments = new Set();
let guidedBetaLabs = new Set();
let availabilityVerified = false;
let betaScopeVerified = false;
let betaCandidateIds = new Set();
let registryRights = null;
let trainingOnlyIds = new Set();


const BOOK_CODES={1:'FOUNDATION_BOOK_1',2:'FOUNDATION_BOOK_2',3:'FOUNDATION_BOOK_3',4:'DAY_TRADING_BOOK_1',5:'READING_THE_TAPE'};
function entitlementStatus(lab){
 const released=availabilityVerified&&(publishedAssessments.has(lab.id)||guidedBetaLabs.has(lab.id));
 if(!released)return {state:'upcoming',label:'Not released',reason:'This Lab has not been released for member study.'};
 if(!currentUser)return {state:'locked',label:'Sign in required',reason:'A registered member account is required.'};
 if(!registryRights?.freeEligible)return {state:'locked',label:'Access not verified',reason:'Membership access could not be verified.'};
 const sample=registryRights.freeSampleIds?.includes(lab.id);
 const trainingOnly=trainingOnlyIds.has(lab.id)||lab.book===6;
 const bookCode=BOOK_CODES[lab.book];
 const owned=bookCode&&registryRights.bookCodes?.includes(bookCode);
 const permitted=sample|| (trainingOnly?registryRights.training===true:
  registryRights.interactive===true||registryRights.training===true||owned===true);
 return permitted?{state:'available',label:'Available to you',reason:'Guided access; final authorization occurs on opening.'}:
 {state:'locked',label:trainingOnly?'Training access required':'Membership or book access required',
  reason:trainingOnly?'Requires an eligible training entitlement.':
   'Requires Interactive Learning, eligible training, or an independently owned matching book.'};
}
async function loadRegistryRights(userId,epoch){
 try{
  const {data}=await labSupabase.auth.getSession();
  if(!data?.session?.access_token||data.session.user?.id!==userId)throw Error('Session unavailable');
  const r=await fetch('/api/lab-registry-access',{headers:{authorization:'Bearer '+data.session.access_token},cache:'no-store'});
  if(!r.ok)throw Error('Member access unavailable');
  const j=await r.json();
  if(j?.ok!==true||j.freeEligible!==true||!Array.isArray(j.bookCodes)||!Array.isArray(j.freeSampleIds))
   throw Error('Invalid entitlement response');
  if(epoch===progressSessionEpoch&&currentUser?.id===userId){registryRights=j;
   document.body.dataset.labRegistryAccess='verified';
   const el=document.getElementById('lab-access-status');if(el)el.textContent='Your account access has been checked. Available Labs can be opened; locked Labs require additional access.';
  }
 }catch{
  if(epoch===progressSessionEpoch&&currentUser?.id===userId){registryRights=null;
   document.body.dataset.labRegistryAccess='unavailable';
   const el=document.getElementById('lab-access-status');if(el)el.textContent='Member access could not be confirmed. Lab launch actions remain locked.';
  }
 }finally{
  if(epoch===progressSessionEpoch&&currentUser?.id===userId)filterLabs();
 }
}

function norm(s) { return String(s || '').toLowerCase(); }

function statusLabel(status) {
  if (status === 'completed') return 'Self-tracked complete · not graded';
  if (status === 'in_progress') return 'In progress';
  return 'Not started';
}

function progressControl(labId) {
  if(entitlementStatus(allLabs.find(l=>l.id===labId)||{id:labId}).state!=='available')
    return '<span class="small" role="status">Locked — progress tracking is not available for this Lab.</span>';
  if (!availabilityVerified) return betaScopeVerified && betaCandidateIds.has(labId)
    ? '<span class="small" role="status">The Lab server verifies study access; official grades and saved progress are unverified.</span>'
    : '<span class="small" role="status">Release status unavailable; no grade or progress has been verified</span>';
  const guided = guidedBetaLabs.has(labId) && !publishedAssessments.has(labId);
  if (guided) {
    if (!currentUser) return '<a href="account.html" class="small">Sign in to save ungraded Lab practice</a>';
    if (!memberProgressAvailable)
      return '<span class="small" role="status">Private guided-practice progress unavailable — saved status was not verified</span>';
    const saved = progressMap.get(labId)?.status;
    return '<span class="small" role="status">' +
      (saved === 'completed' ? 'Saved self-tracked Lab activity · ungraded, no mastery credit' :
       saved === 'in_progress' ? 'Saved in-progress Lab activity · ungraded' :
       'No saved Lab activity yet · ungraded practice') + '</span>';
  }
  if (!publishedAssessments.has(labId))
    return '<span class="small">Upcoming — progress and graded credit are unavailable</span>';
  if (!currentUser) return '<a href="account.html" class="small">Sign in to track progress</a>';
  if (!memberProgressAvailable) return '<span class="small" role="status">Private progress unavailable — your saved status was not verified</span>';
  const status = progressMap.get(labId)?.status || 'not_started';
  return `<label class="sr-only" for="progress-${labId}">Progress for ${labId}</label>
  <select id="progress-${labId}" class="progress-select" data-lab-id="${labId}" aria-label="Progress for ${labId}">
    <option value="not_started"${status === 'not_started' ? ' selected' : ''}>Not started</option>
    <option value="in_progress"${status === 'in_progress' ? ' selected' : ''}>In progress</option>
    <option value="completed"${status === 'completed' ? ' selected' : ''}>Self-tracked complete (not graded)</option>
  </select>`;
}

function renderLabs(rows) {
  const body = document.getElementById('lab-body');
  const count = document.getElementById('lab-count');
  if (!body) return;
  if (count) count.textContent = `Showing ${rows.length} of ${allLabs.length} labs`;

  body.innerHTML = rows.map(x => {
    const access=entitlementStatus(x);
    const released = availabilityVerified && publishedAssessments.has(x.id);
    const guidedBeta = availabilityVerified && guidedBetaLabs.has(x.id) && !released;
    const betaCheck = !availabilityVerified && betaScopeVerified && betaCandidateIds.has(x.id);
    // Guided beta members can see their already-saved practice on returning,
    // but only after their private user-scoped progress query succeeds.
    const savedStatus = (released || guidedBeta || betaCheck) && currentUser
      ? (memberProgressAvailable ? (progressMap.get(x.id)?.status || 'not_started') : 'unverified')
      : 'not_started';
    const progressText = savedStatus === 'unverified'
      ? 'Private progress not verified'
      : (guidedBeta || betaCheck) ? statusLabel(savedStatus) + ' · ungraded practice only'
      : statusLabel(savedStatus);
    return `<article class="lab-card" id="row-${x.id}" data-status="${savedStatus}" data-access="${access.state}">
      <div class="lab-card-main">
        <div class="lab-card-heading">
          <span class="lab-id-badge">${x.id}</span><span class="lab-access-tag lab-access-${access.state}" aria-label="${access.label}">${access.state==='available'?'Available':access.state==='upcoming'?'Upcoming':'🔒 '+access.label}</span>
          <span class="lab-book-badge">${x.book===6?'Site-exclusive':x.book===5?'Reading the Tape':x.book===4?'Day Trading':'Book '+x.book}${x.chapter?' · Chapter '+x.chapter:''}</span>
          ${x.skill?`<span class="pill">${x.skill}</span>`:''}${(x.marketContexts||[]).slice(0,2).map(t=>`<span class="pill pill-context">${t}</span>`).join('')}
        </div>
        <h2 class="lab-concept">${x.concept || 'Historical simulator exercise'}</h2>
        <div class="lab-location"><strong>${x.chapterTitle||'Original companion Lab'}</strong>${guidedBeta?'<p class="small">Original beta guided study · ungraded. Help review the lesson and record your reasoning; official assessment requires separate approval.</p>':betaCheck?'<p class="small">Beta candidate · publication status unavailable. The Lab server independently checks study access; no grade or saved progress is inferred.</p>':!released?'<p class="small">Upcoming — no Start action or grade is available.</p>':''}</div>
      </div>
      <div class="lab-card-meta" aria-label="Lab details">
        <div class="lab-meta-item"><span>Ticker</span><strong>${x.ticker || '—'}</strong></div>
        <div class="lab-meta-item"><span>Date</span><strong>${x.date || '—'}</strong></div>
        <div class="lab-meta-item"><span>Chart</span><strong>${x.timeframe || 'See book'}</strong></div>
      </div>
      <div class="lab-card-progress">
        ${access.state==='available'?`<a class="btn lab-open-btn" href="lab-player.html?lab=${encodeURIComponent(x.id)}">${released?'Open Interactive Lab':'Open guided beta practice (ungraded)'}</a>`:`<span class="lab-access-explanation" role="status">${access.state==='upcoming'?'🔒 Upcoming — not released':'🔒 '+access.reason}</span>`}
        <span class="lab-progress-label">My progress (self-tracked; not a graded assessment)</span>
        ${progressControl(x.id)}
        <div class="progress-msg" role="status" data-msg-for="${x.id}">${progressText}</div>
      </div>
    </article>`;
  }).join('');

  body.querySelectorAll('.progress-select').forEach(el => el.addEventListener('change', saveProgress));
}

function filterLabs() {
  const q = norm(document.getElementById('q').value);
  const book = document.getElementById('book-filter').value;
  const ticker = norm(document.getElementById('ticker-filter').value);
  const chapter = document.getElementById('chapter-filter').value;
  const statusFilter = document.getElementById('status-filter')?.value || '';
  const rows = allLabs.filter(x => {
    const status = !currentUser || memberProgressAvailable
      ? (progressMap.get(x.id)?.status || 'not_started') : 'unverified';
    return (!book || String(x.book) === book) &&
      (!chapter || String(x.chapter) === chapter) &&
      (!ticker || norm(x.ticker).includes(ticker)) &&
      (!statusFilter || status === statusFilter) &&
      (!q || [x.id, x.concept, x.chapterTitle, x.ticker, x.date, x.timeframe, x.skill, ...(x.marketContexts||[])].some(v => norm(v).includes(q)));
  });
  renderLabs(rows);
}

async function saveProgress(e) {
  const select = e.currentTarget;
  const labId = select.dataset.labId;
  const status = select.value;
  if (!labSupabase || !currentUser || !memberProgressAvailable || !availabilityVerified || !publishedAssessments.has(labId)) return;
  const actorId = currentUser.id, epoch = progressSessionEpoch;
  const sameMember = () => epoch === progressSessionEpoch && currentUser?.id === actorId;

  const previousStatus = progressMap.get(labId)?.status || 'not_started';
  const msg = document.querySelector(`[data-msg-for="${labId}"]`);
  const card = document.getElementById(`row-${labId}`);
  select.disabled = true;
  if (msg) {
    msg.textContent = 'Saving…';
    msg.classList.remove('save-error', 'save-ok');
  }

  try {
    const now = new Date().toISOString();
    let error = null;

    if (status === 'not_started') {
      ({ error } = await labSupabase.from('lab_progress').delete().eq('user_id', actorId).eq('lab_id', labId));
      if (!error) progressMap.delete(labId);
    } else {
      const row = {
        user_id: actorId,
        lab_id: labId,
        status,
        updated_at: now,
        completed_at: status === 'completed' ? now : null
      };
      ({ error } = await labSupabase.from('lab_progress').upsert(row, { onConflict: 'user_id,lab_id' }));
      if (!error) progressMap.set(labId, row);
    }

    if (error) throw error;
    if (!sameMember()) return; // Never write the previous member's status back into the new session's DOM.
    if (card) card.dataset.status = status;
    if (msg) {
      msg.textContent = `${statusLabel(status)} — saved`;
      msg.classList.add('save-ok');
    }
    if (document.getElementById('status-filter')?.value) {
      window.setTimeout(filterLabs, 250);
    }
  } catch (error) {
    if (!sameMember()) return;
    select.value = previousStatus;
    if (card) card.dataset.status = previousStatus;
    if (msg) {
      msg.textContent = `Could not save: ${error.message}`;
      msg.classList.add('save-error');
    }
  } finally {
    if (sameMember()) select.disabled = false;
  }
}

// React to real Supabase account changes without exposing the previous member's
// progress through hidden DOM, stale asynchronous queries or in-flight writes.
async function loadMemberProgress(userId, epoch) {
  try {
    const { data, error } = await labSupabase.from('lab_progress')
      .select('lab_id,status,completed_at,updated_at').eq('user_id', userId);
    if (epoch !== progressSessionEpoch || currentUser?.id !== userId) return;
    if (error || !Array.isArray(data)) throw error || Error('Private progress unavailable');
    progressMap.clear();
    for (const row of data) {
      if (typeof row.lab_id === 'string' && ['in_progress','completed'].includes(row.status))
        progressMap.set(row.lab_id, row);
    }
    memberProgressAvailable = true;
  } catch {
    if (epoch !== progressSessionEpoch || currentUser?.id !== userId) return;
    progressMap.clear();
    memberProgressAvailable = false; // Never replace a failed read with invented 'not started' progress.
  } finally {
    if (epoch === progressSessionEpoch && currentUser?.id === userId) filterLabs();
  }
}
function handleMemberChange(user) {
  const nextId = typeof user?.id === 'string' ? user.id : '';
  if (nextId === (currentUser?.id || '')) return;
  const epoch = ++progressSessionEpoch;
  currentUser = nextId ? { id: nextId } : null;
  progressMap.clear();
  memberProgressAvailable = false;
  registryRights = null;
  document.body.dataset.labRegistryAccess=nextId?'checking':'signed-out';
  const box=document.getElementById('lab-access-status');if(box)box.textContent=nextId?'Checking your Lab access…':'Sign in to view your available Labs.';
  filterLabs(); // Synchronously scrub prior member status and entitlements.
  if (nextId) {void loadMemberProgress(nextId, epoch);void loadRegistryRights(nextId, epoch);}
}

async function initLabs() {
  const foundation=await loadJSON('data/labs.json');
  const crosswalk=await loadJSON('data/competency-lab-paths-v01499.json');
  if(crosswalk.totalCanonicalLabs!==419||Object.keys(crosswalk.byLab||{}).length!==419)
   throw Error('Canonical 419-Lab curriculum inventory is incomplete.');
  const original=new Map(foundation.map(l=>[l.id,l]));
  allLabs=Object.entries(crosswalk.byLab).map(([id,entry])=>{
   if(original.has(id))return original.get(id);
   const bookNumbers={DAY_TRADING_BOOK_1:4,READING_THE_TAPE:5,SITE_EXCLUSIVE:6};
   const chapters=/^(?:DT|TAPE)-C(\d+)-/.exec(id);
   return {id,book:bookNumbers[entry.bookCode]||0,chapter:chapters?Number(chapters[1]):0,
    concept:entry.title===id?'Concept title pending individual editorial review':entry.title,
    chapterTitle:entry.bookCode.replaceAll('_',' '),
    ticker:'',date:'',timeframe:'',skill:(entry.relatedCompetencies||[])[0]?.replaceAll('_',' ')||'Contextual education',
    marketContexts:[],sourceStatus:'canonical_ungraded_orientation'};
  });
  if(new Set(allLabs.map(l=>l.id)).size!==419)throw Error('Duplicate canonical Lab identifiers');
   // This single public canonical scope preserves all 83 Upcoming exclusions.
   betaCandidateIds=new Set();betaScopeVerified=false;
   try{
     const response=await fetch('/api/lab-beta-scope',{cache:'no-store'});
     if(!response.ok)throw Error('Candidate scope unavailable');
     const data=await response.json();
     const canonical=new Set(allLabs.map(l=>l.id));
     if(data?.ok!==true||data.targetSelected!==336||data.targetUpcoming!==83||
        !Array.isArray(data.selectedForPrebeta)||data.selectedForPrebeta.length!==336||
        !Array.isArray(data.upcoming)||data.upcoming.length!==83||
        new Set([...data.selectedForPrebeta,...data.upcoming]).size!==419||
        [...data.selectedForPrebeta,...data.upcoming].some(id=>!canonical.has(id)))
       throw Error('Candidate scope unverified');
     betaCandidateIds=new Set(data.selectedForPrebeta);betaScopeVerified=true;
   }catch{/* Never invent candidate IDs when scope verification fails. */}
  // Fail closed: a registry item is not a published graded Lab. The Worker
  // returns only eligible IDs, never private instructional text or keys.
  try {
    const ready=await fetch('/api/lab-release-availability',{cache:'no-store'});
    if(!ready.ok)throw Error('Release verification unavailable');
    const data=await ready.json();
    if(data?.ok!==true||!Array.isArray(data.publishedIds)||!Array.isArray(data.guidedBetaIds)||data.publishedIds.some(id=>typeof id!=='string')||data.guidedBetaIds.some(id=>typeof id!=='string'))
      throw Error('Invalid release evidence');
    const canonical=new Set(allLabs.map(l=>l.id));
    if([...data.publishedIds,...data.guidedBetaIds].some(id=>!canonical.has(id)))throw Error('Unknown release ID');
    if(data.guidedBetaIds.some(id=>data.publishedIds.includes(id)))throw Error('Published and ungraded practice IDs overlap');
    publishedAssessments=new Set(data.publishedIds);
    guidedBetaLabs=new Set(data.guidedBetaIds);
    trainingOnlyIds=new Set(Array.isArray(data.trainingOnlyIds)?data.trainingOnlyIds:[]);
    availabilityVerified=true;
  }catch{
    publishedAssessments=new Set();guidedBetaLabs=new Set();trainingOnlyIds=new Set();availabilityVerified=false;
  }
  labSupabase = await window.getSupabaseClient();
  if (labSupabase) {
    if (typeof labSupabase.auth?.onAuthStateChange === 'function') {
      labSupabase.auth.onAuthStateChange((event, session) => {
        if (['INITIAL_SESSION','SIGNED_IN','SIGNED_OUT','USER_UPDATED','TOKEN_REFRESHED'].includes(event))
          handleMemberChange(session?.user || null);
      });
    }
    const initialEpoch = progressSessionEpoch;
    const { data } = await labSupabase.auth.getUser();
    if (initialEpoch === progressSessionEpoch) handleMemberChange(data?.user || null);
  }

  const params = new URLSearchParams(window.location.search);
  const requestedLab = params.get('lab')||params.get('q');
  const requestedBook = params.get('book');
  const requestedStatus = params.get('status');
  if (requestedLab && document.getElementById('q')) document.getElementById('q').value = requestedLab;
  if (requestedBook && ['1','2','3','4','5','6'].includes(requestedBook) && document.getElementById('book-filter')) document.getElementById('book-filter').value = requestedBook;
  if (requestedStatus && ['not_started','in_progress','completed'].includes(requestedStatus) && document.getElementById('status-filter')) document.getElementById('status-filter').value = requestedStatus;

  ['q', 'book-filter', 'ticker-filter', 'chapter-filter', 'status-filter'].forEach(id =>
    document.getElementById(id)?.addEventListener(id === 'q' || id === 'ticker-filter' ? 'input' : 'change', filterLabs)
  );
  filterLabs();

  if (requestedLab) {
    window.setTimeout(() => {
      const card = document.getElementById(`row-${requestedLab}`);
      if (card) {
        card.classList.add('lab-card-target');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
  }
}

document.addEventListener('DOMContentLoaded', initLabs);
