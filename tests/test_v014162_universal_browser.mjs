/* Only localhost static educational preview; no real member authentication. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Local source fixture only');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900},serviceWorkers:'block'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
  // Respect the actual opt-in panel via its documented decline action before
  // testing unrelated Lab controls. This is an isolated localhost test context.
  const analyticsChoice=page.locator('#smfgu-analytics-choice');
  if(await analyticsChoice.isVisible()){
   await analyticsChoice.getByRole('button',{name:'Decline analytics'}).click();
   assert.equal(await analyticsChoice.isVisible(),false,'Declining optional analytics closes the panel');
  }
  await page.addScriptTag({url:base+'/assets/js/lab-engine-v32-universal.js'});
  await page.evaluate(async()=>{
   const target=document.createElement('section');target.id='universal-test';document.body.append(target);
   window.testMounted=await window.GroundUpLabEngineV32Universal.mount({labId:'SITE-001',mode:'guided',target,lab:{id:'SITE-001',concept:'Independent Risk Planning'}});
  });
  assert.equal(await page.evaluate(()=>window.testMounted),true);
  await page.getByRole('button',{name:'Play guided teaching automatically'}).waitFor();
  const auto=page.getByRole('button',{name:'Play guided teaching automatically'});
  await auto.click();
  assert.equal(await page.getByRole('button',{name:'Pause guided autoplay'}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Pause guided autoplay'}).click();
  assert.equal(await auto.getAttribute('aria-pressed'),'false');
  await page.getByRole('button',{name:'Start Guided Learning →'}).waitFor();
  await page.getByRole('button',{name:'Start Guided Learning →'}).click();
  for(const expected of ['Learn','Experiment','Predict']){
   if(expected!=='Learn')await page.getByRole('button',{name:'Next learning stage'}).click();
   await page.locator('#universal-test').getByRole('heading',{name:expected,exact:true}).waitFor();
  }
  await page.getByRole('button',{name:'Next learning stage'}).click();
  const predictionStatus=page.locator('#universal-test [role="status"]').filter({hasText:'Lock your prediction before continuing.'});
  assert.equal(await predictionStatus.count(),1,'Prediction feedback must have one accessible status announcement');
  assert.match(await predictionStatus.innerText(),/Lock your prediction/);
  await page.locator('#universal-test textarea').fill('Future continuation is not known, and crossing below the level would invalidate my hypothesis.');
  await page.getByRole('button',{name:'Lock my prediction'}).click();
  await page.getByRole('button',{name:'Next learning stage'}).click();
  await page.locator('#universal-test textarea').fill('I can only use values already observed; I must define units, comparison and invalidation.');
  await page.getByRole('button',{name:'Record ungraded practice'}).click();
  await page.getByRole('button',{name:'Next learning stage'}).click();
  await page.locator('#universal-test').getByRole('heading',{name:'Assess',exact:true}).waitFor();
  assert.match(await page.locator('#universal-test').innerText(),/server-graded question bank/);
  await page.evaluate(async()=>{const t=document.getElementById('universal-test');await window.GroundUpLabEngineV32Universal.mount({labId:'TAPE-C01-L01',mode:'guided',target:t,lab:{id:'TAPE-C01-L01'}})});
  assert.doesNotMatch(await page.locator('#universal-test').innerText(),/TAPE-C01-L01/,'Internal Lab IDs must not be narrated as member-facing teaching');
   await page.getByRole('button',{name:'Start Guided Learning →'}).waitFor();
  await page.evaluate(async()=>{const t=document.getElementById('universal-test');await window.GroundUpLabEngineV32Universal.mount({labId:'TAPE-C01-L01',mode:'assessment',target:t})});
  assert.match(await page.locator('#universal-test').innerText(),/Assessment — Independent Decision/);
  assert.match(await page.locator('#universal-test').innerText(),/No answer keys/);
  assert.equal(await page.locator('#universal-test').getByText('TAPE-C01-L01').count(),0,'Assessment shell must not reveal the Lab concept or private instruction');
  assert.deepEqual(errors,[]);
  console.log('PASS all-collection v3.3 nine-stage study browser contract at '+width+'px');
  await page.close();
 }
}finally{await browser.close()}
