/* Production Chromium authenticated QA; uses existing secret-backed member credentials.
 * No payment, fake receipt ticket, Mastery award, or owner impersonation.
 * Browser sign in, Support UI, accessibility controls, sign out and privacy.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='https://stock-market-from-the-ground-up-d1r.pages.dev';
const email=process.env.LAB_QA_EMAIL||'',password=process.env.LAB_QA_PASSWORD||'';
if(!email||!password){console.error('BLOCKED QA browser credentials not present in GitHub secrets.');process.exit(2)}
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({serviceWorkers:'block'});
 const page=await context.newPage();
 await page.goto(origin+'/signin.html',{waitUntil:'domcontentloaded',timeout:30000});
 const configResponse=await page.request.get(origin+'/api/auth-guard-v0135');
 const config=await configResponse.json().catch(()=>({}));
 if(!configResponse.ok()||config.ok!==true)throw Error('Authentication guard status unavailable');
 if(config.enabled!==false)throw Error('Browser QA requires user-controlled CAPTCHA-off window; will not bypass a challenge.');
 await page.locator('#login-identifier').fill(email);
 await page.locator('#login-password').fill(password);
 await page.locator('.auth-card button[type="submit"]').click();
 try{await page.waitForURL(u=>new URL(u).pathname==='/dashboard.html',{timeout:30000})}
 catch{throw Error('Real browser password sign-in did not reach the member Dashboard (credentials never logged).')}
 console.log('PASS real Chromium UI password sign-in to production member Dashboard.');
 const supportResponse=await page.goto(origin+'/dashboard.html?tab=support&purpose=book_receipt',{
  waitUntil:'domcontentloaded',timeout:30000});
 try{await page.locator('#member-support-panel').waitFor({state:'visible',timeout:22000})}
 catch(error){
  const detail=await page.evaluate(async()=>{
   let authenticated=false,authIssue='unknown';
   try{const client=await window.getSupabaseClient?.();const response=await client?.auth.getSession();
     authenticated=!!response?.data?.session?.access_token;authIssue=response?.error?'session_error':'no_session_error';
   }catch{authIssue='auth_exception'}
   return {route:location.pathname,tab:new URLSearchParams(location.search).get('tab'),
    panelExists:!!document.getElementById('member-support-panel'),
    panelHidden:document.getElementById('member-support-panel')?.hidden,
    title:document.title,htmlLength:document.documentElement.outerHTML.length,
    dashboardContent:!!document.getElementById('dashboard-content'),
    firstHeading:(document.querySelector('h1')?.textContent||'').slice(0,70),
    supportState:(document.getElementById('member-support-status')?.textContent||'').slice(0,130),
    gateStatus:(document.getElementById('dashboard-gate')?.textContent||'').slice(0,100),
    authenticated,authIssue,clientLoaded:typeof window.getSupabaseClient==='function'};
  }).catch(()=>({route:'navigation_failure'}));
  console.error('SUPPORT_QA_DIAGNOSTIC '+JSON.stringify({httpStatus:supportResponse?.status(),...detail}));
  throw error;
 }
 assert.equal(await page.locator('#member-book-receipt-form').isVisible(),true);
 assert.equal(await page.locator('#member-book-receipt-form input[name="receipt"][type="file"]').count(),1);
 assert.equal(await page.locator('#member-book-receipt-form button[type="submit"]').isVisible(),true);
 await page.waitForFunction(()=>{
  const el=document.getElementById('member-support-status');
  return el&&(/Only support requests belonging|No support requests yet|private support requests/i).test(el.textContent||'')
 },{timeout:15000});
 console.log('PASS member-only private Support, receipt upload form and own ticket list UI.');
 await page.reload({waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#member-support-panel').waitFor({state:'visible',timeout:20000});
 assert(await page.locator('#member-book-receipt-form').isVisible(),'Receipt form must survive full session reload');
 console.log('PASS member Support and receipt form survive full signed-in page reload.');
 let signOut='pending';
 try{
  signOut=await page.evaluate(async()=>{
   const sb=await window.getSupabaseClient();
   if(!sb)return 'missing_client';
   const {error}=await sb.auth.signOut();
   if(error)return 'error';
   const {data}=await sb.auth.getSession();
   return data?.session?'still_signed_in':'signed_out';
  });
 }catch(error){
  // The session manager legitimately redirects to sign-in on SIGNED_OUT;
  // a destroyed Chromium execution context is not a failed sign-out.
  if(/Execution context was destroyed|navigation/i.test(String(error?.message||'')))
   signOut='navigated_on_signout';
  else throw error;
 }
 assert(['signed_out','navigated_on_signout'].includes(signOut),'Supabase sign-out must complete or redirect');
 // A successfully signed-out member may be immediately redirected by the
 // session guard to /signin, interrupting the requested Dashboard navigation.
 // The redirect is expected; a private Support panel appearing is not.
 try{
  await page.goto(origin+'/dashboard.html?tab=support',{waitUntil:'domcontentloaded',timeout:30000});
 }catch(error){
  if(!/interrupted by another navigation|ERR_ABORTED/i.test(String(error?.message||'')))throw error;
 }
 await page.waitForTimeout(2200);
 assert.equal(await page.locator('#member-support-panel').isVisible(),false,
  'Signed-out user must not see private Support panel');
 console.log('PASS genuine Supabase sign-out; private Support is no longer visible.');
 await context.close();
}catch(error){
 console.error('FAIL/BLOCKED real production Chromium member QA: '+String(error?.message||error).slice(0,410));
 process.exitCode=1;
}finally{await browser?.close()}
