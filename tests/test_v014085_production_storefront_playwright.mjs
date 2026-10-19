/* v0.14.0.85 — Read-only customer production acceptance.
 * Never sign in, start checkout, submit payment, access Cloudflare/Supabase
 * consoles or mutate account/member/book records. A retail price is not proof
 * of actual paid fulfillment.
 */
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const base=(process.env.STOREFRONT_BASE||'https://stock-market-from-the-ground-up.pages.dev').replace(/\/$/,'');
const results=[],errors=[],pageErrors=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
async function run(name,fn){
  const row={name,status:'PASS',info:''};results.push(row);
  try{row.info=String(await fn()||'');}
  catch(e){row.status='FAIL';row.info=String(e.message||e).slice(0,1200);errors.push(row)}
  console.log((row.status==='PASS'?'PASS':'FAIL')+' '+name+' '+row.info.slice(0,340));
}
async function makePage(width=1440,height=900){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
 const page=await context.newPage();
 page.on('pageerror',e=>pageErrors.push({url:page.url(),message:e.message.slice(0,260),stack:String(e.stack||'').slice(0,1600)}));
 return {page,context};
}
const named=['store-membership-free.html','store-membership-full-monthly.html','store-membership-full-annual.html',
 'store-membership-lifetime.html','store-membership-ondemand-monthly.html',
 'store-book-foundation-1.html','store-book-foundation-2.html','store-book-foundation-3.html',
 'store-book-day-trading-1.html','store-book-reading-the-tape.html',
 'store-tool-interactive-learning.html','store-tool-journal-analytics.html','store-tool-market-simulator.html','store-tool-market-tutor.html',
 'store-membership-replay-training.html'];
