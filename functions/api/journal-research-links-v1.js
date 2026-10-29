/* Source-linked journal research — server verifies both sides belong to the
 * signed-in member. Links are immutable and record observation chronology,
 * never a third-party verification or broker execution.
 */
import {advancedToolContext,privateJson,safeAdvancedConfig} from '../_lib/advanced-tool-access-v014110.js';
import {memberIdentity} from './member-tool-access.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const out=(v,code=200)=>new Response(JSON.stringify(v),{status:code,headers:H});
const err=(msg,status=400)=>Object.assign(new Error(msg),{status});
const id=x=>/^[1-9][0-9]{0,15}$/.test(String(x||''))&&Number.isSafeInteger(Number(x));
async function member(env,request){
 const actor=await memberIdentity(env,request);
 const c=safeAdvancedConfig(env);
 const u=encodeURIComponent(actor.userId);
 const [p,f]=await Promise.all([
  privateJson(c,'profiles?select=account_kind,deleted_at&id=eq.'+u+'&limit=1'),
  privateJson(c,'admin_user_flags?select=status&user_id=eq.'+u+'&limit=20')]);
 if(p?.[0]?.account_kind!=='member'||p[0]?.deleted_at!=null||
  f?.some(x=>['suspended','restricted'].includes(String(x?.status||'').toLowerCase())))
  throw err('Member account unavailable.',403);
 return {c,userId:actor.userId};
}
export async function onRequest({request,env}){
 try{
  if(!['GET','POST'].includes(request.method))return out({ok:false,error:'METHOD_NOT_ALLOWED'},405);
  const url=new URL(request.url);
  if(request.method==='GET'){
   const journalId=url.searchParams.get('journalId');
   if(!id(journalId))throw err('Journal ID required.');
   const actor=await member(env,request);
   const u=encodeURIComponent(actor.userId);
   const rows=await privateJson(actor.c,'decision_journal?select=id&id=eq.'+journalId+
     '&user_id=eq.'+u+'&limit=1');
   if(rows?.length!==1)throw err('Private Journal record unavailable.',404);
   const links=await privateJson(actor.c,'gu_journal_research_links_v1?select=id,workbench_record_id,source_observed_at,source_published_at,original_saved_at,source_label,linked_at'+
    '&journal_id=eq.'+journalId+'&user_id=eq.'+u+'&order=linked_at.asc&limit=100');
   return out({ok:true,links:links||[],source:'MEMBER_REPORTED_NOT_INDEPENDENTLY_VERIFIED'});
  }
  if(request.headers.get('origin')!==url.origin)throw err('Origin mismatch.',403);
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>1000)throw err('Payload too large.',413);
  let body;try{body=JSON.parse(raw)}catch{throw err('Invalid JSON.')}
  if(!id(body?.journalId)||!id(body?.planId))throw err('Valid saved plan and Journal record required.');
  const actor=await advancedToolContext(env,request,'WATCHLIST_WORKBENCH');
  if(actor.accessLevel!=='entitled')throw err('Current Workbench entitlement required.',403);
  const u=encodeURIComponent(actor.userId);
  const [jr,plans]=await Promise.all([
   privateJson(actor.c,'decision_journal?select=id,ticker,status,plan_locked_at,thesis'+
     '&id=eq.'+body.journalId+'&user_id=eq.'+u+'&limit=1'),
   privateJson(actor.c,'tool_workspace_records?select=id,payload,created_at'+
     '&id=eq.'+body.planId+'&user_id=eq.'+u+
     '&tool_code=eq.WATCHLIST_WORKBENCH&record_type=eq.scenario_review&limit=1')
  ]);
  const row=jr?.[0],plan=plans?.[0],data=plan?.payload?.data;
  if(!row||!plan||plan.payload?.kind!=='ADVANCED_TRADE_PLAN_SNAPSHOT_V1'||
   !data||row.ticker!==String(data.symbol||'').toUpperCase())
   throw err('The saved plan does not belong to this Journal ticker.',409);
  if(!['draft','planned'].includes(row.status)||
   (row.plan_locked_at && Date.parse(plan.created_at)>Date.parse(row.plan_locked_at)))
   throw err('Research must precede the locked plan and its outcome.',409);
  const asOf=Date.parse(data.asOf||''),published=data.sourceAt?Date.parse(data.sourceAt):null;
  if(!Number.isFinite(asOf)||asOf>Date.now()+300000||
   (data.sourceAt&&(!Number.isFinite(published)||published>asOf)))
   throw err('Research chronology could not be verified.',409);
  const record={user_id:actor.userId,journal_id:Number(body.journalId),
   workbench_record_id:Number(body.planId),source_observed_at:new Date(asOf).toISOString(),
   source_published_at:published==null?null:new Date(published).toISOString(),
   original_saved_at:plan.created_at,source_label:'MEMBER_REPORTED_NOT_INDEPENDENTLY_VERIFIED'};
  const saved=await privateJson(actor.c,'gu_journal_research_links_v1?on_conflict=user_id,journal_id,workbench_record_id',
   'POST',record,'resolution=ignore-duplicates,return=representation');
  return out({ok:true,linked:true,alreadyLinked:!Array.isArray(saved)||saved.length===0,
   planId:Number(body.planId),journalId:Number(body.journalId),source:'MEMBER_REPORTED'});
 }catch(e){const status=[400,401,403,404,405,409,413].includes(e?.status)?e.status:503;
  return out({ok:false,error:status===503?'Private research linking unavailable.':e.message},status)}
}
