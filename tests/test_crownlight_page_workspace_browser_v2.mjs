import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const css=readFileSync('assets/css/crownlight-page-workspace-v2.css','utf8');
const simulatorCSS=readFileSync('assets/css/crownlight-continuous-workspace-v1.css','utf8');
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
 console.log('PASS full-page content width, compact cards, responsive viewport and reversible Classic layout');
}finally{await browser.close()}
