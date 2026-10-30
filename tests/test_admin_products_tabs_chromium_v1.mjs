import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const code=readFileSync('assets/js/admin-products-v01489.js','utf8');
const origin='https://products-fixture.test';
const plan=(c,n,p=0)=>({plan_code:c,name:n,description:'QA item',price_cents:p,active:true,public_visible:false,checkout_enabled:false,billing_interval:'month'});
const plans=[
 plan('FREE','Founding Free (name deliberately misleading)'),
 plan('PICK_WHAT_YOU_WANT','Pick What You Want'),
 plan('ONDEMAND_MONTHLY','Founding Replay (name deliberately misleading)',1999),
 plan('FULL_MONTHLY','Full Monthly',6999),plan('FULL_ANNUAL','Full Annual',69900),
 plan('LIFETIME','Lifetime',249900),
 plan('FOUNDING_14','Full Starter (name deliberately misleading)',2299),
 plan('FOUNDING_30','Founding Standard',4999),plan('FOUNDING_60','Extended',5999),
 {...plan('FOUNDING_MONTHLY','Legacy Founding Monthly',4999),active:false},
 {...plan('FOUNDING_ANNUAL','Legacy Founding Annual',49900),active:false},
 plan('SPECIAL_NEW','Unclassified',1500)
];
const terms=['FOUNDING_14','FOUNDING_30','FOUNDING_60'].map((c,i)=>({plan_code:c,term_days:[14,30,60][i],price_cents:[2299,4999,5999][i],purchase_discount_bps:0,included_sparks:0,checkout_enabled:false}));
const sparks=[
 {category:'CHART_STUDIO',sku:'CHART_PRO',label:'Professional chart pass',sparks_cost:15,fulfillment:'temporary_access',state:'active'},
 {category:'AD_FREE',sku:'ADFREE_DAY',label:'Ad-free day',sparks_cost:5,fulfillment:'adfree',state:'active'},
 {category:'PRACTICE',sku:'EARLY_RETRY',label:'Early retake',sparks_cost:5,fulfillment:'retry',state:'planned'}
];
const packs={checkoutEnabled:false,packages:[{name:'Starter',code:'SPARKS_25',quantity:25,priceCents:500,checkoutEnabled:false}]};
const names=['books','tools','memberships','founding','sparks'];
const tabs=names.map(n=>'<button type="button" role="tab" id="admin-products-tab-'+n+'" data-product-tab="'+n+'">'+n+'</button>').join('');
const html='<!doctype html><html><body><section id="admin-products-panel"><div role="tablist">'+tabs+'</div>'+
'<p id="admin-products-message" role="status"></p>'+
'<div id="admin-products-books" role="tabpanel" hidden><div id="admin-products-books-audit"></div><div id="admin-catalog-list"></div></div>'+
'<div id="admin-products-tools" role="tabpanel" hidden><button id="admin-products-new-tool"></button><div id="admin-products-tool-list"></div></div>'+
'<div id="admin-products-memberships" role="tabpanel"><div id="admin-products-membership-list"></div></div>'+
'<div id="admin-products-founding" role="tabpanel" hidden><div id="admin-products-founding-list"></div></div>'+
'<div id="admin-products-sparks" role="tabpanel" hidden><div id="admin-products-sparks-catalog"></div><button id="admin-products-open-sparks"></button></div>'+
'</section></body></html>';
const respond=x=>({status:200,contentType:'application/json',body:JSON.stringify(x)});
try {
 const page=await browser.newPage({viewport:{width:1200,height:840}});
 const failed=[],errors=[];let isOwner=true;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.origin===origin&&u.pathname==='/')return route.fulfill({status:200,contentType:'text/html',body:'<html></html>'});
  if(u.pathname==='/data/crownlight-sparks-store-v014167.json')return route.fulfill(respond(packs));
  if(u.pathname==='/api/admin'){
   const key=u.searchParams.get('action');
   if(key==='context')return route.fulfill(respond({ok:true,roles:isOwner?['OWNER']:['MODERATOR'],permissions:isOwner?['commerce.view','catalog.view','settings.view','plans.manage','tools.manage']:['commerce.view','catalog.view']}));
   if(key==='platform')return route.fulfill(respond({ok:true,plans,tools:[{tool_code:'MARKET_TUTOR',name:'Tutor',status:'live',description:'QA',individual_price_cents:2999,active:true,public_visible:false,checkout_enabled:false}]}));
   if(key==='catalog')return route.fulfill(respond({ok:true,products:[]}));
   if(key==='founder_product_terms')return route.fulfill(respond({ok:true,terms}));
   if(key==='sparks_prices')return route.fulfill(respond({ok:true,prices:sparks}));
  }
  failed.push({url:u.toString(),method:route.request().method()});return route.abort();
 });
 await page.goto(origin+'/');
 await page.setContent(html);
 await page.evaluate(()=>{
  window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:'synthetic'}}})}});
  window.GroundUpAdminBookEditor={load:async()=>null};
  window.GroundUpUpcomingOfferings=[];
 });
 await page.addScriptTag({content:code});
 await page.evaluate(()=>window.GroundUpAdminProducts.load());
 assert.match(await page.locator('#admin-products-message').innerText(),/Verified 6 regular memberships, 3 current founding offers, 2 legacy/);
 assert.deepEqual(await page.locator('#admin-products-membership-list [data-plan]').evaluateAll(a=>a.map(n=>n.dataset.plan)),
  ['FREE','PICK_WHAT_YOU_WANT','ONDEMAND_MONTHLY','FULL_MONTHLY','FULL_ANNUAL','LIFETIME','SPECIAL_NEW']);
 assert.deepEqual(await page.locator('#admin-products-founding-list [data-plan]').evaluateAll(a=>a.map(n=>n.dataset.plan)),
  ['FOUNDING_14','FOUNDING_30','FOUNDING_60','FOUNDING_MONTHLY','FOUNDING_ANNUAL']);
 assert.equal(await page.locator('#admin-products-founding-list details.product-archive').count(),1);
 assert.match(await page.locator('[data-plan="FULL_MONTHLY"] .product-admin-price').innerText(),/\$69\.99/);
 for(const name of names){
  await page.locator('#admin-products-tab-'+name).click();
  assert.equal(await page.locator('#admin-products-'+name).isVisible(),true,name+' panel should open');
  assert.equal(await page.locator('#admin-products-tab-'+name).getAttribute('aria-selected'),'true');
 }
 const inventory=await page.locator('#admin-products-sparks-catalog').innerText();
 for(const expect of ['USD Sparks packages (1)','Starter','$5.00','CHART STUDIO','Professional chart pass','15 Sparks','AD FREE','Early retake'])
  assert(inventory.includes(expect),'Sparks inventory missing '+expect);
 assert.equal(await page.locator('[data-plan="FULL_MONTHLY"] [data-plan-save]').count(),1);
 isOwner=false;
 await page.evaluate(()=>window.GroundUpAdminProducts.load());
 assert.match(await page.locator('#admin-products-sparks-catalog').innerText(),/Only the Owner/);
 assert.equal(await page.locator('#admin-products-membership-list [data-plan-save]').count(),0);
 assert.equal(await page.locator('#admin-products-membership-list [data-plan-copy]').count(),0);
 assert.equal(await page.locator('#admin-products-new-tool').isHidden(),true);
 assert.deepEqual(failed,[]);
 assert.deepEqual(errors,[]);
 console.log('PASS Products & Prices Chromium: scoped loader, canonical plan categories, all five tabs, Sparks catalog and Owner restrictions');
} finally {await browser.close()}
