/* Browser UX QA for free fictional Simulator — deterministic fixture only.
 * Real page and engine source rendered in Chromium; only auth/entitlement and
 * network dependencies are simulated, never a genuine member acceptance claim.
 */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,dirname,extname} from 'node:path';
import {chromium} from 'playwright';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const origin='https://simulator-fixture.test';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
async function scenario(width,kind='free'){
 const context=await browser.newContext({viewport:{width,height:Math.max(750,Math.round(width*.6))}});
 await context.addInitScript(({kind})=>{
  const user=kind==='guest'?null:{id:'00000000-0000-4000-8000-000000000123'};
  let signedIn=true;
  const authListeners=[];
  window.__qaSignOut=()=>{signedIn=false;for(const handler of authListeners)handler('SIGNED_OUT',null)};
  window.getSupabaseClient=async()=>({
   auth:{
    getUser:async()=>({data:{user:signedIn?user:null}}),
    getSession:async()=>({data:{session:signedIn&&user?{user,access_token:'fixture-only-not-real'}:null}}),
    onAuthStateChange:handler=>{authListeners.push(handler);return {data:{subscription:{unsubscribe(){}}}}}
   }
  });
 },{kind});
 const page=await context.newPage();const faults=[];
 page.on('pageerror',e=>faults.push(String(e.message||e)));
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url()),p=url.pathname;
  if(p==='/api/member-tool-access'){
   const reason=kind==='restricted'?'Account access is restricted. Contact support.':
    'An active plan or matching individual tool entitlement is required.';
   return route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({ok:true,authorized:false,freeEligible:kind==='free'||kind==='studio',tool:'MARKET_SIMULATOR',reason})});
  }
  if(p==='/api/chart-tier-access')
   return route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({ok:true,eligible:true,tier:'STANDARD',allowed:['STANDARD']})});
  if(p==='/api/chart-workspace')
   return route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({ok:true,tier:'STANDARD',workspace:{version:2,selected:'STANDARD',sync:true,studies:[],drawings:[]}})});
  if(['/assets/js/site.js','/assets/js/session-manager.js','/assets/js/supabase-client.js','/config.js'].includes(p))
   return route.fulfill({status:200,contentType:'application/javascript',body:'// mocked outside the Simulator for deterministic browser QA'});
  if(p==='/favicon.ico')return route.fulfill({status:404,body:''});
  const file=join(root,p.replace(/^\//,''));
  if(!file.startsWith(root+'/')||!existsSync(file))return route.fulfill({status:404,body:''});
  const ext=extname(file);
  return route.fulfill({status:200,contentType:ext==='.js'?'application/javascript':ext==='.css'?'text/css':ext==='.html'?'text/html':'text/plain',
   body:readFileSync(file)});
 });
 try{
  await page.goto(origin+'/simulator.html?'+(kind==='studio'?'studio=standard':'practice=free'),{waitUntil:'domcontentloaded',timeout:20000});
  if(kind==='free'||kind==='studio'){
   await page.waitForFunction(()=>document.querySelector('#sim-load-msg')?.textContent.includes('Loaded 36'),null,{timeout:8000}).catch(async error=>{
    const details=await page.evaluate(()=>({
      gate:document.querySelector('#sim-gate')?.textContent,
      visible:document.querySelector('#sim-content')?.hidden,
      loaded:document.querySelector('#sim-load-msg')?.textContent,
      free:window.GroundUpFreePracticeRequested,
      selected:document.querySelector('#sim-mode-csv')?.getAttribute('aria-pressed'),
      ready:document.readyState,
      inited:typeof SIM==='object'&&!!SIM.user,
      premium:typeof SIM==='object'?SIM.hasPremium:null,
      bars:typeof SIM==='object'?SIM.candles?.length:null,
      source:typeof SIM==='object'?SIM.sourceName:null,
      starter:typeof window.GroundUpFictionalSimulatorStarterV1?.generate,
      listener:typeof document.querySelector('#sim-load-fictional')?.onclick,
      sourceValue:document.querySelector('#sim-source')?.value,
      content:document.querySelector('#sim-content')?.outerHTML.slice(0,160)
    }));
    throw Error('Simulator fixture diagnostics: '+JSON.stringify({details,faults})+'; '+error.message);
   });
   assert.equal(await page.locator('#sim-legacy-mode').isVisible(),true);
   assert.equal(await page.locator('#sim-content').isVisible(),true);
   assert.match(await page.locator('#sim-load-msg').textContent(),/ORIGINAL FICTIONAL/);
   if(kind==='studio'){
    assert.equal(await page.locator('#cl-replay-import details.cl-workbench-import').evaluate(e=>e.open),false,
     'Studio direct link must keep source controls available but initially collapsed');
    assert.equal(await page.evaluate(()=>window.GroundUpStudioRequestedTier),'STANDARD');
    assert.equal(await page.evaluate(()=>window.CrownlightChartTiers?.getStatus().selected),'STANDARD');
    await page.locator('#cl-replay-import details.cl-workbench-import').evaluate(el=>el.open=true);
   }
   assert.equal(await page.locator('#sim-ticker').inputValue(),'GUSIM');
   assert.equal(await page.locator('#sim-source option[value="tiingo"]').isDisabled(),false,
    'Providers remain discoverable; server access is still denied without entitlement');
   await page.locator('#sim-source').selectOption('tiingo');
   assert.equal(await page.locator('#load-provider').isVisible(),true);
   assert.equal(await page.locator('#load-provider').isEnabled(),true);
   await page.locator('#load-provider').click();
   assert.match(await page.locator('#sim-load-msg').innerText(),/separate Market Simulator data access/i);
   assert.match(await page.locator('a[href="dashboard.html?tab=settings&section=connections"]').count().then(String),/^1$/);
   await page.locator('#sim-source').selectOption('csv');
   assert.equal(await page.locator('#sim-load-fictional').isEnabled(),true);
   const currentSummary=page.locator('#sim-candle-accessible');
   assert.match(await currentSummary.innerText(),/ORIGINAL FICTIONAL/);
   assert.match(await currentSummary.innerText(),/Open .*High .*Low .*Close .*Volume /);
   assert.match(await currentSummary.innerText(),/Revealed candle 5 of 36/);
   assert.equal(await page.locator('#sim-visible-bars tr').count(),5,'only the first five visible bars in text table');
   assert.equal(await page.locator('#sim-chart').getAttribute('aria-describedby'),'sim-candle-accessible');
   const initial=await page.locator('#sim-bar-time').innerText();
   assert(!/—/.test(initial),'fictional chart must render a timestamp');
   const next=page.locator('#sim-next');
   assert.equal(await next.isEnabled(),true,'next bar must be actionable in Free membership');
   await next.click();
   assert.notEqual(await page.locator('#sim-bar-time').innerText(),initial,'Next Bar must actually advance chart');
   assert.match(await currentSummary.innerText(),/Revealed candle 6 of 36/);
   assert.equal(await page.locator('#sim-visible-bars tr').count(),6,'newly revealed candle appears in table');
   assert.equal(await page.locator('#sim-visible-bars tr').last().locator('td').count(),5,'OHLCV table includes all accessible numerical fields');
   assert.match(await page.locator('#sim-context-note').innerText(),/NOT actual market history|Not actual market history/i);
   await page.locator('#sim-mode-server').click();
   assert.equal(await page.locator('#sim-server-mode').isVisible(),true);
   await page.locator('#sim-mode-csv').click();
   assert.equal(await page.locator('#sim-legacy-mode').isVisible(),true);
   assert.equal(await page.locator('#sim-next').isEnabled(),true);
   if(kind==='studio'){
    await page.evaluate(()=>window.__qaSignOut());
    await page.waitForFunction(()=>document.querySelector('#sim-content')?.hidden===true && SIM.candles.length===0);
    assert.equal(await page.locator('#sim-content').isVisible(),false,'Previous member Simulator controls must be hidden');
    assert.equal(await page.evaluate(()=>window.CrownlightChartTiers.getStatus().revealed),0,'Tier cache must lose prior member bars');
    assert.match(await page.locator('#sim-gate').innerText(),/session changed/i);
   }
   console.log('PASS '+width+'px '+kind+' member loaded 36 fictional bars and advanced chart with provider gated.');
  }else if(kind==='restricted'){
   await page.waitForFunction(()=>document.querySelector('#sim-gate')?.textContent.includes('not eligible'),{timeout:15000});
   assert.equal(await page.locator('#sim-content').isVisible(),false);
   console.log('PASS restricted member: no free practice inheritance.');
  }else if(kind==='guest'){
   await page.waitForFunction(()=>document.querySelector('#sim-gate')?.textContent.includes('Sign in to use'),{timeout:15000});
   assert.equal(await page.locator('#sim-content').isVisible(),false);
   console.log('PASS guest: sign in required, no member practice.');
  }
  assert.deepEqual(faults,[],'Unexpected browser exception '+width+' '+kind);
 }finally{await context.close()}
}
try{
 for(const width of [390,900,1280,1440])await scenario(width,'free');
 await scenario(1280,'studio');
 await scenario(1280,'restricted');
 await scenario(390,'guest');
}finally{await browser.close()}
