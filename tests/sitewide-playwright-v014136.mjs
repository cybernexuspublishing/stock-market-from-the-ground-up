/* v0.14.0.136 — Central, credential-free sitewide Playwright acceptance.
 * Runs against this PR's locally BUILT static Pages output. Never logs in,
 * creates Stripe Checkout Sessions, posts to provider APIs, or uses LIVE keys.
 * Cloudflare Pages Functions, real member rights, and live paid checkout are
 * tested separately; a passing browser smoke is not a financial acceptance.
 */
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const root='public',base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Sitewide CI only accepts loopback static fixtures');
const paths=readdirSync(root).filter(p=>/^[a-z0-9-]+\.html$/.test(p)).sort();
assert(paths.length>=80,'Expected entire 80+ page customer/Admin inventory, no accidental pages omitted');
const protectedPages=['admin.html','owner-roadmap.html','journal.html','dashboard.html'];
const inventoryDefects=[];
for(const path of paths){
 const html=readFileSync(join(root,path),'utf8');
 if(!/<!doctype\s+html/i.test(html))inventoryDefects.push(path+' missing HTML5 doctype');
 if(!/<title[^>]*>[^<]+<\/title>/i.test(html))inventoryDefects.push(path+' missing page title');
 if(!/<html\s/i.test(html))inventoryDefects.push(path+' missing html root');
 if(!/<meta[^>]+name=["']viewport["']/i.test(html))inventoryDefects.push(path+' missing mobile viewport');
}
assert.equal(inventoryDefects.length,0,'Sitewide HTML inventory defects:\n'+inventoryDefects.join('\n'));
for(const p of protectedPages){
 const content=readFileSync(join(root,p),'utf8');
 assert(/data-auth-required=["']true["']/.test(content),p+' must remain auth-protected');
}
assert(!readdirSync(join(root,'data')).includes('interactive-labs.json'),
 'Private educational lab observations were bundled to public website');

const sections=[
 {path:'index.html',area:'Home'},
 {path:'store.html',area:'Store'},
 {path:'books.html',area:'Books'},
 {path:'learn.html',area:'Learning'},
 {path:'labs.html',area:'Labs'},
 {path:'assessments.html',area:'Assessments'},
 {path:'journal.html',area:'Journal'},
 {path:'simulator.html',area:'Simulator'},
 {path:'market-tutor.html',area:'Tutor'},
 {path:'forum.html',area:'Forum'},
 {path:'market-commons.html',area:'Commons'},
 {path:'membership.html',area:'Memberships'},
 {path:'checkout.html',area:'Checkout'},
 {path:'account.html',area:'Account'},
 {path:'signin.html',area:'Authentication'},
 {path:'admin.html',area:'Admin'},
 {path:'owner-roadmap.html',area:'Owner Roadmap'},
 {path:'privacy.html',area:'Privacy'},
 {path:'subscription-terms.html',area:'Subscription Terms'}
];
const report={version:'0.14.0.136',testType:'local built-static-source (not deployed, no login)',
 checkedAt:new Date().toISOString(),htmlInventory:paths.length,routes:[],failures:[],notes:['Supabase, paid provider permissions, authenticated page content and server-rendered legal text are NOT tested by offline fixture. Valid source fallback is intentionally checkout-closed.']};
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const contexts=[];
async function check(name,fn){
 try{const detail=await fn();report.routes.push({name,status:'PASS',detail});console.log('PASS '+name);}
 catch(e){const msg=String(e?.message||e).slice(0,1200);report.failures.push({name,message:msg});
  report.routes.push({name,status:'FAIL',message:msg});console.error('FAIL '+name+' '+msg)}
}
function originAllowed(url){try{const u=new URL(url);return u.origin===base}catch{return false}}
async function newPage(width){
 const ctx=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce',serviceWorkers:'block'});
 contexts.push(ctx);
 // Never contact Stripe, live Supabase, Google, or external auth providers.
 await ctx.route('**/*',route=>{
  const url=route.request().url();
  // Offline fixture: simulate a verified beta with seats remaining. No real provider calls.
  if(originAllowed(url)&&new URL(url).pathname==='/api/founding-offer-status')
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    ok:true,offersVisible:true,publicLaunch:false,phase:'beta',remaining:600,enrollmentEnabled:true
   })});
  // Owner-published Store fixture: Standard and Extended visible,
  // 14-day Starter hidden; no LIVE checkout or outside network.
  if(originAllowed(url)&&new URL(url).pathname==='/api/storefront-public-catalog')
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    ok:true,source:'verified_storefront',items:[
     {sku:'plan:FREE',category:'membership',visible:true,saleReady:false,status:'listed'},
     {sku:'founding:FOUNDING_30',category:'founding',visible:true,saleReady:false},
     {sku:'founding:FOUNDING_60',category:'founding',visible:true,saleReady:false}
    ]
   })});
  if(originAllowed(url))return route.continue();
  return route.abort();
 });
 const page=await ctx.newPage();
 return page;
}
try{
 for(const width of [390,1280]){
  const page=await newPage(width);
  for(const {path,area} of sections){
   await check(area+' '+width+'px',async()=>{
    const tab=await page.context().newPage();
    try{
    // Validate protected source with a nonexecuting HTTP GET. Do not follow
    // unauthenticated redirects or invent privileged member sessions.
    const source=readFileSync(join(root,path),'utf8');
    if(source.includes('data-auth-required="true"')){
     const protectedSource=await tab.request.get(base+'/'+path,{timeout:16000});
     assert.equal(protectedSource.status(),200,'Protected route source unavailable');
     assert(/<main[\s>]/i.test(source),'Protected route lost its main landmark');
     return {page:path,viewport:width,auth:'SOURCE_GUARDED',
      productionSession:'NOT_TESTED'};
    }
    const response=await tab.goto(base+'/'+path,{waitUntil:'domcontentloaded',timeout:16000});
    assert.equal(response?.status(),200,path+' source response missing');
    assert(await tab.title(),path+' lost its title');
    assert.equal(await tab.locator('main').count(),1,path+' missing main landmark');
    const legal=source.includes('data-legal-doc="');
    const content=(await tab.locator('main').innerText()).trim();
    if(legal){
     assert(source.includes('noindex'),'Legal placeholder must not be indexed');
     assert(content.length>0,'Legal loader disappeared');
    }else assert(content.length>35,path+' main content empty');
    const viewport=await tab.evaluate(()=>document.querySelector('meta[name="viewport"]')?.content);
    assert(viewport&&viewport.includes('width=device-width'),path+' viewport not responsive');
    const details={page:path,viewport:width,content:legal?'SERVER_LEGAL_NOT_TESTED':'STATIC_RENDERED'};
    if(path==='store.html'){
     // Only explicitly Owner-published tiers belong in member-facing Store.
     // The synthetic catalog lists 30/60 and intentionally hides Starter.
     await tab.waitForFunction(()=>
      document.querySelectorAll('#store-founder-plans article.catalog-founder-card').length===2,
      undefined,{timeout:14000});
     const count=await tab.locator('#store-founder-plans article.catalog-founder-card').count();
     assert.equal(count,2,'Only Owner-published Founder offers may render');
     const founderCards=tab.locator('#store-founder-plans article.catalog-founder-card');
     assert.match(await founderCards.first().innerText(),/Founding Standard|30 DAYS/i);
     assert.doesNotMatch(await tab.locator('#store-founder-plans').innerText(),
      /Founding Starter|14 DAYS/i,'Unpublished Starter must stay hidden');
     assert.doesNotMatch(await tab.locator('#store-founder-compare').innerText(),
      /Founding Starter|14-day term/i,'Unpublished tier must not leak into comparison');
     assert.equal(await founderCards.first().locator('a[href*="checkout"]').count(),0,
      'Coming-soon Founder tiers must not have direct purchase links');
     assert.equal(await tab.locator('#store-tab-memberships').count(),1);
     // General membership tab is intentionally CSS-hidden during Founding beta;
     // its Free program copy must be retained without exposing paid checkout.
     assert.equal(await tab.locator('#store-tab-memberships').isVisible(),false,
      'Future general Membership tab must remain hidden during Founding beta');
     const freePanelText=await tab.locator('#store-panel-memberships').textContent();
     assert.match(freePanelText,/Free Membership/i);
     assert.doesNotMatch(freePanelText,/Full Platform|Lifetime|Annual Membership/i);
     assert.equal(await tab.locator('#store-founder-plans a[href*="checkout"]').count(),0,
      'A public founding card cannot bypass server-side checkout readiness');
     // Positive publication path: all three tiers display when Owner
     // visibility includes Starter as well; no direct checkout is enabled.
     await tab.route('**/api/storefront-public-catalog',route=>route.fulfill({
      status:200,contentType:'application/json',body:JSON.stringify({
       ok:true,source:'verified_storefront',items:[
        {sku:'plan:FREE',category:'membership',visible:true,saleReady:false,status:'listed'},
        {sku:'founding:FOUNDING_14',category:'founding',visible:true,saleReady:false},
        {sku:'founding:FOUNDING_30',category:'founding',visible:true,saleReady:false},
        {sku:'founding:FOUNDING_60',category:'founding',visible:true,saleReady:false}
       ]
      })
     }));
     await tab.reload({waitUntil:'domcontentloaded'});
     await tab.waitForFunction(()=>
      document.querySelectorAll('#store-founder-plans article.catalog-founder-card').length===3,
      undefined,{timeout:14000});
     assert.match(await tab.locator('#store-founder-plans article.catalog-founder-card').first().innerText(),
      /Founding Starter|14 DAYS/i);
     assert.equal(await tab.locator('#store-founder-plans a[href*="checkout"]').count(),0,
      'Owner publication alone does not authorize purchase');
     await tab.waitForFunction(()=>Boolean(
      document.querySelector('#store-products .notice,#store-products .empty-state')||
      document.querySelector('#store-products article.product-card')
     ),undefined,{timeout:14000});
     const bookCount=await tab.locator('#store-products article.product-card').count();
     assert(bookCount>0||await tab.locator('#store-products .notice,#store-products .empty-state').count()>0,
      'Unavailable or empty books catalog must show an explicit state');
     details.billing='FOUNDING_TERMS_RENDERED_NO_UNVERIFIED_CHECKOUT';
     details.bookCards=bookCount;
    }
    if(width===390&&['index.html','store.html','books.html','learn.html'].includes(path)){
     const scroll=await tab.evaluate(()=>({
      content:document.documentElement.scrollWidth,visible:document.documentElement.clientWidth
     }));
     assert(scroll.content<=scroll.visible+3,'Unexpected global mobile overflow: '+JSON.stringify(scroll));
    }
    return details;
    }finally{await tab.close()}
   });
  }
  if(width===1280)await check('Store keyboard navigation and fail-closed billing (static)',async()=>{
    await page.goto(base+'/store.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(
      document.querySelector('#store-founder-plans .notice')||
      document.querySelectorAll('#store-founder-plans article.catalog-founder-card').length===2
    ),undefined,{timeout:14000});
    assert.equal(await page.locator('#store-founder-plans article.catalog-founder-card').count(),2,
      'Only the two Owner-published Founding 30/60 offers may render on this fixture');
    const available=await page.locator('[data-store-category]:visible').evaluateAll(nodes=>
      nodes.filter(el=>!el.hidden&&!el.disabled).map(el=>el.id));
    assert(available.includes('store-tab-founders'),'Founding offers must be the primary Store tab');
    await page.locator('#store-tab-founders').focus();
    await page.keyboard.press('ArrowRight');
    const expected=available.length>1?available[1]:'store-tab-founders';
    await page.waitForFunction(id=>document.getElementById(id)?.getAttribute('aria-selected')==='true',expected,{timeout:4000});
    assert.equal(await page.locator('#'+expected).getAttribute('aria-selected'),'true',
      'Keyboard navigation must select the next visible category, not a hidden offer');
    const selectedPanel=expected.replace('store-tab-','store-panel-');
    assert.equal(await page.locator('#'+selectedPanel).evaluate(e=>e.hidden),false);
    if(available.includes('store-tab-tools')){
     await page.locator('#store-tab-tools').click();
     assert.equal(await page.locator('#store-panel-tools').evaluate(e=>e.hidden),false);
    }
    const buttons=await page.locator('#store-founder-plans a[href*="checkout"],#store-tools a[href*="checkout"]').count();
    assert.equal(buttons,0,'Offline Store must not offer an uncontrolled paid checkout URL');
    // Canonical plans + future tool cards are covered by mocked source contract
    // tests, and real provider permission requires independent Owner acceptance.
    return 'keyboard Store tabs PASS; no uncontrolled checkout; live catalog unverified';
  });
  if(width===1280)await check('Store automated accessibility baseline',async()=>{
    await page.goto(base+'/store.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(
      document.querySelector('#store-founder-plans .notice')||
      document.querySelectorAll('#store-founder-plans article.catalog-founder-card').length===2
    ),undefined,{timeout:14000});
    assert.equal(await page.locator('#store-founder-plans article.catalog-founder-card').count(),2,
      'Only the two Owner-published Founding 30/60 offers may render on this fixture');
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    const severe=axe.violations.filter(x=>x.impact==='critical'||x.impact==='serious');
    assert.deepEqual(severe.map(x=>({id:x.id,nodes:x.nodes.map(n=>({target:n.target,html:String(n.html||'').slice(0,420),failure:String(n.failureSummary||'').slice(0,420)}))})),[],
      'Serious/critical automated Store accessibility findings');
    return 'No serious/critical axe issues on static Store; manual and live review still required';
  });
  await page.close();
 }
}finally{
 await Promise.all(contexts.map(c=>c.close()));await browser.close();
}
const json=JSON.stringify(report,null,2);
writeFileSync('artifacts/sitewide-playwright-v014136.json',json+'\n');
console.log('SITEWIDE: '+(report.routes.length-report.failures.length)+' PASS / '+report.failures.length+
 ' FAIL; '+paths.length+' static HTML pages inventoried; network restricted to local branch fixture');
if(report.failures.length)process.exitCode=1;
