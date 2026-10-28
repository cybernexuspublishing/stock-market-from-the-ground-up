/* Crownlight Simulator display density: real offline Chromium and actual CSS.
 * No changes to browser zoom, market data, account, or paid entitlements. */
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {join,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const origin='https://sim-density.test';
const html=[
'<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1">',
'<link rel="stylesheet" href="/assets/css/styles.css">',
'<link rel="stylesheet" href="/assets/css/journal.css">',
'<link rel="stylesheet" href="/assets/css/simulator.css">',
'<link rel="stylesheet" href="/assets/css/crownlight-chart-studio-v2.css">',
'<link rel="stylesheet" href="/assets/css/crownlight-simulator-layout-v3.css">',
'<link rel="stylesheet" href="/assets/css/crownlight-simulator-density-v1.css">',
'<script defer src="/assets/js/crownlight-simulator-layout-v3.js"></script></head><body>',
'<main class="section"><div class="wrap"><h1>Market Simulator</h1><div class="eyebrow">Educational replay</div>',
'<p class="journal-subtitle">Replay private historical observations</p>',
'<div id="sim-legacy-mode"><div id="sim-content">',
'<section class="journal-card journal-section"><h2>1. Load replay data</h2>',
'<div class="sim-import-grid"><div><label>Ticker</label><input value="AAPL"></div></div></section>',
'<section class="sim-layout"><div class="sim-chart-panel crownlight-active journal-card">',
'<div class="sim-chart-head"><h2>Advanced Chart Studio</h2></div>',
'<div class="crownlight-shell"><div class="crownlight-toolbar">Tools</div>',
'<div class="crownlight-plot"><canvas width="320" height="200"></canvas></div></div></div>',
'<aside class="sim-side journal-card"><h2>2. Plan the trade</h2><p>Trade planning</p>',
'<div class="sim-divider"></div><h2>3. Execute</h2></aside></section>',
'<section class="journal-card journal-section"><h2>4. Simulation metrics</h2><div id="sim-metrics"></div></section>',
'</div></div></div></main>',
'<script>addEventListener("DOMContentLoaded",()=>window.CrownlightWorkbenchLayout.init())</script></body></html>'
].join('');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url);
  if(u.origin!==origin)return route.abort();
  if(u.pathname==='/')return route.fulfill({status:200,contentType:'text/html',body:html});
  const path=join(root,u.pathname.slice(1)),ext=extname(path);
  assert(path.startsWith(root+'/'),'No traversal outside fixture');
  if(!existsSync(path))return route.fulfill({status:404,body:'Not found'});
  return route.fulfill({status:200,contentType:ext==='.css'?'text/css':'application/javascript',body:readFileSync(path)});
 });
 await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('.cl-density-switch');
 const btn=page.locator('.cl-density-switch');
 assert.equal(await page.locator('body').getAttribute('data-sim-density'),'compact');
 assert.equal(await btn.getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('#cl-simulator-workbench').count(),1,'Workbench tabs remain available');
 const metrics=await page.evaluate(()=>{
  const panel=document.querySelector('.sim-chart-panel'),plot=document.querySelector('.crownlight-plot'),
   canvas=plot.querySelector('canvas'),title=document.querySelector('main.section h1'),
   heading=document.querySelector('.cl-workbench-import>summary');
  const style=getComputedStyle(panel),plotStyle=getComputedStyle(plot);
  return {padding:parseFloat(style.paddingTop),plotHeight:parseFloat(plotStyle.height),
   titleSize:parseFloat(getComputedStyle(title).fontSize),
   importHeight:heading.getBoundingClientRect().height,
   canvasTransform:getComputedStyle(canvas).transform};
 });
 assert(metrics.padding<=13,'Compact chart surrounds should be smaller: '+JSON.stringify(metrics));
 assert(metrics.plotHeight<=540&&metrics.plotHeight>=400,'Native chart remains readable');
 assert.equal(metrics.canvasTransform,'none','No blur-inducing CSS scaling on chart');
 await btn.click();
 assert.equal(await page.locator('body').getAttribute('data-sim-density'),'comfortable');
 assert.equal(await btn.getAttribute('aria-pressed'),'false');
 const larger=await page.locator('.crownlight-plot').evaluate(x=>x.getBoundingClientRect().height);
 assert(larger>=metrics.plotHeight+60,'Comfortable layout should give chart more vertical room');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForSelector('.cl-density-switch');
 assert.equal(await page.locator('body').getAttribute('data-sim-density'),'comfortable',
  'Display preference should persist after refresh');
 await page.locator('.cl-density-switch').click();
 assert.equal(await page.locator('body').getAttribute('data-sim-density'),'compact');
 await page.setViewportSize({width:390,height:844});
 const mobile=await page.evaluate(()=>({
  maxWidth:document.documentElement.scrollWidth,
  viewport:document.documentElement.clientWidth,
  toggleHeight:document.querySelector('.cl-density-switch').getBoundingClientRect().height,
  chartHeight:document.querySelector('.crownlight-plot').getBoundingClientRect().height
 }));
 assert(mobile.maxWidth<=mobile.viewport+2,'Compact mode must not introduce horizontal scrolling: '+JSON.stringify(mobile));
 assert(mobile.toggleHeight>=42,'Small-screen density toggle must remain accessible');
 assert(mobile.chartHeight>=340,'Candlestick chart must retain a useful mobile height');
 assert.deepEqual(errors,[],'No JS errors in compact or comfortable browser fixture');
 console.log('PASS real Chromium simulator density: compact default, no canvas zoom, comfortable toggle, persistence, responsive mobile, all workbench tabs intact');
 await context.close();
}finally{await browser.close();}
