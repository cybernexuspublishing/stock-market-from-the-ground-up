/* v0.14.0.25 — Authorized per-report decision history; no direct table grants.
 * Uses the caller's JWT and an OWNER/MODERATOR-gated SQL RPC.
 * Only narrowly selected action/transition/note/timestamp fields are returned.
 */
const H={'content-type':'application/json; charset=utf-8',
 'cache-control':'private, no-store, max-age=0','vary':'Authorization','x-content-type-options':'nosniff'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
export async function onRequestGet({request,env}){
 const token=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!token)return reply({ok:false,error:'Sign in to inspect report history.'},401);
 const path=new URL(request.url).searchParams;
 const id=Number(path.get('reportId'));
 if(!/^\d{1,18}$/.test(path.get('reportId')||'')||!Number.isSafeInteger(id)||id<1)
  return reply({ok:false,error:'A valid report ID is required.'},400);
 const base=String(env.SUPABASE_URL||'').replace(/\/+$/,''),pub=String(env.SUPABASE_PUBLISHABLE_KEY||'');
 if(!/^https:\/\/[^/]+/.test(base)||!pub)return reply({ok:false,error:'Audit service unavailable.'},503);
 const headers={apikey:pub,authorization:'Bearer '+token,accept:'application/json','content-type':'application/json'};
 try{
  const identity=await fetch(base+'/auth/v1/user',{headers,cache:'no-store'});
  if(!identity.ok)return reply({ok:false,error:'Session expired.'},401);
  const user=await identity.json().catch(()=>({}));
  if(!user?.id)return reply({ok:false,error:'Session expired.'},401);
  const db=await fetch(base+'/rest/v1/rpc/gu_mod_case_history_v01425',{
   method:'POST',headers,cache:'no-store',body:JSON.stringify({p_report_id:id})});
  const result=await db.json().catch(()=>({}));
  if(!db.ok){
   const code=String(result?.message||'');
   if(db.status===403||code.includes('MODERATION_FORBIDDEN'))
    return reply({ok:false,error:'Authorized staff role required.'},403);
   if(code.includes('MODERATION_NOT_FOUND'))return reply({ok:false,error:'Report not found.'},404);
   return reply({ok:false,error:'Audit-history database function unavailable.'},503);
  }
  if(result?.ok!==true||!Array.isArray(result.history))
   return reply({ok:false,error:'Invalid audit history response.'},503);
  const history=result.history.slice(0,50).map(x=>({
   action:String(x?.action||'').slice(0,80),
   from:String(x?.from||'').slice(0,30),to:String(x?.to||'').slice(0,30),
   note:String(x?.note||'').slice(0,500),loggedAt:x?.loggedAt||null
  }));
  return reply({ok:true,reportId:id,history,coverage:'v01424_transactional_cases_only'});
 }catch{return reply({ok:false,error:'Audit-history service temporarily unavailable.'},503)}
}
export const onRequest=onRequestGet;
