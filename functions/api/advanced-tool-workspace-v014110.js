import {safeToolMetric,statusReason} from '../_lib/tool-telemetry-v014111.js';
/* First-party beta workspace API v0.14.0.110.
 * Server performs current entitlement for READ/WRITE/DELETE and scopes every
 * row to the authenticated Supabase user, never to a browser-provided user_id.
 * No raw provider credentials, unpublished assessment rubrics, market-feed keys,
 * automatic trading orders or trading recommendation engine.
 */
import {advancedToolContext,privateJson} from '../_lib/advanced-tool-access-v014110.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const out=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:H});
const types=new Set(['filter_set','watchlist','catalyst','scenario_review']);
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const safeId=x=>/^[1-9][0-9]{0,15}$/.test(String(x||''))&&Number.isSafeInteger(Number(x));

const PLAN_KIND='ADVANCED_TRADE_PLAN_SNAPSHOT_V1';
const dated=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;
function validatePlanSnapshot(body,tool){
 if(body.recordType!=='scenario_review'||body.payload?.kind!==PLAN_KIND)return;
 if(tool!=='WATCHLIST_WORKBENCH')throw fail('Trade plans require the authorized Watchlist Workbench.');
 const d=body.payload.data;
 if(!d||typeof d!=='object'||Array.isArray(d)||
  !/^[A-Za-z][A-Za-z0-9.-]{0,11}$/.test(String(d.symbol||''))||
  !['LONG','SHORT'].includes(d.direction)||
  !['PLAN','WATCH','REJECT','NO TRADE'].includes(d.decision))
  throw fail('Invalid trade-plan identity, direction or decision.');
 if(!['pattern','thesis','trigger','invalidation','source'].every(k=>
   typeof d[k]==='string'&&d[k].trim().length>0))
  throw fail('A plan requires its original source, thesis, pattern, entry condition and invalidation.');
 if(!dated.test(String(d.asOf||''))||!Number.isFinite(Date.parse(d.asOf))||
   Date.parse(d.asOf)>Date.now()+300000)
  throw fail('Trade-plan observation time must be a nonfuture ISO date with timezone.');
 if(d.sourceAt){
  if(!dated.test(d.sourceAt)||!Number.isFinite(Date.parse(d.sourceAt))||
    Date.parse(d.sourceAt)>Date.parse(d.asOf))
   throw fail('Source publication time must be known no later than the observation.');
 }
 if(d.sourceUrl){
  let original;try{original=new URL(d.sourceUrl)}catch{throw fail('Invalid primary-source URL.')}
  if(original.protocol!=='https:'||original.username||original.password||
   original.port||!original.hostname.includes('.')||original.href.length>500)
   throw fail('Primary-source URL must be HTTPS without embedded credentials.');
 }
 const entry=Number(d.entry),stop=Number(d.stop),budget=Number(d.budget);
 if(![entry,stop,budget].every(x=>Number.isFinite(x)&&x>0)||
    (d.direction==='LONG'?stop>=entry:stop<=entry))
  throw fail('Trade-plan prices and risk budget are invalid for the declared direction.');
 for(const name of ['spread','slippage','gap']){
  if(d[name]!==''&&d[name]!=null&&(!Number.isFinite(Number(d[name]))||Number(d[name])<0))
   throw fail('Execution stress inputs must be nonnegative.');
 }
 for(const name of ['target1','target2','stretch']){
  if(d[name]===''||d[name]==null)continue;
  const target=Number(d[name]);
  if(!Number.isFinite(target)||target<=0||
    (d.direction==='LONG'?target<=entry:target>=entry))
   throw fail('A trade-plan target is not on the reward side.');
 }
}

