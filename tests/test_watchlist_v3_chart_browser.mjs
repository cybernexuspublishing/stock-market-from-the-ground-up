import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
const USER='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const server=createServer((req,res)=>{
 res.writeHead(200,{'content-type':'text/html; charset=utf-8'});
 res.end('<!doctype html><html><head></head><body><main><h1>Chart Studio TEST</h1><div id="sim-gate"></div></main></body></html>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 let requests=0;
 await page.route('**/api/watchlist-chart-context-v3?*',async route=>{
  requests++;
  const r=route.request();
  assert.equal(r.headers().authorization,'Bearer member_test');
  assert.equal(new URL(r.url()).searchParams.get('candidateId'),'11');
  return route.fulfill({json:{ok:true,candidateId:11,symbol:'FICT',folder:'Test',stage:'MONITOR',
   asOf:'2026-10-29T10:00:00Z',sourceNote:'Fictional member-owned source',
   invalidation:'No trade on bad source',archived:false,
   annotations:[{kind:'SUPPORT',at:'2026-10-29T10:00:00Z',price:11.5,timeframe:'5m',
    note:'Manual unverified historical note'}],source:'MEMBER_ENTERED_NOT_INDEPENDENTLY_VERIFIED',
   chartDataIncluded:false,livePriceIncluded:false}});
 });
 await page.goto('http://127.0.0.1:'+server.address().port+'/?watchlist_candidate=11');
 await page.evaluate(uid=>{
  window.getSupabaseClient=async()=>({auth:{
   getSession:async()=>({data:{session:{user:{id:uid},access_token:'member_test'}}}),
   onAuthStateChange:callback=>window.__v3OnAuthChange=callback
  }});
  window.CrownlightECharts={load:async()=>({init:()=>({
   setOption:options=>window.__v3ChartOptions=options,resize(){},dispose(){window.__v3Disposed=true}
  })})};
 },USER);
 await page.addScriptTag({path:'assets/js/watchlist-chart-handoff-v3.js'});
 const region=page.locator('#cl-watchlist-chart-handoff-v3');
 await region.getByText('Fictional member-owned source').waitFor();
 assert.equal(requests,1);
 assert.match(await region.innerText(),/No candle data, verified quotes, orders/);
 assert.match(await region.innerText(),/Manual unverified historical note/);
 assert.equal(await page.evaluate(()=>window.__v3ChartOptions.series[0].type),'scatter');
 assert.equal(await page.evaluate(()=>window.__v3ChartOptions.series[0].data[0]),11.5);
 assert.equal(await page.locator('#sim-gate').count(),1);
 await page.evaluate(()=>window.__v3OnAuthChange('SIGNED_OUT',null));
 assert.equal(await region.isHidden(),true);
 assert.equal(await region.innerText(),'');
 assert.equal(await page.evaluate(()=>window.__v3Disposed),true);
 console.log('PASS V3 Chart Studio handoff: member-owned review context, ECharts manual levels, no actual candles, sign-out data disposal');
}finally{await browser?.close();await new Promise(r=>server.close(r))}
