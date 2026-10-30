/* Simulator chart/workbench overlap and provider error path regression.
 * Actual simulator HTML/CSS/JS in isolated Chromium, no real sessions,
 * provider calls, payments, orders or database writes.
 */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const origin='https://simulator-layout-qa.test';
const source=readFileSync(join(root,'simulator.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const uid='11111111-1111-4111-8111-111111111111';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [1728,1280,920,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[],providerRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.origin!==origin)return route.abort();
   if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:source});
   if(u.pathname==='/api/member-tool-access')return route.fulfill({contentType:'application/json',body:JSON.stringify({
    ok:true,authorized:true,freeEligible:true,reason:'Fixture premium member'})});
   if(u.pathname==='/api/simulator-lab-context')return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,labs:[]})});
   if(u.pathname.startsWith('/api/')){providerRequests.push(u.pathname);return route.fulfill({status:403,body:'Forbidden',contentType:'text/plain'})}
   const filename=resolve(root,u.pathname.slice(1));
   if(!filename.startsWith(root+'/')||!existsSync(filename))return route.fulfill({status:404,body:'Not found'});
   const type=extname(filename)==='.css'?'text/css':extname(filename)==='.js'?'application/javascript':'text/plain';
   return route.fulfill({contentType:type,body:readFileSync(filename)});
  });
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await page.evaluate(id=>{
   document.getElementById('sim-legacy-mode').hidden=false;
   document.getElementById('sim-server-mode').hidden=true;
   window.getSupabaseClient=async()=>({auth:{
    getUser:async()=>({data:{user:{id}}}),
    getSession:async()=>({data:{session:{user:{id},access_token:'fixture-token'}}}),
    onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
   }});
  },uid);
  await page.addScriptTag({path:join(root,'assets/js/crownlight-simulator-layout-v3.js')});
  await page.addScriptTag({path:join(root,'assets/js/simulator.js')});
  await page.evaluate(()=>window.dispatchEvent(new Event('groundup:activate-legacy-simulator')));
  await page.waitForFunction(()=>document.querySelector('#cl-simulator-workbench')&&
   !document.getElementById('sim-content').hidden);
  const workbench=page.locator('#cl-simulator-workbench');
  await workbench.evaluate(e=>{
   const panel=e.querySelector('#cl-panel-plan');
   panel.style.minHeight='920px'; // taller than adjacent chart, matching screenshot.
  });
  await page.waitForTimeout(80);
  let box=await page.evaluate(()=>{
   const rect=id=>document.querySelector(id).getBoundingClientRect();
   const a=rect('#cl-simulator-workbench'),s=rect('#cl-replay-import'),
    chart=rect('#sim-content > .sim-layout');
   const top=document.querySelector('#cl-simulator-workbench');
   return {workbenchBottom:a.bottom,sourceTop:s.top,workbenchTop:a.top,chartBottom:chart.bottom,
    workbenchPosition:getComputedStyle(top).position,
    scrollWidth:document.documentElement.scrollWidth,
    viewport:document.documentElement.clientWidth};
  });
  assert.equal(box.workbenchPosition,'static','Workbench must stay in grid flow: '+JSON.stringify(box));
  assert(box.sourceTop>=box.workbenchBottom-2,
   'Data source must begin below the entire tall workbench: '+JSON.stringify(box));
  if(width<=1250)assert(box.sourceTop>=box.chartBottom-2,'Stacked workbench must follow chart');
  await page.locator('#sim-start-date').scrollIntoViewIfNeeded();
  const after=await page.evaluate(()=>{
   const w=document.querySelector('#cl-simulator-workbench').getBoundingClientRect();
   const s=document.querySelector('#cl-replay-import').getBoundingClientRect();
   return {workbenchBottom:w.bottom,sourceTop:s.top,
    position:getComputedStyle(document.querySelector('#cl-simulator-workbench')).position};
  });
  assert(after.sourceTop>=after.workbenchBottom-2,
   'Workbench must not follow the viewport across source fields: '+JSON.stringify(after));
  if(width===1728){
   await page.locator('#sim-source').selectOption('alpaca');
   await page.locator('#sim-ticker').fill('aapl');
   await page.locator('#sim-start-date').fill('');
   await page.locator('#sim-end-date').fill('');
   await page.locator('#load-provider').click();
   assert.match(await page.locator('#sim-load-msg').innerText(),/context start date and context end date/);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'sim-start-date');
   assert.equal(await page.locator('#cl-replay-import details.cl-workbench-import').evaluate(e=>e.open),true);
   await page.locator('#sim-start-date').fill('2024-05-08');
   await page.locator('#sim-end-date').fill('2024-05-07');
   await page.locator('#load-provider').click();
   assert.match(await page.locator('#sim-load-msg').innerText(),/end date cannot be before the start date/i);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'sim-end-date');
   assert.equal(providerRequests.length,0,'Invalid dates must never call personal data provider');
  }
  assert.deepEqual(errors,[],'No browser errors at '+width+'px: '+errors.join('; '));
  await page.close();
 }
 console.log('PASS simulator workbench: no sticky source overlap at desktop/tablet/mobile, missing-date focused correction, invalid range prevented and zero provider calls.');
}finally{await browser.close()}
