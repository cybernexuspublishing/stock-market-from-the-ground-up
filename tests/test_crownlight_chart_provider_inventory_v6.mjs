import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/marketdata.js';
import {readFileSync} from 'node:fs';
const target='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const calls=[];
const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SECRET_KEY:'service_fixture',
 SUPABASE_PUBLISHABLE_KEY:'public_fixture'};
const json=(o,status=200)=>new Response(JSON.stringify(o),{status,headers:{'content-type':'application/json'}});
const original=globalThis.fetch;
globalThis.fetch=async(u,init={})=>{
 const uri=new URL(u);
 calls.push({path:uri.pathname,search:uri.search,authorization:init.headers?.authorization||''});
 if(uri.pathname==='/auth/v1/user')return json({id:target});
 if(uri.pathname==='/rest/v1/profiles')return json([{account_kind:'member'}]);
 if(uri.pathname==='/rest/v1/admin_user_flags')return json([]);
 if(uri.pathname==='/rest/v1/user_market_data_connections'){
  assert.equal(uri.searchParams.get('user_id'),'eq.'+target);
  assert.equal(uri.searchParams.get('provider_code'),'eq.TIINGO_BYO');
  assert.equal(uri.searchParams.get('select'),'provider_code,status,last_tested_at,updated_at');
  return json([{provider_code:'TIINGO_BYO',status:'connected',
   last_tested_at:'2026-10-29T06:00:00Z',credential_ciphertext:'SECRET_T',credential_iv:'IV_T'}]);
 }
 if(uri.pathname==='/rest/v1/user_secure_credentials'){
  assert.equal(uri.searchParams.get('user_id'),'eq.'+target);
  assert.equal(uri.searchParams.get('service_code'),'eq.ALPACA_BYO');
  assert.equal(uri.searchParams.get('select'),'service_code,status,last_tested_at,updated_at');
  return json([{service_code:'ALPACA_BYO',status:'connected',
   last_tested_at:'2026-10-29T06:01:00Z',credential_ciphertext:'SECRET_A',
   api_key:'UNSAFE',masked_hint:'sensitive_hint'}]);
 }
 throw Error('Unexpected endpoint '+uri.href);
};
try{
 const req=new Request('https://site.test/api/marketdata?action=list',{headers:{authorization:'Bearer member-token'}});
 const response=await onRequest({request:req,env});
 assert.equal(response.status,200);
 assert.equal(response.headers.get('cache-control'),'private, no-store');
 const payload=await response.json();
 assert.deepEqual(payload.connections.map(x=>x.provider_code),['TIINGO_BYO','ALPACA_BYO']);
 assert(payload.connections.every(x=>x.status==='connected'));
 assert(!JSON.stringify(payload).includes('SECRET'));
 assert(!JSON.stringify(payload).includes('IV_T'));
 assert(!JSON.stringify(payload).includes('UNSAFE'));
 assert(!JSON.stringify(payload).includes(other));
 assert.equal(calls.filter(x=>x.path==='/rest/v1/user_secure_credentials').length,1);
 const source=readFileSync(new URL('../functions/api/marketdata.js',import.meta.url),'utf8');
 assert(source.includes("service_code=eq.ALPACA_BYO"));
 assert(!source.includes('credential_ciphertext,credential_iv&user_id=eq.'));
 const noAuth=await onRequest({request:new Request('https://site.test/api/marketdata?action=list'),env});
 assert.equal(noAuth.status,401);
 console.log('PASS personal data sources: owner-scoped Tiingo and Alpaca connected metadata, no credentials or other member data, unauthenticated denied');
}finally{globalThis.fetch=original}
