import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {academyCatalog,academyByCode,ACADEMY_VERSION} from '../functions/_lib/bootcamp-academy-v014168.js';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
assert(/^http:\/\/127\.0\.0\.1:\d+$/.test(base),'Only local Pages fixture is permitted');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const codes=['truth5','watchlist7','scanners10','charts45','risk60','practicum90'];
const reflection='I reviewed a documented source, its date and an available observation. I compared two interpretations, recorded which evidence was missing, and did not infer a future price or completed execution.';
const originalReasoning='The screenshot only proves an assertion was made. I would verify the issuer, document, publication time and source independently.';
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
 for(const width of [390,900,1280,1440]){
  for(const code of [390,900,1440].includes(width)?['truth5','practicum90']:codes){
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
     const row=input.action==='start'&&prior?prior:{program:code,day:input.day,
      revision:oldRev+1,status:input.action==='start'?'in_progress':'reflection_saved',
      reflection:input.action==='save_reflection'?input.reflection:null};
     progress.set(input.day,row);
     return route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({ok:true,progress:row,disclaimer:'Saved ungraded self-report.'})});
    }
    return route.continue();
   });
   const response=await page.goto(base+'/bootcamp-academy.html?program='+code,{waitUntil:'domcontentloaded'});
   assert.equal(response?.status(),200);
   await page.locator('#academy-workspace:not([hidden])').waitFor({timeout:20000});
   assert.equal(await page.locator('.academy-program').count(),0,
    'A direct program route must not require loading the separate Academy catalog');
   assert.equal(await page.locator('#academy-program-list').isHidden(),true,
    'Selected program navigation must open the learning workspace, not the program cards');
   assert.equal(await page.locator('.academy-free-entry').isHidden(),true);
   assert.equal(await page.locator('.academy-return-bar a').getAttribute('href'),'bootcamp-academy.html');
   await page.waitForFunction(()=>document.activeElement?.id==='academy-course-title');
   assert.equal(await page.locator('#academy-workspace').isVisible(),true);
   assert.equal(await page.locator('#academy-days .gu-bc-day').count(),academyByCode[code].days);
   assert.equal(await page.locator('#academy-course-title').innerText(),academyByCode[code].title);
   if(code==='truth5'){
    const section=page.locator('#academy-original-instruction');
    await section.waitFor({state:'visible'});
    assert.equal(await section.locator('ol li').count(),academyByCode.truth5.curriculum[0].lesson.sourceProcedure.length);
    assert.match(await section.innerText(),/FICTIONAL:/,'Working cases must be identified as invented');
    assert.match(await section.innerText(),/Independent evidence investigation/);
    assert.match(await section.innerText(),/lookalike domain/,'Day 1 must include an independent source-identity case');
    const answer=page.locator('#academy-self-check-answer');
    const compare=section.getByRole('button',{name:'Compare my reasoning'});
    assert.equal(await compare.isDisabled(),true,'Do not reveal the coaching answer before a written learner attempt');
   
    await answer.fill(originalReasoning);
    assert.equal(await compare.isEnabled(),true);
    assert.match(await page.locator('#academy-days .gu-bc-day').first().innerText(),/unsaved local work/);
    await compare.click();
    assert.match(await section.innerText(),/NOT a protected grading rubric, automated score or proof of mastery/,
      'Formative reasoning review must not award or imply independent mastery');
    await page.locator('#academy-days .gu-bc-day').nth(1).click();
    assert.match(await section.innerText(),/SEC EDGAR/,'Day 2 must teach a substantively different source skill');
    assert.match(await section.innerText(),/unaudited quarterly/,'Day 2 must include separate audited-versus-forward-looking investigation');
    assert.equal(await page.locator('#academy-self-check-answer').inputValue(),'','A different question must not inherit another day’s private reasoning');
    await page.locator('#academy-self-check-answer').fill('Day two requires independent filing verification and a separate report period.');
    await page.locator('#academy-days .gu-bc-day').first().click();
    assert.match(await section.innerText(),/widely shared screenshot/);
    assert.equal(await page.locator('#academy-self-check-answer').inputValue(),originalReasoning,
     'Returning to a day in the same member session must not destroy an unsaved answer');
    assert.equal(await compare.isEnabled(),true);
    const bounds=await section.boundingBox();
    assert(bounds&&bounds.x>=-1&&bounds.x+bounds.width<=width+1,
     'The full teaching panel must fit inside the '+width+'px viewport');
    assert.match(await section.innerText(),/not graded mastery/);
    await page.locator('#academy-self-check-answer').focus();
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'academy-self-check-answer',
     'The self-check must be reachable by keyboard focus');
   }
   await page.locator('#academy-enroll').click();
   await page.waitForFunction(()=>document.querySelector('#academy-enroll')?.hidden===true);
   assert.match(await page.locator('#academy-save-status').innerText(),/No study reflection has been saved yet/,
    'Enrollment alone cannot claim notes are persisted');
   await page.locator('#academy-save').click();
   assert.match(await page.locator('#academy-save-status').innerText(),/80–2,000/);
   const unsaved='I recorded the source and timestamp but have not finished my analysis. This draft must stay visible while moving between days; it is not recorded on the server.';
   await page.locator('#academy-reflection').fill(unsaved);
   await page.locator('#academy-days .gu-bc-day').nth(1).click();
   await page.locator('#academy-days .gu-bc-day').first().click();
   assert.equal(await page.locator('#academy-reflection').inputValue(),unsaved,
    'Switching study days must never destroy an unsaved reflection draft');
   assert.match(await page.locator('#academy-save-status').innerText(),/Unsaved reflection draft/);
   assert.equal(progress.size,0,'Unsaved draft must never become server progress');
   let storedReflection=reflection;
   if(code==='truth5'){
    const answer=page.locator('#academy-self-check-answer');
    const copy=page.getByRole('button',{name:'Add reasoning to my private reflection'});
    // The same-session Day 1 draft was deliberately retained across navigation.
    assert.equal(await answer.inputValue(),originalReasoning,
     'The original unsaved reasoning must survive a day switch');
    assert.equal(await copy.isEnabled(),true,
     'A restored sufficiently long draft must remain copyable');
    await copy.click();
    storedReflection=await page.locator('#academy-reflection').inputValue();
    assert.match(storedReflection,/Independent self-check \(ungraded\)/);
    assert.match(await page.locator('#academy-original-instruction').innerText(),/NOT saved yet/);
    assert.equal(progress.size,0,'Copying a local draft must never manufacture saved member progress');
   }else{
    await page.locator('#academy-reflection').fill(reflection);
   }
   await page.locator('#academy-save').click();
   await page.waitForFunction(()=>document.querySelector('#academy-member-progress')?.textContent.includes('1 of '));
   assert.equal(progress.get(1)?.reflection,storedReflection);
   const savedRevision=progress.get(1)?.revision;
   await page.locator('#academy-start').click();
   await page.waitForFunction(()=>document.querySelector('#academy-save-status')?.textContent.includes('previously saved reflection remains recorded'));
   assert.equal(progress.get(1)?.revision,savedRevision,'Idempotent Start must not overwrite saved evidence');
   assert.equal(progress.get(1)?.reflection,storedReflection,'Start must not wipe prior saved notes');
   await page.locator('#academy-days .gu-bc-day').last().click();
   await page.locator('#academy-days .gu-bc-day').first().click();
   assert.equal(await page.locator('#academy-reflection').inputValue(),storedReflection);
   // A new page load should recover ONLY server-persisted work, not a fabricated
   // browser completion. This remains a mocked API, not a live member proof.
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#academy-workspace:not([hidden])').waitFor({timeout:20000});
   if(code==='truth5'){
    assert.equal(await page.locator('#academy-self-check-answer').inputValue(),'',
     'Local ungraded self-check drafts must not persist or leak after page reload');
    assert.equal(await page.getByRole('button',{name:'Add reasoning to my private reflection'}).isDisabled(),true);
   }
   assert.equal(await page.locator('#academy-reflection').inputValue(),storedReflection,
    'Reload must restore the exact existing private saved reflection');
   assert.match(await page.locator('#academy-member-progress').innerText(),/1 of /);
   assert.equal(progress.get(1)?.reflection,storedReflection,'Reload cannot modify server progress');
   const newUnsaved='This is a newer, not-yet-persisted answer. It must survive a local day switch but must never carry over to a different member account.';
   await page.locator('#academy-reflection').fill(newUnsaved);
   await page.locator('#academy-days .gu-bc-day').nth(1).click();
   await page.locator('#academy-days .gu-bc-day').first().click();
   assert.equal(await page.locator('#academy-reflection').inputValue(),newUnsaved);
   assert.equal(progress.get(1)?.reflection,storedReflection,'New unsaved content cannot overwrite persisted record');
   // Simulate an independent concurrent revision. This request must fail
   // closed, retain the unsaved current draft, and never claim it was saved.
   progress.set(1,{...progress.get(1),revision:progress.get(1).revision+1});
   await page.locator('#academy-save').click();
   await page.waitForFunction(()=>document.querySelector('#academy-save-status')?.textContent.includes('stale revision'));
   assert.equal(await page.locator('#academy-reflection').inputValue(),newUnsaved,
    'An optimistic-lock conflict must retain the member-written unsaved draft');
   assert.notEqual(progress.get(1)?.reflection,newUnsaved,
    'Rejected save cannot falsify persisted content');
   await page.evaluate(()=>window.__ACADEMY_SWITCH('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'));
   await page.waitForFunction(()=>document.querySelector('#academy-workspace')?.hidden===true);
   assert.equal(await page.locator('#academy-reflection').inputValue(),'');
   assert.equal(await page.locator('#academy-days .gu-bc-day').count(),0,
    'Previous member day navigator must be destroyed, even inside hidden workspace');
   assert.equal(await page.locator('#academy-day-title').innerText(),'',
    'Previous member lesson heading must not survive an account switch');
   assert.equal(await page.locator('#academy-related').locator('a').count(),0,
    'Previous member related Lab navigation must be destroyed');
   if(code==='truth5'){
    assert.equal(await page.locator('#academy-self-check-answer').count(),0,
     'Private ungraded answers must be removed from DOM after switching members');
    assert.equal(await page.locator('#academy-days .gu-bc-day').filter({hasText:'unsaved local work'}).count(),0,
     'Previous account drafts must never appear in a new member session');
   }
   assert.deepEqual(browserErrors,[]);
   console.log('PASS Academy '+code+' '+width+'px, '+academyByCode[code].days+' days; private enrollment, progress and account switching');
   await context.close();
  }
 }
 // Regression: Free Foundations opens even if the public catalog endpoint
 // fails. Browser/auth fixtures are not equivalent to authenticated live QA.
 {
  const context=await browser.newContext({viewport:{width:390,height:840},
   serviceWorkers:'block',reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin!==base)return route.abort();
   if(url.pathname==='/assets/js/supabase-client.js')
    return route.fulfill({status:200,contentType:'application/javascript',body:stub});
   if(['/assets/js/site.js','/assets/js/session-manager.js'].includes(url.pathname))
    return route.fulfill({status:200,contentType:'application/javascript',body:'/* isolated auth fixture */'});
   if(url.pathname==='/api/bootcamp-academy'){
    if(url.searchParams.get('program')==='free5')
     return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      ok:true,version:ACADEMY_VERSION,program:academyByCode.free5,
      curriculum:academyByCode.free5.curriculum,progressAvailable:true,
      enrolled:false,progress:[]})});
    return route.fulfill({status:503,contentType:'application/json',
     body:JSON.stringify({ok:false,error:'Catalog is intentionally unavailable'})});
   }
   return route.continue();
  });
  await page.goto(base+'/bootcamp-academy.html?program=free5',{waitUntil:'domcontentloaded'});
  await page.locator('#academy-workspace:not([hidden])').waitFor({timeout:20000});
  assert.equal(await page.locator('#academy-days .gu-bc-day').count(),5);
  assert.equal(await page.locator('#academy-program-list').isHidden(),true);
  assert.equal(await page.locator('.academy-free-entry').isHidden(),true);
  await page.waitForFunction(()=>document.activeElement?.id==='academy-course-title');
  assert.match(await page.locator('main h1').innerText(),/Free Foundations/);
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('PASS Free Foundations deep link opens without catalog dependency');
 }
 // Concurrent enrollment must not allow an old member's server reply to
 // relabel a newly signed-in account as enrolled or restore old private notes.
 const context=await browser.newContext({viewport:{width:1280,height:900},
  serviceWorkers:'block',reducedMotion:'reduce'});
 const page=await context.newPage();
 const code='truth5';
 let release=null;
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==base)return route.abort();
  if(url.pathname==='/assets/js/supabase-client.js')
   return route.fulfill({status:200,contentType:'application/javascript',body:stub});
  if(['/assets/js/site.js','/assets/js/session-manager.js'].includes(url.pathname))
   return route.fulfill({status:200,contentType:'application/javascript',body:'/* isolated auth fixture */'});
  if(url.pathname==='/api/bootcamp-academy'){
   if(route.request().method()==='GET'){
    const requested=url.searchParams.get('program');
    const result=requested
     ?{ok:true,version:ACADEMY_VERSION,program:academyByCode[code],
       curriculum:academyByCode[code].curriculum,
       progressAvailable:true,enrolled:false,progress:[]}
     :{ok:true,version:ACADEMY_VERSION,programs:academyCatalog};
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
   }
   const input=route.request().postDataJSON();assert.equal(input.action,'enroll');
   await new Promise(resolve=>{release=resolve});
   return route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({ok:true,enrolled:true,program:code})});
  }
  return route.continue();
 });
 await page.goto(base+'/bootcamp-academy.html?program='+code,{waitUntil:'domcontentloaded'});
 await page.locator('#academy-workspace:not([hidden])').waitFor({timeout:20000});
 await page.locator('#academy-enroll').click();
 await page.waitForFunction(()=>document.querySelector('#academy-enroll')?.disabled===true);
 for(let i=0;i<40&&!release;i++)await new Promise(resolve=>setTimeout(resolve,25));
 assert.equal(typeof release,'function','Enrollment POST must be in flight before the account switch');
 await page.evaluate(()=>window.__ACADEMY_SWITCH('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'));
 await page.waitForFunction(()=>document.querySelector('#academy-workspace')?.hidden===true);
 assert.equal(await page.locator('#academy-reflection').inputValue(),'');

 const response=page.waitForResponse(r=>r.url().includes('/api/bootcamp-academy')&&r.request().method()==='POST');
 release();await response;
 await page.waitForTimeout(75);
 assert.equal(await page.locator('#academy-workspace').getAttribute('hidden'),'');
 assert.equal(await page.locator('#academy-save-status').innerText(),'');
 assert.equal(await page.locator('#academy-reflection').inputValue(),'');
 assert.deepEqual(errors,[],'Enrollment reply must be harmless after account switch');
 console.log('PASS Academy delayed previous-member enrollment cannot contaminate a new member session');
 await context.close();
}finally{await browser.close()}
