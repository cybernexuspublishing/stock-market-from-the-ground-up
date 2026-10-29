/* Built Pages, loopback-only browser smoke for Talia Guided Practice v1.
 * This test never uses accounts, private grading, live market data or payments.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Local loopback fixture required');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  let tutorPosts=0;
  await ctx.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin!==base)return route.abort();
   if(u.pathname==='/api/market-tutor-v01492'&&route.request().method()==='POST'){
    tutorPosts++;return route.fulfill({status:405,body:'No paid/provider calls permitted in guided browser smoke'});
   }
   return route.continue();
  });
  const page=await ctx.newPage();
  const response=await page.goto(base+'/market-tutor.html',{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  await page.locator('#tgp-select').waitFor({state:'visible',timeout:15000});
  assert.equal(await page.locator('#tgp-select option').count(),24);
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/No market feed|No market feed/i);
  await page.locator('#tgp-select').selectOption('IND-01');
  const next=()=>page.locator('#tutor-guided-practice .tgp-actions button').filter({hasText:/^Continue$/}).click();
  await next(); // Learn
  await next(); // Experiment
  await page.locator('#tgp-bars').waitFor();
  await page.locator('#tgp-bars').evaluate(el=>{el.value='20';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.match(await page.locator('#tgp-bars').getAttribute('max'),/^48$/);
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/Visible completed bars: 20/);
  assert.equal(await page.locator('.tgp-candle-chart').count(),1);
  await next(); // Predict
  await page.locator('input[name="tgp-prediction"][value="0"]').check();
  await next(); // Practice
  await page.getByRole('button',{name:'Check my reasoning'}).click();
  assert.match(await page.locator('.tgp-feedback').innerText(),/A crossing only shows/);
  // The visible misconception is specific to the selected inaccurate option.
  await page.locator('input[name="tgp-prediction"][value="1"]').check();
  await page.getByRole('button',{name:'Check my reasoning'}).click();
  assert.match(await page.locator('.tgp-feedback').innerText(),/Your reasoning is consistent/);
  await page.getByRole('button',{name:'Ask Talia to teach this another way'}).click();
  assert.match(await page.locator('#tutor-question').inputValue(),/Teach me Simple moving average another way/);
  assert.equal(tutorPosts,0,'Question handoff may not auto-submit or bill');
  await page.locator('#tgp-select').selectOption('WATCH-04');
  await next();await next(); // Experiment
  const row=page.locator('.tgp-scan-table tbody tr').filter({hasText:'FICT-B'}).first();
  assert.match(await row.innerText(),/Not qualified/);
  await page.locator('#tutor-guided-practice .tgp-gate input[type=range]').first().evaluate(el=>{el.value='3.5';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.match(await row.innerText(),/Eligible for risk review/);
  assert.equal(tutorPosts,0,'Synthetic scanner cannot send provider requests');
  await page.locator('#tgp-select').selectOption('IND-14');
  await next();await next(); // Keltner Learn → Experiment
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/two Wilder ATR|Keltner/i);
  assert.equal(await page.locator('.tgp-candle-chart').count(),1);
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/Channel\/band when available|Bands \(when available\)/);
  await page.locator('#tgp-select').selectOption('WATCH-07');
  await next();await next();
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/Focus rule for this lesson:/);
  assert.equal(await page.locator('.tgp-scan-table').count(),1,'Only one scanner visualization per stage');
  assert.match(await page.locator('.tgp-scan-table').innerText(),/Special gate/);
  assert.match(await page.locator('.tgp-scan-table').innerText(),/mandatory universe\/price/);
  await page.locator('#tgp-select').selectOption('WATCH-10');
  await next();await next();
  assert.equal(await page.locator('.tgp-scan-table').count(),1,'Short-side watchlist renders only once');
  assert.match(await page.locator('.tgp-scan-table').innerText(),/short borrow unavailable/);
  assert.equal(tutorPosts,0,'Added guided demonstrations never post to the billable Tutor API');
  assert(await page.locator('#tutor-guided-practice').isVisible());
  await ctx.close();
  console.log('PASS guided practice browser '+width+'px: 14 indicator/10 watchlist modules, adaptive correction, calculated bands, separate short-borrow/Boolean gates');
 }
}finally{await browser.close()}
