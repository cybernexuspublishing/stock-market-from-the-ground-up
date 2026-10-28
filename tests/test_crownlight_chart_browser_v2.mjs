/* Actual no-cost Chromium smoke test: real pinned chart package, fictional data only. */
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {join,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const lib=join(root,'node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.js');
assert(existsSync(lib),'Pinned real chart library must be installed');
const origin='https://crownlight-fixture.test';
const fixture=[
'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
'<link rel="stylesheet" href="/assets/css/crownlight-chart-studio-v2.css">',
'<style>*{box-sizing:border-box}body{margin:0;padding:12px;background:#060b17;color:#fff;font-family:system-ui}.sim-chart-panel{max-width:1500px;margin:auto;min-width:0}.sim-chart-head{display:flex;justify-content:space-between;gap:1rem}.sim-chart-panel canvas{display:block;width:100%;height:auto;max-height:560px;background:#071522;border:1px solid #294760;border-radius:10px;margin-top:10px}button{cursor:pointer}</style>',
'</head><body><section class="sim-chart-panel journal-card"><div class="sim-chart-head"><div><strong id="sim-symbol-line">FICTIONAL AAPL</strong><h2 id="sim-bar-time">2026-10-22</h2></div><strong id="sim-last-price">101.00</strong></div><canvas id="sim-chart" aria-label="Legacy fallback"></canvas></section>',
'<section class="crownlight-live-control"><button id="cl-live-start">Live IEX</button><button id="cl-live-demo">Fictional formation</button><button id="cl-live-stop" disabled>Stop</button><p id="cl-live-status" role="status"></p></section>',
'<section id="crownlight-live-stage" class="crownlight-live-stage" hidden><div id="cl-live-playfield"><span id="cl-live-symbol"></span><strong id="cl-live-bar"></strong><strong id="cl-live-last"></strong><div id="cl-live-ohlcv"></div><div id="cl-live-plot" class="cl-live-plot"></div><span id="cl-live-ticks"></span><p id="cl-live-meta"></p></div></section>',
'<script src="/chart-engine.js"></script><script src="/assets/js/crownlight-indicator-math-v2.js"></script><script src="/assets/js/crownlight-chart-studio-v2.js"></script><script src="/assets/js/crownlight-live-aggregator-v1.js"></script><script src="/assets/js/crownlight-live-formation-v1.js"></script>',
'</body></html>'
].join('');
const bars=Array.from({length:65},(_,i)=>({
 time:new Date(Date.parse('2026-10-22T13:30:00Z')+i*60000).toISOString(),
 open:100+i*.08,close:100+i*.08+(i%2===0?.12:-.09),
 high:100+i*.08+.31,low:100+i*.08-.28,volume:1000+i*13,tradeCount:11+i,providerVwap:100+i*.08+.01
}));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin!==origin)return route.abort();
   if(url.pathname==='/fixture.html')return route.fulfill({status:200,contentType:'text/html',body:fixture});
   const p=url.pathname==='/chart-engine.js'?lib:join(root,url.pathname.slice(1));
   if(!p.startsWith(root+'/')||!existsSync(p))return route.fulfill({status:404,body:''});
   const type=extname(p)==='.js'?'application/javascript':extname(p)==='.css'?'text/css':'text/plain';
   return route.fulfill({status:200,contentType:type,body:readFileSync(p)});
  });
  try{
   await page.goto(origin+'/fixture.html',{waitUntil:'load'});
   const result=await page.evaluate(data=>{
    window.simTest={user:{id:'fixture-member-111'},candles:data.map(x=>({...x,time:new Date(x.time)})),index:24,
      sourceProvider:'fictional',sourceName:'LOCAL FICTIONAL CHART FIXTURE',originalFictional:true,position:null,
      sourceNote:'No actual market prices or credentials are used'};
    return window.CrownlightStudio.render(window.simTest);
   },bars);
   assert.equal(result,true,'Real chart must mount, not fallback to legacy canvas');
   assert.equal(await page.locator('.crownlight-shell').count(),1);
   assert.equal(await page.locator('#sim-chart').isVisible(),false);
   assert((await page.locator('.crownlight-plot canvas').count())>0,'Actual candlestick chart must render');
   const before=await page.evaluate(()=>window.CrownlightStudio.getStatus().spacing);
   await page.locator('[data-cl="zoom-in"]').click();
   await page.waitForTimeout(250);
   const after=await page.evaluate(()=>window.CrownlightStudio.getStatus().spacing);
   assert(Number.isFinite(before)&&Number.isFinite(after)&&after>before,'Real chart zoom changes candle spacing (before='+before+', after='+after+')');
   await page.locator('.crownlight-plot').hover({position:{x:100,y:150}});
   await page.mouse.wheel(0,-210);
   await page.locator('[data-cl="source"]').click();
   assert.match(await page.locator('.crownlight-source').innerText(),/Revealed bars\s*25/);
   await page.locator('[data-cl="coach"]').click();
   assert.match(await page.locator('.crownlight-coach').innerText(),/Real body/);
   await page.locator('[data-cl="studies"]').click();
   const dialog=page.locator('.crownlight-dialog');await dialog.waitFor({state:'visible'});
   assert.equal(await dialog.locator('.crownlight-study-row').count(),3);
   await dialog.locator('#cl-new-study').selectOption('RSI');
   await dialog.locator('[data-add]').click();
   assert.equal(await dialog.locator('.crownlight-study-row').count(),4);
   await dialog.locator('[data-close]').click();
   await page.evaluate(()=>{window.simTest.index=25;window.CrownlightStudio.render(window.simTest)});
   assert.equal(await page.evaluate(()=>window.CrownlightStudio.getStatus().revealed),26);
   await page.locator('[data-cl="source"]').click();await page.locator('[data-cl="source"]').click();
   assert.match(await page.locator('.crownlight-source').innerText(),/Revealed bars\s*26/);
   await page.locator('[data-cl="fullscreen"]').click();assert.equal(await page.locator('.crownlight-expanded').count(),1);
   await page.locator('[data-cl="fullscreen"]').click();assert.equal(await page.locator('.crownlight-expanded').count(),0);

   await page.evaluate(()=>window.CrownlightLive.initialize({canLive:false,getSymbol:()=> 'AAPL',getSession:async()=>null}));
   assert.equal(await page.locator('#cl-live-start').isDisabled(),true,'No connected stream without premium permission');
   await page.locator('#cl-live-demo').click();
   await page.waitForFunction(()=>Number(document.querySelector('#cl-live-ticks')?.textContent||0)>=3,{timeout:10000});
   assert.match(await page.locator('#cl-live-status').innerText(),/FICTIONAL FORMATION/);
   assert.match(await page.locator('#cl-live-ohlcv').innerText(),/O .* H .* L .* C .* Vol /);
   assert((await page.locator('#cl-live-plot canvas').count())>0,'Real chart shows fictional evolving candle');
   await page.locator('#cl-live-stop').click();
   assert.equal(await page.locator('#crownlight-live-stage').isVisible(),false,'Stop restores historical practice');
   assert((await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth))<=3,'Viewport horizontal overflow');
   assert.deepEqual(errors,[],'Browser errors at '+width+'px');
   mkdirSync(join(root,'artifacts'),{recursive:true});
   await page.screenshot({path:join(root,'artifacts/crownlight-'+width+'px.png'),fullPage:true});
   console.log('PASS real Chromium '+width+'px: canvas, zoom/wheel, indicators, coaching, source, replay and responsive width');
  }finally{await context.close()}
 }
}finally{await browser.close()}
