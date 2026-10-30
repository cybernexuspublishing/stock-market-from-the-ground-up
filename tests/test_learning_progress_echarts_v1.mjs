/* Compact Lab/Academy ECharts progress. Synthetic UI; no account or data writes. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const script=readFileSync(new URL('../assets/js/learning-progress-echarts-v1.js',import.meta.url),'utf8');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const fragment=id=>'<div id="'+id+'" class="gu-learning-progress" hidden><span class="gu-learning-progress-stage"></span><span class="gu-learning-progress-percent"></span><div class="gu-learning-progress-chart"></div><div class="gu-learning-progress-fallback" role="progressbar" aria-valuenow="0"><span></span></div></div>';
const page=await browser.newPage();
try{
 await page.route('**/progress-fixture',route=>route.fulfill({status:200,contentType:'text/html',
  body:'<!doctype html><html><head></head><body>'+fragment('gu-learning-progress')+fragment('academy-learning-progress')+'</body></html>'}));
 await page.goto('http://127.0.0.1:8765/progress-fixture');
 await page.evaluate(()=>{
  window.__charts=[];
  window.CrownlightECharts={load:async()=>({init:()=>{
   const c={last:null,disposed:false,setOption(v){this.last=v},resize(){},dispose(){this.disposed=true}};
   window.__charts.push(c);return c;
  }})};
 });
 await page.addScriptTag({content:script});
 assert.equal(await page.locator('.gu-learning-progress:not([hidden])').count(),0);
 await page.evaluate(()=>window.CrownlightLearningProgress.mount('gu-learning-progress'));
 await page.waitForFunction(()=>document.querySelector('#gu-learning-progress').dataset.echarts==='ready');
 assert.equal(await page.locator('#gu-learning-progress .gu-learning-progress-stage').innerText(),'Stage 1 of 10 · Start');
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('gu-learning-visible-progress',
  {detail:{index:5,label:'Replay / Practice',percent:56,total:10}})));
 assert.equal(await page.locator('#gu-learning-progress .gu-learning-progress-stage').innerText(),'Stage 6 of 10 · Replay / Practice');
 assert.equal(await page.locator('#gu-learning-progress .gu-learning-progress-percent').innerText(),'56%');
 assert.equal(await page.locator('#gu-learning-progress .gu-learning-progress-fallback').getAttribute('aria-valuenow'),'56');
 const series=await page.evaluate(()=>window.__charts[0].last.series);
 assert.equal(series.length,3);
 assert.equal(series[1].data.filter(x=>x===0).length,6);
 assert.equal(series[1].data.filter(x=>x===null).length,4);
 await page.evaluate(()=>window.CrownlightLearningProgress.unmount('gu-learning-progress'));
 assert.equal(await page.locator('#gu-learning-progress').isVisible(),false);
 await page.evaluate(()=>window.CrownlightLearningProgress.mount('academy-learning-progress'));
 await page.waitForFunction(()=>document.querySelector('#academy-learning-progress').dataset.echarts==='ready');
 assert.equal(await page.locator('#academy-learning-progress .gu-learning-progress-stage').innerText(),'Stage 1 of 10 · Start');
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('gu-learning-visible-progress',
  {detail:{index:9,percent:100,total:10}})));
 assert.equal(await page.locator('#academy-learning-progress .gu-learning-progress-percent').innerText(),'100%');
 await page.evaluate(()=>window.CrownlightLearningProgress.reset('academy-learning-progress'));
 assert.equal(await page.locator('#academy-learning-progress .gu-learning-progress-percent').innerText(),'0%');
 await page.evaluate(()=>window.CrownlightLearningProgress.unmount('academy-learning-progress'));
 assert.equal(await page.locator('#academy-learning-progress').isVisible(),false);
 console.log('PASS compact ECharts progress, deferred mount, ten stages, Academy lifecycle');
}finally{await browser.close()}
