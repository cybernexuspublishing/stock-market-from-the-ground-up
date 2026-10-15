/* v0.14.0.23 — OWNER-ONLY, read-only community delivery telemetry.
 * Aggregates stored records, not proof of user-visible delivery or guaranteed timing.
 * No post bodies, member identities, email addresses, SQL, or credentials in response.
 */
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store, max-age=0',
               'pragma':'no-cache','vary':'Authorization','x-content-type-options':'nosniff'};
const answer=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function readJson(url,key){
 const response=await fetch(url,{headers:{apikey:key,authorization:'Bearer '+key,accept:'application/json'},cache:'no-store'});
 if(!response.ok)throw Error('Private database contract unavailable.');
 const data=await response.json().catch(()=>null);
 if(!Array.isArray(data))throw Error('Invalid database contract.');
 return data;
}
async function counted(base,key,table,select,filters={}){
 const params=new URLSearchParams({select,limit:'1'});
 for(const [field,filter] of Object.entries(filters))params.set(field,filter);
 const response=await fetch(base+'/rest/v1/'+table+'?'+params.toString(),{
  headers:{apikey:key,authorization:'Bearer '+key,accept:'application/json',prefer:'count=exact',range:'0-0'},cache:'no-store'
 });
 if(!response.ok)return {available:false,count:null};
 const range=response.headers.get('content-range')||'',match=/\/(\d+)$/.exec(range);
 if(!match)return {available:false,count:null};
 const count=Number(match[1]);
 return {available:Number.isSafeInteger(count)&&count>=0,count:Number.isSafeInteger(count)&&count>=0?count:null};
}
export async function onRequest({request,env}){
 if(request.method!=='GET')return answer({ok:false,error:'Method not allowed.'},405);
 const jwt=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!jwt)return answer({ok:false,error:'Sign in required.'},401);
 const base=String(env.SUPABASE_URL||'').replace(/\/+$/,''),pub=String(env.SUPABASE_PUBLISHABLE_KEY||''),key=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+/.test(base)||!pub||!key)return answer({ok:false,error:'Community diagnostics unavailable.'},503);
 try{
  const auth=await fetch(base+'/auth/v1/user',{headers:{apikey:pub,authorization:'Bearer '+jwt},cache:'no-store'});
  if(!auth.ok)return answer({ok:false,error:'Invalid session.'},401);
  const identity=await auth.json().catch(()=>({}));
  if(!uuid.test(String(identity.id||'')))return answer({ok:false,error:'Invalid session.'},401);
  const id=encodeURIComponent(identity.id);
  const [profiles,flags,roles]=await Promise.all([
   readJson(base+'/rest/v1/profiles?select=account_kind&id=eq.'+id+'&limit=1',key),
   readJson(base+'/rest/v1/admin_user_flags?select=status&user_id=eq.'+id+'&limit=1',key),
   readJson(base+'/rest/v1/admin_user_roles?select=role_code,expires_at&user_id=eq.'+id,key)
  ]);
  const now=Date.now(),active=roles.filter(r=>!r.expires_at||Date.parse(r.expires_at)>now).map(r=>r.role_code);
  if(profiles[0]?.account_kind!=='member'||['restricted','suspended'].includes(String(flags[0]?.status||'').toLowerCase())||
     !active.includes('OWNER')||active.includes('SHOWCASE_VIEWER'))
    return answer({ok:false,error:'OWNER authorization required.'},403);
  if(String(env.REQUIRE_STAFF_AAL2_V135||'')==='true'){
   try{
     const encoded=jwt.split('.')[1];
     const claims=JSON.parse(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')));
     if(claims.aal!=='aal2')return answer({ok:false,error:'Verified staff MFA required.'},403);
   }catch{return answer({ok:false,error:'Verified staff MFA required.'},403)}
  }
  const specs=[
   ['discussionFollows','commons_topic_subscriptions','user_id',{}],
   ['replyNotificationsRecorded','user_notifications','id',{'notification_type':'eq.forum_reply','metadata->>origin':'eq.v01420'}],
   ['mentionOptIns','gu_commons_mention_prefs_v01423','user_id',{'mentions_enabled':'eq.true'}],
   ['mentionNotificationsRecorded','user_notifications','id',{'notification_type':'eq.forum_mention','metadata->>origin':'eq.v01423'}]
  ];
  const results=await Promise.all(specs.map(async([name,table,select,filters])=>{
   try{return [name,await counted(base,key,table,select,filters)]}
   catch{return [name,{available:false,count:null}]}
  }));
  return answer({ok:true,version:'v0.14.0.23',checkedAt:new Date().toISOString(),
   metrics:Object.fromEntries(results),
   note:'Counts show database records only. Zero recorded alerts and even positive counts do not verify notification delivery, permissions, opt-outs or role-specific browser acceptance. Optional mention tables may not be installed.'});
 }catch{return answer({ok:false,error:'Community diagnostics could not be completed.'},503)}
}
