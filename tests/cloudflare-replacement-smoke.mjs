/* Cloudflare account replacement smoke verification.
 * Read-only, zero payment operations, no credentials. Intended for GitHub Actions.
 * Network tests do not stand in for authenticated Admin/member acceptance.
 */
import assert from 'node:assert/strict';

const site=(process.env.REPLACEMENT_ORIGIN||'https://stock-market-from-the-ground-up-lives.pages.dev').replace(/\/$/,'');
if(site!=='https://stock-market-from-the-ground-up-lives.pages.dev'){
  throw Error('Replacement origin must be the approved production Pages hostname.');
}
const passed=[],blocked=[],failures=[];
async function get(path) {
  const u=new URL(path,site);
  if(u.origin!==site)throw Error('Unexpected offsite URL');
  const response=await fetch(u.href,{method:'GET',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{accept:'*/*'}});
  return {response,body:await response.text()};
}
async function check(name,path,expected,verify=()=>{}) {
  try {
    const {response,body}=await get(path);
    assert.equal(response.status,expected,'HTTP '+response.status+' (expected '+expected+')');
    verify(body,response);
    passed.push(name);
  }catch(e){failures.push({name,message:String(e.message||e)});}
}
for(const [name,path,text] of [
  ['homepage','/','The Stock Market: From the Ground Up'],
  ['store','/store.html','Memberships'],
  ['lab registry','/labs.html','419'],
  ['boot camp academy','/bootcamp-academy.html','Boot Camp Academy']
]){
  await check(name,path,200,body=>assert.ok(body.includes(text),'Expected page text missing'));
}
await check('canonical hostname','/',200,body=>{
  assert.match(body,/<link[^>]*rel=["']canonical["'][^>]*href=["']https:\/\/stock-market-from-the-ground-up-lives\.pages\.dev\//i);
});
await check('robots sitemap hostname','/robots.txt',200,body=>{
  assert.ok(body.includes('Sitemap: '+site+'/sitemap.xml'));
});
await check('sitemap canonical origin','/sitemap.xml',200,body=>{
  assert.ok(body.includes('<loc>'+site+'/'));
  assert.ok(!body.includes('https://stock-market-from-the-ground-up.pages.dev/'),'Old account present in new sitemap');
});
await check('Pages Functions read-only health','/api/runtime-health-v014259',200,body=>{
  const j=JSON.parse(body);assert.equal(j.ok,true);assert.equal(j.readOnly,true);
});
await check('Pages Functions edge route','/api/edge-probe-v014266',200,body=>{
  const j=JSON.parse(body);assert.equal(j.ok,true);assert.equal(j.route,'api');
});
await check('Turnstile public configuration','/api/auth-guard-v0135',200,body=>{
  const j=JSON.parse(body);assert.equal(j.ok,true);assert.equal(j.enabled,true);
  assert.match(j.sitekey,/^0x[A-Za-z0-9]+$/);
  assert.equal(j.secret,undefined,'A secret was exposed by public auth config');
});
for(const file of ['/.git/config','/.mcp.json','/supabase/migrations/private.sql','/workers/billing-scheduler.js']) {
  await check('private assets not public '+file,file,404);
}
await check('Stripe TEST webhook rejects GET','/api/gu39-stripe-webhook',405);
await check('Stripe LIVE webhook rejects GET (not a payment test)','/api/stripe-live-webhook',405);
await check('public config has no server keys','/config.js',200,body=>{
  for(const re of [/sb_secret_/i,/sk_live_/i,/sk_test_/i,/whsec_/i,/SUPABASE_SECRET_KEY\s*:/i]){
    assert.doesNotMatch(body,re);
  }
});
try{
  const {response,body}=await get('/api/ad-sales');
  if(response.status===503)blocked.push('advertising API returns 503; server-side Supabase secret not fully installed');
  else if(response.status===200) {
    const j=JSON.parse(body);
    assert.equal(j.onlineCheckoutEnabled,false,'Unexpected online advertising checkout');
    passed.push('advertising public read-only response');
  }else failures.push({name:'advertising API',message:'Unexpected HTTP '+response.status});
}catch(e){failures.push({name:'advertising API',message:String(e.message||e)})}
console.log(JSON.stringify({origin:site,passed:passed.length,blocked,failures},null,2));
if(failures.length)process.exitCode=1;
