/* Genuine James_Test password session and Chart Studio's expiring restrictive tier.
 * No role, wallet, membership, entitlement, workspace or brokerage mutations.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const ORIGIN='https://stock-market-from-the-ground-up-d1r.pages.dev';
const EXPECTED_USER='f42f9301-18e6-43a3-8531-32d371fd22c1';
const EXPECTED_TIER='STANDARD';
const ranks={STANDARD:0,ADVANCED:1,PROFESSIONAL:2};
const email=process.env.LAB_QA_EMAIL||'',pass=process.env.LAB_QA_PASSWORD||'';
if(EXPECTED_TIER==='PREPARED'){
 console.log('PREPARED: waiting for Owner-controlled expiring James_Test-only QA ceiling.');
 process.exit(0);
}
if(!email||!pass)throw Error('BLOCKED: original James_Test encrypted QA credentials missing');
const guard=await fetch(ORIGIN+'/api/auth-guard-v0135').then(r=>r.json());
if(guard?.ok!==true||guard.enabled!==false)throw Error('BLOCKED: login CAPTCHA QA window not enabled by Owner');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
const page=await context.newPage();
try{
 await page.goto(ORIGIN+'/signin.html?next=%2Fdashboard.html',{waitUntil:'domcontentloaded'});
 await page.locator('#login-identifier').fill(email);
 await page.locator('#login-password').fill(pass);
 await page.locator('.auth-card button[type=submit]').click();
 await page.waitForURL(u=>/^\/dashboard(?:\.html)?$/i.test(u.pathname),{timeout:22000});
 const identity=await page.evaluate(async()=>{
  const db=await window.getSupabaseClient();
  const [{data:a},{data:b}]=await Promise.all([db.auth.getUser(),db.auth.getSession()]);
  return {id:a?.user?.id,token:b?.session?.access_token};
 });
 assert.equal(identity.id,EXPECTED_USER);
 assert(identity.token);
 const api=async path=>{
  const r=await fetch(ORIGIN+path,{headers:{authorization:'Bearer '+identity.token},cache:'no-store'});
  return {status:r.status,data:await r.json()};
 };
 const permission=await api('/api/chart-tier-access');
 assert.equal(permission.status,200);
 assert.equal(permission.data?.eligible,true);
 assert.equal(permission.data?.tier,EXPECTED_TIER,
  'The authoritative production Chart Studio tier does not match QA ceiling');
 assert.equal(permission.data?.qaTierCeiling?.active,true);
 assert.equal(permission.data?.qaTierCeiling?.restrictive,true);
 assert.equal(permission.data?.ownerChartAccess,false);
 assert.equal(permission.data?.staffChartRole,null);
 const expectedAllowed=['STANDARD',...(ranks[EXPECTED_TIER]>=1?['ADVANCED']:[]),
   ...(ranks[EXPECTED_TIER]>=2?['PROFESSIONAL']:[])];
 assert.deepEqual(permission.data.allowed,expectedAllowed);
 console.log('PASS genuine signed-in '+EXPECTED_TIER+' tier; Admin role preserved but Chart Studio tier restrictively capped');
 await page.goto(ORIGIN+'/simulator.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.CrownlightChartTiers?.getStatus?.().verified===true,null,{timeout:25000});
 const state=await page.evaluate(()=>window.CrownlightChartTiers.getStatus());
 assert.equal(state.tier,EXPECTED_TIER);
 assert.deepEqual(state.allowed,expectedAllowed);
 await page.locator('#sim-mode-csv').click();
 await page.locator('#sim-load-fictional').click();
 await page.waitForFunction(()=>window.CrownlightChartTiers.getRevealedBars().length>=2,null,{timeout:15000});
 for(const selected of ['STANDARD','ADVANCED','PROFESSIONAL']){
  await page.evaluate(tier=>window.CrownlightChartTiers.choose(tier),selected);
  if(ranks[selected]>ranks[EXPECTED_TIER]){
   await page.waitForTimeout(350);
   assert.notEqual(await page.evaluate(()=>window.CrownlightChartTiers.getStatus().selected),selected,
    'Member tier cannot select a locked studio engine');
  }else{
   await page.waitForFunction(s=>window.CrownlightChartTiers.getStatus().selected===s,selected,{timeout:18000});
   if(selected!=='STANDARD'){
    await page.waitForFunction(()=>
      window.CrownlightChartTiers.getInstances().some(x=>x.chart?.getDataList?.().length>=2),
      null,{timeout:18000});
   }
  }
 }
 const workspace=await api('/api/chart-workspace');
 assert.equal(workspace.status,200);
 assert.equal(workspace.data?.ok,true);
 assert.equal(workspace.data?.tier,EXPECTED_TIER);
 assert.equal(workspace.data?.workspace?.selected,
  EXPECTED_TIER==='PROFESSIONAL'?'PROFESSIONAL':'STANDARD',
  'API must project saved premium settings to the currently authorized tier');
 console.log('PASS real '+EXPECTED_TIER+
  ' Chart Studio UI locks and fictional candles; GET returned safely projected workspace. Raw saved Pro workspace is separately verified in Supabase.');
 console.log('RESULT '+EXPECTED_TIER+' PASS (noncommercial restrictive QA ceiling, not paid Founder billing)');
}finally{
 try{await page.evaluate(async()=>{const db=await window.getSupabaseClient();await db.auth.signOut()})}catch{}
 await context.close();await browser.close();
}
