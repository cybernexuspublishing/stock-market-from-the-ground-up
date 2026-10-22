/* D09 audited Owner Tutor report triage, metadata only. No raw prompts.
 * Both status updates and retrieval require production OWNER re-authorization.
 */
import {ownerTutorAccess,ownerTutorDb} from '../_lib/owner-tutor-access-v014149.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',
 'vary':'Authorization','x-content-type-options':'nosniff','x-robots-tag':'noindex'};
const out=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:H});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES=new Set(['open','investigating','resolved','dismissed']);
const RESOLUTIONS=new Set(['source_corrected','instruction_clarified','not_reproducible','out_of_scope']);
const error=(message,status=400)=>Object.assign(new Error(message),{status});
export async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))return out({ok:false,error:'GET or POST required.'},405);
  const target=new URL(request.url);
  if(request.method==='POST'){
   const origin=request.headers.get('origin'),site=request.headers.get('sec-fetch-site');
   if(origin&&origin!==target.origin||site&&!['none','same-origin'].includes(site))
    return out({ok:false,error:'Cross-site mutation refused.'},403);
   if(!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get('content-type')||''))
    return out({ok:false,error:'JSON required.'},415);
  }
  const ctx=await ownerTutorAccess(env,request);
  if(request.method==='GET'){
   const ids=String(target.searchParams.get('ids')||'').split(',').filter(Boolean);
   if(ids.length<1||ids.length>30||ids.some(id=>!UUID.test(id)))
    return out({ok:false,error:'Provide 1 to 30 report identifiers.'},400);
   const path='gu_tutor_editorial_cases_v014149?select=exchange_id,status,resolution,updated_at'+
    '&exchange_id=in.('+ids.join(',')+')&limit=30';
   const r=await ownerTutorDb(ctx,path);
   if(!Array.isArray(r.body))throw error('Malformed editorial cases.',503);
   return out({ok:true,cases:r.body.map(x=>({
    reportId:String(x.exchange_id),status:String(x.status),resolution:x.resolution||null,
    updatedAt:x.updated_at||null
   }))});
  }
  const raw=await request.text();
  if(new TextEncoder().encode(raw).length>1200)return out({ok:false,error:'Review request too large.'},413);
  let body;try{body=JSON.parse(raw)}catch{return out({ok:false,error:'Invalid JSON.'},400)}
  const reportId=body?.reportId,status=body?.status,resolution=body?.resolution??null;
  if(!UUID.test(reportId)||!STATUSES.has(status)||
    (['resolved','dismissed'].includes(status)?!RESOLUTIONS.has(resolution):resolution!==null))
   return out({ok:false,error:'Invalid review action.'},400);
  const r=await ownerTutorDb(ctx,'rpc/gu_v014149_review_tutor_case',{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify({p_actor:ctx.userId,p_exchange:reportId,p_status:status,p_resolution:resolution})
  });
  if(!r.body||r.body.ok!==true)return out({ok:false,error:'Reported exchange not found or feedback no longer reported.'},404);
  return out({ok:true,caseId:r.body.case_id,status,unchanged:r.body.unchanged===true,
   notice:'Audited Owner editorial decision. A case status is not itself proof of answer accuracy.'});
 }catch(e){let s=[400,401,403,405,413,415].includes(e?.status)?e.status:503;
  return out({ok:false,error:s===503?'Owner editorial review is not installed or is unavailable.':e.message},s)}
}
