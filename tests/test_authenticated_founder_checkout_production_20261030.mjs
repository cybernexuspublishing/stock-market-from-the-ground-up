/* Noncharging production authorization and LIVE Checkout initialization.
 * Uses the preexisting James_Test GitHub encrypted QA credentials.
 * Never enters payment details, completes Checkout, or changes staff roles.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const site='https://stock-market-from-the-ground-up-d1r.pages.dev';
const email=process.env.LAB_QA_EMAIL||'',password=process.env.LAB_QA_PASSWORD||'';
const expected='f42f9301-18e6-43a3-8531-32d371fd22c1';
assert(email&&password,'BLOCKED: existing encrypted QA browser credentials unavailable');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:800}});
 const page=await context.newPage();
 const gate=await page.request.get(site+'/api/auth-guard-v0135',{timeout:25000});
 const guard=await gate.json();
 assert(gate.ok()&&guard.enabled===false,'BLOCKED: CAPTCHA requires human verification; no bypass');
 await page.goto(site+'/signin.html?next=%2Fdashboard.html',{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#login-identifier').fill(email);
 await page.locator('#login-password').fill(password);
 await page.locator('.auth-card button[type="submit"]').click();
 await page.waitForURL(u=>new URL(u).pathname==='/dashboard.html',{timeout:30000});
 const session=await page.evaluate(async()=>{
   const s=await window.getSupabaseClient();
   const {data}=await s.auth.getSession();
   return {id:data?.session?.user?.id||null,token:data?.session?.access_token||''};
 });
 assert.equal(session.id,expected,'BLOCKED: expected James_Test, not another account');
 assert(session.token.length>50,'BLOCKED: no verified auth session');
 console.log('PASS real member website sign-in');
 const check=await page.request.get(site+'/api/founding600-checkout',{timeout:30000});
 assert.equal(check.status(),200);
 const ready=await check.json();
 const plan=(ready.plans||[]).find(p=>p.code==='FOUNDING_30');
 assert(plan,'BLOCKED: Founding 30-Day not published in checkout readiness response');
 console.log('READINESS '+JSON.stringify({checkoutEnabled:ready.checkoutEnabled,planCheckoutEnabled:plan.checkoutEnabled,phase:ready.phase,remaining:ready.remaining}));
 assert(plan.checkoutEnabled===true,'BLOCKED: Website has not released Founding 30-Day checkout');
 // Create one real Stripe LIVE Checkout session, but never submit a card or pay.
 // Session and founder seat automatically expire after 30 minutes.
 const res=await page.request.post(site+'/api/founding600-checkout',{timeout:40000,headers:{
   origin:site,authorization:'Bearer '+session.token,'content-type':'application/json'
 },data:JSON.stringify({plan:'FOUNDING_30',autoRenewConsent:true,founderTermsConsent:true})});
 const reply=await res.json().catch(()=>({}));
 assert.equal(res.status(),200,'BLOCKED: authenticated checkout returned '+res.status()+' '+String(reply.error||''));
 assert(reply.ok===true&&reply.recurringCents===4999&&reply.billingEveryDays===30,
  'Incorrect paid checkout plan response');
 assert(/^https:\/\/checkout\.stripe\.com\//.test(reply.checkoutUrl||''),
  'Real Stripe Checkout URL not returned');
 console.log('PASS authenticated member created an actual Stripe LIVE Checkout session with verified $49.99/30-day terms');
 console.log('NOT PAID: hosted Stripe Checkout was intentionally not completed; no member entitlement is claimed');
 await context.close();
}finally{await browser.close()}
