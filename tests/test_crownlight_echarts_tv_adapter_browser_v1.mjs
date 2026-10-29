/* Actual Apache ECharts and staged TradingView datafeed browser acceptance.
 * Fixture uses exactly the pinned public Apache ECharts package, not a chart mock.
 * Production billing, users, network data providers and live payments untouched.
 */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {chromium} from 'playwright';
const echartsDist='node_modules/echarts/dist/echarts.min.js';
assert(existsSync(echartsDist),'Apache ECharts 6.1.0 must be installed from pinned npm');
const origin='https://charts-analytics-fixture.test';
const source=p=>readFileSync(p,'utf8');
const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];
try{
 const p=await b.newPage({viewport:{width:1200,height:900}});
 p.on('pageerror',err=>errors.push(err.message));
 await p.route('**/assets/vendor/echarts/6.1.0/echarts.min.js',
  r=>r.fulfill({status:200,contentType:'application/javascript',body:readFileSync(echartsDist)}));
 await p.setContent('<html><head><base href="https://charts-analytics-fixture.test/"></head><body><section id="crownlight-replay-echarts">'+
  '<button data-ce-open>Open replay analytics</button><span data-ce-count></span><p data-ce-status></p>'+
  '<div data-ce-chart hidden style="width:1000px;height:400px"></div></section></body></html>');
 await p.addScriptTag({content:source('assets/js/crownlight-echarts-loader-v1.js')});
 await p.addScriptTag({content:source('assets/js/crownlight-echarts-replay-v1.js')});
 const bars=[
  {timestamp:1792935000000,open:15,high:16,low:14,close:15.5,volume:1400},
  {timestamp:1792935060000,open:15.5,high:16.5,low:15.1,close:16,volume:1200},
  {timestamp:1792935120000,open:16,high:16.8,low:15.7,close:16.4,volume:2150}
 ];
 await p.evaluate(v=>window.dispatchEvent(new CustomEvent('crownlight:revealed-bars',{detail:{bars:v,symbol:'REPLAY-EDU'}})),bars);
 assert.equal(await p.evaluate(()=>window.CrownlightReplayAnalytics.getStatus().barCount),3);
 await p.locator('[data-ce-open]').click();
 await p.waitForFunction(()=>window.echarts?.getInstanceByDom(document.querySelector('[data-ce-chart]'))?.getOption()?.series?.length===2);
 const first=await p.evaluate(()=>{
  const chart=window.echarts.getInstanceByDom(document.querySelector('[data-ce-chart]'));
  const opt=chart.getOption();return {series:opt.series.map(x=>x.data),width:chart.getWidth(),zoom:opt.dataZoom.length};
 });
 assert.deepEqual(first.series,[[15.5,16,16.4],[1400,1200,2150]]);
 assert(first.width>600);assert.equal(first.zoom,2);
 const smaller=bars.slice(0,2);
 await p.evaluate(v=>window.dispatchEvent(new CustomEvent('crownlight:revealed-bars',{detail:{bars:v,symbol:'REPLAY-EDU'}})),smaller);
 const revised=await p.evaluate(()=>{
  const chart=window.echarts.getInstanceByDom(document.querySelector('[data-ce-chart]'));
  return chart.getOption().series.map(x=>x.data);
 });
 assert.deepEqual(revised,[[15.5,16],[1400,1200]],'Revealed-bar shrink removes previously visible future');
 await p.locator('[data-ce-open]').click();
 assert.equal(await p.locator('[data-ce-chart]').isHidden(),true);
 assert.equal(await p.evaluate(()=>window.CrownlightReplayAnalytics.getStatus().open),false);
 console.log('PASS actual Apache ECharts: 2-series canvas replay, current revealed bars, shrink, zoom and disposal');
 await p.close();

 const admin=await b.newPage({viewport:{width:1220,height:950}});
 admin.on('pageerror',err=>errors.push(err.message));
 await admin.route('**/assets/vendor/echarts/6.1.0/echarts.min.js',
  r=>r.fulfill({status:200,contentType:'application/javascript',body:readFileSync(echartsDist)}));
 await admin.setContent('<html><body><section class="admin-panel active"><div id="crownlight-admin-echarts">'+
  '<select data-admin-echarts-view><option value="bar">Bars</option><option value="pie">Pie</option></select>'+
  '<div data-admin-echarts-chart hidden style="width:1100px;height:350px"></div><p data-admin-echarts-status></p>'+
  '</div></section></body></html>');
 await admin.addScriptTag({content:source('assets/js/crownlight-echarts-loader-v1.js')});
 await admin.addScriptTag({content:source('assets/js/crownlight-echarts-admin-v1.js')});
 await admin.evaluate(()=>window.dispatchEvent(new CustomEvent('groundup:admin-summary',{detail:{
  users:14,library:38,orders:0,subscriptions:0,catalogProducts:7,publishedContent:10,activeEntitlements:5,
  showcase:false
 }})));
 await admin.waitForFunction(()=>window.echarts?.getInstanceByDom(document.querySelector('[data-admin-echarts-chart]'))?.getOption()?.series?.length===1);
 const data=await admin.evaluate(()=>{
  const c=window.echarts.getInstanceByDom(document.querySelector('[data-admin-echarts-chart]'));
  return c.getOption().series[0].data;
 });
 assert.deepEqual(data,[14,5,38,0,0,7,10],'Admin graph uses actual supplied snapshot counts');
 await admin.locator('[data-admin-echarts-view]').selectOption('pie');
 const pie=await admin.evaluate(()=>window.echarts.getInstanceByDom(
  document.querySelector('[data-admin-echarts-chart]')).getOption().series[0]);
 assert.equal(pie.type,'pie');assert.equal(pie.data.length,7);
 assert.match(await admin.locator('[data-admin-echarts-status]').innerText(),/not a time series/);
 console.log('PASS actual Apache ECharts: verified Admin metrics, Bar/Pie, no invented historical data');
 await admin.close();

 const tv=await b.newPage();
 await tv.setContent('<html><body></body></html>');
 await tv.addScriptTag({content:source('assets/js/crownlight-tradingview-datafeed-adapter-v1.js')});
 const verification=await tv.evaluate(async()=>{
  const feed=window.CrownlightTradingViewAdapter.createDatafeed();
  const init=await new Promise(resolve=>feed.onReady(resolve));
  feed.updateRevealed({symbol:'REPLAY',bars:[
   {timestamp:1000000,open:10,high:12,low:9,close:11,volume:150},
   {timestamp:1060000,open:11,high:13,low:10,close:12,volume:180}
  ]});
  const symbol=await new Promise((resolve,reject)=>feed.resolveSymbol('REPLAY',resolve,reject));
  const available=await new Promise((resolve,reject)=>feed.getBars(symbol,'1',{
   from:1000,to:1120,firstDataRequest:true},(data,meta)=>resolve({data,meta}),reject));
  const later=await new Promise((resolve,reject)=>feed.getBars(symbol,'1',{
   from:1000,to:1060},(data,meta)=>resolve({data,meta}),reject));
  const published=[];feed.subscribeBars(symbol,'1',x=>published.push(x),'listener-a');
  feed.updateRevealed({symbol:'REPLAY',bars:[
   {timestamp:1000000,open:10,high:12,low:9,close:11,volume:150},
   {timestamp:1060000,open:11,high:13,low:10,close:12,volume:180},
   {timestamp:1120000,open:12,high:14,low:11,close:13,volume:220}
  ]});
  await new Promise(r=>setTimeout(r,20));
  feed.unsubscribeBars('listener-a');
  feed.reset();
  return {init,symbol,available,later,published,status:feed.getSnapshot(),licensed:window.CrownlightTradingViewAdapter.getStatus()};
 });
 assert.deepEqual(verification.init.supported_resolutions,['1']);
 assert.equal(verification.symbol.ticker,'REPLAY');
 assert.equal(verification.available.data.length,2);
 assert.equal(verification.later.data.length,1,'to timestamp exclusive, no future bar');
 assert.equal(verification.published.length,1);
 assert.equal(verification.published[0].close,13);
 assert.equal(verification.status.barCount,0);
 assert.equal(verification.licensed.licensed,false,'Never claim proprietary license');
 assert.equal(verification.licensed.libraryInstalled,false,'No library code was shipped');
 console.log('PASS staged TradingView Datafeed API: symbol, history boundaries, updates, unsubscribe and reset');
 await tv.close();
 assert.deepEqual(errors,[],'No uncaught browser errors');
}finally{await b.close()}
