/* Genuine Stripe LIVE $0.00 QA: one authorized Free member only, no paid charge.
 * Must verify signed webhook -> temporary FULL_MONTHLY grant -> tool access
 * -> explicit reset -> FREE; never grant Founding seats or real subscriptions.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const site='https://stock-market-from-the-ground-up-d1r.pages.dev';
const expected='f42f9301-18e6-43a3-8531-32d371fd22c1';
const email=process.env.LAB_QA_EMAIL||'',password=process.env.LAB_QA_PASSWORD||'';
assert(email&&password,'BLOCKED: encrypted QA member credentials required');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:860}});
 const page=await ctx.newPage();
 const guard=await (await page.request.get(site+'/api/auth-guard-v0135')).json();
 assert(guard.enabled===false,'BLOCKED: CAPTCHA enabled; no bypass');
 await page.goto(site+'/signin.html?next=%2Fdashboard.html',{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#login-identifier').fill(email);
 await page.locator('#login-password').fill(password);
 await page.locator('.auth-card button[type="submit"]').click();
 await page.waitForURL(u=>new URL(u).pathname==='/dashboard.html',{timeout:30000});
 const auth=await page.evaluate(async()=>{
  const c=await window.getSupabaseClient();const {data}=await c.auth.getSession();
  return {id:data?.session?.user?.id,token:data?.session?.access_token||''};
 });
 assert.equal(auth.id,expected,'BLOCKED: non-QA identity');
 assert(auth.token.length>50);
 const get=async path=>{
  const r=await page.request.get(site+path,{headers:{authorization:'Bearer '+auth.token},timeout:30000});
  return {status:r.status(),body:await r.json().catch(()=>({}))};
 };
 const post=async(path,data)=>{
  const r=await page.request.post(site+path,{headers:{origin:site,authorization:'Bearer '+auth.token,'content-type':'application/json'},data:JSON.stringify(data),timeout:35000});
  return {status:r.status(),body:await r.json().catch(()=>({}))};
 };
 const pre=await get('/api/store-zero-monthly-qa');
 assert.equal(pre.status,200,'QA GET endpoint unavailable');
 assert.equal(pre.body.available,true,'BLOCKED: zero-monthly QA not enabled for Free member; safe-state '+JSON.stringify({offerClosed:pre.body.offerClosed,available:pre.body.available,planCode:pre.body.planCode,used:pre.body.used,error:pre.body.error}));
 console.log('PASS genuine Free member authorized for isolated $0 QA');
 const created=await post('/api/store-zero-monthly-qa',{confirm:'ONE_TIME_ZERO_MONTHLY_QA',checkoutAttemptId:crypto.randomUUID()});
 assert.equal(created.status,200,'Zero LIVE QA Checkout POST '+created.status+' '+String(created.body.error||''));
 assert(created.body.ok&&created.body.amountCents===0&&/^https:\/\/checkout\.stripe\.com\//.test(created.body.checkoutUrl||''),
  'Zero LIVE QA Checkout failed strict verification');
 const checkout=created.body.checkoutUrl;
 const sid=new URL(checkout).pathname;
 console.log('PASS real $0 LIVE Checkout session created');
 await page.goto(checkout,{waitUntil:'domcontentloaded',timeout:45000});
 const locate=async (...selectors)=>{
  for(const selector of selectors)for(const frame of [page,...page.frames().filter(f=>f!==page.mainFrame())]){
   const field=frame.locator(selector).first();
   if(await field.isVisible().catch(()=>false))return field;
  }
  return null;
 };
 const mail=await locate('input[type=email]','input[autocomplete=email]');
 if(mail&&await mail.isEditable().catch(()=>false)&&!(await mail.inputValue()).trim())await mail.fill(email);
 const submit=await locate('button[type=submit]','button:has-text("Complete")','button:has-text("Pay")');
 assert(submit,'BLOCKED: hosted zero-dollar Checkout submit unavailable');
 await submit.click();
 try{
  await page.waitForURL(u=>u.origin===site&&u.pathname==='/store.html'&&u.searchParams.get('gu72')==='complete',
  {timeout:45000,waitUntil:'domcontentloaded'});
 }catch{
  console.error('BLOCKED: hosted Stripe $0 Checkout did not redirect. host='+new URL(page.url()).host);
  throw Error('ZERO_HOSTED_CHECKOUT_NOT_COMPLETED');
 }
 const callback=new URL(page.url()).searchParams.get('session_id');
 assert(/^cs_live_[A-Za-z0-9_]{6,}$/.test(callback||''),'Missing genuine LIVE Checkout ID');
 console.log('PASS hosted $0 LIVE Checkout completed, no card collected');
 let result;
 for(let i=0;i<22;i++){
  result=await get('/api/store-zero-monthly-qa?session_id='+encodeURIComponent(callback));
  if(result.status===200&&result.body.activated===true)break;
  await sleep(1500);
 }
 assert(result?.status===200&&result.body.checkoutComplete===true,'LIVE zero Checkout completion not confirmed');
 assert(result.body.activated===true,'BLOCKED: signed webhook did not produce the isolated QA membership grant');
 assert.equal(result.body.planCode,'FULL_MONTHLY','Wrong QA entitlement plan');
 console.log('PASS genuine signed LIVE $0 webhook activated QA-only FULL_MONTHLY grant');
 const access=await get('/api/member-tool-access?tool=MARKET_SIMULATOR');
 assert(access.status===200&&access.body.authorized===true,'QA monthly tool entitlement not applied');
 console.log('PASS tool authorization rose with temporary QA-only membership');
 const reverted=await post('/api/store-zero-monthly-qa?action=reset',{confirm:'RESET_MY_ZERO_MONTHLY_QA_ACCESS'});
 assert(reverted.status===200&&reverted.body.reset===true&&reverted.body.resetCount>=1,'QA reset failed');
 const after=await get('/api/store-zero-monthly-qa');
 assert(after.status===200&&after.body.planCode==='FREE','QA member did not return to Free');
 const restricted=await get('/api/member-tool-access?tool=MARKET_SIMULATOR');
 assert(restricted.status===200&&restricted.body.authorized===false,'Premium tool remained granted after reset');
 console.log('PASS restored Free membership and revoked QA premium tool access');
 await ctx.close();
}finally{await browser.close()}
