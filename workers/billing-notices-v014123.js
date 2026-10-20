/* Cloudflare WORKER (NOT Pages) — requires owner deployment and Cron Trigger.
 * Every scheduled run invokes a private Pages endpoint using an owner-set
 * random shared secret. Do not schedule more frequently than your plan permits.
 * No member identifiers, emails, payment data or secrets are logged.
 */
export default {
 async scheduled(_event,env,ctx){
  ctx.waitUntil((async()=>{
   const base=String(env.GU_BILLING_SITE_ORIGIN||'');
   if(!/^https:\/\/[a-z0-9.-]+(?::443)?$/.test(base)||
      !env.GU_BILLING_TASK_SECRET||String(env.GU_BILLING_TASK_SECRET).length<32)
    throw new Error('Billing Cron configuration missing');
   const endpoints=['/api/internal-billing-notices-v014123','/api/internal-billing-reconcile-v014124'];
   const responses=await Promise.all(endpoints.map(endpoint=>fetch(base+endpoint,{
    method:'POST',headers:{authorization:'Bearer '+env.GU_BILLING_TASK_SECRET,
     'content-type':'application/json'},body:'{}'})));
   if(responses.some(r=>!r.ok))throw new Error('One or more scheduled billing operations failed');
  })());
 }
};
