/* v0.14.0.129 | Stripe-native billing schedule; Cloudflare standalone Worker.
 * No custom transactional email provider or sending domain is required.
 * Invoke ONLY the existing signed-LIVE detect-only v124 reconciliation endpoint.
 * Existing v123 notice outbox is retained for audit/future delivery; NOT dispatched.
 * A failed provider, malformed response or discrepancy must fail the Cron visibly.
 * Never log credentials, member data, provider payloads, or recipient addresses.
 */
const healthyCount=n=>Number.isSafeInteger(n)&&n>=0;
const safeJson=async response=>{
 try{return await response.json()}catch{return null}
};
export default {
 async scheduled(_event,env,ctx){
  ctx.waitUntil((async()=>{
   const base=String(env.GU_BILLING_SITE_ORIGIN||'');
   const secret=String(env.GU_BILLING_TASK_SECRET||'');
   if(!/^https:\/\/[a-z0-9.-]+(?::443)?$/.test(base)||secret.length<32)
    throw new Error('Stripe reconciliation Cron configuration missing');
   let response;
   try{
    response=await fetch(base+'/api/internal-billing-reconcile-v014124',{
     method:'POST',headers:{authorization:'Bearer '+secret,
      'content-type':'application/json'},body:'{}',redirect:'error'
    });
   }catch{
    throw new Error('Stripe reconciliation endpoint could not be reached');
   }
   if(response.status!==200)
    throw new Error('Stripe reconciliation endpoint returned an unsuccessful status');
   const result=await safeJson(response);
   if(result?.ok!==true||
      !healthyCount(result.checked)||
      !healthyCount(result.discrepancies)||
      !healthyCount(result.errors)||
      result.errors!==0||result.discrepancies>0)
    throw new Error('Verified LIVE subscription discrepancy or invalid reconciliation response');
  })());
 },
 async fetch(){
  return new Response('Not found',{status:404,headers:{
   'cache-control':'no-store','x-content-type-options':'nosniff'
  }});
 }
};
