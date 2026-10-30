/* Genuine GRML production UI with real QA credentials; restricted QA release only. NO mocks, no payment. */
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
 await page.goto(site+'/signin.html?next='+encodeURIComponent('/verified-replay.html?scope=historical&ticker=GRML&date=2026-09-21&timeframe=3'),{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#login-identifier').fill(email);
 await page.locator('#login-password').fill(password);
 await page.locator('.auth-card button[type="submit"]').click();
 await page.waitForURL(u=>/^\/verified-replay(?:\.html)?$/i.test(u.pathname),{timeout:18000});
 const result=await page.evaluate(async()=>{const sb=await window.getSupabaseClient();const {data,error}=await sb.auth.getUser();return {id:data?.user?.id||'',valid:!error}});
 assert(result.valid&&result.id===qa,'Actual website must authenticate the pinned dedicated QA account');
 await page.locator('#vr-dataset').waitFor();
 await page.waitForFunction(()=>!document.getElementById('vr-dataset-note')?.textContent?.includes('The list is available only'));
 const options=await page.locator('#vr-dataset option').evaluateAll(nodes=>nodes.map(x=>({value:x.value,text:x.textContent})));
 // GRML is available only if the server has individually QA-published it to this pinned account.
 const available=options.filter(x=>x.value&&/^[A-Z][A-Z0-9_-]{2,79}$/.test(x.value));
 assert(available.some(x=>x.value==='HR_GRML_20260921'),'The real GRML QA-only source must appear for this pinned QA identity');
 if(!available.length){
  console.log('NOT ACCEPTED POSITIVE: authenticated catalog has no licensed historical case.');
 }else{
  const code='HR_GRML_20260921';
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
  assert.match(await page.locator('#hr-grml-lesson h4').innerText(),/Observe before predicting/);
  assert.equal(await page.locator('.hr-grml-options button').count(),3);
  await page.locator('.hr-grml-options button').nth(2).click();
  assert.match(await page.locator('.hr-grml-feedback').innerText(),/Exactly/);
  await page.locator('#vr-decision').selectOption('NO_TRADE');
  await page.locator('#vr-reason').fill('QA decision: no confirmed entry or invalidation from the first completed candle alone.');
  await page.locator('#vr-lock').click();
  await page.waitForFunction(()=>!document.querySelector('#vr-advance')?.disabled);
  const stageChecks=new Map([[2,/Recognize candle sequences/],[4,/Read venue volume carefully/],
   [9,/Mark observed levels/],[14,/Check completed higher timeframes/],
   [19,/Define the trade and the risk/],[24,/Reassess rather than force a setup/],
   [29,/Separate decision quality from hindsight/]]);
  for(let i=1;i<=29;i++){
    await page.locator('#vr-advance').click();
    await page.waitForFunction(idx=>document.querySelector('#vr-index')?.textContent?.trim()===String(idx),i);
    if(stageChecks.has(i))assert.match(await page.locator('#hr-grml-lesson h4').innerText(),stageChecks.get(i),
     'Talia must follow the real server-revealed source-minute milestone');
    if(i===5){
      await page.locator('#hr-timeframe').selectOption('15');
      assert.match(await page.locator('#hr-ohlcv').innerText(),/No completed bar/,'Partial 15m candles must remain hidden');
      await page.locator('#hr-timeframe').selectOption('1');
    }
  }
  await page.locator('#hr-timeframe').selectOption('1');
  assert.match(await page.locator('#hr-count').innerText(),/30 completed 1m bars/);
  await page.locator('#hr-timeframe').selectOption('3');
  assert.match(await page.locator('#hr-count').innerText(),/10 completed 3m bars/);
  await page.locator('#hr-timeframe').selectOption('5');
  assert.match(await page.locator('#hr-count').innerText(),/6 completed 5m bars/);
  await page.locator('#hr-timeframe').selectOption('15');
  assert.match(await page.locator('#hr-count').innerText(),/2 completed 15m bars/);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#vr-resume').click();
  await page.waitForFunction(()=>document.querySelector('#vr-index')?.textContent?.trim()==='29');
  assert.match(await page.locator('#hr-grml-lesson h4').innerText(),/Separate decision quality from hindsight/);
  console.log('PASS GENUINE GRML QA Chromium: full 30-minute source, every Talia checkpoint, completed 1m\/3m\/5m\/15m frames, protected resume.');
  await page.locator('#vr-finish').click();
  await page.locator('#vr-session').waitFor({state:'hidden',timeout:20000});
  assert.match(await page.locator('#vr-notice').innerText(),/Replay finished|recorded in the existing Trading Journal/i);
 }
 await page.evaluate(async()=>{const sb=await window.getSupabaseClient();await sb.auth.signOut()})
  .catch(err=>{if(!/Execution context was destroyed|navigation/i.test(String(err?.message||'')))throw err});
 await page.goto(site+'/signin.html',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(async()=>{try{const sb=await window.getSupabaseClient();const {data}=await sb.auth.getSession();return !data?.session}catch{return false}},null,{timeout:12000});
 console.log('PASS genuine GRML browser sign-out and cleared private observations.');
}finally{await browser.close();}
