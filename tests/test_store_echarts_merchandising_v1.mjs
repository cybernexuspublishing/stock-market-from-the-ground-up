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
assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)!important/);
assert.match(css,/min-height:50px!important/);
assert.match(css,/content:none!important;display:none!important/);
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
 <nav class="store-category-tabs" role="tablist"><button aria-selected="true">Founding Memberships</button><button>Books</button><button>Crownlight Lumens</button><button>À-la-Carte Tools</button><button>Current Products</button><button>Upcoming Releases</button></nav>
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
 await page.addStyleTag({content:css});
 const nav=await page.evaluate(()=>{const n=document.querySelector('.store-category-tabs'),btn=n.querySelector('button');const cs=getComputedStyle(n);return {columns:cs.gridTemplateColumns.split(' ').length,buttonHeight:btn.getBoundingClientRect().height,icon:getComputedStyle(btn,'::before').content}});
 assert.equal(nav.columns,6,'Desktop navigation must occupy one compact row');
 assert(nav.buttonHeight<=58,'Navigation cannot remain as oversized tiles');
 assert.equal(nav.icon,'none','Do not decorate six commercial navigation labels with Unicode clipart');
 await page.setViewportSize({width:390,height:820});
 const mobile=await page.evaluate(()=>{const n=document.querySelector('.store-category-tabs');return {display:getComputedStyle(n).display,scrollWidth:n.scrollWidth,clientWidth:n.clientWidth}});
 assert.equal(mobile.display,'flex','Mobile category navigation should scroll, not stack six large blocks');
 assert(mobile.scrollWidth>mobile.clientWidth,'Mobile category navigation should be horizontally scrollable');
 await page.setViewportSize({width:1280,height:900});
 await page.addScriptTag({content:readFileSync('node_modules/echarts/dist/echarts.min.js','utf8')});
 await page.addScriptTag({content:read('assets/js/crownlight-echarts-loader-v1.js')});
 await page.addScriptTag({content:read('assets/js/store-echarts-product-art-v1.js')});
 await page.locator('#store-panel-current .gu-store-type-section:first-child .gu-store-type-card').scrollIntoViewIfNeeded();
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
 assert.match(result.svgWords||'',/CHART STUDIO/);
 assert.match(result.svgWords||'',/STANDARD/);
 assert.doesNotMatch(result.svgWords||'',/MEMBER ACCESS|TOOLS · LABS · COMMUNITY/,'Never use the generic crown marketing placeholder');
 const labels=await page.evaluate(()=>[...document.querySelectorAll('.gu-echarts-product-art')].map(x=>({
  kind:x.dataset.artKind,metric:x.dataset.artMetric||'',svg:x.querySelector('svg')?.textContent||''
 })));
 assert.equal(labels[0].metric,'14 DAYS','Founder art must show actual 14-day cadence');
 assert.match(labels[0].svg,/14/);
 assert.match(labels[0].svg,/DAYS/);
 assert.match(labels[0].svg,/CROWNLIGHT/);
 assert.equal(labels[1].metric,'60 DAYS','Extended founder art must show actual 60-day cadence');
 assert.match(labels[1].svg,/60/);
 assert.match(labels[1].svg,/PROFESSIONAL/);
 assert.equal(labels[2].metric,'25 LUMENS','Bundle art must show catalog-defined 25 credits');
 assert.match(labels[2].svg,/25/);
 assert.match(labels[2].svg,/LUMENS/);
 assert.match(labels[2].svg,/DIGITAL/);
 assert.match(labels[2].svg,/NON-CASH PLATFORM CREDITS/);
 const firstScenes=await page.evaluate(()=>[...document.querySelectorAll('.gu-echarts-product-art')].map(x=>x.dataset.artScene||''));
 assert.deepEqual(firstScenes,['','','','plan','scanner'],'Product images must be based on the specific item, not just its Store category');
 assert.match(labels[3].svg,/TRADE PLAN/,'Trade-plan product needs its own illustrated planning workflow');
 assert.match(labels[4].svg,/SCANNER FILTERS/,'Scanner needs illustrated filters and candidate results');
 assert.deepEqual(errors,[],'Store graphics cannot throw browser exceptions');
 await page.evaluate(()=>{
   const card=document.createElement('article');card.className='store-crownlight-package';card.innerHTML='<h3>Explorer</h3>';
   document.querySelector('#store-panel-sparks').append(card);
 });
 await page.locator('#store-panel-sparks .store-crownlight-package:last-child').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>document.querySelectorAll('.gu-echart-ready .gu-echarts-product-art svg').length===6,
  {timeout:15000});
 const specialties=[
  ['Free Research Watchlist','watchlist','RESEARCH CANDIDATES'],
  ['Advanced Trade-Plan Builder','plan','RISK FRAMEWORK'],
  ['Scanner Workbench','scanner','CANDIDATE RESULTS'],
  ['Crownlight Chart Studio','chart','PRICE · VOLUME'],
  ['Trading Journal Analytics','journal','PLAN VS. ACTUAL'],
  ['Market Tutor','tutor','GUIDED EXPLANATION'],
  ['Historical Replay Training','replay','PRACTICE SCENARIO'],
  ['Guided Historical Labs','replay','PRACTICE SCENARIO'],
  ['Boot Camp Academy','learning','LEARNING PATH'],
  ['Market Data Connections','data','AUTHORIZED SOURCES ONLY'],
  ['Market Commons','community','MARKET DISCUSSION']
 ];
 await page.evaluate((titles)=>{
  const target=document.querySelector('#store-panel-current');
  const section=document.createElement('section');
  section.className='gu-store-type-section';
  section.innerHTML='<h3>Individual products</h3><div class="gu-store-type-grid"></div>';
  target.append(section);
  const host=section.querySelector('.gu-store-type-grid');
  for(const title of titles){const card=document.createElement('article');card.className='gu-store-type-card';
   const heading=document.createElement('h4');heading.textContent=title;card.append(heading);host.append(card);}
 },specialties.map(x=>x[0]));
 for(let i=0;i<specialties.length;i++)await page.locator('#store-panel-current .gu-store-type-section:last-child .gu-store-type-card').nth(i).scrollIntoViewIfNeeded();
 await page.waitForFunction(count=>document.querySelectorAll('.gu-echart-ready .gu-echarts-product-art svg').length===count,17,{timeout:20000});
 const actual=await page.evaluate(()=>[...document.querySelectorAll('#store-panel-current .gu-store-type-section:last-child .gu-echarts-product-art')].map(x=>({
  scene:x.dataset.artScene,svg:x.querySelector('svg')?.textContent||'',title:x.dataset.artTitle
 })));
 assert.equal(actual.length,specialties.length,'Create an image for every non-book product');
 for(let i=0;i<specialties.length;i++){
  assert.equal(actual[i].scene,specialties[i][1],specialties[i][0]+' requires the matching scene');
  assert(actual[i].svg.includes(specialties[i][2]),specialties[i][0]+' SVG is not a matching visual');
  assert(actual[i].svg.includes('ILLUSTRATIVE PRODUCT PREVIEW'),'Market UI previews must be clearly illustrative');
 }
 assert.deepEqual(errors,[],'Diverse real ECharts product visuals cannot trigger browser exceptions');
 console.log('PASS premium tier-specific ECharts founder passes, product UI previews, genuine book covers, compact responsive tabs, default founding and footer details');
}finally{await browser.close()}
