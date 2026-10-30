import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='https://studio-v6-workspace.test';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const t0=Date.parse('2024-05-07T13:30:00Z'),t1=t0+60000;
const savedDrawing={name:'segment',points:[{timestamp:t0,value:185},{timestamp:t1,value:186}]};
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 let saved={version:2,selected:'PROFESSIONAL',layout:'SIDE_BY_SIDE',
  sync:true,studies:['EMA'],drawings:[savedDrawing],drawingContext:'tiingo_byo|AAPL'};
 let revision='2026-10-30T06:00:00Z',gets=0,puts=0;
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url()),r=route.request();
  if(u.origin!==origin)return route.abort();
  if(u.pathname==='/workspace')
   return route.fulfill({contentType:'text/html',body:'<!doctype html><body><div id="cl-chart-tier-switcher"></div></body>'});
  if(u.pathname==='/api/chart-workspace'){
   assert.equal(r.headers().authorization,'Bearer member_fixture');
   if(r.method()==='GET'){gets++;return route.fulfill({json:{ok:true,
    workspace:saved,updatedAt:revision,tier:'PROFESSIONAL'}})}
   assert.equal(r.method(),'PUT');
   const v=r.postDataJSON();assert.equal(v.expectedUpdatedAt,revision);
   puts++;revision='2026-10-30T06:00:'+String(puts).padStart(2,'0')+'Z';
   saved={version:2,selected:v.selected,layout:v.layout,drawings:v.drawings,
    drawingContext:v.drawingContext,studies:v.studies,sync:v.sync};
   return route.fulfill({json:{ok:true,workspace:saved,updatedAt:revision}});
  }
  return route.abort();
 });
 await page.goto(origin+'/workspace');
 await page.evaluate(({id,t0,t1,saved})=>{
  window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{user:{id},access_token:'member_fixture'}}})}});
  window.__status={verified:true,selected:'PROFESSIONAL',
   source:'tiingo_byo',symbol:'AAPL',allowed:['STANDARD','ADVANCED','PROFESSIONAL']};
  window.__data=[{timestamp:t0},{timestamp:t1}];
  window.__makeChart=(name,existing=[])=>{
   const events={},actions=[],created=[];
   const chart={
    subscribeAction:(type,callback)=>{events[type]=callback},
    getDataList:()=>window.__data,
    getVisibleRange:()=>({realTo:2}),
    getBarSpace:()=>6,
    setBarSpace:space=>actions.push({type:'barSpace',space}),
    scrollToTimestamp:stamp=>actions.push({type:'scroll',stamp}),
    convertFromPixel:()=>({timestamp:t1}),
    convertToPixel:({timestamp})=>timestamp===t1?{x:77}:null,
    executeAction:(type,opts)=>actions.push({type,opts}),
    getOverlays:()=>[...existing],
    createOverlay:drawing=>{created.push(drawing);return 'restored_'+created.length},
    getIndicators:()=>[]
   };
   return {name,chart,events,actions,created,id:name};
  };
  window.__charts=[window.__makeChart('left',[saved]),window.__makeChart('right',[saved])];
  window.CrownlightChartTiers={
   getStatus:()=>window.__status,getInstances:()=>window.__charts,
   getRevealedBars:()=>window.__data,choose:async(t)=>{window.__status.selected=t},
   addStudy:()=>true,balancePanels:()=>{}
  };
 },{id:uid,t0,t1,saved:savedDrawing});
 await page.addScriptTag({path:'assets/js/crownlight-workspace-v2.js'});
 await page.evaluate(()=>dispatchEvent(new CustomEvent('crownlight:tier-permission')));
 await page.waitForFunction(()=>window.CrownlightWorkspaceV2?.getStatus()?.memberVerified);
 await page.evaluate(()=>dispatchEvent(new CustomEvent('crownlight:tier-mounted',{detail:{tier:'PROFESSIONAL'}})));
 await page.waitForFunction(()=>window.__charts.every(c=>c.created.length===1));
 assert.equal(await page.evaluate(()=>window.__charts[0].created.length),1);
 assert.equal(await page.evaluate(()=>window.__charts[1].created.length),1);
 await page.evaluate(()=>dispatchEvent(new CustomEvent('crownlight:revealed-bars')));
 assert.equal(await page.evaluate(()=>window.__charts[0].created.length),1,
  'Repeated bar updates must not duplicate restored drawings');
 assert.deepEqual(await page.evaluate(()=>Object.keys(window.__charts[0].events).sort()),
 ['onCrosshairChange','onScroll','onVisibleRangeChange','onZoom'].sort());
 await page.evaluate(()=>window.__charts[0].events.onCrosshairChange({x:52}));
 assert.equal(await page.evaluate(()=>window.__charts[1].actions.at(-1).opts.x),77);
 await page.evaluate(()=>window.__charts[0].events.onZoom({}));
 const actions=await page.evaluate(()=>window.__charts[1].actions);
 assert(actions.some(x=>x.type==='barSpace'&&x.space===6));
 assert(actions.some(x=>x.type==='scroll'&&x.stamp===t1));
 await page.locator('[data-cl-sync]').uncheck();
 const n=await page.evaluate(()=>window.__charts[1].actions.length);
 await page.evaluate(()=>window.__charts[0].events.onScroll({}));
 assert.equal(await page.evaluate(()=>window.__charts[1].actions.length),n,
  'Disabling sync must stop mirroring actions immediately');
 await page.locator('[data-cl-sync]').check();
 await page.locator('[data-cl-layout]').selectOption('STACKED');
 await page.locator('[data-cl-studies]').fill('EMA, RSI, RSI');
 await page.locator('[data-cl-save]').click();
 await page.waitForFunction(()=>document.querySelector('.cl-workspace-status')?.textContent.includes('revision protection'));
 assert.equal(puts,1);
 assert.equal(saved.layout,'STACKED');
 assert.deepEqual(saved.studies,['EMA','RSI']);
 assert.equal(saved.drawings.length,1,'Mirrored drawings must be deduplicated');
 assert.equal(saved.drawingContext,'tiingo_byo|AAPL');
 assert.equal(saved.sync,true);
 assert.match(await page.evaluate(()=>window.CrownlightWorkspaceV2.getStatus().revision),/2026/);
 // Saving Standard after charts have unloaded must preserve previous drawings.
 await page.evaluate(()=>{window.__status.selected='STANDARD';window.__charts=[]});
 await page.locator('[data-cl-save]').click();
 await page.waitForFunction(()=>document.querySelector('.cl-workspace-status')?.textContent.includes('revision protection'));
 assert.equal(saved.drawings.length,1,'Empty chart save must not erase saved drawings');
 assert.equal(saved.drawingContext,'tiingo_byo|AAPL');
 await page.evaluate(({t0,t1})=>{
  window.__status.selected='PROFESSIONAL';window.__status.source='alpaca_byo';window.__status.symbol='MSFT';
  window.__charts=[window.__makeChart('new_left'),window.__makeChart('new_right')];
  dispatchEvent(new CustomEvent('crownlight:tier-mounted',{detail:{tier:'PROFESSIONAL'}}));
 },{t0,t1});
 assert.equal(await page.evaluate(()=>window.__charts[0].created.length),0,
  'Old AAPL Tiingo drawings must never appear on MSFT Alpaca dataset');
 await page.evaluate(()=>dispatchEvent(new CustomEvent('crownlight:member-changed')));
 assert.equal(await page.evaluate(()=>window.CrownlightWorkspaceV2.getStatus().memberVerified),false);
 assert.equal(await page.locator('[data-cl-studies]').inputValue(),'');
 console.log('PASS Studio V6 Chromium workspace: revision-save/restore, synchronized timestamps/zoom/crosshair, mirrored overlay dedup, empty-chart preservation, source-scoped drawings, account scrub');
}finally{await browser?.close()}
