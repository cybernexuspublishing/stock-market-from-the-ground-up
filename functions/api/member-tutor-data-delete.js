/* D09 member Tutor privacy deletion.
 * Supabase Auth is required, but a paid Tutor entitlement is NOT required.
 * Uses service key only on the server; deletes only verified user rows.
 * Associated private review cases are removed by existing ON DELETE CASCADE.
 */
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const out=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:H});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function onRequest({request,env}){
 try{
  if(request.method!=='DELETE')return out({ok:false,error:'DELETE required.'},405);
  const target=new URL(request.url);
  const origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site');
  if(origin&&origin!==target.origin||site&&!['none','same-origin'].includes(site))
   return out({ok:false,error:'Cross-origin deletion denied.'},403);
  if(request.headers.get('x-confirm-delete')!=='DELETE_MY_TUTOR_HISTORY')
   return out({ok:false,error:'Explicit confirmation required.'},400);
  const token=/^Bearer\s+(.+)$/i.exec(request.headers.get('authorization')||'')?.[1];
  if(!token)return out({ok:false,error:'Sign in to delete your own private Tutor history.'},401);
  const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
  const pub=String(env.SUPABASE_PUBLISHABLE_KEY||''),secret=String(env.SUPABASE_SECRET_KEY||'');
  if(!/^https:\/\/[^/]+$/.test(base)||!pub||!secret)throw Error('storage not configured');
  const verified=await fetch(base+'/auth/v1/user',{
   cache:'no-store',headers:{apikey:pub,authorization:'Bearer '+token}});
  if(!verified.ok)return out({ok:false,error:'Your session is no longer valid.'},401);
  const identity=await verified.json().catch(()=>null);
  if(!UUID.test(identity?.id||''))return out({ok:false,error:'Member identity unavailable.'},401);
  const headers={apikey:secret,accept:'application/json'};
  if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))
   headers.authorization='Bearer '+secret;
  const reply=await fetch(base+'/rest/v1/rpc/gu_v014149_delete_tutor_member_data',{
   method:'POST',cache:'no-store',headers:{...headers,'content-type':'application/json'},
   body:JSON.stringify({p_user:identity.id})});
  if(!reply.ok)throw Error('delete transaction failed');
  const result=await reply.json().catch(()=>null);
  if(!Number.isSafeInteger(result?.exchanges_deleted)||result.exchanges_deleted<0||
     !Number.isSafeInteger(result?.conversations_deleted)||result.conversations_deleted<0)
   throw Error('delete transaction cannot be confirmed');
  return out({ok:true,deletedCount:result.exchanges_deleted,
   deletedConversationCount:result.conversations_deleted,
   notice:'Your saved Tutor exchanges and conversation names were removed by a single verified transaction. Official Lab evidence and Journal records were not changed.'});
 }catch{return out({ok:false,error:'Private Tutor history could not be deleted. No deletion is claimed.'},503)}
}
