/* v0.14.0.272 Free Beta backend configuration + owner registration controls.
 * Public status only. Never return key values, profile data, DB errors or tokens.
 */
const response=available=>new Response(JSON.stringify({ok:true,signupAvailable:available,readOnly:true}),{
 status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',
  'x-content-type-options':'nosniff','x-gu-beta-readiness':'v014272'}});
export async function onRequestGet({env}){
 const base=String(env?.SUPABASE_URL||'').replace(/\/$/,'');
 const pub=String(env?.SUPABASE_PUBLISHABLE_KEY||'');
 const secret=String(env?.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(base)||!pub||
  !(/^(sb_secret_[A-Za-z0-9_-]{8,}|eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.test(secret))||
  (env.ENFORCE_AUTH_TURNSTILE_V135==='true'&&(!env.TURNSTILE_SECRET_KEY||!env.TURNSTILE_SITE_KEY)))
  return response(false);
 const headers={apikey:secret,...(secret.startsWith('sb_secret_')?{}:{authorization:'Bearer '+secret})};
 try{
  const control=new URL(base+'/rest/v1/site_feature_controls');
  control.searchParams.set('select','enabled');control.searchParams.set('feature_code','eq.REGISTRATION_ENABLED');control.searchParams.set('limit','2');
  const setting=new URL(base+'/rest/v1/site_settings');
  setting.searchParams.set('select','value');setting.searchParams.set('setting_key','eq.site.registration_enabled');setting.searchParams.set('limit','2');
  const reads=await Promise.all([control,setting].map(u=>fetch(u,{method:'GET',headers,
   cache:'no-store',signal:AbortSignal.timeout(6000)})));
  if(reads.some(r=>!r.ok))return response(false);
  const [controls,settings]=await Promise.all(reads.map(r=>r.json()));
  return response(Array.isArray(controls)&&controls.length===1&&controls[0].enabled===true&&
   Array.isArray(settings)&&settings.length===1&&settings[0].value===true);
 }catch{return response(false)}
}
export async function onRequest(){return new Response('Method not allowed',{status:405,headers:{allow:'GET','cache-control':'no-store'}})}
