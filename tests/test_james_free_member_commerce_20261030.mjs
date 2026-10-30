/* James_Test authenticated Free baseline: real production browser, read-only.
 * Never purchases, writes reflections, creates brokerage orders, bypasses CAPTCHA,
 * redeems Lumens, changes roles, or exposes credentials.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const site='https://stock-market-from-the-ground-up-d1r.pages.dev';
const email=process.env.LAB_QA_EMAIL||'',password=process.env.LAB_QA_PASSWORD||'';
const expected='f42f9301-18e6-43a3-8531-32d371fd22c1';
const passed=[],failures=[];
function ok(check){passed.push(check);console.log('PASS '+check)}
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 assert(email&&password,'Existing encrypted QA login secrets required; no CAPTCHA bypass');
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:800}});
 const page=await context.newPage();
 const signin=await page.goto(site+'/signin.html',{waitUntil:'domcontentloaded',timeout:30000});
 assert.equal(signin.status(),200);
 const gate=await page.request.get(site+'/api/auth-guard-v0135');
 const info=await gate.json();
 assert.equal(info.enabled,false,'Human CAPTCHA enabled; stop rather than bypass');
 await page.locator('#login-identifier').fill(email);
 await page.locator('#login-password').fill(password);
 await page.locator('.auth-card button[type="submit"]').click();
 await page.waitForURL(url=>new URL(url).pathname==='/dashboard.html',{timeout:30000});
 let auth=await page.evaluate(async()=>{const c=await window.getSupabaseClient();const r=await c.auth.getSession();
  return {token:r.data?.session?.access_token||'',user:r.data?.session?.user?.id||''}});
 assert.equal(auth.user,expected,'Unrecognized account: refuse access testing');
 assert(auth.token.length>50);
 ok('Real password-authenticated James_Test reached Dashboard');
 const get=async pathname=>{const r=await page.request.get(site+pathname,
   {headers:{authorization:'Bearer '+auth.token},timeout:30000});
  const b=await r.json().catch(()=>({}));
  return {status:r.status(),body:b}};
 for(const tool of ['MARKET_SIMULATOR','ONDEMAND_TRAINING','INTERACTIVE_LEARNING','JOURNAL_ANALYTICS','MARKET_TUTOR']){
  const r=await get('/api/member-tool-access?tool='+tool);
  assert.equal(r.status,200,tool+' service availability');
  assert.equal(r.body.freeEligible,true,tool+' Free eligibility');
  assert.equal(r.body.authorized,false,tool+' premium denial');
  ok(tool+' premium entitlement denied, Free eligibility preserved');
 }
 const chart=await get('/api/chart-tier-access');
 assert.equal(chart.status,200);
 assert.equal(chart.body.tier,'STANDARD','Free cannot receive Advanced/Professional Chart Studio');
 assert.deepEqual(chart.body.allowed,['STANDARD']);
 ok('Chart Studio STANDARD only; premium tiers denied');
 const watchlist=await get('/api/free-watchlist');
 assert.equal(watchlist.status,200);
 assert.equal(watchlist.body.ok,true);
 assert.equal(watchlist.body.limit,20);
 assert(Array.isArray(watchlist.body.entries)&&watchlist.body.entries.length<=20);
 ok('Private Free research watchlist read, 20-symbol boundary');
 // Member account, avatar/profile, consent, Lumens, chart workspace and
 // notifications are read-only here. Do not mutate or overwrite James's
 // existing higher-tier saved workspace.
 for(const [path,label] of [
  ['/api/member-profile','Member profile / avatar identity'],
  ['/api/account?action=consent','Account consent preferences'],
  ['/api/member-sparks-balance','Crownlight Lumens navigation balance'],
  ['/api/member-sparks-wallet','Private Crownlight Lumens wallet'],
  ['/api/community-notification-preferences','Community notifications'],
  ['/api/chart-workspace','Protected Free Chart Studio workspace projection']
 ]){
  const current=await get(path);
  assert.equal(current.status,200,label+' service status');
  assert.equal(current.body.ok,true,label+' response contract');
  ok(label+' opens for the genuine Free member');
 }
 const publicCatalog=await get('/api/storefront-public-catalog');
 assert.equal(publicCatalog.status,200);
 assert.equal(publicCatalog.body.ok,true);
 assert(Array.isArray(publicCatalog.body.items));
 ok('Public Store catalog returns a valid first-party item list');
 const free=await get('/api/bootcamp-academy?program=free5');
 assert.equal(free.status,200);
 assert.equal(free.body.ok,true);
 assert.equal(free.body.program?.code,'free5');
 assert.equal(free.body.curriculum?.length,5);
 ok('Free Foundations five lessons available through real member API');
 const labProbe=await get('/api/lab-content?id=F1-C02-L02');
 assert([403,404].includes(labProbe.status),'Free Lab boundary returned '+labProbe.status);
 ok('Private non-sample Lab correctly restricts Free member without HTTP 503');
 const anon=await page.request.get(site+'/api/free-watchlist',{timeout:30000});
 assert([401,403].includes(anon.status()),'Anonymous users must not read member watchlist');
 ok('Anonymous watchlist denied');
 const store=await page.goto(site+'/store.html',{waitUntil:'domcontentloaded',timeout:30000});
 assert.equal(store.status(),200);
 assert.match(await page.title(),/Store/i);
 ok('Store opens during real authenticated Free session');
 await page.goto(site+'/dashboard.html',{waitUntil:'domcontentloaded',timeout:30000});
 const still=await page.evaluate(async()=>{const c=await window.getSupabaseClient();return (await c.auth.getSession()).data?.session?.user?.id});
 assert.equal(still,expected);
 ok('Member login survives navigation to Store and back');
 console.log('JAMES_FREE_QA '+JSON.stringify({passed:passed.length,failures:0,noPayments:true,readOnly:true}));
 await context.close();
}catch(e){
 failures.push(String(e.message||e).slice(0,550));
 console.error('FAIL/BLOCKED '+failures[0]);
 console.log('JAMES_FREE_QA '+JSON.stringify({passed:passed.length,failures,readOnly:true}));
 process.exitCode=1;
}finally{await browser.close()}
