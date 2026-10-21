/* v0.14.0.129 | Stripe-native billing schedule; Cloudflare standalone Worker.
 * No custom transactional email provider or sending domain is required.
 * Invoke ONLY the existing signed-LIVE detect-only v124 reconciliation endpoint.
 * Existing v123 notice outbox is retained for audit/future delivery; NOT dispatched.
 * A failed provider, malformed response or discrepancy must fail the Cron visibly.
 * Never log credentials, member data, provider payloads, or recipient addresses.
 */
/* v0.14.0.132: classify only safe runtime fetch failure characteristics.
 * Never log raw exception messages, URLs, secrets, headers or customer data. */
export function classifyBillingFetchFailure(error){
 const name=error?.name==='TypeError'?'TypeError':
  error?.name==='AbortError'?'AbortError':'Other';
 const combined=String(error?.message||'')+' '+String(error?.cause?.message||'');
 const code=String(error?.code||error?.cause?.code||'');
 const has=s=>combined.toLowerCase().includes(s);
 let reason='UNCLASSIFIED';
 if(/\b1042\b/.test(combined)||has('another worker')||has('same zone'))
  reason='WORKER_ROUTE_1042';
 else if(/\b1019\b/.test(combined)||has('loop limit'))
  reason='WORKER_LOOP_1019';
 else if(has('redirect'))reason='REDIRECT_REJECTED';
 else if(has('dns')||/ENOTFOUND|EAI_AGAIN/i.test(code))
  reason='DNS_FAILURE';
 else if(has('tls')||has('certificate'))reason='TLS_FAILURE';
 else if(has('subrequest'))reason='SUBREQUEST_LIMIT';
 else if(has('connect')||has('network'))reason='NETWORK_FAILURE';
 return {name,reason};
}

/* v0.14.0.133: Manual redirect inspection, never forwarding billing bearer
 * credentials to any redirect target, including an apparently safe origin.
 * Only emit enum classifications, never Location, URL, headers, or tokens. */
export function classifyBillingRedirect(response,base){
 const status=response.status;
 const raw=response.headers.get('location');
 if(!raw)return {status,destination:'LOCATION_MISSING'};
 try{
  const requested=new URL(base+'/api/internal-billing-reconcile');
  const destination=new URL(raw,requested);
  if(destination.protocol!=='https:')return {status,destination:'INSECURE_DESTINATION'};
  if(destination.origin!==requested.origin)return {status,destination:'CROSS_ORIGIN'};
  if(destination.pathname!==requested.pathname||destination.search)
   return {status,destination:'SAME_ORIGIN_OTHER_PATH'};
  return {status,destination:'SAME_ORIGIN_SAME_PATH'};
 }catch{return {status,destination:'INVALID_LOCATION'}}
}

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
    response=await fetch(base+'/api/internal-billing-reconcile',{
     method:'POST',headers:{authorization:'Bearer '+secret,
      'content-type':'application/json'},body:'{}',redirect:'manual'
    });
   }catch(error){
    const failure=classifyBillingFetchFailure(error);
    console.error('BILLING_RECONCILIATION_FETCH_FAILURE',failure);
    throw new Error('Stripe reconciliation endpoint could not be reached ['+failure.name+':'+failure.reason+']');
   }
   // Reject redirects explicitly. The bearer token must never follow a 3xx.
   if(response.status>=300&&response.status<400){
    const detail=classifyBillingRedirect(response,base);
    console.error('BILLING_RECONCILIATION_REDIRECT_BLOCKED',detail);
    throw new Error('Stripe reconciliation redirect blocked ['+
     detail.status+':'+detail.destination+']');
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
