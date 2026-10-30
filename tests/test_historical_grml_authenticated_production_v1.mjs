/* GRML genuine production acceptance. No mocked login, data, entitlement or bypass.
 * Requires QA-only published source and actual signed-in pinned QA account.
 * Fails closed; no Stripe, Sparks or customer charges.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const origin='https://stock-market-from-the-ground-up-d1r.pages.dev';
const code='HR_GRML_20260921', pinnedUser='f42f9301-18e6-43a3-8531-32d371fd22c1';
const email=process.env.LAB_QA_EMAIL||'',password=process.env.LAB_QA_PASSWORD||'';
const config=readFileSync('config.js','utf8');
const value=k=>{const m=config.match(new RegExp('\\b'+k+'\\s*:\\s*\\x27([^\\x27]+)\\x27'));assert(m,'Public config missing '+k);return m[1]};
const base=value('SUPABASE_URL').replace(/\/$/),apiKey=value('SUPABASE_ANON_KEY');
assert(apiKey.startsWith('sb_publishable_'),'QA must use the public client key only');
const path=(action,extra='')=>origin+'/api/learning-replay-v01492?scope=historical&action='+action+extra;
async function call(token,action,payload,extra=''){
 const post=payload!==undefined;
 const response=await fetch(path(action,extra),{method:post?'POST':'GET',cache:'no-store',
 headers:{...(token?{authorization:'Bearer '+token}:{}),...(post?{'content-type':'application/json',origin}:{})},
 body:post?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(25000)});
 const body=await response.json().catch(()=>({}));
 assert.match(response.headers.get('cache-control')||'',/no-store/,'Source data must never be cacheable');
 return {status:response.status,body};
}
const guest=await call(null,'catalog');
assert([401,403].includes(guest.status),'Guests must not enumerate historical releases');
if(!email||!password)throw Error('BLOCKED: dedicated real QA credentials unavailable');
const guardResponse=await fetch(origin+'/api/auth-guard-v0135',{signal:AbortSignal.timeout(12000)});
assert.equal(guardResponse.status,200);
const guard=await guardResponse.json();
if(guard.enabled!==false)throw Error('BLOCKED: legitimate QA requires an Owner-controlled CAPTCHA-off window; no workaround');
const response=await fetch(base+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:apiKey,'content-type':'application/json'},body:JSON.stringify({email,password}),signal:AbortSignal.timeout(20000)});
const identity=await response.json().catch(()=>({}));
if(!response.ok||!identity.access_token||identity.user?.id!==pinnedUser)throw Error('BLOCKED: QA password login or pinned identity check failed');
const token=identity.access_token;
const access=await Promise.all(['MARKET_SIMULATOR','ONDEMAND_TRAINING'].map(async tool=>{
 const r=await fetch(origin+'/api/member-tool-access?tool='+tool,{headers:{authorization:'Bearer '+token},signal:AbortSignal.timeout(20000)});
 const d=await r.json().catch(()=>({}));
 assert.equal(r.status,200);return d.authorized===true;
}));
if(!access.some(Boolean))throw Error('BLOCKED: QA account lacks genuine historical replay entitlement');
const catalog=await call(token,'catalog');
assert.equal(catalog.status,200);
const available=catalog.body.datasets?.find(x=>x.code===code);
if(!available)throw Error('BLOCKED: GRML is not individually QA-published to pinned account; do not disable source gates');
assert.equal(available.ticker,'GRML');
assert.equal(available.date,'2026-09-21');
assert.match(available.sourceAttribution,/Data provided for free by IEX/);
const prior=await call(token,'resume');
if(prior.status===200&&prior.body?.session?.dataset?.code===code){
 if(prior.body.session.decisionLocked){
  const f=await call(token,'finish',{sessionId:prior.body.session.id});
  assert.equal(f.status,200,'Must safely finish an earlier GRML QA session');
 }else{
  const lock=await call(token,'lock',{sessionId:prior.body.session.id,decision:'NO_TRADE',
   reasoning:'QA cleanup: no complete setup confirmed at the first IEX candle.'});
  assert.equal(lock.status,200);
  const f=await call(token,'finish',{sessionId:prior.body.session.id});
  assert.equal(f.status,200);
 }
}
const started=await call(token,'start',{datasetCode:code});
assert.equal(started.status,201,'GRML must start a real protected replay');
assert.equal(started.body.currentIndex,0);
assert.equal(started.body.decisionLocked,false);
assert.equal(new Date(started.body.bar.timestamp).toISOString(),'2026-09-21T13:30:00.000Z');
const id=started.body.sessionId;
assert.match(id,/^[0-9a-f-]{36}$/i);
const denied=await call(token,'advance',{sessionId:id,expectedIndex:0});
assert.equal(denied.status,403,'Future GRML candle must remain locked');
const first=await call(token,'visible',undefined,'&sessionId='+encodeURIComponent(id));
assert.equal(first.status,200);
assert.deepEqual(first.body.bars.map(x=>x.index),[0]);
const locked=await call(token,'lock',{sessionId:id,decision:'NO_TRADE',
 reasoning:'The first authentic IEX bar is only initial price and volume evidence; wait for context and a risk plan.'});
assert.equal(locked.status,200);
for(let i=0;i<5;i++){
 const next=await call(token,'advance',{sessionId:id,expectedIndex:i});
 assert.equal(next.status,200,'GRML protected minute '+(i+1)+' must advance');
 assert.equal(next.body.currentIndex,i+1);
 if(i===0){
  const stale=await call(token,'advance',{sessionId:id,expectedIndex:0});
  assert.equal(stale.status,409,'Atomic expected index must prevent duplicate GRML advances');
 }
}
const visible=await call(token,'visible',undefined,'&sessionId='+encodeURIComponent(id));
assert.equal(visible.status,200);
assert.deepEqual(visible.body.bars.map(x=>x.index),[0,1,2,3,4,5]);
const guestBar=await call(null,'visible',undefined,'&sessionId='+encodeURIComponent(id));
assert([401,403].includes(guestBar.status),'Guest cannot retrieve private QA session even with session UUID');
const resumed=await call(token,'resume');
assert.equal(resumed.status,200);
assert.equal(resumed.body.session.dataset.code,code);
assert.equal(resumed.body.session.currentIndex,5);
assert.equal(resumed.body.session.decisionLocked,true);
const finished=await call(token,'finish',{sessionId:id});
assert.equal(finished.status,200);
assert.equal(finished.body.ok,true);
console.log('PASS GENUINE GRML QA HTTP: pinned account, restricted catalog, locked initial candle, five protected steps, atomic stale denial, no future bars, resume and finish.');
console.log('NOTE: other-member cross-account access requires a distinct second authenticated QA identity and must be verified separately.');
