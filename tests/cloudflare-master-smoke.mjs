import assert from 'node:assert/strict';
const origin='https://stock-market-from-the-ground-up-d1r.pages.dev';
const oldOrigin='https://stock-market-from-the-ground-up.pages.dev';
const expectedSitekey='0x4AAAAAAFlx7GxnPwFqJCMc';
const results={origin,passed:[],blocked:[],failures:[],livePaymentOperations:0};
async function get(path){
 const url=new URL(path,origin);
 assert.equal(url.origin,origin);
 const r=await fetch(url,{method:'GET',redirect:'manual',cache:'no-store',
  headers:{'accept':'*/*'},signal:AbortSignal.timeout(18000)});
 return {r,t:await r.text()};
}
async function check(name,path,status,fn){
 try{
  const {r,t}=await get(path);
  assert.equal(r.status,status,'HTTP '+r.status+' expected '+status);
  if(fn)fn(t,r);
  results.passed.push(name);
 }catch(e){results.failures.push({name,error:String(e.message||e)})}
}
// Cloudflare's native GitHub deployment is eventually consistent with Pages build env changes.
let ready=false;
for(let i=0;i<16;i++){
 try{
  const [home,auth]=await Promise.all([get('/'),get('/api/auth-guard-v0135')]);
  ready=home.r.status===200&&home.t.includes('https://stock-market-from-the-ground-up-d1r.pages.dev/')
    &&auth.r.status===200&&JSON.parse(auth.t).sitekey===expectedSitekey;
  if(ready)break;
 }catch{}
 if(i!==15)await new Promise(r=>setTimeout(r,7000));
}
if(!ready)results.failures.push({name:'master configuration propagation',error:'Master canonical or Turnstile site key not deployed'});
for(const [name,path,match] of [
 ['homepage','/','The Stock Market: From the Ground Up'],
 ['store','/store','Memberships'],
 ['labs','/labs','419'],
 ['boot camp academy','/bootcamp-academy','Boot Camp Academy']
])await check(name,path,200,t=>assert.ok(t.includes(match),'Missing expected site content'));
await check('home canonical master domain','/',200,t=>{
 assert.match(t,/<link[^>]*rel=["']canonical["'][^>]*href=["']https:\/\/stock-market-from-the-ground-up-d1r\.pages\.dev\//i);
});
await check('sitemap master domain','/sitemap.xml',200,t=>{
 assert.ok(t.includes('<loc>'+origin+'/')); assert.ok(!t.includes(oldOrigin+'/'));
});
await check('robots sitemap master domain','/robots.txt',200,t=>{
 assert.ok(t.includes('Sitemap: '+origin+'/sitemap.xml'));
});
await check('Pages health','/api/runtime-health-v014259',200,t=>{
 const j=JSON.parse(t);assert.equal(j.ok,true);assert.equal(j.readOnly,true);
});
await check('Pages edge probe','/api/edge-probe-v014266',200,t=>{
 const j=JSON.parse(t);assert.equal(j.ok,true);
});
await check('new Turnstile site key only','/api/auth-guard-v0135',200,t=>{
 const j=JSON.parse(t);assert.equal(j.ok,true);assert.equal(j.enabled,true);
 assert.equal(j.sitekey,expectedSitekey);assert.equal(j.secret,undefined);
});
for(const path of ['/.git/config','/.mcp.json','/supabase/migrations/private.sql','/workers/billing-scheduler.js']){
 await check('private path hidden '+path,path,404);
}
for(const [path,code] of [['/api/gu39-stripe-webhook',405],['/api/stripe-live-webhook',405],
 ['/api/admin-prelive-v014247',401],['/api/owner-zero-live-checkout',401],
 ['/api/gu39-sandbox',401]]){
 await check('safe HTTP rejection '+path,path,code);
}
await check('zero-monthly LIVE QA closed','/api/store-zero-monthly-qa',200,t=>{
 const j=JSON.parse(t);assert.equal(j.available,false);assert.equal(j.offerClosed,true);
});
await check('public config excludes secret values','/config.js',200,t=>{
 for(const re of [/sb_secret_/i,/sk_live_/i,/sk_test_/i,/whsec_/i,/SUPABASE_SECRET_KEY\s*:/i])
  assert.doesNotMatch(t,re);
});
// Server credential is now present: the public advertising backend must read
// exactly the three approved package records without exposing payments.
await check('advertising Supabase integration (GET only)','/api/ad-sales',200,t=>{
 const j=JSON.parse(t);
 assert.equal(j.ok,true);
 assert.equal(j.onlineCheckoutEnabled,false);
 assert.equal(j.turnstileSiteKey,expectedSitekey);
 assert.equal(j.acceptingInquiries,true);
 assert.ok(Array.isArray(j.packages));
 assert.deepEqual(j.packages.map(p=>p.code).sort(),
  ['RESOURCE_SPONSOR','SECTION_SPONSOR','SITE_SPONSOR']);
 assert.ok(j.packages.every(p=>p.public_visible===true));
});
console.log(JSON.stringify({origin,passed:results.passed.length,blocked:results.blocked,
 failures:results.failures,livePaymentOperations:0},null,2));
if(results.failures.length)process.exitCode=1;
