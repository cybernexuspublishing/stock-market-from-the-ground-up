/* Reference v3.2 owner parity, protected v3.3 site adapter.
 * Tests read-only, fictional teaching without real accounts or credentials.
 * Lab ID is navigation metadata; prompts must use the authored lesson topic.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Local preview only');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:920},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
  for(const name of ['lab-v33-contextual-visuals.css','lab-v33-instructor.css','lab-v33-experience.css'])
   await page.addStyleTag({url:base+'/assets/css/'+name});
  for(const name of ['lab-engine-v32-teaching.js','lab-engine-v33-visual.js',
   'lab-v33-contextual-visuals.js','lab-v33-visual-interactions.js',
   'lab-v34-competency-examples.js','lab-v33-instruction-content.js',
   'lab-v34-interactive-lessons.js','lab-v33-instructor.js',
   'lab-engine-v32-universal.js'])
   await page.addScriptTag({url:base+'/assets/js/'+name});
  await page.evaluate(()=>{
   const host=document.createElement('section');host.id='gu-v32-teaching-slot';
   document.body.prepend(host);
  });
  const host=page.locator('#gu-v32-teaching-slot');
  const mount=async(labId,concept)=>assert.equal(await page.evaluate(async data=>
   window.GroundUpLabEngineV32Universal.mount({
    labId:data.labId,mode:'guided',target:document.querySelector('#gu-v32-teaching-slot'),
    lab:{id:data.labId,concept:data.concept}
   }),{labId,concept}),true);
  // F3-C06-L01 has a placeholder title in the 419 register, but its
  // authored book exercise identifies the specific topic as VWAP Reclaim.
  await mount('F3-C06-L01','F3-C06-L01');
  await host.getByRole('button',{name:/Start Guided Learning/}).click();
  const narration=await host.locator('.gu-v33-instructor-accessible').first().textContent();
  assert.match(narration,/VWAP Reclaim/,'Authored subject must replace a placeholder ID');
  assert(!narration.includes('The focus of this lesson is F3-C06-L01'),
   'A Lab locator must not be read as its educational topic');
  assert.match(await host.locator('.gu-v33-graphic, .gu-l33-graphic').first().innerText(),/FICTIONAL/i);
  assert.equal(await host.locator('.gu-l33-chart-reference').count(),1,
   'Restore original-reference chart with aligned data panel');
  assert.equal(await host.getByRole('button',{name:'Price + VWAP',exact:true}).count(),1,'Reference view modes must be restored');
  await host.getByRole('button',{name:'Volume',exact:true}).click();
  assert.equal(await host.getByRole('button',{name:'Volume',exact:true}).getAttribute('aria-pressed'),'true');
  await host.getByRole('button',{name:'Price + VWAP',exact:true}).click();
  const view=host.locator('.gu-l33-graphic').first();
  const time=view.locator('.gu-l33-candle-picker select');
  await time.selectOption('1');
  assert.equal(await view.locator('svg').getAttribute('data-selected-index'),'1');
  assert.match(await view.locator('[data-reference-time]').innerText(),/09:35/);
  assert.equal(await view.locator('[data-reference-field="close"]').count(),1);
  assert.equal(await view.locator('[data-reference-field="vwap"]').count(),1);
  assert.match(await view.locator('[data-reference-field="vwap"]').innerText(),/^\$\d+\.\d{2}$/);
  await host.getByRole('button',{name:'Next learning stage'}).click();
  const slider=host.locator('input[type="range"]').first();
  assert.equal(await slider.count(),1,'Reference VWAP experimentation needs a direct volume slider');
  const output=host.locator('.gu-v32-output');
  const before=await output.textContent();
  await slider.evaluate(el=>{el.value='400';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.notEqual(await output.textContent(),before,'Changing shares must update weighted calculation');
  await mount('F2-C07-L01','F2-C07-L01');
  await host.getByRole('button',{name:/Start Guided Learning/}).click();
  const candleNarration=await host.locator('.gu-v33-instructor-accessible').first().textContent();
  assert(!candleNarration.includes('The focus of this lesson is F2-C07-L01'));
  // One reference teaching-game node: chart highlight activates Talia's
  // typed concept instruction, answer, worked correction, then the next node.
  await host.getByRole('button',{name:'Open',exact:true}).click();
  const teacher=host.locator('.gu-v34-unified-lesson .gu-v33-instructor');
  assert.equal(await teacher.count(),1,'Talia is integrated INTO the chart module');
  const prompt=teacher.locator('.gu-v33-instructor-prompt');
  assert.match(await prompt.textContent(),/What does Open measure/);
  const answer=teacher.locator('.gu-v33-instructor-dialogue textarea');
  const submit=teacher.getByRole('button',{name:'Submit answer'});
  await answer.fill('The open is the first observed price of the specified candle interval.');
  await submit.click();
  assert.match(await prompt.textContent(),/What mistake/,'Teaching response must trigger a second corrective prompt');
  await answer.fill('A common mistake is treating the open as the low, which is not always the same.');
  await submit.click();
  assert.match(await prompt.textContent(),/What establishes whether a completed candle is bullish or bearish/,
   'After answering Open, the next Close feature must begin automatically');
  await host.getByRole('button',{name:'Next learning stage'}).click();
  const closing=host.locator('input[type="range"]').first();
  const initial=await host.locator('.gu-v32-output').textContent();
  await closing.evaluate(el=>{el.value='30.75';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.notEqual(await host.locator('.gu-v32-output').textContent(),initial,
   'Changing fictional Close must update OHLC and body percentage');
  assert.deepEqual(errors,[],'No JavaScript errors at '+width+'px');
  await page.close();
  console.log('PASS reference v3.2 topic-first + chart, candle-select, VWAP/Close sliders at '+width+'px');
 }
}finally{await browser.close()}
