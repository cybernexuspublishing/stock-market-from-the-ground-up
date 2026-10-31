/* Real production Chromium acceptance: unauthenticated and pinned QA member
 * cannot read or record Owner advertising audits. No writes, purchases, or
 * fabricated Owner roles. Browser positive requires a genuine Owner session.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const site='https://stock-market-from-the-ground-up-d1r.pages.dev';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
let memberVerified=false;
try{
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:800}});
 const page=await context.newPage();
 const nav=await page.goto(site+'/admin-advertising.html',{waitUntil:'domcontentloaded',timeout:30000});
 assert.equal(nav.status(),200,'Public Owner-login shell must be reachable');
 const guest=await page.request.get(site+'/api/ad-sales?admin=1',{timeout:25000});
 assert.equal(guest.status(),401,'Unauthenticated sponsor inventory must remain unavailable');
 console.log('PASS guest refused: Advertising Owner inventory HTTP 401');
 const source=await page.locator('body').innerText();
 assert(!/PASS — signed-in Owner verified/.test(source),'Guest may not have an Owner acceptance result');
 const email=process.env.LAB_QA_EMAIL||'',password=process.env.LAB_QA_PASSWORD||'';
 if(email&&password){
  const guard=await page.request.get(site+'/api/auth-guard-v0135',{timeout:20000});
  assert.equal(guard.status(),200);
  const status=await guard.json();
  if(status.enabled!==false){
   console.log('BLOCKED optional QA-member sign-in: real CAPTCHA is on; no bypass attempted');
  }else{
   await page.goto(site+'/signin.html?next=%2Fdashboard.html',{waitUntil:'domcontentloaded',timeout:30000});
   await page.locator('#login-identifier').fill(email);
   await page.locator('#login-password').fill(password);
   await page.locator('.auth-card button[type="submit"]').click();
   await page.waitForURL(x=>new URL(x).pathname==='/dashboard.html',{timeout:30000});
   const credentials=await page.evaluate(async()=>{
    const sb=await window.getSupabaseClient();
    const d=await sb.auth.getSession();return {id:d.data?.session?.user?.id,token:d.data?.session?.access_token}
   });
   assert.equal(credentials.id,'f42f9301-18e6-43a3-8531-32d371fd22c1',
    'Encrypted QA account must be the designated Free member');
   assert(credentials.token);
   const member=await page.request.get(site+'/api/ad-sales?admin=1',{
    headers:{authorization:'Bearer '+credentials.token},timeout:30000});
   assert.equal(member.status(),403,'Free QA member must not access Owner sponsorship inventory');
   memberVerified=true;console.log('PASS signed-in James_Test denied Owner inventory HTTP 403');
   await page.goto(site+'/admin-advertising.html',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForTimeout(1200);
   const unlocked=await page.locator('#gu-ad-admin-main').isVisible();
   assert.equal(unlocked,false,'Non-Owner cannot see private advertiser controls');
   console.log('PASS signed-in Free member did not unlock Owner dashboard');
  }
 }else console.log('BLOCKED optional QA-member login: existing encrypted login secrets unavailable');
 console.log('AD_OWNER_NEGATIVE_ACCEPTANCE '+JSON.stringify({
  anonymousDenied:true,memberDenied:memberVerified,readOnly:true,ownerPositiveVerified:false,liveCharges:0
 }));
 await context.close();
}finally{await browser.close()}