export async function onRequest({request,env}){
 try{
  if(!['GET','POST','PATCH','DELETE'].includes(request.method))return out({ok:false,error:'Method not allowed.'},405);
  const url=new URL(request.url),code=url.searchParams.get('tool')||'';
  if(request.method!=='GET'){
   const origin=request.headers.get('origin');
   if(origin&&origin!==url.origin)throw fail('Cross-origin workspace changes denied.',403);
  }
  const auth=await advancedToolContext(env,request,code);
  if(!auth.allowed||auth.accessLevel!=='entitled')return out({ok:false,error:'Saved premium tool workspace requires a currently valid tool entitlement; an ungraded Free preview does not provide storage access.'},403);
  const base='tool_workspace_records',identity='user_id=eq.'+encodeURIComponent(auth.userId)+
   '&tool_code=eq.'+encodeURIComponent(code);
  if(request.method==='GET'){
   const type=url.searchParams.get('type')||'';
   if(type&&!types.has(type))throw fail('Unknown workspace record type.');
   const offset=Number(url.searchParams.get('offset')||0);
   if(!Number.isSafeInteger(offset)||offset<0||offset>10000)throw fail('Invalid page offset.');
   const query=base+'?select=id,tool_code,record_type,title,payload,created_at,updated_at&'+identity+
    (type?'&record_type=eq.'+encodeURIComponent(type):'')+'&order=updated_at.desc,id.desc&limit=100&offset='+offset;
   const rows=await privateJson(auth.c,query);
   if(!Array.isArray(rows)||rows.length>100)throw fail('Private workspace results are unavailable.',503);
   safeToolMetric('beta_workspace','listed');
   return out({ok:true,records:rows,limit:100,offset,hasMore:rows.length===100,tool:code});
  }
  if(request.method==='DELETE'){
   const id=url.searchParams.get('id')||'',all=url.searchParams.get('all')==='true';
   if(all&&request.headers.get('x-confirm-delete')!=='DELETE_MY_TOOL_WORKSPACE')
    throw fail('Explicit deletion confirmation required.');
   if(!all&&!safeId(id))throw fail('Valid record ID required.');
   await privateJson(auth.c,base+'?'+(all?'':'id=eq.'+id+'&')+identity,
    'DELETE',undefined,'return=minimal');
   safeToolMetric('beta_workspace','deleted');
   return out({ok:true,deleted:true,tool:code,all});
  }
  const indicated=Number(request.headers.get('content-length')||0);
  if(!Number.isFinite(indicated)||indicated>16000)throw fail('Workspace payload too large.',413);
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>16000)throw fail('Workspace payload too large.',413);
  let body;try{body=JSON.parse(raw)}catch{throw fail('Invalid workspace JSON.')}
  if(!body||typeof body!=='object'||Array.isArray(body))throw fail('Invalid workspace data.');
  const type=String(body.recordType||''),title=String(body.title||'').trim();
  if(!types.has(type)||title.length<1||title.length>180||!body.payload||
   typeof body.payload!=='object'||Array.isArray(body.payload)||
   JSON.stringify(body.payload).length>12000)throw fail('Invalid workspace record.');
  validatePlanSnapshot(body,code);
  if(request.method==='PATCH'){
   // Update ONLY an existing, authenticated member-owned watchlist record.
   // An exact timestamp lease prevents concurrent-tab overwrite.
   const id=url.searchParams.get('id')||'';
   const expected=body.expectedUpdatedAt;
   if(type!=='watchlist'||!safeId(id)||
      typeof expected!=='string'||expected.length>60||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(expected)||
      !Number.isFinite(Date.parse(expected)))
    throw fail('Valid existing watchlist ID and revision required.');
   const query=base+'?id=eq.'+id+'&'+identity+
     '&record_type=eq.watchlist&updated_at=eq.'+encodeURIComponent(expected);
   const modified=await privateJson(auth.c,query,'PATCH',{
     title,payload:body.payload,updated_at:new Date().toISOString()
   },'return=representation');
   if(!Array.isArray(modified)||modified.length>1)
    throw fail('Watchlist update integrity unavailable.',503);
   if(modified.length===0)throw fail('Watchlist entry changed or no longer belongs to this member. Refresh before editing.',409);
   safeToolMetric('beta_workspace','updated');
   return out({ok:true,id:modified[0].id,updated:true,tool:code});
  }
  const rows=await privateJson(auth.c,base,'POST',{
   user_id:auth.userId,tool_code:code,record_type:type,title,payload:body.payload
  },'return=representation');
  if(!Array.isArray(rows)||rows.length!==1||!safeId(rows[0].id))throw fail('Workspace save could not be verified.',503);
  safeToolMetric('beta_workspace','created');
  return out({ok:true,id:rows[0].id,tool:code},201);
 }catch(e){
  safeToolMetric('beta_workspace',statusReason(e?.status));
  return out({ok:false,error:[400,401,403,404,409,413].includes(e?.status)?e.message:
   'Private workspace temporarily unavailable.'},[400,401,403,404,405,409,413].includes(e?.status)?e.status:503);
 }
}
