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
'<link rel="stylesheet" href="/assets/css/crownlight-chart-tiers-v1.css">',
'<script defer src="/assets/js/crownlight-chart-tiers-v1.js"></script></head><body>',
'<section class="sim-chart-panel"><div class="crownlight-shell"><div class="crownlight-plot">Standard chart</div></div></section></body></html>'].join('');
const two=[{timestamp:1792935000000,open:10,high:11,low:9,close:10.5,volume:1100},
{timestamp:1792935060000,open:10.5,high:12,low:10,close:11,volume:1400}];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
for(const [tier,expected] of [['STANDARD',0],['ADVANCED',1],['PROFESSIONAL',2]]) {
const context=await browser.newContext({viewport:{width:1280,height:900}});
await context.addInitScript(()=>{const user={id:'11111111-1111-4111-8111-111111111111'};
window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{user,access_token:'mock'}}}),
onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}});});
const page=await context.newPage(),errors=[];page.on('pageerror',x=>errors.push(x.message));
await page.route('**/*',async route=>{const u=new URL(route.request().url);
if(u.hostname==='cdn.jsdelivr.net'){assert.equal(u.pathname,'/npm/klinecharts@10.1.0/dist/umd/klinecharts.min.js');
return route.fulfill({status:200,contentType:'application/javascript',body:readFileSync(kline)});}
if(u.origin!==origin)return route.abort();
if(u.pathname==='/api/chart-tier-access')return route.fulfill({status:200,contentType:'application/json',
body:JSON.stringify({ok:true,eligible:true,tier,allowed:tier==='STANDARD'?['STANDARD']:tier==='ADVANCED'?['STANDARD','ADVANCED']:['STANDARD','ADVANCED','PROFESSIONAL']})});
if(u.pathname==='/')return route.fulfill({status:200,contentType:'text/html',body:html});
const f=join(root,u.pathname.slice(1)),ext=extname(f);
if(!f.startsWith(root+'/')||!existsSync(f))return route.fulfill({status:404,body:''});
return route.fulfill({status:200,contentType:ext==='.css'?'text/css':'application/javascript',body:readFileSync(f)});});
try{await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
await page.waitForFunction(t=>window.CrownlightChartTiers?.getStatus().tier===t,tier);
assert.equal(await page.locator('.cl-chart-tier-switcher select').count(),1);
const enabled=await page.locator('.cl-chart-tier-switcher option:not([disabled])').count();
assert.equal(enabled,tier==='STANDARD'?1:tier==='ADVANCED'?2:3);
await page.evaluate(b=>dispatchEvent(new CustomEvent('crownlight:revealed-bars',{detail:{symbol:'GUFICTION',timeframe:'1-minute',bars:b}})),two);
if(tier!=='STANDARD'){await page.locator('.cl-chart-tier-switcher select').selectOption(tier);
await page.waitForFunction(n=>window.CrownlightChartTiers?.getStatus().charts===n,expected,{timeout:25000});
assert.equal(await page.locator('.cl-tier-kline-canvas').count(),expected);
assert((await page.locator('.cl-tier-kline-canvas canvas').count())>=expected,'KLineChart must render real canvas');}
await page.evaluate(b=>dispatchEvent(new CustomEvent('crownlight:revealed-bars',{detail:{symbol:'GUFICTION',timeframe:'1-minute',bars:b}})),
[...two,{timestamp:two[1].timestamp+60000,open:11,high:11.8,low:10.6,close:11.7,volume:1000}]);
assert.equal(await page.evaluate(()=>window.CrownlightChartTiers.getStatus().revealed),3);
assert.deepEqual(errors,[]);console.log('PASS '+tier+' real Chromium '+expected+' KLine charts and revealed candle updates');
}finally{await context.close()}}
}finally{await browser.close()}
