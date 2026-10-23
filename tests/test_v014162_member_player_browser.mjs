/* Local source-only authenticated API mock: NEVER connects to Supabase. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Only local fixture allowed');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const payload={ok:true,guidedAllowed:true,advancedAllowed:true,sourceStatus:'canonical_registry_safe_orientation_only',
 lab:{id:'SITE-001',book:6,bookCode:'SITE_EXCLUSIVE',concept:'Observe a risk plan',chapter:0,chapterTitle:'Site-Exclusive Labs',
 goal:'Describe visible risk evidence at the observation boundary',ticker:'',date:'',timeframe:'',
 practiceSteps:['Observe only permitted data.','Record one clear invalidation.'],beforeAdvance:[],skill:'INDEPENDENT_PLAN'}};
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
   if(url.pathname==='/api/lab-content'){requests.push('private');return route.fulfill({status:404,contentType:'application/json',body:'{"ok":false,"error":"Not loaded"}'});}
   if(url.pathname==='/api/lab-player-context'){requests.push('registry');return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});}
   return route.continue();
  });
  await page.goto(base+'/lab-player.html?lab=SITE-001',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:/Learning Journey —/}).waitFor({timeout:15000});
  assert.equal(requests.join(','),'private,registry','Only a missing private lesson permits fallback');
  assert.match(await page.locator('#player-access-note').innerText(),/member-authorized conceptual orientation/);
  assert.equal(await page.locator('.mode-tabs button[data-mode=blind]').isDisabled(),false);
  await page.locator('.mode-tabs button[data-mode=practice]').click();
  assert.match(await page.locator('#player-mode-description').innerText(),/Practice Mode/);
  await page.getByRole('button',{name:'Next learning stage'}).click();
  page.once('dialog',d=>d.accept());
  await page.locator('.mode-tabs button[data-mode=guided]').click();
  assert.match(await page.locator('#player-mode-description').innerText(),/Guided Mode/);
  await page.getByRole('button',{name:'Next learning stage'}).click();
  await page.getByRole('button',{name:'Next learning stage'}).click();
  await page.getByRole('button',{name:'Next learning stage'}).click();
  await page.locator('.mode-tabs button[data-mode=blind]').click();
  assert.match(await page.locator('#player-mode-description').innerText(),/locked/);
  assert.equal(await page.locator('.mode-tabs button[data-mode=guided]').getAttribute('class').then(x=>x.includes('active')),true);
  page.once('dialog',d=>d.accept());
  await page.getByRole('button',{name:/Restart current mode/}).click();
  await page.locator('.mode-tabs button[data-mode=blind]').click();
  assert.match(await page.locator('#player-mode-description').innerText(),/Blind Decision/);
  assert.equal(await page.locator('#gu-v32-teaching-slot').innerText(),'');
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
}finally{await browser.close()}
