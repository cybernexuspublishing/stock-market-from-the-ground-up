/* Boot Camp gallery browser acceptance: synthetic data, no member or billing writes. */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {basename} from 'node:path';
import {chromium} from 'playwright';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const styles=['assets/css/free-foundations-v1.css','assets/css/bootcamp-academy-v014168.css',
 'assets/css/bootcamp-academy-compact-v2.css','assets/css/learning-destination-picker-v1.css',
 'assets/css/bootcamp-academy-icons-v1.css','assets/css/bootcamp-academy-gallery-v2.css'].map(load).join('\n');
const codes=['truth-and-sources','research-watchlist','market-scanners','trading-foundations',
 'chart-reading-setups','risk-execution','simulated-practicum'];
const cards=codes.map((name,i)=>'<article class="academy-program academy-program--compact">'+
 '<a class="academy-program-compact-link" href="/bootcamp-academy.html?program='+name+'">'+
 '<span class="academy-program-visual"><img class="academy-program-cover" alt="" src="/assets/images/bootcamp-covers/'+name+'.svg"></span>'+
 '<span class="academy-program-compact-name">Course '+(i+1)+'</span><span class="academy-program-compact-id">course'+(i+1)+'</span>'+
 '</a></article>').join('');
const html='<!doctype html><html><head><meta charset="utf-8"><style>'+styles+'</style></head>'+
 '<body class="gu-bc-learning"><main class="gu-redesign-academy"><div class="gu-learning-ad-core"><div class="wrap">'+
 '<section class="academy-free-entry academy-free-feature">'+
 '<img class="gu-academy-free-art" alt="" width="144" height="132" src="/assets/images/bootcamp-covers/trading-foundations.svg">'+
 '<div><h2>Start with Talia</h2><p>Free Foundations teaching</p></div>'+
 '<a class="btn" href="/bootcamp-academy.html?program=free5">Open Free Foundations</a></section>'+
 '<section id="academy-program-list"><div id="academy-programs" class="academy-program-grid">'+cards+
 '</div></section></div></div></main></body></html>';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage();
try{
 await page.route('**/gallery-fixture',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
 await page.route('**/assets/images/bootcamp-covers/*.svg',route=>{
  const name=basename(new URL(route.request().url()).pathname),path='assets/images/bootcamp-covers/'+name;
  assert(existsSync(new URL('../'+path,import.meta.url)));
  return route.fulfill({status:200,contentType:'image/svg+xml',body:load(path)});
 });
 for(const [width,expected] of [[1360,3],[860,2],[480,1]]){
  await page.setViewportSize({width,height:950});
  await page.goto('http://127.0.0.1:8765/gallery-fixture',{waitUntil:'load'});
  await page.waitForFunction(()=>[...document.querySelectorAll('.academy-program-cover')].every(img=>img.complete));
  const data=await page.evaluate(()=>{
   const grid=document.getElementById('academy-programs'),intro=document.querySelector('.academy-free-feature');
   const css=getComputedStyle(grid),free=getComputedStyle(intro);
   return {columns:css.gridTemplateColumns.split(' ').filter(Boolean).length,
    count:grid.querySelectorAll('.academy-program').length,
    covers:[...grid.querySelectorAll('.academy-program-cover')].map(i=>({width:i.naturalWidth,height:i.naturalHeight,loaded:i.complete})),
    freeBorder:free.borderTopWidth,freeBackground:free.backgroundImage,
    freeWidth:intro.getBoundingClientRect().width,
    containerWidth:intro.parentElement.getBoundingClientRect().width};
  });
  assert.equal(data.columns,expected,'Wrong grid columns at '+width+'px');
  assert.equal(data.count,7,'Expected exactly seven released programs');
  for(const cover of data.covers)assert(cover.loaded&&cover.width===480&&cover.height===270,'SVG failed at '+width+'px');
  assert.equal(data.freeBorder,'0px','Free Foundations still has an enclosing border');
  assert.equal(data.freeBackground,'none','Free Foundations still has an enclosing background');
  assert(data.freeWidth>0.95*data.containerWidth,'Free Foundations must use full available width');
 }
 console.log('PASS responsive 3/2/1 columns, seven SVG covers and full-width unboxed Free Foundations');
}finally{await browser.close()}
