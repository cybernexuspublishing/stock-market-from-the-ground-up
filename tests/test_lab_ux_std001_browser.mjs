/* Production visual acceptance harness, local static content only.
 * No Supabase account, ledger, server answer keys, live prices or paid APIs. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Localhost-only testing');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:960},serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:30000});
  await page.addStyleTag({url:base+'/assets/css/lab-v33-contextual-visuals.css'});
  await page.addScriptTag({url:base+'/assets/js/lab-engine-v32-teaching.js'});
  await page.addScriptTag({url:base+'/assets/js/lab-engine-v33-visual.js'});
  await page.addScriptTag({url:base+'/assets/js/lab-v33-contextual-visuals.js'});
  await page.addScriptTag({url:base+'/assets/js/lab-engine-v32-universal.js'});
  await page.evaluate(()=>{
   const app=document.createElement('div');app.id='gu-v32-teaching-slot';
   app.style.cssText='max-width:900px;margin:12px auto;padding:10px;background:#111922';
   document.body.prepend(app);
  });
  const load=async(id,concept)=>{
   const ok=await page.evaluate(async ({id,concept})=>{
    return window.GroundUpLabEngineV32Universal.mount({labId:id,mode:'guided',
     target:document.getElementById('gu-v32-teaching-slot'),
     lab:{id,concept,goal:'Practice the relevant subject with displayed evidence.'}});
   },{id,concept});
   assert.equal(ok,true,'Shared engine must mount '+id);
  };
  const target=page.locator('#gu-v32-teaching-slot');
  await load('F2-C07-L01','Construct an Up / Bullish Candle');
  await target.getByRole('button',{name:/Begin Candlestick Lesson/}).click();
  assert.equal(await target.locator('.gu-l33-graphic').count(),1,'Learn must show single candlestick');
  assert.match(await target.locator('.gu-l33-graphic').innerText(),/FICTIONAL/);
  assert.equal(await target.locator('.gu-l33-graphic svg').count(),1,'Candle SVG must be built');
  await target.getByRole('button',{name:'Next learning stage'}).click();
  assert.equal(await target.locator('.gu-v33-exact-visual').count(),1,'Experiment has interactive OHLC graphic');
  await target.getByRole('button',{name:'Next learning stage'}).click();
  assert.equal(await target.locator('.gu-l33-graphic').count(),1,'Predict must show relevant candle');
  await target.locator('textarea').first().fill('I will not assume the next completed candle is higher; I need fresh evidence.');
  await target.getByRole('button',{name:'Lock my prediction'}).click();
  await target.getByRole('button',{name:'Next learning stage'}).click();
  assert.equal(await target.locator('.gu-l33-graphic').count(),1,'Practice must show its candle');
  assert.match(await target.locator('.gu-l33-metrics').innerText(),/Calculate/,'Do not pre-reveal numeric result');
  await target.locator('input[type="number"]').fill('50');
  await target.getByRole('button',{name:'Check calculation — free retry'}).click();
  assert.match(await target.innerText(),/Calculation completed/);
  await target.getByRole('button',{name:'Next learning stage'}).click();
  assert.match(await target.innerText(),/server-graded question bank/);
  await load('DT-C11-L01','VWAP and Moving Averages in Intraday Trading — VWAP as a session reference');
  await target.getByRole('button',{name:/Begin .* Lesson/}).click();
  assert.equal(await target.locator('.gu-l33-graphic svg').count(),1,'VWAP lessons require completed candles with weighted overlay');
  assert.match(await target.locator('.gu-l33-graphic').innerText(),/FICTIONAL/);
  await target.getByRole('button',{name:'Next learning stage'}).click();
  assert.equal(await target.locator('.gu-l33-graphic svg').count(),1,'VWAP Experiment retains visual');
  await load('TAPE-C01-L01','What Tape Reading Is - and What It Is Not — Start with evidence, not a story');
  await target.getByRole('button',{name:/Begin .* Lesson/}).click();
  assert.equal(await target.locator('.gu-l33-tape').count(),1,'Time & Sales has an actual table');
  await load('F2-C04-L01','Bid, Ask, Last, Spread, and Midpoint in a Frequently Updating Quote');
  await target.getByRole('button',{name:/Begin .* Lesson/}).click();
  assert.equal(await target.locator('.gu-l33-depth').count(),1,'Bid/ask lessons require depth visual');
  const graphic=target.locator('.gu-l33-graphic').first();
  const rect=await graphic.boundingBox();
  assert(rect?.width>0&&rect?.width<=width+2,'Visual must fit mobile viewport');
  await page.evaluate(async()=>{
    const e=document.getElementById('gu-v32-teaching-slot');
    await window.GroundUpLabEngineV32Universal.mount({labId:'F2-C07-L01',mode:'assessment',target:e});
  });
  assert.equal(await target.locator('.gu-l33-graphic').count(),0,'Concealed assessment must contain no study visual');
  assert.match(await target.innerText(),/No answer keys/);
  assert.deepEqual(errors,[],'No browser JavaScript errors');
  await context.close();
  console.log('PASS LAB-UX-STD-001 '+width+'px: candle practice without answer leakage, VWAP, tape, depth, assessment concealment');
 }
}finally{await browser.close()}
