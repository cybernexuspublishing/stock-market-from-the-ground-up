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
'<link rel="stylesheet" href="/assets/css/simulator.css"><link rel="stylesheet" href="/assets/css/crownlight-chart-tiers-v1.css"><link rel="stylesheet" href="/assets/css/crownlight-chart-v2-experience.css">',
'<script defer src="/assets/js/crownlight-indicator-math-v2.js"></script><script defer src="/assets/js/crownlight-chart-tutor-v1.js"></script>',
'<script defer src="/assets/js/crownlight-chart-tiers-v1.js"></script><script defer src="/assets/js/crownlight-workspace-v2.js"></script><script defer src="/assets/js/crownlight-talia-lab-v2.js"></script></head><body>',
'<section class="sim-chart-panel"><div class="crownlight-shell"><div class="crownlight-plot">Standard chart</div></div></section></body></html>'].join('');
const two=[{timestamp:1792935000000,open:10,high:11,low:9,close:10.5,volume:1100},
{timestamp:1792935060000,open:10.5,high:12,low:10,close:11,volume:1400}];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
for(const [tier,expected] of [['STANDARD',0],['ADVANCED',1],['PROFESSIONAL',2]]) {
const context=await browser.newContext({viewport:{width:1280,height:900}});
let grantedTier=tier;
await context.addInitScript(()=>{
let user={id:'11111111-1111-4111-8111-111111111111'};
let signedIn=true,handler=null;
window.__qaSignOut=()=>{signedIn=false;handler?.('SIGNED_OUT',{session:null})};
window.__qaSwitchUser=()=>{user={id:'22222222-2222-4222-8222-222222222222'};
 handler?.('SIGNED_IN',{user,access_token:'mock'});};
window.__qaTokenRefresh=()=>handler?.('TOKEN_REFRESHED',{user,access_token:'mock'});
window.__qaExpireClock=()=>{const now=Date.now();Date.now=()=>now+7200000};
window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:signedIn?{user,access_token:'mock'}:null}}),
onAuthStateChange:fn=>{handler=fn;return {data:{subscription:{unsubscribe(){}}}}}}});});
const page=await context.newPage(),errors=[];page.on('pageerror',x=>errors.push(x.message));
await page.route('**/*',async route=>{const u=new URL(route.request().url());
if(u.hostname==='cdn.jsdelivr.net'){assert.equal(u.pathname,'/npm/klinecharts@10.1.0/dist/umd/klinecharts.min.js');
return route.fulfill({status:200,contentType:'application/javascript',body:readFileSync(kline)});}
if(u.origin!==origin)return route.abort();
if(u.pathname==='/api/chart-workspace')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,tier,workspace:{version:2,selected:'STANDARD',sync:true,studies:[],drawings:[]},updatedAt:null})});
if(u.pathname==='/api/simulator-lab-context')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,labId:'F1-C02-L01',title:'Free Foundations Sample',referenceDate:null})});
if(u.pathname==='/api/member-sparks-wallet')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,wallet:{available:53}})});
if(u.pathname==='/api/member-sparks-chart')return route.fulfill({status:200,contentType:'application/json',
 body:JSON.stringify({ok:true,offers:[
 {tier:'ADVANCED',label:'Advanced Studio · 24 hours',sku:'STUDIO_ADVANCED_DAY',costSparks:8,durationHours:24},
 {tier:'PROFESSIONAL',label:'Professional Studio · 24 hours',sku:'STUDIO_PROFESSIONAL_DAY',costSparks:15,durationHours:24}
 ]})});
