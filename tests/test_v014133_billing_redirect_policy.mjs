import assert from 'node:assert/strict';
import {classifyBillingRedirect} from '../workers/billing-reconcile-stripe-only-v014129.js';
import worker from '../workers/billing-scheduler.js';

const origin='https://course.example';
const secret='DONT_LOG_BILLING_SECRET_123456789012345678901';
const env={GU_BILLING_SITE_ORIGIN:origin,GU_BILLING_TASK_SECRET:secret};
function redirect(location,status=307){
 return new Response(null,{status,headers:{location}});
}
for(const [location,destination] of [
 ['https://elsewhere.example/api/internal-billing-reconcile','CROSS_ORIGIN'],
 ['https://course.example/another-path','SAME_ORIGIN_OTHER_PATH'],
 ['/api/internal-billing-reconcile?nonce=1','SAME_ORIGIN_OTHER_PATH'],
 ['/api/internal-billing-reconcile','SAME_ORIGIN_SAME_PATH'],
 ['http://course.example/api/internal-billing-reconcile','INSECURE_DESTINATION'],
 ['not-valid%','SAME_ORIGIN_OTHER_PATH']
]){
 const detail=classifyBillingRedirect(redirect(location),origin);
 assert.deepEqual(detail,{status:307,destination});
 assert(!JSON.stringify(detail).includes('example'),'Never log destinations');
}
assert.deepEqual(classifyBillingRedirect(new Response(null,{status:302}),origin),
 {status:302,destination:'LOCATION_MISSING'});

let observed='',called=0;
const saved={fetch:globalThis.fetch,error:console.error};
try{
 globalThis.fetch=async(_url,options)=>{
  called++;
  assert.equal(options.method,'POST');
  assert.equal(options.redirect,'manual','Bearer must never be auto-followed');
  assert.equal(options.headers.authorization,'Bearer '+secret);
  return redirect('https://attacker.example/capture?token='+secret,302);
 };
 console.error=(...items)=>{observed+=JSON.stringify(items)};
 let pending;
 await worker.scheduled({},env,{waitUntil(p){pending=p}});
 const [result]=await Promise.allSettled([pending]);
 assert.equal(result.status,'rejected');
 assert.match(result.reason.message,/redirect blocked \[302:CROSS_ORIGIN\]/);
 assert.equal(called,1,'No second call to redirect destination');
 assert.match(observed,/BILLING_RECONCILIATION_REDIRECT_BLOCKED/);
 assert(!observed.includes(secret));
 assert(!observed.includes('attacker.example'));
 assert(!result.reason.message.includes(secret));
}finally{
 globalThis.fetch=saved.fetch;
 console.error=saved.error;
}
console.log('PASS v133: manual redirects fail closed, destination classified, bearer never forwarded or logged');
