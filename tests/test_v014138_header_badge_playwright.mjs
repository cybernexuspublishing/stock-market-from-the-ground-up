/* v0.14.0.138 — Deterministic header regression with unread alert badge.
 * Source of actual prod overflow: fe-notify-count 1295px at 1250px viewport.
 * Tests Chrome layout only; never loads signed-in user data or calls Stripe.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
const files=['assets/css/styles.css','assets/css/platform.css',
 'assets/css/production.css','assets/css/frontend-complete.css',
 'assets/css/production-completion.css','assets/css/polish.css',
 'assets/css/layout-integrity.css'];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const width of [901,1024,1100,1250,1350,1440]){
  const page=await browser.newPage({viewport:{width,height:850}});
  try{
   await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
   <body><header class="site-header"><div class="wrap nav">
   <a class="brand" href="/">THE STOCK MARKET: <span>FROM THE GROUND UP</span></a>
   <nav class="navlinks" aria-label="Main navigation"></nav>
   <div class="fe-header-tools" style="display:flex;gap:.4rem;align-items:center">
    <button type="button" class="fe-command-button v132-search-wide" aria-label="Search">
     <span>Search site</span><kbd>Ctrl K</kbd></button>
    <button type="button" class="fe-notify-button" aria-label="Alerts: notifications and announcements">
     <span aria-hidden="true">●</span><span>Alerts</span><span class="fe-notify-count">1</span></button>
   </div></div></header><main><h1>Example product detail</h1></main></body></html>`);
   for(const css of files)await page.addStyleTag({path:resolve(css)});
   // Reuse the exact canonical signed-in desktop nav renderer already covered
   // by tests/test_header_geometry.py rather than inventing an oversized menu
   // at the 901px responsive breakpoint.
   const navSource=readFileSync(resolve('assets/js/navigation.js'),'utf8')
    .split('/* CANONICAL_DESKTOP_NAV */\\n',2)[1];
   assert(navSource?.trimEnd().endsWith('})();'),'Desktop navigation module contract changed');
   await page.addScriptTag({content:navSource.slice(0,-6)+'window.__testMakeNav=makeNav;\\n})();\\n'});
   await page.evaluate(()=>window.__testMakeNav({
    authenticated:true,username:'ExampleReader',planCode:'LIFETIME',
    staffRoles:['OWNER'],controlPanel:true,books:[],tools:[]
   },[]));
   const measurement=await page.evaluate(()=>{
    const search=document.querySelector('.fe-command-button');
    const alerts=document.querySelector('.fe-notify-button');
    const badge=document.querySelector('.fe-notify-count');
    const ab=alerts.getBoundingClientRect(),bb=badge.getBoundingClientRect();
    return {scroll:document.documentElement.scrollWidth,viewport:innerWidth,
     alertRight:ab.right,badgeRight:bb.right,
     badgeDisplay:getComputedStyle(badge).display,buttonCount:document.querySelectorAll('.fe-header-tools button').length,
     searchName:search.getAttribute('aria-label'),alertsName:alerts.getAttribute('aria-label'),
     brandRight:document.querySelector('.brand').getBoundingClientRect().right};
   });
   assert.equal(measurement.buttonCount,2);
   assert.equal(measurement.searchName,'Search');
   assert.match(measurement.alertsName,/Alerts/);
   assert(measurement.scroll<=width+3,'Header must not horizontally scroll: '+JSON.stringify({width,...measurement}));
   assert(measurement.alertRight<=width+3,'Alert control outside viewport: '+JSON.stringify({width,...measurement}));
   assert(measurement.badgeRight<=width+3,'Alert count outside viewport: '+JSON.stringify({width,...measurement}));
   assert.notEqual(measurement.badgeDisplay,'none','Nonzero unread count must stay visible');
   await page.getByRole('button',{name:'Search'}).focus();
   assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Search');
   await page.getByRole('button',{name:/Alerts:/}).focus();
   assert.match(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),/Alerts/);
   console.log('PASS v138 header alerts/search '+width+'px right='+Math.round(measurement.badgeRight));
  }finally{await page.close()}
 }
}finally{await browser.close()}
