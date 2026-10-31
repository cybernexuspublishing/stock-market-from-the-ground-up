/* Boot Camp gallery browser acceptance: synthetic data, no member or billing writes. */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {basename} from 'node:path';
import {chromium} from 'playwright';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const styles=['assets/css/free-foundations-v1.css','assets/css/bootcamp-academy-v014168.css',
 'assets/css/bootcamp-academy-compact-v2.css','assets/css/learning-destination-picker-v1.css',
 'assets/css/bootcamp-academy-icons-v1.css','assets/css/bootcamp-academy-gallery-v2.css',
 'assets/css/premium-design-v014168.css','assets/css/sitewide-composition-v014234.css'].map(load).join('\n');
const codes=["truth5","watchlist7","scanners10","foundations30","charts45","risk60","practicum90"];
const cards=codes.map((name,i)=>'<article class="academy-program academy-program--compact">'+
 '<a class="academy-program-compact-link" href="/bootcamp-academy.html?program='+name+'">'+
 '<span class="academy-program-visual"><img class="academy-program-cover" alt="" src="/assets/images/bootcamp-covers/'+name+'-v2.webp"></span>'+
 '<span class="academy-program-compact-name">Course '+(i+1)+'</span>'+
 '</a></article>').join('');
const html='<!doctype html><html><head><meta charset="utf-8"><style>'+styles+'</style></head>'+
 '<body class="gu-bc-learning" data-gu-workspace="site"><main class="gu-redesign-academy"><div class="gu-learning-ad-core"><div class="wrap">'+
 '<h1 id="academy-page-title" style="font-size:clamp(24px,1.85vw,34px)!important;line-height:1.17!important;max-width:none!important;letter-spacing:-.025em!important;margin:8px 0 14px!important">Practice deliberately. Progress confidently.</h1>'+
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
 await page.route('**/assets/images/bootcamp-covers/*.webp',route=>{
  const name=basename(new URL(route.request().url()).pathname),path='assets/images/bootcamp-covers/'+name;
  assert(existsSync(new URL('../'+path,import.meta.url)));
  return route.fulfill({status:200,contentType:'image/webp',body:readFileSync(new URL('../'+path,import.meta.url))});
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
    visibleIds:grid.querySelectorAll('.academy-program-compact-id').length,
    covers:[...grid.querySelectorAll('.academy-program-cover')].map(i=>({width:i.naturalWidth,height:i.naturalHeight,loaded:i.complete})),
    headingFont:parseFloat(getComputedStyle(document.getElementById('academy-page-title')).fontSize),
    headingLine:getComputedStyle(document.getElementById('academy-page-title')).lineHeight,
    compact:[...grid.querySelectorAll('.academy-program-compact-link')].map(link=>{
     const media=link.querySelector('.academy-program-visual').getBoundingClientRect();
     const title=link.querySelector('.academy-program-compact-name').getBoundingClientRect();
     const card=link.getBoundingClientRect();
     return {width:card.width,height:card.height,imageWidth:media.width,imageHeight:media.height,imageRight:media.right,titleLeft:title.left};
    }),
    freeBorder:free.borderTopWidth,freeBackground:free.backgroundImage,
    freeWidth:intro.getBoundingClientRect().width,
    containerWidth:intro.parentElement.getBoundingClientRect().width};
  });
  assert.equal(data.columns,expected,'Wrong grid columns at '+width+'px');
  assert(data.headingFont>=24&&data.headingFont<=34.1,'Heading is too large under production styles: '+data.headingFont+'px');
  assert(data.headingLine!=='normal','Heading line height not constrained');
  assert.equal(data.count,7,'Expected exactly seven released programs');
  assert.equal(data.visibleIds,0,'Internal Boot Camp IDs must not appear in cards');
  for(const card of data.compact){
   assert(card.height < card.width*.68,'Boot Camp card must be approximately half the former height at '+width+'px');
   assert(card.imageWidth>0&&card.imageHeight>0,'Approved course artwork must remain visible');
   assert(card.imageRight<=card.titleLeft+2,'Title must appear alongside the image, not underneath');
  }
  for(const cover of data.covers)assert(cover.loaded&&cover.width===640&&cover.height===480,'SVG failed at '+width+'px');
  assert.equal(data.freeBorder,'0px','Free Foundations still has an enclosing border');
  assert.equal(data.freeBackground,'none','Free Foundations still has an enclosing background');
  assert(data.freeWidth>0.95*data.containerWidth,'Free Foundations must use full available width');
 }
 console.log('PASS responsive 3/2/1 columns, seven approved image covers and full-width unboxed Free Foundations');
}finally{await browser.close()}
