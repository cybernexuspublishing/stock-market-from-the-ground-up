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
   const r=await fetch(base+'/api/internal-billing-notices-v014123',{
    method:'POST',headers:{authorization:'Bearer '+env.GU_BILLING_TASK_SECRET,
     'content-type':'application/json'},body:'{}'});
   if(!r.ok)throw new Error('Billing delivery scheduler run failed: '+r.status);
  })());
 }
};
