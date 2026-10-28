import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=join(dirname(fileURLToPath(import.meta.url)),'..'),origin='https://crownlight-fixture.test';
const html=[
'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
'<link rel="stylesheet" href="/assets/css/crownlight-simulator-layout-v3.css">',
'<style>*{box-sizing:border-box}body{margin:0;background:#091121;color:#fff;font-family:system-ui;font-size:14px}#sim-content{max-width:1280px;margin:auto;padding:16px}.sim-layout{display:grid;grid-template-columns:1fr;gap:10px}.journal-card{padding:16px;border:1px solid #39456a;border-radius:12px}.sim-chart-panel{min-width:0}input,button,select{font:inherit}</style></head><body>',
'<div id="sim-content"><section class="journal-card journal-section"><h2>1. Load replay data</h2>',
'<div><label for="sim-lab-id">Historical Lab ID (optional)</label><input id="sim-lab-id"><input id="sim-ticker"><select id="sim-source"><option value="csv">CSV</option></select></div><div id="sim-load-msg"></div></section>',
'<section class="sim-layout journal-section"><div class="sim-chart-panel journal-card"><h2>Chart</h2><canvas id="sim-chart"></canvas></div>',
'<aside class="journal-card sim-side"><h2>2. Plan the trade</h2><input id="sim-shares" value="100"><input id="sim-stop">',
'<div class="sim-divider"></div><h2>3. Execute</h2><button id="sim-enter">Replay Enter</button></aside></section>',
'<section class="journal-card journal-section"><h2>4. Simulation metrics</h2><div id="sim-metrics">No trades yet</div></section></div>',
'<script src="/assets/js/crownlight-simulator-layout-v3.js"></script><script src="/assets/js/crownlight-paper-terminal-v1.js"></script></body></html>'
].join('');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const {width,entitlement} of [{width:390,entitlement:'free'},{width:900,entitlement:'interactive'},{width:1440,entitlement:'training'}]){
  const ctx=await browser.newContext({viewport:{width,height:850},locale:'en-US'});
  const page=await ctx.newPage(),errors=[];let posts=0;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin!==origin)return route.abort();
   if(u.pathname==='/fixture.html')return route.fulfill({status:200,contentType:'text/html',body:html});
   if(u.pathname==='/api/lab-release-availability')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    ok:true,publishedIds:['F1-C02-L01'],guidedBetaIds:['F2-C07-L01','SITE-021'],trainingOnlyIds:['SITE-021']
   })});
   if(u.pathname==='/api/member-tool-access'){
    const tool=u.searchParams.get('tool');
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
     ok:true,tool,authorized:entitlement==='training'?tool==='ONDEMAND_TRAINING':
      entitlement==='interactive'?tool==='INTERACTIVE_LEARNING':false,freeEligible:true
    })});
   }
   if(u.pathname==='/api/simulator-lab-context'){
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      ok:true,labId:u.searchParams.get('lab'),referenceDate:'2024-04-26',startTimeET:null,endTimeET:null,ticker:'GOOG',timeframe:null
    })});
   }
   if(u.pathname==='/api/alpaca-paper'){
    if(route.request().method()!=='GET'){posts++;return route.fulfill({status:500,body:'No fixture order'})}
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
     ok:true,mode:'ALPACA_PAPER_ONLY',account:{equity:'100000',buyingPower:'200000',cash:'90000',
      status:'ACTIVE',tradingBlocked:false,accountBlocked:false},positions:[],orders:[]})});
   }
   const file=join(root,u.pathname.slice(1));
   if(!file.startsWith(root+'/')||!existsSync(file))return route.fulfill({status:404,body:''});
   const type=extname(file)==='.css'?'text/css':extname(file)==='.js'?'application/javascript':'application/json';
   return route.fulfill({status:200,contentType:type,body:readFileSync(file)});
  });
  try{
   await page.goto(origin+'/fixture.html',{waitUntil:'load'});
   await page.evaluate((paid)=>{window.__canUsePaper=paid;
    window.CrownlightWorkbenchLayout.init({canUsePaper:window.__canUsePaper===true,getToken:async()=> 'mock-token'});
    window.CrownlightPaperTerminal.initialize({getSession:async()=>({access_token:'mock-token'})});
    window.confirm=()=>false;
   },entitlement!=='free');
   await page.waitForFunction(()=>document.querySelectorAll('#sim-lab-picker option[value^="lab:"]').length===419);
   assert.equal(await page.locator('#sim-lab-picker option[value^="lab:"]').count(),419);
   assert.equal(await page.locator('#sim-lab-picker option[value^="academy:free5"]').count(),5);
   const freeSample=page.locator('#sim-lab-picker option[value="lab:F1-C02-L01"]');
   const guidedCandidate=page.locator('#sim-lab-picker option[value="lab:F2-C07-L01"]');
   const siteOnly=page.locator('#sim-lab-picker option[value="lab:SITE-021"]');
   assert.equal(await freeSample.isDisabled(),false,'Free member has an eligible released sample');
   assert.equal(await guidedCandidate.isDisabled(),entitlement==='free');
   assert.equal(await siteOnly.isDisabled(),entitlement!=='training',
    'SITE-021 must require ONDEMAND_TRAINING, not standalone INTERACTIVE_LEARNING');
   assert.equal(await page.locator('#sim-lab-picker option[value^="lab:"]:disabled').count(),
    entitlement==='free'?418:entitlement==='interactive'?417:416);
   if(entitlement==='training'){
    await page.locator('.cl-lab-trigger').click();
    await page.locator('#cl-lab-search').fill('SITE-021');
    const option=page.locator('.cl-lab-option[data-value="lab:SITE-021"]');
    assert.equal(await option.isEnabled(),true);
    await option.click();
    assert.equal(await page.locator('#sim-lab-id').inputValue(),'SITE-021');
    await page.waitForFunction(()=>document.querySelector('.cl-lab-help')?.textContent?.includes('Lab reference date'));
    assert.match(await page.locator('.cl-lab-help').innerText(),/Lab reference date/);
    assert.match(await page.locator('.cl-selected-lab-link').getAttribute('href'),/lab-player.html\?lab=SITE-021/);
   }
   await page.locator('.cl-workbench-import summary').click();
   assert.equal(await page.locator('.cl-workbench-import').getAttribute('open'),null);
   await page.locator('.cl-collapse-btn').click();assert.equal(await page.locator('.sim-chart-panel').isVisible(),false);
   await page.locator('.cl-collapse-btn').click();assert.equal(await page.locator('.sim-chart-panel').isVisible(),true);
   await page.locator('#cl-tab-execute').click();assert.equal(await page.locator('#sim-enter').isVisible(),true);
   await page.locator('#cl-tab-metrics').click();assert.equal(await page.locator('#sim-metrics').isVisible(),true);
   if(entitlement==='free'){
    assert.equal(await page.locator('#cl-tab-paper').count(),0,'Free account must not expose paid Paper Trading tab');
   }else{
    await page.locator('#cl-tab-paper').click();
    await page.waitForFunction(()=>document.querySelector('#cl-paper-overview')?.textContent?.includes('100,000'));
    assert.match(await page.locator('#cl-paper-status').innerText(),/Connected/);
    await page.locator('#cl-paper-submit').click();assert.equal(posts,0);
   }
   assert((await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth))<=3);
   assert.deepEqual(errors,[],'No runtime errors: '+errors.join('|'));
   console.log('PASS Chart Studio workbench '+width+'px ('+entitlement+'): Free samples, SITE training entitlement, guided releases, collapse, tabs and paper');
  }finally{await ctx.close()}
 }
}finally{await browser.close()}
