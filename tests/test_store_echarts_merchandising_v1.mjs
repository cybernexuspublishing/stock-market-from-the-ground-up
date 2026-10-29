/* Verify Apache ECharts really renders first-party Store product artwork.
 * Includes default Founding category and footer link contract, with no cash
 * payment or privileged provider calls.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('store.html'),js=read('assets/js/store.js'),css=read('assets/css/store-echarts-redesign-v1.css');
assert.match(html,/id="store-tab-founders"[^>]*aria-selected="true"[^>]*data-store-category="founders">/);
assert.match(html,/id="store-panel-founders"[^>]*aria-labelledby="store-tab-founders">/);
assert.match(html,/id="store-panel-books"[^>]*hidden/);
assert.match(js,/const fallback='founders'/);
assert.match(js,/founderTab.hidden=false/);
assert.match(html,/id="store-tab-upcoming"[^>]*>Upcoming Releases/);
for(const name of ['Founding Memberships','Books','Crownlight Lumens','À-la-Carte Tools','Current Products','Upcoming Releases'])
 assert(html.includes(name),'Missing navigation item '+name);
assert.match(css,/min-height:64px!important/);
assert(css.includes('button[data-store-category="memberships"]'),'Archived extra tab cannot be shown by larger button styles');
assert(html.includes('<h1>Founding Memberships, Books &amp; Learning Tools</h1>'));
assert.match(html,/id="store-panel-sparks"/);
assert.doesNotMatch(html,/<details><summary>More information about welcome credits, trials and expiry/);
assert.match(html,/<section class="wrap store-footer-lumen-notice"/);
assert.match(html,/<a href="store-welcome-credits-info.html">More information about welcome credits, trials and expiry<\/a>/);
assert.match(html,/Lumens have no cash-out value/);
assert.match(html,/Upcoming:<\/strong> 286 complimentary Crownlight Lumens/);
const info=read('store-welcome-credits-info.html');
for(const phrase of ['Welcome Credits, Trials and Expiry','286 complimentary Crownlight Lumens','do not expire','not a cash exchange rate'])
 assert(info.includes(phrase),'Member education page missing '+phrase);
assert.match(read('scripts/build-pages.sh'),/echarts@6\.1\.0/);
assert.match(html,/store-echarts-product-art-v1\.js/);
assert.match(read('assets/js/store-echarts-product-art-v1.js'),/dataset.artMetric/,'Marketing art must derive bundle size and plan term from source cards');
assert.match(html,/crownlight-echarts-loader-v1\.js/);
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 const fixture=`<!doctype html><html><head><style>
 body{background:#081829;color:white;font:16px system-ui}
 .gu-redesign-store article{margin:10px;padding:10px;width:340px;border:1px solid #5980a2;display:inline-block;vertical-align:top}
 .gu-echarts-product-art{height:145px;width:100%;position:relative}
 </style></head><body><main class="gu-redesign-store">
 <div id="store-founder-plans">
 <article class="catalog-founder-card"><div class="catalog-founder-top">Starter</div><h3>Founding 14-Day Starter</h3></article>
 <article class="catalog-founder-card is-extended"><div class="catalog-founder-top">Extended</div><h3>Founding 60-Day</h3></article>
 </div>
 <div id="store-panel-sparks"><article class="store-crownlight-package"><h3>Starter</h3><div class="quantity">25 Crownlight Lumens</div></article></div>
 <div id="store-tools"><article class="v11-tool-card"><h3>Advanced Trade Plan Builder</h3><div class="store-tool-visual">Illustration fallback</div></article></div>
 <div id="store-panel-current"><section class="gu-store-type-section"><h3>Research</h3>
 <article class="gu-store-type-card"><a class="gu-catalog-card-image">Fallback</a><h4>Scanner Workbench</h4></article></section>
 <section class="gu-store-type-section"><h3>Books</h3>
 <article class="gu-store-type-card"><a class="gu-catalog-card-image"><img alt="Verified book cover"></a><h4>Foundations</h4></article></section>
 </div>
 </main></body></html>`;
 await page.setContent(fixture);
 await page.addScriptTag({content:readFileSync('node_modules/echarts/dist/echarts.min.js','utf8')});
 await page.addScriptTag({content:read('assets/js/crownlight-echarts-loader-v1.js')});
 await page.addScriptTag({content:read('assets/js/store-echarts-product-art-v1.js')});
 await page.waitForFunction(()=>document.querySelectorAll('.gu-echart-ready .gu-echarts-product-art svg').length===5,
  {timeout:15000});
 const result=await page.evaluate(()=>({
  graphics:[...document.querySelectorAll('.gu-echarts-product-art')].map(x=>({kind:x.dataset.artKind,hasSvg:!!x.querySelector('svg'),label:x.getAttribute('aria-label'),renderedText:x.textContent})),
  bookArt:document.querySelector('#store-panel-current .gu-store-type-section:last-child .gu-echarts-product-art')!==null,
  bookCover:!!document.querySelector('#store-panel-current .gu-store-type-section:last-child img'),
  count:document.querySelectorAll('.gu-echart-ready').length,
  hasRealRuntime:typeof window.echarts?.init==='function',
  svgWords:document.querySelector('#store-founder-plans .gu-echarts-product-art svg')?.textContent
 }));
 assert.equal(result.graphics.length,5);
 assert.deepEqual(result.graphics.map(x=>x.kind),['founder','extended','lumens','tool','research']);
 assert(result.graphics.every(x=>x.hasSvg&&/not actual market data/.test(x.label)));
 assert.equal(result.bookArt,false,'Retain genuine edition book covers instead of generating cover art');
 assert.equal(result.bookCover,true);
 assert.equal(result.hasRealRuntime,true);
 assert.match(result.svgWords||'',/FOUNDING MEMBERS/);
 const labels=await page.evaluate(()=>[...document.querySelectorAll('.gu-echarts-product-art')].map(x=>({
  kind:x.dataset.artKind,metric:x.dataset.artMetric||'',svg:x.querySelector('svg')?.textContent||''
 })));
 assert.equal(labels[0].metric,'14 DAYS','Founder art must show actual 14-day cadence');
 assert.match(labels[0].svg,/14 DAYS/);
 assert.equal(labels[1].metric,'60 DAYS','Extended founder art must show actual 60-day cadence');
 assert.match(labels[1].svg,/60 DAYS/);
 assert.equal(labels[2].metric,'25 LUMENS','Bundle art must show catalog-defined 25 credits');
 assert.match(labels[2].svg,/25 LUMENS/);
 assert.match(labels[2].svg,/NON-CASH PLATFORM CREDITS/);
 assert.deepEqual(errors,[],'Store graphics cannot throw browser exceptions');
 await page.evaluate(()=>{
   const card=document.createElement('article');card.className='store-crownlight-package';card.innerHTML='<h3>Explorer</h3>';
   document.querySelector('#store-panel-sparks').append(card);
 });
 await page.waitForFunction(()=>document.querySelectorAll('.gu-echart-ready .gu-echarts-product-art svg').length===6,
  {timeout:15000});
 console.log('PASS real Apache ECharts SVG Store product graphics, dynamic cards, real book covers, large navigation, founding default and footer detail page');
}finally{await browser.close()}
