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
 // Check the real production CAPTCHA gate without fabricating or consuming a challenge.
 const guardResponse=await page.request.get(origin+'/api/auth-guard-v0135',{timeout:20000});
 const guard=await guardResponse.json().catch(()=>({}));
 if(!guardResponse.ok()||guard.ok!==true||typeof guard.enabled!=='boolean'){
  failure=true;console.error('FAIL production CAPTCHA gate configuration could not be verified.');
 }else if(guard.enabled===false){
  console.log('TEMP OWNER CONFIG: CAPTCHA reported disabled; no human challenge tested and no CAPTCHA acceptance claimed.');
 }else{
  const start=page.locator('#v143-start-human');
  try{
   await start.waitFor({state:'attached',timeout:15000});
   const submitEnabled=await page.locator('.auth-card button[type="submit"]').isEnabled();
   const challengeChecked=await start.isChecked();
   if(submitEnabled||challengeChecked){
    failure=true;console.error('FAIL sign-in must be locked until a genuine human verification.');
   }else console.log('PASS real Turnstile gate present; button remains locked before a human challenge.');
  }catch{failure=true;console.error('FAIL production sign-in did not initialize manual Turnstile gate.');}
 }
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
  console.error('FAIL QA authentication: HTTP '+response.status+' classification '+classification+'. '+(
    classification==='captcha_failed'
      ?'Supabase Turnstile requires an original one-time human challenge token. This standalone API password grant cannot provide one and MUST NOT be used to infer a wrong password. Verify the Yahoo master widget/GoTrue secret privately, then run an interactive signed-in browser member test.'
      :'Check dedicated QA account status and authentication provider diagnostics without changing credentials or disabling CAPTCHA.'));
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
 // Release 2026-10-25-B01: acceptance must verify every exact original Lab ID
 // through the real production authorization boundary, not a mocked status.
 // Dedicated disposable QA member must have BOTH books and training entitlement.
 const batch01=['F1-C02-L01','F1-C02-L02','F1-C04-L01','F1-C06-L01',
  'F1-C07-L01','F1-C07-L02','F1-C08-L01','F1-C08-L02','F1-C08-L03',
  'F1-C09-L01','F1-C10-L01','F1-C10-L02','F1-C12-L01','F1-C13-L01',
  'F1-C13-L02','F2-C01-L01','F2-C02-L01','F2-C02-L02','F2-C02-L03','F2-C03-L01'];
 let verified=0;
 for(const id of batch01){
  const [content,context]=await Promise.all([
   check('/api/lab-content?id='+encodeURIComponent(id)),
   check('/api/lab-player-context?id='+encodeURIComponent(id))
  ]);
  if(content.status===200&&context.status===200)verified++;
  else{
   failure=true;
   console.error('BLOCKED Batch01 '+id+' private='+content.status+'/'+content.type+
    ' context='+context.status+'/'+context.type+
    ' — verify test-account book entitlements, authorized source, and API health.');
  }
 }
 console.log('Batch01 real signed-member authorized Lab API coverage: '+verified+'/20.');
 try{
  const response=await fetch(origin+'/api/bootcamp-academy?program=truth5',{
   headers:{authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(20000)
  });
  if(!response.ok){failure=true;console.error('BLOCKED Truth5 private Academy GET: HTTP '+response.status+
   '. Check ONDEMAND_TRAINING entitlement and account restrictions.');}
  else {
   const data=await response.json();
   const days=data.curriculum||[];
   const correct=data.ok===true&&data.program?.code==='truth5'&&days.length===5&&
    days.every((d,i)=>d.day===i+1&&typeof d.lesson?.workedExample==='string'&&
      Array.isArray(d.lesson?.sourceProcedure)&&d.lesson.sourceProcedure.length>=5&&
      d.officiallyGraded===false&&d.masteryAwarded===false);
   if(!correct){failure=true;console.error('BLOCKED Truth5 real-member teaching contract is incomplete.');}
   else console.log('PASS Truth5 five original authenticated study days; no official mastery claimed.');
   if(data.progressAvailable!==true){
    failure=true;console.error('BLOCKED Truth5 protected progress storage unavailable.');
   }
  }
 }catch{
  failure=true;console.error('BLOCKED Truth5 live member Academy API network/data request.');
 }

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
