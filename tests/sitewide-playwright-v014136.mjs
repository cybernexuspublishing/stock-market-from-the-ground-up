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
 checkedAt:new Date().toISOString(),htmlInventory:paths.length,routes:[],failures:[],notes:[]};
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
    assert.equal(response?.status(),200,path+' was not available');
    assert(await page.title(),path+' lost its title');
    assert.equal(await page.locator('main').count(),1,path+' missing main landmark');
    assert((await page.locator('main').innerText()).trim().length>35,path+' main content empty');
    const viewport=await page.evaluate(()=>document.querySelector('meta[name="viewport"]')?.content);
    assert(viewport&&viewport.includes('width=device-width'),path+' viewport not responsive');
    const details={page:path,viewport:width};
    if(path==='store.html'){
     await page.waitForFunction(()=>document.querySelectorAll('#store-plans article.v11-plan').length>=5,
      {timeout:12000});
     assert.equal(await page.locator('#store-plans article.v11-plan').count(),5);
     assert.equal(await page.locator('#store-products article.product-card').count(),5);
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
  if(width===1280)await check('Store keyboard/category navigation and five membership detail links',async()=>{
    await page.goto(base+'/store.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelectorAll('#store-plans article.v11-plan').length===5,
      {timeout:12000});
    const cards=page.locator('#store-plans article.v11-plan');
    for(let i=0;i<5;i++){
     const c=cards.nth(i);
     assert.equal(await c.locator('.v11-price + .store-plan-primary-link').count(),1,
      'Missing or duplicate near-price detail link on membership '+i);
    }
    await page.locator('#store-tab-memberships').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#store-tab-books').getAttribute('aria-selected'),'true');
    await page.locator('#store-tab-tools').click();
    assert.equal(await page.locator('#store-panel-tools').evaluate(e=>e.hidden),false);
    const future=page.locator('#store-tools .store-future-card');
    assert((await future.count())>=6,'Future tools must be explicit, not checkout-enabled');
    const prohibited=await future.locator('a[href*="checkout"]').count();
    assert.equal(prohibited,0,'Future tools incorrectly offer checkout');
    return 'all five membership cards link to an educational detail page; keyboard category tabs and future tools';
  });
  if(width===1280)await check('Store automated accessibility baseline',async()=>{
    await page.goto(base+'/store.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelectorAll('#store-plans article.v11-plan').length===5,
      {timeout:12000});
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    const severe=axe.violations.filter(x=>x.impact==='critical'||x.impact==='serious');
    assert.deepEqual(severe.map(x=>({id:x.id,nodes:x.nodes.length})),[],
      'Serious/critical automated Store accessibility findings');
    return 'No serious/critical WCAG A/AA automated axe issues in Store; manual acceptance still required';
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
