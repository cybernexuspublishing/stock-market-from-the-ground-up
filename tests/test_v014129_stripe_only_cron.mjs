import assert from 'node:assert/strict';
import worker from '../workers/billing-reconcile-stripe-only-v014129.js';

const origin='https://course.example',secret='x'.repeat(48);
const env={GU_BILLING_SITE_ORIGIN:origin,GU_BILLING_TASK_SECRET:secret};
const healthy={ok:true,checked:1,discrepancies:0,errors:0,wrapped:0};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{'content-type':'application/json'}});
const oldFetch=globalThis.fetch;
let requests=[],respond;
globalThis.fetch=async(url,options)=>{
 requests.push({url:String(url),options});
 assert.equal(String(url),origin+'/api/internal-billing-reconcile-v014124',
  'Scheduler must never call the Resend notification endpoint');
 assert.equal(options.method,'POST');
 assert.equal(options.headers.authorization,'Bearer '+secret);
 assert.equal(options.headers['content-type'],'application/json');
 assert.equal(options.body,'{}');
 assert.equal(options.redirect,'error');
 return respond();
};
async function run(e=env){
 requests=[];
 let task;
 await worker.scheduled({},e,{waitUntil(p){
  assert.equal(task,undefined);task=p;
 }});
 assert(task instanceof Promise,'Cron task must be awaited by waitUntil');
 return (await Promise.allSettled([task]))[0];
}
try{
 respond=()=>reply(healthy);
 assert.equal((await run()).status,'fulfilled');
 assert.equal(requests.length,1,'Daily scheduler issues one endpoint request');

 for(const bad of [
  ()=>reply(healthy,207),
  ()=>reply({ok:false,checked:0,discrepancies:0,errors:0}),
  ()=>reply({...healthy,discrepancies:1}),
  ()=>reply({...healthy,errors:1}),
  ()=>reply({...healthy,checked:-1}),
  ()=>reply({...healthy,checked:'0'}),
  ()=>reply({...healthy,discrepancies:1.2}),
  ()=>reply({...healthy,errors:undefined}),
  ()=>new Response('<html>error</html>',{status:200}),
  ()=>reply({error:'forbidden'},403),
  ()=>reply({error:'provider unavailable'},503)
 ]){
  respond=bad;
  assert.equal((await run()).status,'rejected',
   'Nonhealthy reconcile result must reject scheduled invocation');
  assert.equal(requests.length,1);
 }
 respond=()=>reply({...healthy,checked:0});
 assert.equal((await run()).status,'fulfilled','Empty scan is allowed');

 assert.equal((await run({...env,GU_BILLING_TASK_SECRET:'short'})).status,'rejected');
 assert.equal(requests.length,0,'Fail before network on missing auth');
 assert.equal((await run({...env,GU_BILLING_SITE_ORIGIN:'http://course.example'})).status,'rejected');
 assert.equal(requests.length,0,'Fail before network on insecure origin');

 respond=()=>{throw new Error('simulated timeout')};
 assert.equal((await run()).status,'rejected','Provider outage must fail visibly');
 const get=await worker.fetch(new Request(origin+'/'));
 assert.equal(get.status,404,'Public route must not expose a billing API');
 console.log('PASS v129: Stripe-only Cron is isolated from Resend, authenticated, fail-closed, and nonpublic');
}finally{globalThis.fetch=oldFetch}
