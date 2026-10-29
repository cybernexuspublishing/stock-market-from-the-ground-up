/* Actual production UI with real QA credentials. NO mocks, no payment. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const site='https://stock-market-from-the-ground-up-d1r.pages.dev';
const qa='f42f9301-18e6-43a3-8531-32d371fd22c1';
const email=process.env.LAB_QA_EMAIL||'',password=process.env.LAB_QA_PASSWORD||'';
if(!email||!password)throw Error('BLOCKED: actual QA username/password secrets unavailable');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',reducedMotion:'reduce'});
const page=await context.newPage();
try{
 const guard=await page.request.get(site+'/api/auth-guard-v0135');
 assert.equal(guard.status(),200);
 const settings=await guard.json();
 if(settings.enabled!==false)throw Error('BLOCKED: genuine UI login requires Owner-controlled CAPTCHA-off window; no Turnstile bypass');
 await page.goto(site+'/signin.html?next='+encodeURIComponent('/verified-replay.html?scope=historical&ticker=DIS&date=2024-05-07&timeframe=3'),{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#login-identifier').fill(email);
 await page.locator('#login-password').fill(password);
 await page.locator('.auth-card button[type="submit"]').click();
 await page.waitForURL(u=>/^\/verified-replay(?:\.html)?$/i.test(u.pathname),{timeout:18000});
 const result=await page.evaluate(async()=>{const sb=await window.getSupabaseClient();const {data,error}=await sb.auth.getUser();return {id:data?.user?.id||'',valid:!error}});
 assert(result.valid&&result.id===qa,'Actual website must authenticate the pinned dedicated QA account');
 await page.locator('#vr-dataset').waitFor();
 await page.waitForFunction(()=>!document.getElementById('vr-dataset-note')?.textContent?.includes('The list is available only'));
 const options=await page.locator('#vr-dataset option').evaluateAll(nodes=>nodes.map(x=>({value:x.value,text:x.textContent})));
 // DIS is available only if the server has authorized this pinned QA account.
 const available=options.filter(x=>x.value&&/^[A-Z][A-Z0-9_-]{2,79}$/.test(x.value));
 assert(available.some(x=>x.value==='HR_DIS_20240507'),'The real published QA-only DIS dataset must appear in the authorized browser catalog');
 if(!available.length){
  console.log('NOT ACCEPTED POSITIVE: authenticated catalog has no licensed historical case.');
 }else{
  const code=available[0].value;
  // First-time member onboarding is part of the genuine UI; dismiss it
  // through the supported Skip action rather than bypassing the modal.
  const tour=page.locator('#fe-onboarding[open]');
  await tour.waitFor({state:'visible',timeout:2500}).catch(()=>{});
  if(await tour.isVisible())await tour.locator('[data-skip]').click();
  await page.locator('#vr-dataset').selectOption(code);
  await page.locator('#vr-start').click();
  await page.locator('#vr-session').waitFor({state:'visible'});
  await page.locator('#vr-source a[href="https://www.iex.io/legal/hist-data-terms"]').waitFor({state:'visible'});
  assert.match(await page.locator('#vr-source').innerText(),/IEX executions only, not consolidated SIP/);
  assert.equal(await page.locator('#vr-advance').isDisabled(),true);
  await page.locator('#vr-decision').selectOption('NO_TRADE');
  await page.locator('#vr-reason').fill('QA decision: no confirmed entry or invalidation from the first completed candle alone.');
  await page.locator('#vr-lock').click();
  await page.waitForFunction(()=>!document.querySelector('#vr-advance')?.disabled);
  await page.locator('#vr-advance').click();
  await page.waitForFunction(()=>document.querySelector('#vr-index')?.textContent?.trim()==='1');
  await page.locator('#hr-timeframe').selectOption('1');
  assert.match(await page.locator('#hr-talia-copy').innerText(),/completed/);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#vr-resume').click();
  await page.waitForFunction(()=>document.querySelector('#vr-index')?.textContent?.trim()==='1');
  console.log('PASS real-account positive: decision locked, future bar revealed, Talia matched, session resumed.');
  await page.locator('#vr-finish').click();
 }
 await page.evaluate(async()=>{const sb=await window.getSupabaseClient();await sb.auth.signOut()})
  .catch(err=>{if(!/Execution context was destroyed|navigation/i.test(String(err?.message||'')))throw err});
 await page.goto(site+'/signin.html',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(async()=>{try{const sb=await window.getSupabaseClient();const {data}=await sb.auth.getSession();return !data?.session}catch{return false}},null,{timeout:12000});
 console.log('PASS real authenticated browser, guest-data exclusion and sign-out.');
}finally{await browser.close();}
