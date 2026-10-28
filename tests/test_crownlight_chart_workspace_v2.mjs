import assert from 'node:assert/strict';
import {normalizeWorkspace,onRequest} from '../functions/api/chart-workspace.js';
const entitlement={tier:'ADVANCED',allowed:['STANDARD','ADVANCED']};
const normalized=normalizeWorkspace({selected:'PROFESSIONAL',sync:false,studies:['EMA','RSI','RSI','INJECT'],
 drawings:[{name:'segment',points:[{timestamp:1790000000000,value:21},{timestamp:1790000060000,value:22}]},
 {name:'unsafeHTML',points:[{timestamp:1790000000000,value:0}]}],secret:'never-store'},entitlement);
assert.equal(normalized.selected,'STANDARD');assert.equal(normalized.sync,false);
assert.equal(normalized.layout,'SIDE_BY_SIDE','Advanced member cannot persist a Professional layout');
const pro={tier:'PROFESSIONAL',allowed:['STANDARD','ADVANCED','PROFESSIONAL']};
assert.equal(normalizeWorkspace({selected:'PROFESSIONAL',layout:'STACKED'},pro).layout,'STACKED');
assert.equal(normalizeWorkspace({selected:'PROFESSIONAL',layout:'PRICE_FOCUS'},pro).layout,'PRICE_FOCUS');
assert.equal(normalizeWorkspace({selected:'PROFESSIONAL',layout:'UNSAFE_CSS'},pro).layout,'SIDE_BY_SIDE');
assert.deepEqual(normalized.studies,['EMA','RSI']);
assert.equal(normalized.drawings.length,1);assert.equal('secret' in normalized,false);
assert.equal((await onRequest({request:new Request('https://site.test/api/chart-workspace',{method:'DELETE'}),env:{}})).status,405);
assert.equal((await onRequest({request:new Request('https://site.test/api/chart-workspace'),env:{}})).status,401);
const url='https://mockchart.supabase.co';
const env={SUPABASE_URL:url,SUPABASE_SECRET_KEY:'test_service',SUPABASE_PUBLISHABLE_KEY:'test_public'};
const uid='11111111-1111-4111-8111-111111111111';
const events=[],now=Date.now(),before=new Date(now-60000).toISOString(),after=new Date(now+60000).toISOString();
let db={settings:{version:2,selected:'PROFESSIONAL',studies:['EMA'],sync:true,drawings:[]},updated_at:before};
const j=x=>new Response(JSON.stringify(x),{status:200,headers:{'content-type':'application/json'}});
const original=globalThis.fetch;
globalThis.fetch=async(input,opts={})=>{const u=new URL(input);assert.equal(u.origin,url);events.push({path:u.pathname,method:opts.method||'GET',body:opts.body});
 if(u.pathname==='/auth/v1/user')return j({id:uid});
 if(u.pathname==='/rest/v1/profiles')return j([{account_kind:'member',deleted_at:null}]);
 if(u.pathname==='/rest/v1/admin_user_flags'||u.pathname==='/rest/v1/admin_user_roles')return j([]);
 if(u.pathname==='/rest/v1/rpc/user_has_tool_access')return j(false);
 if(u.pathname==='/rest/v1/gu_founder_release_v014173')return j([{public_launch_open:false,enrollment_enabled:false}]);
 if(u.pathname==='/rest/v1/gu_founder_members_v014173')return j(u.searchParams.has('user_id')?[{revoked_at:null}]:[]);
 if(u.pathname==='/rest/v1/gu_founder_paid_cycles_v014173')return j([{plan_code:'FOUNDING_60',billing_start:before,billing_end:after,reversed_at:null}]);
 if(u.pathname==='/rest/v1/gu_founder_reservations_v014173'||u.pathname==='/rest/v1/user_plan_grants')return j([]);
 if(u.pathname==='/rest/v1/crownlight_chart_workspaces_v1'){
  if(opts.method==='POST'){const b=JSON.parse(opts.body);assert.equal(b.user_id,uid,'Server must bind signed-in identity');
   assert(!('access_token' in b.settings));db={settings:b.settings,updated_at:after};return j([db])}
  return j([db]);
 }throw Error('Unexpected endpoint '+u.pathname)};
try{
 const req=new Request('https://site.test/api/chart-workspace',{headers:{authorization:'Bearer QA_TOKEN'}});
 let r=await onRequest({request:req,env}),data=await r.json();
 assert.equal(r.status,200);assert.equal(data.tier,'PROFESSIONAL');
 assert.equal(data.workspace.selected,'PROFESSIONAL');
 const body={selected:'PROFESSIONAL',sync:true,layout:'PRICE_FOCUS',studies:['RSI','MACD'],drawings:[],user_id:'00000000-0000-4000-8000-000000000000',access_token:'should never store'};
 r=await onRequest({request:new Request('https://site.test/api/chart-workspace',{method:'PUT',headers:{authorization:'Bearer QA_TOKEN','content-type':'application/json'},body:JSON.stringify(body)}),env});
 data=await r.json();assert.equal(r.status,200);assert.equal(data.workspace.selected,'PROFESSIONAL');
 assert.equal(data.workspace.studies.length,2);assert.equal(data.workspace.layout,'PRICE_FOCUS');assert.equal(db.settings.access_token,undefined);
 assert(events.some(e=>e.path.endsWith('/crownlight_chart_workspaces_v1')&&e.method==='POST'));
 console.log('PASS Crownlight private workspace: auth required, no member-chosen user_id, server-tier validation and secrets excluded');
}finally{globalThis.fetch=original}
