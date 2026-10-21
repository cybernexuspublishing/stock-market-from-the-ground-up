import assert from 'node:assert/strict';
import {classifyBillingFetchFailure} from '../workers/billing-reconcile-stripe-only-v014129.js';
import worker from '../workers/billing-scheduler.js';
assert.deepEqual(classifyBillingFetchFailure(new TypeError('Worker tried to fetch another Worker (1042)')),{name:'TypeError',reason:'WORKER_ROUTE_1042'});
assert.deepEqual(classifyBillingFetchFailure(Object.assign(new Error('subrequest loop (1019)'),{name:'Error'})),{name:'Other',reason:'WORKER_LOOP_1019'});
assert.deepEqual(classifyBillingFetchFailure(new TypeError('unexpected redirect')),{name:'TypeError',reason:'REDIRECT_REJECTED'});
assert.deepEqual(classifyBillingFetchFailure(new TypeError('could not connect to DNS service')),{name:'TypeError',reason:'DNS_FAILURE'});
assert.deepEqual(classifyBillingFetchFailure(new TypeError('TLS certificate expired')),{name:'TypeError',reason:'TLS_FAILURE'});
assert.deepEqual(classifyBillingFetchFailure(new TypeError('unknown failure')),{name:'TypeError',reason:'UNCLASSIFIED'});
assert.deepEqual(classifyBillingFetchFailure({name:'TypeError',message:'Network failed',cause:{message:'1042'}}),{name:'TypeError',reason:'WORKER_ROUTE_1042'});
const SECRET='DO_NOT_LOG_PRIVATE_TEST_SECRET_1234567890123';
const log=console.error,old=globalThis.fetch;
let captured='';
try{
 console.error=(...xs)=>{captured+=JSON.stringify(xs)};
 globalThis.fetch=async()=>{throw new TypeError('failed to connect; '+SECRET)};
 let pending;
 const env={GU_BILLING_SITE_ORIGIN:'https://course.example',
 GU_BILLING_TASK_SECRET:SECRET};
 await worker.scheduled({},env,{waitUntil(p){pending=p}});
 const result=await Promise.allSettled([pending]);
 assert.equal(result[0].status,'rejected');
 assert.match(result[0].reason.message,/\[TypeError:NETWORK_FAILURE\]/);
 assert.match(captured,/BILLING_RECONCILIATION_FETCH_FAILURE/);
 assert(!captured.includes(SECRET));
 assert(!result[0].reason.message.includes(SECRET));
 assert(!captured.includes('course.example'));
}finally{
 console.error=log;
 globalThis.fetch=old;
}
console.log('PASS v132: suppressed scheduled fetch exception classified, safe logging, no secrets leaked');