if(u.pathname==='/api/chart-tier-access')return route.fulfill({status:200,contentType:'application/json',
body:JSON.stringify({ok:true,eligible:true,sparksChartPasses:{enabled:true},tier:grantedTier,allowed:grantedTier==='STANDARD'?['STANDARD']:grantedTier==='ADVANCED'?['STANDARD','ADVANCED']:['STANDARD','ADVANCED','PROFESSIONAL'],
temporaryAccess:grantedTier==='PROFESSIONAL'?{kind:'SPARKS',tier:'PROFESSIONAL',expiresAt:new Date(Date.now()+3600000).toISOString()}:undefined})});
if(u.pathname==='/')return route.fulfill({status:200,contentType:'text/html',body:html});
const f=join(root,u.pathname.slice(1)),ext=extname(f);
if(!f.startsWith(root+'/')||!existsSync(f))return route.fulfill({status:404,body:''});
return route.fulfill({status:200,contentType:ext==='.css'?'text/css':'application/javascript',body:readFileSync(f)});});
try{await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
await page.waitForFunction(t=>window.CrownlightChartTiers?.getStatus().tier===t,tier);
assert.equal(await page.locator('.cl-chart-tier-bar select').count(),1);
const enabled=await page.locator('.cl-chart-tier-bar select option:not([disabled])').count();
assert.equal(enabled,tier==='STANDARD'?2:tier==='ADVANCED'?3:4);
assert.equal(await page.getByRole('button',{name:/Unlock options/}).count(),0,
 'An unlocked Studio must not show a generic Unlock options control');
const remainingLocks=tier==='STANDARD'?2:tier==='ADVANCED'?1:0;
assert.equal(await page.locator('.cl-locked-studio').count(),remainingLocks);
if(remainingLocks){
 await page.locator('.cl-locked-studio').first().click();
 const modal=page.locator('#cl-chart-tier-purchase-dialog');
 await page.waitForFunction(()=>/Available balance: 53 Lumens/.test(
  document.querySelector('#cl-chart-tier-purchase-dialog')?.textContent||''));
 assert.equal(await modal.isVisible(),true);
 assert.match(await modal.innerText(),/Cost: (8|15) Sparks/);
 assert.match(await modal.innerText(),/Remaining after purchase: (45|38) Sparks/);
 assert.equal(await modal.getByRole('button',{name:/Confirm redemption/}).count(),1);
 await page.keyboard.press('Escape');
 assert.equal(await modal.isVisible(),false);
}
await page.evaluate(b=>dispatchEvent(new CustomEvent('crownlight:revealed-bars',{detail:{symbol:'GUFICTION',timeframe:'1-minute',bars:b}})),two);
if(tier!=='STANDARD'){await page.locator('.cl-chart-tier-bar select').selectOption(tier);
await page.waitForFunction(n=>window.CrownlightChartTiers?.getStatus().charts===n,expected,{timeout:25000});
assert.equal(await page.locator('.cl-tier-kline-canvas').count(),expected);
assert.equal(await page.locator('.cl-tier-chart-summary').count(),expected,
 'Every chart has one separate readable OHLCV summary');
const firstSummary=await page.locator('.cl-tier-chart-summary').first().innerText();
assert.match(firstSummary,/GUFICTION/);
assert.match(firstSummary,/Open/);
assert.match(firstSummary,/Close/);
assert.match(firstSummary,/11\.0000/);
await page.locator('.cl-tier-study-readout').first().evaluate(el=>el.open=true);
assert.match(await page.locator('[data-cl-summary-study-values]').first().innerText(),/EMA|VOL/);
assert.equal(await page.locator('.cl-tier-study-readout').first().evaluate(el=>el.open),true);
assert.equal(await page.locator('.crownlight-shell').isVisible(),false,'Enhanced Studio must not display duplicate Standard chart/player');
const canvasStyles=await page.locator('.cl-tier-kline-canvas canvas').first().evaluate(c=>{
 const s=getComputedStyle(c);return {border:s.borderTopWidth,marginTop:s.marginTop,maxHeight:s.maxHeight}
});
assert.equal(canvasStyles.border,'0px','Library canvas must not inherit legacy Simulator borders');
assert.equal(canvasStyles.marginTop,'0px','Library canvases must not be displaced by legacy margin');
assert.equal(canvasStyles.maxHeight,'none','Library canvas must preserve its internal height');
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
if(tier==='ADVANCED'){
 // High-fidelity regression probe for Owner's 21/940 Tiingo replay (only 21 supplied).
 const providerBars=Array.from({length:21},(_,i)=>{
  const base=341.50+Math.sin(i*0.82)*0.11+i*0.005;
  const open=Number(base.toFixed(4)),close=Number((base+(i%2?-.085:.075)).toFixed(4));
  return {timestamp:1791964800000+i*60000,open,high:Number((Math.max(open,close)+.035).toFixed(4)),
   low:Number((Math.min(open,close)-.035).toFixed(4)),close,volume:i%5===0?120:1};
 });
 await page.evaluate(b=>dispatchEvent(new CustomEvent('crownlight:revealed-bars',{detail:{
  symbol:'AAPL',timeframe:'1-minute',source:'tiingo_byo',bars:b}})),providerBars);
 await page.waitForFunction(()=>window.CrownlightChartTiers.getInstances()[0]?.chart.getDataList().length===21,{timeout:15000});
 await page.waitForTimeout(250);
 const probe=await page.evaluate(()=>{
  const entry=window.CrownlightChartTiers.getInstances()[0],chart=entry.chart;
  const data=chart.getDataList(),visible=chart.getVisibleRange(),canvas=[...entry.host.querySelectorAll('canvas')];
  const locations=data.slice(-5).map(d=>({stamp:d.timestamp,
   pt:chart.convertToPixel({timestamp:d.timestamp,value:d.close},{paneId:'candle_pane'})}));
  const samples=canvas.map(el=>{
   const w=el.width,h=el.height,ctx=el.getContext('2d');
   if(!ctx)return {w,h,error:'no2d'};
   const pixels=ctx.getImageData(0,0,w,h).data;
   let bull=0,bear=0;
   for(let yy=40;yy<Math.min(h,Math.round(h*.8));yy+=2)
    for(let xx=35;xx<Math.max(35,w-70);xx+=2){
     const a=(yy*w+xx)*4,r=pixels[a],g=pixels[a+1],b=pixels[a+2];
     if(g>105&&g>r*1.35&&g>b*1.1)bull++;
     if(r>125&&r>g*1.6&&r>b*1.2)bear++;
    }
   return {w,h,bull,bear};
  });
  return {visible,data:data.length,locations,canvas:samples,holder:{
   width:entry.host.getBoundingClientRect().width,height:entry.host.getBoundingClientRect().height}};
 });
 console.log('CROWNLIGHT_REAL_CANDLE_PIXEL_PROBE '+JSON.stringify(probe));
 const candleColors=probe.canvas.reduce((sum,layer)=>sum+(layer.bull||0)+(layer.bear||0),0);
 assert(candleColors>25,'Tiingo-like 21-candle chart must draw colored bodies/wicks, not just legends: '+JSON.stringify(probe));
 const last=probe.locations.at(-1)?.pt;
 assert(last&&Number.isFinite(last.x)&&Number.isFinite(last.y),
  'Latest revealed candle must map to visible chart coordinates');
}
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
 // These DOM geometry assertions detect the Owner-reported regression:
 // new chart-frame wrappers accidentally fell through to a one-column grid.
 const geometry=()=>page.locator('.cl-tier-chart-frame').evaluateAll(es=>es.map(e=>{
  const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};
 }));
 const onSameRow=rects=>rects.length===2&&Math.abs(rects[0].y-rects[1].y)<2;
 const ratio=rects=>rects[0].width/rects[1].width;
 const testMode=async mode=>{
  await page.locator('select[data-cl-layout]').selectOption(mode);
  await page.waitForFunction(mode=>{
   const cards=[...document.querySelectorAll('.cl-tier-chart-frame')].map(e=>e.getBoundingClientRect());
   if(cards.length!==2)return false;
   if(mode==='STACKED')return cards[1].top>=cards[0].bottom-2&&Math.abs(cards[0].width-cards[1].width)<3;
   const aligned=Math.abs(cards[0].top-cards[1].top)<2;
   const proportion=cards[0].width/cards[1].width;
   return aligned&&(mode==='SIDE_BY_SIDE'?proportion>.95&&proportion<1.05:proportion>1.85&&proportion<2.15);
  },mode,{timeout:8000});
  return geometry();
 };
 const side=await testMode('SIDE_BY_SIDE');
 assert(onSameRow(side)&&ratio(side)>.95&&ratio(side)<1.05,
  'Side by side must render equal-width columns on the same row: '+JSON.stringify(side));
 const paneHeights=await page.locator('.cl-tier-kline-canvas').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
 assert(paneHeights.every(h=>h>=550),'Price and oscillator panes remain readable');
 assert(Math.abs(paneHeights[0]-paneHeights[1])<2,'Side-by-side outer chart heights align');
 const stacked=await testMode('STACKED');
 assert(stacked[1].y>=stacked[0].bottom-2,'Stacked mode must place charts on separate rows');
 const focus=await testMode('PRICE_FOCUS');
 assert(onSameRow(focus)&&ratio(focus)>1.85&&ratio(focus)<2.15,
  'Price focus must make the left chart twice the right width: '+JSON.stringify(focus));
 await page.setViewportSize({width:820,height:1000});
 await page.waitForFunction(()=>{
  const cards=[...document.querySelectorAll('.cl-tier-chart-frame')].map(e=>e.getBoundingClientRect());
  return cards.length===2&&cards[1].top>=cards[0].bottom-2;
 });
 const narrow=await geometry();
 assert(narrow[1].y>=narrow[0].bottom-2,'Narrow Price focus must stack safely');
 await page.setViewportSize({width:1280,height:900});
 const sideAgain=await testMode('SIDE_BY_SIDE');
 assert(onSameRow(sideAgain),'Side by side must restore after changing window size');
 console.log('PASS Professional layout geometry: equal columns, stacked rows, 2:1 Price focus, responsive narrow viewport, restore.');
}
await page.locator('[data-cl-save]').click();
await page.waitForFunction(()=>/Workspace saved privately/.test(document.querySelector('.cl-workspace-status')?.textContent||''));
if(tier==='PROFESSIONAL'){
 await page.locator('[data-cl-studies]').fill('EMA, RSI');
 // Account switching must remove the previous member's candles and saved labels
 // before a new member can be shown any chart.
 await page.evaluate(()=>window.__qaSwitchUser());
 await page.waitForFunction(()=>window.CrownlightChartTiers.getStatus().revealed===0&&
  window.CrownlightChartTiers.getStatus().charts===0);
 assert.equal(await page.locator('.cl-tier-kline-canvas').count(),0,'Account switch must remove both private charts');
 assert.equal(await page.locator('[data-cl-studies]').inputValue(),'','Account switch must clear prior saved study labels');
 await page.evaluate(b=>dispatchEvent(new CustomEvent('crownlight:revealed-bars',{detail:{
  symbol:'NEW-SYNTHETIC',timeframe:'1-minute',bars:b}})),two);
 await page.locator('.cl-chart-tier-bar select').selectOption('PROFESSIONAL');
 await page.waitForFunction(()=>window.CrownlightChartTiers.getStatus().charts===2);
 // A revoked permission observed on token refresh must immediately downgrade.
 grantedTier='STANDARD';
 await page.evaluate(()=>window.__qaTokenRefresh());
 await page.waitForFunction(()=>window.CrownlightChartTiers.getStatus().verified===true&&
  window.CrownlightChartTiers.getStatus().selected==='STANDARD'&&
  window.CrownlightChartTiers.getStatus().charts===0);
 assert.equal(await page.locator('.cl-tier-kline-canvas').count(),0,'Revoked Studio cannot leave premium canvases');
 // Regrant in the deterministic fixture, then advance the clock past a
 // short-lived Sparks pass and confirm the 1-second countdown rechecks server.
 grantedTier='PROFESSIONAL';
 await page.evaluate(()=>window.__qaTokenRefresh());
 await page.waitForFunction(()=>window.CrownlightChartTiers.getStatus().tier==='PROFESSIONAL');
 await page.locator('.cl-chart-tier-bar select').selectOption('PROFESSIONAL');
 await page.waitForFunction(()=>window.CrownlightChartTiers.getStatus().charts===2);
 grantedTier='STANDARD';
 await page.evaluate(()=>window.__qaExpireClock());
 await page.waitForFunction(()=>window.CrownlightChartTiers.getStatus().tier==='STANDARD'&&
  window.CrownlightChartTiers.getStatus().charts===0,null,{timeout:6000});
 assert.equal(await page.locator('.cl-tier-kline-canvas').count(),0,'Expired Sparks pass must remove Professional charts');
 console.log('PASS account-switch cleanup, entitlement revocation and expiring Sparks downgrade (mocked backend, real browser).');
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
