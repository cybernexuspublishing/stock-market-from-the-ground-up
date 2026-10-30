/* Production PUBLIC browser acceptance — no member login, checkout, or writes.
 * Tests 15 indexable pages in real Chromium at phone + desktop widths.
 * Never calls protected member APIs intentionally or initiates payment flows.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';

const base='https://stock-market-from-the-ground-up-d1r.pages.dev';
const paths=['/','/about.html','/books.html','/store.html','/learn.html','/tools.html',
 '/lab-samples.html','/membership.html','/help.html','/philosophy.html',
 '/how-stock-market-works.html','/how-to-read-candlestick-charts.html',
 '/vwap-explained.html','/bid-ask-spread-explained.html',
 '/stock-trading-risk-management.html'];
const guides=paths.filter(x=>x.startsWith('/how-')||x==='/vwap-explained.html'||
 x==='/bid-ask-spread-explained.html'||x==='/stock-trading-risk-management.html');
const report={scope:'Production anonymous Chromium; browser at 390px and 1440px',
 checkedAt:new Date().toISOString(),origin:base,total:30,rows:[],failures:[],
 limitations:['Does not exercise authenticated or paid pages',
 'Does not assert Google indexed any page','External provider requests are not used for acceptance']};
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},
   reducedMotion:'reduce',serviceWorkers:'block'});
  for(const path of paths){
   const page=await context.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(String(e.message||e).slice(0,180)));
   const row={path,width,checks:{},errors};
   try{
    const response=await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:30000});
    const status=response?.status()||0;
    assert.equal(status,200,'HTTP status '+status);
    const finalUrl=new URL(page.url());
    assert.equal(finalUrl.origin,base,'Unexpected navigation to outside origin');
    const state=await page.evaluate(()=>{
      const main=document.querySelector('main'),heading=main?.querySelector('h1');
      const meta=name=>document.querySelector('meta[name="'+name+'"]')?.getAttribute('content')||'';
      const canonical=document.querySelector('link[rel="canonical"]')?.href||'';
      const mainStyle=main?getComputedStyle(main):null;
      return {title:document.title,viewport:meta('viewport'),description:meta('description'),
       canonical,headingCount:document.querySelectorAll('main h1').length,
       heading:heading?.textContent?.trim()||'',mainText:main?.innerText?.trim().length||0,
       overflow:document.documentElement.scrollWidth>innerWidth+3,
       hiddenMain:!main||mainStyle?.display==='none'||mainStyle?.visibility==='hidden',
       robots:meta('robots')};
    });
    assert(state.title?.length>8,'Missing descriptive document title');
    assert(state.viewport.includes('width=device-width'),'Missing mobile viewport');
    assert(state.description.length>50,'Missing page-specific description');
    assert.equal(state.headingCount,1,'Expected one main heading');
    assert(state.mainText>75,'Public main content is empty');
    assert.equal(state.hiddenMain,false,'Main is hidden');
    assert.equal(state.overflow,false,'Horizontal overflow at width '+width);
    assert(!/noindex/i.test(state.robots),'Public page marked noindex');
    const expected=base+(path==='/'?'/':path);
    assert.equal(state.canonical,expected,'Canonical URL mismatch');
    if(['/','/learn.html','/tools.html'].includes(path)){
     for(const href of guides){
      const count=await page.locator('a[href="'+href.slice(1)+'"]').count();
      assert(count>0,'Missing link to '+href);
     }
    }
    if(guides.includes(path)){
     assert(await page.locator('a[href="lab-samples.html"]').count()>0,'Missing sample Lab link');
     assert(await page.locator('a[href*="program=free5"]').count()>0,'Missing Free Foundations link');
    }
    row.status='PASS';row.checks={httpStatus:status,title:state.title,
      mainCharacters:state.mainText,finalPath:finalUrl.pathname,canonical:state.canonical,
      overflow:false,heading:state.heading};
    console.log('PASS public '+width+'px '+path);
   }catch(e){
    row.status='FAIL';row.failure=String(e.message||e).slice(0,400);
    report.failures.push({path,width,reason:row.failure});
    console.error('FAIL public '+width+'px '+path+' '+row.failure);
   }finally{
    report.rows.push(row);await page.close();
   }
  }
  await context.close();
 }
}finally{
 await browser?.close();
 mkdirSync('artifacts/public-acquisition',{recursive:true});
 writeFileSync('artifacts/public-acquisition/production-browser.json',
  JSON.stringify(report,null,2));
}
console.log('PRODUCTION_PUBLIC_15 '+JSON.stringify({checks:report.rows.length,
 passed:report.rows.filter(x=>x.status==='PASS').length,failed:report.failures.length}));
if(report.failures.length)process.exitCode=1;
