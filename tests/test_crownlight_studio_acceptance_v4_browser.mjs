import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='https://studio-v4-fixture.test';
const member='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 const requested=[],respond=(obj)=>JSON.stringify(obj);
 const sample=[
  {timestamp:'2024-05-07T13:30:00Z',open:10,high:11,low:9.7,close:10.5,volume:1200},
  {timestamp:'2024-05-07T13:31:00Z',open:10.5,high:10.8,low:10.2,close:10.6,volume:1800}
 ];
 await page.route('**/*',async route=>{
  const request=route.request(),u=new URL(request.url());
  if(u.origin!==origin)return route.abort();
  if(u.pathname==='/simulator'){
   return route.fulfill({contentType:'text/html',body:
    '<!doctype html><html><body><div id="sim-gate"></div><div id="sim-content"></div></body></html>'});
  }
  assert.equal(request.method(),'GET','Readiness and historical sample should never mutate settings');
  assert.equal(request.headers().authorization,'Bearer member_fixture');
  requested.push(u.pathname+u.search);
  if(u.pathname==='/api/chart-tier-access')
   return route.fulfill({contentType:'application/json',body:respond({ok:true,eligible:true,tier:'PROFESSIONAL',
    reason:'Active professional membership',allowed:['STANDARD','ADVANCED','PROFESSIONAL']})});
  if(u.pathname==='/api/chart-workspace')
   return route.fulfill({contentType:'application/json',body:respond({ok:true,tier:'PROFESSIONAL',
    workspace:{version:2,selected:'PROFESSIONAL',layout:'SIDE_BY_SIDE',sync:true,studies:[],drawings:[]},
    updatedAt:'2026-10-29T11:00:00Z'})});
  if(u.pathname==='/api/member-sparks-chart')
   return route.fulfill({contentType:'application/json',body:respond({ok:true,offers:[
     {sku:'CHART_PROFESSIONAL_DAY',tier:'PROFESSIONAL',costSparks:15}
    ],passes:[{tier:'ADVANCED',expires_at:'2099-01-01T00:00:00Z'}]})});
  if(u.pathname==='/api/marketdata'&&u.searchParams.get('action')==='list')
   return route.fulfill({contentType:'application/json',body:respond({ok:true,connections:[
    {provider_code:'TIINGO_BYO',status:'connected',last_tested_at:'2026-10-29T09:00:00Z'}]})});
  if(u.pathname==='/api/marketdata'&&u.searchParams.get('action')==='bars'){
   assert.equal(u.searchParams.get('provider'),'TIINGO_BYO');
   assert.equal(u.searchParams.get('ticker'),'AAPL');
   assert.equal(u.searchParams.get('start'),'2024-05-07');
   assert.equal(u.searchParams.get('end'),'2024-05-07');
   return route.fulfill({contentType:'application/json',body:respond({ok:true,ticker:'AAPL',
    provider:'TIINGO_BYO',bars:sample,integrity:{
     feed:'TIINGO_PERSONAL_ACCOUNT',strictlyChronological:true,
     feedCompletenessVerified:false,licensedForMemberWidePublication:false,
     approvedForOfficialReplay:false,observations:2,firstTimestamp:sample[0].timestamp,
     lastTimestamp:sample[1].timestamp
    },sourceNote:'Private test sample'})});
  }
  return route.abort();
 });
 await page.goto(origin+'/simulator');
 await page.evaluate(id=>{
  window.getSupabaseClient=async()=>({auth:{
   getSession:async()=>({data:{session:{user:{id},access_token:'member_fixture'}}}),
   onAuthStateChange:fn=>{window.__studioAuthChange=fn;return {data:{subscription:{unsubscribe(){}}}}}
  }});
 },member);
 await page.addScriptTag({path:'assets/js/crownlight-data-source-integrity-v3.js'});
 await page.addScriptTag({path:'assets/js/crownlight-studio-acceptance-v4.js'});
 const panel=page.locator('#cl-studio-acceptance-v4');
 await panel.getByRole('button',{name:'Check Studio Setup'}).click();
 await panel.getByText(/4 of 4 independent read-only checks/).waitFor();
 const display=await panel.locator('#cl-studio-check-results-v4').innerText();
 assert.match(display,/PROFESSIONAL/);
 assert.match(display,/SIDE_BY_SIDE/);
 assert.match(display,/1 active/);
 assert.match(display,/Tiingo/);
 assert.equal(requested.filter(x=>x.includes('action=bars')).length,0,
  'Basic readiness must never call personal paid or metered market data');
 await panel.getByRole('button',{name:'Verify historical sample — no import'}).click();
 await panel.getByText(/Historical response validated: 2 chronological bars/).waitFor();
 assert.equal(requested.filter(x=>x.includes('action=bars')).length,1);
 assert.equal(await page.locator('#sim-content').innerHTML(),'',
  'Validation must never inject ungraded personal bars into existing Simulator');
 const bridge=panel.locator('#cl-studio-import-v5');
 assert.equal(await bridge.isVisible(),true,'Explicit import offered only after successful preview');
 await page.evaluate(()=>{
  window.GroundUpSimulatorMemberReadyV1=true;
  window.GroundUpSimulatorImportVerifiedProviderV1=async sample=>{
   window.__handoffVerifiedSample=sample;
   return {ok:true,bars:sample.payload.bars.length,revealed:2};
  };
 });
 await bridge.click();
 await panel.getByText(/Loaded 2 personal historical bars into ungraded Chart Studio/).waitFor();
 assert.equal(await page.evaluate(()=>window.__handoffVerifiedSample.provider),'TIINGO_BYO');
 assert.equal(await page.evaluate(()=>window.__handoffVerifiedSample.ownerId),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 assert.equal(requested.filter(x=>x.includes('action=bars')).length,1,
   'Explicit handoff reuses the original private response, never re-requests Tiingo');
 assert.equal(await page.locator('#sim-content').innerHTML(),'',
   'The verification panel must delegate any actual chart mutation to the guarded Simulator');
 await page.evaluate(()=>window.__studioAuthChange('SIGNED_OUT',null));
 assert.equal(await panel.isHidden(),true);
 assert.equal(await panel.innerText(),'','Sign-out must remove all private source and membership details');
 const page2=await browser.newPage();
 let secondCalls=0;
 await page2.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.pathname==='/simulator')return route.fulfill({body:'<html><body><div id="sim-content"></div></body></html>',
   contentType:'text/html'});
  secondCalls++;
  return route.fulfill({status:403,contentType:'application/json',
   body:respond({ok:false,error:'Not authorized'})});
 });
 await page2.goto(origin+'/simulator');
 await page2.evaluate(id=>window.getSupabaseClient=async()=>({auth:{
  getSession:async()=>({data:{session:{user:{id},access_token:'member_fixture'}}})
 }}),member);
 await page2.addScriptTag({path:'assets/js/crownlight-studio-acceptance-v4.js'});
 await page2.locator('#cl-studio-acceptance-v4 #cl-studio-sample-v4').click();
 await page2.getByText(/Run Check Studio Setup and verify this personal provider connection first/).waitFor();
 assert.equal(secondCalls,0,'Unverified provider must not be contacted');
 await page2.close();
 console.log('PASS Studio V4 Chromium: tier, persistence, Sparks, read-only account/connection scan, explicit BYO sample, protected chart, sign-out scrub, unverified denial');
}finally{await browser?.close()}
