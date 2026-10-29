/* Genuine production Historical Replay QA — NO MOCKS, PAYMENTS OR IMPERSONATION.
 * Expected current result: guest & signed-in negative checks pass; licensed positive
 * flow remains NOT ACCEPTED until an authorized historical dataset exists.
 * Credentials must represent the pinned James_Test QA identity.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const origin='https://stock-market-from-the-ground-up-d1r.pages.dev';
const qaId='f42f9301-18e6-43a3-8531-32d371fd22c1';
const email=process.env.LAB_QA_EMAIL||'',password=process.env.LAB_QA_PASSWORD||'';
const config=readFileSync('config.js','utf8');
const value=k=>{const m=config.match(new RegExp('\\b'+k+'\\s*:\\s*\\x27([^\\x27]+)\\x27'));assert(m,'Missing public '+k);return m[1]};
const supabase=value('SUPABASE_URL').replace(/\/$/,'');
const publicKey=value('SUPABASE_ANON_KEY');
assert(/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(supabase));
assert(publicKey.startsWith('sb_publishable_'),'Never use a service-role key in a QA browser');
const url=path=>origin+'/api/learning-replay-v01492?scope=historical&action='+path;
const call=async(token,action,payload,extra='')=>{
 const isPost=payload!==undefined;
 const response=await fetch(url(action)+extra,{method:isPost?'POST':'GET',cache:'no-store',
  headers:{...(token?{authorization:'Bearer '+token}:{}),...(isPost?{'content-type':'application/json',origin}:{})},
  body:isPost?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(20000)});
 const body=await response.json().catch(()=>({}));
 assert.equal(response.headers.get('cache-control')?.includes('no-store'),true,'Replay response must prohibit caching');
 return {status:response.status,body};
};
const guest=await call(null,'catalog');
assert([401,403].includes(guest.status),'Guests cannot enumerate historical source catalogs');
assert.equal(guest.body.ok,false);
console.log('PASS LIVE GUEST: unauthorized historical catalog excluded.');

const guardResponse=await fetch(origin+'/api/auth-guard-v0135',{signal:AbortSignal.timeout(15000)});
assert.equal(guardResponse.status,200,'Production authentication guard must be available');
const guard=await guardResponse.json();
if(guard.enabled!==false)throw Error('BLOCKED: authenticated QA login requires Owner-controlled CAPTCHA-off QA window; no Turnstile bypass.');
if(!email||!password)throw Error('BLOCKED: encrypted LAB_QA_EMAIL/LAB_QA_PASSWORD not configured; no synthetic identity permitted.');

const login=await fetch(supabase+'/auth/v1/token?grant_type=password',{method:'POST',
 headers:{apikey:publicKey,'content-type':'application/json'},
 body:JSON.stringify({email,password}),signal:AbortSignal.timeout(20000)});
const identity=await login.json().catch(()=>({}));
if(!login.ok||!identity.access_token||identity.user?.id!==qaId)throw Error('BLOCKED: genuine QA password login or pinned identity verification failed');
const token=identity.access_token;
console.log('PASS LIVE AUTH: legitimate password-authenticated, pinned James_Test identity.');
const entitlements=await Promise.all(['MARKET_SIMULATOR','ONDEMAND_TRAINING'].map(async tool=>{
 const r=await fetch(origin+'/api/member-tool-access?tool='+tool,{headers:{authorization:'Bearer '+token},signal:AbortSignal.timeout(20000)});
 const d=await r.json().catch(()=>({}));
 assert.equal(r.status,200);
 return {tool,authorized:d.authorized===true};
}));
const authorized=entitlements.some(x=>x.authorized);
const catalog=await call(token,'catalog');
if(!authorized){
 assert.equal(catalog.status,403,'Member without historical entitlement cannot list datasets');
 console.log('PASS LIVE MEMBER DENIAL: genuine QA identity has no historical replay entitlement.');
}else{
 assert.equal(catalog.status,200,'Authorized QA member must receive a genuine catalog result');
 assert.equal(catalog.body.ok,true);
 assert(Array.isArray(catalog.body.datasets));
 assert(catalog.body.datasets.every(x=>!/^HR_[A-Z0-9]+_20\d{6}$/.test(x.code)||x.code!=='HR_DIS_20240507'),
  'Draft DIS cannot appear in paid or replay-only catalog');
}
const rejected=await call(token,'start',{datasetCode:'HR_DIS_20240507'});
assert.equal(rejected.status,403,'Unapproved DIS data must not start a session even with a paid tool grant.');
assert(!JSON.stringify(rejected.body).includes('107.25'),'No vendor data should leak from a rejected start.');
console.log('PASS LIVE DRAFT REVOCATION: DIS publication gate denies start and future data.');

if(!authorized){
 console.log('NOT ACCEPTED: authenticated positive replay cannot run without QA training entitlement.');
 process.exit(0);
}
const approved=(catalog.body.datasets||[]).filter(x=>x.synthetic!==true && /^[A-Z][A-Z0-9_-]{2,79}$/.test(x.code));
if(approved.length===0){
 console.log('NOT ACCEPTED: no licensed, published authentic historical source exists. PASS covers real signed-in negative authorization only.');
 process.exit(0);
}
const first=approved[0];
const started=await call(token,'start',{datasetCode:first.code});
assert.equal(started.status,201,'Published authorized source must start real QA replay');
assert.equal(started.body.bar.index,0,'Initial response reveals first bar only');
assert.equal(started.body.decisionLocked,false);
const sessionId=started.body.sessionId;assert(/^[0-9a-f-]{36}$/i.test(sessionId));
const before=await call(token,'advance',{sessionId,expectedIndex:0});
assert.equal(before.status,403,'Future bar must be denied before first decision lock');
const locked=await call(token,'lock',{sessionId,decision:'NO_TRADE',
 reasoning:'QA decision: the first observed candle alone does not establish a trade; wait for confirmation.'});
assert.equal(locked.status,200);
const visible0=await call(token,'visible',undefined,'&sessionId='+encodeURIComponent(sessionId));
assert.equal(visible0.status,200);
assert(visible0.body.bars.every(x=>x.index===0),'No future observation in initial visible history');
const advanced=await call(token,'advance',{sessionId,expectedIndex:0});
assert.equal(advanced.status,200);
assert.equal(advanced.body.currentIndex,1);
const stale=await call(token,'advance',{sessionId,expectedIndex:0});
assert.equal(stale.status,409,'Atomic expected-index control must reject stale request');
const visible1=await call(token,'visible',undefined,'&sessionId='+encodeURIComponent(sessionId));
assert.equal(visible1.status,200);
assert.equal(Math.max(...visible1.body.bars.map(b=>b.index)),1);
const resumed=await call(token,'resume');assert.equal(resumed.status,200);
assert.equal(resumed.body.session.currentIndex,1);
const finished=await call(token,'finish',{sessionId});assert.equal(finished.status,200);
assert.equal(finished.body.ok,true);
console.log('PASS GENUINE HISTORICAL QA END-TO-END: authorized source, first-candle lock, atomic forward-only reveal, no future data, resume, finish.');
