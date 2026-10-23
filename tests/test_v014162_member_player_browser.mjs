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
   if(url.pathname==='/api/lab-content'){requests.push('private');return route.fulfill({status:width===390?503:404,contentType:'application/json',body:width===390?'{"ok":false,"code":"PRIVATE_LAB_STORE_UNAVAILABLE"}':'{"ok":false,"error":"Not loaded"}'});}
   if(url.pathname==='/api/lab-player-context'){requests.push('registry');return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});}
   return route.continue();
  });
  await page.goto(base+'/lab-player.html?lab=SITE-001',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:/Learning Journey —/}).waitFor({timeout:15000});
  assert.equal(requests.join(','),'private,registry','Missing private content or its store requires a separately authorized registry fallback');
  assert.match(await page.locator('#player-access-note').innerText(),/member-authorized conceptual orientation/);
  assert.match(await page.locator('[aria-label="Lab-specific conceptual teaching"]').innerText(),/Define risk before an entry/);
  assert.equal(await page.locator('#player-mode-select').isDisabled(),false);
  await page.locator('#player-mode-select').selectOption('practice');
  await page.getByRole('button',{name:'Mode help'}).click();
  assert.match(await page.locator('#player-mode-description').innerText(),/Practice Mode/);
  await page.getByRole('button',{name:'Next learning stage'}).click();
  await page.locator('#player-mode-select').selectOption('guided');
  await page.getByRole('button',{name:'Yes, Continue'}).click();
  assert.match(await page.locator('#player-mode-description').innerText(),/Guided Mode/);
  await page.getByRole('button',{name:'Next learning stage'}).click();
  await page.getByRole('button',{name:'Next learning stage'}).click();
  await page.getByRole('button',{name:'Next learning stage'}).click();
  assert.equal(await page.locator('#player-mode-select').isDisabled(),true);
  assert.match(await page.locator('#player-mode-status').innerText(),/Locked/);
  await page.getByRole('button',{name:'Change Mode / Restart'}).click();
  await page.getByRole('combobox',{name:'New learning mode'}).selectOption('blind');
  await page.getByRole('button',{name:'Yes, Continue'}).click();
  assert.equal(await page.locator('#player-mode-select').inputValue(),'blind');
  assert.equal(await page.locator('#gu-v32-teaching-slot').innerText(),'');
  assert.equal(await page.locator('[aria-label="Lab-specific conceptual teaching"]').count(),0,'Blind mode must conceal study notes before the learner decides');
  await page.locator('#ev-decision').selectOption('WATCH');
  await page.locator('#ev-confidence').selectOption('3');
  await page.locator('#lock-decision').click();
  assert.match(await page.locator('[aria-label="Lab-specific conceptual teaching"]').innerText(),/Define risk before an entry/);
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
 const chooser=await browser.newPage();let called=false;
 await chooser.route('**/api/lab-content*',route=>{called=true;return route.abort()});
 await chooser.goto(base+'/lab-player.html',{waitUntil:'domcontentloaded'});
 await chooser.getByRole('link',{name:'419-Lab Registry'}).waitFor({timeout:12000});
 assert.equal(called,false,'A missing ID must not call the private API');
 await chooser.close();
 console.log('PASS missing Lab ID links to the canonical Registry without an API request');
}finally{await browser.close()}
