import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/marketdata.js';
import {readFileSync} from 'node:fs';
const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',
 SUPABASE_SECRET_KEY:'sb_secret_TEST_01234567890',MARKET_DATA_ENCRYPTION_KEY:'temporary-fixture-only-not-real-key-material-abcd'};
const old=globalThis.fetch;
let kind='member',flag='active',owner=user,providerCount=0,saveCount=0,removed=0,storageHeaders=[];
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,o={})=>{
 const u=String(url);
 if(u.endsWith('/auth/v1/user'))return json({id:owner});
 if(u.includes('/profiles?'))return json([{account_kind:kind}]);
 if(u.includes('/admin_user_flags?'))return json([{status:flag}]);
 if(u.includes('/rest/v1/user_market_data_connections')){
  storageHeaders.push(o.headers);
  assert.equal(o.headers.apikey,env.SUPABASE_SECRET_KEY);
  assert.equal(o.headers.authorization,undefined,'Opaque Supabase sb_secret_* cannot be sent as Bearer JWT');
  if(o.method==='POST'){saveCount++;const data=JSON.parse(o.body);
   assert.equal(data.user_id,owner);assert(!JSON.stringify(data).includes('test-token-dont-leak'));return json([])}
  if(o.method==='DELETE'){removed++;assert(u.includes('user_id=eq.'+owner));return json([])}
  assert(u.includes('user_id=eq.'+owner),'Tenant-specific credential list required');return json([]);
 }
 if(u.includes('/rest/v1/user_secure_credentials')){
  storageHeaders.push(o.headers);
  assert.equal(o.headers.apikey,env.SUPABASE_SECRET_KEY);
  assert.equal(o.headers.authorization,undefined,'Opaque service key is not a JWT');
  assert(u.includes('user_id=eq.'+owner),'Alpaca inventory must be member-scoped');
  assert(u.includes('service_code=eq.ALPACA_BYO'),'Alpaca source filter required');
  assert(!u.includes('credential_ciphertext'),'Never include provider secrets in inventory');
  return json([]);
 }
 if(u.includes('api.tiingo.com')){
  providerCount++;return json({metadata:'token verification fixture'});
 }
 throw Error('Unexpected network request '+u);
};
const request=(action,method='GET',data,origin)=>new Request('https://site.test/api/marketdata?action='+action,{
 method,headers:{authorization:'Bearer member-session',...(data?{'content-type':'application/json'}:{}),...(origin?{origin}:{})},
 ...(data?{body:JSON.stringify(data)}:{})});
try{
 kind='showcase';let r=await onRequest({env,request:request('connect','POST',{provider:'TIINGO_BYO',token:'test-token-dont-leak'})});
 assert.equal(r.status,403);assert.equal(providerCount,0);
 kind='member';flag='suspended';
 r=await onRequest({env,request:request('list')});assert.equal(r.status,403);
 flag='active';r=await onRequest({env,request:request('list')});assert.equal(r.status,200);
 r=await onRequest({env,request:request('connect','POST',{provider:'TIINGO_BYO',token:'test-token-dont-leak'},'https://evil.test')});
 assert.equal(r.status,403);assert.equal(providerCount,0);
 r=await onRequest({env,request:request('connect','POST',{provider:'TIINGO_BYO',token:'invalid spaces'})});
 assert.equal(r.status,400);assert.equal(providerCount,0);
 r=await onRequest({env,request:request('connect','POST',{provider:'TIINGO_BYO',token:'ANewPersonalToken_1234'},'https://site.test')});
 assert.equal(r.status,200);assert.equal(providerCount,1);assert.equal(saveCount,1);
 assert(!JSON.stringify(await r.json()).includes('ANewPersonalToken_1234'),'BYO token never leaves server');
 owner='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 r=await onRequest({env,request:request('list')});assert.equal(r.status,200);
 r=await onRequest({env,request:request('disconnect','POST',{provider:'UNKNOWN'},'https://site.test')});
 assert.equal(r.status,400);assert.equal(removed,0);
 r=await onRequest({env,request:request('disconnect','POST',{provider:'TIINGO_BYO'},'https://site.test')});
 assert.equal(r.status,200);assert.equal(removed,1);
 r=await onRequest({env,request:request('list','DELETE')});assert.equal(r.status,405);
 const ui=readFileSync('data-connections.html','utf8');
 assert.match(ui,/Bring Your Own Token/);
 console.log('PASS v145: scoped BYO encrypted credentials; modern opaque service keys, no token echo, no cross-origin writes, showcase denial');
}finally{globalThis.fetch=old}
