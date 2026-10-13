function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '';
}

async function refreshAccountUI() {
  const status = document.getElementById('account-status');
  if (!status) return;
  const sb = await window.getSupabaseClient();
  if (!sb) {
    status.innerHTML = '<div class="notice">Account backend is not connected yet.</div>';
    return;
  }

  const { data: { user } } = await sb.auth.getUser();
  const panel = document.getElementById('profile-panel');
  const dashboardLink = document.getElementById('dashboard-link');

  if (!user) {
    status.innerHTML = '<div class="small">Not signed in.</div>';
    if (panel) panel.hidden = true;
    if (dashboardLink) dashboardLink.hidden = true;
    return;
  }

  status.innerHTML = '<div class="oknotice notice">Signed in as <strong id="signed-in-email"></strong>.</div>';
  setText('signed-in-email', user.email || 'verified user');
  const emailInput = document.getElementById('email');
  if (emailInput && user.email) emailInput.value = user.email;

  const { data: profile, error } = await sb
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  if (!error && panel) {
    panel.hidden = false;
    const displayName = document.getElementById('display-name');
    if (displayName) displayName.value = profile?.display_name || '';
  }
  if (dashboardLink) dashboardLink.hidden = false;
}

async function signUp(e) {
  e?.preventDefault();
  const sb = await window.getSupabaseClient();
  if (!sb) return alert('Supabase is not configured yet.');
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const displayName = document.getElementById('display-name-signup')?.value.trim() || '';
  const redirectTo = `${window.location.origin}/account.html`;
  const { error } = await sb.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: displayName ? { display_name: displayName } : {}
    }
  });
  alert(error ? error.message : 'Account created. Check your email and verify the address before signing in.');
  await refreshAccountUI();
}

async function signIn(e) {
  e?.preventDefault();
  const sb = await window.getSupabaseClient();
  if (!sb) return alert('Supabase is not configured yet.');
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return alert(error.message);
  await refreshAccountUI();
  window.location.href = 'dashboard.html';
}

async function signOut() {
  const sb = await window.getSupabaseClient();
  if (sb) await sb.auth.signOut();
  await refreshAccountUI();
}

async function saveDisplayName() {
  const sb = await window.getSupabaseClient();
  if (!sb) return;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return alert('Sign in first.');
  const displayName = document.getElementById('display-name').value.trim();
  if (displayName.length > 80) return alert('Display name must be 80 characters or fewer.');
  const { error } = await sb.from('profiles').update({ display_name: displayName || null }).eq('id', user.id);
  alert(error ? error.message : 'Profile saved.');
}

document.addEventListener('DOMContentLoaded', async () => {
  const sb = await window.getSupabaseClient();
  if (sb) sb.auth.onAuthStateChange(() => refreshAccountUI());
  refreshAccountUI();
});
