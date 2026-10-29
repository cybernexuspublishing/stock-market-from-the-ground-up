import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const css=['assets/css/styles.css','assets/css/crownlight-cardless-layout-v1.css'].map(p=>readFileSync(p,'utf8')).join('\n');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
try{
 await page.setContent('<html><body data-cl-workspace="classic"><main class="section"><div class="wrap"><h1>Learning</h1><div class="grid"><article class="card">A</article><article class="card">B</article><article class="card">C</article></div></div></main></body></html>');
 await page.addStyleTag({content:css});
 const metrics=()=>page.evaluate(()=>{
  const items=[...document.querySelectorAll('.grid>.card')],style=getComputedStyle(items[0]);
  return {boxes:items.map(x=>{const r=x.getBoundingClientRect();return{x:r.x,y:r.y}}),bg:style.backgroundColor,shadow:style.boxShadow,rule:style.borderBottomStyle};
 });
 const original=await metrics();
 await page.evaluate(()=>document.body.dataset.clWorkspace='list');
 const list=await metrics();
 assert(list.boxes[1].y>list.boxes[0].y+10,'List must show vertical rows');
 assert.equal(list.shadow,'none');assert.equal(list.bg,'rgba(0, 0, 0, 0)');
 assert.equal(list.rule,'solid');
 await page.evaluate(()=>document.body.dataset.clWorkspace='table');
 const table=await metrics();
 assert(Math.abs(table.boxes[1].y-table.boxes[0].y)<2,'Directory must have two columns');
 assert(table.boxes[2].y>table.boxes[0].y+10);
 await page.setViewportSize({width:600,height:900});
 const narrow=await metrics();
 assert(narrow.boxes[1].y>narrow.boxes[0].y+10,'Directory mobile is single-column');
 await page.evaluate(()=>document.body.dataset.clWorkspace='classic');
 const restored=await metrics();assert.equal(restored.bg,original.bg);
 console.log('PASS card-free Clean List, Directory, responsive fallback and original restoration');
}finally{await browser.close()}
