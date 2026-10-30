import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='https://chart-studio-v3-fixture.test';
const response=x=>JSON.stringify(x);
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 // Professional member-owned workspace: rollback-free mocked REST + CAS behavior.
 const page=await browser.newPage();
 let revision='2026-10-29T12:00:00Z',getCount=0,saveCount=0;
 let saved={version:2,selected:'PROFESSIONAL',layout:'SIDE_BY_SIDE',sync:true,studies:['EMA'],drawings:[]};
 await page.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.origin!==origin)return route.abort();
  if(u.pathname==='/workspace')return route.fulfill({contentType:'text/html',
   body:'<!doctype html><html><body><div id="cl-chart-tier-switcher"></div></body></html>'});
  if(u.pathname==='/api/chart-workspace'){
   assert.equal(req.headers().authorization,'Bearer member_fixture');
   if(req.method()==='GET'){getCount++;return route.fulfill({contentType:'application/json',
    body:response({ok:true,tier:'PROFESSIONAL',workspace:saved,updatedAt:revision})})}
   const v=req.postDataJSON();assert.equal(req.method(),'PUT');
   assert.equal(v.expectedUpdatedAt,revision,'Client must preserve last revision from GET or PUT');
   saveCount++;revision='2026-10-29T12:00:0'+saveCount+'Z';
   saved={version:2,selected:v.selected,layout:v.layout,studies:v.studies,drawings:v.drawings,sync:v.sync};
   return route.fulfill({contentType:'application/json',
    body:response({ok:true,workspace:saved,updatedAt:revision})});
  }
  return route.abort();
 });
 await page.goto(origin+'/workspace');
 await page.evaluate(()=>{
  window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{
   user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},access_token:'member_fixture'}}})}});
  window.CrownlightChartTiers={
   getStatus:()=>({verified:true,selected:'PROFESSIONAL',allowed:['STANDARD','ADVANCED','PROFESSIONAL']}),
   getInstances:()=>[],balancePanels(){},choose:async()=>true,getRevealedBars:()=>[]
  };
 });
 await page.addScriptTag({path:'assets/js/crownlight-workspace-v2.js'});
 await page.evaluate(()=>dispatchEvent(new CustomEvent('crownlight:tier-permission')));
 await page.locator('select[data-cl-layout]').waitFor();
 await page.waitForFunction(()=>document.querySelector('[data-cl-studies]')?.value==='EMA');
 await page.locator('select[data-cl-layout]').selectOption('PRICE_FOCUS');
 await page.locator('[data-cl-studies]').fill('EMA, RSI');
 await page.locator('[data-cl-save]').click();
 await page.waitForFunction(()=>document.querySelector('.cl-workspace-status')?.textContent.includes('revision protection'));
 assert.equal(saved.layout,'PRICE_FOCUS');
 assert.deepEqual(saved.studies,['EMA','RSI']);
 assert.equal(saveCount,1);
 // An external tab changes the revision; this tab must fail closed on conflict.
 revision='2026-10-29T12:00:09Z';
 await page.route('**/api/chart-workspace',async route=>{
  const r=route.request();
  if(r.method()==='PUT')return route.fulfill({status:409,contentType:'application/json',
   body:response({ok:false,error:'WORKSPACE_CHANGED'})});
  return route.continue();
 },{times:1});
 await page.locator('[data-cl-save]').click();
 await page.waitForFunction(()=>document.querySelector('.cl-workspace-status')?.textContent.includes('Another tab saved newer'));
 assert.equal(saveCount,1,'Conflict must not execute a second write');
 await page.evaluate(()=>dispatchEvent(new CustomEvent('crownlight:member-changed')));
 assert.equal(await page.locator('[data-cl-studies]').inputValue(),'');
 assert.equal(await page.evaluate(()=>window.CrownlightWorkspaceV2.getStatus().memberVerified),false);
 await page.close();
 // Alpaca PAPER terminal: uncertain HTTP response preserves exact order ID
 // and denies new order submission until account status is refreshed.
 const paper=await browser.newPage(),submitted=[];
 let attempts=0,paperReady=true;
 const paperOrders=[];
 await paper.route('**/*',async route=>{
  const r=route.request(),u=new URL(r.url());
  if(u.origin!==origin)return route.abort();
  if(u.pathname==='/paper')return route.fulfill({contentType:'text/html',
   body:'<!doctype html><html><body><div id="cl-paper-terminal"></div></body></html>'});
  if(u.pathname==='/api/alpaca-paper'){
   assert.equal(r.headers().authorization,'Bearer paper_fixture');
   if(r.method()==='GET')return route.fulfill({contentType:'application/json',body:response({
    ok:true,mode:'ALPACA_PAPER_ONLY',account:{equity:'100000.00',buyingPower:'100000.00',
    cash:'100000.00',status:'ACTIVE',tradingBlocked:false,accountBlocked:false},
    positions:[],orders:paperOrders})});
   attempts++;const data=r.postDataJSON();submitted.push(data);
   assert.equal(data.confirm,'PAPER ONLY');
   if(attempts===1)return route.fulfill({status:503,contentType:'application/json',
    body:response({ok:false,error:'Uncertain provider response. Check account.'})});
   paperOrders.push({symbol:data.symbol,clientOrderId:data.clientOrderId,
     side:data.side,type:data.type,qty:String(data.qty),status:'accepted',filledQty:'0'});
   return route.fulfill({contentType:'application/json',body:response({
    ok:true,mode:'ALPACA_PAPER_ONLY',paperOnly:true,order:paperOrders[0]})});
  }
  return route.abort();
 });
 await paper.goto(origin+'/paper');
 paper.on('dialog',d=>d.accept());
 await paper.evaluate(()=>{
  window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{
   user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},access_token:'paper_fixture'}}})}});
 });
 await paper.addScriptTag({path:'assets/js/crownlight-paper-terminal-v1.js'});
 await paper.evaluate(()=>window.CrownlightPaperTerminal.initialize({
  getSession:async()=>({user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},access_token:'paper_fixture'})
 }));
 await paper.evaluate(()=>window.CrownlightPaperTerminal.refresh());
 await paper.getByText('Connected · Alpaca Paper Trading only').waitFor();
 await paper.locator('#cl-paper-qty').fill('2');
 await paper.locator('#cl-paper-submit').click();
 await paper.waitForFunction(()=>document.querySelector('#cl-paper-status')?.textContent.includes('same request ID will be reused'));
 assert.equal(await paper.locator('#cl-paper-submit').isDisabled(),true);
 await paper.locator('#cl-paper-refresh').click();
 await paper.waitForFunction(()=>document.querySelector('#cl-paper-status')?.textContent.includes('original order ID'));
 await paper.locator('#cl-paper-submit').click();
 await paper.waitForFunction(()=>document.querySelector('#cl-paper-orders')?.textContent.includes('accepted'));
 assert.equal(attempts,2);
 assert.equal(submitted[0].clientOrderId,submitted[1].clientOrderId);
 assert.equal(paperOrders.length,1);
 await paper.evaluate(()=>dispatchEvent(new CustomEvent('crownlight:member-changed')));
 assert.equal(await paper.locator('#cl-paper-submit').isDisabled(),true);
 assert.equal((await paper.locator('#cl-paper-positions').innerText()).trim(),'');
 await paper.close();
 console.log('PASS Chart Studio V3 Chromium: member workspace private revision save, conflict denial, sign-out scrub, paper-only uncertainty/ID reuse and no duplicate order');
}finally{await browser?.close()}
