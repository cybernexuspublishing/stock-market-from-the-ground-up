import assert from 'node:assert/strict';
const site='https://stock-market-from-the-ground-up-d1r.pages.dev';
const workers=[
 'https://stock-market-from-the-ground-up.stock-market-from-the-ground-up.workers.dev',
 'https://stock-market-from-the-ground-up.the-stock-market-from-the-ground-up-live.workers.dev'
];
const forbidden=['/.git/config','/.mcp.json','/wrangler.jsonc',
 '/supabase/migrations/v0.14.0.201_exact_founding_paid_cycle_invariants.sql',
 '/workers/billing-scheduler.js','/functions/api/member-ai-service.js',
 '/docs/RELEASE_AUDIT_FAILURES.csv'];
const passed=[],failures=[];
async function verify(name,action) {
 try{await action();passed.push(name)}
 catch(e){failures.push({name,error:String(e.message||e)})}
}
async function probe(origin,path,method='HEAD'){
 const response=await fetch(origin+path,{method,redirect:'manual',cache:'no-store',
  signal:AbortSignal.timeout(16000)});
 return response;
}
for(const path of forbidden){
 await verify('Pages denies '+path,async()=>{
  const r=await probe(site,path);
  assert.ok(r.status===403||r.status===404,'Expected 403/404, got '+r.status);
 });
}
for(const origin of workers){
 await verify('No exposed repository files at '+new URL(origin).hostname,async()=>{
  const r=await probe(origin,'/.git/config');
  assert.ok(r.status>=400,'Worker still publicly serves metadata, HTTP '+r.status);
 });
}
await verify('Pages health GET',async()=>{
 const r=await fetch(site+'/api/runtime-health-v014259',{redirect:'manual'});
 assert.equal(r.status,200);const b=await r.json();
 assert.equal(b.ok,true);assert.equal(b.readOnly,true);
});
await verify('Ad catalog 3 packages, checkout disabled',async()=>{
 const r=await fetch(site+'/api/ad-sales',{redirect:'manual'});
 assert.equal(r.status,200);const j=await r.json();
 assert.equal(j.ok,true);assert.equal(j.onlineCheckoutEnabled,false);
 assert.deepEqual(j.packages.map(p=>p.code).sort(),['RESOURCE_SPONSOR','SECTION_SPONSOR','SITE_SPONSOR']);
});
for(const path of ['/api/gu39-sandbox','/api/admin-prelive-v014247','/api/owner-zero-live-checkout']){
 await verify('Guest denied '+path,async()=>{
  const r=await fetch(site+path,{redirect:'manual'});
  assert.equal(r.status,401);
 });
}
for(const path of ['/api/stripe-live-webhook','/api/gu39-stripe-webhook']){
 await verify('No GET webhook '+path,async()=>{
  const r=await fetch(site+path,{redirect:'manual'});
  assert.equal(r.status,405);
 });
}
// Founding 600 uses onRequestPost only; GET has no Pages handler and
// therefore correctly falls through to 404 rather than a custom 405.
await verify('POST-only Founding 600 webhook rejects GET',async()=>{
 const r=await fetch(site+'/api/founding600-webhook',{redirect:'manual'});
 assert.ok(r.status===404||r.status===405,'Unexpected GET '+r.status);
});
// TEST-only negative signature probes: no customer, checkout, paid invoice,
 // event replay, or valid HMAC is ever created. The handler must return 401
 // before it can read or write the independently disabled Sandbox ledger.
const testPayload=JSON.stringify({
 id:'evt_test_master_migration_invalid_signature',
 livemode:false,created:Math.floor(Date.now()/1000),
 type:'checkout.session.completed',data:{object:{id:'cs_test_invalid'}}
});
for(const [label,signature] of [
 ['absent Stripe-Signature',null],
 ['forged Stripe-Signature','t='+Math.floor(Date.now()/1000)+',v1='+'0'.repeat(64)]
]){
 await verify('TEST webhook rejects '+label,async()=>{
  const headers={'content-type':'application/json'};
  if(signature)headers['stripe-signature']=signature;
  const r=await fetch(site+'/api/gu39-stripe-webhook',{
   method:'POST',headers,body:testPayload,redirect:'manual',
   cache:'no-store',signal:AbortSignal.timeout(16000)});
  const text=await r.text();
  assert.equal(r.status,401,'Expected signature rejection HTTP 401, got '+r.status);
  assert.equal(text,'BAD_SIGNATURE');
 });
}
console.log(JSON.stringify({site,passed:passed.length,failed:failures.length,failures,paymentsPerformed:0},null,2));
if(failures.length)process.exitCode=1;
