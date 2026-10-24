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
 for(const width of [390,1280,1920]){
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
   document.body.classList.add('gu-lab-member');
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
  assert.match(narration,/VWAP|volume.weighted/i,'Learn must introduce VWAP before discussing a Reclaim');
  assert(!narration.includes('The focus of this lesson is F3-C06-L01'),
   'A Lab locator must not be read as its educational topic');
  assert.match(await host.locator('.gu-v33-graphic, .gu-l33-graphic').first().innerText(),/SIMULATED|ILLUSTRATIVE/i);
  assert.equal(await host.locator('.gu-l33-chart-reference').count(),1,
   'Restore original-reference chart with aligned data panel');
  const visualWorkbench=host.locator('.gu-v34-unified-lesson');
  assert.equal(await visualWorkbench.count(),1,'The interactive chart and Talia must remain one workstation');
  const layout=await visualWorkbench.evaluate(node=>{
   const chart=node.querySelector('.gu-l33-graphic');
   const teacher=node.querySelector('.gu-v33-instructor');
   const c=chart?.getBoundingClientRect(),t=teacher?.getBoundingClientRect();
   return {display:getComputedStyle(node).display,
    chartLeft:c?.left,chartRight:c?.right,chartTop:c?.top,
    teacherLeft:t?.left,teacherTop:t?.top};
  });
  const supportPosition=await host.evaluate(root=>{
   const hero=root.querySelector('.gu-v34-unified-lesson');
   const support=root.querySelector('.gu-v33-support-tabs');
   return {count:root.querySelectorAll('.gu-v33-support-tabs').length,
    supportTop:support?.getBoundingClientRect().top,
    heroBottom:hero?.getBoundingClientRect().bottom,
    tabCount:support?.querySelectorAll('[role="tab"]').length};
  });
  assert.equal(supportPosition.count,1,'One learning support strip, not duplicated tabs');
  assert.equal(supportPosition.tabCount,3,'Objectives, Tutor and Crownlight Sparks Wallet belong together');
  assert(supportPosition.supportTop>=supportPosition.heroBottom-2,
   'Learning support tabs must be below both the chart and Talia');
  if(width>=1160){
   assert.equal(layout.display,'grid','Desktop must use side-by-side teaching columns');
   assert(layout.teacherLeft>=layout.chartRight-2,'Talia must stand beside the illustrated chart');
   assert(layout.teacherLeft-layout.chartRight<60,'Responsive columns must not leave a dead-space gulf between chart and Talia');
  }else{
   assert(layout.teacherTop>layout.chartTop,'Mobile must stack Talia beneath the chart');
  }
  const compactVwapHeight=await visualWorkbench.locator('.gu-l33-chart svg').first()
   .evaluate(node=>node.getBoundingClientRect().height);
  assert(compactVwapHeight>50&&compactVwapHeight<=270,
   'Compact chart must be readable while leaving vertical room for Talia at '+width+'px');
  assert.equal(await visualWorkbench.getByRole('button',{name:'Expand chart and price labels'}).count(),1);
  await visualWorkbench.getByRole('button',{name:'Expand chart and price labels'}).click();
  assert.equal(await visualWorkbench.getByRole('button',{name:'Return to compact chart'}).getAttribute('aria-pressed'),'true');
  await visualWorkbench.getByRole('button',{name:'Return to compact chart'}).click();
  assert.equal(await visualWorkbench.locator('.gu-v34-expanded-visual').count(),0,
   'Expanded view must be reversible without resetting progress');
  const tutorMin=await visualWorkbench.locator('.gu-v33-instructor-narration').evaluate(node=>
   parseFloat(getComputedStyle(node).minHeight)||0);
  assert(tutorMin<=1,'The old 420px empty narration reservation must be removed');
  assert.equal(await host.getByRole('button',{name:'Price + VWAP',exact:true}).count(),1,'Reference view modes must be restored');
  assert.equal(await host.getByRole('button',{name:'Price + VWAP',exact:true}).getAttribute('aria-pressed'),'true',
   'The VWAP line must be visible when Learn first opens');
  await host.getByRole('button',{name:'Price',exact:true}).click();
  assert.equal(await host.getByRole('button',{name:'Price',exact:true}).getAttribute('aria-pressed'),'true');
  await host.getByRole('button',{name:'Check my understanding'}).click();
  assert.equal(await host.getByRole('button',{name:'Price + VWAP',exact:true}).getAttribute('aria-pressed'),'true',
   'The relevant VWAP line must be restored before checking understanding');
  const vwapWorked=host.locator('.gu-v35-chart-worked');
  assert.equal(await vwapWorked.locator('.gu-v35-vwap-share-illustration').count(),1,
   'The $10/$12 worked case must show its own share-weight visualization');
  assert.match(await vwapWorked.locator('.gu-v35-vwap-share-illustration').textContent(),/400 total shares/,
   'The worked diagram must explicitly show its denominator');
  await vwapWorked.getByRole('button',{name:'Next worked step'}).click();
  assert.match(await host.locator('.gu-v33-instructor-accessible').first().textContent(),
   /Worked example.*step/i,'VWAP next step must be narrated by Talia');
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
  assert.equal(await host.locator('.gu-l33-graphic').count(),1,'Exactly one learning visual, with no duplicate canvas');
  assert(!candleNarration.includes('The focus of this lesson is F2-C07-L01'));
  // Source-derived worked examples operate on the same chart and are narrated.
  const steps=host.locator('.gu-v35-chart-worked');
  assert.equal(await steps.count(),1);
  assert.match(await steps.locator('.gu-v35-worked-counter').textContent(),/Step 1 of/);
  await steps.getByRole('button',{name:'Next worked step'}).click();
  assert.match(await steps.locator('.gu-v35-worked-counter').textContent(),/Step 2 of/);
  await steps.getByRole('button',{name:'Show and explain on chart'}).click();
  const teacher=host.locator('.gu-v34-unified-lesson .gu-v33-instructor');
  assert.equal(await teacher.count(),1,'Talia is integrated into the visual workstation');
  assert.match(await teacher.locator('.gu-v33-instructor-accessible').first().textContent(),
   /Worked example.*step/i,'The clicked worked example must be narrated');
  const help=host.locator('.gu-v34-unified-lesson .gu-l33-graphic .gu-v35-teaching-actions');
  assert.equal(await help.count(),1,'Four help controls must be inside the illustrated visual');
  assert.equal(await help.locator('button').count(),4);
  assert.equal(await host.locator('.gu-v33-instructor-dialogue').isVisible(),false,
   'The member should not receive a generic reflection prompt when selecting a demonstration');
  await help.getByRole('button',{name:'Explain This Concept'}).click();
  assert.match(await teacher.locator('.gu-v33-instructor-accessible').first().textContent(),
   /Real body = \|Close − Open\|/,'Explain This Concept must narrate the formula');
  assert.equal(await host.locator('.gu-v33-instructor-dialogue').isVisible(),false,
   'An instructional help request must not demand a second answer');
  // Chart highlights must teach before a concept check rather than triggering
  // a new generic quiz on every selection.
  await host.getByRole('button',{name:'Open',exact:true}).click();
  assert.match(await teacher.locator('.gu-v33-instructor-accessible').first().textContent(),
   /Opening price|Open is/i);
  const candleSvgHeight=await host.locator('.gu-v34-unified-lesson .gu-l33-single svg').first()
   .evaluate(node=>node.getBoundingClientRect().height);
  assert(candleSvgHeight>40&&candleSvgHeight<=245,'Candle height must fit with Talia on '+width+'px');
  await host.getByRole('button',{name:'Check my understanding'}).click();
  const prompt=teacher.locator('.gu-v33-instructor-prompt');
  assert.match(await prompt.textContent(),/Which prices determine/i);
  const answer=teacher.locator('.gu-v33-instructor-dialogue textarea');
  const submit=teacher.getByRole('button',{name:'Submit answer'});
  await answer.fill('The open and close prices determine the completed candle body.');
  await submit.click();
  await host.getByRole('heading',{name:/Experiment/}).waitFor();
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
