import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {academyCatalog,academyByCode,ACADEMY_VERSION} from '../functions/_lib/bootcamp-academy-v014168.js';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
assert(/^http:\/\/127\.0\.0\.1:\d+$/.test(base),'Only local Pages fixture is permitted');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const codes=['truth5','watchlist7','scanners10','charts45','risk60','practicum90'];
const reflection='I reviewed a documented source, its date and an available observation. I compared two interpretations, recorded which evidence was missing, and did not infer a future price or completed execution.';
const stub=[
 "window.__ACADEMY_UID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';",
 "window.__ACADEMY_CB=()=>{};",
 "window.getSupabaseClient=async()=>({auth:{",
 "getUser:async()=>({data:{user:{id:window.__ACADEMY_UID}}}),",
 "getSession:async()=>({data:{session:{user:{id:window.__ACADEMY_UID},access_token:'academy-fixture'}}}),",
 "onAuthStateChange:cb=>{window.__ACADEMY_CB=cb;return {data:{subscription:{unsubscribe(){}}}}}",
 "}});",
 "window.__ACADEMY_SWITCH=next=>{window.__ACADEMY_UID=next;",
 "window.__ACADEMY_CB('SIGNED_IN',{user:{id:next},access_token:'switched'});};"
].join('\n');
try{
 for(const width of [390,1280]){
  for(const code of width===390?['truth5','practicum90']:codes){
   const context=await browser.newContext({viewport:{width,height:930},
    serviceWorkers:'block',reducedMotion:'reduce'});
   const page=await context.newPage();const progress=new Map();let enrolled=false;
   const browserErrors=[];page.on('pageerror',e=>browserErrors.push(e.message));
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin!==base)return route.abort();
    if(url.pathname==='/assets/js/supabase-client.js')
     return route.fulfill({status:200,contentType:'application/javascript',body:stub});
    if(['/assets/js/site.js','/assets/js/session-manager.js'].includes(url.pathname))
     return route.fulfill({status:200,contentType:'application/javascript',body:'/* isolated auth fixture */'});
    if(url.pathname==='/api/bootcamp-academy'){
     const request=route.request();
     if(request.method()==='GET'){
      const requested=url.searchParams.get('program');
      const response=requested?
       {ok:true,version:ACADEMY_VERSION,program:academyByCode[requested],
        curriculum:academyByCode[requested].curriculum,
        progressAvailable:true,enrolled,progress:[...progress.values()]}:
       {ok:true,version:ACADEMY_VERSION,programs:academyCatalog};
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});
     }
     assert.equal(request.headers().authorization,'Bearer academy-fixture');
     const input=request.postDataJSON();
     assert.equal(input.program,code);assert.equal(input.version,ACADEMY_VERSION);
     if(input.action==='enroll'){
      assert.equal(input.day,0);enrolled=true;
      return route.fulfill({status:200,contentType:'application/json',
       body:JSON.stringify({ok:true,enrolled:true,program:code})});
     }
     const prior=progress.get(input.day),oldRev=prior?.revision||0;
     if(!enrolled||input.day<1||input.day>academyByCode[code].days||
       input.action==='save_reflection'&&input.expectedRevision!==oldRev)
      return route.fulfill({status:409,contentType:'application/json',
       body:JSON.stringify({ok:false,error:'Invalid progression or stale revision'})});
     const row={program:code,day:input.day,
      revision:oldRev+1,status:input.action==='start'?'in_progress':'reflection_saved',
      reflection:input.action==='save_reflection'?input.reflection:prior?.reflection||null};
     progress.set(input.day,row);
     return route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({ok:true,progress:row,disclaimer:'Saved ungraded self-report.'})});
    }
    return route.continue();
   });
   const response=await page.goto(base+'/bootcamp-academy.html?program='+code,{waitUntil:'domcontentloaded'});
   assert.equal(response?.status(),200);
   await page.locator('#academy-workspace:not([hidden])').waitFor({timeout:20000});
   assert.equal(await page.locator('.academy-program').count(),7);
   assert.equal(await page.locator('#academy-days .gu-bc-day').count(),academyByCode[code].days);
   assert.equal(await page.locator('#academy-course-title').innerText(),academyByCode[code].title);
   await page.locator('#academy-enroll').click();
   await page.waitForFunction(()=>document.querySelector('#academy-enroll')?.hidden===true);
   await page.locator('#academy-save').click();
   assert.match(await page.locator('#academy-save-status').innerText(),/80–2,000/);
   await page.locator('#academy-reflection').fill(reflection);
   await page.locator('#academy-save').click();
   await page.waitForFunction(()=>document.querySelector('#academy-member-progress')?.textContent.includes('1 of '));
   assert.equal(progress.get(1)?.reflection,reflection);
   await page.locator('#academy-days .gu-bc-day').last().click();
   await page.locator('#academy-days .gu-bc-day').first().click();
   assert.equal(await page.locator('#academy-reflection').inputValue(),reflection);
   await page.evaluate(()=>window.__ACADEMY_SWITCH('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'));
   await page.waitForFunction(()=>document.querySelector('#academy-workspace')?.hidden===true);
   assert.equal(await page.locator('#academy-reflection').inputValue(),'');
   assert.deepEqual(browserErrors,[]);
   console.log('PASS Academy '+code+' '+width+'px, '+academyByCode[code].days+' days; private enrollment, progress and account switching');
   await context.close();
  }
 }
}finally{await browser.close()}
