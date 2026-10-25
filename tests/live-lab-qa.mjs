/* Read-only production QA. Uses a dedicated test account and GitHub Secrets.
 * Supabase authentication is verified independently from the website login UI.
 * Playwright checks the page. No tokens or private lesson bodies are logged.
 */
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const origin='https://stock-market-from-the-ground-up-d1r.pages.dev';
const email=process.env.LAB_QA_EMAIL||'',password=process.env.LAB_QA_PASSWORD||'';
if(!email||!password){console.error('FAIL missing LAB_QA_EMAIL or LAB_QA_PASSWORD GitHub Secrets.');process.exit(2)}
const cfg=readFileSync('config.js','utf8');
const url=cfg.match(/SUPABASE_URL:\s*'([^']+)'/)?.[1];
const pub=cfg.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)?.[1];
if(!url||!pub||!url.startsWith('https://')){console.error('FAIL public Supabase browser config unavailable.');process.exit(2)}
let failure=false;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({serviceWorkers:'block'});
 await page.goto(origin+'/signin.html',{waitUntil:'domcontentloaded',timeout:30000});
 const hasFields=await page.locator('#login-identifier').count()===1&&await page.locator('#login-password').count()===1;
 if(hasFields)console.log('PASS public sign-in fields present.');
 else{console.error('WARN sign-in form fields are missing on the live page.');failure=true}
 await page.close();
}catch{console.error('WARN public sign-in page failed the Playwright smoke.');failure=true}
finally{await browser.close()}
let token='';
try{
 const response=await fetch(url+'/auth/v1/token?grant_type=password',{
  method:'POST',headers:{apikey:pub,'content-type':'application/json'},
  body:JSON.stringify({email,password}),signal:AbortSignal.timeout(20000)});
 const data=await response.json().catch(()=>({}));
 if(response.ok&&typeof data.access_token==='string'){
  token=data.access_token;console.log('PASS Supabase QA password authentication (secret and token redacted).');
 }else{
  const key=String(data.error_code||data.code||'');
  const classification=['invalid_credentials','email_not_confirmed','captcha_failed'].includes(key)?key:'AUTH_REJECTED';
  console.error('FAIL QA authentication: HTTP '+response.status+' classification '+classification+'. Check that the QA account is confirmed and the Secrets contain its email and password.');
  failure=true;
 }
}catch{console.error('FAIL QA authentication could not reach Supabase Auth.');failure=true}
if(token){
 const check=async(path)=>{
  try{
   const response=await fetch(origin+path,{
    headers:{authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(20000)});
   let data={};try{data=await response.json()}catch{}
   const code=String(data.code||'');
   return {status:response.status,type:response.status>=500?'server_failure':
    response.status===403?'not_entitled':response.status===404?'not_seeded':
    response.status===401?'auth_denied':response.ok?'success':'other',
    code:code==='PRIVATE_LAB_STORE_UNAVAILABLE'?code:''};
  }catch{return {status:0,type:'network_failure',code:''}}
 };
 for(const id of ['F1-C02-L01','F2-C07-L01','SITE-001']){
  const [content,context]=await Promise.all([
   check('/api/lab-content?id='+encodeURIComponent(id)),
   check('/api/lab-player-context?id='+encodeURIComponent(id))]);
  console.log('LAB '+id+' private='+content.status+'/'+content.type+(content.code?'/'+content.code:'')+
   ' context='+context.status+'/'+context.type);
  for(const v of [content,context])if(v.status===0||v.status>=500)failure=true;
 }
 if(failure)console.error('FAIL QA: see classified errors above. Authenticated Lab API 5xx requires server diagnostics; UI warning requires separate repair.');
 else console.log('PASS QA: no server 5xx errors. HTTP 403/404 may still indicate missing authorization or missing private Lab content.');
}
process.exitCode=failure?1:0;
