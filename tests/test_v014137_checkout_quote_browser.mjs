/* v0.14.0.137 | Isolated Playwright quote/consent acceptance: mocked GET only.
 * Does not use customer credentials, connect to Stripe, or create sessions.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(root))throw Error('Only isolated loopback fixture permitted');
const data=[
 ['plan','FULL_MONTHLY',6999,'month','Full Platform Monthly','$69.99 per month'],
 ['plan','FULL_ANNUAL',69900,'year','Full Platform Annual','$699.00 per year'],
 ['plan','LIFETIME',249900,'lifetime','Lifetime Platform Access','$2,499.00 one-time'],
 ['plan','ONDEMAND_MONTHLY',1999,'month','Historical Replay Monthly','$19.99 per month'],
 ['tool','INTERACTIVE_LEARNING',2999,'month','Interactive Learning','$29.99 per month'],
 ['tool','JOURNAL_ANALYTICS',2999,'month','Journal Analytics','$29.99 per month'],
 ['tool','MARKET_SIMULATOR',2999,'month','Market Simulator','$29.99 per month'],
 ['tool','MARKET_TUTOR',2999,'month','Market Tutor','$29.99 per month']
];
let totalGet=0,totalPost=0;
const cases=[...data.map(row=>({row,valid:true})),
 {row:data[0],valid:false,mutation:offer=>({...offer,unitAmountCents:0})},
 {row:data[0],valid:false,mutation:offer=>({...offer,unitAmountCents:'6999'})},
 {row:data[0],valid:false,mutation:offer=>({...offer,currency:'EUR'})},
 {row:data[0],valid:false,mutation:offer=>({...offer,intervalCount:12})},
 {row:data[0],valid:false,mutation:offer=>({...offer,code:'FULL_ANNUAL'})},
 {row:data[0],valid:false,mutation:offer=>({...offer,billingInterval:'year'})},
 {row:data[0],valid:false,mutation:()=>null},
 {row:data[0],valid:false,closed:true},
 {row:data[0],valid:false,providerOff:true}
];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const [index,scenario] of cases.entries()){
  const [type,code,amount,cadence,name,text]=scenario.row;
  const context=await browser.newContext({viewport:{width:index%2?390:1280,height:800},
    serviceWorkers:'block'});
  const page=await context.newPage();
  let gets=0,posts=0;
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url()),path=url.pathname;
   if(path==='/checkout.html'&&request.isNavigationRequest())
    return route.fulfill({status:200,contentType:'text/html',body:
     '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Isolated secure checkout fixture</title></head>'+
     '<body><main><div id="v13-checkout"></div></main></body></html>'});
   if(path==='/api/digital-payment-route-v01432r2'){
    assert.equal(request.method(),'GET');gets++;
    return route.fulfill({contentType:'application/json',body:JSON.stringify({
     ok:true,provider:'STRIPE_MANAGED',enabled:scenario.providerOff!==true})});
   }
   if(path==='/api/stripe-live-checkout'){
    if(request.method()==='POST'){
     posts++;totalPost++;
     return route.fulfill({status:503,contentType:'application/json',
      body:JSON.stringify({ok:false,error:'ISOLATED_TEST_NO_PAYMENT'})});
    }
    assert.equal(request.method(),'GET');
    assert.equal(url.searchParams.get('type'),type);
    assert.equal(url.searchParams.get('code'),code);
    gets++;totalGet++;
    const raw={type,code,name,unitAmountCents:amount,currency:'USD',
     billingInterval:cadence,intervalCount:cadence==='lifetime'?null:1};
    const offer=scenario.mutation?scenario.mutation(raw):raw;
    return route.fulfill({contentType:'application/json',body:JSON.stringify({
     ok:true,liveCheckoutAvailable:scenario.closed!==true,
     livePayments:false,readOnly:true,...(offer?{offer}:{})
    })});
   }
   // No external network may be accessed by this fixture.
   throw Error('Unapproved network '+request.method()+' '+request.url());
  });
  try{
   await page.goto(root+'/checkout.html?type='+type+'&code='+code,{waitUntil:'domcontentloaded'});
   await page.addScriptTag({path:'assets/js/checkout-platform.js'});
   const button=page.locator('#complete-checkout');
   await button.waitFor({state:'visible'});
   await page.waitForFunction(()=>/Continue to secure Stripe checkout|Price or secure checkout unavailable/
    .test(document.querySelector('#complete-checkout')?.textContent||''),undefined,{timeout:9000});
   const visible=await button.isEnabled();
   assert.equal(visible,scenario.valid,'Unexpected ability to initiate checkout on case '+index);
   if(scenario.valid){
    assert((await page.locator('#v135-order-label').innerText()).includes(name));
    assert((await page.locator('#v135-amount').innerText()).includes(text),
     'Member must see independently verified price/period before approving');
    assert((await page.locator('#v135-amount').innerText()).includes('taxes'));
    await button.click();
    assert.match(await page.locator('#checkout-msg').innerText(),/Accept the purchase terms/);
    assert.equal(posts,0,'Terms-unaccepted button must never create a Checkout Session');
   }else{
    assert.equal(await page.locator('#v135-amount').innerText(),'',
     'Invalid quote must never display an unverified amount');
    assert.match(await page.locator('#checkout-msg').innerText(),/could not be confirmed/);
    assert.equal(posts,0,'Invalid quote must never create a Checkout Session');
   }
   assert.equal(gets,scenario.providerOff?1:2,'Only noncharging GET requests are permitted');
   console.log('PASS v137 no-charge quote '+index+' '+type+':'+code);
  }finally{await context.close()}
 }
 assert.equal(totalPost,0,'Not even a simulated customer POST should be initiated');
 console.log('PASS v137: '+cases.length+' LIVE product quote/negative cases, accurate USD/cadence, consent, no provider POST');
}finally{await browser.close()}