let main,ctx;
try{
 ({page:main,context:ctx}=await makePage());
 await run('Store responds and initializes',async()=>{
   const resp=await main.goto(base+'/store.html',{waitUntil:'domcontentloaded',timeout:25000});
   assert.ok(resp?.ok(),'Store response '+resp?.status());
   await main.waitForFunction(()=>{
     const plans=document.querySelector('#store-plans'),books=document.querySelector('#store-products');
     return plans&&books&&plans.innerHTML.trim()!==''&&books.innerHTML.trim()!=='';
   },{timeout:22000});
   const plans=await main.locator('#store-plans article.v11-plan').count();
   const books=await main.locator('#store-products article.product-card').count();
   assert.equal(plans,5,'Expected five publicly listed memberships, not test/free QA');
   assert.equal(books,5,'Expected five book product cards');
   assert.equal(await main.locator('#store-tools article.v11-tool-card').count(),4,'Expected four LIVE à-la-carte tools');
   assert.equal(await main.locator('#store-membership-compare table').count(),1,'Feature comparison not rendered');
   assert.equal(await main.getByText('Monthly Membership Test').count(),0,'Retired $0 QA returned');
   return 'plans='+plans+', books='+books+', tools=4, comparison=1';
 });
 await run('Tab isolation and stateful deep links',async()=>{
   const options=['memberships','books','tools'];
   for(const t of options){
     await main.locator('#store-tab-'+t).click();
     assert.equal(await main.locator('#store-tab-'+t).getAttribute('aria-selected'),'true','Incorrect aria-selected for '+t);
     for(const other of options){
       const hidden=await main.locator('#store-panel-'+other).evaluate(n=>n.hidden);
       assert.equal(hidden,other!==t,'Panel isolation '+t+'/'+other);
     }
     assert.equal(new URL(main.url()).hash,'#'+t,'Hash deep link '+t);
   }
   await main.reload({waitUntil:'domcontentloaded'});
   await main.waitForFunction(()=>document.querySelector('#store-panel-tools')?.hidden===false,{timeout:14000});
   await main.waitForFunction(()=>document.querySelectorAll('#store-products article.product-card').length===5,{timeout:18000});
   return 'all three tabs exclusive, hash navigation and refresh persisted';
 });
 await run('Keyboard-only tab navigation',async()=>{
   await main.locator('#store-tab-memberships').click();
   await main.locator('#store-tab-memberships').focus();
   await main.keyboard.press('ArrowRight');
   assert.equal(await main.locator('#store-tab-books').getAttribute('aria-selected'),'true');
   await main.keyboard.press('End');
   assert.equal(await main.locator('#store-tab-tools').getAttribute('aria-selected'),'true');
   await main.keyboard.press('Home');
   assert.equal(await main.locator('#store-tab-memberships').getAttribute('aria-selected'),'true');
   return 'ArrowRight, End, Home; visible panel + focus';
 });
 await run('Book filters and product links',async()=>{
   await main.locator('#store-tab-books').click();
   await main.locator('#store-tabs button[data-filter="foundations"]').click();
   assert.equal(await main.locator('#store-products article.product-card:visible').count(),3);
   await main.locator('#store-tabs button[data-filter="all"]').click();
   assert.equal(await main.locator('#store-products article.product-card:visible').count(),5);
   const links=await main.locator('#store-products article.product-card h3 a').evaluateAll(a=>a.map(x=>new URL(x.href).pathname));
   assert.equal(new Set(links).size,5,'Book product links not unique');
   assert.ok(links.every(l=>/\/store-book-/.test(l)));
   return 'Foundations 3, all books 5, five unique detail links';
 });
 await run('Public purchase buttons do not create sessions',async()=>{
   const links=await main.locator('#store-plans a,#store-products a,#store-tools a').evaluateAll(a=>a.map(el=>el.getAttribute('href')));
   assert.ok(links.every(h=>!/^https:\/\/checkout\.stripe\.com/i.test(h||'')),'Direct uncontrolled Stripe checkout link');
   assert.ok(links.every(h=>!/store-zero-monthly|qa-test-plan/i.test(h||'')),'Retired QA link');
   return 'only links inspected; no clicks or payment calls';
 });
 await run('Store accessibility (WCAG 2 A/AA automated checks)',async()=>{
   await main.locator('#store-tab-memberships').click();
   const result=await new AxeBuilder({page:main}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
   const severe=result.violations.filter(v=>['critical','serious'].includes(v.impact));
   assert.equal(severe.length,0,severe.map(v=>v.id+': '+v.nodes.length+' nodes').join('; '));
   return 'no serious/critical automated accessibility violations (not a manual WCAG certification)';
 });
 for(const [i,path] of named.entries()){
   await run('Detail '+path,async()=>{
     const {page:p,context:c}=await makePage(1250,900);
     try{
       const response=await p.goto(base+'/'+path,{waitUntil:'domcontentloaded',timeout:24000});
       assert.ok(response?.ok(),'GET status '+response?.status());
       const root=p.locator('#store-product-root');
       await p.waitForFunction(()=> {
         const r=document.querySelector('#store-product-root');
         return r&&(!r.textContent.includes('Loading product coverage')||r.textContent.includes('temporarily unavailable'));
       },{timeout:18000});
       const text=await root.innerText();
       assert.ok(!/Loading product coverage/i.test(text),'Hydration not completed');
       assert.ok(!/Product information temporarily unavailable|Unable to verify the product catalog/i.test(text),
         'Customer sees a product catalog failure');
       assert.ok(text.length>300,'Insufficient product information');
       assert.ok(text.includes('Price')||text.includes('pricing')||text.includes('purchase'),'Missing pricing/availability context');
       const links=await root.locator('a').evaluateAll(a=>a.map(x=>x.getAttribute('href')));
       assert.ok(!links.some(x=>/^https:\/\/checkout\.stripe\.com/i.test(x||'')),'Unsafe external Stripe link');
       const headings=await root.locator('h2').count();
       assert.ok(headings>=2,'Insufficient section structure: '+headings);
       return 'loaded '+text.length+' chars, '+headings+' subheadings, '+links.length+' controlled links';
     }finally{await c.close()}
   });
 }
 await run('Mobile layout and category tap controls',async()=>{
   const {page:p,context:c}=await makePage(390,844);
   try{await p.goto(base+'/store.html',{waitUntil:'domcontentloaded',timeout:24000});
     await p.waitForFunction(()=>document.querySelector('#store-plans')?.innerHTML.trim().length>0,{timeout:20000});
     await p.locator('#store-tab-tools').click();
     assert.equal(await p.locator('#store-panel-tools').isVisible(),true);
     const widths=await p.evaluate(()=>({body:document.body.scrollWidth,viewport:innerWidth}));
     assert.ok(widths.body<=widths.viewport+2,'Horizontal overflow: '+JSON.stringify(widths));
     return '390px viewport, tools tappable, no whole-page horizontal overflow';
   }finally{await c.close()}
 });
 await run('Noncharging LIVE payment-readiness check',async()=>{
   // Local PR preview has no Cloudflare Functions: use the read-only,
   // already-deployed Production readiness endpoint for this one check.
   const liveOrigin='https://stock-market-from-the-ground-up.pages.dev';
   const response=await main.request.get(liveOrigin+'/api/stripe-live-checkout-v01458?type=plan&code=FULL_MONTHLY&v85='+Date.now(),{timeout:20000});
   const data=await response.json().catch(()=>null);
   assert.ok(data&&typeof data.liveCheckoutAvailable==='boolean','Read-only status endpoint did not return a valid boolean');
   return 'liveCheckoutAvailable='+data.liveCheckoutAvailable+' (read-only check; no financial transaction)';
 });
}finally{
 if(ctx)await ctx.close();await browser.close();
}
const report={checkedAt:new Date().toISOString(),site:base,scope:'anonymous, noncharging production storefront only',checks:results,jsErrors:pageErrors,
 failures:errors.length,passed:results.filter(x=>x.status==='PASS').length};
writeFileSync('storefront-v014085-acceptance.json',JSON.stringify(report,null,2));
console.log('SUMMARY '+report.passed+' PASS / '+report.failures+' FAIL; JavaScript page errors='+pageErrors.length);
if(pageErrors.length)console.log('JAVASCRIPT_ERRORS '+JSON.stringify(pageErrors.slice(0,12)));
process.exitCode=errors.length||pageErrors.length?1:0;
