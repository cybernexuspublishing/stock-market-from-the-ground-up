/* v0.14.0.11: read-only announcements with server-side temporal/audience guards.
 * No raw service-role rows, private audience information, IDs of members or secrets. */
const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const safe=x=>String(x||'').trim();
export async function onRequest({request,env}){
 if(request.method!=='GET')return respond({ok:false,error:'Method not allowed.'},405);
 const base=safe(env.SUPABASE_URL).replace(/\/$/,''),secret=safe(env.SUPABASE_SECRET_KEY),pub=safe(env.SUPABASE_PUBLISHABLE_KEY);
 if(!base||!secret)return respond({ok:false,error:'Service unavailable.'},503);
 try{
  let authenticated=false;
  const jwt=(request.headers.get('authorization')||'').match(/^Bearer\s+(.+)$/i)?.[1];
  if(jwt&&pub){const r=await fetch(base+'/auth/v1/user',{headers:{apikey:pub,authorization:'Bearer '+jwt},cache:'no-store'});
   if(r.ok){const u=await r.json();if(u?.id){const profile=await fetch(base+'/rest/v1/profiles?select=account_kind&id=eq.'+encodeURIComponent(u.id)+'&limit=1',{headers:{apikey:secret,authorization:'Bearer '+secret},cache:'no-store'});
    if(profile.ok){const p=await profile.json();if(p?.[0]?.account_kind==='member'){const flags=await fetch(base+'/rest/v1/admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(u.id)+'&limit=1',{headers:{apikey:secret,authorization:'Bearer '+secret},cache:'no-store'});if(flags.ok){const f=await flags.json();authenticated=!['suspended','restricted'].includes(String(f?.[0]?.status||'').toLowerCase());}}}
   }}
  }
  const r=await fetch(base+'/rest/v1/site_announcements?select=id,title,body,announcement_type,audience,active,starts_at,ends_at,dismissible&active=eq.true&order=updated_at.desc&limit=100',{headers:{apikey:secret,authorization:'Bearer '+secret},cache:'no-store'});
  if(!r.ok)throw Error('Announcements unavailable');const items=await r.json(),now=Date.now();
  const announcements=items.filter(x=>{
   if(x.active!==true)return false;
   if(x.audience!=='all'&&!(authenticated&&x.audience==='members'))return false;
   if(x.starts_at&&Date.parse(x.starts_at)>now)return false;
   if(x.ends_at&&Date.parse(x.ends_at)<=now)return false;
   return true;
  }).slice(0,15).map(x=>({id:x.id,title:x.title,body:x.body,announcement_type:x.announcement_type,dismissible:x.dismissible!==false}));
  return respond({ok:true,announcements});
 }catch{return respond({ok:false,error:'Announcements temporarily unavailable.'},503)}
}
