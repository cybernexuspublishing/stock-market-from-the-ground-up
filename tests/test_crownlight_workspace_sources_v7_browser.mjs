import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='https://studio-v7-fixture.test',uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const t=Date.parse('2024-05-07T13:30:00Z');
const first={name:'horizontalStraightLine',points:[{timestamp:t,value:185}]};
const second={name:'horizontalStraightLine',points:[{timestamp:t,value:420}]};
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 let revision='2026-10-30T07:00:00Z',puts=0,gets=0;
 let saved={version:2,selected:'PROFESSIONAL',sync:true,layout:'SIDE_BY_SIDE',
  studies:[],drawings:[],drawingContext:null,drawingSets:[]};
 await page.route('**/*',async route=>{
  const r=route.request(),u=new URL(r.url());
  if(u.origin!==origin)return route.abort();
  if(u.pathname==='/workspace')return route.fulfill({
   contentType:'text/html',body:'<!doctype html><body><div id="cl-chart-tier-switcher"></div></body>'});
  if(u.pathname!=='/api/chart-workspace')return route.abort();
  assert.equal(r.headers().authorization,'Bearer fixture');
  if(r.method()==='GET'){gets++;return route.fulfill({
   json:{ok:true,workspace:saved,updatedAt:revision,tier:'PROFESSIONAL'}})}
  assert.equal(r.method(),'PUT');
  const body=r.postDataJSON();
  assert.equal(body.expectedUpdatedAt,revision,'Member CAS must use latest private revision');
  assert(!('credentials' in body),'Provider credentials must never be included');
  puts++;
  revision='2026-10-30T07:00:'+String(puts).padStart(2,'0')+'Z';
  saved=body;
  return route.fulfill({json:{ok:true,workspace:saved,updatedAt:revision}});
 });
 await page.goto(origin+'/workspace');
 await page.evaluate(({uid,t})=>{
  window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{
   session:{user:{id:uid},access_token:'fixture'}}})}});
  window.__stage={verified:true,selected:'PROFESSIONAL',
   allowed:['STANDARD','ADVANCED','PROFESSIONAL'],symbol:'AAPL',source:'tiingo_byo'};
  window.__bars=[{timestamp:t},{timestamp:t+60000}];
  window.__create=(list=[])=>{
   const overlays=list.map((x,i)=>({...x,id:'manual_'+i})),created=[];
   const chart={
    getOverlays:()=>[...overlays],
    createOverlay:item=>{
     const v={...item,id:'restored_'+(created.length+1)};
     created.push(v);overlays.push(v);return v.id
    },
    removeOverlay:({id})=>{
     const i=overlays.findIndex(o=>o.id===id);
     if(i<0)return false;overlays.splice(i,1);return true
    },
    subscribeAction:()=>{},
    getIndicators:()=>[]
   };
   return {chart,created};
  };
  window.__charts=[window.__create([{name:'horizontalStraightLine',
   points:[{timestamp:t,value:185}]}]),window.__create([{name:'horizontalStraightLine',
   points:[{timestamp:t,value:185}]}])];
  window.CrownlightChartTiers={
   getStatus:()=>window.__stage,
   getInstances:()=>window.__charts,
   getRevealedBars:()=>window.__bars,
   addStudy:()=>true,
   choose:async name=>{window.__stage.selected=name},
   balancePanels:()=>{}
  };
 },{uid,t});
 await page.addScriptTag({path:'assets/js/crownlight-workspace-v2.js'});
 await page.evaluate(()=>dispatchEvent(new CustomEvent('crownlight:tier-permission')));
 await page.waitForFunction(()=>window.CrownlightWorkspaceV2?.getStatus()?.memberVerified);
 await page.locator('[data-cl-save]').click();
 await page.waitForFunction(()=>window.CrownlightWorkspaceV2?.getStatus()?.savedDatasets===1);
 assert.deepEqual(saved.drawingSets.map(x=>x.context),['tiingo_byo|AAPL']);
 assert.equal(saved.drawingSets[0].drawings.length,1,
  'Identical left/right Professional lines are one saved drawing');
 await page.evaluate(({t})=>{
  window.__stage.source='alpaca_byo';window.__stage.symbol='MSFT';
  window.__charts=[window.__create([{name:'horizontalStraightLine',
   points:[{timestamp:t,value:420}]}]),window.__create()];
 },{t});
 await page.locator('[data-cl-save]').click();
 await page.waitForFunction(()=>window.CrownlightWorkspaceV2?.getStatus()?.savedDatasets===2);
 assert.deepEqual(saved.drawingSets.map(x=>x.context),
  ['tiingo_byo|AAPL','alpaca_byo|MSFT']);
 assert.equal(saved.drawingSets[1].drawings[0].points[0].value,420);
 await page.evaluate(()=>{
  window.__stage.source='tiingo_byo';window.__stage.symbol='AAPL';
  window.__charts=[window.__create(),window.__create()];
  dispatchEvent(new CustomEvent('crownlight:tier-mounted',{detail:{tier:'PROFESSIONAL'}}));
 });
 assert.equal(await page.evaluate(()=>window.__charts[0].created.length),1);
 assert.equal(await page.evaluate(()=>window.__charts[1].created.length),1);
 assert.equal(await page.evaluate(()=>window.__charts[0].created[0].points[0].value),185);
 await page.evaluate(()=>dispatchEvent(new CustomEvent('crownlight:revealed-bars')));
 assert.equal(await page.evaluate(()=>window.__charts[0].created.length),1,
  'Repeated bar refresh must not duplicate saved drawings');
 await page.evaluate(()=>{
  window.__stage.source='alpaca_byo';window.__stage.symbol='MSFT';
  // Reuse the SAME mounted KLineChart. The previous AAPL drawings must
  // be removed before the MSFT annotations are restored.
  dispatchEvent(new CustomEvent('crownlight:revealed-bars'));
 });
 assert.deepEqual(await page.evaluate(()=>window.__charts[0].chart.getOverlays()
  .map(o=>o.points[0].value)),[420],
  'A reused chart must not display stale AAPL levels over MSFT bars');
 await page.evaluate(()=>{
  window.__stage.source='tiingo_byo';window.__stage.symbol='AAPL';
  dispatchEvent(new CustomEvent('crownlight:revealed-bars'));
 });
 assert.deepEqual(await page.evaluate(()=>window.__charts[0].chart.getOverlays()
  .map(o=>o.points[0].value)),[185],
  'Returning to AAPL must remove MSFT levels before restoring AAPL');
 await page.evaluate(()=>dispatchEvent(new CustomEvent('crownlight:member-changed')));
 assert.equal(await page.evaluate(()=>window.CrownlightWorkspaceV2.getStatus().savedDatasets),0);
 assert.equal(await page.evaluate(()=>window.CrownlightWorkspaceV2.getStatus().memberVerified),false);
 assert.equal(await page.locator('[data-cl-studies]').inputValue(),'');
 console.log('PASS Chart Studio V7 browser: two independent symbol/provider collections, verified CAS save, mirrored dedup, source-bound restore and sign-out scrub');
}finally{await browser?.close()}
