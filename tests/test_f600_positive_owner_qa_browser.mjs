/* F600 approved, time-bound, noncommercial positive-access browser acceptance.
 * Requires a genuine James_Test session AND the existing Owner-issued QA grant.
 * Never inserts a paid Founder, seat, subscription, Sparks, or Stripe object.
 * The caller must revoke/expire the short-lived grant immediately after this job.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='https://stock-market-from-the-ground-up-d1r.pages.dev';
const expected='f42f9301-18e6-43a3-8531-32d371fd22c1';
const email=process.env.LAB_QA_EMAIL||'',password=process.env.LAB_QA_PASSWORD||'';
if(!email||!password){console.error('BLOCKED: QA login credentials unavailable');process.exit(2)}
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({serviceWorkers:'block'});
 const page=await context.newPage();
 const guard=await (await page.request.get(origin+'/api/auth-guard-v0135',{timeout:20000})).json();
 assert.equal(guard?.enabled,false,'Owner QA CAPTCHA-off window ended');
 await page.goto(origin+'/signin.html?next=%2Fdashboard.html',{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#login-identifier').fill(email);
 await page.locator('#login-password').fill(password);
 await page.locator('.auth-card button[type="submit"]').click();
 await page.waitForURL(u=>new URL(u).pathname==='/dashboard.html',{timeout:30000});
 const state=await page.evaluate(async()=>{
  const db=await window.getSupabaseClient();
  const [{data:{user}},qa,commons,council,founder]=await Promise.all([
   db.auth.getUser(),
   db.rpc('gu_founder_noncommercial_qa_v014289',{p_user: (await db.auth.getUser()).data.user.id}),
   db.rpc('gu_founder_commons_access_v014174',{p_scope:'shared'}),
   db.rpc('gu_founder_commons_access_v014174',{p_scope:'council'}),
   db.rpc('gu_founder_legacy_my_status_v014187')
  ]);
  return {id:user.id,qa:qa.data,qaError:qa.error?.code,
    shared:commons.data,sharedError:commons.error?.code,
    council:council.data,councilError:council.error?.code,
    founder:founder.data?.eligible,founderError:founder.error?.code};
 });
 assert.equal(state.id,expected,'Only James_Test may perform this acceptance');
 assert.equal(state.qa,true,'Owner-issued noncommercial QA grant not recognized by signed-in member');
 assert.equal(state.shared,true,'Positive Founder Commons QA access absent');
 assert.equal(state.council,false,'QA must never grant Extended Council voting');
 assert.equal(state.founder,false,'QA pass must not fabricate a paid Founder identity');
 console.log('PASS: genuine James_Test sees Owner-issued noncommercial shared Founders Commons');
 console.log('PASS: Extended Council and paid Founder identity remain inaccessible');
 await page.goto(origin+'/founder-learning-studio.html',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForTimeout(1000);
 const notice=await page.locator('body').innerText();
 assert(!/Founding membership access is required\./.test(notice),'Real Founder educational UI denied valid QA Commons access');
 console.log('PASS: genuine production Founder learning studio accepts authorized noncommercial QA member');
 await context.close();
}catch(e){console.error('FAIL/BLOCKED F600 positive QA browser: '+String(e?.message||e).slice(0,370));process.exitCode=1}
finally{await browser?.close()}
