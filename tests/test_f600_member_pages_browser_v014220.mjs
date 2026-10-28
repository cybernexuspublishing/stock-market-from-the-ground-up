/* Local-only Playwright member journey acceptance. Synthetic auth/data, never LIVE customer data. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.env.SITEWIDE_TEST_BASE||'http://127.0.0.1:8765').replace(/\/$/,'');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('localhost fixtures only');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const js=tier=>`(()=>{
 const enhanced=${tier==='extended'},id='11111111-1111-4111-8111-111111110222';
 const lessons=Array.from({length:enhanced?5:3},(_,i)=>({id:String(i),title:'Reviewed example '+(i+1),category:'early_teaching',body:'Fictional educational example about risk and evidence.'}));
 const days=Array.from({length:60},(_,i)=>({day:i+1,competencyCode:'SKILL_'+String(Math.floor(i/2)+1).padStart(2,'0'),name:'Learning skill '+(Math.floor(i/2)+1),
  category:'knowledge',description:'Review evidence',stage:i%2===0?'Learn and Experiment':'Predict, Practice, Assess and Review',
  task:'Practice using completed observations.',evidenceCount:0,passingEvidenceCount:0,assessmentStatus:'Not Yet Assessed'}));
 const rows={gu_founder_educational_releases_v014190:lessons,gu_founder_case_submissions_v014190:[],
  gu_founder_certificates_v014192:[],gu_founder_service_credits_v014203:[]};
 const table=name=>{const q={select(){return q},eq(){return q},is(){return q},order(){return q},limit(){return q},
   then(ok,no){return Promise.resolve({data:rows[name]||[],error:null}).then(ok,no)}};return q};
 const client={auth:{getUser:async()=>({data:{user:{id}},error:null}),
   getSession:async()=>({data:{session:{access_token:'LOCAL_MOCK_ONLY'}}}),
   onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
   from:table,rpc:async(name,args={})=>{
    if(name==='gu_founder_commons_access_v014174')return {data:args.p_scope==='shared'||enhanced,error:null};
    if(name==='gu_founder_legacy_my_status_v014187')return {data:{eligible:true,founderNumber:42},error:null};
    if(name==='gu_founder_extended_guided_path_v014213')return {data:enhanced?{ok:true,days,totalDays:60}:{ok:false,error:'EXTENDED_FOUNDER_REQUIRED'},error:null};
    if(name==='gu_founder_submit_case_v014190')return {data:{ok:true,id:'11111111-1111-4111-8111-111111110099'},error:null};
    return {data:{ok:false},error:null};
   }};
 window.getSupabaseClient=async()=>client;
})();`;
async function visit(context,path){
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/'+path,{waitUntil:'domcontentloaded'});
 return {page,errors};
}
try{
 for(const width of [390,1280]){
  for(const tier of ['starter','standard','extended']){
   const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
   await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin!==base)return route.abort();
    if(url.pathname==='/assets/js/supabase-client.js')return route.fulfill({status:200,contentType:'application/javascript',body:js(tier)});
    if(['/assets/js/site.js','/assets/js/session-manager.js','/config.js'].includes(url.pathname))
       return route.fulfill({status:200,contentType:'application/javascript',body:''});
    return route.continue();
   });
   const first=await visit(context,'founder-learning-studio.html');
   await first.page.locator('#f600-learning-content').waitFor({state:'visible'});
   assert.match(await first.page.locator('#f600-learning-status').innerText(),/verified/i);
   assert.equal(await first.page.locator('#f600-learning-releases article').count(),tier==='extended'?5:3);
   assert.equal(await first.page.locator('#f600-case-form').isVisible(),tier==='extended');
   assert.deepEqual(first.errors,[],'Learning Studio browser errors '+tier+' '+width);
   // Starter and Standard see shared founder instruction without 60-day-only extras.
   if(tier==='starter')assert.equal(await first.page.locator('#f600-case-form').isVisible(),false,
    '14-day Starter must not inherit 60-day Founders Council or case privileges');
   const path=await visit(context,'founder-extended-path.html');
   if(tier==='extended'){
     await path.page.locator('#f600-path-content').waitFor({state:'visible'});
     assert.equal(await path.page.locator('.gu-f600-path-group').count(),30,'2 days per competency');
   }else{
     await path.page.waitForFunction(()=>document.querySelector('#f600-path-status')?.textContent.includes('required'));
     assert.equal(await path.page.locator('#f600-path-content').isVisible(),false);
   }
   assert.deepEqual(path.errors,[],'Extended path errors '+tier+' '+width);
   const cert=await visit(context,'founder-benefits.html');
   await cert.page.locator('#f600-record-content').waitFor({state:'visible'});
   assert.match(await cert.page.locator('#f600-certificates').innerText(),/No certificate has been issued/i);
   assert.match(await cert.page.locator('#f600-service-credits').innerText(),/No verified service-interruption credits/i);
   assert.deepEqual(cert.errors,[],'Benefit records errors '+tier+' '+width);
   for(const page of [first.page,path.page,cert.page]){
     const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
     assert(overflow<=5,'horizontal overflow at '+tier+' '+width+': '+overflow);
     await page.close();
   }
   await context.close();
  }
 }
}finally{await browser.close()}
console.log('Founding 600 Starter/Standard/Extended synthetic Playwright journeys passed at 390px and 1280px, no LIVE billing.');
