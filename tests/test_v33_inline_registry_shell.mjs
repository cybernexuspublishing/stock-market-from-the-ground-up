/* Production Learning v3.3: one website header, in-place Lab opening, and
 * NO changes to API authorization. Source-only browser fixture: no payments. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Only localhost fixtures allowed');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin!==base)return route.abort();
   // Authenticate the localhost browser fixture. Production still requires the
   // server's separate release and member-specific entitlement decisions.
   if(u.pathname==='/assets/js/supabase-client.js')
    return route.fulfill({status:200,contentType:'application/javascript',body:`
     const member={id:'11111111-1111-4111-8111-111111111111',user_metadata:{first_name:'QA'}};
     const session={access_token:'fixture-member-token',user:member};
     const client={auth:{
       getSession:async()=>({data:{session}}),
       getUser:async()=>({data:{user:member}}),
       onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
      },
      from(table){
       if(table==='lab_progress')return {select:()=>({eq:()=>Promise.resolve({data:[],error:null})})};
       if(table==='lab_attempts')return {select:()=>({eq:()=>({eq:()=>Promise.resolve({count:0,error:null})})})};
       return {select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null}),single:async()=>({data:null,error:null})})})};
      }
     };
     window.getSupabaseClient=async()=>client;`});
   if(u.pathname==='/api/lab-registry-access'){
    if(route.request().headers()['authorization']!=='Bearer fixture-member-token')
     return route.fulfill({status:401,contentType:'application/json',body:'{"ok":false}'});
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
     ok:true,freeEligible:true,interactive:false,training:false,bookCodes:[],
     freeSampleIds:['F2-C01-L01']
    })});
   }
   // Registry Start links are deliberately unavailable until the server
   // verifies that the specific Lab has released, ungraded teaching content.
   // This browser-only fixture simulates that positive release decision;
   // it does not change real catalog status or grant a production entitlement.
   if(u.pathname==='/api/lab-release-availability')
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
     ok:true,publishedIds:[],guidedBetaIds:['F2-C01-L01']
    })});
   if(u.pathname==='/api/lab-content'&&route.request().headers()['authorization']!=='Bearer fixture-member-token')
    return route.fulfill({status:401,contentType:'application/json',body:'{"ok":false,"error":"SIGN_IN_REQUIRED"}'});
   if(u.pathname==='/api/lab-content')
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
     ok:true,guidedAllowed:true,advancedAllowed:false,sourceStatus:'private_unreviewed_conceptual_orientation',
     lab:{id:'F2-C01-L01',book:2,chapter:1,concept:'Identifying Market Sessions',goal:'Identify market hours.',
       ticker:'SAMPLE',date:'2024-04-26',start:'9:30 a.m. ET',end:'9:45 a.m. ET',timeframe:'5-minute',
       steps:['Identify the opening candle'],teaching:{what:'Describe the market session.'}}})});
   return route.continue();
  });
  await page.goto(base+'/labs.html',{waitUntil:'domcontentloaded',timeout:30000});
  const search=page.locator('#q');await search.waitFor();await search.fill('F2-C01-L01');
  const card=page.locator('#row-F2-C01-L01');await card.waitFor({state:'visible',timeout:15000});
  await card.locator('a.lab-open-btn').click();
  await page.locator('#gu-inline-lab').waitFor({state:'visible',timeout:10000});
  assert.equal(new URL(page.url()).pathname,'/labs.html','The member must stay in the Registry website page');
  assert.equal(await page.locator('header.site-header').count(),1,'One site header in parent');
  assert.equal(await page.locator('header.site-header .brand').isVisible(),true,'Logo and site nav remain visible');
  assert.equal(await page.locator('#gu-lab-registry-view').isVisible(),false,'Registry moves aside while lesson is active');
  const lesson=page.frameLocator('#gu-inline-lab-frame');
  await lesson.locator('#player-title').getByText('Identifying Market Sessions').waitFor({timeout:16000});
  assert.equal(await lesson.locator('#gu-v32-teaching-slot').count(),1,'Same authorized v3.3 instruction engine');
  assert.equal(await lesson.locator('header.site-header').isVisible(),false,'Do not duplicate website header inside Lab');
  assert.equal(await page.locator('#gu-inline-lab-close').isVisible(),true,'Clear return to Lab list');
  assert.equal(await page.locator('#gu-inline-lab-direct').getAttribute('href'),'lab-player.html?lab=F2-C01-L01','Direct bookmark remains available');
  await page.locator('#gu-inline-lab-close').click();
  assert.equal(await page.locator('#gu-lab-registry-view').isVisible(),true,'Return to original Registry, preserving filters');
  assert.equal(await search.inputValue(),'F2-C01-L01','Filter state must survive lesson open/close');
  assert.equal(await page.locator('#gu-inline-lab').isVisible(),false);
  assert.deepEqual(errors,[],'Browser JavaScript errors');
  console.log('PASS v3.3 inline learning at '+width+'px: one site header, in-place lesson, secure API mocked, return without losing filters');
  await context.close();
 }
}finally{await browser.close()}
