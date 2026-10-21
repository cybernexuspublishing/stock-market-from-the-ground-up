/* v0.14.0.134 | Owner-only, no-charge, database read-only billing evidence.
 * Stable public path /api/billing-reconciliation-health. No Stripe calls.
 * Does not invoke a scan, move a cursor, change a paid entitlement, or approve launch.
 * Uses existing v124 private tables; never returns record IDs, tokens, user data.
 */
const headers={'content-type':'application/json; charset=utf-8',
 'cache-control':'private, no-store, max-age=0','pragma':'no-cache',
 'x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow'};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const failure=(code,status)=>Object.assign(new Error(code),{code,status});
const validBase=s=>/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(s);
const jwt=s=>/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(s);
const issueTypes=Object.freeze(['state_mismatch','period_mismatch','price_mismatch',
 'intent_mismatch','provider_missing','provider_unavailable']);
const kinds=Object.freeze(['plan','tool']);
async function getJson(url,init,code){
 let res;
 try{res=await fetch(url,{...init,cache:'no-store'})}
 catch{throw failure(code,503)}
 if(!res.ok)throw failure(code,503);
 const value=await res.json().catch(()=>null);
 if(value===null||value?.error)throw failure(code,503);
 return value;
}
async function verifiedOwner(request,env,base){
 const token=/^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')||'')?.[1];
 if(!token)throw failure('SIGN_IN_REQUIRED',401);
 const publicKey=String(env.SUPABASE_PUBLISHABLE_KEY||'');
 if(!publicKey)throw failure('AUTH_CONFIGURATION_MISSING',503);
 const memberHeaders={apikey:publicKey,authorization:'Bearer '+token};
 const user=await getJson(base+'/auth/v1/user',{headers:memberHeaders},'AUTH_UNAVAILABLE');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user?.id||''))
  throw failure('SIGN_IN_REQUIRED',401);
 const role=await getJson(base+'/rest/v1/rpc/gu_staff_role_v01432r1',{
  method:'POST',headers:{...memberHeaders,'content-type':'application/json'},
  body:'{}'},'OWNER_ROLE_UNAVAILABLE');
 if(role?.ok!==true||role?.role!=='OWNER')throw failure('OWNER_ONLY',403);
 const step=await getJson(base+'/rest/v1/rpc/gu_staff_stepup_active_v01432r1',{
  method:'POST',headers:{...memberHeaders,'content-type':'application/json'},
  body:'{}'},'OWNER_STEPUP_UNAVAILABLE');
 if(step!==true)throw failure('PASSWORD_RECONFIRM_REQUIRED',403);
}
function serviceHeaders(value){
 const key=String(value||'');
 if(key.startsWith('sb_secret_')&&key.length>20)return {apikey:key};
 if(jwt(key))return {apikey:key,authorization:'Bearer '+key};
 throw failure('DATABASE_CONFIGURATION_MISSING',503);
}
function restUrl(base,path,fields){
 const query=new URLSearchParams(fields);
 return base+'/rest/v1/'+path+'?'+query.toString();
}
async function exactCount(base,headerValues,path,filter){
 const url=restUrl(base,path,{select:'id',...filter,limit:'1'});
 let res;
 try{res=await fetch(url,{method:'HEAD',headers:{...headerValues,
   prefer:'count=exact',accept:'application/json'},cache:'no-store'})}
 catch{throw failure('BILLING_EVIDENCE_UNAVAILABLE',503)}
 if(!res.ok)throw failure('BILLING_EVIDENCE_UNAVAILABLE',503);
 const raw=res.headers.get('content-range')||'';
 const match=/\/(\d+)$/.exec(raw);
 if(!match)throw failure('BILLING_EVIDENCE_COUNT_UNKNOWN',503);
 const n=Number(match[1]);
 if(!Number.isSafeInteger(n)||n<0)throw failure('BILLING_EVIDENCE_COUNT_UNKNOWN',503);
 return n;
}
async function cursors(base,headerValues){
 const rows=await getJson(restUrl(base,'gu_billing_reconcile_cursor_v014124',
  {select:'source_kind,last_id,updated_at',order:'source_kind.asc',limit:'3'}),
  {headers:{...headerValues,accept:'application/json'}},'BILLING_CURSOR_UNAVAILABLE');
 if(!Array.isArray(rows)||rows.length!==2||new Set(rows.map(r=>r.source_kind)).size!==2||
  !kinds.every(k=>rows.some(r=>r.source_kind===k)))
  throw failure('BILLING_CURSOR_INCOMPLETE',503);
 const result={};
 for(const row of rows){
  const cursor=Number(row.last_id),at=Date.parse(row.updated_at||'');
  if(!Number.isSafeInteger(cursor)||cursor<0||!Number.isFinite(at)||
     at>Date.now()+300000)throw failure('BILLING_CURSOR_INVALID',503);
  result[row.source_kind]={lastActivityAt:new Date(at).toISOString(),
   ageHours:Math.round(Math.max(0,Date.now()-at)/3600000*10)/10,
   activityWithin48h:Date.now()-at<=48*3600000};
 }
 return result;
}
export async function onRequestGet({request,env}){
 try{
  const base=String(env?.SUPABASE_URL||'').replace(/\/$/,'');
  if(!validBase(base))throw failure('AUTH_CONFIGURATION_MISSING',503);
  // Never read service-key-backed private data before member+Owner+step-up checks.
  await verifiedOwner(request,env,base);
  const sh=serviceHeaders(env.SUPABASE_SECRET_KEY);
  const cursor=await cursors(base,sh);
  const ledger=[],open=[],resolved=[];
  const tasks=[];
  for(const kind of kinds){
   const table=kind==='plan'?'site_subscriptions':'user_tool_passes';
   tasks.push(exactCount(base,sh,table,{
    provider:'eq.STRIPE_MANAGED','metadata->>source':'eq.gu58_live_signed_stripe'
   }).then(n=>ledger.push({kind,count:n})));
   tasks.push(exactCount(base,sh,'gu_billing_reconcile_issues_v014124',{
    source_kind:'eq.'+kind,resolved_at:'is.null'
   }).then(n=>open.push({kind,count:n})));
   tasks.push(exactCount(base,sh,'gu_billing_reconcile_issues_v014124',{
    source_kind:'eq.'+kind,resolved_at:'not.is.null'
   }).then(n=>resolved.push({kind,count:n})));
  }
  const causes={};
  for(const issue of issueTypes)tasks.push(exactCount(base,sh,
   'gu_billing_reconcile_issues_v014124',{
    issue_kind:'eq.'+issue,resolved_at:'is.null'
   }).then(n=>{causes[issue]=n}));
  await Promise.all(tasks);
  const value=(rows,kind)=>rows.find(r=>r.kind===kind)?.count;
  const planOpen=value(open,'plan'),toolOpen=value(open,'tool');
  const planPaid=value(ledger,'plan'),toolPaid=value(ledger,'tool');
  const totalOpen=planOpen+toolOpen;
  if(issueTypes.reduce((sum,k)=>sum+causes[k],0)!==totalOpen)
   throw failure('BILLING_EVIDENCE_INCONSISTENT',503);
  const categories={};
  for(const kind of kinds)categories[kind]={
   eligibleRecurringRecords:value(ledger,kind),
   unresolvedIssues:value(open,kind),
   previouslyResolvedIssues:value(resolved,kind),
   ...cursor[kind]
  };
  const overall=totalOpen>0?'OPEN_DISCREPANCIES':
   !cursor.plan.activityWithin48h||!cursor.tool.activityWithin48h?'SCAN_ACTIVITY_STALE':
   planPaid+toolPaid===0?'NO_SIGNED_RECURRING_RECORDS':'NO_OPEN_DISCREPANCIES_OBSERVED';
  return response({
   ok:true,asOf:new Date().toISOString(),status:overall,
   categories,openIssuesByType:causes,
   totals:{eligibleRecurringRecords:planPaid+toolPaid,openIssues:totalOpen,
    previouslyResolvedIssues:value(resolved,'plan')+value(resolved,'tool')},
   acceptance:{recentSuccessfulCron:'NOT_CHECKED_BY_THIS_REPORT',
    fullProviderSweep:'NOT_VERIFIED',realPaidCheckout:'NOT_VERIFIED',
    signedWebhookMemberAccess:'NOT_VERIFIED',liveLaunchApprovedByReport:false},
   explanation:'Private database counters and cursor activity only. Cursor movement does not prove a completed full sweep; zero issues does not prove a paid webhook or successful customer checkout. No changes made.'
  });
 }catch(error){
  const status=Number.isInteger(error?.status)?error.status:503;
  const code=typeof error?.code==='string'?error.code:'BILLING_EVIDENCE_UNAVAILABLE';
  return response({ok:false,error:code},status);
 }
}
