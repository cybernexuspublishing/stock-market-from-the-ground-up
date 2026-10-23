/* Regression: owner-exact v3.2 member demonstration for the two reviewed
 * reference subjects. This tests fictional in-memory exercises only.
 * Do not confuse with authoritative assessment, credit or real replay QA. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Local build-only browser fixture required');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const input=async (page,key,value)=>{
 const selector='[data-input="'+key+'"]';
 const loc=page.locator(selector).first;
 assert(await loc.count(),'Required input absent: '+key);
 const type=await loc.getAttribute('type');
 if(type==='radio')await page.locator(selector+'[value="'+value+'"]').check();
 else if(type==='range')await loc.evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}))},String(value));
 else await loc.fill(String(value));
};
const action=async(page,name)=>{const b=page.locator('button[data-action="'+name+'"]').first;assert(await b.count(),'Action missing: '+name);await b.click()};
const assertStage=async(page,part)=>assert((await page.locator('.content h2').first.innerText()).includes(part),part+' stage not reached');
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:1360},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/lab-player.html?lab=F2-C07-L01',{waitUntil:'load',timeout:25000});
  assert(new URL(page.url()).pathname.endsWith('/lab-v32-member.html'),'Candlestick must render full v3.2 UI, not generic engine');
  assert.equal(await page.locator('h1').innerText(),'Build and Understand a Candlestick');
  assert.equal(await page.locator('.stage-item').count(),9);
  assertStage && await assertStage(page,'Welcome');
  await action(page,'next');await input(page,'introAnswer','range');await action(page,'introCheck');
  await assertStage(page,'Experiment');
  assert.equal(await page.locator('.chart-shell').count(),1);
  await input(page,'expClose','30.9');await input(page,'expAnswer','bear');await action(page,'expCheck');
  await input(page,'predAnswer','Bearish');await action(page,'predCheck');await action(page,'next');
  for(const value of ['1','2','50']){await input(page,'practiceAnswer',value);await action(page,'checkPractice');await action(page,'nextPractice')}
  for(const [key,value] of [['a0','0.8'],['a1','2'],['a2','40']])await input(page,key,value);
  await action(page,'submitAssessment');await action(page,'next');await assertStage(page,'Transfer');
  for(const [key,value] of [['tDirection','Bearish'],['tBody','0.3'],['tRange','0.8'],['tPercent','37.5']])await input(page,key,value);
  await action(page,'lockTransfer');await action(page,'next');await assertStage(page,'Report');
  assert.deepEqual(errors,[],'Candlestick JavaScript errors');
  await page.goto(base+'/lab-player.html?lab=F3-C06-L01',{waitUntil:'load',timeout:25000});
  assert(new URL(page.url()).pathname.endsWith('/lab-v32-member.html'),'VWAP must render full v3.2 UI, not generic engine');
  assert.equal(await page.locator('h1').innerText(),'Understand VWAP and Replay the Market');
  await action(page,'next');await input(page,'introAnswer','sum');await action(page,'introCheck');
  await input(page,'expVolume','500');await input(page,'expAnswer','weight');await action(page,'expCheck');
  await input(page,'predAnswer','uncertain');await action(page,'predCheck');await action(page,'next');
  for(const value of ['2600','300','8.67']){await input(page,'practiceAnswer',value);await action(page,'checkPractice');await action(page,'nextPractice')}
  for(const [key,value] of [['a0','3300'],['a1','400'],['a2','8.25']])await input(page,key,value);
  await action(page,'submitAssessment');await action(page,'next');await assertStage(page,'Transfer');
  assert.equal(await page.locator('.chart-shell').count(),1);
  assert.equal(await page.locator('svg[aria-label*="future candles are not drawn"]').count(),1);
  for(let i=2;i<8;i++){
   await input(page,'replayChoice',i===2?'hold':'loss');
   await input(page,'replayDecision','wait');
   await input(page,'replayForecast','uncertain');
   await action(page,'lockReplay');
   if(!(await page.locator('button[data-action="advanceReplay"]').count())){
    for(const candidate of ['loss','reclaim','failed','below','hold']){
     await input(page,'replayChoice',candidate);await action(page,'lockReplay');
     if(await page.locator('button[data-action="advanceReplay"]').count())break;
    }
   }
   assert(await page.locator('button[data-action="advanceReplay"]').count(),'Replay observation did not lock: '+i);
   await action(page,'advanceReplay');
  }
  await assertStage(page,'Report');
  assert.deepEqual(errors,[],'VWAP JavaScript errors');
  await page.close();
  console.log('PASS '+width+'px v3.2 exact member demo: Candlestick/VWAP full journeys, live charts, distinct assessments, six sequential replay locks and Results');
 }
}finally{await browser.close()}
