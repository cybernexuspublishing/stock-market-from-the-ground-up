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
  await page.addScriptTag({url:base+'/assets/js/lab-engine-v32-universal.js'});
  await page.evaluate(async()=>{
   const target=document.createElement('section');target.id='universal-test';document.body.append(target);
   window.testMounted=await window.GroundUpLabEngineV32Universal.mount({labId:'SITE-001',mode:'guided',target,lab:{id:'SITE-001',concept:'Independent Risk Planning'}});
  });
  assert.equal(await page.evaluate(()=>window.testMounted),true);
  await page.getByRole('heading',{name:'Start'}).waitFor();
  for(const expected of ['Learn','Experiment','Predict']){
   await page.getByRole('button',{name:'Next learning stage'}).click();
   await page.locator('#universal-test').getByRole('heading',{name:expected,exact:true}).waitFor();
  }
  await page.getByRole('button',{name:'Next learning stage'}).click();
  assert.match(await page.locator('#universal-test [role=status]').innerText(),/Lock a prediction/);
  await page.locator('#universal-test textarea').fill('Future continuation is not known, and crossing below the level would invalidate my hypothesis.');
  await page.getByRole('button',{name:'Lock my prediction'}).click();
  await page.getByRole('button',{name:'Next learning stage'}).click();
  await page.locator('#universal-test textarea').fill('I can only use values already observed; I must define units, comparison and invalidation.');
  await page.getByRole('button',{name:'Record independent practice'}).click();
  await page.getByRole('button',{name:'Next learning stage'}).click();
  await page.locator('#universal-test').getByRole('heading',{name:'Assess',exact:true}).waitFor();
  assert.match(await page.locator('#universal-test').innerText(),/server-graded question bank/);
  await page.evaluate(async()=>{const t=document.getElementById('universal-test');await window.GroundUpLabEngineV32Universal.mount({labId:'TAPE-C01-L01',mode:'guided',target:t,lab:{id:'TAPE-C01-L01'}})});
  assert.match(await page.locator('#universal-test').innerText(),/TAPE-C01-L01/);
  await page.evaluate(async()=>{const t=document.getElementById('universal-test');await window.GroundUpLabEngineV32Universal.mount({labId:'TAPE-C01-L01',mode:'assessment',target:t})});
  assert.equal(await page.locator('#universal-test').innerText(),'');
  assert.deepEqual(errors,[]);
  console.log('PASS all-collection v3.3 nine-stage study browser contract at '+width+'px');
  await page.close();
 }
}finally{await browser.close()}
