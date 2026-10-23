/* Owner-accepted v3.2 reference: browser regression for the actual deployed Pages output.
 * Completely offline. Never requires a member login or discloses production rubrics. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Only localhost QA fixture is supported');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  const page=await context.newPage(),errors=[],failures=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('requestfailed',request=>failures.push(request.url()));
  const response=await page.goto(base+'/lab-v32-reference.html',{waitUntil:'load',timeout:30000});
  assert.equal(response?.status(),200,'Reference route must exist');
  await page.getByRole('heading',{name:'Build and Understand a Candlestick'}).waitFor({timeout:15000});
  assert.equal(await page.getByText('Loading Lab…').count(),0,'Never leave a stalled loading placeholder');
  assert.equal(await page.locator('.stage-item').count(),9,'Exactly nine learning stages');
  assert.equal(await page.locator('.shell').count(),1,'Owner-original shell must render');
  assert.match(await page.locator('.banner').evaluate(el=>getComputedStyle(el).backgroundColor),/rgb\(13, 32, 51\)/,'Original banner styling must load');
  await page.locator('[data-action="next"]').click();
  await page.getByRole('heading',{name:/Learn — OHLC/}).waitFor();
  await page.locator('input[name="introAnswer"][value="range"]').check();
  await page.getByRole('button',{name:'Check and Continue'}).click();
  await page.getByRole('heading',{name:/Experiment — Construct/}).waitFor();
  assert.equal(await page.locator('.chart-shell').count(),1,'Original interactive OHLC chart must render');
  await page.locator('#lab-select').selectOption('vwap');
  await page.getByRole('heading',{name:'Understand VWAP and Replay the Market'}).waitFor();
  await page.locator('[data-action="next"]').click();
  await page.locator('input[name="introAnswer"][value="sum"]').check();
  await page.getByRole('button',{name:'Check and Continue'}).click();
  await page.getByRole('heading',{name:/Experiment — Change volume/}).waitFor();
  assert.equal(await page.locator('.ratio-bars').count(),1,'Original VWAP volume experiment must render');
  assert.deepEqual(errors,[],'No JavaScript errors at '+width+'px');
  assert.deepEqual(failures,[],'No failed asset requests at '+width+'px');
  await context.close();
  console.log('PASS owner exact reference at '+width+'px: load, nine stages, CSS, candlestick and VWAP experiment');
 }
}finally{await browser.close()}
