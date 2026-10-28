/* Real Chromium layout and interaction; mocked Auth and API fixtures.
 * This test is TESTED (simulated providers), not genuine production login.
 */
import {chromium} from 'playwright';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {academyCatalog,academyByCode,ACADEMY_VERSION} from '../functions/_lib/bootcamp-academy-v014168.js';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const origin='https://free.fixture.test';
const userid='00000000-0000-4000-8000-000000000123';
const data={enrolled:false,progress:new Map(),watchlist:new Map()};
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
async function makePage(width,routeName){
 const context=await browser.newContext({viewport:{width,height:850}});
 await context.addInitScript(({userid})=>{
  const person={id:userid};
  window.getSupabaseClient=async()=>({auth:{
   getUser:async()=>({data:{user:person}}),
   getSession:async()=>({data:{session:{user:person,access_token:'FIXTURE_NOT_A_REAL_JWT'}}}),
   onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
  }});
 },{userid});
 const page=await context.newPage();
 const problems=[];page.on('pageerror',e=>problems.push(String(e.message||e)));
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url()),pathname=url.pathname;
  const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',
   body:JSON.stringify(body)});
  if(pathname==='/api/bootcamp-academy'){
   if(req.method()==='GET'&&url.searchParams.get('action')==='catalog')
    return fulfill({ok:true,version:ACADEMY_VERSION,programs:academyCatalog});
   if(req.method()==='GET'&&url.searchParams.get('program')==='free5')
    return fulfill({ok:true,version:ACADEMY_VERSION,program:academyByCode.free5,
     curriculum:academyByCode.free5.curriculum,progressAvailable:true,enrolled:data.enrolled,
     progress:[...data.progress.values()]});
   if(req.method()==='POST'){
    const b=req.postDataJSON();
    assert.equal(b.program,'free5','Never accidentally access paid Boot Camp from the Free test');
    if(b.action==='enroll'){data.enrolled=true;return fulfill({ok:true,program:'free5',enrolled:true});}
    const old=data.progress.get(b.day);
    if(b.action==='start'){
     const next=old||{day:b.day,status:'in_progress',revision:1,reflection:null};
     data.progress.set(b.day,next);
     return fulfill({ok:true,progress:{...next,graded:false,competencyMasteryAwarded:false,
      marketOutcomeClaimed:false}});
    }
    if(b.action==='save_reflection'){
     if((old?.revision||0)!==b.expectedRevision)
      return fulfill({ok:false,error:'Changed in another tab'},409);
     const next={day:b.day,status:'reflection_saved',revision:(old?.revision||0)+1,reflection:b.reflection};
     data.progress.set(b.day,next);
     return fulfill({ok:true,progress:{...next,graded:false,competencyMasteryAwarded:false,marketOutcomeClaimed:false}});
    }
   }
   return fulfill({ok:false,error:'unexpected route'},400);
  }
  if(pathname==='/api/free-watchlist'){
   if(req.method()==='GET')return fulfill({ok:true,entries:[...data.watchlist.values()],limit:20});
   const b=req.postDataJSON();
   if(b.action==='remove'){data.watchlist.delete(b.symbol);return fulfill({ok:true,removed:b.symbol});}
   const entry={symbol:b.symbol,status:b.status,sourceKind:b.sourceKind,
    researchNote:b.researchNote,sourceNote:b.sourceNote,updatedAt:'2026-10-26T00:00:00Z',
    createdAt:'2026-10-26T00:00:00Z'};
   data.watchlist.set(b.symbol,entry);
   return fulfill({ok:true,entry},b.action==='add'?201:200);
  }
  if(['/assets/js/site.js','/assets/js/session-manager.js','/assets/js/supabase-client.js','/config.js'].includes(pathname))
   return route.fulfill({status:200,contentType:'application/javascript',body:'// external connection mocked only in QA'});
  if(pathname==='/favicon.ico')return route.fulfill({status:404,body:''});
  const file=join(root,pathname.replace(/^\//,''));
  if(!file.startsWith(root+'/')||!existsSync(file))return route.fulfill({status:404,body:''});
  const ext=extname(file);
  return route.fulfill({status:200,contentType:ext==='.js'?'application/javascript':ext==='.css'?'text/css':ext==='.html'?'text/html':'text/plain',
   body:readFileSync(file)});
 });
 await page.goto(origin+'/'+routeName,{waitUntil:'domcontentloaded',timeout:30000});
 return {context,page,problems};
}
try{
 for(const width of [390,900,1280,1440]){
  data.enrolled=false;data.progress=new Map();
  const {context,page,problems}=await makePage(width,'bootcamp-academy.html?program=free5&day=1');
  await page.locator('#academy-course-title').waitFor({timeout:14000});
  assert.match(await page.locator('#academy-course-title').innerText(),/Free Foundations/);
  assert.equal(await page.locator('#academy-days .gu-bc-day').count(),5);
  assert.match(await page.locator('#academy-index-title').innerText(),/lessons/i);
  assert.match(await page.locator('#academy-stage-label').innerText(),/Lesson 1 of 5/i);
  assert.equal(await page.locator('.academy-free-stage-button').count(),9);
  assert.equal(await page.locator('.academy-free-stage:not([hidden])').count(),1);
  assert.equal(await page.locator('.academy-free-stage-button[aria-pressed=true]').count(),1);
  assert.match(await page.locator('#academy-objective').innerText(),/ownership|difference/i);
  assert.equal(await page.locator('#academy-enroll').isVisible(),!data.enrolled);
  await page.locator('#academy-days .gu-bc-day').nth(1).click();
  assert.equal(await page.locator('.academy-free-figure svg').count(),1);
  await page.locator('.academy-free-stage-button').nth(1).click();
  assert.equal(await page.locator('.academy-free-figure svg').isVisible(),true,'Fictional chart taught in Learn stage');
  await page.locator('.academy-free-stage-button').nth(4).click();
  await page.locator('.academy-free-stage textarea').filter({visible:true}).first().fill('I can describe the observed candle but I still cannot know what happens in the next interval.');
  await page.locator('.academy-free-stage button').filter({hasText:'Ask Talia for a hint'}).click();
  assert.match(await page.locator('.academy-free-figure figcaption').innerText(),/FICTIONAL/);
  await page.locator('#academy-days .gu-bc-day').first().click();
  await page.locator('.academy-free-stage-button').nth(5).click();
  await page.locator('#academy-self-check-answer').fill(
   'The last trade is a previous matched transaction, but I have not yet checked the bid, ask, quantity or fill uncertainty.');
  await page.locator('#academy-original-instruction button').filter({hasText:'Compare my reasoning'}).click();
  assert.equal(await page.locator('.academy-free-formative-note').count(),1);
  assert.match(await page.locator('.academy-free-formative-note').innerText(),/not a grade/i);
  if(!data.enrolled){await page.locator('#academy-enroll').click();await page.waitForFunction(()=>document.querySelector('#academy-enroll').hidden);}
  await page.locator('#academy-start').click();
  await page.waitForFunction(()=>document.querySelector('#academy-save-status')?.textContent.includes('started'));
  const note='FICTIONAL practice reflection: A last trade is not an executable quote, and I need the current source, bid, ask, available quantity and timestamp. I choose NO TRADE while the evidence is missing.';
  await page.locator('#academy-reflection').fill(note);
  await page.locator('#academy-save').click();
  await page.waitForFunction(()=>document.querySelector('#academy-save-status')?.textContent.toLowerCase().includes('saved'));
  assert.equal(data.progress.get(1)?.reflection,note);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#academy-course-title').waitFor();
  assert.equal(await page.locator('#academy-reflection').inputValue(),note,'persist across refreshed page');
  const check=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,width:innerWidth}));
  assert(check.scrollWidth<=check.width+8,'No horizontal overflow for '+width+'px '+JSON.stringify(check));
  assert.deepEqual(problems,[],'no browser exception '+width);
  console.log('PASS Free five self-paced nine-stage Talia lessons + private reflection/reload and FICTIONAL OHLC chart at '+width+'px.');
  await context.close();
 }
 for(const width of [390,900,1280,1440]){
  data.watchlist=new Map();
  const {context,page,problems}=await makePage(width,'free-watchlist.html');
  await page.locator('#free-watchlist-content').waitFor({state:'visible',timeout:14000});
  await page.locator('#free-watchlist-symbol').fill('GUSIM');
  await page.locator('#free-watchlist-status').selectOption('NO_TRADE');
  await page.locator('#free-watchlist-source-kind').selectOption('FICTIONAL');
  await page.locator('#free-watchlist-research-note').fill(
   'FICTIONAL research only. There is no confirmed exchange quote or executable liquidity. I will wait for evidence and choose NO TRADE.');
  await page.locator('#free-watchlist-save').click();
  await page.waitForFunction(()=>document.querySelector('#free-watchlist-count')?.textContent==='1 / 20');
  assert.match(await page.locator('#free-watchlist-list').innerText(),/GUSIM/);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#free-watchlist-content').waitFor({state:'visible'});
  assert.match(await page.locator('#free-watchlist-list').innerText(),/NO TRADE/);
  const check=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,width:innerWidth}));
  assert(check.scrollWidth<=check.width+8,'No watchlist overflow '+width+'px');
  assert.deepEqual(problems,[]);
  console.log('PASS Free member watchlist save/reload and source transparency at '+width+'px.');
  await context.close();
 }
}finally{await browser.close()}
