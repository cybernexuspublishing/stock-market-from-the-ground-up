/* Shared D09 owner authorization for Tutor feedback, audit and gap triage.
 * Supabase JWT is verified at Supabase Auth; owner roles are rechecked per call.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const err=(status,message)=>Object.assign(new Error(message),{status});
export async function ownerTutorAccess(env,request){
 const url=String(env.SUPABASE_URL||'').replace(/\/$/,''),
 pub=String(env.SUPABASE_PUBLISHABLE_KEY||''),secret=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(url)||!pub||!secret)throw err(503,'Owner access unavailable.');
 const token=/^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!token)throw err(401,'Owner sign-in required.');
 const auth=await fetch(url+'/auth/v1/user',{cache:'no-store',headers:{apikey:pub,authorization:'Bearer '+token}});
 if(!auth.ok)throw err(401,'Owner session expired.');
 const user=await auth.json().catch(()=>null);
 if(!UUID.test(user?.id||''))throw err(401,'Owner identity unavailable.');
 const headers={apikey:secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))headers.authorization='Bearer '+secret;
 const identity=encodeURIComponent(user.id);
 const paths=[
  'profiles?select=account_kind&id=eq.'+identity+'&limit=1',
  'admin_user_roles?select=role_code,expires_at&user_id=eq.'+identity+'&limit=30',
  'admin_user_flags?select=status&user_id=eq.'+identity+'&limit=1'
 ];
 const rows=await Promise.all(paths.map(async p=>{
  const r=await fetch(url+'/rest/v1/'+p,{headers,cache:'no-store'});
  if(!r.ok)throw err(503,'Owner access database unavailable.');
  const data=await r.json().catch(()=>null);
  if(!Array.isArray(data))throw err(503,'Owner access database response invalid.');
  return data;
 }));
 const [profile,roles,flags]=rows;
 const active=r=>!r.expires_at||Date.parse(r.expires_at)>Date.now();
 const owner=profile[0]?.account_kind==='member'&&roles.some(r=>r.role_code==='OWNER'&&active(r))&&
  !roles.some(r=>['SHOWCASE_VIEWER','TEST'].includes(r.role_code)&&active(r))&&
  !['suspended','restricted'].includes(String(flags[0]?.status||'').toLowerCase());
 if(!owner)throw err(403,'Owner-only Tutor review.');
 return {url,headers,userId:user.id};
}
export async function ownerTutorDb(ctx,path,init={}){
 const r=await fetch(ctx.url+'/rest/v1/'+path,{cache:'no-store',...init,
  headers:{...ctx.headers,...(init.headers||{})}});
 if(!r.ok)throw err(503,'Owner Tutor database unavailable.');
 const body=await r.json().catch(()=>null);
 return {body,headers:r.headers};
}
