let allLabs = [];
let progressMap = new Map();
let currentUser = null;
let labSupabase = null;

function norm(s) { return String(s || '').toLowerCase(); }

function statusLabel(status) {
  if (status === 'completed') return 'Self-tracked complete · not graded';
  if (status === 'in_progress') return 'In progress';
  return 'Not started';
}

function progressControl(labId) {
  if (!currentUser) return '<a href="account.html" class="small">Sign in to track progress</a>';
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
    const savedStatus = progressMap.get(x.id)?.status || 'not_started';
    return `<article class="lab-card" id="row-${x.id}" data-status="${savedStatus}">
      <div class="lab-card-main">
        <div class="lab-card-heading">
          <span class="lab-id-badge">${x.id}</span>
          <span class="lab-book-badge">${x.book===6?'Site-exclusive':x.book===5?'Reading the Tape':x.book===4?'Day Trading':'Book '+x.book}${x.chapter?' · Chapter '+x.chapter:''}</span>
          ${x.skill?`<span class="pill">${x.skill}</span>`:''}${(x.marketContexts||[]).slice(0,2).map(t=>`<span class="pill pill-context">${t}</span>`).join('')}
        </div>
        <h2 class="lab-concept">${x.concept || 'Historical simulator exercise'}</h2>
        <div class="lab-location"><strong>${x.chapterTitle||'Original companion Lab'}</strong>${x.sourceStatus==='canonical_ungraded_orientation'?'<p class="small">Concept study available; private authored lesson and reviewed grading may still be pending.</p>':''}</div>
      </div>
      <div class="lab-card-meta" aria-label="Lab details">
        <div class="lab-meta-item"><span>Ticker</span><strong>${x.ticker || '—'}</strong></div>
        <div class="lab-meta-item"><span>Date</span><strong>${x.date || '—'}</strong></div>
        <div class="lab-meta-item"><span>Chart</span><strong>${x.timeframe || 'See book'}</strong></div>
      </div>
      <div class="lab-card-progress">
        <a class="btn lab-open-btn" href="lab-player.html?lab=${encodeURIComponent(x.id)}">Open Interactive Lab</a>
        <span class="lab-progress-label">My progress (self-tracked; not a graded assessment)</span>
        ${progressControl(x.id)}
        <div class="progress-msg" data-msg-for="${x.id}">${statusLabel(savedStatus)}</div>
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
    const status = progressMap.get(x.id)?.status || 'not_started';
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
  if (!labSupabase || !currentUser) return;

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
      ({ error } = await labSupabase.from('lab_progress').delete().eq('user_id', currentUser.id).eq('lab_id', labId));
      if (!error) progressMap.delete(labId);
    } else {
      const row = {
        user_id: currentUser.id,
        lab_id: labId,
        status,
        updated_at: now,
        completed_at: status === 'completed' ? now : null
      };
      ({ error } = await labSupabase.from('lab_progress').upsert(row, { onConflict: 'user_id,lab_id' }));
      if (!error) progressMap.set(labId, row);
    }

    if (error) throw error;
    if (card) card.dataset.status = status;
    if (msg) {
      msg.textContent = `${statusLabel(status)} — saved`;
      msg.classList.add('save-ok');
    }
    if (document.getElementById('status-filter')?.value) {
      window.setTimeout(filterLabs, 250);
    }
  } catch (error) {
    select.value = previousStatus;
    if (card) card.dataset.status = previousStatus;
    if (msg) {
      msg.textContent = `Could not save: ${error.message}`;
      msg.classList.add('save-error');
    }
  } finally {
    select.disabled = false;
  }
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
  labSupabase = await window.getSupabaseClient();
  if (labSupabase) {
    const { data: { user } } = await labSupabase.auth.getUser();
    currentUser = user;
    if (user) {
      const { data } = await labSupabase.from('lab_progress').select('lab_id,status,completed_at,updated_at').eq('user_id', user.id);
      (data || []).forEach(p => progressMap.set(p.lab_id, p));
    }
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
