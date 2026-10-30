import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const site='https://stock-market-from-the-ground-up-d1r.pages.dev';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({serviceWorkers:'block'});
 assert(process.env.LAB_QA_EMAIL&&process.env.LAB_QA_PASSWORD,'QA credentials unavailable');
 const guard=await (await page.request.get(site+'/api/auth-guard-v0135')).json();
 assert(guard.enabled===false,'CAPTCHA enabled; do not bypass');
 await page.goto(site+'/signin.html?next=%2Fdashboard.html');
 await page.locator('#login-identifier').fill(process.env.LAB_QA_EMAIL);
 await page.locator('#login-password').fill(process.env.LAB_QA_PASSWORD);
 await page.locator('.auth-card button[type="submit"]').click();
 await page.waitForURL(u=>new URL(u).pathname==='/dashboard.html',{timeout:30000});
 const auth=await page.evaluate(async()=>{const c=await window.getSupabaseClient();const {data}=await c.auth.getSession();return {id:data?.session?.user?.id,token:data?.session?.access_token}});
 assert.equal(auth.id,'f42f9301-18e6-43a3-8531-32d371fd22c1');
 console.log('PASS authenticated James_Test');
 const res=await page.request.post(site+'/api/book-stripe-test-checkout-v1',{headers:{origin:site,authorization:'Bearer '+auth.token,'content-type':'application/json'},data:JSON.stringify({code:'FOUNDATION_BOOK_1',format:'epub'})});
 const body=await res.json().catch(()=>({}));
 assert.equal(res.status(),200,'Book TEST start '+res.status()+' '+String(body.error||'').slice(0,130));
 assert(body.testing===true&&/^https:\/\/checkout\.stripe\.com\//.test(body.url||''),'Not a Stripe TEST hosted checkout');
 console.log('PASS TEST checkout session issued');
 await page.goto(body.url,{waitUntil:'domcontentloaded',timeout:45000});
 const pick=async(...selectors)=>{for(const s of selectors)for(const f of [page,...page.frames().filter(x=>x!==page.mainFrame())]){const v=f.locator(s).first();if(await v.isVisible().catch(()=>false))return v;}return null};
 const card=await pick('input[name="cardNumber"]','input[autocomplete="cc-number"]');
 assert(card,'BLOCKED: hosted test card field unavailable');await card.fill('4242424242424242');
 const exp=await pick('input[name="cardExpiry"]','input[autocomplete="cc-exp"]'),cvv=await pick('input[name="cardCvc"]','input[autocomplete="cc-csc"]');
 assert(exp&&cvv,'BLOCKED: hosted expiration/CVC fields unavailable');await exp.fill('1236');await cvv.fill('123');
 const zip=await pick('input[name="billingPostalCode"]','input[autocomplete="postal-code"]');if(zip)await zip.fill('65810');
 const name=await pick('input[name="billingName"]','input[autocomplete="cc-name"]');if(name)await name.fill('SMFGU TEST ONLY');
 const mail=await pick('input[type=email]');if(mail&&!(await mail.inputValue()).trim())await mail.fill(process.env.LAB_QA_EMAIL);
 const pay=page.locator('button[type="submit"]').last();assert(await pay.isVisible(),'TEST checkout submit unavailable');await pay.click();
 try{await page.waitForURL(u=>u.origin===site&&u.pathname==='/my-books.html',{timeout:25000,waitUntil:'domcontentloaded'})}
 catch(e){
  const host=new URL(page.url()).hostname;
  const selectors=['[role="alert"]','[data-testid*="error"]','[aria-invalid="true"]','.Error','[class*="errorMessage"]'];
  const details=[];
  for(const s of selectors)for(const frame of [page,...page.frames().filter(f=>f!==page.mainFrame())]){
   const hits=await frame.locator(s).all().catch(()=>[]);
   for(const node of hits.slice(0,4)){
    if(!await node.isVisible().catch(()=>false))continue;
    const msg=(await node.innerText().catch(()=>''))||await node.getAttribute('name').catch(()=>'');
    if(msg&&/invalid|error|required|declined|verify|expire|country|captcha|postal|unavailable|card/i.test(msg))
      details.push(msg.slice(0,140));
   }
  }
  console.error('BLOCKED Stripe hosted TEST form: host='+host+' detectedValidation='+JSON.stringify(details.slice(0,8)));
  throw Error('Hosted Stripe TEST Checkout did not complete after official test card submit');
 }
 console.log('PASS official fake Stripe test card payment returned to SMFGU website');
}finally{await browser.close()}
