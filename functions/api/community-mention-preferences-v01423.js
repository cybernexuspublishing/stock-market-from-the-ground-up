/* v0.14.0.23 — member-owned, explicitly opt-in Market Commons mention alerts.
 * Uses the caller's Supabase JWT for both functions; no service-role key, no target user ID.
 * No email, external push, payments, or implicit subscriber changes.
 */
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store, max-age=0',
              'vary':'Authorization','x-content-type-options':'nosniff'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:HEADERS});
export async function onRequest({request,env}){
  if(!['GET','POST'].includes(request.method))return reply({ok:false,error:'Method not allowed.'},405);
  const token=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'')?.[1];
  if(!token)return reply({ok:false,error:'Sign in to manage mentions.'},401);
  const base=String(env.SUPABASE_URL||'').replace(/\/+$/,''),pub=String(env.SUPABASE_PUBLISHABLE_KEY||'');
  if(!/^https:\/\/[^/]+/.test(base)||!pub)return reply({ok:false,error:'Mention preferences unavailable.'},503);
  let next;
  if(request.method==='POST'){
    if(Number(request.headers.get('content-length')||0)>1024)return reply({ok:false,error:'Request too large.'},413);
    const b=await request.json().catch(()=>null);
    if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).length!==1||typeof b.mentionsEnabled!=='boolean')
      return reply({ok:false,error:'Expected one boolean: mentionsEnabled.'},400);
    next=b.mentionsEnabled;
  }
  const h={apikey:pub,authorization:'Bearer '+token,accept:'application/json','content-type':'application/json'};
  try{
    const auth=await fetch(base+'/auth/v1/user',{headers:h,cache:'no-store'});
    if(!auth.ok)return reply({ok:false,error:'Session expired.'},401);
    const user=await auth.json().catch(()=>({}));
    if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(user.id||'')))return reply({ok:false,error:'Invalid session.'},401);
    const method=request.method==='GET'?'gu_commons_mention_pref_get_v01423':'gu_commons_mention_pref_save_v01423';
    const raw=await fetch(base+'/rest/v1/rpc/'+method,{method:'POST',headers:h,
      body:JSON.stringify(request.method==='GET'?{}:{p_mentions_enabled:next}),cache:'no-store'});
    if(!raw.ok){
      if(raw.status===401||raw.status===403)return reply({ok:false,error:'Member permission denied.'},403);
      return reply({ok:false,error:'Mention preference database function unavailable. No setting has been confirmed.'},503);
    }
    const data=await raw.json().catch(()=>null);
    if(!data||typeof data.mentions_enabled!=='boolean')return reply({ok:false,error:'Invalid database preference response.'},503);
    return reply({ok:true,preferences:{mentionsEnabled:data.mentions_enabled},updatedAt:data.updated_at||null});
  }catch{return reply({ok:false,error:'Mention preference connection unavailable.'},503)}
}
