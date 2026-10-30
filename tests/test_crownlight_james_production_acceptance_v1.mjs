/* Genuine production-account Chart Studio QA: password-authenticated James_Test.
 * No mocked identity, service-role key, owner action, Founder seat or live payments.
 * A real sign-in requires the Owner-controlled CAPTCHA-off QA window.
 * QA workspace changes are intentional; existing settings are restored.
 * An actual Sparks debit requires a separate manual opt-in, never on push.
 */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {chromium} from 'playwright';
const origin='https://stock-market-from-the-ground-up-d1r.pages.dev';
const target='f42f9301-18e6-43a3-8531-32d371fd22c1';
const email=process.env.LAB_QA_EMAIL||'',password=process.env.LAB_QA_PASSWORD||'';
const debit=process.env.CROWN_QA_ALLOW_SPARKS_DEBIT==='true';
if(!email||!password)throw Error('BLOCKED: LAB_QA_EMAIL and LAB_QA_PASSWORD must be configured as encrypted GitHub secrets');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:900}});
const page=await context.newPage();
let existing=null,updated=false,accountVerified=false;
async function api(path,method='GET',body=null){
 return page.evaluate(async ({path,method,body})=>{
  const sb=await window.getSupabaseClient();
  const {data}=await sb.auth.getSession();
  if(!data?.session?.access_token)throw Error('Genuine member session unavailable');
  const r=await fetch(path,{method,cache:'no-store',
   headers:{authorization:'Bearer '+data.session.access_token,...(body?{'content-type':'application/json'}:{})},
   body:body?JSON.stringify(body):undefined});
  return {status:r.status,data:await r.json()};
 },{path,method,body});
}
async function signIn(){
 await page.goto(origin+'/signin.html?next='+encodeURIComponent('/dashboard.html'),{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#login-identifier').fill(email);
 await page.locator('#login-password').fill(password);
 // The live GoTrue service has returned transient HTTP 500 (unexpected EOF
 // / context canceled). Retry once ONLY for those exact infrastructure errors;
 // never retry incorrect credentials, denied CAPTCHA or an unknown failure.
 let signedIn=false;
 for(let attempt=1;attempt<=2;attempt++){
  await page.locator('.auth-card button[type="submit"]').click();
  try{
   // Cloudflare Pages canonicalizes *.html URLs to extensionless routes.
   // Wait for navigation to settle, not a transient SDK session on /signin.
   await page.waitForURL(u=>/^\/dashboard(?:\.html)?$/i.test(u.pathname),{timeout:12000});
   signedIn=true;break;
  }catch{}
  const message=String(await page.locator('#signin-message').textContent().catch(()=>'')); 
  if(attempt<2&&/unexpected EOF|context canceled|internal server error|service temporarily unavailable/i.test(message)){
   console.log('WARN transient authentication provider failure; retrying once without bypassing CAPTCHA.');
   await page.waitForTimeout(1600);
   continue;
  }
  throw Error('Real UI sign-in failed, without a verified QA identity: '+
   JSON.stringify({message:message.slice(0,220),pathname:new URL(page.url()).pathname}));
 }
 if(!signedIn)throw Error('Real UI sign-in was not confirmed');
 const atSignIn=await page.evaluate(async()=>{
  const sb=await window.getSupabaseClient();const [{data:session},{data:user,error}]=await Promise.all([
   sb.auth.getSession(),sb.auth.getUser()]);
  return {hasSession:!!session?.session?.access_token,validUser:!!user?.user&&!error,
   id:user?.user?.id||null};
 });
 if(!atSignIn.validUser||atSignIn.id!==target){
  throw Error('Authenticated QA credential/session identity not verified at sign-in: '+
    JSON.stringify({hasSession:atSignIn.hasSession,validUser:atSignIn.validUser,
     matchesJames:atSignIn.id===target,pathname:new URL(page.url()).pathname}));
 }
 console.log('PASS credential identity verified as James_Test before Chart Studio navigation');
 await page.goto(origin+'/simulator.html?studio=ADVANCED',{waitUntil:'domcontentloaded',timeout:30000});
 const uid=await page.evaluate(async()=>{const sb=await window.getSupabaseClient();
  const {data,error}=await sb.auth.getUser();return error?null:data?.user?.id;});
 assert.equal(uid,target,'Authenticated session did not survive navigation to Chart Studio');
 accountVerified=true;
}
try{
 const guard=await page.request.get(origin+'/api/auth-guard-v0135',{timeout:30000});
 assert(guard.ok(),'Live authentication guard not responding');
 const config=await guard.json();
 assert.equal(config.ok,true,'Authentication guard configuration not healthy');
 assert.equal(config.enabled,false,'BLOCKED: Owner-controlled CAPTCHA-off QA window required; do not bypass Turnstile');
 console.log('PASS legitimate Owner-controlled login window detected');
 await signIn();
 console.log('PASS real James_Test authenticated website sign-in');
 await page.waitForFunction(()=>window.CrownlightChartTiers?.getStatus?.().verified===true,{timeout:25000});
 const entitlement=await api('/api/chart-tier-access');
 assert.equal(entitlement.status,200);
 assert.equal(entitlement.data.eligible,true);
 assert.equal(entitlement.data.tier,'PROFESSIONAL','James_Test existing ADMIN role takes precedence over the scoped Advanced QA grant');
 assert(entitlement.data.allowed.includes('ADVANCED'));
 console.log('PASS live Professional admin override and allowed Advanced Chart Studio selection');
 await page.waitForFunction(()=>window.CrownlightChartTiers?.getRevealedBars?.().length>=2,{timeout:20000});
 const revealed=await page.evaluate(()=>window.CrownlightChartTiers.getRevealedBars());
 assert(revealed.length>=2 && Number.isSafeInteger(revealed[0].timestamp));
 assert(revealed[1].timestamp>revealed[0].timestamp);
 // Owner's actual failure: data and EMA values present, but candlestick
 // pane collapsed beneath duplicate indicators. Check the REAL signed-in
 // production chart rather than only observing canvas creation.
 await page.waitForFunction(()=>{
  const chart=window.CrownlightChartTiers?.getInstances?.()[0]?.chart;
  return !!chart&&chart.getDataList().length>=2&&
   (chart.getSize('candle_pane')?.height||0)>=200;
 },null,{timeout:20000});
 const chartProof=await page.evaluate(()=>{
  const chart=window.CrownlightChartTiers.getInstances()[0].chart;
  const ema=chart.getIndicators({name:'EMA'});
  const rsi=chart.getIndicators({name:'RSI'});
  return {candles:chart.getDataList().length,
   priceHeight:chart.getSize('candle_pane')?.height||0,
   ema:ema.length,emaPane:ema[0]?.paneId||null,rsi:rsi.length};
 });
 assert(chartProof.candles>=2&&chartProof.priceHeight>=200,
  'Actual production candle pane is not visible: '+JSON.stringify(chartProof));
 assert(chartProof.ema===1&&chartProof.emaPane==='candle_pane'&&chartProof.rsi<=1,
  'Real saved studies must not create duplicate price/oscillator panes: '+JSON.stringify(chartProof));
 console.log('PASS real production Advanced candlesticks visible: '+chartProof.candles+
  ' bars, '+chartProof.priceHeight+'px price pane, one EMA overlay, no duplicate RSI');
 assert.equal(await page.locator('.crownlight-shell').isVisible(),false,
  'Advanced must display ONE chart player, not a second Standard chart above KLine');
 const rendered=await page.evaluate(()=>{
  const entry=window.CrownlightChartTiers.getInstances()[0],layers=[...entry.host.querySelectorAll('canvas')];
  let bull=0,bear=0;
  for(const el of layers){
   const st=getComputedStyle(el);
   if(st.marginTop!=='0px'||st.borderTopWidth!=='0px'||st.maxHeight!=='none')
    throw Error('KLine layer inherits broken fallback canvas styling: '+[st.marginTop,st.borderTopWidth,st.maxHeight]);
   const ctx=el.getContext('2d'),w=el.width,h=el.height;if(!ctx||w<110)continue;
   const px=ctx.getImageData(0,0,w,h).data;
   for(let y=40;y<Math.min(h,Math.round(h*.8));y+=2)
    for(let x=30;x<Math.max(30,w-40);x+=2){
     const i=(y*w+x)*4,r=px[i],g=px[i+1],b=px[i+2];
     if(g>105&&g>r*1.35&&g>b*1.1)bull++;
     if(r>125&&r>g*1.6&&r>b*1.2)bear++;
    }
  }
  return {bull,bear,layers:layers.length};
 });
 assert(rendered.bull+rendered.bear>15,
  'Actual production price candles must be painted, not just loaded into JS: '+JSON.stringify(rendered));
 console.log('PASS real production KLine canvas has colored candlestick pixels and no duplicate Standard player: '+JSON.stringify(rendered));
 const current=await api('/api/chart-workspace');
 assert.equal(current.status,200);assert.equal(current.data.ok,true);
 existing=current.data;
 const testWorkspace={selected:'ADVANCED',sync:false,studies:['EMA','RSI'],
  drawings:[{name:'segment',points:[
   {timestamp:revealed[0].timestamp,value:revealed[0].close},
   {timestamp:revealed[1].timestamp,value:revealed[1].close}]}],layout:'SIDE_BY_SIDE'};
 const put=await api('/api/chart-workspace','PUT',testWorkspace);
 assert.equal(put.status,200,'Real production workspace PUT must succeed');
 assert.equal(put.data.ok,true);updated=true;
 const saved=await api('/api/chart-workspace');
 assert.equal(saved.status,200);
 assert.equal(saved.data.workspace.selected,'ADVANCED');
 assert.deepEqual(saved.data.workspace.studies,['EMA','RSI']);
 assert.deepEqual(saved.data.workspace.drawings,testWorkspace.drawings);
 console.log('PASS genuine member workspace save and readback with drawings on revealed candles');
 const offers=await api('/api/member-sparks-chart');
 assert.equal(offers.status,200);
 const day=offers.data.offers.find(o=>o.sku==='CHART_PROFESSIONAL_DAY');
 assert(day&&Number.isSafeInteger(day.costSparks)&&day.costSparks>0);
 const walletBefore=await api('/api/member-sparks-wallet');
 assert.equal(walletBefore.status,200);
 assert(walletBefore.data.wallet.available>=day.costSparks);
 console.log('PASS live signed-in Chart Sparks quote and wallet verification (no debit)');
 if(debit){
  const id=randomUUID();
  const purchase=await api('/api/member-sparks-chart','POST',{sku:day.sku,requestId:id,expectedCost:day.costSparks});
  assert.equal(purchase.status,200,'QA Sparks redemption must succeed without checkout');
  assert.equal(purchase.data.ok,true);assert.equal(purchase.data.alreadyRedeemed,false);
  const again=await api('/api/member-sparks-chart','POST',{sku:day.sku,requestId:id,expectedCost:day.costSparks});
  assert.equal(again.status,200);assert.equal(again.data.alreadyRedeemed,true);
  const after=await api('/api/member-sparks-wallet');
  assert.equal(after.data.wallet.available,walletBefore.data.wallet.available-day.costSparks);
  console.log('PASS ACTUAL opted-in QA Sparks debit, idempotency, wallet balance. Nonreversible QA spend: '+day.costSparks);
 }else{
  console.log('NOT RUN: actual Sparks debit requires manual workflow_dispatch redeem_test_sparks opt-in');
 }
 await page.evaluate(async()=>{const sb=await window.getSupabaseClient();await sb.auth.signOut()})
  .catch(err=>{if(!/Execution context was destroyed|navigation/i.test(String(err?.message||'')))throw err});
 // A protected Simulator deep link redirects guests during initialization.
 // Inspect the stable sign-in page after sign-out to avoid racing that navigation.
 await page.goto(origin+'/signin.html',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(async()=>{
  try{const sb=await window.getSupabaseClient();const {data}=await sb.auth.getSession();
   return !data?.session;}catch{return false}
 },null,{timeout:12000});
 console.log('PASS genuine sign-out and invalidation of browser session');
 await signIn();
 const restored=await api('/api/chart-workspace');
 assert.equal(restored.status,200);
 assert.deepEqual(restored.data.workspace.drawings,testWorkspace.drawings);
 assert.deepEqual(restored.data.workspace.studies,['EMA','RSI']);
 assert.equal(restored.data.workspace.selected,'ADVANCED');
 console.log('PASS genuine cross-session workspace restore via production API');
 if(existing?.updatedAt){
  const restore=await api('/api/chart-workspace','PUT',existing.workspace);
  assert.equal(restore.status,200,'Restore previous QA workspace settings after acceptance');
  console.log('PASS prior QA workspace settings restored');
 }else{
  console.log('PASS first saved QA workspace remains available as persistence evidence');
 }
 const noToken=await page.request.get(origin+'/api/chart-workspace');
 assert.equal(noToken.status(),401,'Unauthenticated caller must not read private workspaces');
 const query=await api('/api/chart-workspace?user_id=00000000-0000-4000-8000-000000000000');
 assert.equal(query.status,200,'Valid account should still see only its own workspace');
 assert.deepEqual(query.data.workspace.studies,existing?.updatedAt?existing.workspace.studies:['EMA','RSI']);
 console.log('PASS unsigned workspace denial and ignored client-supplied user_id');
 console.log('ACCEPTED: authenticated James_Test Chart Studio tier, private workspace persistence and Sparks pricing');
}catch(e){
 console.error('BLOCKED/FAILED genuine chart QA: '+String(e?.message||e).slice(0,800));
 if(updated)console.error('QA workspace may contain current test settings; do not mistake it for another member record');
 process.exitCode=1;
}finally{await context.close();await browser.close();}
