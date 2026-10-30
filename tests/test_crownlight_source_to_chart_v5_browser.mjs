/* Actual Market Simulator + Chart Studio verification bridge in Chromium.
 * Synthetic private network fixtures; no provider requests, Spark spend or order.
 */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const origin='https://crownlight-v5-handoff-fixture.test';
const html=readFileSync(join(root,'simulator.html'),'utf8')
 .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const bars=[
 {timestamp:'2024-05-07T13:30:00Z',open:185,high:186,low:184,close:185.5,volume:1200},
 {timestamp:'2024-05-07T13:31:00Z',open:185.5,high:187,low:185,close:186.5,volume:1800},
 {timestamp:'2024-05-07T13:32:00Z',open:186.5,high:188,low:186,close:187,volume:2200}
];
const payload={ok:true,ticker:'AAPL',provider:'TIINGO_BYO',bars,
 integrity:{feed:'TIINGO_PERSONAL_ACCOUNT',strictlyChronological:true,
 feedCompletenessVerified:false,licensedForMemberWidePublication:false,
 approvedForOfficialReplay:false,observations:3,
 firstTimestamp:bars[0].timestamp,lastTimestamp:bars.at(-1).timestamp}};
const json=obj=>({contentType:'application/json',body:JSON.stringify(obj)});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1560,height:900}});
 let marketCalls=0,entitlementCalls=0,authorized=true;
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin!==origin)return route.abort();
  if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
  if(url.pathname==='/api/member-tool-access'){
   entitlementCalls++;
   return route.fulfill(json({ok:true,authorized,freeEligible:true}));
  }
  if(url.pathname==='/api/chart-tier-access')
   return route.fulfill(json({ok:true,eligible:true,tier:'PROFESSIONAL',
    allowed:['STANDARD','ADVANCED','PROFESSIONAL'],reason:'Noncommercial test membership'}));
  if(url.pathname==='/api/chart-workspace')
   return route.fulfill(json({ok:true,workspace:{layout:'SIDE_BY_SIDE',selected:'STANDARD',sync:true},
    updatedAt:'2026-10-30T00:00:00Z'}));
  if(url.pathname==='/api/member-sparks-chart')
   return route.fulfill(json({ok:true,offers:[],passes:[]}));
  if(url.pathname==='/api/marketdata'&&url.searchParams.get('action')==='list')
   return route.fulfill(json({ok:true,connections:[{provider_code:'TIINGO_BYO',status:'connected'}]}));
  if(url.pathname==='/api/marketdata'&&url.searchParams.get('action')==='bars'){
   marketCalls++;
   assert.equal(url.searchParams.get('ticker'),'AAPL');
   assert.equal(url.searchParams.get('start'),'2024-05-07');
   return route.fulfill(json(payload));
  }
  if(url.pathname.startsWith('/api/'))return route.fulfill({status:403,...json({ok:false,error:'Denied'})});
  const filename=resolve(root,url.pathname.slice(1));
  if(!filename.startsWith(root+'/')||!existsSync(filename))
   return route.fulfill({status:404,body:'Not found'});
  return route.fulfill({contentType:extname(filename)==='.css'?'text/css':
   extname(filename)==='.js'?'application/javascript':'text/plain',body:readFileSync(filename)});
 });
 await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
 await page.evaluate(id=>{
  document.getElementById('sim-legacy-mode').hidden=false;
  document.getElementById('sim-server-mode').hidden=true;
  const sb={auth:{
   getUser:async()=>({data:{user:{id}}}),
   getSession:async()=>({data:{session:{user:{id},access_token:'member-test-token'}}}),
   onAuthStateChange:fn=>{window.__chartV5AuthChange=fn;return {data:{subscription:{unsubscribe(){}}}}}
  }};
  window.getSupabaseClient=async()=>sb;
 },uid);
 for(const name of [
  'assets/js/crownlight-simulator-layout-v3.js',
  'assets/js/crownlight-data-source-integrity-v3.js',
  'assets/js/simulator.js',
  'assets/js/crownlight-studio-acceptance-v4.js'
 ])await page.addScriptTag({path:join(root,name)});
 await page.evaluate(()=>dispatchEvent(new Event('groundup:activate-legacy-simulator')));
 await page.waitForFunction(()=>window.GroundUpSimulatorMemberReadyV1===true&&
  !document.getElementById('sim-content').hidden);
 const panel=page.locator('#cl-studio-acceptance-v4');
 await panel.locator('#cl-studio-check-v4').click();
 await panel.getByText(/4 of 4 independent read-only checks/).waitFor();
 assert.match(await panel.locator('#cl-studio-check-results-v4').innerText(),
  /saved chart interface STANDARD \(separate from membership entitlement\)/);
 assert.equal(marketCalls,0,'Basic readiness cannot request paid personal candles');
 await panel.locator('#cl-studio-sample-v4').click();
 await panel.getByText(/Historical response validated: 3 chronological bars/).waitFor();
 assert.equal(marketCalls,1);
 assert.equal(await page.evaluate(()=>SIM.candles.length),0,'Preview must not alter the chart');
 assert.equal(await panel.locator('#cl-studio-import-v5').isVisible(),true);
 const blank=await page.evaluate(()=>{
  const el=document.createElement('div');
  el.className='crownlight-plot';
  document.querySelector('.sim-chart-panel').append(el);
  return {height:el.getBoundingClientRect().height,waiting:
   document.querySelector('.sim-chart-panel').classList.contains('sim-awaiting-data')};
 });
 assert(blank.waiting&&blank.height<=150,
  'Unloaded chart is bounded and cannot occupy an empty multi-screen viewport: '+JSON.stringify(blank));
 // Real server-side entitlement can change after an already permitted preview.
 authorized=false;
 await panel.locator('#cl-studio-import-v5').click();
 await panel.getByText(/Chart import not completed: Current Market Simulator provider entitlement/).waitFor();
 assert.equal(await page.evaluate(()=>SIM.candles.length),0);
 assert.equal(marketCalls,1,'Denied import must not make another paid data-source request');
 authorized=true;
 await panel.locator('#cl-studio-import-v5').click();
 await panel.getByText(/Loaded 3 personal historical bars into ungraded Chart Studio/).waitFor();
 assert.equal(await page.evaluate(()=>SIM.candles.length),3);
 assert.equal(await page.evaluate(()=>SIM.sourceProvider),'tiingo_byo');
 assert.equal(await page.evaluate(()=>SIM.index),2);
 assert.equal(await page.evaluate(()=>SIM.originalFictional),false);
 assert.equal(await page.evaluate(()=>document.querySelector('.sim-chart-panel')
   .classList.contains('sim-awaiting-data')),false);
 assert.equal(marketCalls,1,'Imported preview must reuse previously authorized private response');
 assert(entitlementCalls>=3,'Import independently rechecks Simulator entitlement');
 // A locked plan cannot be replaced by another preview, even if API is still valid.
 await page.evaluate(()=>{SIM.planLocked=true});
 await panel.locator('#cl-studio-sample-v4').click();
 await panel.getByText(/Historical response validated: 3 chronological bars/).waitFor();
 await panel.locator('#cl-studio-import-v5').click();
 await panel.getByText(/A saved or active Simulator plan must not be replaced/).waitFor();
 assert.equal(await page.evaluate(()=>SIM.candles.length),3,'Denied import must preserve active chart');
 assert.deepEqual(errors,[],'No browser JS errors: '+errors.join('; '));
 console.log('PASS Chart Studio V5: verified private preview, no auto import, independent entitlement recheck, no second Tiingo hit, bounded blank chart, explicit ungraded replay handoff, plan protection');
}finally{await browser.close();}
