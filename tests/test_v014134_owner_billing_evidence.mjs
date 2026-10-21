import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/api/billing-reconciliation-health.js';

const base='https://'+ 'a'.repeat(20)+'.supabase.co';
const env={SUPABASE_URL:base,SUPABASE_PUBLISHABLE_KEY:'demo-key',
 SUPABASE_SECRET_KEY:'sb_'+'secret_'+'b'.repeat(30)};
let role='OWNER',stepup=true,invalidCursor=false,badHeader=false,openIssue=false;
let seen=[];
const saved=globalThis.fetch;
globalThis.fetch=async (address,options={})=>{
 const url=new URL(address),method=options.method||'GET';
 seen.push({path:url.pathname,method});
 if(url.pathname==='/auth/v1/user')
  return Response.json({id:'12345678-1234-4234-8234-123456789abc'});
 if(url.pathname.endsWith('/gu_staff_role_v01432r1'))
  return Response.json({ok:true,role});
 if(url.pathname.endsWith('/gu_staff_stepup_active_v01432r1'))
  return Response.json(stepup);
 if(url.pathname.endsWith('/gu_billing_reconcile_cursor_v014124'))
  return Response.json(invalidCursor?[]:['plan','tool'].map(source_kind=>({
   source_kind,last_id:0,updated_at:new Date().toISOString()
  })));
 assert.equal(method,'HEAD');
 assert.equal(options.headers.prefer,'count=exact');
 const query=url.searchParams;
 if(url.pathname.endsWith('/gu_billing_reconcile_issues_v014124'))
  assert.equal(query.get('select'),'local_record_id');
 else{
  assert.equal(query.get('select'),'id');
  assert.equal(query.get('metadata->>source'),'eq.gu58_live_signed_stripe');
 }
 const count=openIssue&&query.get('resolved_at')==='is.null'&&
 (query.get('source_kind')==='eq.plan'||query.get('issue_kind')==='eq.state_mismatch')?1:0;
 return new Response(null,{headers:badHeader?{}:{'content-range':'*/'+count}});
};
const run=()=>onRequestGet({env,request:new Request('https://site.example/api/billing-reconciliation-health',{
 headers:{authorization:'Bearer demo-session'}})});
try{
 let result=await run(),data=await result.json();
 assert.equal(result.status,200);
 assert.equal(data.status,'NO_SIGNED_RECURRING_RECORDS');
 assert.equal(data.acceptance.fullProviderSweep,'NOT_VERIFIED');
 assert.equal(data.acceptance.liveLaunchApprovedByReport,false);
 assert.equal(seen.filter(x=>x.method==='HEAD').length,12);
 openIssue=true;result=await run();data=await result.json();
 assert.equal(data.status,'OPEN_DISCREPANCIES');
 assert.equal(data.totals.openIssues,1);
 role='ADMIN';seen=[];result=await run();
 assert.equal(result.status,403);
 assert.equal(seen.some(x=>x.method==='HEAD'),false);
 role='OWNER';stepup=false;seen=[];result=await run();
 assert.equal(result.status,403);
 assert.equal(seen.some(x=>x.method==='HEAD'),false);
 stepup=true;invalidCursor=true;result=await run();
 assert.equal(result.status,503);
 invalidCursor=false;badHeader=true;result=await run();
 assert.equal(result.status,503);
 const missing=await onRequestGet({env,request:new Request('https://site.example/api/billing-reconciliation-health')});
 assert.equal(missing.status,401);
 console.log('PASS v134: Owner authentication and step-up before private reads, status counts, noncharge reporting and fail-closed evidence');
}finally{globalThis.fetch=saved}
