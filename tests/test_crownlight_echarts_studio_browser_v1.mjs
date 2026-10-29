/* Actual Chromium integration: Owner menu selection, real Apache ECharts,
 * Standard entitlements, only revealed OHLCV and session clearing.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const src=p=>readFileSync(p,'utf8');
const echarts=src('node_modules/echarts/dist/echarts.min.js');
const origin='https://crownlight-echarts-studio.test';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const two=[
 {timestamp:1792935000000,open:10,high:11,low:9,close:10.5,volume:1200},
 {timestamp:1792935060000,open:10.5,high:12,low:10,close:11,volume:1500}
];
try{
 for(const [visible,available] of [
  [['STANDARD','ADVANCED','PROFESSIONAL','ECHARTS'],true],
  [['STANDARD','ADVANCED','PROFESSIONAL'],false]
 ]){
  const p=await browser.newPage({viewport:{width:1280,height:820}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.pathname==='/assets/vendor/echarts/6.1.0/echarts.min.js')
    return route.fulfill({status:200,contentType:'application/javascript',body:echarts});
   if(u.pathname==='/api/chart-studio-menu')
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,visible})});
   if(u.pathname==='/api/chart-tier-access')
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,eligible:true,allowed:['STANDARD'],tier:'STANDARD'})});
   if(u.pathname==='/')return route.fulfill({status:200,contentType:'text/html',body:'<html><body></body></html>'});
   return route.abort();
  });
  await p.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await p.setContent('<html><body><section class="sim-chart-panel"><div class="crownlight-shell">Standard chart</div></section></body></html>');
  await p.evaluate(()=>{
   window.getSupabaseClient=async()=>({auth:{
    getSession:async()=>({data:{session:{access_token:'fixture',user:{id:'11111111-1111-4111-8111-111111111111'}}}}),
    onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
   }});
  });
  for(const file of ['assets/js/crownlight-echarts-loader-v1.js','assets/js/crownlight-echarts-studio-v1.js','assets/js/crownlight-chart-tiers-v1.js'])
   await p.addScriptTag({content:src(file)});
  await p.waitForFunction(()=>window.CrownlightChartTiers?.getStatus()?.verified===true);
  const options=await p.locator('.cl-chart-tier-bar select option').evaluateAll(a=>a.map(x=>({id:x.value,disabled:x.disabled})));
  assert.equal(options.some(x=>x.id==='ECHARTS'),available);
  assert.equal(options.some(x=>x.id==='ADVANCED'&&!x.disabled),false,'Advanced must stay locked');
  if(available){
   assert.equal(options.find(x=>x.id==='ECHARTS').disabled,false,'Standard access must authorize ECharts');
   await p.evaluate(bars=>window.dispatchEvent(new CustomEvent('crownlight:revealed-bars',{detail:{bars,symbol:'FICTION-EDU',timeframe:'1-minute'}})),two);
   await p.locator('.cl-chart-tier-bar select').selectOption('ECHARTS');
   await p.waitForFunction(()=>window.CrownlightChartTiers?.getStatus().echartsReady===true);
   const result=await p.evaluate(()=>{
    const e=window.echarts.getInstanceByDom(document.querySelector('[data-cl-echarts-chart]'));
    return {series:e.getOption().series.map(x=>x.data),type:e.getOption().series.map(x=>x.type),
     zoom:e.getOption().dataZoom.length,shown:window.CrownlightEChartsStudio.getStatus(),selected:window.CrownlightChartTiers.getStatus().selected};
   });
   assert.deepEqual(result.series,[[[10,10.5,9,11],[10.5,11,10,12]],[1200,1500]]);
   assert.deepEqual(result.type,['candlestick','bar']);assert.equal(result.zoom,2);
   assert.equal(result.selected,'ECHARTS');assert.equal(result.shown.barCount,2);
   await p.evaluate(v=>window.dispatchEvent(new CustomEvent('crownlight:revealed-bars',{detail:{bars:v,symbol:'FICTION-EDU'}})),two.slice(0,1));
   assert.deepEqual(await p.evaluate(()=>window.echarts.getInstanceByDom(document.querySelector('[data-cl-echarts-chart]')).getOption().series[0].data),[[10,10.5,9,11]],'Replay rewind must remove future candles');
   await p.locator('.cl-chart-tier-bar select').selectOption('STANDARD');
   assert.equal(await p.locator('[data-cl-echarts-chart]').count(),0);
   assert.equal(await p.evaluate(()=>window.CrownlightEChartsStudio.getStatus().ready),false);
   await p.locator('.cl-chart-tier-bar select').selectOption('ECHARTS');
   await p.waitForFunction(()=>window.CrownlightChartTiers?.getStatus().echartsReady===true);
   await p.evaluate(()=>window.dispatchEvent(new CustomEvent('crownlight:member-changed')));
   assert.equal(await p.evaluate(()=>window.CrownlightEChartsStudio.getStatus().ready),false);
   assert.equal(await p.evaluate(()=>window.CrownlightEChartsStudio.getStatus().barCount),0);
  }else{
   const before=await p.evaluate(()=>window.CrownlightChartTiers.getStatus().selected);
   await p.evaluate(()=>window.CrownlightChartTiers.choose('ECHARTS'));
   assert.equal(await p.evaluate(()=>window.CrownlightChartTiers.getStatus().selected),before);
  }
  assert.deepEqual(errors,[]);await p.close();
 }
 console.log('PASS real ECharts Studio dropdown: fourth choice, no premium grant, candlestick/volume, replay rewind, switch, account scrub, Owner hiding');
}finally{await browser.close()}
