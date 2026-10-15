/* v0.14.0.20 — Owner-only, read-only backend contract inventory.
 * A contract being queryable is NOT evidence that a workflow or its RLS is safe.
 * No user data, credentials, SQL text, server error details or service keys leave this endpoint.
 */
const HEADERS=Object.freeze({
  'content-type':'application/json; charset=utf-8',
  'cache-control':'private, no-store, max-age=0',
  'pragma':'no-cache',
  'vary':'Authorization',
  'x-content-type-options':'nosniff'
});
const answer=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers:HEADERS});
const memberId=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTRACTS=Object.freeze([
  ['identity','profiles','profiles?select=id&limit=0'],
  ['roles','admin_user_roles','admin_user_roles?select=user_id&limit=0'],
  ['moderation','forum_reports','forum_reports?select=content_id&limit=0'],
  ['reporting_policy','community_report_policy_v01417','community_report_policy_v01417?select=policy_id&limit=0'],
  ['commons','commons_topics','commons_topics?select=id&limit=0'],
  ['commons','commons_posts','commons_posts?select=id&limit=0'],
  ['commons','commons_topic_subscriptions','commons_topic_subscriptions?select=user_id&limit=0'],
  ['notifications','user_notifications','user_notifications?select=id&limit=0'],
  ['notifications','gu_commons_notification_prefs_v01420','gu_commons_notification_prefs_v01420?select=user_id&limit=0'],
  ['learning','lab_instruction_v014','lab_instruction_v014?select=lab_id&limit=0'],
  ['learning','lab_training_sets_v014','lab_training_sets_v014?select=lab_id&limit=0'],
  ['commerce','site_subscriptions','site_subscriptions?select=plan_code&limit=0'],
  ['commerce','checkout_intents','checkout_intents?select=intent_id&limit=0'],
  ['owner_controls','admin_control_registry_v01409','admin_control_registry_v01409?select=control_key&limit=0']
]);
const fetchPrivate=async(url,key)=>{
  const r=await fetch(url,{headers:{apikey:key,authorization:'Bearer '+key,accept:'application/json'},cache:'no-store'});
  if(!r.ok)throw Error('Backend contract unavailable.');
  const j=await r.json().catch(()=>null);
  if(!Array.isArray(j))throw Error('Backend contract response invalid.');
  return j;
};
export async function onRequest({request,env}){
  if(request.method!=='GET')return answer({ok:false,error:'Method not allowed.'},405);
  const bearer=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'');
  if(!bearer)return answer({ok:false,error:'Authentication required.'},401);
  const base=String(env.SUPABASE_URL||'').replace(/\/+$/,''),pub=String(env.SUPABASE_PUBLISHABLE_KEY||''),key=String(env.SUPABASE_SECRET_KEY||'');
  if(!/^https:\/\/[^/]+/.test(base)||!pub||!key)return answer({ok:false,error:'Backend configuration unavailable.'},503);
  try{
    const r=await fetch(base+'/auth/v1/user',{headers:{apikey:pub,authorization:'Bearer '+bearer[1]},cache:'no-store'});
    if(!r.ok)return answer({ok:false,error:'Invalid session.'},401);
    const identity=await r.json().catch(()=>({}));
    if(!memberId.test(String(identity.id||'')))return answer({ok:false,error:'Invalid session.'},401);
    const id=encodeURIComponent(identity.id);
    const [profile,flags,roles]=await Promise.all([
      fetchPrivate(base+'/rest/v1/profiles?select=account_kind&id=eq.'+id+'&limit=1',key),
      fetchPrivate(base+'/rest/v1/admin_user_flags?select=status&user_id=eq.'+id+'&limit=1',key),
      fetchPrivate(base+'/rest/v1/admin_user_roles?select=role_code,expires_at&user_id=eq.'+id,key)
    ]);
    const activeOwner=roles.some(row=>row.role_code==='OWNER'&&(!row.expires_at||Date.parse(row.expires_at)>Date.now()));
    const showcase=roles.some(row=>row.role_code==='SHOWCASE_VIEWER'&&(!row.expires_at||Date.parse(row.expires_at)>Date.now()));
    const status=String(flags[0]?.status||'').toLowerCase();
    if(profile[0]?.account_kind!=='member'||['suspended','restricted'].includes(status)||!activeOwner||showcase)
      return answer({ok:false,error:'OWNER authorization required.'},403);
    // Respect the existing Owner-controlled AAL2 staff security rollout.
    if(env.REQUIRE_STAFF_AAL2_V135==='true'){
      try{
        const encoded=bearer[1].split('.')[1];
        const claims=JSON.parse(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')));
        if(claims.aal!=='aal2')return answer({ok:false,error:'Verified staff MFA required.'},403);
      }catch{return answer({ok:false,error:'Verified staff MFA required.'},403)}
    }
    const inspectedAt=new Date().toISOString();
    const checks=await Promise.all(CONTRACTS.map(async([area,name,path])=>{
      try{await fetchPrivate(base+'/rest/v1/'+path,key);return {area,name,reachable:true}}
      catch{return {area,name,reachable:false}}
    }));
    return answer({ok:true,version:'v0.14.0.20',inspectedAt,scope:'read_only_table_contracts',checks,
      note:'Queryable relations do not establish RLS correctness, migrations applied, payments, job delivery, schema compatibility or production acceptance.'});
  }catch{return answer({ok:false,error:'Backend contract inventory unavailable.'},503)}
}
