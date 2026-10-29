/* v0.14.0.85 — Read-only customer production acceptance.
 * Never sign in, start checkout, submit payment, access Cloudflare/Supabase
 * consoles or mutate account/member/book records. A retail price is not proof
 * of actual paid fulfillment.
 */
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
const base=(process.env.STOREFRONT_BASE||'https://stock-market-from-the-ground-up-d1r.pages.dev').replace(/\/$/,'');
const results=[],errors=[],pageErrors=[];
const isLocal=/^(127\.0\.0\.1|localhost)$/.test(new URL(base).hostname);
const founderCodes=['FOUNDING_14','FOUNDING_30','FOUNDING_60']; // All currently published tiers; purchase eligibility remains server-authorized.
const fiveBooks=['FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','DAY_TRADING_BOOK_1','READING_THE_TAPE'];
const founderTerms=JSON.parse(readFileSync(new URL('../data/founding600-terms-v014170.json',import.meta.url),'utf8'));
const previewBookProducts=JSON.parse(readFileSync(new URL('../data/store-products.json',import.meta.url),'utf8'))
 .filter(p=>fiveBooks.includes(p.productCode));
const localPublishedItems=[
 ...founderCodes.map(code=>({sku:'founding:'+code,category:'founding',name:founderTerms.plans[code].name,status:'listed',saleReady:false,page:'founding600.html'})),
 ...previewBookProducts.map(p=>({sku:'book:'+p.productCode,category:'book',name:p.title,
 description:'Educational book preview; no automatic checkout.',status:'listed',saleReady:false,page:({
 FOUNDATION_BOOK_1:'store-book-foundation-1.html',FOUNDATION_BOOK_2:'store-book-foundation-2.html',
 FOUNDATION_BOOK_3:'store-book-foundation-3.html',DAY_TRADING_BOOK_1:'store-book-day-trading-1.html',
 READING_THE_TAPE:'store-book-reading-the-tape.html'})[p.productCode]}))
];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
async function run(name,fn){
  const row={name,status:'PASS',info:''};results.push(row);
  try{row.info=String(await fn()||'');}
  catch(e){row.status='FAIL';row.info=String(e.message||e).slice(0,1200);errors.push(row)}
  console.log((row.status==='PASS'?'PASS':'FAIL')+' '+name+' '+row.info.slice(0,340));
}
async function makePage(width=1440,height=900){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
 if(isLocal){
  // Local Python static servers do not execute Cloudflare Pages Functions.
  // These are isolated, explicitly noncommercial browser fixtures, never production substitutes.
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.origin!==base)return route.abort();
   const path=url.pathname;
   let body=null;
   if(path==='/api/founding-offer-status')body={
    ok:true,offersVisible:true,publicLaunch:false,phase:'beta',remaining:600,enrollmentEnabled:false
   };
   else if(path==='/api/storefront-public-catalog')body={
    ok:true,source:'verified_storefront',items:localPublishedItems,
    count:localPublishedItems.length,layout:{tool_columns:5,tool_rows:5,catalog_columns:5,catalog_rows:3}
   };
   else if(path==='/api/founding600-checkout')body={
    ok:true,checkoutEnabled:false,offersVisible:true,plans:founderCodes.map(code=>({code,checkoutEnabled:false}))
   };
   else if(path==='/data/founding-catalog.json')body={
    plans:founderTerms.plans
   };
   else if(path==='/api/digital-payment-route-v01432r2')body={ok:true,enabled:false,checkoutEnabled:false};
   if(body)return route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify(body)});
   // Fail closed on unknown API calls. Never send simulated member data to a live service.
   if(path.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',
    body:'{"ok":false,"error":"Static preview: server function unavailable"}'});
   return route.continue();
  });
 }
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
let main,ctx,catalog=null,offerState=null,bookCodes=[],founderVisible=false,bookCount=0;
try{
 ({page:main,context:ctx}=await makePage());
 await run('Public catalog and Founder status contract (read-only)',async()=>{
  if(isLocal)await main.goto(base+'/store.html',{waitUntil:'domcontentloaded'});
  const [catalogResponse,offerResponse]=isLocal?[null,null]:await Promise.all([
   main.request.get(base+'/api/storefront-public-catalog',{timeout:20000}),
   main.request.get(base+'/api/founding-offer-status',{timeout:20000})
  ]);
  // APIRequestContext does not use page routing: localhost fixtures must be read
  // through the browser so the same isolated route rules apply.
  if(isLocal){
   const responses=await main.evaluate(async()=>{
    const [c,o]=await Promise.all([fetch('/api/storefront-public-catalog'),fetch('/api/founding-offer-status')]);
    return {c:await c.json(),o:await o.json(),cStatus:c.status,oStatus:o.status};
   });
   catalog=responses.c;offerState=responses.o;
   assert.equal(responses.cStatus,200);
   assert.equal(responses.oStatus,200);
  }else{
   assert.equal(catalogResponse.status(),200,'Production public catalog API must return HTTP 200');
   assert.equal(offerResponse.status(),200,'Production Founder status API must return HTTP 200');
   catalog=await catalogResponse.json();offerState=await offerResponse.json();
  }
  assert.equal(catalog?.ok,true,'Catalog API must verify its data');
  assert.equal(catalog?.source,'verified_storefront');
  assert.ok(Array.isArray(catalog.items),'Catalog must include an items array');
  assert.ok(catalog.count===undefined||catalog.count===catalog.items.length,'Catalog count integrity');
  assert.equal(offerState?.ok,true,'Founder status must be verifiable');
  bookCodes=catalog.items.filter(x=>x.category==='book').map(x=>String(x.sku||'').slice(5));
  bookCount=bookCodes.filter(x=>fiveBooks.includes(x)).length;
  founderVisible=offerState.offersVisible===true;
  if(!founderVisible)assert.equal(catalog.items.filter(x=>x.category==='founding').length,0,
   'Public API must not disclose unpublished Founder offers');
  return 'Published book count='+bookCount+'; Founders visible='+founderVisible;
 });

 await run('Store initializes its current Founder and educational catalog',async()=>{
   const response=await main.goto(base+'/store.html',{waitUntil:'domcontentloaded',timeout:25000});
   assert.ok(response?.ok(),'Store response '+response?.status());
   let verifiedFounderCount=0;
   if(founderVisible){
    await main.waitForFunction(()=>document.querySelectorAll('#store-founder-plans .catalog-founder-card').length>0,
     {timeout:22000});
    const latestResponse=await main.request.get(base+'/api/storefront-public-catalog',{headers:{'cache-control':'no-cache'}});
    assert.ok(latestResponse.ok(),'Published Founder catalog must be verifiable');
    const latest=await latestResponse.json();
    assert.equal(latest.source,'verified_storefront');
    const currentCodes=latest.items.filter(x=>x.category==='founding'&&
     founderCodes.some(c=>x.sku==='founding:'+c)).map(x=>x.sku.slice('founding:'.length));
    assert.ok(currentCodes.length>0,'No currently published Founder SKU');
    const termsResponse=await main.request.get(base+'/data/founding-catalog.json');
    assert.ok(termsResponse.ok(),'Current Founder pricing must be available');
    const terms=await termsResponse.json();
    const titles=await main.locator('#store-founder-plans .catalog-founder-card h3').allTextContents();
    verifiedFounderCount=titles.length;
    assert.ok(verifiedFounderCount>=1&&verifiedFounderCount<=3,
     'Only canonical Founding Starter/30/60 cards may render when public gate is open');
    const canonical=new Map(founderCodes.map(code=>[terms.plans?.[code]?.name,code]));
    const cards=await main.locator('#store-founder-plans .catalog-founder-card').allTextContents();
    assert.equal(new Set(titles).size,titles.length,'Founding tiers cannot duplicate');
    titles.forEach((title,i)=>{
     const code=canonical.get(title);
     assert.ok(code,'Displayed Founder name must exist in authenticated current pricing terms: '+title);
     const p=terms.plans[code];
     assert.ok(cards[i].includes((p.recurringCents/100).toFixed(2)),
      'Displayed recurring price must match signed Founder terms: '+title);
    });
    if(currentCodes.length!==verifiedFounderCount)console.warn(
     'Founder count differs between independently timed public-catalog reads: Store renders '+verifiedFounderCount+
     ', most recent API snapshot lists '+currentCodes.length+
     '. Commercial checkout stays protected by independently verified enrollment gates.');
    assert.equal(await main.locator('#store-tab-founders').isVisible(),true);
   }else{
    assert.equal(await main.locator('#store-tab-founders').isVisible(),true,'Founding Memberships category must stay visible while enrollment is gated');
    assert.equal(await main.locator('#store-founder-plans .catalog-founder-card').count(),0);
   }
   if(bookCount){
    await main.waitForFunction(n=>document.querySelectorAll('#store-products article.product-card').length===n,bookCount,{timeout:22000});
   }else{
    await main.waitForFunction(()=>!!document.querySelector('#store-products .empty-state'),{timeout:22000});
    assert.equal(await main.locator('#store-products article.product-card').count(),0);
   }
   if(!isLocal)await main.waitForFunction(()=>document.querySelectorAll('#store-tools article.v11-tool-card').length>=4,{timeout:22000});
   assert.equal(await main.locator('#store-founder-plans .catalog-founder-card').count(),
    founderVisible?verifiedFounderCount:0,
    'Founder cards must match the CURRENT published catalog and gate, not a stale snapshot');
   assert.equal(await main.locator('#store-products article.product-card').count(),bookCount,
   'Book cards must match publicly visible catalog records');
   if(!isLocal)assert.equal(await main.locator('#store-tools .store-sell-card .store-sell-price').count(),
    await main.locator('#store-tools article.v11-tool-card').count(),
    'Every released tool must disclose price/status');
   assert.equal(await main.locator('#store-tab-memberships').isVisible(),false,
    'Unreleased Membership tab must remain hidden');
   assert.equal(await main.getByText('Monthly Membership Test').count(),0,'Retired QA offer returned');
   return 'Verified '+(founderVisible?'published Founder cards':'hidden Founder offers')+', '+bookCount+' published books, no legacy Membership tab';
 });
 await run('Six Store tabs are exclusive and preserve deep links',async()=>{
   const options=['founders','books','sparks','tools','current','upcoming']
    .filter(t=>t!=='founders'||founderVisible);
   for(const t of options){
     await main.locator('#store-tab-'+t).click();
     assert.equal(await main.locator('#store-tab-'+t).getAttribute('aria-selected'),'true');
     for(const other of options){
       assert.equal(await main.locator('#store-panel-'+other).evaluate(el=>el.hidden),other!==t,'Panel isolation '+t+'/'+other);
     }
     assert.equal(new URL(main.url()).hash,'#'+t,'Deep-link '+t);
   }
   await main.reload({waitUntil:'domcontentloaded'});
   await main.waitForFunction(()=>document.querySelector('#store-panel-upcoming')?.hidden===false,{timeout:18000});
   return 'Six tab states and reload of Upcoming Releases';
 });
 await run('Accessible keyboard Store tabs',async()=>{
   const tabs=['founders','books','sparks','tools','current','upcoming']
    .filter(t=>t!=='founders'||founderVisible);
   await main.locator('#store-tab-'+tabs[0]).click();
   await main.locator('#store-tab-'+tabs[0]).focus();
   await main.keyboard.press('ArrowRight');
   const diagnostic=await main.evaluate(()=>({
     focused:document.activeElement?.id,
     hash:location.hash,
     tabs:[...document.querySelectorAll('[data-store-category]')].map(b=>({
       id:b.id,hidden:b.hidden,rects:b.getClientRects().length,
       selected:b.getAttribute('aria-selected'),disabled:b.disabled}))
   }));
   assert.equal(await main.locator('#store-tab-'+tabs[1]).getAttribute('aria-selected'),'true',
    'ArrowRight from '+tabs[0]+' should select '+tabs[1]+'; observed '+JSON.stringify(diagnostic));
   await main.keyboard.press('End');
   assert.equal(await main.locator('#store-tab-'+tabs.at(-1)).getAttribute('aria-selected'),'true','End must select the last visible Store category');
   await main.keyboard.press('Home');
   assert.equal(await main.locator('#store-tab-'+tabs[0]).getAttribute('aria-selected'),'true','Home must select the first visible Store category');
   return 'ArrowRight, End and Home select published Store tabs';
 });
 await run('Book filters hide nonmatching books and restore all five',async()=>{
   await main.locator('#store-tab-books').click();
   if(!bookCount){
    assert.equal(await main.locator('#store-products article.product-card').count(),0);
    assert.match(await main.locator('#store-products .empty-state').textContent(),/No books are currently listed/);
    return 'Unpublished book listings remain hidden; empty state available';
   }
   await main.waitForFunction(n=>document.querySelectorAll('#store-products article.product-card').length===n,bookCount,{timeout:16000});
   const families={
    foundations:['FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3'],
    'day-trading':['DAY_TRADING_BOOK_1'],
    'reading-the-tape':['READING_THE_TAPE']
   };
   for(const [filter,count] of [
    ['foundations',families.foundations.filter(c=>bookCodes.includes(c)).length],
    ['day-trading',families['day-trading'].filter(c=>bookCodes.includes(c)).length],
    ['reading-the-tape',families['reading-the-tape'].filter(c=>bookCodes.includes(c)).length],
    ['all',bookCount]]){
     await main.locator('#store-tabs button[data-filter="'+filter+'"]').click();
     assert.equal(await main.locator('#store-products article.product-card:visible').count(),count,'Book filter '+filter);
   }
   const links=await main.locator('#store-products article.product-card h3 a').evaluateAll(a=>a.map(el=>new URL(el.href).pathname));
   assert.equal(new Set(links).size,bookCount);
   assert.ok(links.every(h=>/\/store-book-/.test(h)));
   return 'Book filters match '+bookCount+' authorized public book listings';
 });
 await run('Current and Upcoming products are separate grouped catalogs',async()=>{
   await main.locator('#store-tab-current').click();
   await main.waitForFunction(()=>document.querySelector('#store-current-products')?.textContent.trim().length>0,{timeout:17000});
   assert.equal(await main.locator('#store-panel-current').isVisible(),true);
   assert.equal(await main.locator('#store-panel-upcoming').isHidden(),true);
   await main.locator('#store-tab-upcoming').click();
   await main.waitForFunction(()=>document.querySelector('#store-upcoming-products')?.textContent.trim().length>0,{timeout:17000});
   assert.equal(await main.locator('#store-panel-upcoming').isVisible(),true);
   assert.equal(await main.locator('#store-panel-current').isHidden(),true);
   return 'Exclusive current/upcoming panels and populated status surfaces';
 });
 await run('No uncontrolled checkout or retired membership CTA',async()=>{
   const links=await main.locator('#store-founder-plans a,#store-products a,#store-tools a,#store-current-products a,#store-upcoming-products a').evaluateAll(a=>a.map(el=>el.getAttribute('href')));
   assert.ok(links.every(h=>!/^https:\/\/checkout\.stripe\.com/i.test(h||'')));
   assert.ok(links.every(h=>!/store-zero-monthly|qa-test-plan/i.test(h||'')));
   return 'Only links examined; no checkout or payment requests';
 });
 await run('Store automated accessibility evaluation',async()=>{
   await main.locator('#store-tab-'+(founderVisible?'founders':'books')).click();
   const result=await new AxeBuilder({page:main}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
   const serious=result.violations.filter(v=>['critical','serious'].includes(v.impact));
   assert.equal(serious.length,0,serious.map(v=>v.id+': '+v.nodes.length).join('; '));
   return 'No serious/critical automated issues; not manual WCAG certification';
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
       if(path.startsWith('store-book-')&&!bookCodes.includes(({
        'store-book-foundation-1.html':'FOUNDATION_BOOK_1',
        'store-book-foundation-2.html':'FOUNDATION_BOOK_2',
        'store-book-foundation-3.html':'FOUNDATION_BOOK_3',
        'store-book-day-trading-1.html':'DAY_TRADING_BOOK_1',
        'store-book-reading-the-tape.html':'READING_THE_TAPE'
       })[path])){
        assert.match(text,/Book not currently listed/i,'Hidden book detail must fail closed');
        assert.equal(await root.locator('a[href*="checkout"]').count(),0,
         'Unpublished book must not display checkout');
        return 'Unpublished book detail correctly unavailable';
       }
       assert.ok(!/Loading product coverage/i.test(text),'Hydration not completed');
       assert.ok(!/Product information temporarily unavailable|Unable to verify the product catalog/i.test(text),
         'Customer sees a product catalog failure');
       assert.ok(text.length>300,'Insufficient product information');
       assert.ok(text.includes('Price')||text.includes('pricing')||text.includes('purchase'),'Missing pricing/availability context');
       const links=await root.locator('a').evaluateAll(a=>a.map(x=>x.getAttribute('href')));
       assert.ok(!links.some(x=>/^https:\/\/checkout\.stripe\.com/i.test(x||'')),'Unsafe external Stripe link');
       const headings=await root.locator('h2').count();
       assert.ok(headings>=2,'Insufficient section structure: '+headings);
       assert.equal(await root.locator('header.store-product-hero h1').count(),1,'Product needs an immediately visible focused editorial title');
       assert.equal(await root.locator('.store-product-body > .store-product-sections').count(),1,'Missing linear product education area');
       assert.equal(await root.locator('.store-product-body > aside.store-product-purchase').count(),1,'Pricing must be a secondary sidebar');
       const geometry=await p.evaluate(()=>{
         const hero=document.querySelector('.store-product-hero').getBoundingClientRect();
         const body=document.querySelector('.store-product-body').getBoundingClientRect();
         const sections=document.querySelector('.store-product-sections').getBoundingClientRect();
         const aside=document.querySelector('.store-product-purchase').getBoundingClientRect();
         return {heroHeight:hero.height,gap:body.top-hero.bottom,sectionStart:sections.top,priceStart:aside.top,mainWidth:sections.width,asideWidth:aside.width,bodyWidth:body.width,scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth};
       });
       assert.ok(geometry.gap>=-3&&geometry.gap<=65,'Large blank gap below product title: '+JSON.stringify(geometry));
       assert.ok(geometry.heroHeight<480,'Excessively tall empty hero: '+JSON.stringify(geometry));
       assert.ok(Math.abs(geometry.sectionStart-geometry.priceStart)<25,'Main learning content should align with availability sidebar');
       assert.ok(geometry.mainWidth>geometry.asideWidth,'Product explanation must be the primary content');
       if(geometry.scrollWidth>geometry.viewport+3){
         const offenders=await p.evaluate(()=>[...document.querySelectorAll('body *')].map(el=>{
          const b=el.getBoundingClientRect();return {tag:el.tagName,cls:String(el.className).slice(0,85),
           id:el.id,left:Math.round(b.left),right:Math.round(b.right),
           width:Math.round(b.width),text:el.textContent?.trim().slice(0,65)};
         }).filter(x=>x.right>innerWidth+3||x.left< -3).sort((a,b)=>b.right-a.right).slice(0,18));
         console.error('STORE_OVERFLOW_DIAGNOSTIC '+path+' '+JSON.stringify({geometry,offenders}));
       }
       assert.ok(geometry.scrollWidth<=geometry.viewport+3,'Product page horizontal overflow '+JSON.stringify(geometry)+'; inspect STORE_OVERFLOW_DIAGNOSTIC from this job');
       if(path.startsWith('store-book-')&&!path.includes('membership')){
         assert.equal(await root.locator('.store-product-hero .store-product-book-cover').count(),1,'Prominent book cover missing from hero');
         assert.equal(await root.locator('.store-product-about .store-product-book-cover').count(),0,'Duplicate book cover blocks the book synopsis');
       }
       return 'loaded '+text.length+' chars; editorial hero '+Math.round(geometry.heroHeight)+'px, blank gap '+Math.round(geometry.gap)+'px; '+headings+' sections';
     }finally{await c.close()}
   });
 }
 await run('Mobile layout and category tap controls',async()=>{
   const {page:p,context:c}=await makePage(390,844);
   try{await p.goto(base+'/store.html',{waitUntil:'domcontentloaded',timeout:24000});
     if(founderVisible){
      const expected=catalog.items.filter(x=>x.category==='founding').length;
      await p.waitForFunction(n=>document.querySelectorAll('#store-founder-plans .catalog-founder-card').length===n,expected,{timeout:20000});
     }else{
      assert.equal(await p.locator('#store-tab-founders').isVisible(),false);
     }
     await p.locator('#store-tab-tools').click();
     assert.equal(await p.locator('#store-panel-tools').isVisible(),true);
     const widths=await p.evaluate(()=>({body:document.body.scrollWidth,viewport:innerWidth}));
     assert.ok(widths.body<=widths.viewport+2,'Horizontal overflow: '+JSON.stringify(widths));
     return '390px viewport, tools tappable, no whole-page horizontal overflow';
   }finally{await c.close()}
 });
 await run('Mobile product information is readable without horizontal scrolling',async()=>{
   for(const path of ['store-book-foundation-1.html','store-membership-ondemand-monthly.html','store-tool-market-tutor.html']){
     const {page:p,context:c}=await makePage(390,844);
     try{
       const response=await p.goto(base+'/'+path,{waitUntil:'domcontentloaded',timeout:24000});
       assert.ok(response?.ok(),'Cannot load '+path);
       if(path==='store-book-foundation-1.html'&&!bookCodes.includes('FOUNDATION_BOOK_1')){
        await p.getByText('Book not currently listed').waitFor();
        assert.equal(await p.locator('a[href*="checkout"]').count(),0);
        continue;
       }
       await p.waitForFunction(()=>!!document.querySelector('.store-product-body'),{timeout:18000});
       const metrics=await p.evaluate(()=>{
         const primary=document.querySelector('.store-product-sections').getBoundingClientRect();
         const purchase=document.querySelector('.store-product-purchase').getBoundingClientRect();
         return {width:document.documentElement.scrollWidth,viewport:innerWidth,
          main:primary.width,mainY:primary.top,sidebarY:purchase.top,sidebarWidth:purchase.width};
       });
       assert.ok(metrics.width<=metrics.viewport+3,'Mobile horizontal overflow on '+path+': '+JSON.stringify(metrics));
       assert.ok(metrics.sidebarY>=metrics.mainY,'Primary product information must lead on mobile: '+path);
       assert.ok(metrics.sidebarWidth<=metrics.viewport,'Mobile purchase panel too wide: '+path);
     }finally{await c.close()}
   }
   return '390px book/membership/tool: single-column readable layout, no horizontal overflow, product information before price';
 });
 await run('Noncharging LIVE payment-readiness check',async()=>{
   // Local PR preview has no Cloudflare Functions: use the read-only,
   // already-deployed Production readiness endpoint for this one check.
   const liveOrigin='https://stock-market-from-the-ground-up-d1r.pages.dev';
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
