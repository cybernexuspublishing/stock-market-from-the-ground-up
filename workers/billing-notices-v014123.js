/* v0.14.0.128 | Existing Cloudflare scheduled Worker (NOT Pages).
 * Preserve independent v123 notification and v124 reconciliation endpoints.
 * HTTP 207 is 2xx/Response.ok but means a billing notice delivery FAILED.
 * Every cron run must fail visibly on partial, malformed, or mismatched work.
 * Never log member data, Stripe payloads, recipient addresses, or secrets.
 */
const healthyCount=n=>Number.isSafeInteger(n)&&n>=0;
const safeJson=async response=>{
 try{return await response.json()}catch{return null}
};
export default {
 async scheduled(_event,env,ctx){
  ctx.waitUntil((async()=>{
   const base=String(env.GU_BILLING_SITE_ORIGIN||'');
   if(!/^https:\/\/[a-z0-9.-]+(?::443)?$/.test(base)||
      !env.GU_BILLING_TASK_SECRET||String(env.GU_BILLING_TASK_SECRET).length<32)
    throw new Error('Billing Cron configuration missing');
   const endpoints=['/api/internal-billing-notices-v014123','/api/internal-billing-reconcile-v014124'];
   // Invoke both even when one path has a transient provider error.
   const responses=await Promise.all(endpoints.map(endpoint=>fetch(base+endpoint,{
    method:'POST',headers:{authorization:'Bearer '+env.GU_BILLING_TASK_SECRET,
     'content-type':'application/json'},body:'{}',redirect:'error'
   })));
   const [noticeResponse,reconciliationResponse]=responses;
   if(!noticeResponse.ok||!reconciliationResponse.ok)
    throw new Error('One or more scheduled billing endpoints returned an unsuccessful status');
   const [notices,reconciliation]=await Promise.all(responses.map(safeJson));
   // Notice endpoint may return HTTP 207 with {ok:false,failed:N}.
   // Checking Response.ok alone masked deliverability failures in v124.
   if(noticeResponse.status!==200||notices?.ok!==true||
      !healthyCount(notices.attempted)||!healthyCount(notices.sent)||
      !healthyCount(notices.failed)||notices.failed!==0||
      notices.sent>notices.attempted)
    throw new Error('Billing notice delivery incomplete; review retry/dead-letter queue');
   if(reconciliationResponse.status!==200||reconciliation?.ok!==true||
      !healthyCount(reconciliation.checked)||
      !healthyCount(reconciliation.discrepancies)||
      !healthyCount(reconciliation.errors)||
      reconciliation.errors!==0||
      reconciliation.discrepancies>0)
    throw new Error('Verified LIVE subscription mismatch or incomplete reconciliation; review private alerts');
  })());
 }
};
