import assert from 'node:assert/strict';
import {chromium} from 'playwright';
// Temporary QA fixtures only, exact server-verified Stripe Checkout sessions; no credit card numbers except Stripe TEST 4242.
// Avoid re-submitting the already-complete LIVE zero-dollar session.
// Book TEST is already PAID: never submit its Checkout again.
const sessions=[{"kind":"lumens","id":"cs_test_a1tG0MwYBq3apx6SDRz1kuUGrKHg91hxyCrztFfphBsP5gMOQWKZgmKebB","livemode":false,"cents":500,"url":"https://checkout.stripe.com/c/pay/cs_test_a1tG0MwYBq3apx6SDRz1kuUGrKHg91hxyCrztFfphBsP5gMOQWKZgmKebB#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSdicyc%2FNSknZHVsTmB8Jz8ndW5acWB2cVowNFBXQm5BT1w8Q0wyZ3xNRzdiakhVZG9ga1BwTmRLf2hfb31GVnd2Y2ZWYFBpTTFKXWlsSzZIXDFMXVVmaWxASXBLdzZiNkdObjxxZmhyaVVqSUNvNjBQczU1Sl1TaXdtak4nKSdjd2poVmB3c2B3Jz9xd3BgKSdnZGZuYndqcGthRmppancnPycmY2NjY2NjJyknaWR8anBxUXx1YCc%2FJ3Zsa2JpYFpscWBoJyknYGtkZ2lgVWlkZmBtamlhYHd2Jz9xd3BgeCUl"}];

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[];
function visibleInput(page,selectors){
 return (async()=>{for(const f of page.frames())for(const sel of selectors){const locator=f.locator(sel).first();if(await locator.isVisible().catch(()=>false))return locator;}return null})()
}
function originLocation(u){try{const q=new URL(u);return q.origin+q.pathname}catch{return String(u).slice(0,120)}}
async function fillFirst(page,selectors,value,required=false){
 const node=await visibleInput(page,selectors);
 if(node){await node.fill(value);return true}
 if(required)throw Error('required input unavailable: '+selectors.join(','));
 return false
}
async function invalidFields(page){
 const list=[];
 for(const f of page.frames()){
  const nodes=f.locator('[aria-invalid="true"]:visible');
  for(const el of (await nodes.all().catch(()=>[])).slice(0,5)){
   const attrs={};
   for(const attr of ['name','id','autocomplete','placeholder','aria-label','type','data-testid'])attrs[attr]=(await el.getAttribute(attr).catch(()=>null))?.slice(0,90)||null;
   list.push({frameOrigin:((()=>{try{return new URL(f.url()).origin}catch{return 'unknown'}})()),tag:await el.evaluate(x=>x.tagName).catch(()=>'unknown'),attrs});
  }
 }
 return list.slice(0,12);
}
async function attempt(s){
 const page=await browser.newPage({serviceWorkers:'block',viewport:{width:1440,height:1100}});
 const issues=[], failed=[];
 page.on('response',response=>{
  const status=response.status();
  if(status<400)return;
  let u;try{u=new URL(response.url())}catch{return}
  if(!/(^|\.)stripe\.com$/.test(u.hostname) && !/(^|\.)stripe\.network$/.test(u.hostname))return;
  issues.push({status,origin:u.origin,path:u.pathname.slice(0,130),method:response.request().method()});
 });
 page.on('requestfailed',request=>{
  let u;try{u=new URL(request.url())}catch{return}
  if(/(^|\.)stripe\.com$/.test(u.hostname) || /(^|\.)stripe\.network$/.test(u.hostname))
   failed.push({origin:u.origin,path:u.pathname.slice(0,110),error:request.failure()?.slice(0,100)});
 });
 try{
  console.log('BEGIN '+s.kind+' '+s.id.slice(0,19)+' amount='+s.cents+' mode='+(s.livemode?'LIVE ZERO':'TEST'));
  assert(!s.livemode||s.cents===0,'LIVE NONZERO SAFETY STOP');
  await page.goto(s.url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForTimeout(3500);
  console.log('PAGE '+s.kind+' '+originLocation(page.url())+' title='+String(await page.title()).slice(0,70));
  assert(page.url().startsWith('https://checkout.stripe.com/'),'Not on Stripe secure hosted checkout');
  const email=await fillFirst(page,['input[type="email"]','input[name="email"]','input[autocomplete="email"]'],'qa-payments-smfgu@example.com');
  if(email)console.log('FILLED email '+s.kind);
  await page.waitForTimeout(2000);
  const frames=page.frames();
  console.log('FRAMES '+s.kind+' '+frames.map(f=>originLocation(f.url())).join(' | ').slice(0,500));
  console.log('VISIBLE '+s.kind+' '+JSON.stringify((await page.locator('button:visible').allTextContents().catch(()=>[])).map(x=>x.trim()).filter(Boolean).slice(0,12)));
  const cardSelectors=['input[name="cardNumber"]','input[autocomplete="cc-number"]','input[placeholder*="1234"]','input[aria-label*="Card number"]','input[id*="cardNumber"]'];
  const card=await visibleInput(page,cardSelectors);
  if(s.livemode){
   if(card)throw Error('LIVE ZERO SAFETY STOP: card number requested');
   const pageText=(await page.locator('body').innerText().catch(()=>'')).slice(0,4000);
   if(!/0[.]00|\$0|Free|No payment required/i.test(pageText))throw Error('LIVE ZERO SAFETY STOP: price not visibly zero');
   if(/[\$£€]\s*[1-9][0-9]*(?:\.[0-9]{2})?/.test(pageText))throw Error('LIVE ZERO SAFETY STOP: possible nonzero display');
  }else{
   assert(card,'Stripe TEST card field unavailable after email; no charge made');
   await card.fill('4242424242424242');
   await fillFirst(page,['input[name="cardExpiry"]','input[autocomplete="cc-exp"]','input[placeholder*="MM"]'],'12/36',true);
   await fillFirst(page,['input[name="cardCvc"]','input[autocomplete="cc-csc"]','input[placeholder*="CVC"]'],'123',true);
   await fillFirst(page,['input[name="billingPostalCode"]','input[autocomplete="postal-code"]'],'65810');
   await fillFirst(page,['input[name="billingName"]','input[autocomplete="cc-name"]'],'SMFGU STRIPE TEST');
   // Stripe-hosted TEST Checkout collects a required phone number. Use a fictional
   // North American 555-01xx example; do not use a member's real contact details.
   await fillFirst(page,['input[name="phoneNumber"]','input[autocomplete="tel"]','input[type="tel"]'],'2015550123');
  }
  const buttons=await page.locator('button[type="submit"]:visible').all();
  let submit=buttons.at(-1);
  if(!submit)submit=page.getByRole('button',{name:/pay|complete|place order|submit|subscribe|confirm/i}).last();
  assert(await submit.isVisible().catch(()=>false),'Stripe submit unavailable');
  const label=(await submit.innerText().catch(()=>'')).trim().slice(0,120);
  if(s.livemode&&!/complete|pay|confirm|submit|place order|continue/i.test(label))throw Error('LIVE ZERO SAFETY STOP: unexpected button '+label);
  console.log('INVALID_BEFORE_SUBMIT '+s.kind+' '+JSON.stringify(await invalidFields(page)));
  console.log('SUBMIT '+s.kind+' '+label);
  await submit.click({timeout:20000});
  await page.waitForTimeout(9000);
  // In some Stripe TEST Checkout renderings, phone becomes required only after
  // the first submit. Correct this normal validation once; never bypass CAPTCHA.
  if(page.url().startsWith('https://checkout.stripe.com/c/pay/')){
   const phone=await visibleInput(page,['input[name="phoneNumber"]','input[autocomplete="tel"]','input[type="tel"]']);
   if(phone && (await phone.getAttribute('aria-invalid').catch(()=>null))==='true'){
    console.log('REQUIRED_PHONE_APPEARED_AFTER_VALIDATION '+s.kind);
    await phone.fill('2015550123');
    const payAgain=page.locator('button[type="submit"]:visible').last();
    if(!(await payAgain.isVisible()))throw Error('Stripe TEST follow-up Pay unavailable');
    await payAgain.click({timeout:20000});
    await page.waitForTimeout(9000);
    console.log('POST_PHONE_VALIDATION_RETRY '+s.kind+' '+originLocation(page.url()));
   }
  }
  const alerts=[];
  for(const f of page.frames())for(const sel of ['[role="alert"]','[data-testid*="error"]','[aria-invalid="true"]']){
   const loc=f.locator(sel);for(const node of (await loc.all()).slice(0,4))if(await node.isVisible().catch(()=>false))alerts.push((await node.innerText().catch(()=>'')).slice(0,140));
  }
  const after=originLocation(page.url());
  const challenges=page.frames().filter(f=>/hcaptcha|captcha/i.test(f.url()));
  console.log('AFTER '+s.kind+' '+after+' alerts='+JSON.stringify(alerts.slice(0,5)));
  console.log('NETWORK_HTTP_FAILURES '+s.kind+' '+JSON.stringify(issues.slice(-15)));
  console.log('NETWORK_ABORTS '+s.kind+' '+JSON.stringify(failed.slice(-10)));
  console.log('CAPTCHA_EMBED_COUNT '+s.kind+' '+challenges.length);
  console.log('FIELD_INVALID_SUMMARY '+s.kind+' '+JSON.stringify(await invalidFields(page)));
  // Provider state checked independently after this run; browser success alone never grants acceptance.
  if(after.includes('/c/pay/'))throw Error('Checkout remained hosted after submit; provider reconciliation required');
  if(!page.url().startsWith('https://stock-market-from-the-ground-up-d1r.pages.dev/'))throw Error('No expected site return after submit');
  console.log('BROWSER_RETURN_PASS '+s.kind);
 }catch(e){errors.push({kind:s.kind,error:String(e).slice(0,350)});console.log('BROWSER_FAIL '+s.kind+' '+String(e).slice(0,380));}
 finally{await page.close().catch(()=>{})}
}
try{for(const s of sessions)await attempt(s);}finally{await browser.close();}
console.log('BROWSER_RESULTS '+JSON.stringify({passed:sessions.length-errors.length,failed:errors.length,errors}));
if(errors.length)process.exitCode=1;
