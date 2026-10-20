import assert from 'node:assert/strict';
import worker from '../workers/billing-notices-v014123.js';

// Real Worker.scheduled entrypoint with synthetic response data. No Stripe,
// Supabase, Resend or Cloudflare credentials, and no customer information.
const env={GU_BILLING_SITE_ORIGIN:'https://course.example',
 GU_BILLING_TASK_SECRET:'0000000000000000000000000000000000000000'};
const normalNotice={ok:true,attempted:1,sent:1,failed:0};
const normalReconcile={ok:true,checked:1,discrepancies:0,errors:0,wrapped:0};
const response=(value,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{'content-type':'application/json'}});
const originalFetch=globalThis.fetch;
let sent=[];
async function exercise({notice=normalNotice,reconcile=normalReconcile,
 noticeStatus=200,reconcileStatus=200,noticeText,reconcileText,badEnv=false}={}){
 sent=[];
 globalThis.fetch=async (url,options)=>{
  sent.push({url:String(url),options});
  assert.equal(options.method,'POST');
  assert.equal(options.headers.authorization,'Bearer '+env.GU_BILLING_TASK_SECRET);
  assert.equal(options.body,'{}');
  if(String(url).endsWith('/api/internal-billing-notices-v014123'))
   return noticeText===undefined?response(notice,noticeStatus):new Response(noticeText,{
    status:noticeStatus,headers:{'content-type':'application/json'}});
  if(String(url).endsWith('/api/internal-billing-reconcile-v014124'))
   return reconcileText===undefined?response(reconcile,reconcileStatus):new Response(reconcileText,{
    status:reconcileStatus,headers:{'content-type':'application/json'}});
  throw Error('Unexpected scheduled endpoint '+url);
 };
 let task;
 await worker.scheduled({},badEnv?{...env,GU_BILLING_TASK_SECRET:'x'}:env,{
  waitUntil(p){assert.equal(task,undefined);task=p;}
 });
 assert(task instanceof Promise,'Cron must retain asynchronous work');
 const result=await Promise.allSettled([task]);
 assert.equal(result.length,1);
 return result[0];
}
try{
 let result=await exercise();
 assert.equal(result.status,'fulfilled');
 assert.equal(sent.length,2,'Both pipelines run together');

 result=await exercise({noticeStatus:207,notice:{ok:false,attempted:1,sent:0,failed:1}});
 assert.equal(result.status,'rejected','HTTP 207 is Response.ok but is an incomplete delivery');
 assert.equal(sent.length,2,'Reconciliation still runs when a notice needs retry');

 result=await exercise({notice:{ok:false,attempted:1,sent:0,failed:1}});
 assert.equal(result.status,'rejected','HTTP 200 with error payload is still an incident');
 result=await exercise({notice:{ok:true,attempted:2,sent:1,failed:1}});
 assert.equal(result.status,'rejected','Inconsistent body must never report healthy Cron');
 result=await exercise({noticeText:'<html>upstream error</html>'});
 assert.equal(result.status,'rejected','Malformed success payload must not silently pass');
 result=await exercise({noticeStatus:503});
 assert.equal(result.status,'rejected','Provider outage must surface');

 result=await exercise({reconcile:{ok:true,checked:1,discrepancies:1,errors:0}});
 assert.equal(result.status,'rejected','Detected mismatch must trigger owner monitoring');
 result=await exercise({reconcile:{ok:false,checked:1,discrepancies:0,errors:1}});
 assert.equal(result.status,'rejected','Partial verification failure must trigger monitoring');
 result=await exercise({reconcile:{ok:true,checked:0,discrepancies:0,errors:0}});
 assert.equal(result.status,'fulfilled','Zero legitimate new records is not itself an error');
 result=await exercise({reconcileText:'not-json'});
 assert.equal(result.status,'rejected','Invalid reconciliation payload must not pass');
 result=await exercise({badEnv:true});
 assert.equal(result.status,'rejected','Missing shared secret fails before HTTP request');
 assert.equal(sent.length,0);
 console.log('PASS v128: Cron surfaces HTTP 207 notice failures, payload failures, Stripe discrepancies and invalid configuration');
}finally{globalThis.fetch=originalFetch}
