/* v0.14.0.19: privacy-constrained autocomplete for already-visible community contributors.
 * No staff directory, email, profile search, service-role credential, or private member list.
 * Supabase RLS controls which published threads and posts the requester can see.
 */
const headers={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff','vary':'Authorization'};
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const valid=/^[A-Za-z0-9_.-]{3,40}$/;
export async function onRequestGet({request,env}){
  const p=new URL(request.url).searchParams;
  const query=(p.get('q')||'').trim();
  if(!valid.test(query))return response({ok:false,error:'Enter 3–40 username characters.'},400);
  const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),publicKey=String(env.SUPABASE_PUBLISHABLE_KEY||'');
  if(!/^https:\/\//.test(base)||!publicKey)return response({ok:false,error:'Member lookup unavailable.'},503);
  const token=/^Bearer\s+(.+)$/i.exec(request.headers.get('authorization')||'')?.[1];
  if(!token)return response({ok:false,error:'Sign in to find forum contributors.'},401);
  const h={apikey:publicKey,authorization:'Bearer '+token,accept:'application/json'};
  try{
    const user=await fetch(base+'/auth/v1/user',{headers:h,cache:'no-store'});
    if(!user.ok)return response({ok:false,error:'Session expired.'},401);
    const who=await user.json();if(!who?.id)return response({ok:false,error:'Session expired.'},401);
    // Only enumerate authors whom this exact JWT can already see through forum RLS.
    // Do not enumerate the global profiles table or search emails.
    const paths=[
      '/rest/v1/commons_topics?select=profiles:author_user_id(username)&status=eq.published&order=created_at.desc&limit=150',
      '/rest/v1/commons_posts?select=profiles:author_user_id(username)&status=eq.published&order=created_at.desc&limit=150'
    ];
    const results=await Promise.all(paths.map(path=>fetch(base+path,{headers:h,cache:'no-store'})));
    if(results.some(r=>!r.ok))return response({ok:false,error:'Visible contributor lookup is unavailable.'},503);
    const users=new Set(),needle=query.toLowerCase();
    for(const list of await Promise.all(results.map(r=>r.json()))){
      for(const row of (Array.isArray(list)?list:[])){
        const name=typeof row.profiles==='object'&&row.profiles!==null?String(row.profiles.username||''):'';
        if(valid.test(name)&&name.toLowerCase().startsWith(needle))users.add(name);
      }
    }
    return response({ok:true,matches:[...users].sort((a,b)=>a.localeCompare(b)).slice(0,8),source:'visible_contributors',notificationDelivery:false});
  }catch{return response({ok:false,error:'Member lookup temporarily unavailable.'},503)}
}
