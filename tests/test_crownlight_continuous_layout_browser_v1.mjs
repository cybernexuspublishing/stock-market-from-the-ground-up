import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const css=readFileSync('assets/css/crownlight-continuous-workspace-v1.css','utf8');
const base=readFileSync('assets/css/crownlight-simulator-layout-v3.css','utf8');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1510,height:900}});
try{
 await page.setContent('<html><body data-cl-workspace="classic"><main class="section"><div class="wrap"><div id="sim-legacy-mode"><div id="sim-content"><section id="cl-replay-import" style="height:45px"></section><div id="cl-chart-visibility-toolbar" style="height:40px"></div><section class="sim-layout"><div class="sim-chart-panel" style="height:480px"></div></section><section id="cl-simulator-workbench" style="height:430px"></section></div></div></div></main></body></html>');
 await page.addStyleTag({content:base});
 await page.addStyleTag({content:css});
 const geometry=()=>page.evaluate(()=>{
  const chart=document.querySelector('#sim-content>.sim-layout').getBoundingClientRect();
  const work=document.querySelector('#cl-simulator-workbench').getBoundingClientRect();
  const source=document.querySelector('#cl-replay-import').getBoundingClientRect();
  return {chart:{left:chart.left,top:chart.top,right:chart.right,bottom:chart.bottom,width:chart.width},
   work:{left:work.left,top:work.top,right:work.right,bottom:work.bottom,width:work.width},
   source:{left:source.left,right:source.right}};
 });
 let g=await geometry();
 assert(g.work.top>=g.chart.bottom-2,'Classic layout must remain vertically stacked');
 await page.evaluate(()=>document.body.dataset.clWorkspace='continuous');
 g=await geometry();
 assert(Math.abs(g.chart.top-g.work.top)<2,'Continuous layout must align chart and trade panel');
 assert(g.work.left>=g.chart.right-2,'Trade panel must sit to the right of chart');
 assert(g.chart.width>g.work.width*1.7,'Chart gets dominant width');
 assert(g.source.right>g.work.right-5,'Import spans the desk width');
 await page.setViewportSize({width:900,height:950});
 g=await geometry();
 assert(g.work.top>=g.chart.bottom-2,'Narrow viewport must stack, not clip');
 await page.setViewportSize({width:1510,height:900});
 g=await geometry();
 assert(Math.abs(g.chart.top-g.work.top)<2,'Continuous layout restores after viewport expansion');
 console.log('PASS classic vs continuous real Chromium geometry, right-side planning, full-width import and mobile fallback');
}finally{await browser.close()}
