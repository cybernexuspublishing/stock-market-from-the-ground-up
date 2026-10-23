/* Free Playwright QA against production. Read-only Lab API operations.
 * Never log secrets, JWTs, response payloads, cookies or personal data.
 */
import {chromium} from 'playwright';
const origin='https://stock-market-from-the-ground-up.pages.dev';
const email=process.env.LAB_QA_EMAIL||'',password=process.env.LAB_QA_PASSWORD||'';
if(!email||!password){console.error('FAIL: QA Secrets missing from GitHub Actions environment.');process.exit(2)}
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
let failed=false;
let phase='initialize';
try{
 const context=await browser.newContext({serviceWorkers:'block'});
 const page=await context.newPage();
 page.setDefaultTimeout(23000);
 phase='open_signin';
 await page.goto(origin+'/signin.html?next=%2Flabs.html',{waitUntil:'domcontentloaded',timeout:30000});
 phase='find_email_field';
 await page.locator('#login-identifier').fill(email);
 phase='find_password_field';
 await page.locator('#login-password').fill(password);
 phase='submit_signin';
 const submit=page.locator('button.auth-submit');
 const visible=await submit.isVisible(),enabled=await submit.isEnabled();
 if(!visible||!enabled)console.error('WARN: Live Sign In submit control is not usable by a typical pointer interaction.');
 try{await submit.click({timeout:5500,noWaitAfter:true})}
 catch{
  console.error('WARN: Live Sign In control did not accept a standard Playwright click; retrying native form submission for API diagnosis.');
  await page.locator('form').evaluate(form=>form.requestSubmit());
 }
 phase='wait_auth_redirect';
 try{await page.waitForURL(url=>!['/signin','/signin.html'].includes(url.pathname),{timeout:24000})}
 catch{console.error('FAIL: QA account login was not completed. Verify email confirmation and account credentials.');failed=true}
 if(!failed){
  phase='read_session_and_labs';
  const result=await page.evaluate(async()=>{
   const sb=await window.getSupabaseClient?.();
   const session=sb&&(await sb.auth.getSession()).data.session;
   if(!session?.access_token)return {authenticated:false};
   const headers={authorization:'Bearer '+session.access_token};
   const check=async(path)=>{
    try{
     const ctrl=new AbortController();
     const timer=setTimeout(()=>ctrl.abort(),17000);
     let response;
     try{response=await fetch(path,{headers,cache:'no-store',signal:ctrl.signal})}
     finally{clearTimeout(timer)}
     let payload={};try{payload=await response.json()}catch{}
     const rawCode=String(payload.code||'');
     const code=['PRIVATE_LAB_STORE_UNAVAILABLE'].includes(rawCode)?rawCode:'';
     return {status:response.status,code,
      type:response.status>=500?'server_failure':response.status===403?'not_entitled':
       response.status===404?'missing_content':response.status===401?'auth_failure':
       response.ok?'success':'other'};
    }catch{return {status:0,type:'network_failure'}}
   };
   const ids=['F1-C02-L01','F2-C07-L01','SITE-001'];
   const checks=[];
   for(const id of ids){
    const [content,context]=await Promise.all([
     check('/api/lab-content?id='+encodeURIComponent(id)),
     check('/api/lab-player-context?id='+encodeURIComponent(id))
    ]);
    checks.push({id,content,context});
   }
   return {authenticated:true,checks};
  });
  if(!result.authenticated){console.error('FAIL: No authenticated Supabase QA session was established.');failed=true}
  else{
   console.log('PASS: QA member authentication succeeded; no credentials or identities logged.');
   for(const {id,content,context} of result.checks){
    console.log(id+' private='+content.status+'/'+content.type+(content.code?'/'+content.code:'')+
       ' context='+context.status+'/'+context.type);
    if([0,500,502,503,504].includes(content.status)||[0,500,502,503,504].includes(context.status))failed=true;
   }
   if(failed)console.error('FAIL: Authenticated Lab API is unavailable; inspect Cloudflare server exceptions and matching Supabase query permissions.');
   else console.log('PASS: No transport/server errors. A 403 or 404 is a separate entitlement/content issue, not proof of full Lab availability.');
  }
 }
 await context.close();
}catch{console.error('FAIL: QA browser stage '+phase+'. Sensitive browser data remains suppressed.');failed=true}
finally{await browser.close()}
process.exitCode=failed?1:0;
