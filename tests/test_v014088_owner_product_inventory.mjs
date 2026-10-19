/* v0.14.0.88 | Owner-only roadmap tools/membership catalog acceptance.
 * Security, server catalog, reviewed-guides parity, dynamic route inventory,
 * and no writes; no production checkout or extra Supabase database required.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/owner-roadmap.js';
import {reviewedProductGuidesV01488,supportingCapabilitiesV01488} from '../functions/_lib/owner-roadmap-product-inventory-v01488.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('owner-roadmap.html'),js=read('assets/js/owner-roadmap.js'),
 widget=read('assets/js/owner-roadmap-product-inventory-v01488.js'),
 backend=read('functions/api/owner-roadmap.js');
const canonical=JSON.parse(read('data/store-product-guides-v01484.json'));
assert.deepEqual(reviewedProductGuidesV01488.plans,canonical.plans,'Must not drift from reviewed Store plan copy');
assert.deepEqual(reviewedProductGuidesV01488.tools,canonical.tools,'Must not drift from reviewed Store tool copy');
assert.equal(Object.keys(reviewedProductGuidesV01488.plans).length,5);
assert.equal(Object.keys(reviewedProductGuidesV01488.tools).length,4);
assert.ok(supportingCapabilitiesV01488.length>=6);
for(const f of supportingCapabilitiesV01488){
 assert.match(f.route,/^\/[a-z0-9-]+\.html$/);
 assert.ok(read(f.route.slice(1)).length>200,'Missing supporting site route: '+f.route);
 assert.ok(f.buildFocus.length>0,'Missing improvement acceptance criteria for '+f.code);
}
for(const name of ['tool-inventory','membership-coverage']){
 assert.ok(html.includes('data-scope="'+name+'"'),name+' tab not on Owner page');
 assert.ok(js.includes(name),name+' tab not wired');
}
for(const id of ['or-catalog-tools','or-catalog-memberships','or-catalog-tool-search','or-requirements-workspace','or-owner-create']){
 assert.ok(html.includes('id="'+id+'"'),id+' missing');
}
assert.ok(html.includes('owner-roadmap-product-inventory-v01488.js'));
assert.ok(html.indexOf('owner-roadmap-product-inventory-v01488.js')<html.indexOf('/assets/js/owner-roadmap.js'), 'Inventory script must load before dashboard');
assert.ok(js.includes('OwnerRoadmapProductsV88?.render(data)'));
assert.ok(widget.includes('or-membership-matrix'));
assert.ok(widget.includes('includes_all_tools'));
assert.ok(widget.includes('explicitAccess'));
assert.ok(widget.includes('tool-inventory'));
assert.ok(widget.includes('or-new-task'));
assert.ok(widget.includes("b.dataset.name"),'Task improvement prefill required');
assert.ok(backend.includes("const user=await owner(request,c,env)"));
assert.ok(backend.indexOf('const user=await owner(request,c,env)')<backend.indexOf('const productInventory=await ownerProductInventory(c)'), 'Never fetch product catalog before Owner authorization');
assert.ok(!widget.includes('SUPABASE_SECRET_KEY')&&!html.includes('sb_secret_'));
const base='https://owner-example.org/api/owner-roadmap',
 env={SUPABASE_URL:'https://fake-project.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',SUPABASE_SECRET_KEY:'sb_secret_server_only'};
const plans=[
{plan_code:'FREE',name:'Free',price_cents:0,billing_interval:'none',active:true,public_visible:true,checkout_enabled:false,includes_all_tools:false,includes_all_books:false,ad_free:false},
{plan_code:'FULL_MONTHLY',name:'Full Monthly',price_cents:6999,billing_interval:'month',active:true,public_visible:true,checkout_enabled:true,includes_all_tools:true,includes_all_books:true,ad_free:false},
{plan_code:'FULL_ANNUAL',name:'Full Annual',price_cents:69900,billing_interval:'year',active:true,public_visible:true,checkout_enabled:true,includes_all_tools:true,includes_all_books:true,ad_free:false},
{plan_code:'LIFETIME',name:'Lifetime',price_cents:249900,billing_interval:'lifetime',active:true,public_visible:true,checkout_enabled:true,includes_all_tools:true,includes_all_books:true,ad_free:true},
{plan_code:'ONDEMAND_MONTHLY',name:'Historical Replay Monthly',price_cents:1999,billing_interval:'month',active:true,public_visible:true,checkout_enabled:true,includes_all_tools:false,includes_all_books:false,ad_free:false}
];
const tools=['INTERACTIVE_LEARNING','JOURNAL_ANALYTICS','MARKET_SIMULATOR','MARKET_TUTOR'].map(tool_code=>({tool_code,name:tool_code,category:'Learning',status:'live',description:'Education',price_cents:2999,individual_price_cents:2999,active:true,public_visible:true,free_preview:false,href:'tools.html'}));
const access=plans.filter(p=>p.includes_all_tools).flatMap(p=>tools.map(t=>({plan_code:p.plan_code,tool_code:t.tool_code})));
let kind='member',role='OWNER',unauthorizedQueries=0,readCount=0,readFailed=false,dbWrites=0;
const original=globalThis.fetch;
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(path,opts={})=>{
 const u=String(path);if(u.endsWith('/auth/v1/user'))return json({id:'11111111-2222-4333-8444-555555555555'});
 if(!u.includes('/rest/v1/'))throw Error('Unexpected endpoint '+u);
 if(opts.method&&opts.method!=='GET')dbWrites++;
 if(u.includes('/profiles?'))return json([{account_kind:kind}]);
 if(u.includes('/admin_user_roles?'))return json([{role_code:role,expires_at:null}]);
 if(u.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(role!=='OWNER'&&(/\/platform_plans\?|\/platform_tools\?|\/plan_tool_access\?/).test(u))unauthorizedQueries++;
 if(u.includes('/site_settings?'))return json([]);
 if(u.includes('/platform_plans?')){readCount++;return json(readFailed?{error:'database unavailable'}:plans,readFailed?503:200)}
 if(u.includes('/platform_tools?')){readCount++;return json(tools)}
 if(u.includes('/plan_tool_access?')){readCount++;return json(access)}
 throw Error('Unexpected fake DB path '+u);
};
const request=()=>new Request(base,{headers:{authorization:'Bearer synthetic-owner-JWT'}});
try{
 role='MEMBER';let response=await onRequest({request:request(),env});
 assert.equal(response.status,403,'Regular members must not see private roadmap');
 assert.equal(readCount,0,'No tool reads before Owner authorization');
 assert.equal(unauthorizedQueries,0,'No private tool catalog read without Owner');
 role='OWNER';response=await onRequest({request:request(),env});
 assert.equal(response.status,200,'Owner roadmap must remain operational');
 let payload=await response.json();assert.equal(payload.ok,true);
 assert.equal(payload.productInventory.available,true);
 assert.equal(payload.productInventory.plans.length,5);
 assert.equal(payload.productInventory.tools.length,4);
 assert.equal(payload.productInventory.explicitAccess.length,12);
 assert.deepEqual(payload.productInventory.guides.plans.FULL_MONTHLY,canonical.plans.FULL_MONTHLY);
 assert.equal(payload.productInventory.capabilities.length,supportingCapabilitiesV01488.length);
 assert.equal(payload.productInventory.plans[1].checkout_enabled,true);
 assert.equal(dbWrites,0,'Owner catalog read must never write');
 readFailed=true;response=await onRequest({request:request(),env});
 assert.equal(response.status,200,'A catalog outage should not block existing Owner roadmap');
 payload=await response.json();
 assert.equal(payload.productInventory.available,false,'Fail closed on Supabase price/catalog outage');
 assert.equal(payload.productInventory.plans.length,0,'Never show potentially stale priced data during outage');
 assert.equal(dbWrites,0);
 console.log('PASS v88: auth before catalog query; 5 plans/4 tools/12 mappings; existing support routes; reviewed-copy parity; resilient fail-closed; no DB writes or Stripe calls.');
}finally{globalThis.fetch=original}
