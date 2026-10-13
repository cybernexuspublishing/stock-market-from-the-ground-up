let siteSupabaseClient = null;

async function getSupabaseClient() {
  if (siteSupabaseClient) return siteSupabaseClient;
  const c = window.SITE_CONFIG || {};
  if (!c.SUPABASE_URL || !c.SUPABASE_ANON_KEY) return null;
  const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  siteSupabaseClient = mod.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  return siteSupabaseClient;
}

window.getSupabaseClient = getSupabaseClient;
