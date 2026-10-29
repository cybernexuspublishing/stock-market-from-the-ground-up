import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest as toolAdmin} from '../functions/api/owner-lumen-tool-offers.js';
import {onRequest as itemAdmin} from '../functions/api/owner-lumen-item-prices.js';
import {onRequest as register} from '../functions/api/owner-release-register.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
let role='OWNER',writes=[],currentRevision=1;
const priceRule={sku:'addon:TRADE_PLAN_BUILDER',custom_full_lumens:null,
 partial_discount_allowed:true,full_redemption_allowed:true,release_state:'draft',version:1};
const responses=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
const prior=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
 const p=new URL(url).pathname,method=options.method||'GET';
 if(p==='/auth/v1/user')return responses({id:actor});
 if(p==='/rest/v1/profiles')return responses([{account_kind:'member',deleted_at:null}]);
 if(p==='/rest/v1/admin_user_roles')return responses([{role_code:role,expires_at:null}]);
 if(p==='/rest/v1/admin_user_flags')return responses([]);
 if(p==='/rest/v1/gu_lumen_value_settings_v1'){
  if(method==='PATCH'){writes.push({path:p,data:JSON.parse(options.body)});
   return responses([{active_cents:7,proposed_cents:9,revision:2,value_activation_state:'review_required',mixed_checkout_enabled:false}]);}
  return responses([{active_cents:7,proposed_cents:7,revision:currentRevision,mixed_checkout_enabled:false,value_activation_state:'staged'}]);
 }
 if(p==='/rest/v1/gu_lumen_tool_offers_v1'){
  if(method==='PATCH'){writes.push({path:p,data:JSON.parse(options.body)});
   return responses([{offer_code:'WATCHLIST_WORKBENCH_30D',price_cents:1999,custom_lumens_cost:99,redemption_lumens_cost:99,state:'draft',version:2}])}
  return responses([{offer_code:'WATCHLIST_WORKBENCH_30D',tool_code:'WATCHLIST_WORKBENCH',
   duration_days:30,price_cents:null,lumens_cost:null,redemption_lumens_cost:null,custom_lumens_cost:null,state:'draft',version:1}]);
 }
 if(p==='/rest/v1/gu_release_acceptance_v1'){
  if(method==='PATCH'){writes.push({path:p,data:JSON.parse(options.body)});
   return responses([{code:'ADVANCED_WORKBENCH',area:'Watchlists',title:'Advanced Workbench',phase:'started',
     gates:{},required_gates:['github_ci','stripe_test'],next_action:'Test the version',version:2}]);}
  return responses([{code:'ADVANCED_WORKBENCH',area:'Watchlists',title:'Advanced Workbench',phase:'implemented',version:1,
   gates:{github_ci:'passed'},required_gates:['github_ci','stripe_test'],next_action:'Test protected checkout',updated_at:'2026-10-29T00:00:00Z',accepted_at:null},
   {code:'FREE_JOURNAL',area:'Journal',title:'Free Journal',phase:'retail_accepted',version:2,
   gates:{github_ci:'passed'},required_gates:['github_ci'],next_action:'',accepted_at:'2026-10-29T12:00:00Z'}]);
 }
 if(p==='/rest/v1/gu_storefront_items_v014174')return responses([{sku:'addon:TRADE_PLAN_BUILDER',category:'addon',
  display_name:'Trade Plan Builder',status:'coming_soon',visible:false,sale_ready:false}]);
 if(p==='/rest/v1/gu_lumen_item_prices_v1'){
  if(method==='PATCH'){writes.push({path:p,data:JSON.parse(options.body)});
   return responses([{...priceRule,custom_full_lumens:99,version:2}]);}
  return responses([priceRule]);
 }
 throw Error('Unexpected request '+method+' '+p);
};
const req=(endpoint,method='GET',body,origin='https://site.example')=>new Request('https://site.example/api/'+endpoint,{
 method,headers:{authorization:'Bearer valid',origin,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined
});
try{
 let r=await toolAdmin({env,request:req('owner-lumen-tool-offers')});
 let d=await r.json();assert.equal(r.status,200);assert.equal(d.policy.active_cents,7);
 assert.equal(d.offers[0].state,'draft');
 r=await toolAdmin({env,request:req('owner-lumen-tool-offers','POST',{action:'propose_unit_value',proposedCents:9,revision:1})});
 d=await r.json();assert.equal(r.status,200);assert.equal(d.policy.active_cents,7);
 assert.equal(writes.at(-1).data.proposed_cents,9);assert.equal(writes.at(-1).data.revision,2);
 r=await toolAdmin({env,request:req('owner-lumen-tool-offers','POST',{offerCode:'WATCHLIST_WORKBENCH_30D',
  customLumensCost:99,priceCents:1999,state:'draft',version:1})});
 assert.equal(r.status,200);
 assert.equal(writes.at(-1).data.custom_lumens_cost,99);
 r=await toolAdmin({env,request:req('owner-lumen-tool-offers','POST',{offerCode:'WATCHLIST_WORKBENCH_30D',
  customLumensCost:99,priceCents:1999,state:'active',version:1})});
 assert.equal(r.status,409,'Cannot activate a SKU before verified release gates');
 let a=await itemAdmin({env,request:req('owner-lumen-item-prices')});d=await a.json();
 assert.equal(a.status,200);assert.equal(d.items[0].rule.release_state,'draft');
 a=await itemAdmin({env,request:req('owner-lumen-item-prices','POST',{sku:'addon:TRADE_PLAN_BUILDER',version:1,
  customFullLumens:99,partialDiscountAllowed:true,fullRedemptionAllowed:true,releaseState:'review_required'})});
 assert.equal(a.status,200);
 assert.equal(writes.at(-1).data.custom_full_lumens,99);
 let b=await register({env,request:req('owner-release-register')});d=await b.json();
 assert.equal(b.status,200);assert.equal(d.summary.total,2);
 assert.equal(d.summary.open,1);assert.equal(d.summary.accepted,1);
 assert.deepEqual(d.open[0].missingGates,['stripe_test']);
 b=await register({env,request:req('owner-release-register','POST',{code:'ADVANCED_WORKBENCH',
  version:1,phase:'beta_testing',nextAction:'Pretend to pass payment verification'})});
 assert.equal(b.status,400,'Owner cannot self-certify beta testing');
 b=await register({env,request:req('owner-release-register','POST',{code:'ADVANCED_WORKBENCH',
  version:1,phase:'started',nextAction:'Test the version'})});
 assert.equal(b.status,200);
 role='MEMBER';b=await register({env,request:req('owner-release-register')});
 assert.equal(b.status,403,'Other members cannot view Owner release evidence');
 assert.equal(writes.every(w=>!w.path.includes('/stripe/')),true);
 for(const path of ['functions/api/owner-lumen-item-prices.js','assets/js/admin-lumen-item-prices-v1.js',
  'assets/js/admin-release-register-v1.js'])assert(read(path).length>100);
 assert.match(read('supabase/migrations/20261029_lumen_owner_policy_and_release_register_v1.sql'),/ENABLE ROW LEVEL SECURITY/);
 assert.match(read('supabase/migrations/20261029_lumen_all_store_items_draft_pricing_v1.sql'),/ON CONFLICT\(sku\) DO NOTHING/);
 console.log('PASS Owner rate proposals, SKU price overrides, all-Store drafts, protected release register, automated archive and no unauthorized beta/sales activation');
}finally{globalThis.fetch=prior}
