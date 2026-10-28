/* Offline provider-authorization boundary: genuine Cloudflare handler contracts,
 * synthetic member identities and encrypted fixtures. Never uses live keys,
 * paid providers, broker orders, or production membership modifications. */
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {onRequest} from '../functions/api/marketdata.js';
const crypto=webcrypto;
const first='11111111-1111-4111-8111-111111111111';
const second='22222222-2222-4222-8222-222222222222';
const env={SUPABASE_URL:'https://mock.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',
 SUPABASE_SECRET_KEY:'sb_secret_fixture',
 MARKET_DATA_ENCRYPTION_KEY:'fictional-qa-encryption-material-not-for-production'};
let acting=first,entitled=false,connected=false,restricted=false,providerCalls=0,credentialReads=0;
const old=globalThis.fetch;
const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const text='synthetic-qa-tiingo-token';
const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.MARKET_DATA_ENCRYPTION_KEY));
const key=await crypto.subtle.importKey('raw',hash,{name:'AES-GCM'},false,['encrypt']);
const iv=new Uint8Array(12).fill(7);
const cipher=Buffer.from(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(text))).toString('base64');
const secretRow={user_id:first,provider_code:'TIINGO_BYO',status:'connected',
 credential_ciphertext:cipher,credential_iv:Buffer.from(iv).toString('base64')};
const req=(provider='TIINGO_BYO')=>new Request('https://site.test/api/marketdata?'+new URLSearchParams({
 action:'bars',provider,ticker:'AAPL',start:'2026-10-14',end:'2026-10-14',freq:'1min'}),
 {headers:{authorization:'Bearer synthetic-member-token'}});
globalThis.fetch=async(url,options={})=>{
 const u=new URL(String(url));
 if(u.pathname==='/auth/v1/user')return respond({id:acting});
 if(u.pathname==='/rest/v1/profiles')return respond([{account_kind:'member',deleted_at:null}]);
 if(u.pathname==='/rest/v1/admin_user_flags')return respond(restricted?[{status:'restricted'}]:[]);
 if(u.pathname==='/rest/v1/admin_user_roles')return respond([]);
 if(u.pathname==='/rest/v1/rpc/user_has_tool_access'){
  const b=JSON.parse(options.body||'{}');
  assert.equal(b.target_user,acting);assert.equal(b.target_tool,'MARKET_SIMULATOR');
  return respond(entitled);
 }
 if(u.pathname==='/rest/v1/user_market_data_connections'){
  credentialReads++;
  assert.equal(u.searchParams.get('user_id'),'eq.'+acting,'Credential lookup must be scoped to verified member');
  return respond(connected&&acting===first?[secretRow]:[]);
 }
 if(u.pathname==='/rest/v1/user_secure_credentials'){
  credentialReads++;return respond([]);
 }
 if(u.hostname==='api.tiingo.com'){
  providerCalls++;
  assert.equal(options.headers.Authorization,'Token '+text);
  assert.equal(options.method,undefined,'Provider reads must never become trades');
  return respond([
   {date:'2026-10-14T13:30:00Z',open:345.0,high:345.2,low:344.9,close:345.1,volume:100},
   {date:'2026-10-14T13:31:00Z',open:345.1,high:345.4,low:345.0,close:345.3,volume:180}
  ]);
 }
 throw Error('Unexpected outbound request in offline QA: '+u.host+u.pathname);
};
try{
 let r=await onRequest({env,request:new Request('https://site.test/api/marketdata?action=bars')});
 assert.equal(r.status,401,'Guest cannot use connected data');
 assert.equal(providerCalls,0);
 r=await onRequest({env,request:req()});
 assert.equal(r.status,403,'Chart-only access does NOT grant licensed provider data');
 assert.equal(credentialReads,0,'Denied tools must never attempt to read saved credentials');
 assert.equal(providerCalls,0);
 entitled=true;
 r=await onRequest({env,request:req()});
 assert.equal(r.status,403,'Tool pass alone does not create provider credentials');
 assert.equal(providerCalls,0);
 connected=true;
 r=await onRequest({env,request:req()});
 assert.equal(r.status,200,'Verified tool + own encrypted provider connection may read private data');
 const payload=await r.json();
 assert.equal(payload.ok,true);
 assert.equal(payload.bars.length,2);
 assert.equal(payload.bars[0].timestamp,'2026-10-14T13:30:00.000Z');
 assert.equal(payload.integrity.approvedForOfficialReplay,false);
 assert.equal(payload.integrity.consolidatedFeedVerified,false);
 assert.equal(payload.integrity.licensedForMemberWidePublication,false);
 assert(!JSON.stringify(payload).includes(text),'Private token must never be sent back to client');
 assert.equal(providerCalls,1);
 // Revocation affects the backend authorization immediately, independently
 // of a chart's cached Javascript tier or previously loaded candles.
 entitled=false;
 r=await onRequest({env,request:req()});
 assert.equal(r.status,403);
 assert.equal(providerCalls,1);
 entitled=true;acting=second;
 r=await onRequest({env,request:req()});
 assert.equal(r.status,403,'Another verified user cannot inherit first account credentials');
 assert.equal(providerCalls,1);
 acting=first;restricted=true;
 r=await onRequest({env,request:req()});
 assert.equal(r.status,403,'Restricted member cannot read provider history');
 assert.equal(providerCalls,1);
 restricted=false;
 r=await onRequest({env,request:req('UNAUTHORIZED_FEED')});
 assert.equal(r.status,400,'Only approved BYO provider codes are allowed');
 assert.equal(providerCalls,1);
 console.log('PASS BYO Chart Studio boundaries: guest, chart-only, missing key, authorized private data, provider provenance, revoked, cross-member, restricted, unsupported feed.');
}finally{globalThis.fetch=old}
