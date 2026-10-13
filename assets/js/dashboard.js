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
  if (status === 'completed') return 'Completed';
  if (status === 'in_progress') return 'In progress';
  return 'Not started';
}

function statusClass(status) {
  if (status === 'completed') return 'activity-completed';
  if (status === 'in_progress') return 'activity-progress';
  return 'activity-neutral';
}

async function initDashboard() {
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
  content.hidden = false;

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
    tier.textContent = 'Free Reader';
    setText('membership-plan-name', 'Free Reader Account');
    setText('membership-plan-status', 'No active Full Learning Access');
    setText('membership-plan-end', 'Registry search, selected Guided samples, and synchronized basic progress are included.');
  }

  setText('labs-completed', completedSet.size);
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
    setText(`book-${book}-label`, `${done} of ${bookLabs.length} completed (${p}%)`);
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
    next.textContent = 'All current labs complete';
    setText('next-lab-id', 'Complete');
    setText('next-lab-concept', 'All current Foundations labs are marked complete.');
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
