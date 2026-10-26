/* v0.14.0.66 — no-charge GU39 TEST catalog price integrity. */
import assert from 'node:assert/strict';
const api=await import(new URL('../functions/api/gu39-sandbox.js',import.meta.url).href);
const env={SUPABASE_URL:'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',SUPABASE_SECRET_KEY:'sb_secret_mock',
 GU39_STRIPE_TEST_SECRET_KEY:'sk_test_mock',GU39_STRIPE_TEST_WEBHOOK_SECRET:'whsec_mock',
 GU39_SANDBOX_SHADOW_GATE:'false',
 GU39_STRIPE_TEST_PRICE_MAP_JSON:JSON.stringify({'plan:FULL_MONTHLY':'price_testMock0000001'})};
const uid='11111111-1111-4111-8111-111111111111';
const state={count:1,usage:'licensed',scheme:'per_unit',transform:null,dbWrites:0,providerWrites:0};
const answer=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
const before=globalThis.fetch;
globalThis.fetch=async(url,o={})=>{
 const u=String(url),method=o.method||'GET';
 if(u.includes('api.stripe.com')&&method!=='GET'){state.providerWrites++;throw Error('provider mutation forbidden');}
 if(u.endsWith('/auth/v1/user'))return answer({id:uid});
 if(u.endsWith('/rpc/gu_staff_role_v01432r1'))return answer({ok:true,role:'OWNER'});
 if(u.endsWith('/v1/account'))return answer({id:'acct_1URGkDJY9FI7byHB'});
 if(u.includes('/v1/products/'))return answer({id:u.split('/').at(-1),name:'Mock',livemode:false,active:true});
 if(u.includes('/v1/prices/'))return answer({id:'price_testMock0000001',
  product:'prod_VRvuGwLKI16MXU',active:true,livemode:false,currency:'usd',
  unit_amount:6999,billing_scheme:state.scheme,transform_quantity:state.transform,
  type:'recurring',recurring:{interval:'month',interval_count:state.count,usage_type:state.usage}});
 state.dbWrites++;throw Error('unapproved database access '+method+' '+u);
};
async function scan(){
 const r=await api.onRequestGet({request:new Request('https://example.com/api/gu39-sandbox?view=catalog',
 {headers:{authorization:'Bearer mock-owner-token'}}),env});
 assert.equal(r.status,200,await r.clone().text());return r.json();
}
try{
 let result=await scan();assert.equal(result.pricesVerified,1);
 assert.equal(result.rows.find(x=>x.sku==='plan:FULL_MONTHLY').status,'VERIFIED');
 for(const [key,bad,reason] of [
  ['count',12,'12-month price billed instead of 1-month price'],
  ['count',null,'missing interval count'],
  ['usage','metered','metered billing'],
  ['scheme','tiered','tiered billing'],
  ['transform',{divide_by:3,round:'up'},'transformed quantities']
 ]){
  const old=state[key];state[key]=bad;result=await scan();
  assert.equal(result.pricesVerified,0,reason);
  assert.equal(result.rows.find(x=>x.sku==='plan:FULL_MONTHLY').status,'PRICE_MISMATCH',reason);
  state[key]=old;
 }
 assert.equal(state.providerWrites,0);assert.equal(state.dbWrites,0);
 console.log('PASS v66: fixed price, correct billing interval, licensed usage, no tiers or transformed quantities; no charges or database writes.');
}finally{globalThis.fetch=before}
