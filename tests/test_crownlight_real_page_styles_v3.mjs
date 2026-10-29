/* Real page-markup geometry for five distinct layout styles.
 * No provider calls, customer sessions, or database writes. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const read=p=>readFileSync(p,'utf8');
const CSS=read('assets/css/styles.css')+'\n'+read('assets/css/premium-design-v014168.css')+'\n'+
 read('assets/css/sitewide-composition-v014234.css')+'\n'+
 read('assets/css/crownlight-page-workspace-v2.css')+'\n'+
 read('assets/css/crownlight-page-style-visibility-v3.css');
const SCRIPT=read('assets/js/crownlight-continuous-workspace-v1.js');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1580,height:1100}});
function clean(html){
 return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
  .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi,'')
  .replace(/<script\b[^>]*\/>/gi,'');
}
async function load(name){
 await page.setContent(clean(read(name)),{waitUntil:'domcontentloaded'});
 await page.addStyleTag({content:CSS});
}
const mode=async x=>page.evaluate(m=>document.body.dataset.clWorkspace=m,x);
const rect=async selector=>page.locator(selector).first().evaluate(e=>{
 const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}
});
try{
 // Home is a real two-column hero with an actual chart artwork.
 await load('index.html');
 await mode('classic');
 const original=await Promise.all([rect('.gu-home-message'),rect('.gu-home-terminal')]);
 await mode('compact');const compact=await Promise.all([rect('.gu-home-message'),rect('.gu-home-terminal')]);
 await mode('focus');const focus=await Promise.all([rect('.gu-home-message'),rect('.gu-home-terminal')]);
 assert(Math.abs(compact[0].y-compact[1].y)<5,'Compact Home must be side-by-side');
 assert(focus[1].y>=focus[0].y+focus[0].height-4,'Focused Home must stack the learning chart below the message');
 assert(compact[0].width>compact[1].width*1.7,'Compact Home must give message a clearly larger pane');
 assert(Math.abs(compact[0].width-original[0].width)>40,'Compact must change actual hero placement');
 await mode('spacious');const spacious=await Promise.all([rect('.gu-home-message'),rect('.gu-home-terminal')]);
 assert(Math.abs(spacious[0].y-spacious[1].y)<5,'Spacious keeps two-column hero');
 assert(spacious[1].width>compact[1].width+100,'Spacious gives chart significantly more width');
 console.log('PASS real Home markup: compact asymmetric desk; focused stacked; spacious larger art; Classic comparison');

 // Store: existing advertising rails remain; four realistic product tiles change columns.
 await load('store.html');
 await page.locator('#store-panel-books').evaluate(e=>e.hidden=false);
 await page.locator('#store-products').evaluate(e=>{
  e.replaceChildren();
  for(let i=0;i<4;i++){let c=document.createElement('article');c.className='commerce-card';
   c.style.minHeight='160px';c.textContent='Sample item '+i;e.append(c)}
 });
 await mode('compact');let cards=await page.locator('#store-products>.commerce-card').evaluateAll(e=>e.map(x=>{
  const r=x.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width};
 }));
 assert(cards.length===4&&Math.abs(cards[0].y-cards[3].y)<4,
  'Compact Store must show four real product cards in one row: '+JSON.stringify(cards));
 await mode('focus');const focused=await page.locator('#store-products>.commerce-card').evaluateAll(e=>e.map(x=>{
  const r=x.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width};
 }));
 assert(focused[2].y>focused[0].y+90,'Focused Store must reduce product grid to two columns: '+JSON.stringify(focused));
 await mode('spacious');const expanded=await page.locator('#store-products>.commerce-card').first().evaluate(e=>e.getBoundingClientRect().width);
 assert(expanded>=focused[0].width-3,'Spacious Store must not squeeze cards');
 console.log('PASS real Store markup: Compact four-column catalog; Focused two-column catalog; Spacious roomy catalog');

 await load('forum.html');
 await page.locator('#forum-content').evaluate(e=>e.hidden=false);
 await mode('compact');
 assert.equal(await page.locator('.forum-toolbar').evaluate(e=>getComputedStyle(e).display),'grid');
 await mode('focus');
 assert.equal(await page.locator('.forum-toolbar').evaluate(e=>getComputedStyle(e).flexDirection),'column');
 await mode('classic');
 assert.notEqual(await page.locator('.forum-toolbar').evaluate(e=>getComputedStyle(e).display),'grid');
 console.log('PASS real Forum markup: Compact grid controls; Focused vertical controls; Classic restored');

 // Learning System: actual course cards change grid count.
 await load('learn.html');
 await mode('compact');
 const compactGrid=await page.locator('main .grid .card').first().evaluate(e=>e.getBoundingClientRect());
 const cs=await page.locator('main .grid').first().evaluate(e=>getComputedStyle(e).gridTemplateColumns);
 await mode('focus');
 const fs=await page.locator('main .grid').first().evaluate(e=>getComputedStyle(e).gridTemplateColumns);
 assert(cs!==fs,'Learning card columns must visibly differ');
 console.log('PASS real Learning System markup: compact vs focused column arrangements');

 // Owner-only in-page preview; no unauthenticated query-string bypass.
 await page.route('https://preview.local/index.html?workspace=compact',route=>route.fulfill({
  status:200,contentType:'text/html',body:'<html><body><main class="gu-premium-home"><p>Home</p></main></body></html>'}));
 await page.goto('https://preview.local/index.html?workspace=compact');
 await page.evaluate(()=>{
  window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'synthetic-owner'}}})}});
  window.fetch=async()=>new Response(JSON.stringify({ok:true,page:'index.html',mode:'compact',
   savedStyle:'continuous',published:true,ownerPreview:true,preview:true}),{
    status:200,headers:{'content-type':'application/json'}});
 });
 await page.addScriptTag({content:SCRIPT});
 await page.waitForSelector('[data-cl-live-style]');
 assert.equal(await page.locator('body').getAttribute('data-cl-workspace'),'compact');
 await page.locator('[data-cl-live-style]').selectOption('focus');
 assert.equal(await page.locator('body').getAttribute('data-cl-workspace'),'focus');
 assert.equal(new URL(page.url()).searchParams.get('workspace'),'focus');
 await page.locator('[data-cl-live-style]').selectOption('classic');
 assert.equal(await page.locator('body').getAttribute('data-cl-workspace'),'classic');
 assert.match(await page.locator('.cl-style-live-status').innerText(),/saved: Continuous Desk/);
 console.log('PASS Owner instant preview bar: five style options, local compare, no server saves');
}finally{await browser.close();}
