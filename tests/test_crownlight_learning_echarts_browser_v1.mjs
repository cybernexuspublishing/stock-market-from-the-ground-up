/* No-user-data ECharts browser acceptance against exact local Pages build.
 * The chart data is fictional, the wallet and account are never touched.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
assert(/^http:\/\/127\.0\.0\.1:\d+$/.test(base),'No production access from source-only browser QA');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [390,768,1440]){
  const ctx=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
  await page.addStyleTag({url:base+'/assets/css/crownlight-learning-echarts-v1.css'});
  await page.addScriptTag({url:base+'/assets/js/crownlight-echarts-loader-v1.js'});
  await page.addScriptTag({url:base+'/assets/js/crownlight-learning-echarts-v1.js'});
  await page.evaluate(()=>{
   const target=document.createElement('div');target.id='beta-echarts-target';
   target.style.cssText='width:100%;max-width:100%;box-sizing:border-box;margin:5px auto;padding:4px';
   document.body.prepend(target);
   window.__betaView=window.CrownlightLearningEChartsV1.mount(target,{kind:'candle',interactive:true,candle:{o:20,h:22,l:19,c:21.2}});
  });
  await page.waitForSelector('#beta-echarts-target .gu-echarts-plot svg',{timeout:15000});
  const root=page.locator('#beta-echarts-target');
  assert.equal(await root.locator('table tbody tr').count(),4,'Every candle retains all four accessible prices');
  assert.match(await root.locator('.gu-echarts-facts').innerText(),/40\.0%/);
  assert.match(await root.locator('table caption').innerText(),/open, high, low and close/i);
  assert.equal(await root.locator('[aria-live="polite"]').count()>=2,true);
  const inputs=root.locator('.gu-echarts-form input');
  for(const [i,v] of ['1.2','3','40'].entries())await inputs.nth(i).fill(v);
  await root.getByRole('button',{name:'Check all three answers'}).click();
  assert.match(await root.locator('.gu-echarts-feedback').innerText(),/3 of three steps correct/);
  await root.getByRole('button',{name:'Clear and try again'}).click();
  assert.equal(await inputs.nth(0).inputValue(),'');
  for(const [i,v] of ['3','1.2','0.4'].entries())await inputs.nth(i).fill(v);
  await root.getByRole('button',{name:'Check all three answers'}).click();
  assert.match(await root.locator('.gu-echarts-feedback').innerText(),/Divide the body by the full range/i);
  const slider=root.locator('input[type="range"]');
  await slider.focus();
  await slider.press('ArrowLeft');
  assert.equal(await inputs.nth(1).inputValue(),'','Changing evidence invalidates previous calculations');
  const dimensions=await root.evaluate(el=>{const a=el.querySelector('.gu-echarts-lesson').getBoundingClientRect();return{left:a.left,right:a.right,viewport:innerWidth}});
  assert(dimensions.left>=-2&&dimensions.right<=dimensions.viewport+3,'ECharts should not cause horizontal clipping at '+width+'px: '+JSON.stringify(dimensions));
  await page.evaluate(()=>window.__betaView?.dispose?.());
  await page.evaluate(()=>{
   window.__betaView=window.CrownlightLearningEChartsV1.mount(document.querySelector('#beta-echarts-target'),{kind:'vwap',interactive:true});
  });
  await page.waitForSelector('#beta-echarts-target .gu-echarts-plot svg',{timeout:15000});
  assert.match(await root.locator('.gu-echarts-facts').innerText(),/\$2,600\.00/);
  assert.match(await root.locator('.gu-echarts-facts').innerText(),/\$8\.67/);
  const fields=root.locator('.gu-echarts-form input');
  for(const [i,v] of ['2600','300','9'].entries())await fields.nth(i).fill(v);
  await root.getByRole('button',{name:'Check all three answers'}).click();
  assert.match(await root.locator('.gu-echarts-feedback').innerText(),/ignores unequal shares/);
  await fields.nth(2).fill('8.67');
  await root.getByRole('button',{name:'Check all three answers'}).click();
  assert.match(await root.locator('.gu-echarts-feedback').innerText(),/3 of three steps correct/);
  assert.deepEqual(errors.filter(e=>/crownlight-learning-echarts|echarts/i.test(e)),[],'ECharts browser runtime exceptions');
  await ctx.close();
  console.log('PASS fictional ECharts candle/VWAP, guided corrections, keyboard, accessible table, and responsive width '+width);
 }
}finally{await browser.close()}
