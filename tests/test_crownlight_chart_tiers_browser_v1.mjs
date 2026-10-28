import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const kline=join(root,'node_modules/klinecharts/dist/umd/klinecharts.min.js');
assert(existsSync(kline),'Pinned real KLineChart must be installed');
const origin='https://tier-fixture.test';
const html=['<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1">',
'<link rel="stylesheet" href="/assets/css/crownlight-chart-tiers-v1.css"><link rel="stylesheet" href="/assets/css/crownlight-chart-v2-experience.css">',
'<script defer src="/assets/js/crownlight-indicator-math-v2.js"></script><script defer src="/assets/js/crownlight-chart-tutor-v1.js"></script>',
'<script defer src="/assets/js/crownlight-chart-tiers-v1.js"></script><script defer src="/assets/js/crownlight-workspace-v2.js"></script><script defer src="/assets/js/crownlight-talia-lab-v2.js"></script></head><body>',
'<section class="sim-chart-panel"><div class="crownlight-shell"><div class="crownlight-plot">Standard chart</div></div></section></body></html>'].join('');
const two=[{timestamp:1792935000000,open:10,high:11,low:9,close:10.5,volume:1100},
{timestamp:1792935060000,open:10.5,high:12,low:10,close:11,volume:1400}];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
for(const [tier,expected] of [['STANDARD',0],['ADVANCED',1],['PROFESSIONAL',2]]) {
const context=await browser.newContext({viewport:{width:1280,height:900}});
await context.addInitScript(()=>{const user={id:'11111111-1111-4111-8111-111111111111'};
let signedIn=true,handler=null;
window.__qaSignOut=()=>{signedIn=false;handler?.('SIGNED_OUT',{session:null})};
window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:signedIn?{user,access_token:'mock'}:null}}),
onAuthStateChange:fn=>{handler=fn;return {data:{subscription:{unsubscribe(){}}}}}}});});
const page=await context.newPage(),errors=[];page.on('pageerror',x=>errors.push(x.message));
await page.route('**/*',async route=>{const u=new URL(route.request().url());
if(u.hostname==='cdn.jsdelivr.net'){assert.equal(u.pathname,'/npm/klinecharts@10.1.0/dist/umd/klinecharts.min.js');
return route.fulfill({status:200,contentType:'application/javascript',body:readFileSync(kline)});}
if(u.origin!==origin)return route.abort();
if(u.pathname==='/api/chart-workspace')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,tier,workspace:{version:2,selected:'STANDARD',sync:true,studies:[],drawings:[]},updatedAt:null})});
if(u.pathname==='/api/simulator-lab-context')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,labId:'F1-C02-L01',title:'Free Foundations Sample',referenceDate:null})});
if(u.pathname==='/api/chart-tier-access')return route.fulfill({status:200,contentType:'application/json',
body:JSON.stringify({ok:true,eligible:true,tier,allowed:tier==='STANDARD'?['STANDARD']:tier==='ADVANCED'?['STANDARD','ADVANCED']:['STANDARD','ADVANCED','PROFESSIONAL']})});
if(u.pathname==='/')return route.fulfill({status:200,contentType:'text/html',body:html});
const f=join(root,u.pathname.slice(1)),ext=extname(f);
if(!f.startsWith(root+'/')||!existsSync(f))return route.fulfill({status:404,body:''});
return route.fulfill({status:200,contentType:ext==='.css'?'text/css':'application/javascript',body:readFileSync(f)});});
try{await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
await page.waitForFunction(t=>window.CrownlightChartTiers?.getStatus().tier===t,tier);
assert.equal(await page.locator('.cl-chart-tier-bar select').count(),1);
const enabled=await page.locator('.cl-chart-tier-bar select option:not([disabled])').count();
assert.equal(enabled,tier==='STANDARD'?1:tier==='ADVANCED'?2:3);
await page.getByRole('button',{name:/Unlock options/}).click();
assert.equal(await page.locator('#cl-chart-tier-access-details').isVisible(),true);
assert.match(await page.locator('#cl-chart-tier-access-details').innerText(),/Sparks/);
await page.keyboard.press('Escape');
assert.equal(await page.locator('#cl-chart-tier-access-details').isVisible(),false);
await page.evaluate(b=>dispatchEvent(new CustomEvent('crownlight:revealed-bars',{detail:{symbol:'GUFICTION',timeframe:'1-minute',bars:b}})),two);
if(tier!=='STANDARD'){await page.locator('.cl-chart-tier-bar select').selectOption(tier);
await page.waitForFunction(n=>window.CrownlightChartTiers?.getStatus().charts===n,expected,{timeout:25000});
assert.equal(await page.locator('.cl-tier-kline-canvas').count(),expected);
assert((await page.locator('.cl-tier-kline-canvas canvas').count())>=expected,'KLineChart must render real canvas');
// A canvas alone is not proof of readable price candles: a flood of indicator
// panes previously collapsed the candle pane to almost zero height.
const pricePane=await page.evaluate(()=>window.CrownlightChartTiers.getInstances().map(e=>({
  candleHeight:e.chart.getSize?.('candle_pane')?.height||0,
  ema:e.chart.getIndicators?.({name:'EMA'})||[],
  indicatorNames:(e.chart.getIndicators?.()||[]).map(x=>x.name)
})));
assert(pricePane.every(p=>p.candleHeight>=200),'Candle pane must stay visibly tall: '+JSON.stringify(pricePane.map(p=>p.candleHeight)));
assert(pricePane.every(p=>p.ema.length===1&&p.ema[0].paneId==='candle_pane'),'EMA must overlay price, not occupy its own pane');
await page.waitForFunction(()=>window.CrownlightChartTiers.getInstances().every(x=>x.chart.getDataList().length===2));
// Owner regression: persistent EMA + RSI previously spawned duplicate panes
// and hid the candle chart when restoring a member workspace.
await page.evaluate(()=>{
 const t=window.CrownlightChartTiers;
 for(let i=0;i<3;i++){t.addStudy('EMA');t.addStudy('RSI')}
});
const panes=await page.evaluate(()=>window.CrownlightChartTiers.getInstances().map(e=>({
  height:e.chart.getSize('candle_pane')?.height||0,
  ema:e.chart.getIndicators({name:'EMA'}).length,
  rsi:e.chart.getIndicators({name:'RSI'}).length,
  source:e.chart.getDataList().length,
  hostHeight:e.host.getBoundingClientRect().height
})));
assert(panes.every(p=>p.height>=200&&p.ema===1&&p.rsi===1&&p.source===2&&p.hostHeight>=460),
 'Restored studies must leave readable candles, no duplicate pane: '+JSON.stringify(panes));
}
await page.evaluate(b=>dispatchEvent(new CustomEvent('crownlight:revealed-bars',{detail:{symbol:'GUFICTION',timeframe:'1-minute',bars:b}})),
[...two,{timestamp:two[1].timestamp+60000,open:11,high:11.8,low:10.6,close:11.7,volume:1000}]);
assert.equal(await page.evaluate(()=>window.CrownlightChartTiers.getStatus().revealed),3);
await page.locator('.cl-talia-toggle').click();
assert.match(await page.locator('.cl-talia-facts').innerText(),/EMA 9|VWAP/i);
await page.locator('.cl-talia-answer').fill('No trade until price acceptance; invalidation below prior low.');
await page.getByRole('button',{name:'Review my observation'}).click();
assert.match(await page.locator('.cl-talia-status').innerText(),/ungraded/i);
await page.locator('[data-cl-lab-id]').fill('F1-C02-L01');
await page.getByRole('button',{name:'Verify Lab'}).click();
await page.waitForFunction(()=>!document.querySelector('.cl-talia-lab-link a')?.hidden);
assert.match(await page.locator('.cl-talia-status').innerText(),/Verified Lab/);
assert.match(await page.locator('.cl-talia-lab-link a').getAttribute('href'),/F1-C02-L01/);
if(tier==='PROFESSIONAL'){
 assert.equal(await page.evaluate(()=>window.CrownlightWorkspaceV2.getStatus().linked),true);
 const result=await page.evaluate(()=>{
  const [left,right]=window.CrownlightChartTiers.getInstances();
  let received=null;const prior=right.chart.scrollToTimestamp;
  right.chart.scrollToTimestamp=function(stamp,...args){received=stamp;return prior.call(this,stamp,...args)};
  window.CrownlightWorkspaceV2.synchronize(left,null,'onScroll');
  return {received,last:left.chart.getDataList().at(-1)?.timestamp};
 });
 assert(Number.isSafeInteger(result.received),'Synchronized view must receive a real timestamp');
 assert(result.received<=result.last,'Chart sync must never request a later, unrevealed candle');
}
await page.locator('[data-cl-save]').click();
await page.waitForFunction(()=>/Workspace saved privately/.test(document.querySelector('.cl-workspace-status')?.textContent||''));
if(tier==='PROFESSIONAL'){
 await page.locator('[data-cl-studies]').fill('EMA, RSI');
 await page.evaluate(()=>window.__qaSignOut());
 await page.waitForFunction(()=>window.CrownlightChartTiers.getStatus().verified===false);
 assert.equal(await page.locator('.cl-tier-kline-canvas').count(),0,'Sign out must scrub the private Professional workspace');
 assert.equal(await page.evaluate(()=>window.CrownlightChartTiers.getStatus().charts),0);
 assert.equal(await page.locator('[data-cl-studies]').inputValue(),'','User switch must scrub saved study labels');
 assert.equal(await page.locator('.cl-talia-facts').locator('p').count(),0,'User switch must scrub previous chart readings');
}
assert.deepEqual(errors,[]);console.log('PASS '+tier+' real Chromium '+expected+' KLine charts and revealed candle updates');
}finally{await context.close()}}
}finally{await browser.close()}
