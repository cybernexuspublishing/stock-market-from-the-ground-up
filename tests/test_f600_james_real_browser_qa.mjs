/* Founding 600: genuine production browser acceptance for James_Test only.
 * Read-only. Never create a Founder seat, payment, trial, fake identity, or grant.
 * Existing encrypted LAB_QA secrets must authenticate AS James_Test; otherwise
 * fail closed and record a credentials-to-target mismatch (not an auth bypass).
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const origin='https://stock-market-from-the-ground-up-d1r.pages.dev';
const targetId='f42f9301-18e6-43a3-8531-32d371fd22c1';
const email=process.env.LAB_QA_EMAIL||'',password=process.env.LAB_QA_PASSWORD||'';
if(!email||!password){
 console.error('BLOCKED: existing encrypted GitHub LAB_QA credentials missing.');
 process.exit(2);
}
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({serviceWorkers:'block'});
 const page=await context.newPage();
 const guard=await page.request.get(origin+'/api/auth-guard-v0135',{timeout:25000});
 const config=await guard.json().catch(()=>({}));
 assert(guard.ok()&&config.ok===true&&config.enabled===false,
  'Owner-controlled CAPTCHA-off window is not active; never bypass Turnstile.');
 console.log('PASS production auth guard confirms Owner CAPTCHA-off window.');
 await page.goto(origin+'/signin.html?next=%2Fdashboard.html',{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#login-identifier').fill(email);
 await page.locator('#login-password').fill(password);
 await page.locator('.auth-card button[type="submit"]').click();
 await page.waitForURL(u=>new URL(u).pathname==='/dashboard.html',{timeout:30000});
 const identity=await page.evaluate(async()=>{
  const db=await window.getSupabaseClient?.();
  if(!db)return null;
  const {data,error}=await db.auth.getUser();
  return error?null:data?.user?.id;
 });
 assert.equal(identity,targetId,'BLOCKED: encrypted GitHub QA credentials are not James_Test.');
 console.log('PASS genuine Owner-authorized James_Test website sign-in and provider identity.');
 const state=await page.evaluate(async()=>{
  const db=await window.getSupabaseClient?.();
  if(!db)return null;
  const [membership,commons]=await Promise.all([
   db.rpc('gu_founder_legacy_my_status_v014187'),
   db.rpc('gu_founder_commons_access_v014174',{p_scope:'shared'})
  ]);
  return {eligible:membership.data?.eligible===true,commonsAccess:commons.data===true,
    membershipError:membership.error?.code||null,commonsError:commons.error?.code||null};
 });
 assert(state,'Member entitlement client unavailable');
 assert.equal(state.eligible,false,'Nonpaid QA identity unexpectedly received Founder membership');
 assert.equal(state.commonsAccess,false,'Nonpaid QA identity unexpectedly received Founder Commons access');
 console.log('PASS real member RLS/RPC denies Founder identity and private Commons access.');
 await page.reload({waitUntil:'domcontentloaded',timeout:30000});
 const retained=await page.evaluate(async()=>{
  const db=await window.getSupabaseClient?.();
  const {data}=await db?.auth.getUser();
  return data?.user?.id||null;
 });
 assert.equal(retained,targetId,'Session did not persist across browser page reload.');
 console.log('PASS James_Test signed-in session survives full page reload.');
 await page.evaluate(async()=>{const db=await window.getSupabaseClient();await db.auth.signOut()})
  .catch(err=>{if(!/Execution context was destroyed|navigation/i.test(String(err?.message||'')))throw err});
 await page.goto(origin+'/dashboard.html',{waitUntil:'domcontentloaded',timeout:30000});
 const after=await page.evaluate(async()=>{
  const db=await window.getSupabaseClient?.();
  const {data}=await db?.auth.getSession();
  return !!data?.session;
 }).catch(()=>false);
 assert.equal(after,false,'James_Test session persisted after logout.');
 console.log('PASS real sign-out closes private member session.');
 await context.close();
}catch(e){
 console.error('FAIL/BLOCKED James_Test real browser acceptance: '+String(e.message||e).slice(0,450));
 process.exitCode=1;
}finally{await browser?.close()}
