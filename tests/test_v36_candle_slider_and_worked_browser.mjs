/* Owner v3.2 workstation parity: integrated worked steps, OHLC reference
 * and responsive live closing-price slider on BOTH Learn and Experiment.
 * Fictional public data only; no real account, grading or replay bypass.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Local-only fixture');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900},serviceWorkers:'block'});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
  for(const file of ['lab-v33-contextual-visuals.css','lab-v33-instructor.css','lab-v33-experience.css'])
   await page.addStyleTag({url:base+'/assets/css/'+file});
  for(const file of [
   'lab-engine-v32-teaching.js','lab-engine-v33-visual.js',
   'lab-v33-contextual-visuals.js','lab-v33-visual-interactions.js',
   'lab-v34-competency-examples.js','lab-v33-instruction-content.js',
   'lab-v34-interactive-lessons.js','lab-v33-instructor.js',
   'lab-engine-v32-universal.js'])
   await page.addScriptTag({url:base+'/assets/js/'+file});
  await page.evaluate(()=>{document.body.classList.add('gu-lab-member');
   const holder=document.createElement('div');holder.id='gu-v32-teaching-slot';
   document.body.prepend(holder);
  });
  const isMounted=await page.evaluate(async()=>window.GroundUpLabEngineV32Universal.mount({
   labId:'F2-C07-L01',mode:'guided',
   target:document.getElementById('gu-v32-teaching-slot'),
   lab:{id:'F2-C07-L01',concept:'Bullish Candle'}
  }));
  assert.equal(isMounted,true);
  const host=page.locator('#gu-v32-teaching-slot');
  await host.getByRole('button',{name:/Start Guided Learning/}).click();
  const chart=host.locator('.gu-v34-unified-lesson .gu-l33-graphic');
  assert.equal(await chart.count(),1);
  const row=chart.locator('.gu-v36-candle-layout');
  assert.equal(await row.locator('.gu-l33-single svg').count(),1);
  assert.equal(await row.locator('.gu-v36-price-reference').count(),1);
  assert.deepEqual(await row.locator('.gu-v36-reference-row dt').allTextContents(),
   ['HIGH','CLOSE','OPEN','LOW']);
  const close=()=>chart.locator('[data-price-measure="c"]');
  const body=()=>chart.locator('[data-candle-result="body"]');
  const range=()=>chart.locator('[data-candle-result="range"]');
  const percent=()=>chart.locator('[data-candle-result="percent"]');
  // The Learn stage starts with the authored DIFFERENT $20 example (not
  // the $31 reference candle). A later worked step deliberately switches cases.
  assert.equal(await close().textContent(),String.fromCharCode(36)+'21.20');
  assert.equal(await body().textContent(),String.fromCharCode(36)+'1.20');
  assert.equal(await range().textContent(),String.fromCharCode(36)+'3.00');
  assert.equal(await percent().textContent(),'40.0%');
  const buttons=chart.locator('.gu-l33-interactive-tools [data-teaching-feature]');
  assert.deepEqual(await buttons.evaluateAll(nodes=>nodes.map(n=>n.dataset.teachingFeature)),
   ['all','open','close','high','low','body','range','percent']);
  assert.equal(await chart.getByRole('button',{name:'Next highlight'}).count(),1);
  const worked=chart.locator('.gu-v35-chart-worked');
  assert.equal(await worked.count(),1);
  assert.equal(await worked.locator('h4').textContent(),'Worked example — different illustrative case');
  assert(await chart.locator('.gu-l33-interactive-tools + .gu-v35-chart-worked').count()===1,
   'Worked example must appear immediately BELOW highlight buttons');
  const slider=chart.locator('.gu-v36-candle-experiment input[type=range]');
  assert.equal(await slider.count(),1,'Learn must have interactive reference-style slider');
  await slider.evaluate(el=>{el.value='21.35';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.equal(await close().textContent(),String.fromCharCode(36)+'21.35');
  assert.equal(await body().textContent(),String.fromCharCode(36)+'1.35');
  assert.equal(await range().textContent(),String.fromCharCode(36)+'3.00');
  assert.equal(await percent().textContent(),'45.0%');
  assert.match(await chart.locator('svg').getAttribute('aria-label'),/bullish/);
  await chart.getByRole('button',{name:'Open',exact:true}).click();
  assert.match(await host.locator('.gu-v33-instructor-accessible').first().textContent(),/21\\.35/);
  // Step four switches to the independent $31 reference case.
  for(let step=0;step<3;step++)await worked.getByRole('button',{name:'Next worked step'}).click();
  await worked.getByRole('button',{name:'Show and explain on chart'}).click();
  assert.equal(await close().textContent(),String.fromCharCode(36)+'32.00');
  assert.equal(await body().textContent(),String.fromCharCode(36)+'1.00');
  assert.equal(await range().textContent(),String.fromCharCode(36)+'2.00');
  assert.equal(await percent().textContent(),'50.0%');
  assert.equal(await slider.getAttribute('min'),'30.50');
  assert.equal(await slider.getAttribute('max'),'32.50');
  await host.getByRole('button',{name:'Next learning stage'}).click();
  await host.getByRole('heading',{name:/^Experiment —/}).waitFor();
  const exp=host.locator('.gu-v34-unified-lesson .gu-l33-graphic');
  const experimentSlider=exp.locator('.gu-v36-candle-experiment input[type=range]');
  assert.equal(await experimentSlider.count(),1,'Experiment must reuse identical slider');
  assert.equal(await exp.locator('.gu-v36-price-reference').count(),1);
  await experimentSlider.evaluate(el=>{el.value='30.75';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.equal(await exp.locator('[data-price-measure="c"]').textContent(),String.fromCharCode(36)+'30.75');
  assert.equal(await exp.locator('[data-candle-result="percent"]').textContent(),'12.5%');
  assert.match(await exp.locator('svg').getAttribute('aria-label'),/bearish/);
  assert.deepEqual(errors,[],width+'px runtime errors');
  await page.close();
  console.log('PASS candle and Talia workstation / live slider / worked example at '+width+'px');
 }
}finally{await browser.close()}
