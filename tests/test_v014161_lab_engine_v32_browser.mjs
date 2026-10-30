import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Only localhost test fixture permitted');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
  // The public homepage displays optional analytics consent. A genuine visitor
  // may decline it before using the Lab; otherwise the fixed panel can block
  // teaching controls in this unrelated browser acceptance test.
  const declineAnalytics=page.getByRole('button',{name:'Decline analytics'});
  if(await declineAnalytics.isVisible())await declineAnalytics.click();
  await page.addScriptTag({url:base+'/assets/js/lab-engine-v32-teaching.js'});
  await page.evaluate(()=>{
   const container=document.createElement('section');container.id='v32-smoke';
   document.body.append(container);
   window.GroundUpLabEngineV32.mount({labId:'F2-C07-L01',mode:'guided',target:container});
  });
  await page.getByText('Teach This in More Depth').click();
  assert.match(await page.locator('#v32-smoke').innerText(),/Body =/);
  await page.locator('#v32-smoke button').filter({hasText:'Next teaching step'}).click();
  await page.locator('#v32-smoke input[type=range]').fill('32.5');
  assert.match(await page.locator('#v32-smoke output').innerText(),/75.0%/);
  await page.locator('#v32-smoke button').filter({hasText:'Next teaching step'}).click();
  await page.locator('#v32-smoke button').filter({hasText:'Next teaching step'}).click();
  assert.match(await page.locator('#v32-smoke [role=status]').innerText(),/Lock your prediction/);
  await page.locator('#v32-smoke textarea').fill('The close changes the body but full high-to-low range is fixed.');
  await page.getByRole('button',{name:'Lock my ungraded prediction'}).click();
  await page.locator('#v32-smoke button').filter({hasText:'Next teaching step'}).click();
  await page.getByRole('button',{name:'Show a worked teaching example'}).click();
  assert.match(await page.locator('#v32-smoke').innerText(),/Study Only/);
  await page.evaluate(()=>window.GroundUpLabEngineV32.mount({labId:'F3-C06-L01',mode:'guided',target:document.getElementById('v32-smoke')}));
  await page.locator('#v32-smoke button').filter({hasText:'Next teaching step'}).click();
  assert.match(await page.locator('#v32-smoke output').innerText(),/VWAP/);
  await page.evaluate(()=>window.GroundUpLabEngineV32.mount({labId:'F3-C06-L01',mode:'blind',target:document.getElementById('v32-smoke')}));
  assert.equal(await page.locator('#v32-smoke').innerText(),'');
  assert.deepEqual(errors,[]);
  console.log('PASS v3.2 conceptual teaching, prediction and blind suppression at '+width+'px');
  await page.close();
 }
}finally{await browser.close()}
