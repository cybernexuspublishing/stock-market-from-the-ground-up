import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
const engine='node_modules/klinecharts/dist/umd/klinecharts.min.js';
assert(existsSync(engine),'Pinned KLineChart 10.1.0 must be installed in the acceptance runner');
const origin='https://studio-kline-real-v7.test',uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const t=Date.parse('2024-05-07T13:30:00Z');
const bars=Array.from({length:75},(_,i)=>({timestamp:t+i*60000,open:100+i*.1,
 high:100.5+i*.1,low:99.5+i*.1,close:100.2+i*.1,volume:1000+i*10}));
const level={name:'segment',points:[{timestamp:bars[50].timestamp,value:106},
 {timestamp:bars[60].timestamp,value:107}]};
const saved={version:2,selected:'PROFESSIONAL',sync:true,layout:'SIDE_BY_SIDE',
 studies:['EMA'],drawingContext:'tiingo_byo|AAPL',drawings:[level],
 drawingSets:[{context:'tiingo_byo|AAPL',drawings:[level]}]};
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1400,height:900}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url);
  if(u.origin!==origin)return route.abort();
  if(u.pathname==='/charts')return route.fulfill({contentType:'text/html',body:
   '<!doctype html><html><body><div id="cl-chart-tier-switcher"></div>'+
   '<div id="left" style="display:inline-block;width:570px;height:380px"></div>'+
   '<div id="right" style="display:inline-block;width:570px;height:380px"></div></body></html>'});
  if(u.pathname==='/api/chart-workspace'){
   assert.equal(route.request().headers().authorization,'Bearer member_fixture');
   return route.fulfill({json:{ok:true,workspace:saved,tier:'PROFESSIONAL',
    updatedAt:'2026-10-30T08:00:00Z'}})
  }
  return route.abort();
 });
 await page.goto(origin+'/charts');
 await page.addScriptTag({path:engine});
 const api=await page.evaluate(({uid,t,bars})=>{
  if(!window.klinecharts?.init)throw Error('Pinned KLineCharts unavailable');
  window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{
   session:{user:{id:uid},access_token:'member_fixture'}}})}});
  window.__status={verified:true,selected:'PROFESSIONAL',symbol:'AAPL',
   source:'tiingo_byo',allowed:['STANDARD','ADVANCED','PROFESSIONAL']};
  window.__bars=bars;
  window.__charts=['left','right'].map(id=>{
   const chart=window.klinecharts.init(id,{styles:'dark'});
   if(!chart)throw Error('Real KLineChart init failed for '+id);
   chart.setSymbol({ticker:'AAPL',pricePrecision:2,volumePrecision:0});
   chart.setPeriod({span:1,type:'minute'});
   chart.setDataLoader({getBars:({callback})=>callback(bars,{forward:false,backward:false})});
   return {id,chart};
  });
  window.CrownlightChartTiers={
   getStatus:()=>window.__status,getInstances:()=>window.__charts,
   getRevealedBars:()=>window.__bars,
   addStudy:()=>true,balancePanels:()=>{},
   choose:async(tier)=>{window.__status.selected=tier}
  };
  return {version:window.klinecharts.version||'10.x',count:window.__charts.length};
 },{uid,t,bars});
 assert.equal(api.count,2);
 await page.waitForFunction(()=>window.__charts.every(c=>c.chart.getDataList().length===75));
 await page.addScriptTag({path:'assets/js/crownlight-workspace-v2.js'});
 await page.evaluate(()=>dispatchEvent(new CustomEvent('crownlight:tier-permission')));
 await page.waitForFunction(()=>window.CrownlightWorkspaceV2?.getStatus().memberVerified);
 await page.evaluate(()=>dispatchEvent(new CustomEvent('crownlight:tier-mounted',{detail:{tier:'PROFESSIONAL'}})));
 await page.waitForFunction(()=>window.__charts.every(c=>c.chart.getOverlays().length===1));
 assert.deepEqual(await page.evaluate(()=>window.__charts.map(c=>c.chart.getOverlays()[0].name)),
  ['segment','segment']);
 await page.evaluate(()=>{
  window.__status.source='alpaca_byo';window.__status.symbol='MSFT';
  dispatchEvent(new CustomEvent('crownlight:revealed-bars'));
 });
 assert.deepEqual(await page.evaluate(()=>window.__charts.map(c=>c.chart.getOverlays().length)),
  [0,0],'Actual KLineChart must remove stale AAPL overlays when changing to MSFT');
 await page.evaluate(()=>{
  window.__status.source='tiingo_byo';window.__status.symbol='AAPL';
  dispatchEvent(new CustomEvent('crownlight:revealed-bars'));
 });
 assert.deepEqual(await page.evaluate(()=>window.__charts.map(c=>c.chart.getOverlays().length)),
  [1,1],'Actual KLineChart must restore only the matching AAPL saved drawings');
 assert.deepEqual(errors,[],'No real KLineChart browser errors: '+errors.join('; '));
 console.log('PASS real KLineChart 10.1.0 Chromium: 75 revealed bars, two rendered Professional canvases, saved drawings, source-switch removal and restoration');
}finally{await browser?.close()}
