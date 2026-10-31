/* Isolated authenticated UI fixture for NEW Boot Camps.
 * All accounts and market examples synthetic. No real Supabase, Stripe, or grading writes. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {academyByCode,ACADEMY_VERSION} from '../functions/_lib/bootcamp-academy-v014168.js';
const origin=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))throw Error('Local fixture only');
const codes=['tape10','indicators10','filings7'];
const token='fixture-token',uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const identityScript=`window.getSupabaseClient=async()=>({auth:{
 getUser:async()=>({data:{user:{id:'${uid}'}}}),
 getSession:async()=>({data:{session:{user:{id:'${uid}',access_token:'${token}'}}}),
 onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})
 }});`;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [390,1440]){
  for(const code of codes){
   const context=await browser.newContext({viewport:{width,height:950},serviceWorkers:'block',reducedMotion:'reduce'});
   const page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   let enrolled=false;
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin!==origin)return route.abort();
    if(url.pathname==='/assets/js/supabase-client.js')return route.fulfill({
     status:200,contentType:'application/javascript',body:identityScript});
    if(['/assets/js/site.js','/assets/js/session-manager.js'].includes(url.pathname))
     return route.fulfill({status:200,contentType:'application/javascript',body:'/* synthetic identity only */'});
    if(url.pathname==='/api/bootcamp-academy'){
     if(route.request().method()==='GET')return route.fulfill({status:200,
      contentType:'application/json',body:JSON.stringify({ok:true,version:ACADEMY_VERSION,
       program:academyByCode[code],curriculum:academyByCode[code].curriculum,
       progressAvailable:true,enrolled,progress:[]})});
     const input=route.request().postDataJSON();
     assert.equal(input.program,code);assert.equal(input.version,ACADEMY_VERSION);
     if(input.action==='enroll'){
      enrolled=true;
      return route.fulfill({status:200,contentType:'application/json',
       body:JSON.stringify({ok:true,enrolled:true,program:code})});
     }
     return route.fulfill({status:400,contentType:'application/json',
      body:JSON.stringify({ok:false,error:'Write not authorized in UI fixture'})});
    }
    if(url.pathname==='/api/academy-protected-assessment-v1')
     return route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({ok:true,program:code,day:Number(url.searchParams.get('day')),
       officialAssessment:false,reason:'assessment_not_reviewed',priorSubmissions:0})});
    return route.continue();
   });
   const response=await page.goto(origin+'/bootcamp-academy.html?program='+code,{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(response.status(),200);
   await page.locator('#academy-workspace:not([hidden])').waitFor({timeout:20000});
   await page.locator('.academy-guided-ten').waitFor({timeout:15000});
   assert.equal(await page.locator('#academy-days .gu-bc-day').count(),academyByCode[code].days);
   assert.match(await page.locator('#academy-course-title').innerText(),new RegExp(code==='tape10'?'Tape':code==='indicators10'?'VWAP':'SEC Filings'));
   await page.locator('.academy-evidence-event').first().waitFor({timeout:12000});
   const expectHead=code==='tape10'?'Quote, depth and execution':code==='indicators10'?'Indicator calculation':'SEC filing and issuer-source';
   assert((await page.locator('.academy-evidence-head').innerText()).includes(expectHead),'Subject-specific evidence: '+code);
   assert.equal(await page.locator('#academy-official-assessment').isHidden(),true,'No enrollment means no protected assessment');
   await page.locator('#academy-enroll').click();
   await page.locator('#academy-official-assessment:not([hidden])').waitFor({timeout:12000});
   await page.waitForFunction(()=>document.querySelector('.academy-assessment-status')?.textContent.includes('pending editorial'));
   assert.equal(await page.locator('.academy-assessment-question').count(),0,'Unreviewed keys never displayed');
   await page.locator('#academy-days .gu-bc-day').last().click();
   await page.waitForFunction(n=>document.getElementById('academy-day-title')?.textContent===n,
    academyByCode[code].curriculum.at(-1).title,{timeout:10000});
   const geometry=await page.evaluate(()=>{
    const el=document.querySelector('.academy-guided-ten'),b=el.getBoundingClientRect();
    return {x:b.x,right:b.right,screen:window.innerWidth,overflow:document.documentElement.scrollWidth};
   });
   assert(geometry.x>=-2&&geometry.right<=width+3&&geometry.overflow<=width+5,
    'Full-width learning must not overflow at '+width+': '+JSON.stringify(geometry));
   assert.deepEqual(errors,[],'New course should have no browser script errors '+code);
   console.log('PASS new Academy '+code+' '+width+'px, subject-evidence, 10-stage guide, 1st/last day, reviewed assessment gate');
   await context.close();
  }
 }
}finally{await browser.close()}
