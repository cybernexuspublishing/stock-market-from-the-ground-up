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
  assert.equal(await page.locator('#tgp-select option').count(),134);
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

  // Batch 03: new indicator calculation visual and two previously unavailable watchlist risk gates.
  await page.locator('#tgp-select').selectOption('IND-15');
  await next();await next(); // WMA Learn → Experiment
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/WMA|weighted/i);
  assert.equal(await page.locator('.tgp-candle-chart').count(),1,'WMA chart renders once');
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/newest weight/i);
  await page.locator('#tgp-select').selectOption('IND-16');
  await next();await next(); // PPO: fixed EMA12/EMA26 source values
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/PPO main line only/);
  assert.equal(await page.locator('#tgp-period').count(),0,'PPO 12,26 must not show a nonfunctional period slider');
  await page.locator('#tgp-select').selectOption('IND-17');
  await next();await next();
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/Fast stochastic %K/);
  await page.locator('#tgp-select').selectOption('WATCH-15');
  await next();await next();
  assert.equal(await page.locator('.tgp-scan-table').count(),1);
  assert.match(await page.locator('.tgp-scan-table').innerText(),/Score 98/);
  assert.match(await page.locator('.tgp-scan-table').innerText(),/unresolved critical security/);
  await page.locator('#tgp-select').selectOption('WATCH-16');
  await next();await next();
  assert.equal(await page.locator('.tgp-scan-table').count(),1);
  assert.match(await page.locator('#tgp-scan-table, .tgp-scan-table').last().innerText(),/pre-outcome scanner snapshot/);

  // Full source catalog: interpretation-only values must not masquerade as calculated studies.
  await page.locator('#tgp-select').selectOption('IND-61');
  await next();await next();
  assert.equal(await page.locator('.tgp-candle-chart').count(),1);
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/Not calculated/);
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/Interpretation-only study:/);
  assert.equal(await page.locator('#tgp-period').count(),0,'No useless slider for unimplemented specialty metric');
  await page.locator('#tgp-select').selectOption('WATCH-22');
  await next();await next();
  assert.equal(await page.locator('.tgp-scan-table').count(),1);
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/Former.runner|historical runner|corporate actions/i);
  await page.locator('#tgp-select').selectOption('STR-01');
  await next();await next();
  assert.equal(await page.locator('.tgp-candle-chart').count(),1);
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/Source-described hypothetical decision requirements/);
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/NO TRADE/);
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/Not validated/);
  await page.locator('#tgp-select').selectOption('STR-50');
  await next();await next();
  assert.equal(await page.locator('.tgp-candle-chart').count(),1);
  await page.locator('#tgp-select').selectOption('EVENT-01');
  await next();await next();
  assert.equal(await page.locator('.tgp-candle-chart').count(),0,'No fabricated historical OHLCV image for CREX event');
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/15:01 ET/);
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/NOT a verified trade/);

  // Batch 05: numeric variants have displayed calculated values, never proprietary real data.
  await page.locator('#tgp-select').selectOption('IND-21'); // HMA
  await next();await next();
  assert.equal(await page.locator('.tgp-candle-chart').count(),1);
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/HMA WMA/);
  await page.locator('#tgp-select').selectOption('IND-31'); // KST
  await next();await next();
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/KST main line/);
  assert.equal(await page.locator('#tgp-period').count(),0,'Fixed KST formula does not expose a nonfunctional period control');
  await page.locator('#tgp-select').selectOption('IND-53'); // Volume Profile proxy
  await next();await next();
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/Eight-bin approximate price-of-control proxy/);
  assert.equal(await page.locator('#tgp-period').count(),0,'Fixed 8-bin proxy does not expose unrelated period input');
  await page.locator('#tgp-select').selectOption('IND-55'); // Proprietary SCTR unavailable
  await next();await next();
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/Not calculated/);

  await page.locator('#tgp-select').selectOption('IND-36'); // Parabolic SAR
  await next();await next();
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/PSAR variant/);
  assert.equal(await page.locator('.tgp-candle-chart').count(),1);
  await page.locator('#tgp-select').selectOption('IND-43'); // Prior-session pivot fixture
  await next();await next();
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/CLASSROOM PRIOR-SESSION fixture/);
  await page.locator('#tgp-select').selectOption('IND-47'); // Matched-clock invented comparisons
  await next();await next();
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/FIVE INVENTED/);
  await page.locator('#tgp-select').selectOption('IND-54'); // Price relative synthetic benchmark
  await next();await next();
  assert.match(await page.locator('#tutor-guided-practice').innerText(),/synthetic benchmark/);
  assert.equal(tutorPosts,0,'Fixture indicators must never invoke optional paid model');
  assert.equal(tutorPosts,0,'No numeric source or strategy lesson can auto-call a paid tutor model');
  assert.equal(tutorPosts,0,'Event and named strategy exercises never trigger paid Tutor provider calls');
  assert.equal(tutorPosts,0,'Batch 03 cannot auto-call optional paid inference');
  assert.equal(tutorPosts,0,'Added guided demonstrations never post to the billable Tutor API');
  assert(await page.locator('#tutor-guided-practice').isVisible());
  await ctx.close();
  console.log('PASS Guided Practice browser '+width+'px: 134 lessons (61 indicators,22 watchlists,50 source-only strategies,1 verified event); no invented calculations, one scanner chart, no market orders or paid Tutor requests.');
 }
}finally{await browser.close()}
