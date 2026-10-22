/* D09 Owner Tutor feedback inbox: production role verification is shared
 * with case review and topic gap endpoints. Never expose member identities,
 * full questions, model text, private grading rubrics or credentials.
 */
import {ownerTutorAccess,ownerTutorDb} from '../_lib/owner-tutor-access-v014149.js';
const H={'content-type':'application/json; charset=utf-8',
 'cache-control':'private, no-store, max-age=0','vary':'Authorization',
 'x-content-type-options':'nosniff','x-robots-tag':'noindex'};
const out=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:H});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function onRequest({request,env}){
 try{
  if(request.method!=='GET')return out({ok:false,error:'Read-only GET required.'},405);
  const ctx=await ownerTutorAccess(env,request);
  const page=Number(new URL(request.url).searchParams.get('page')||1);
  if(!Number.isSafeInteger(page)||page<1||page>100)
   return out({ok:false,error:'Invalid feedback page.'},400);
  const limit=30;
  const r=await ownerTutorDb(ctx,
   'gu_member_tutor_exchanges_v014102?select=id,feedback,feedback_note,feedback_at,generation,source_titles,created_at'+
   '&feedback=eq.report&order=feedback_at.desc,id.desc&limit='+limit+'&offset='+((page-1)*limit),
   {headers:{prefer:'count=exact'}});
  if(!Array.isArray(r.body))throw Error('Unrecognized reports');
  const match=/\/(\d+)$/.exec(r.headers.get('content-range')||'');
  if(!match)throw Error('Missing exact report count');
  const total=Number(match[1]);
  if(!Number.isSafeInteger(total)||r.body.length>limit)throw Error('Invalid report list');
  return out({ok:true,page,pageSize:limit,total,
   reports:r.body.map(row=>({
    id:UUID.test(row.id)?row.id:null,
    feedback:'report',
    note:typeof row.feedback_note==='string'?row.feedback_note.slice(0,500):'',
    createdAt:row.created_at||null,reportedAt:row.feedback_at||null,
    generation:String(row.generation||'unknown').slice(0,60),
    sourceTitles:Array.isArray(row.source_titles)?row.source_titles.slice(0,3)
     .map(t=>String(t).slice(0,120)):[]
   })),
   status:'UNVERIFIED_MEMBER_FEEDBACK',
   notice:'Owner-only reported Tutor responses; editorial outcomes require recorded audit events.'});
 }catch(e){
  const code=[400,401,403,405].includes(e?.status)?e.status:503;
  return out({ok:false,error:code===503?'Owner Tutor feedback review temporarily unavailable.':
   e.message||'Feedback review denied.'},code);
 }
}
