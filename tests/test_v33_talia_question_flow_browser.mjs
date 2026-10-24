/* Talia's interactive learning-question flow; local fixture only.
 * No credentials, Supabase, official grades, market-data requests or replay advances.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Localhost fixture required');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
  for(const sheet of ['lab-v33-contextual-visuals.css','lab-v33-instructor.css','lab-v33-experience.css'])
   await page.addStyleTag({url:base+'/assets/css/'+sheet});
  for(const source of ['lab-engine-v32-teaching.js','lab-engine-v33-visual.js','lab-v33-contextual-visuals.js',
   'lab-v33-visual-interactions.js','lab-v33-instruction-content.js','lab-v33-instructor.js',
   'lab-engine-v32-universal.js'])
   await page.addScriptTag({url:base+'/assets/js/'+source});
  await page.evaluate(async()=>{
   const target=document.createElement('section');target.id='gu-v32-teaching-slot';
   document.body.prepend(target);
   window.taliaFlowReady=await window.GroundUpLabEngineV32Universal.mount({
    labId:'F2-C07-L01',mode:'guided',target,
    lab:{id:'F2-C07-L01',concept:'Construct an Up / Bullish Candle'}
   });
  });
  assert.equal(await page.evaluate(()=>window.taliaFlowReady),true);
  const root=page.locator('#gu-v32-teaching-slot');
  const dialogue=root.locator('.gu-v33-instructor-narration .gu-v33-instructor-dialogue');
  const answer=()=>dialogue.locator('textarea');
  const progress=()=>dialogue.locator('.gu-v33-instructor-question-counter');
  const submit=async value=>{
   await answer().fill(value);
   await dialogue.getByRole('button',{name:'Submit answer'}).click();
  };
  const good='I can identify the completed candle and explain why the visible prices support the interpretation.';
  assert.equal(await dialogue.count(),1,'Talia must ask inside the narration window');
  assert.match(await progress().textContent(),/Question 1 of 2/);
  await submit('too brief');
  assert.match(await progress().textContent(),/Question 1 of 2/,'Too-short responses must not advance');
  await submit(good);
  assert.match(await progress().textContent(),/Question 2 of 2/,'First submission advances the question');
  await submit('I must know what data are available because hidden future candles cannot be used as evidence.');
  await root.getByRole('heading',{name:/Learn —/}).waitFor();
  assert.match(await progress().textContent(),/Question 1 of 2/,'New learning stage starts at its first question');
  await submit(good);await submit(good);
  await root.getByRole('heading',{name:/Experiment —/}).waitFor();
  await submit(good);await submit(good);
  await root.getByRole('heading',{name:/Predict —/}).waitFor();
  assert.equal(await root.locator('.gu-v33-instructor-dialogue').count(),0,'Predict remains independent');
  await root.locator('textarea').fill('The next candle is unknown because I have only the completed observations and a defined invalidation.');
  await root.getByRole('button',{name:'Lock my prediction'}).click();
  await root.getByRole('button',{name:'Next learning stage'}).click();
  await root.getByRole('heading',{name:/Practice —/}).waitFor();
  await submit('1');
  assert.match(await progress().textContent(),/Question 2 of 3/);
  await submit('9999');
  assert.match(await progress().textContent(),/Question 2 of 3/,'Wrong calculation must not advance');
  assert.match(await dialogue.locator('.gu-v33-instructor-reply').textContent(),/Let’s correct range/);
  await submit('2');
  assert.match(await progress().textContent(),/Question 3 of 3/);
  await submit('50');
  await root.getByRole('heading',{name:/Assess —/}).waitFor();
  assert.equal(await root.locator('.gu-v33-instructor-dialogue').count(),0,'Assessment remains protected');
  assert.deepEqual(errors,[],width+'px must not produce JavaScript errors');
  console.log('PASS Talia question-by-question automatic advancement, practice answer validation and protected Predict/Assess at '+width+'px');
  await page.close();
 }
}finally{await browser.close()}
