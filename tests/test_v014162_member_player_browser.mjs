/* Local source-only authenticated API mock: NEVER connects to Supabase. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Only local fixture allowed');
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
const payload={ok:true,guidedAllowed:true,advancedAllowed:true,sourceStatus:'canonical_registry_safe_orientation_only',
 lab:{id:'SITE-001',book:6,bookCode:'SITE_EXCLUSIVE',concept:'Observe a risk plan',chapter:0,chapterTitle:'Site-Exclusive Labs',
 goal:'Describe visible risk evidence at the observation boundary',ticker:'',date:'',timeframe:'',
 practiceSteps:['Observe only permitted data.','Record one clear invalidation.'],beforeAdvance:[],skill:'INDEPENDENT_PLAN',
 teaching:{what:'Define risk before an entry.',why:'The loss limit needs an invalidation.',when:'Before choosing size.',
  questions:['What happens when the stop widens?']}}};
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  const page=await context.newPage();const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin!==base)return route.abort();
   if(url.pathname==='/assets/js/supabase-client.js')
    return route.fulfill({status:200,contentType:'application/javascript',body:
      'window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:{access_token:"member.mock.access"}}}),getUser:async()=>({data:{user:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}});'});
   if(url.pathname==='/assets/js/access.js')
    return route.fulfill({status:200,contentType:'application/javascript',body:
      'window.SiteAccess={SAMPLE_LABS:new Set(),get:async()=>({user:null,sb:null,isMember:false,redeemedBooks:new Set()}),canGuided:()=>false,canAdvanced:()=>false};'});
   if(url.pathname==='/api/lab-content'){requests.push('private');return route.fulfill({status:width===390?503:404,contentType:'application/json',body:width===390?'{"ok":false,"error":"Private backend unavailable"}':'{"ok":false,"error":"Not loaded"}'});}
   if(url.pathname==='/api/lab-player-context'){requests.push('registry');return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});}
   return route.continue();
  });
  await page.goto(base+'/lab-player.html?lab=SITE-001',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Start Guided Learning →'}).waitFor({timeout:15000});
  const siteHeader=page.locator('body.gu-lab-member > header.site-header');
  assert.equal(await siteHeader.count(),1,'Lab must retain one canonical website header');
  assert.equal(await siteHeader.locator('.brand').getAttribute('href'),'index.html','Site logo must navigate home');
  assert.equal(await siteHeader.locator('.navlinks a[href="market-commons.html"]').count(),1,'Market Commons remains in site navigation');
  assert.equal(await siteHeader.locator('.navlinks a[href="store.html"]').count(),1,'Store remains in site navigation');
  assert.equal(await page.locator('nav.gu-lab-breadcrumb a[href="labs.html"]').count(),1,'Learner can return to the Lab Registry');
  assert.equal(await page.locator('#app .stage-item').count(),9,'Main website header must not replace learning stages');
  const headerBox=await siteHeader.boundingBox(),workstationBox=await page.locator('#app .shell').boundingBox();
  assert(headerBox&&workstationBox&&workstationBox.y>=headerBox.y+headerBox.height-2,'Lab workstation must remain below the site header');
  if(width>=901)assert.equal(await siteHeader.locator('.navlinks').isVisible(),true,'Desktop site navigation is always visible in a Lab');
  assert.equal(requests.join(','),'private,registry','Missing private content or its store requires a separately authorized registry fallback');
  assert.ok(!requests.includes('private,registry,registry'),'Authorization is not retried after explicit denial');
  const sourceDetails=page.locator('#player-access-note details.gu-v33-source-banner');
  assert.equal(await sourceDetails.count(),1,'Registry fallback source warning must stay available');
  assert.match(await sourceDetails.locator('summary').innerText(),/About this Lab.s source material/);
  await sourceDetails.locator('summary').click();
  assert.match(await sourceDetails.innerText(),/authorized conceptual instruction/);
  assert.match(await sourceDetails.innerText(),/No mastery score is implied/);
  assert.match(await page.locator('[aria-label="Lab-specific conceptual teaching"]').textContent(),/Define risk before an entry/);
  assert.equal(await page.locator('#player-mode-select').isDisabled(),false);
  await page.evaluate(()=>{
    window.__qaModeTrace=[];
    document.getElementById('player-mode-select')?.addEventListener('change',event=>{
     window.__qaModeTrace.push({phase:'capture',selected:event.target.value,
       disabled:event.target.disabled,progress:document.querySelector('[data-v32-progress]')?.dataset?.v32Progress,
       at:performance.now()});
    },true);
  });
  await page.evaluate(()=>{
   const peek=phase=>({
    phase,mode:typeof PLAYER==='object'?PLAYER.mode:'unavailable',
    selected:document.getElementById('player-mode-select')?.value,
    disabled:document.getElementById('player-mode-select')?.disabled,
    progress:document.querySelector('[data-v32-progress]')?.dataset?.v32Progress,
    confirmed:!document.getElementById('player-mode-confirm')?.hidden
   });
   window.__qaModeTrace.push(peek('pre-menu'));
   document.addEventListener('click',event=>{
    if(event.target.closest?.('#player-mode-trigger,[data-member-mode]'))
     window.__qaModeTrace.push({...peek('document-click'),target:event.target.outerHTML.slice(0,160)});
   },true);
   document.querySelector('#player-mode-menu [data-member-mode="practice"]')?.addEventListener('click',()=>{
    window.__qaModeTrace.push(peek('button-capture'))
   },true);
  });
  await page.locator('#player-mode-trigger').click();
  await page.locator('#player-mode-menu [data-member-mode="practice"]').click();
  const initialModeConfirm=page.locator('#player-mode-confirm');
  if(await initialModeConfirm.isVisible())
   await initialModeConfirm.getByRole('button',{name:'Yes, Continue'}).click();
  const chosenMode=await page.locator('#player-mode-select').inputValue();
  const triggerText=await page.locator('#player-mode-trigger').innerText();
  const modeTrace=await page.evaluate(()=>[...(window.__qaModeTrace||[]),{
   phase:'after',mode:typeof PLAYER==='object'?PLAYER.mode:'unavailable',
   selected:document.getElementById('player-mode-select')?.value,
   disabled:document.getElementById('player-mode-select')?.disabled,
   progress:document.querySelector('[data-v32-progress]')?.dataset?.v32Progress,
   confirmed:!document.getElementById('player-mode-confirm')?.hidden
  }]);
  assert.equal(chosenMode,'practice','Practice selection must activate; current visible mode: '+triggerText+
    '; event trace: '+JSON.stringify(modeTrace));
  await page.getByRole('button',{name:'Learning mode guidance'}).click();
  assert.match(await page.locator('#player-mode-description').innerText(),/Practice Mode/);
  await page.getByRole('button',{name:'Start Guided Learning →'}).click();
  await page.locator('#player-mode-trigger').click();
  await page.locator('#player-mode-menu [data-member-mode="guided"]').click();
  await page.getByRole('button',{name:'Yes, Continue'}).click();
  assert.match(await page.locator('#player-mode-description').innerText(),/Guided Mode/);
  await page.getByRole('button',{name:'Start Guided Learning →'}).click();
  await page.getByRole('button',{name:'Next learning stage'}).click();
  await page.getByRole('button',{name:'Next learning stage'}).click();
  const stageLock=await page.evaluate(()=>({
   stage:document.querySelector('#player-workspace')?.dataset.learningStage,
   engineProgress:document.querySelector('[data-v32-progress]')?.dataset.v32Progress,
   mode:document.querySelector('#player-mode-select')?.value,
   disabled:document.querySelector('#player-mode-select')?.disabled
  }));
  assert.equal(stageLock.stage,'3','Three advancements must enter Predict; state='+JSON.stringify(stageLock));
  assert.equal(stageLock.disabled,true,'Predict must lock mode choice; state='+JSON.stringify(stageLock));
  assert.match(await page.locator('#player-mode-status').innerText(),/Locked/);
  assert.equal(await page.locator('#player-mode-restart-row').isVisible(),true);
  const protectedRestart=page.getByRole('button',{name:'Change Mode / Restart'});
  assert.equal(await protectedRestart.isDisabled(),true,
   'A locked attempt cannot restart without a separately authorized full-Lab entitlement');
  assert.match(await page.locator('#player-mode-restart-row').innerText(),/authorization is not yet enabled/,
   'Unreleased Sparks restart must never imply that a debit or reset succeeded');
  // A new page load is a fresh, ungraded exercise; it must not mutate the
  // already locked attempt or charge Crownlight Sparks for a restart.
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Start Guided Learning →'}).waitFor({timeout:15000});
  await page.locator('#player-mode-trigger').click();
  await page.locator('#player-mode-menu [data-member-mode="blind"]').click();
  const blindConfirmation=page.locator('#player-mode-confirm');
  if(await blindConfirmation.isVisible())
   await blindConfirmation.getByRole('button',{name:'Yes, Continue'}).click();
  assert.equal(await page.locator('#player-mode-select').inputValue(),'blind');
  assert.match(await page.locator('#player-mode-trigger').innerText(),/Blind Decision/);
  assert.match(await page.locator('#gu-v32-teaching-slot').innerText(),/Blind Decision — Evidence First/);
  assert.match(await page.locator('#player-title').innerText(),/Blind Market Decision/);
  assert.equal(await page.locator('[aria-label="Lab-specific conceptual teaching"]').count(),0,'Blind mode must conceal study notes before the learner decides');
  for(let step=0;step<4;step++)await page.getByRole('button',{name:'Next question'}).click();
  await page.locator('#ev-decision').selectOption('WATCH');
  await page.locator('#ev-confidence').selectOption('3');
  await page.getByRole('button',{name:'Next question'}).click();
  await page.locator('#lock-decision').click();
  assert.match(await page.locator('[aria-label="Lab-specific conceptual teaching"]').textContent(),/Define risk before an entry/);
  assert.deepEqual(errors,[]);
  console.log('PASS member Lab Player '+width+'px: authenticated 419 fallback, v3.3 shared reset, 33% lock, and blind suppression');
  await context.close();
 }
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
 let fallbackCount=0;
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.origin!==base)return route.abort();
  if(u.pathname==='/assets/js/supabase-client.js')
   return route.fulfill({status:200,contentType:'application/javascript',body:
     'window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}});'});
  if(u.pathname==='/api/lab-content')
   return route.fulfill({status:403,contentType:'application/json',body:'{"ok":false,"error":"Matching book required."}'});
  if(u.pathname==='/api/lab-player-context'){fallbackCount++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});}
  return route.continue();
 });
 await page.goto(base+'/lab-player.html?lab=SITE-001',{waitUntil:'domcontentloaded'});
 await page.getByText('Matching book required.').waitFor({timeout:12000});
 assert.equal(fallbackCount,0,'Book entitlement denial may never trigger a 419 registry bypass');
 await context.close();
 console.log('PASS unauthorized member cannot bypass a private Lab content 403');

 // Regression: the original private Supabase lab_instruction_v014 records
 // contain "steps" and "objective", not practiceSteps/beforeAdvance. In the
 // production screenshot this threw "Cannot read properties of undefined".
 const draftContext=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
 const draftPage=await draftContext.newPage(),draftErrors=[];
 draftPage.on('pageerror',e=>draftErrors.push(e.message));
 await draftContext.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.origin!==base)return route.abort();
  if(u.pathname==='/assets/js/supabase-client.js')return route.fulfill({
   status:200,contentType:'application/javascript',
   body:'window.getSupabaseClient=async()=>({auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}});'
  });
  if(u.pathname==='/assets/js/access.js')return route.fulfill({
   status:200,contentType:'application/javascript',
   body:'window.SiteAccess={SAMPLE_LABS:new Set(["F1-C02-L01"]),get:async()=>({user:null,sb:null,isMember:false,redeemedBooks:new Set()}),canGuided:()=>true,canAdvanced:()=>false};'
  });
  if(u.pathname==='/api/lab-content')return route.fulfill({
   status:200,contentType:'application/json',body:JSON.stringify({
    ok:true,guidedAllowed:true,advancedAllowed:false,
    sourceStatus:'private_unreviewed_conceptual_orientation',
    lab:{id:'F1-C02-L01',book:1,concept:'Basic Historical Replay Setup',
      objective:'Set the replay date, time and timeframe before interpreting candles.',
      why:'Use the information at the observation point, not later bars.',
      steps:['Choose a ticker','Set a historical date','Select a 5-minute chart','Define the observation stop']}
   })
  });
  return route.continue();
 });
 await draftPage.goto(base+'/lab-player.html?lab=F1-C02-L01',{waitUntil:'domcontentloaded'});
 await draftPage.getByRole('button',{name:'Start Guided Learning →'}).waitFor({timeout:15000});
 assert.equal(await draftPage.getByText('Cannot read properties of undefined').count(),0);
 assert.match(await draftPage.locator('#player-location').innerText(),/Foundations I/);
 // The shared v3.3 guided journey intentionally hides protected decision
 // controls until Predict (stage 3). Exercise the real progression first.
 assert.equal(await draftPage.locator('#gu-ws-member-workbench').isVisible(),false,
  'Guided Start must conceal the independent decision workbench');
 await draftPage.getByRole('button',{name:'Start Guided Learning →'}).click();
 await draftPage.getByRole('button',{name:'Next learning stage'}).click();
 await draftPage.getByRole('button',{name:'Next learning stage'}).click();
 await draftPage.locator('#gu-ws-member-workbench > summary').waitFor({state:'visible'});
 await draftPage.locator('#gu-ws-member-workbench > summary').click();
 // Use current Predict-stage copy and assert the underlying concealment rule.
 assert.match(await draftPage.locator('#gu-v32-teaching-slot').innerText(),/Record your observation/);
 assert.equal(await draftPage.locator('#reveal-panel').isVisible(),false,
  'Guided steps must remain concealed before locking a decision');
 assert.match(await draftPage.locator('[aria-label="Lab-specific conceptual teaching"]').textContent(),/Set the replay date/);
 for(let step=0;step<4;step++)await draftPage.getByRole('button',{name:'Next question'}).click();
 await draftPage.locator('#ev-decision').selectOption('OBSERVATION_ONLY');
 await draftPage.locator('#ev-confidence').selectOption('3');
 await draftPage.getByRole('button',{name:'Next question'}).click();
 await draftPage.locator('#lock-decision').click();
 await draftPage.locator('#reveal-next').click();
 assert.match(await draftPage.locator('#guided-sequence').innerText(),/Choose a ticker/);
 assert.deepEqual(draftErrors,[],'Actual private-content Lab must render without JavaScript errors');
 console.log('PASS private Foundations draft F1-C02-L01: complete player, v3.3 journey, chapter metadata, and correct step reveal');
 await draftContext.close();
 const chooser=await browser.newPage();let called=false;
 await chooser.route('**/api/lab-content*',route=>{called=true;return route.abort()});
 await chooser.goto(base+'/lab-player.html',{waitUntil:'domcontentloaded'});
 await chooser.getByRole('link',{name:'419-Lab Registry'}).waitFor({timeout:12000});
 assert.equal(called,false,'A missing ID must not call the private API');
 await chooser.close();
 console.log('PASS missing Lab ID links to the canonical Registry without an API request');
}finally{await browser.close()}
