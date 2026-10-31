/* v0.14.0.144 Browser fixture: original local site build, mocked member
 * provider. No network, payments, fake stock market bars or real identities.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {bootcampCurriculumV014144} from '../functions/_lib/bootcamp-curriculum-v014144.js';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Only local static fixtures are permitted.');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:850},serviceWorkers:'block',reducedMotion:'reduce'});
  const page=await context.newPage();
  const progress=new Map();
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin!==base)return route.abort();
   if(u.pathname==='/assets/js/supabase-client.js'){
    return route.fulfill({status:200,contentType:'application/javascript',
     body:`window.__GU_BC_TEST_MEMBER='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
window.__GU_BC_TEST_CB=()=>{};
window.getSupabaseClient=async()=>({auth:{
 getUser:async()=>({data:{user:{id:window.__GU_BC_TEST_MEMBER}}}),
 getSession:async()=>({data:{session:{user:{id:window.__GU_BC_TEST_MEMBER},access_token:'local-browser-fixture'}}}),
 onAuthStateChange:fn=>{window.__GU_BC_TEST_CB=fn;return {data:{subscription:{unsubscribe(){}}}}}
}});
window.__GU_BC_SWITCH=(id)=>{window.__GU_BC_TEST_MEMBER=id;window.__GU_BC_TEST_CB('SIGNED_IN',{user:{id},access_token:'different-token'})};`});
   }
   if(u.pathname==='/assets/js/session-manager.js'||u.pathname==='/assets/js/site.js')
    return route.fulfill({status:200,contentType:'application/javascript',body:'/* local auth fixture only */'});
   if(u.pathname==='/api/bootcamp'){
    const req=route.request();
    if(req.method()==='GET')return route.fulfill({status:200,contentType:'application/json',
     body:JSON.stringify({ok:true,curriculum:bootcampCurriculumV014144,
       progressAvailable:true,progress:[...progress.values()],error:null})});
    const b=req.postDataJSON();
    assert.equal(req.headers().authorization,'Bearer local-browser-fixture');
    if(!Number.isInteger(b.day)||b.day<1||b.day>30)return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({ok:false,error:'invalid'})});
    const previous=progress.get(b.day),revision=(previous?.revision||0);
    if(b.action==='save_reflection'&&b.expectedRevision!==revision)
     return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({ok:false,error:'Outdated note'})});
    const row={day:b.day,revision:revision+(b.action==='start'&&previous?0:1),
      reflection:b.action==='save_reflection'?b.reflection:previous?.reflection||null,
      status:b.action==='save_reflection'?'reflection_saved':previous?.status||'in_progress'};
    progress.set(b.day,row);
    return route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({ok:true,progress:row,disclaimer:'Private ungraded reflection saved.'})});
   }
   return route.continue();
  });
  const response=await page.goto(base+'/bootcamp.html',{waitUntil:'domcontentloaded'});
  assert.equal(response?.status(),200);
  await page.locator('#gu-bc-shell:not([hidden])').waitFor({timeout:20000});
  assert.equal(await page.locator('.gu-bc-day').count(),30,'All thirty days must be interactive');
  const layout=await page.evaluate(()=>{
   const area=document.querySelector('#gu-bc-shell');
   const nav=area.querySelector(':scope>.gu-bc-index');
   const lesson=area.querySelector(':scope>.gu-bc-lesson');
   const row=document.querySelector('#gu-bc-days');
   const r=e=>e.getBoundingClientRect();
   return {scoped:document.body.classList.contains('gu-teaching-wide'),
    viewport:innerWidth,columns:getComputedStyle(area).gridTemplateColumns.split(' ').filter(Boolean).length,
    width:r(area).width,navEnd:r(nav).bottom,lessonStart:r(lesson).top,
    scroller:getComputedStyle(row).overflowX,documentWidth:document.documentElement.scrollWidth};
  });
  assert(layout.scoped&&layout.columns===1,
    '30-day Boot Camp must use full-width single teaching column: '+JSON.stringify(layout));
  assert(layout.width>=width*.82,
    '30-day Boot Camp layout does not occupy the page: '+JSON.stringify(layout));
  assert(layout.navEnd<=layout.lessonStart+3,
    '30-day navigation must be above the lesson, not alongside it: '+JSON.stringify(layout));
  assert(['auto','scroll'].includes(layout.scroller),
    'Long 30-day navigation must remain scrollable: '+JSON.stringify(layout));
  assert(layout.documentWidth<=width+4,
    'Boot Camp layout cannot create horizontal viewport overflow: '+JSON.stringify(layout));

  assert.equal((await page.locator('#gu-bc-title').innerText()).trim(),bootcampCurriculumV014144.days[0].title);
  await page.locator('.gu-bc-day').nth(29).focus();
  await page.keyboard.press('Enter');
  assert.equal((await page.locator('#gu-bc-title').innerText()).trim(),bootcampCurriculumV014144.days[29].title);
  assert.equal(await page.locator('#gu-bc-skills a').count(),bootcampCurriculumV014144.days[29].competencies.length);
  assert((await page.locator('#gu-bc-labs a').count())>=2);
  await page.locator('#gu-bc-save').click();
  assert.match(await page.locator('#gu-bc-save-status').innerText(),/80–2,000/);
  const reflection='I reviewed an official timestamp and compared it with permitted historical context. I cannot infer actual order fills, future prices, individual profitability, or a verified competency result from this observation.';
  await page.locator('#gu-bc-note').fill(reflection);
  await page.locator('#gu-bc-save').click();
  await page.waitForFunction(()=>document.querySelector('#gu-bc-metric strong')?.textContent==='1 / 30');
  await page.locator('.gu-bc-day').first().click();
  await page.locator('.gu-bc-day').last().click();
  assert.equal(await page.locator('#gu-bc-note').inputValue(),reflection,'Member private reflection persists within the session');
  await page.evaluate(()=>window.__GU_BC_SWITCH('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'));
  await page.waitForFunction(()=>document.querySelector('#gu-bc-shell')?.hidden===true);
  assert.equal(await page.locator('#gu-bc-note').inputValue(),'','Switching accounts must scrub private member data');
  await context.close();
  console.log('PASS v144 browser: '+width+'px, all 30 days, keyboard entry, genuine saved reflection UX, member switch privacy');
 }
}finally{await browser.close()}
