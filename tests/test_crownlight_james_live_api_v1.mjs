/* Real, noncharging production Chart Studio HTTP acceptance.
 * Legitimate James_Test password auth with the PUBLIC publishable key,
 * no service-role impersonation, CAPTCHA bypass, paid action or fake account.
 * This is API acceptance, not a genuine logged-in browser journey.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const origin='https://stock-market-from-the-ground-up-d1r.pages.dev';
const expectedId='f42f9301-18e6-43a3-8531-32d371fd22c1';
const identifier=process.env.LAB_QA_EMAIL||'',password=process.env.LAB_QA_PASSWORD||'';
if(!identifier||!password)throw Error('BLOCKED: encrypted LAB_QA_EMAIL / LAB_QA_PASSWORD not set');
const site=readFileSync('config.js','utf8');
const configValue=k=>{
 const match=site.match(new RegExp('\\b'+k+'\\s*:\\s*\\x27([^\\x27]+)\\x27'));
 if(!match)throw Error('Missing public frontend config '+k);
 return match[1];
};
const db=configValue('SUPABASE_URL').replace(/\/$/,'');
const key=configValue('SUPABASE_ANON_KEY');
assert(/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(db),'Unexpected production Supabase domain');
assert(key.startsWith('sb_publishable_'),'Only public Supabase publishable key permitted');
const guard=await fetch(origin+'/api/auth-guard-v0135',{signal:AbortSignal.timeout(15000)}).then(r=>r.json());
assert.equal(guard?.enabled,false,'Owner-controlled CAPTCHA-off QA window required; no bypass of verification');
async function signIn(){
 let last=null;
 for(let attempt=0;attempt<2;attempt++){
  const r=await fetch(db+'/auth/v1/token?grant_type=password',{
   method:'POST',headers:{apikey:key,'content-type':'application/json'},
   body:JSON.stringify({email:identifier,password}),signal:AbortSignal.timeout(20000)});
  const b=await r.json().catch(()=>({}));
  if(r.ok&&b.access_token&&b.user?.id){
   assert.equal(b.user.id,expectedId,'QA secrets authenticate a different account; fail closed');
   console.log('PASS legitimate James_Test password grant and verified auth identity');
   return b;
  }
  last={status:r.status,code:String(b.error_code||b.code||''),error:String(b.msg||b.error_description||b.error||'').slice(0,120)};
  if(r.status>=500&&attempt===0){console.log('WARN transient Supabase Auth server 5xx; one bounded retry');await new Promise(resolve=>setTimeout(resolve,1600));continue;}
  break;
 }
 throw Error('Password grant did not establish a verified QA session: '+JSON.stringify(last));
}
async function api(token,path,method='GET',body){
 const r=await fetch(origin+path,{method,headers:{authorization:'Bearer '+token,
  ...(method!=='GET'?{origin}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,
  cache:'no-store',signal:AbortSignal.timeout(20000)});
 const data=await r.json().catch(()=>({}));
 return {status:r.status,data};
}
const first=await signIn();
const initial=first.access_token;
const entitlement=await api(initial,'/api/chart-tier-access');
assert.equal(entitlement.status,200);
assert.equal(entitlement.data.eligible,true);
assert.equal(entitlement.data.tier,'PROFESSIONAL','Existing James_Test ADMIN role grants a Professional override; scoped Advanced QA grant is not the effective tier');
console.log('PASS real James_Test Professional ADMIN override; Advanced workspace preference remains selectable');
const existing=await api(initial,'/api/chart-workspace');
assert.equal(existing.status,200,'Workspace must accept a genuine signed-in member');
assert.equal(existing.data.ok,true);
const previous=existing.data.updatedAt?existing.data.workspace:null;
const sample={selected:'ADVANCED',sync:true,studies:['EMA','RSI'],
 drawings:[],layout:'SIDE_BY_SIDE',expectedUpdatedAt:existing.data.updatedAt??null};
const saved=await api(initial,'/api/chart-workspace','PUT',sample);
assert.equal(saved.status,200,'Live chart workspace save did not return HTTP 200');
assert.equal(saved.data.ok,true);
assert.deepEqual(saved.data.workspace.studies,['EMA','RSI']);
const confirmed=await api(initial,'/api/chart-workspace');
assert.equal(confirmed.status,200);
assert.equal(confirmed.data.workspace.selected,'ADVANCED');
assert.deepEqual(confirmed.data.workspace.studies,['EMA','RSI']);
console.log('PASS real signed-in workspace PUT/GET and durable study settings');
const quotes=await api(initial,'/api/member-sparks-chart');
assert.equal(quotes.status,200);
assert.equal(quotes.data.ok,true);
assert(quotes.data.offers.some(x=>x.sku==='CHART_PROFESSIONAL_DAY'&&Number.isSafeInteger(x.costSparks)&&x.costSparks>0));
console.log('PASS real signed-in Lumens pass quote without spending credits');
const anon=await fetch(origin+'/api/chart-workspace',{signal:AbortSignal.timeout(15000)});
assert.equal(anon.status,401,'Anonymous workspace read must be denied');
const second=await signIn();
const reread=await api(second.access_token,'/api/chart-workspace');
assert.equal(reread.status,200);
assert.deepEqual(reread.data.workspace.studies,['EMA','RSI']);
console.log('PASS workspace survived reauthentication with fresh real QA session');
if(previous){
 const restore=await api(second.access_token,'/api/chart-workspace','PUT', {...previous,expectedUpdatedAt:reread.data.updatedAt??null});
 assert.equal(restore.status,200,'Restore preexisting James_Test workspace');
 console.log('PASS preexisting QA workspace restored');
}else{
 console.log('PASS retained first real James_Test workspace for persistence evidence');
}
console.log('ACCEPTED real production HTTP authenticated workspace and no-charge Sparks quote; browser/cross-member/real-redemption separate');
