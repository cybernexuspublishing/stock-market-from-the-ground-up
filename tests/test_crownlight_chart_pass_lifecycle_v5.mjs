import assert from 'node:assert/strict';
import {onRequest as passes} from '../functions/api/member-sparks-chart.js';
import {onRequestGet as entitlement} from '../functions/api/chart-tier-access.js';
const u='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const env={SUPABASE_URL:'https://studio-lifecycle-fixture.supabase.co',
 SUPABASE_SECRET_KEY:'sb_secret_fixture',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'};
const now=Date.now(),future=new Date(now+3600000).toISOString(),past=new Date(now-3600000).toISOString();
const uuid='77777777-7777-4777-8777-777777777777';
let plan=null,staff=false,passExpiry=past,passTier='ADVANCED',seen=[],rpcCalls=0,receipts=new Map(),badPrice=false;
const answer=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}});
const old=globalThis.fetch;
globalThis.fetch=async(url,init={})=>{
 const x=new URL(url),path=x.pathname;
 seen.push({path,method:init.method||'GET',url:x.toString(),body:init.body?JSON.parse(init.body):null});
 assert.equal(x.hostname,'studio-lifecycle-fixture.supabase.co');
 assert.equal(init.cache,'no-store');
 if(path==='/auth/v1/user')return answer({id:u});
 if(path==='/auth/v1/admin/users/'+u)return answer({id:u,app_metadata:{}});
 if(path==='/rest/v1/profiles')return answer([{account_kind:'member',deleted_at:null}]);
 if(path==='/rest/v1/admin_user_flags')return answer([]);
 if(path==='/rest/v1/admin_user_roles')return answer(staff?[{role_code:'OWNER',expires_at:null}]:[]);
 if(path==='/rest/v1/rpc/user_has_tool_access')return answer(false);
 if(path==='/rest/v1/gu_founder_release_v014173')return answer([{public_launch_open:false,enrollment_enabled:false}]);
 if(path==='/rest/v1/gu_founder_members_v014173')return answer([]);
 if(path==='/rest/v1/gu_founder_paid_cycles_v014173')return answer(plan?[{plan_code:plan,
  billing_start:past,billing_end:future,reversed_at:null}]:[]);
 if(path==='/rest/v1/gu_founder_reservations_v014173')return answer([]);
 if(path==='/rest/v1/gu_storefront_items_v014174')return answer([]);
 if(path==='/rest/v1/user_plan_grants')return answer([]);
 if(path==='/rest/v1/gu_product_access_config_v1')return answer([]);
 if(path==='/rest/v1/crownlight_chart_qa_grants_v1')return answer([]);
 if(path==='/rest/v1/gu_sparks_chart_passes_v1'){
  assert.equal(x.searchParams.get('user_id'),'eq.'+u,'pass query must be private');
  return answer([{tier:passTier,expires_at:passExpiry}]);
 }
 if(path==='/rest/v1/gu_sparks_price_catalog_v1')return answer([{
  sku:'CHART_ADVANCED_DAY',label:'Advanced one day',
  description:'Private educational Chart Studio pass',sparks_cost:6,duration_hours:24,
  category:'CHART_STUDIO',state:'active',fulfillment:'CHART_PASS'
 }]);
 if(path==='/rest/v1/rpc/gu_sparks_chart_redeem_v2'){
  rpcCalls++;const b=JSON.parse(init.body);
  assert.equal(b.p_user_id,u,'client must not choose a different wallet');
  assert.equal(b.p_sku,'CHART_ADVANCED_DAY');
  if(b.p_expected_cost!==6||badPrice)return answer({ok:false,error:'PRICE_CHANGED'});
  if(receipts.has(b.p_request_id))return answer({...receipts.get(b.p_request_id),alreadyRedeemed:true});
  const d={ok:true,tier:'ADVANCED',spent:6,expiresAt:future,alreadyRedeemed:false};
  receipts.set(b.p_request_id,d);return answer(d);
 }
 throw Error('Unexpected private provider '+url);
};
const req=(method='GET',body=null,headers={})=>new Request('https://stock-market.example/api/member-sparks-chart?userId='+other,{
 method,headers:{authorization:'Bearer member-fixture',...(body?{'content-type':'application/json',origin:'https://stock-market.example'}:{}),...headers},
 body:body?JSON.stringify(body):undefined});
try{
 let g=await passes({request:req(),env});assert.equal(g.status,200);
 let data=await g.json();assert.equal(data.passes.length,0,'expired pass must not look active');
 assert.equal(data.offers.length,1);assert.equal(data.offers[0].costSparks,6);
 assert.equal(await (await entitlement({request:req(),env})).json().then(x=>x.tier),'STANDARD');
 passExpiry=future;
 data=await (await passes({request:req(),env})).json();
 assert.equal(data.passes.length,1);
 assert.equal((await (await entitlement({request:req(),env})).json()).tier,'ADVANCED');
 passExpiry=past;
 const forged=await passes({request:req('POST',{
  sku:'CHART_ADVANCED_DAY',requestId:uuid,expectedCost:6,userId:other}),env});
 assert.equal(forged.status,409===forged.status?409:400);
 assert.equal(rpcCalls,0,'Client-chosen user ID must not reach privileged RPC');
 const wrongOrigin=await passes({request:req('POST',{
  sku:'CHART_ADVANCED_DAY',requestId:uuid,expectedCost:6},
  {origin:'https://malicious.example'}),env});
 assert.equal(wrongOrigin.status,403);
 const invalid=await passes({request:req('POST',{sku:'CHART_ADVANCED_DAY',
  requestId:'not-a-uuid',expectedCost:6}),env});
 assert.equal(invalid.status,400);
 const valid={sku:'CHART_ADVANCED_DAY',requestId:uuid,expectedCost:6};
 const purchased=await passes({request:req('POST',valid),env});
 assert.equal(purchased.status,200);assert.equal((await purchased.json()).alreadyRedeemed,false);
 const again=await passes({request:req('POST',valid),env});
 assert.equal(again.status,200);assert.equal((await again.json()).alreadyRedeemed,true);
 assert.equal(receipts.size,1,'same request UUID cannot create two provider debits');
 badPrice=true;
 const mismatch=await passes({request:req('POST',{...valid,
  requestId:'88888888-8888-4888-8888-888888888888',expectedCost:7}),env});
 assert.equal(mismatch.status,409);assert.equal((await mismatch.json()).error,'PRICE_CHANGED');
 badPrice=false;
 staff=true;const already=await passes({request:req('POST',{...valid,
  requestId:'99999999-9999-4999-8999-999999999999'}),env});
 assert.equal(already.status,409);assert.equal((await already.json()).error,'ALREADY_INCLUDED');
 staff=false;
 const anon=await passes({request:new Request('https://stock-market.example/api/member-sparks-chart'),env});
 assert.equal(anon.status,401);
 assert.equal(seen.filter(x=>x.path==='/rest/v1/rpc/gu_sparks_chart_redeem_v2').length,3);
 assert(!JSON.stringify(data).includes(other));
 console.log('PASS Chart Studio temporary pass lifecycle: real handler with authenticated mock, expired pass denial, SKU/price recheck, user isolation, origin guard, request-ID retry, staff already-included denial; no payment or real wallet spent.');
}finally{globalThis.fetch=old;}
