/* v0.14.0.234 — noncharging premium Store and Owner editor Chromium acceptance.
   All Admin API results are mocked; this is NOT live Owner authentication acceptance. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {chromium} from 'playwright';
const base=(process.env.GU_REDESIGN_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
const scope={window:{}};
runInNewContext(readFileSync('assets/js/store-inventory-v014174.js','utf8'),scope);
const registry=Array.from(scope.window.GroundUpPrelaunchInventory);
const upcoming=registry.filter(x=>x.status==='coming_soon');
assert.equal(registry.length,51);assert.equal(upcoming.length,38);
const rows=upcoming.map(x=>({sku:x.sku,title:x.name,description:x.description,store_visible:true,lifecycle:'coming_soon',version:1}));

const labelCategory=Object.freeze({'Books':'book','Tools':'tool','Boot Camps':'bootcamp','Add-ons':'addon','Memberships':'membership'});
const items=registry.map((item,index)=>({
 sku:item.sku,category:/^FOUNDING_/.test(item.sku)?'founding':labelCategory[item.category]||'feature',
 name:item.name,description:item.description,price:'See product details',duration:'',
 status:item.status==='coming_soon'?'coming_soon':'listed',saleReady:false,
 updatedAt:new Date(Date.UTC(2026,0,index+1)).toISOString(),displayOrder:index+1,
 page:/^[a-z0-9-]+\\.html$/.test(item.href||'')?item.href:null
}));
const visibleItems=items.filter(x=>x.category!=='membership');
const listedFallback=registry.filter(x=>x.category==='Books'&&x.status==='existing_catalog');
// An unavailable public catalog must never revive Founding membership sales.
assert(listedFallback.every(x=>x.category==='Books'));
assert(!listedFallback.some(x=>/^FOUNDING_/.test(x.sku)));

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const events=[];
const check=async(name,fn)=>{try{await fn();console.log('PASS '+name)}catch(e){events.push(name+': '+e.message);console.error('FAIL '+name+': '+e.message)}};
async function publicPage(width=1440){
 const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
 await ctx.route('**/api/store-product-overrides',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,items:rows})}));
 await ctx.route('**/api/storefront-public-catalog',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({ok:true,source:'verified_storefront',items,count:items.length,
   layout:{tool_columns:5,tool_rows:5,catalog_columns:5,catalog_rows:3}})
 }));
 const page=await ctx.newPage();return {ctx,page};
}
try{
 for(const width of [375,768,1440]){
  await check('Catalog paginates owner-visible inventory and navigation at '+width+'px',async()=>{
   const {ctx,page}=await publicPage(width);
   try{
    await page.goto(base+'/store-all-products.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelectorAll('#inventory-list .product-card').length===15,{timeout:12000});
    assert.equal(await page.locator('#inventory-list .product-card').count(),15);
    assert.ok((await page.locator('#inventory-status').innerText()).includes(String(visibleItems.length)),'Catalog total must reflect Owner-visible SKUs');
    await page.locator('#inventory-pagination button').last().click();
    assert.equal(await page.locator('#inventory-list .product-card').count(),Math.min(15,visibleItems.length-15),'Second page must show the next fifteen or remaining SKUs');
    await page.locator('#inventory-pagination button').first().click();
    assert.ok(await page.locator('.site-header nav a').count()>=5);
    const measure=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(measure.scroll<=measure.viewport+3,'Horizontal overflow: '+JSON.stringify(measure));
    await page.locator('#inventory-search').fill('Truth Behind');
    assert.equal(await page.locator('#inventory-list .product-card').count(),1);
    await page.locator('#inventory-search').fill('');
    await page.locator('#inventory-category').selectOption('Boot Camps');
    assert.equal(await page.locator('#inventory-list .product-card').count(),15);
   }finally{await ctx.close()}
  });
 }
 await check('Customer detail uses owner-published copy, never checkout',async()=>{
  const {ctx,page}=await publicPage();
  try{
   await page.goto(base+'/store-upcoming-product.html?sku=BC-05-TRUTH');
   await page.waitForFunction(()=>document.querySelector('#inventory-detail h1')?.textContent==='The Truth Behind the Ticker');
   assert.match(await page.locator('#inventory-detail').innerText(),/Coming Soon/i);
   assert.equal(await page.locator('#inventory-detail button[type=submit],#inventory-detail a[href*=checkout]').count(),0);
  }finally{await ctx.close()}
 });
 await check('Unpublished item fails closed while established products remain',async()=>{
  const ctx=await browser.newContext({viewport:{width:1280,height:800}});
  await ctx.route('**/api/store-product-overrides',route=>route.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'}));
  await ctx.route('**/api/storefront-public-catalog',route=>route.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'}));
  const page=await ctx.newPage();
  try{
   await page.goto(base+'/store-all-products.html');
   await page.waitForFunction(expected=>document.querySelectorAll('#inventory-list .product-card').length===expected,listedFallback.length);
   assert.equal(await page.locator('#inventory-list .product-card').count(),listedFallback.length);
   await page.goto(base+'/store-upcoming-product.html?sku=BC-05-TRUTH');
   await page.waitForFunction(()=>document.querySelector('#inventory-detail')?.textContent?.includes('Product currently unavailable'));
   assert.match(await page.locator('#inventory-detail').innerText(),/could not be verified/i);
  }finally{await ctx.close()}
 });
 await check('Mock Owner editor save/readiness and unauthorized rejection',async()=>{
  const ctx=await browser.newContext({viewport:{width:1280,height:900}});
  let posted=null,deny=false;
  await ctx.route('**/__owner_editor_test',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body><div id="admin-products-panel"></div><script>window.GroundUpPrelaunchInventory='+JSON.stringify(registry)+';window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:"mock-owner-session"}}})}});</script></body></html>'}));
  await ctx.route('**/api/admin?action=*',async route=>{
   const u=new URL(route.request().url()),action=u.searchParams.get('action');
   assert.equal(route.request().headers().authorization,'Bearer mock-owner-session');
   if(deny)return route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({ok:false,error:'Owner authorization required'})});
   if(action==='store_product_overrides')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,items:rows.map(x=>({...x,store_visible:true,version:1}))})});
   if(action==='store_product_release_check')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,checkout_ready:false,blockers:['Live payment authorization not granted']})});
   if(action==='store_product_overlay_save'){
    posted=route.request().postDataJSON();
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,item:{...posted,version:2},notice:'Saved'})});
   }
   return route.fulfill({status:404,contentType:'application/json',body:'{"ok":false}'});
  });
  const page=await ctx.newPage();
  try{
   await page.goto(base+'/__owner_editor_test');
   await page.addScriptTag({path:'assets/js/admin-product-catalog-v014175.js'});
   await page.waitForFunction(()=>document.querySelectorAll('[data-product-overlay]').length===38);
   const form=page.locator('[data-product-overlay="BC-05-TRUTH"]');
   await form.locator('input[name=title]').fill('Approved QA title');
   await form.locator('button[type=submit]').click();
   await page.waitForFunction(()=>document.querySelector('#admin-prelaunch-count')?.textContent?.includes('revision 2'));
   assert.equal(posted.sku,'BC-05-TRUTH');assert.equal(posted.expected_version,1);
   assert.equal(posted.title,'Approved QA title');assert.equal(posted.lifecycle,'coming_soon');
   await form.locator('[data-release-check]').click();
   await page.waitForFunction(()=>document.querySelector('#admin-prelaunch-count')?.textContent?.includes('Live payment authorization'));
   deny=true;
   await form.locator('button[type=submit]').click();
   await page.waitForFunction(()=>document.querySelector('#admin-prelaunch-count')?.textContent?.includes('Owner authorization required'));
   assert.equal(await page.locator('a[href*=checkout]').count(),0);
  }finally{await ctx.close()}
 });
}finally{await browser.close()}
if(events.length){console.error(events.join('\n'));process.exitCode=1}
else console.log('PASS all v0.14.0.234 noncharging redesign browser acceptance checks');
