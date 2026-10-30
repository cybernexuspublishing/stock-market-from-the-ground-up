/* Crownlight Watchlist V3 — authenticated, idempotent research-plan -> Journal draft.
 * Never accepts a client-computed journal body, paid status, user ID, or quota.
 * The Supabase RPC owns the entire transaction and invokes the existing
 * enforce_free_journal_limits trigger; existing source evidence is append-only.
 */
import {advancedToolContext,serviceHeaders} from '../_lib/advanced-tool-access-v014110.js';
const output=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'private,no-store',
 'x-content-type-options':'nosniff'}});
const error=(message,status=400)=>Object.assign(new Error(message),{status});
const id=x=>/^[1-9][0-9]{0,15}$/.test(String(x||''))&&Number.isSafeInteger(Number(x));
export async function onRequest({request,env}){
 try{
  if(request.method!=='POST')return output({ok:false,error:'METHOD_NOT_ALLOWED'},405);
  const url=new URL(request.url);
  if(request.headers.get('origin')!==url.origin)throw error('Cross-site Journal creation denied.',403);
  if(Number(request.headers.get('content-length')||0)>512)throw error('Payload too large.',413);
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>512)throw error('Payload too large.',413);
  let body;try{body=JSON.parse(raw)}catch{throw error('Invalid JSON.',400)}
  if(!body||typeof body!=='object'||Array.isArray(body)||
     Object.keys(body).length!==1||!id(body.planId))
   throw error('Only an existing saved plan ID is accepted.',400);
  const auth=await advancedToolContext(env,request,'WATCHLIST_WORKBENCH');
  if(!auth.allowed||auth.accessLevel!=='entitled')
   throw error('Current premium Watchlist access required.',403);
  let resp;
  try{
   resp=await fetch(auth.c.base+'/rest/v1/rpc/gu_watchlist_to_journal_v3',{
    method:'POST',cache:'no-store',headers:{
     ...serviceHeaders(auth.c.secret,true),'accept':'application/json'},
    body:JSON.stringify({p_user:auth.userId,p_plan:Number(body.planId)})
   });
  }catch{throw error('Private Journal transaction unavailable.',503)}
  const result=await resp.json().catch(()=>null);
  if(!resp.ok){
   const diagnostic=String(result?.message||'').slice(0,240);
   if(/journal.*(limit|quota|allowance|slot|cap)|free.*weekly/i.test(diagnostic))
    throw error('Your existing weekly Journal record allowance has been reached. No draft or research link was saved.',409);
   throw error('Private Journal transaction unavailable.',503);
  }
  if(result?.ok!==true||!id(result?.journalId))
   throw error(result?.error==='PRIVATE_PLAN_NOT_FOUND'?
    'This saved plan is unavailable or does not belong to the current member.':
    result?.error==='SOURCE_AFTER_OBSERVATION'?
     'Saved plan source publication is later than the recorded observation.':
    'This saved plan cannot be automatically saved as a Journal draft.',409);
  return output({ok:true,journalId:result.journalId,alreadyExists:result.alreadyExists===true,
   quotaDebitedAgain:false,source:'MEMBER_REPORTED_NOT_VERIFIED',
   status:result.status||'draft',journalType:result.journalType||'observation',
   hasTradeExecution:false,allowance:'EXISTING_JOURNAL_TRIGGER',
   next:'Review the private Journal draft and decide whether to save or lock the plan.'});
 }catch(e){return output({ok:false,error:e?.status===503?'Private Journal transfer is temporarily unavailable.':e.message},
  [400,401,403,405,409,413].includes(e?.status)?e.status:503)}
}
