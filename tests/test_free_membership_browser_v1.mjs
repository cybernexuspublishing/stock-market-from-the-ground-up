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
  const library=page.locator('#academy-free-knowledge');
  await library.locator('details').first().waitFor({timeout:14000});
  assert.equal(await library.locator('details').count(),12,'Every Free member receives all 12 core knowledge topics');
  assert.equal(await library.locator('a[href^="https://"]').count(),12,'Every topic links to its first-party regulatory source');
  await library.locator('details').first().locator('summary').click();
  const independent=library.locator('details').first();
  const compare=independent.getByRole('button',{name:'Compare with Talia’s explanation'});
  assert.equal(await compare.isDisabled(),true,'Worked feedback must follow member reasoning');
  await independent.getByRole('textbox',{name:/Your answer to/}).fill('First I would identify the goal, time horizon, and whether funds are required for essential living expenses before considering any risk.');
  await compare.click();
  assert.equal(await independent.locator('.gu-free-reference-review').isVisible(),true);
  assert.match(await independent.innerText(),/Nothing was scored or saved/);
  await independent.locator('summary').click();
  assert.equal(await page.locator('#academy-days .gu-bc-day').count(),5);
  assert.match(await page.locator('#academy-index-title').innerText(),/lessons/i);
  assert.match(await page.locator('#academy-stage-label').innerText(),/Lesson 1 of 5/i);
  assert.equal(await page.locator('.academy-free-stage-button').count(),9);
  assert.equal(await page.locator('.academy-free-stage:not([hidden])').count(),1);
  assert.equal(await page.locator('.academy-free-stage-button[aria-pressed=true]').count(),1);
  // The instructor-led classroom keeps goals in a disclosure until requested.
  await page.locator('.academy-classroom-briefing > summary').click();
  assert.equal(await page.locator('.academy-classroom-briefing').getAttribute('open'),'',
   'Members must be able to expand the lesson briefing');
  assert.match(await page.locator('#academy-objective').innerText(),/ownership|difference/i);
  assert.equal(await page.locator('#academy-enroll').isVisible(),!data.enrolled);
  // Each Free lesson now uses the Lab-inspired fictional teaching studio,
  // without exposing a paid Lab, private assessment or broker order.
  const correctByLesson=[2,1,1,1,1];
  for(let lesson=1;lesson<=5;lesson++){
   await page.locator('#academy-days .gu-bc-day').nth(lesson-1).click();
   await page.locator('.academy-free-stage-button').nth(2).click();
   const studio=page.locator('.academy-free-studio');
   assert.equal(await studio.count(),1,'Every Free day gets an interactive worked example');
   assert.match(await studio.innerText(),/FICTIONAL TEACHING DATA/);
   const slider=studio.locator('input[type=range]');
   const before=await studio.locator('.academy-studio-main').innerText();
   await slider.evaluate(input=>{
    input.value=input.value===input.min?input.max:input.min;
    input.dispatchEvent(new Event('input',{bubbles:true}));
   });
   assert.notEqual(await studio.locator('.academy-studio-main').innerText(),before,
    'Changing evidence must update the worked example for Lesson '+lesson);
   if(lesson===2)assert(
    await studio.locator('svg[role=img], .academy-free-echarts-host .gu-echarts-lesson').count()>=1,
    'Fictional candle must retain an ECharts or accessible SVG visual learning example');
   // Every Free lesson now includes a separate replay-setup style rehearsal.
   await page.locator('.academy-free-stage-button').nth(3).click();
   const setup=page.locator('.academy-lab-rehearsal:visible');
   assert.equal(await setup.count(),1,'Every Free lesson rehearses the Lab setup method');
   assert.match(await setup.innerText(),/Original fictional educational example/);
   const lock=setup.getByRole('button',{name:'Lock my observation and see Talia’s review'});
   assert.equal(await lock.isDisabled(),true,'Reasoning must precede the worked review');
   await setup.getByRole('textbox',{name:'Your independent fictional replay decision'})
    .fill('This is only fictional evidence. I would document the visible facts, verify the missing source information, and avoid assuming future candles.');
   await lock.click();
   assert.equal(await setup.locator('.academy-lab-review').isVisible(),true);
   assert.match(await setup.locator('.academy-lab-review').innerText(),/not a pass, official assessment/);
   await page.locator('.academy-free-stage-button').nth(4).click();
   const challenge=page.locator('.academy-studio-challenge');
   assert.equal(await challenge.count(),1,'Every Free day has an independent ungraded choice');
   await challenge.locator('input[type=radio]').nth(correctByLesson[lesson-1]).check();
   await challenge.getByRole('button',{name:'Check my reasoning (ungraded)'}).click();
   assert.match(await challenge.locator('[role=status]').innerText(),/does not award mastery/);
   await challenge.getByRole('button',{name:'Teach this another way'}).click();
   assert.match(await challenge.locator('[role=status]').innerText(),/Talia:/);
   await challenge.getByRole('button',{name:'Try another example'}).click();
   assert.equal(await challenge.getByRole('button',{name:'Check my reasoning (ungraded)'}).isDisabled(),true);
   await page.locator('.academy-free-stage-button').nth(8).click();
   assert.match(await page.locator('.academy-studio-preview').innerText(),/Basic Historical Replay Setup/);
   assert.equal(await page.locator('.academy-studio-preview a[href="labs.html"]').count(),1);
   const value=page.locator('.academy-lab-value-preview:visible');
   assert.equal(await value.count(),1);
   assert.equal(await value.locator('article').count(),4);
   assert.match(await value.innerText(),/Historical replay/);
   assert.equal(await value.locator('a[href="membership.html"]').count(),1);
  }
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
  await page.locator('.cl-talia-workspace .cl-talia-chart-card').waitFor({state:'visible',timeout:14000});
  const geometry=await page.evaluate(()=>{
   const lesson=document.querySelector('.cl-talia-workspace .cl-talia-lesson').getBoundingClientRect();
   const chart=document.querySelector('.cl-talia-workspace .cl-talia-chart-card').getBoundingClientRect();
   return {lesson:{x:lesson.x,y:lesson.y,right:lesson.right,bottom:lesson.bottom},
    chart:{x:chart.x,y:chart.y,right:chart.right},viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth};
  });
  if(width>=1280){
   assert(geometry.chart.x>=geometry.lesson.right-3,'Desktop instruction and ECharts must be side by side '+width+' '+JSON.stringify(geometry));
   assert(Math.abs(geometry.chart.y-geometry.lesson.y)<12,'Chart and explanation start on same row '+width);
  }else{
   assert(geometry.chart.y>=geometry.lesson.bottom-4,'Small screen uses reading-order stacking '+width);
  }
  assert(geometry.scrollWidth<=width+8,'No horizontal overflow in updated research classroom '+width);
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
