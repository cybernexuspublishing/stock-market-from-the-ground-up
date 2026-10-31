/* Headless functional regression for the shared Boot Camp instructor.
 * Synthetic samples only; never writes to Supabase or accesses protected grading.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1360,height:900}});
 const css=read('assets/css/academy-guided-v1.css');
 await page.setContent('<html><head><style>'+css+'</style></head><body><div id="host"></div></body></html>');
 await page.addScriptTag({content:read('assets/js/academy-guided-v1.js')});
 const codes=['truth5','watchlist7','scanners10','foundations30','charts45','risk60','practicum90'];
 for(const code of codes){
  await page.evaluate(code=>{
   const host=document.getElementById('host');
   window.__guided?.dispose?.();
   window.__guided=window.GroundUpAcademyGuidedV1.mount(host,{day:{
    day:1,programCode:code,title:'Chart and Evidence Research',
    objective:'Identify the source, interval, and relevant chart facts.',
    observe:'Record the dated source and OHLC values from the available record.',
    practice:'Compare two observations without predicting the next candle.',
    method:['Check original source','Record the decision'],limitation:'No future market result is established.',
    officiallyGraded:false},programCode:code});
  },code);
  assert.equal(await page.locator('.academy-guided-nav button').count(),10,code+' ten stages');
  assert.equal(await page.locator('.academy-guided-ten').count(),1,code+' mounted');
  await page.getByRole('button',{name:'Next lesson step'}).click();
  await page.getByRole('button',{name:'Next lesson step'}).click();
  assert.match(await page.locator('.academy-guided-content h4').innerText(),/3\. Calculate \/ Analyze/);
  await page.getByRole('button',{name:'Close & Next — Submit answer'}).click();
  assert.match(await page.locator('.academy-guided-ten [role=status]').last().innerText(),/Choose an answer/);
  const opts=page.locator('.academy-guided-choice');
  const count=await opts.count();assert.equal(count,3);
  // The correct answer is day/step rotated, not position-dependent.
  const correctIndex= (3-(1+2)%3)%3;
  await opts.nth((correctIndex+1)%3).locator('input').check();
  await page.getByRole('button',{name:'Close & Next — Submit answer'}).click();
  assert.match(await page.locator('.academy-guided-content h4').innerText(),/3\. Calculate \/ Analyze/);
  assert.match(await page.locator('.academy-guided-ten [role=status]').last().innerText(),/Not yet/);
  await opts.nth(correctIndex).locator('input').check();
  await page.getByRole('button',{name:'Close & Next — Submit answer'}).click();
  assert.match(await page.locator('.academy-guided-content h4').innerText(),/4\. Experiment/);
  await page.getByRole('button',{name:'Explain This Concept — Free'}).click();
  assert.match(await page.locator('.academy-guided-ten [role=status]').last().innerText(),/Talia explains/);
 }
 await page.setViewportSize({width:540,height:900});
 const cols=await page.locator('.academy-guided-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').filter(Boolean).length);
 assert.equal(cols,1,'Mobile stacks chart and Talia');
 console.log('PASS interactive ten-stage guided checkpoints, wrong-answer retries and mobile layout across all seven Boot Camps');
}finally{await browser.close()}
