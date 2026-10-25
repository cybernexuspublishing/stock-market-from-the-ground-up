let siteSupabaseClient = null;
let siteSupabaseClientPending = null;

async function getSupabaseClient() {
  if (siteSupabaseClient) return siteSupabaseClient;
  if (siteSupabaseClientPending) return siteSupabaseClientPending;
  const c = window.SITE_CONFIG || {};
  if (!c.SUPABASE_URL || !c.SUPABASE_ANON_KEY) return null;
  // Header, session manager and page controllers initialize concurrently.
  // Share the in-flight import so only one Auth client owns the storage key.
  siteSupabaseClientPending = (async () => {
    const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    siteSupabaseClient = mod.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return siteSupabaseClient;
  })();
  try { return await siteSupabaseClientPending; }
  finally { siteSupabaseClientPending = null; }
}

window.getSupabaseClient = getSupabaseClient;
