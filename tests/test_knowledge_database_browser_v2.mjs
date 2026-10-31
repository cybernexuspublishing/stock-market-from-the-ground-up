/* Real Chromium, static/fictional fixture: no member login, payments or market API. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFileSync,existsSync} from 'node:fs';
import {extname,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const problems=[];
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();
  page.on('pageerror',e=>problems.push(width+': '+e.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin!=='https://knowledge.fixture.test')return route.abort();
   const path=url.pathname;
   if(['/assets/js/site.js','/config.js'].includes(path))
    return route.fulfill({status:200,contentType:'application/javascript',body:'// analytics and identity disabled in static ungraded fixture'});
   if(path==='/assets/js/crownlight-echarts-loader-v1.js')
    return route.fulfill({status:200,contentType:'application/javascript',body:
     'window.CrownlightECharts={load:async()=>({init:()=>({setOption:(options)=>{window.__chartOptions=options},resize:()=>{}})})};'});
   if(path==='/favicon.ico')return route.fulfill({status:404,body:''});
   const file=join(root,path.slice(1));
   if(!file.startsWith(root+'/')||!existsSync(file))return route.fulfill({status:404,body:''});
   const type={'.js':'application/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml',
    '.json':'application/json','.webp':'image/webp','.png':'image/png'}[extname(file)]||'application/octet-stream';
   return route.fulfill({status:200,contentType:type,body:readFileSync(file)});
  });
  await page.goto('https://knowledge.fixture.test/knowledge-database.html',{waitUntil:'domcontentloaded'});
  await page.locator('.kd-searchbar input').waitFor({timeout:12000});
  assert.equal(await page.locator('#academy-free-knowledge details').count(),12);
  assert.equal(await page.locator('#knowledge-expansion details.kd-article').count(),26);
  assert.match(await page.locator('.kd-search-summary').innerText(),/38 reference topics shown/);
  const search=page.locator('#kd-search');
  await search.fill('VWAP');
  const found=await page.locator('#knowledge-expansion details.kd-article:visible').count();
  assert(found>=1&&found<26,'Search must filter the research categories');
  assert.match(await page.locator('.kd-search-summary').innerText(),/reference topics? shown/);
  await search.fill('');
  await page.getByRole('button',{name:'Company, Catalysts & Filings'}).click();
  assert.equal(await page.locator('#knowledge-expansion details.kd-article:visible').count(),4);
  assert.equal(await page.locator('#academy-free-knowledge details:visible').count(),0);
  await page.getByRole('button',{name:'All topics'}).click();
  const risk=page.locator('#knowledge-risk-sizing');
  await risk.locator('summary').click();
  const compare=risk.getByRole('button',{name:'Compare my reasoning'});
  assert(await compare.isDisabled(),'Independent comparison must not be exposed without a response');
  await risk.getByRole('button',{name:'Explain this concept'}).click();
  assert(await risk.locator('.kd-feedback').isVisible(),'Free conceptual help must be available');
  await risk.locator('textarea').fill('I computed a pure 125 share maximum but would choose the explicitly conservative 124 share classroom example and account for slippage.');
  await compare.click();
  assert.match(await risk.locator('.kd-feedback').innerText(),/No answer or grade was saved/);
  assert.equal(await page.locator('#kd-workshop').count(),0,'References must not contain the full exercise');
  await page.getByRole('link',{name:'Interactive Chart Workshop'}).click();
  await page.waitForURL('**/chart-reveal-practice.html');
  const w=page.locator('#kd-workshop');
  await w.locator('tbody tr').first().waitFor();
  assert.equal(await w.locator('tbody tr').count(),1);
  await page.waitForFunction(()=>!!window.__chartOptions);
  const initial=await page.evaluate(()=>window.__chartOptions);
  assert.equal(initial.xAxis[0].data.length,8,'Future times retain eight fixed positions');
  assert.equal(initial.series[0].data.length,8,'Candlestick series must reserve all positions');
  assert.equal(initial.series[0].barMaxWidth,24,'Candles must not inflate to full plot width');
  assert.equal(initial.series[2].barMaxWidth,24,'Volume bars must not inflate to full plot width');
  assert(initial.series[0].data.slice(1).every(x=>x==='-'),'Future prices remain hidden');
  assert(initial.series[2].data.slice(1).every(x=>x===null),'Future volumes remain hidden');
  await w.getByRole('button',{name:'Reveal next completed candle'}).click();
  assert.equal(await w.locator('tbody tr').count(),2);
  const second=await page.evaluate(()=>window.__chartOptions);
  assert.equal(second.xAxis[0].data.length,8);
  assert.equal(second.series[0].data[1][1],5.15);
  assert.equal(second.series[0].data[2],'-');
  await w.getByRole('button',{name:'Reset to first candle'}).click();
  assert.equal(await w.locator('tbody tr').count(),1);
  const reset=await page.evaluate(()=>window.__chartOptions);
  assert.equal(reset.series[0].data[1],'-');
  const overflow=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
  assert(overflow.documentWidth<=overflow.viewport+3,'Knowledge Database should not cause horizontal overflow at '+width+'px: '+JSON.stringify(overflow));
  await context.close();
 }
 assert.equal(problems.length,0,'No JavaScript exception: '+problems.join(' | '));
 console.log('PASS Knowledge Database Chromium 38 references, linked workshop, fixed eight-slot chart and withheld future data at desktop/mobile');
}finally{await browser.close()}
