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
  if(originAllowed(route.request().url()))return route.continue();
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
    const response=await page.goto(base+'/'+path,{waitUntil:'domcontentloaded',timeout:16000});
    assert.equal(response?.status(),200,path+' source response missing');
    // Protected pages can redirect immediately; never simulate a logged-in
    // user or invent access in the static fixture.
    const source=readFileSync(join(root,path),'utf8');
    if(source.includes('data-auth-required="true"')){
     assert(/<main[\s>]/i.test(source),'Protected route lost its main landmark');
     return {page:path,viewport:width,auth:'SOURCE_GUARDED',
      productionSession:'NOT_TESTED'};
    }
    assert(await page.title(),path+' lost its title');
    assert.equal(await page.locator('main').count(),1,path+' missing main landmark');
    const legal=source.includes('data-legal-doc="');
    const content=(await page.locator('main').innerText()).trim();
    if(legal){
     assert(source.includes('noindex'),'Legal placeholder must not be indexed');
     assert(content.length>0,'Legal loader disappeared');
    }else assert(content.length>35,path+' main content empty');
    const viewport=await page.evaluate(()=>document.querySelector('meta[name="viewport"]')?.content);
    assert(viewport&&viewport.includes('width=device-width'),path+' viewport not responsive');
    const details={page:path,viewport:width,content:legal?'SERVER_LEGAL_NOT_TESTED':'STATIC_RENDERED'};
    if(path==='store.html'){
     // Real plans/tools come from private Supabase live catalog, deliberately
     // unavailable in this source-only fixture. Assert fail-closed fallback,
     // NOT five fabricated live plans. Product-UI data tests run separately.
     await page.waitForFunction(()=>Boolean(
      document.querySelector('#store-plans .notice')||
      document.querySelectorAll('#store-plans article.v11-plan').length===5
     ),undefined,{timeout:14000});
     const count=await page.locator('#store-plans article.v11-plan').count();
     assert(count===0||count===5,'Unexpected partial plan catalog: '+count);
     if(count===0){
      assert.match(await page.locator('#store-plans').innerText(),/unavailable/i);
      assert.equal(await page.locator('#store-plans a[href*="checkout"]').count(),0,
       'Live checkout must not be offered without catalog');
      details.billing='CATALOG_UNAVAILABLE_FAIL_CLOSED';
     }else details.billing='PLAN_RENDERED_WITHOUT_PAYMENT';
     assert.equal(await page.locator('#store-products article.product-card').count(),5,
      'Five books must remain in approved static source fallback');
    }
    if(width===390&&['index.html','store.html','books.html','learn.html'].includes(path)){
     const scroll=await page.evaluate(()=>({
      content:document.documentElement.scrollWidth,visible:document.documentElement.clientWidth
     }));
     assert(scroll.content<=scroll.visible+3,'Unexpected global mobile overflow: '+JSON.stringify(scroll));
    }
    return details;
   });
  }
  if(width===1280)await check('Store keyboard navigation and fail-closed billing (static)',async()=>{
    await page.goto(base+'/store.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(
      document.querySelector('#store-plans .notice')||
      document.querySelectorAll('#store-plans article.v11-plan').length===5
    ),undefined,{timeout:14000});
    await page.locator('#store-tab-memberships').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#store-tab-books').getAttribute('aria-selected'),'true');
    await page.locator('#store-tab-tools').click();
    assert.equal(await page.locator('#store-panel-tools').evaluate(e=>e.hidden),false);
    const buttons=await page.locator('#store-plans a[href*="checkout"],#store-tools a[href*="checkout"]').count();
    assert.equal(buttons,0,'Offline Store must not offer a direct paid checkout URL');
    // Canonical plans + future tool cards are covered by mocked source contract
    // tests, and real provider permission requires independent Owner acceptance.
    return 'keyboard Store tabs PASS; no uncontrolled checkout; live catalog unverified';
  });
  if(width===1280)await check('Store automated accessibility baseline',async()=>{
    await page.goto(base+'/store.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>Boolean(
      document.querySelector('#store-plans .notice')||
      document.querySelectorAll('#store-plans article.v11-plan').length===5
    ),undefined,{timeout:14000});
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    const severe=axe.violations.filter(x=>x.impact==='critical'||x.impact==='serious');
    assert.deepEqual(severe.map(x=>({id:x.id,nodes:x.nodes.length})),[],
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
