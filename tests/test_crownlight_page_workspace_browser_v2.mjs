import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const css=readFileSync('assets/css/crownlight-page-workspace-v2.css','utf8');
const simulatorCSS=readFileSync('assets/css/crownlight-continuous-workspace-v1.css','utf8');
const styleCSS=readFileSync('assets/css/crownlight-page-workspace-v2.css','utf8');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1520,height:950}});
try{
 await page.setContent('<html><body data-cl-workspace="classic"><header class="site-header"><div class="wrap">Site</div></header><main class="section"><div class="wrap" style="width:950px;max-width:950px"><h1>Learning</h1><section class="journal-card" style="height:220px">Learning experience</section></div></main></body></html>');
 await page.addStyleTag({content:css});
 // Remove inline width fixture to let the V2 selector win.
 await page.locator('main>.wrap').evaluate(e=>{e.style.width='';e.style.maxWidth=''});
 await page.addStyleTag({content:'.wrap{max-width:980px;width:100%;margin-inline:auto}.section{padding-top:65px}.journal-card{border-radius:24px;box-shadow:0 10px 20px black}'});
 const metrics=()=>page.evaluate(()=>{
  const box=document.querySelector('main>.wrap').getBoundingClientRect();
  const h=document.querySelector('main.section');const c=document.querySelector('.journal-card');
  return {width:box.width,top:getComputedStyle(h).paddingTop,radius:getComputedStyle(c).borderRadius};
 });
 let classic=await metrics();assert(classic.width<1000);
 await page.evaluate(()=>document.body.dataset.clWorkspace='continuous');
 let full=await metrics();assert(full.width>1350,'Full-page mode must expand content width, not only chart player');
 assert.equal(full.top,'12px');assert.equal(full.radius,'8px');
 await page.setViewportSize({width:740,height:920});full=await metrics();assert(full.width>=690&&full.width<=740);
 await page.evaluate(()=>document.body.dataset.clWorkspace='classic');
 let again=await metrics();assert(again.width<1000,'Disable must restore Classic layout without reload');
 // Verify actual specialized page shells, not only pages with main.section>.wrap.
 await page.setViewportSize({width:1520,height:950});
 for(const [mainClass,wrapper] of [
  ['gu-premium-home','<section class="gu-home-stage"><div class="wrap" id="shell"></div></section>'],
  ['gu-commons-page','<div class="wrap" id="shell"></div>'],
  ['section gu-redesign-store','<div class="gu-store-ad-shell" id="shell"></div>'],
  ['section gu-redesign-academy','<div class="gu-learning-ad-layout" id="shell"></div>'],
  ['section gu-skills-page','<div class="gu-learning-ad-layout" id="shell"></div>']
 ]){
  await page.setContent('<html><body data-cl-workspace="classic"><main class="'+mainClass+'">'+wrapper+'</main></body></html>');
  await page.addStyleTag({content:'.wrap,.gu-store-ad-shell,.gu-learning-ad-layout{width:100%;max-width:980px;margin:auto}'});
  await page.addStyleTag({content:css});
  await page.evaluate(()=>document.body.dataset.clWorkspace='continuous');
  const width=await page.locator('#shell').evaluate(e=>e.getBoundingClientRect().width);
  assert(width>1350,'Full-page mode must cover specialized '+mainClass+' shell, got '+width);
 }
 // Each preset must cause a measurably different real browser layout.
 await page.setViewportSize({width:1560,height:940});
 await page.setContent('<html><body data-cl-workspace="classic"><main class="section"><div class="wrap"><div id="sim-content"><section id="cl-replay-import" style="height:40px"></section><div id="cl-chart-visibility-toolbar" style="height:40px"></div><section class="sim-layout" style="height:460px"></section><section id="cl-simulator-workbench" style="height:420px"></section></div></div></main></body></html>');
 await page.addStyleTag({content:'.wrap{width:100%;max-width:950px;margin:auto}.section{padding-top:50px}#sim-content{display:flex;flex-direction:column;gap:12px}#sim-content>*{min-width:0;width:100%}'});
 await page.addStyleTag({content:styleCSS});
 await page.addStyleTag({content:simulatorCSS});
 const rects=()=>page.evaluate(()=>{
  const chart=document.querySelector('.sim-layout').getBoundingClientRect(),desk=document.querySelector('#cl-simulator-workbench').getBoundingClientRect();
  return {chart:{top:chart.top,left:chart.left,right:chart.right,width:chart.width,bottom:chart.bottom},
   desk:{top:desk.top,left:desk.left,width:desk.width},gap:getComputedStyle(document.querySelector('#sim-content')).gap,
   wrap:document.querySelector('main>.wrap').getBoundingClientRect().width};
 });
 const original=await rects();assert(original.desk.top>=original.chart.bottom);
 await page.evaluate(()=>document.body.dataset.clWorkspace='continuous');
 const continuous=await rects();assert(Math.abs(continuous.chart.top-continuous.desk.top)<3);
 assert(continuous.desk.left>=continuous.chart.right-3);
 await page.evaluate(()=>document.body.dataset.clWorkspace='compact');
 const compact=await rects();assert(Math.abs(compact.chart.top-compact.desk.top)<3);
 assert(compact.chart.width>compact.desk.width&&compact.wrap>original.wrap);
 await page.evaluate(()=>document.body.dataset.clWorkspace='focus');
 const focus=await rects();assert(focus.desk.top>=focus.chart.bottom-3);
 assert(focus.wrap>original.wrap);
 await page.evaluate(()=>document.body.dataset.clWorkspace='spacious');
 const spacious=await rects();assert(spacious.desk.top>=spacious.chart.bottom-3);
 assert(spacious.gap==='22px');
 await page.evaluate(()=>document.body.dataset.clWorkspace='classic');
 const restored=await rects();assert(Math.abs(restored.wrap-original.wrap)<2);
 console.log('PASS five original/continuous/focus/compact/spacious chart layouts and reversible Classic presentation');
}finally{await browser.close()}
