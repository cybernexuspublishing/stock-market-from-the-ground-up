import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/chart-cash-upgrade.js';
const user='11111111-1111-4111-8111-111111111111';
const purchase='22222222-2222-4222-8222-222222222222';
const item={price_id:'price_chartmock123',product_id:'prod_chartmock123'};
const env={SUPABASE_URL:'https://chartcashmock.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_mock',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',STRIPE_TEST_SECRET_KEY:'sk_test_mock',
 STRIPE_TEST_ACCOUNT_ID:'acct_chartmock123',CHART_STUDIO_TEST_CHECKOUT_ENABLED:'true',
 CHART_STUDIO_TEST_CATALOG_JSON:JSON.stringify({CHART_ADVANCED_30D:item,
  CHART_PROFESSIONAL_30D:{price_id:'price_chartmock456',product_id:'prod_chartmock456'}})};
let sessionCalls=0,dbWrites=0,pending=null,priceAmount=999,qa=true;
const json=x=>new Response(JSON.stringify(x),{status:200,headers:{'content-type':'application/json'}});
const original=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
 const x=new URL(url),path=x.pathname;
 if(x.hostname==='api.stripe.com'){
  if(path==='/v1/account')return json({id:'acct_chartmock123'});
  if(path==='/v1/prices/price_chartmock123')return json({id:item.price_id,product:item.product_id,
   livemode:false,active:true,type:'one_time',currency:'usd',unit_amount:priceAmount,
   billing_scheme:'per_unit',transform_quantity:null});
  if(path==='/v1/checkout/sessions'){
   sessionCalls++;
   assert.equal(options.headers['idempotency-key'],'chart-cash-test-'+purchase);
   const p=new URLSearchParams(options.body);
   assert.equal(p.get('line_items[0][price]'),item.price_id);
   assert.equal(p.get('metadata[chart_cash_test_user]'),user);
   return json({id:'cs_test_chartmock123',livemode:false,mode:'payment',status:'open',
    client_reference_id:purchase,url:'https://checkout.stripe.com/c/pay/chartmock123'});
  }
  if(path==='/v1/checkout/sessions/cs_test_chartmock123')return json({
   id:'cs_test_chartmock123',livemode:false,mode:'payment',status:'open',
   client_reference_id:purchase,url:'https://checkout.stripe.com/c/pay/chartmock123'});
  throw Error('Unexpected Stripe '+path);
 }
 assert.equal(x.hostname,'chartcashmock.supabase.co');
 if(path==='/auth/v1/user')return json({id:user});
 if(path==='/auth/v1/admin/users/'+user)return json({id:user,email_confirmed_at:'2026-10-01T00:00:00Z',
  app_metadata:{smfgu_qa_only:qa,noncommercial:true,qa_chart_batch:'SMFGU-CHART-3-20261028'}});
 if(path==='/rest/v1/profiles')return json([{account_kind:'member',deleted_at:null}]);
 if(path==='/rest/v1/admin_user_flags'||path==='/rest/v1/admin_user_roles')return json([]);
 if(path==='/rest/v1/rpc/user_has_tool_access')return json(false);
 if(path==='/rest/v1/gu_product_access_config_v1')return json([]);
 if(path==='/rest/v1/gu_founder_release_v014173')return json([{public_launch_open:false,enrollment_enabled:false}]);
 if(path==='/rest/v1/gu_founder_members_v014173'||path==='/rest/v1/gu_founder_paid_cycles_v014173'||
    path==='/rest/v1/gu_founder_reservations_v014173'||path==='/rest/v1/user_plan_grants'||
    path==='/rest/v1/crownlight_chart_qa_grants_v1'||path==='/rest/v1/gu_sparks_chart_passes_v1')return json([]);
 if(path==='/rest/v1/gu_storefront_items_v014174'){
  if(x.searchParams.has('sku'))return json([{sku:'addon:CHART_ADVANCED_30D',visible:true,
   status:'listed',sale_ready:false,price_label:'$9.99 one-time',duration_label:'30 days'}]);
  return json([]);
 }
 if(path==='/rest/v1/crownlight_chart_cash_upgrades_v1'){
  if(options.method==='POST'){
   dbWrites++;const body=JSON.parse(options.body);
   assert.equal(body.user_id,user);assert.equal(body.amount_cents,999);
   pending={id:purchase,...body,state:'pending',stripe_session_id:null};return json([pending]);
  }
  if(options.method==='PATCH'){
   pending.stripe_session_id=JSON.parse(options.body).stripe_session_id;return json([pending]);
  }
  return json(pending?[pending]:[]);
 }
 throw Error('Unexpected Supabase '+path);
};
const req=()=>new Request('https://site.test/api/chart-cash-upgrade',{method:'POST',
 headers:{origin:'https://site.test',authorization:'Bearer fixture','content-type':'application/json'},
 body:JSON.stringify({sku:'CHART_ADVANCED_30D'})});
try{
 qa=false;let r=await onRequestPost({request:req(),env});
 assert.equal(r.status,403);assert.equal(sessionCalls,0);
 qa=true;priceAmount=1999;r=await onRequestPost({request:req(),env});
 assert.equal(r.status,503);assert.equal(sessionCalls,0,'incorrect TEST amount cannot create checkout');
 priceAmount=999;r=await onRequestPost({request:req(),env});
 assert.equal(r.status,200);assert.equal((await r.json()).testOnly,true);
 assert.equal(dbWrites,1);assert.equal(sessionCalls,1);
 r=await onRequestPost({request:req(),env});
 assert.equal(r.status,200);assert.equal(dbWrites,1);assert.equal(sessionCalls,1,
  'pending intent resumes the original Stripe session');
 console.log('PASS mocked Chart cash checkout: QA-only, exact TEST price, member binding, idempotent session resume');
}finally{globalThis.fetch=original}
