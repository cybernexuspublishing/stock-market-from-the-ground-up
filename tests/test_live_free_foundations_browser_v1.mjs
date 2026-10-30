/* Production Day 1 acceptance using a REAL password-authenticated QA identity.
 * No service-role credentials, password logging, CAPTCHA bypass, checkout,
 * payment, protected answer keys, or writes to non-QA member records.
 * A new synthetic reflection is only saved when Day 1 has no existing record.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const origin='https://stock-market-from-the-ground-up-d1r.pages.dev';
const email=process.env.LAB_QA_EMAIL||'';
const password=process.env.LAB_QA_PASSWORD||'';
const secondEmail=process.env.LAB_QA_SECOND_EMAIL||'';
const secondPassword=process.env.LAB_QA_SECOND_PASSWORD||'';
const expectedQaId=process.env.LAB_QA_EXPECTED_USER_ID||'f42f9301-18e6-43a3-8531-32d371fd22c1';
const report={scope:'Real production Chromium, signed-in Free Foundations Day 1',
 checkedAt:new Date().toISOString(),checks:[],blocked:[],failures:[],completed:false,
 constraints:['Never overwrite a pre-existing Day 1 record',
  'Second QA account is required for genuine cross-member isolation proof',
  'Tests fail closed if sign-in requires human CAPTCHA interaction']};
const note=(kind,message)=>{report[kind].push(message);console.log(kind.toUpperCase()+' '+message)};
async function authenticate(page,username,secret){
 const response=await page.goto(origin+'/signin.html',{waitUntil:'domcontentloaded',timeout:30000});
 assert.equal(response?.status(),200,'Sign-in page unavailable');
 await page.locator('#login-identifier').fill(username);
 await page.locator('#login-password').fill(secret);
 await page.locator('.auth-card button[type="submit"]').click();
 try {
  await page.waitForURL(u=>/\/dashboard(?:\.html)?$/.test(new URL(u).pathname),{timeout:30000});
 }catch{
  throw Error('Real password sign-in did not reach Dashboard. A human Turnstile challenge or invalid QA credentials may require Owner action; CAPTCHA must not be bypassed.');
 }
 const state=await page.evaluate(async()=>{
  const client=await window.getSupabaseClient();
  const result=await client.auth.getSession();
  return {access:result.data?.session?.access_token||'',id:result.data?.session?.user?.id||''};
 });
 assert(state.access.length>20&&state.id,'Genuine authenticated Supabase session required');
 return state;
}
async function progress(request,token){
 const result=await request.get(origin+'/api/bootcamp-academy?program=free5',{
  headers:{authorization:'Bearer '+token},timeout:30000});
 const body=await result.json().catch(()=>({}));
 return {status:result.status(),body};
}
if(!email||!password){
 note('blocked','Encrypted LAB_QA_EMAIL and LAB_QA_PASSWORD are unavailable; no member session was created.');
 process.exitCode=2;
}else{
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:390,height:900},serviceWorkers:'block'});
  const page=await context.newPage();
  const signed=await authenticate(page,email,password);
  assert.equal(signed.id,expectedQaId,'Signed-in member does not match the authorized noncommercial QA identity. Refusing any progress writes.');
  note('checks','Verified real QA sign-in at mobile viewport with an account-bound session.');
  const original=await progress(page.request,signed.access);
  assert.equal(original.status,200,'Signed-in private program GET requires success');
  assert.equal(original.body.ok,true);
  assert.equal(original.body.program?.code,'free5');
  assert.equal(original.body.curriculum?.length,5);
  assert.equal(original.body.progressAvailable,true,'Server-side progress must be available');
  const reflection='FICTIONAL QA DAY 1 REFLECTION: This is a synthetic study note for testing private persistence, not a real security, trade, grade, or recommendation. I will identify which prices are actual transactions, which quotes are displayed interest, what remains unknown, and why a No Trade choice can be appropriate.';
  const existingDay1=original.body.progress.find(x=>x.day===1);
  assert(!existingDay1||(existingDay1.status==='reflection_saved'&&existingDay1.reflection===reflection),
   'Day 1 contains another private note. Refusing to overwrite the existing member record.');
  note('checks',existingDay1?'Free5 Day 1 already holds the exact previously saved QA-only reflection; rerunning read-only.':'Free5 private GET returned exactly five lessons and an unused Day 1.');
  const startUrl=origin+'/bootcamp-academy.html?program=free5&day=1';
  await page.goto(startUrl,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>document.getElementById('academy-workspace')?.hidden===false,
   {timeout:30000});
  assert.equal(await page.locator('#academy-day-title').count(),1);
  assert.match(await page.locator('#academy-stage-label').innerText(),/Lesson 1 of 5/i);
  note('checks','Day 1 opened inside the real signed-in Academy learning workspace.');
  if(!existingDay1){
  if(await page.locator('#academy-enroll').isVisible()){
   await page.locator('#academy-enroll').click();
   await page.waitForFunction(()=>document.getElementById('academy-enroll')?.hidden===true,
    {timeout:15000});
  }
  await page.locator('#academy-start').click();
  await page.waitForFunction(()=>/Lesson started|previously saved reflection/i.test(
   document.getElementById('academy-save-status')?.textContent||''),{timeout:15000});
  await page.locator('#academy-reflection').fill(reflection);
  await page.locator('#academy-save').click();
  await page.waitForFunction(()=>/Your learning notes are saved/i.test(
   document.getElementById('academy-save-status')?.textContent||''),{timeout:18000});
  note('checks','Day 1 reflection saved through the actual browser button (fictional, ungraded).');
  }else note('checks','Previous QA save detected; no further progress write was performed.');
  await page.reload({waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>document.getElementById('academy-workspace')?.hidden===false,
   {timeout:30000});
  const displayed=await page.locator('#academy-reflection').inputValue();
  assert.equal(displayed,reflection,'Saved study note failed to reload into Day 1 UI');
  const reread=await progress(page.request,signed.access);
  assert.equal(reread.status,200);
  const row=reread.body.progress?.find(x=>x.day===1);
  assert(row&&row.status==='reflection_saved'&&row.reflection===reflection,
   'Private server record does not match saved browser note');
  note('checks','Day 1 note survived full signed-in browser reload and independent API GET.');
  const anonymous=await page.request.get(origin+'/api/bootcamp-academy?program=free5',
   {timeout:20000});
  assert([401,403].includes(anonymous.status()),
   'Unsigned requests must not receive private Academy records');
  note('checks','Unsigned access to private learning records is rejected.');
  if(secondEmail&&secondPassword){
   const anotherContext=await browser.newContext({viewport:{width:390,height:900},serviceWorkers:'block'});
   const secondPage=await anotherContext.newPage();
   const other=await authenticate(secondPage,secondEmail,secondPassword);
   assert.notEqual(other.id,signed.id,'Second QA credentials must identify a different member');
   const their=await progress(secondPage.request,other.access);
   assert.equal(their.status,200,'Second QA member needs eligible Free learning access');
   assert(!(their.body.progress||[]).some(x=>x.reflection===reflection),
    'Member A\'s private reflection leaked to member B');
   note('checks','Second genuine QA account cannot read the first account\'s reflection.');
   await anotherContext.close();
  }else{
   note('blocked','Full cross-account isolation needs separate existing LAB_QA_SECOND_EMAIL/PASSWORD GitHub secrets. Anonymous denial is proven but not sufficient for two-member acceptance.');
  }
  report.completed=report.blocked.length===0;
  await context.close();
 }catch(e){
  note('failures',String(e.message||e).slice(0,470));
  process.exitCode=1;
 }finally{await browser?.close()}
}
mkdirSync('artifacts/public-acquisition',{recursive:true});
writeFileSync('artifacts/public-acquisition/free5-production-browser.json',
 JSON.stringify(report,null,2));
console.log('FREE5_PRODUCTION_QA '+JSON.stringify({checks:report.checks.length,
 blocked:report.blocked.length,failed:report.failures.length,complete:report.completed}));
if(!report.completed)process.exitCode=process.exitCode||2;
