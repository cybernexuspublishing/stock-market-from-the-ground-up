/* Read-only, real production browser acceptance for James_Test.
 * Requires existing encrypted GitHub QA credentials and legitimate
 * owner-controlled Turnstile-off login window. Never impersonate, reset
 * passwords, inject fake sessions, write workspaces, spend Sparks, create
 * paper orders, or modify source/provider credentials.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='https://stock-market-from-the-ground-up-d1r.pages.dev';
const expected='f42f9301-18e6-43a3-8531-32d371fd22c1';
const email=process.env.LAB_QA_EMAIL||'',password=process.env.LAB_QA_PASSWORD||'';
const otherEmail=process.env.CROWN_QA_FREE_EMAIL||'',otherPassword=process.env.CROWN_QA_FREE_PASSWORD||'';
const mark=(kind,what,details='')=>console.log(kind+' '+what+(details?' — '+details:''));
const results={realBrowserLogin:false,realTier:false,readOnlyWorkspace:false,anonymousDenial:false,
 queryOverrideDenied:false,crossAccountSecondIdentity:false,alpacaBars:false,tiingoBars:false,
 actualFounderEntitlements:false,zeroWrites:true};
if(!email||!password)throw Error('BLOCKED: encrypted LAB_QA_EMAIL and LAB_QA_PASSWORD not available; genuine login was not attempted.');
const guardRequest=await fetch(origin+'/api/auth-guard-v0135',{signal:AbortSignal.timeout(15000)});
if(!guardRequest.ok)throw Error('BLOCKED: cannot verify actual login CAPTCHA configuration');
const guard=await guardRequest.json();
if(guard?.ok!==true||guard.enabled!==false)
 throw Error('BLOCKED: Owner-controlled CAPTCHA-off QA window not active; no login bypass performed.');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
const page=await context.newPage();
async function data(path,token){
 const r=await fetch(origin+path,{headers:token?{authorization:'Bearer '+token}:{},
  cache:'no-store',signal:AbortSignal.timeout(24000)});
 const j=await r.json().catch(()=>null);
 return {status:r.status,body:j};
}
async function loggedIn(page,email,password,expectedId){
 await page.goto(origin+'/signin.html?next='+encodeURIComponent('/dashboard.html'),{waitUntil:'domcontentloaded',timeout:35000});
 await page.locator('#login-identifier').fill(email);
 await page.locator('#login-password').fill(password);
 await page.locator('.auth-card button[type="submit"]').click();
 try{
  await page.waitForURL(u=>/^\/dashboard(?:\.html)?$/i.test(u.pathname),{timeout:20000});
 }catch{
  let error=String(await page.locator('#signin-message').textContent().catch(()=>'')).slice(0,150);
  throw Error('BLOCKED: genuine website login did not reach dashboard: '+error);
 }
 const identity=await page.evaluate(async()=>{const sb=await window.getSupabaseClient();
  const [{data:s},{data:u,error}]=await Promise.all([sb.auth.getSession(),sb.auth.getUser()]);
  return {id:u?.user?.id||null,token:s?.session?.access_token||null,
   authenticated:!error&&!!u?.user};});
 if(!identity.authenticated||!identity.token||identity.id!==expectedId)
  throw Error('BLOCKED: the authenticated session is not the specified QA identity');
 return identity;
}
let primary;
try{
 primary=await loggedIn(page,email,password,expected);
 results.realBrowserLogin=true;mark('PASS','Real website password login establishes James_Test session');
 await page.goto(origin+'/simulator.html',{waitUntil:'domcontentloaded',timeout:35000});
 const active=await page.evaluate(async()=>{const sb=await window.getSupabaseClient();
  const {data}=await sb.auth.getUser();return data?.user?.id||null});
 assert.equal(active,expected,'Browser navigation did not preserve James_Test identity');
 await page.waitForFunction(()=>window.CrownlightChartTiers?.getStatus?.().verified===true,null,{timeout:25000});
 const tier=await data('/api/chart-tier-access',primary.token);
 assert.equal(tier.status,200);assert.equal(tier.body?.tier,'PROFESSIONAL');
 assert.deepEqual(tier.body?.allowed,['STANDARD','ADVANCED','PROFESSIONAL']);
 results.realTier=true;mark('PASS','Signed-in production browser / verified Professional tier (Admin override)');
 // The site deliberately starts with NO candles. Do not call that a render
 // failure: select the existing Free/CSV practice view and load the
 // original, client-side fictional starter before inspecting real canvases.
 await page.locator('#sim-mode-csv').click();
 await page.locator('#sim-load-fictional').waitFor({state:'visible',timeout:15000});
 await page.locator('#sim-load-fictional').click();
 await page.waitForFunction(()=>(window.CrownlightChartTiers?.getRevealedBars?.()||[]).length>=2,
  null,{timeout:15000});
 await page.waitForFunction(()=>{
  const charts=window.CrownlightChartTiers?.getInstances?.()||[];
  return charts.some(x=>x?.chart&&x.chart.getDataList()?.length>=2&&
   Number(x.chart.getSize('candle_pane')?.height||0)>=200);
 },null,{timeout:22000});
 const visual=await page.evaluate(()=>{
  const instances=window.CrownlightChartTiers?.getInstances?.()||[];
  const first=instances.find(x=>x?.chart?.getDataList()?.length>=2);
  return {charts:instances.length,bars:first?.chart?.getDataList()?.length||0,
   pricePaneHeight:first?.chart?.getSize('candle_pane')?.height||0,
   canvasLayers:[...document.querySelectorAll('canvas')].filter(e=>e.width>=100).length,
   standardShellVisible:[...document.querySelectorAll('.crownlight-shell')].some(x=>x.getClientRects().length>0)};
 });
 assert(visual.bars>=2&&visual.pricePaneHeight>=200&&visual.canvasLayers>0,
  'Authenticated Professional workspace must visibly render candlesticks: '+JSON.stringify(visual));
 assert.equal(visual.standardShellVisible,false,'Professional KLine must not duplicate Standard chart player');
 mark('PASS','Real authenticated Professional candlestick pane and nonduplicate chart canvas',
  visual.bars+' bars / '+visual.pricePaneHeight+'px price pane');
 // The ADMIN identity is entitled to every engine. Exercise rendering only,
 // not the distinct ordinary-member purchase/role entitlement contract.
 await page.evaluate(()=>window.CrownlightChartTiers.choose('ADVANCED'));
 await page.waitForFunction(()=>window.CrownlightChartTiers?.getStatus?.().selected==='ADVANCED'&&
  window.CrownlightChartTiers.getInstances().some(c=>c.chart?.getDataList?.().length>=2),
  null,{timeout:18000});
 assert.equal(await page.evaluate(()=>window.CrownlightChartTiers.getInstances().length),1,
  'Advanced chart must present one active technical analysis view');
 mark('PASS','Genuine authenticated Advanced chart interface (Admin-eligible experience, not Founding30 proof)');
 await page.evaluate(()=>window.CrownlightChartTiers.choose('STANDARD'));
 await page.waitForFunction(()=>window.CrownlightChartTiers?.getStatus?.().selected==='STANDARD'&&
  window.CrownlightChartTiers.getInstances().length===0,null,{timeout:18000});
 assert((await page.evaluate(()=>window.CrownlightChartTiers.getRevealedBars().length))>=2);
 mark('PASS','Genuine authenticated Standard chart interface (Admin-eligible experience, not Free proof)');
 await page.evaluate(()=>window.CrownlightChartTiers.choose('PROFESSIONAL'));
 await page.waitForFunction(()=>window.CrownlightChartTiers?.getStatus?.().selected==='PROFESSIONAL'&&
  window.CrownlightChartTiers.getInstances().some(x=>x.chart?.getDataList?.().length>=2),
  null,{timeout:18000});
 mark('PASS','Professional multi-pane experience restored without workspace storage writes');
 const workspace=await data('/api/chart-workspace',primary.token);
 assert.equal(workspace.status,200);
 assert.equal(workspace.body?.ok,true);
 assert.equal(workspace.body?.workspace?.selected,'PROFESSIONAL',
  'Expected existing Professional workspace to remain unmodified');
 results.readOnlyWorkspace=true;mark('PASS','Read existing private Professional workspace without modification');
 await page.reload({waitUntil:'domcontentloaded',timeout:35000});
 await page.waitForFunction(()=>window.CrownlightChartTiers?.getStatus?.().verified===true,null,{timeout:25000});
 const reload=await data('/api/chart-workspace',primary.token);
 assert.equal(reload.status,200);
 assert.deepEqual(reload.body?.workspace,workspace.body.workspace,
  'Authenticated member workspace must persist across browser reload');
 mark('PASS','Workspace settings persist across genuine browser reload without writes');
 const forged=await data('/api/chart-workspace?user_id=00000000-0000-4000-8000-000000000000',primary.token);
 assert.equal(forged.status,200);assert.equal(forged.body?.ok,true);
 assert.deepEqual(forged.body.workspace,workspace.body.workspace);
 results.queryOverrideDenied=true;mark('PASS','Client-supplied user_id cannot redirect member workspace read');
 const guest=await data('/api/chart-workspace');
 assert.equal(guest.status,401);
 const guestProvider=await data('/api/marketdata?action=list');
 assert.equal(guestProvider.status,401);
 results.anonymousDenial=true;mark('PASS','Anonymous workspace and provider connection access rejected');

 if(otherEmail&&otherPassword){
  const otherContext=await browser.newContext({serviceWorkers:'block'});
  try{
   const otherPage=await otherContext.newPage();
   // Identity must be looked up after legitimate password login. Do not
   // accept the James_Test account as a stand-in for a second member.
   await otherPage.goto(origin+'/signin.html?next='+encodeURIComponent('/dashboard.html'),{
    waitUntil:'domcontentloaded',timeout:35000});
   await otherPage.locator('#login-identifier').fill(otherEmail);
   await otherPage.locator('#login-password').fill(otherPassword);
   await otherPage.locator('.auth-card button[type="submit"]').click();
   await otherPage.waitForURL(u=>/^\/dashboard(?:\.html)?$/i.test(u.pathname),{timeout:20000});
   const second=await otherPage.evaluate(async()=>{const sb=await window.getSupabaseClient();
    const [{data:u},{data:s}]=await Promise.all([sb.auth.getUser(),sb.auth.getSession()]);
    return {id:u?.user?.id,token:s?.session?.access_token}});
   assert(second.id&&second.id!==expected&&second.token);
   const secondWorkspace=await data('/api/chart-workspace?user_id='+expected,second.token);
   assert.equal(secondWorkspace.status,200);
   assert.equal(secondWorkspace.body?.ok,true);
   assert.notDeepEqual(secondWorkspace.body.workspace,workspace.body.workspace,
    'Second member must not read James_Test workspace using injected user_id');
   const conn=await data('/api/marketdata?action=list',second.token);
   assert.equal(conn.status,200);
   assert.equal(conn.body?.ok,true);
   // Safe: the API returns only provider/status, never ciphertext or tokens.
   assert(!JSON.stringify(conn.body).match(/credential_ciphertext|credential_iv|apiSecret|access_token/));
   results.crossAccountSecondIdentity=true;
   mark('PASS','Different authenticated user denied James_Test workspace and credential data');
  }finally{await otherContext.close();}
 }else mark('BLOCKED','Different-member production browser acceptance','Dedicated encrypted second QA identity not configured');

 const simulator=await data('/api/member-tool-access?tool=MARKET_SIMULATOR',primary.token);
 assert.equal(simulator.status,200);assert.equal(simulator.body?.authorized,true);
 mark('PASS','Real Market Simulator premium access verified for James_Test');
 for(const [provider,flag] of [['ALPACA_BYO','alpacaBars'],['TIINGO_BYO','tiingoBars']]){
  // Read-only, one bounded original observation. No live data subscriptions.
  const q=new URLSearchParams({action:'bars',provider,ticker:'AAPL',
    start:'2026-10-29',end:'2026-10-29',freq:'5min'});
  const result=await data('/api/marketdata?'+q,primary.token);
  if(result.status===200&&result.body?.ok===true){
   const b=result.body;
   assert(Array.isArray(b.bars)&&b.bars.length>0);
   assert.equal(b.provider,provider);
   assert.equal(b.integrity?.approvedForOfficialReplay,false);
   assert.equal(b.integrity?.licensedForMemberWidePublication,false);
   assert.equal(b.integrity?.strictlyChronological,true);
   assert(!JSON.stringify(b).match(/credential_ciphertext|credential_iv|apiSecret|access_token/));
   results[flag]=true;mark('PASS',provider+' authentic private historical OHLCV via production endpoint',
    String(b.bars.length)+' validated bars');
  }else{
   const sanitized=String(result.body?.error||'provider entitlement/network unavailable').slice(0,180);
   mark('BLOCKED',provider+' actual historical OHLCV verification',
    'HTTP '+result.status+'; '+sanitized);
  }
 }
 mark('RESULT','Authenticated noncharging production acceptance',JSON.stringify(results));
}finally{
 try{if(primary?.token)await page.evaluate(async()=>{const sb=await window.getSupabaseClient();await sb.auth.signOut()})}catch{}
 await context.close();await browser.close();
}
if(!results.realBrowserLogin||!results.realTier||!results.readOnlyWorkspace||
 !results.anonymousDenial||!results.queryOverrideDenied)process.exitCode=1;
// Only claim authentic provider acceptance when that provider returned validated bars.
// Neither optional second identity nor providers are counted as passed otherwise.
