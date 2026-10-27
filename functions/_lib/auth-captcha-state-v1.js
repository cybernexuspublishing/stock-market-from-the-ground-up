// Runtime setting is owned by Supabase and consumed directly by Cloudflare
// (no Pages redeploy required). Network or unknown state fails to ON.
export async function effectiveCaptchaEnabled(env){
 if(env.ENFORCE_AUTH_TURNSTILE_V135!=='true')return false;
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const key=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!key)return true;
 const h={apikey:key,...(key.startsWith('sb_secret_')?{}:{authorization:'Bearer '+key})};
 try{
  const r=await fetch(base+'/rest/v1/site_settings?select=value&setting_key=eq.auth.turnstile.owner_override_v1&limit=1',
   {headers:h,cache:'no-store'});
  if(!r.ok)return true;
  const rows=await r.json();
  // Hard fallback for incorrect types, no value, or missing settings.
  return Array.isArray(rows)&&rows.length===1&&rows[0].value===false?false:true;
 }catch{return true}
}
