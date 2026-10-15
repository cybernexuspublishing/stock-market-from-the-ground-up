/* v0.14.0.24 — member-JWT-bound, transactional moderation case API.
 * SQL functions, not this client, authorize OWNER/MODERATOR permissions.
 * No service-role credential, caller-supplied user_id, or mutation without audit.
 */
const H={
 'content-type':'application/json; charset=utf-8',
 'cache-control':'private, no-store, max-age=0',
 'vary':'Authorization','x-content-type-options':'nosniff'
};
const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
const allowedStatuses=new Set(['open','reviewing','resolved','dismissed','all']);
const allowedActions=new Set(['start_review','resolve','dismiss','reopen']);
const expectedStatuses=new Set(['open','reviewing','resolved','dismissed']);
function failure(response,body){
 const code=String(body?.message||body?.code||'');
 if(response.status===401)return send({ok:false,error:'Sign in to review reports.'},401);
 if(response.status===403||code.includes('MODERATION_FORBIDDEN'))
  return send({ok:false,error:'Moderation permission required.'},403);
 if(code.includes('MODERATION_STALE'))
  return send({ok:false,error:'Another moderator changed this report. Refresh before trying again.',code:'STALE'},409);
 if(code.includes('MODERATION_NOT_FOUND'))
  return send({ok:false,error:'Report not found.'},404);
 if(code.includes('MODERATION_INVALID'))
  return send({ok:false,error:'Invalid moderation request or state transition.'},400);
 return send({ok:false,error:'Moderation database contract unavailable. Verify the reviewed migration.'},503);
}
async function onRequest({request,env}){
 if(!['GET','POST'].includes(request.method))
  return send({ok:false,error:'Method not allowed.'},405);
 const token=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!token)return send({ok:false,error:'Sign in to review reports.'},401);
 const base=String(env.SUPABASE_URL||'').replace(/\/+$/,''),pub=String(env.SUPABASE_PUBLISHABLE_KEY||'');
 if(!/^https:\/\/[^/]+/.test(base)||!pub)return send({ok:false,error:'Moderation service unavailable.'},503);
 const u=new URL(request.url);
 let rpc,payload;
 if(request.method==='GET'){
  const status=u.searchParams.get('status')||'open',page=Number(u.searchParams.get('page')||1);
  if(!allowedStatuses.has(status)||!Number.isSafeInteger(page)||page<1||page>100)
   return send({ok:false,error:'Invalid moderation list filter.'},400);
  rpc='gu_mod_case_list_v01424';payload={p_status:status,p_page:page};
 }else{
  if(Number(request.headers.get('content-length')||0)>1600)
   return send({ok:false,error:'Moderation request too large.'},413);
  const body=await request.json().catch(()=>null);
  if(!body||Array.isArray(body)||typeof body!=='object'||
     Object.keys(body).sort().join(',')!=='action,expectedStatus,note,reportId'||
     !Number.isSafeInteger(body.reportId)||body.reportId<1||
     !allowedActions.has(body.action)||!expectedStatuses.has(body.expectedStatus)||
     typeof body.note!=='string'||body.note.trim().length<10||body.note.trim().length>500)
   return send({ok:false,error:'Valid report, expected state, action and 10–500 character reason required.'},400);
  rpc='gu_mod_case_transition_v01424';payload={p_report_id:body.reportId,
    p_expected_status:body.expectedStatus,p_action:body.action,p_note:body.note.trim()};
 }
 const headers={apikey:pub,authorization:'Bearer '+token,accept:'application/json','content-type':'application/json'};
 try{
  // JWT verified by Supabase Auth; database RPC independently verifies status and roles.
  const identity=await fetch(base+'/auth/v1/user',{headers,cache:'no-store'});
  if(!identity.ok)return send({ok:false,error:'Session expired.'},401);
  const account=await identity.json().catch(()=>null);
  if(!account?.id)return send({ok:false,error:'Session expired.'},401);
  const response=await fetch(base+'/rest/v1/rpc/'+rpc,{
   method:'POST',headers,body:JSON.stringify(payload),cache:'no-store'
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok)return failure(response,result);
  if(!result||result.ok!==true||
     (rpc==='gu_mod_case_list_v01424'&&!Array.isArray(result.cases)))
   return send({ok:false,error:'Unexpected moderation backend response.'},503);
  if(rpc==='gu_mod_case_list_v01424'){
   // Limit public API payload even if a corrupted SQL response is oversized.
   return send({ok:true,page:result.page,status:result.status,hasMore:result.hasMore===true,
    isOwner:result.isOwner===true,cases:result.cases.slice(0,25)});
  }
  return send({ok:true,id:result.id,status:result.status,
   previousStatus:result.previousStatus,audited:result.audited===true});
 }catch{return send({ok:false,error:'Moderation service temporarily unavailable.'},503)}
}
export const onRequestGet=onRequest;
export const onRequestPost=onRequest;
