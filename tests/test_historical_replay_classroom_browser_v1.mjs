import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
/* Isolated real Chromium DOM integration; test bars and sign-in are MOCKED.
   Never claim real-account production acceptance from this test. */
const origin='https://historical-fixture.test',root=process.cwd(),token='test-qa-token';
const user={id:'00000000-0000-4000-8000-000000000111'};
let cursor=0,locked=false,advancedBeforeLock=0;
const bars=Array.from({length:13},(_,i)=>({
 index:i,timestamp:new Date(Date.parse('2024-05-07T13:30:00Z')+60000*i).toISOString(),
 open:100+i*.08,high:100+i*.08+.3,low:100+i*.08-.2,close:100+i*.08+.04,volume:1000+i*31
}));
const original=readFileSync('verified-replay.html','utf8');
const html=original.replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*><\/script>/gi,'').replace('</body>','<script src="/qa-auth.js"></script><script src="/chart-engine.js"></script><script src="/assets/js/crownlight-indicator-math-v2.js"></script><script src="/assets/js/crownlight-chart-tutor-v1.js"></script><script src="/assets/js/crownlight-chart-studio-v2.js"></script><script src="/assets/js/verified-replay-v01492.js"></script><script src="/assets/js/historical-replay-classroom-v1.js"></script><script src="/assets/js/crownlight-chart-tiers-v1.js"></script></body>');
const authScript="(()=>{const u={id:'00000000-0000-4000-8000-000000000111'};let signed=true,handler=null;window.getSupabaseClient=async()=>({auth:{getUser:async()=>({data:{user:signed?u:null}}),getSession:async()=>({data:{session:signed?{user:u,access_token:'test-qa-token'}:null}}),onAuthStateChange:cb=>{handler=cb;return {data:{subscription:{unsubscribe(){}}}}}}});window.qaSignOut=()=>{signed=false;handler?.('SIGNED_OUT',null)};})();";
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:1350,height:900},serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',x=>errors.push(x.message));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.origin!==origin)return route.abort();
  if(u.pathname==='/verified-replay.html')return route.fulfill({status:200,contentType:'text/html',body:html});
  if(u.pathname==='/qa-auth.js')return route.fulfill({status:200,contentType:'application/javascript',body:authScript});
  if(u.pathname==='/chart-engine.js')return route.fulfill({status:200,contentType:'application/javascript',body:readFileSync('node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.js')});
  if(u.pathname.startsWith('/api/')){
   if(u.pathname==='/api/chart-studio-menu')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,visible:['STANDARD','ADVANCED','PROFESSIONAL','ECHARTS']})});
   assert.equal(route.request().headers().authorization,'Bearer '+token);
   if(u.pathname==='/api/chart-tier-access')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,eligible:true,tier:'STANDARD',allowed:['STANDARD']})});
   const action=u.searchParams.get('action');let response={},status=200;
   if(action==='catalog')response={ok:true,datasets:[{code:'QA_DIS_20240507',ticker:'DIS',date:'2024-05-07',title:'Synthetic test fixture (not market data)',sourceAttribution:'QA fixture',licenseNotice:'not released'}]};
   else if(action==='resume')response={ok:true,session:null,notice:'No saved QA session'};
   else if(action==='start'){cursor=0;locked=false;response={ok:true,sessionId:'11111111-2222-4333-8444-555555555555',currentIndex:0,bar:bars[0],dataset:{code:'QA_DIS_20240507',ticker:'DIS',sourceAttribution:'QA fixture',licenseNotice:'not released'},notice:'QA started'};}
   else if(action==='lock'){const body=JSON.parse(route.request().postData());assert(body.reasoning.length>=20);locked=true;response={ok:true,decisionLocked:true,notice:'Decision locked'};}
   else if(action==='advance'){if(!locked){advancedBeforeLock++;status=403;response={ok:false,error:'Decision required'};}else if(cursor===bars.length-1){status=409;response={ok:false,error:'Session ended'};}else {cursor++;response={ok:true,currentIndex:cursor,bar:bars[cursor],decisionLocked:true,notice:'Next test bar'};}}
   else if(action==='visible')response={ok:true,sessionId:'11111111-2222-4333-8444-555555555555',currentIndex:cursor,bars:bars.slice(0,cursor+1)};
   else {status=404;response={ok:false,error:'Unrecognized test route: '+action};}
   return route.fulfill({status,contentType:'application/json',body:JSON.stringify(response)});
  }
  const file=path.join(root,u.pathname.slice(1));if(!file.startsWith(root+path.sep)||!existsSync(file))return route.fulfill({status:404,body:'Missing fixture asset'});
  return route.fulfill({status:200,contentType:file.endsWith('.css')?'text/css':'application/javascript',body:readFileSync(file)});
 });
 await page.goto(origin+'/verified-replay.html?scope=historical&ticker=DIS&date=2024-05-07&timeframe=3',{waitUntil:'load'});
 await page.waitForFunction(()=>document.querySelector('#vr-code')?.value==='QA_DIS_20240507');
 assert.equal(await page.locator('#hr-timeframe').inputValue(),'3');
 await page.locator('#vr-start').click();
 await page.waitForFunction(()=>document.querySelector('#vr-session')?.hidden===false);
 assert.match(await page.locator('#hr-count').innerText(),/1 revealed source bars · 0 completed 3m/);
 assert.equal(await page.locator('#vr-advance').isDisabled(),true);
 assert.equal(await page.locator('.crownlight-shell').count(),0,'No incomplete 3-minute candle may mount as completed chart');
 await page.locator('#vr-decision').selectOption('WATCH');
 await page.locator('#vr-reason').fill('The initial candle offers insufficient evidence; I will wait before trading.');
 await page.locator('#vr-lock').click();
 await page.waitForFunction(()=>!document.querySelector('#vr-advance')?.disabled);
 for(let n=2;n<=3;n++){await page.locator('#vr-advance').click();await page.waitForFunction(x=>document.querySelector('#hr-count')?.textContent.startsWith(x+' revealed'),n);}
 assert.match(await page.locator('#hr-count').innerText(),/1 completed 3m/);
 try{await page.waitForFunction(()=>document.querySelector('.crownlight-shell .crownlight-plot canvas')!==null,null,{timeout:10000})}
 catch(err){
  const report=await page.evaluate(()=>({library:!!window.LightweightCharts,indicator:!!window.CrownlightIndicatorMath,studio:window.CrownlightStudio?.getStatus?.(),tiers:window.CrownlightChartTiers?.getStatus?.(),
  panel:!!document.querySelector('.sim-chart-panel'),shell:!!document.querySelector('.crownlight-shell'),plot:!!document.querySelector('.crownlight-plot'),
  notice:document.querySelector('#vr-notice')?.textContent,source:document.querySelector('#vr-source')?.textContent,
  css:document.querySelector('.crownlight-plot')?.getBoundingClientRect().width,svgVisible:getComputedStyle(document.querySelector('#hr-chart')).display}));
  console.log('CHART_DIAGNOSTIC',JSON.stringify({report,errors}));throw err;
 }
 assert.equal(await page.locator('.crownlight-shell').count(),1,'Real Lightweight Charts must mount in classroom');
 assert.equal(await page.locator('.hr-chart').isVisible(),false,'SVG fallback must not duplicate the real chart');
 await page.locator('#hr-timeframe').selectOption('5');
 assert.match(await page.locator('#hr-ohlcv').innerText(),/No completed bar/);
 await page.locator('#hr-timeframe').selectOption('1');
 assert.match(await page.locator('#hr-count').innerText(),/3 completed 1m/);
 await page.locator('#hr-review').evaluate(x=>{x.value='1';x.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.match(await page.locator('#hr-review-state').innerText(),/Reviewing previously/);
 assert.equal(cursor,2,'review UI must not change server cursor');
 await page.getByRole('button',{name:'Latest revealed'}).click();
 assert.match(await page.locator('#hr-talia-copy').innerText(),/most recently completed/);
 assert.equal(advancedBeforeLock,0,'No pre-lock server request');
 assert.deepEqual(errors,[]);
 await page.evaluate(()=>window.qaSignOut());
 await page.waitForFunction(()=>document.querySelector('#hr-count')?.textContent.startsWith('0 revealed'));
 assert.equal(await page.locator('#vr-session').isHidden(),true);
 console.log('PASS real Chromium with isolated fixture: case deep link, 1/3/5m aggregation, locked first decision, Talia, review, account cleanup.');
}finally{await browser.close();}
