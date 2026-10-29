import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const src=readFileSync('assets/js/admin-products-v01489.js','utf8');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const plans=['FREE','PICK_WHAT_YOU_WANT','ONDEMAND_MONTHLY','FULL_MONTHLY','FULL_ANNUAL','LIFETIME','FOUNDING_14','FOUNDING_30','FOUNDING_60','FOUNDING_MONTHLY','FOUNDING_ANNUAL']
 .map((plan_code,i)=>({plan_code,name:plan_code,description:'Educational membership',active:!plan_code.endsWith('ANNUAL')||plan_code==='FULL_ANNUAL',public_visible:true,checkout_enabled:false,price_cents:100*(i+1),billing_interval:'none'}));
const tools=['INTERACTIVE_LEARNING','MARKET_TUTOR','JOURNAL_ANALYTICS','MARKET_SIMULATOR'].map(tool_code=>({tool_code,name:tool_code,status:'live',active:true,public_visible:true,individual_price_cents:2999}));
tools.push({tool_code:'SCANNER_BUILDER',name:'Scanner Builder',status:'beta',active:true,public_visible:false,individual_price_cents:2999});
const prices=[{sku:'CHART_ADVANCED_DAY',label:'Advanced 24 hours',category:'CHART_STUDIO',sparks_cost:6,fulfillment:'CHART_PASS',state:'active'}];
const packages={checkoutEnabled:false,packages:[{code:'SPARKS_25',name:'Starter',quantity:25,priceCents:500,checkoutEnabled:false}]};
try{
 const page=await browser.newPage({viewport:{width:1300,height:840}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://product-tests.local/',r=>r.fulfill({status:200,contentType:'text/html',body:'<html><body></body></html>'}));
 await page.goto('https://product-tests.local/');
 const tabs=['books','tools','memberships','founding','sparks'];
 const html='<main id="admin-products-panel"><div class="product-admin-tabs">'+tabs.map(x=>'<button data-product-tab="'+x+'" id="admin-products-tab-'+x+'">'+x+'</button>').join('')+'</div><p id="admin-products-message"></p>'+
 tabs.map(x=>'<section id="admin-products-'+x+'"><div id="admin-products-'+({books:'',tools:'tool-list',memberships:'membership-list',founding:'founding-list',sparks:'sparks-catalog'})[x]+'"></div></section>').join('')+
 '<button id="admin-products-new-tool"></button><button id="admin-products-open-sparks"></button><button id="admin-open-digital-books"></button><div id="admin-catalog-list"></div></main>';
 // Fix the Books section placeholder; other panels have their prescribed IDs.
 await page.setContent(html);
 await page.evaluate(({plans,tools,prices,packages})=>{
  window.GroundUpUpcomingOfferings=[];
  window.GroundUpAdminBookEditor={load:async()=>{document.getElementById('admin-catalog-list').textContent='Five book records'}};
  window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'mock'}}})}});
  window.fetch=async url=>{
   const action=new URL(url,'https://product-tests.local').searchParams.get('action');
   const result=action==='context'?{roles:['OWNER'],permissions:['commerce.view','catalog.view','settings.view','tools.manage','plans.manage']}:
    action==='platform'?{plans,tools}:action==='sparks_prices'?{prices}:url.includes('crownlight-sparks-store')?packages:{};
   return new Response(JSON.stringify({ok:true,...result}),{status:200,headers:{'content-type':'application/json'}});
  };
 },{plans,tools,prices,packages});
 await page.addScriptTag({content:src});
 await page.evaluate(()=>window.GroundUpAdminProducts.load());
 assert.match(await page.locator('#admin-products-message').innerText(),/Loaded 6 regular memberships, 3 current founding offers/);
 assert.equal(await page.locator('#admin-products-membership-list [data-plan]').count(),6);
 assert.equal(await page.locator('#admin-products-founding-list [data-plan]').count(),5);
 assert.match(await page.locator('#admin-products-founding-list').innerText(),/Inactive legacy Founding/);
 assert.match(await page.locator('#admin-products-tool-list').innerText(),/Released tools \(4\)/);
 assert.match(await page.locator('#admin-products-tool-list').innerText(),/Beta \/ planned tool records \(1\)/);
 assert.match(await page.locator('#admin-products-sparks-catalog').innerText(),/SPARKS_25/);
 assert.match(await page.locator('#admin-products-sparks-catalog').innerText(),/CHART_ADVANCED_DAY/);
 assert.match(await page.locator('#admin-products-sparks-catalog').innerText(),/\$5\.00/);
 for(const tab of tabs){
  await page.locator('#admin-products-tab-'+tab).click();
  assert.equal(await page.locator('#admin-products-'+tab).isHidden(),false);
  assert.equal(await page.locator('#admin-products-tab-'+tab).getAttribute('aria-selected'),'true');
 }
 assert.deepEqual(errors,[]);
 console.log('PASS actual Chromium: five Product tabs populated, 6 regular, 3 current + 2 legacy founders, released vs beta, USD Sparks packages and redemption costs, working navigation');
}finally{await browser.close()}
