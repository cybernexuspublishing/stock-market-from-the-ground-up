import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {chromium} from 'playwright';
const site='https://stock-market-from-the-ground-up-d1r.pages.dev';
assert(process.env.LAB_QA_EMAIL&&process.env.LAB_QA_PASSWORD,'QA credentials unavailable');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({serviceWorkers:'block'});
 const guard=await (await page.request.get(site+'/api/auth-guard-v0135')).json();
 assert(guard.enabled===false,'CAPTCHA enabled. No bypass.');
 await page.goto(site+'/signin.html?next=%2Fdashboard.html',{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#login-identifier').fill(process.env.LAB_QA_EMAIL);
 await page.locator('#login-password').fill(process.env.LAB_QA_PASSWORD);
 await page.locator('.auth-card button[type="submit"]').click();
 await page.waitForURL(u=>/^\/dashboard(?:\.html)?$/.test(new URL(u).pathname),{timeout:30000});
 const auth=await page.evaluate(async()=>{const c=await window.getSupabaseClient();const {data}=await c.auth.getSession();return {id:data?.session?.user?.id,token:data?.session?.access_token||''}});
 assert.equal(auth.id,'f42f9301-18e6-43a3-8531-32d371fd22c1','Expected James_Test only');
 assert(auth.token.length>30);
 const pre=await page.request.get(site+'/api/lumen-bundle-test-checkout',{timeout:30000});
 const readiness=await pre.json().catch(()=>({}));
 assert(pre.ok()&&readiness.testOnly&&readiness.shadowOnly&&readiness.checkoutEnabled,'Five-bundle TEST provider readiness failed');
 assert.equal(readiness.offers?.length,5);
 console.log('PASS authenticated James_Test and all five QA-only Stripe TEST product/price preflights');
 const r=await page.request.post(site+'/api/lumen-bundle-test-checkout',{
  headers:{origin:site,authorization:'Bearer '+auth.token,'content-type':'application/json'},
  data:JSON.stringify({sku:'SPARKS_25',requestId:randomUUID(),confirm:'STRIPE_TEST_ONLY'}),timeout:35000});
 const obj=await r.json().catch(()=>({}));
 assert(r.ok()&&obj.ok&&obj.testOnly&&obj.shadowOnly,
  'QA-only Checkout POST '+r.status()+' error='+String(obj.error||''));
 assert.equal(obj.amountCents,500);assert.equal(obj.quantity,25);
 assert(/^https:\/\/checkout\.stripe\.com\//.test(obj.url||''),'Real Stripe TEST Checkout missing');
 console.log('PASS authenticated member reserved 25 Lumens and received genuine $5.00 Stripe TEST Checkout; unpaid, no real wallet credit');
}finally{await browser.close()}
