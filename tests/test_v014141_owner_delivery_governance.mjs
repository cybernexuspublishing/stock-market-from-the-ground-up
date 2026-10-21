// Deployment 01 of 08: status vocabulary, plan provenance and Owner-only private surface.
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/owner-roadmap.js';
import {readFileSync} from 'node:fs';
import {ownerReleasePlanV014141} from '../functions/_lib/owner-release-plan-v014141.js';
const server=readFileSync('functions/api/owner-roadmap.js','utf8');
const client=readFileSync('assets/js/owner-roadmap.js','utf8');
const html=readFileSync('owner-roadmap.html','utf8');
const admin=readFileSync('admin.html','utf8');
const delivery=readFileSync('assets/js/admin-delivery-brief.js','utf8');
const statuses=["not_started","research_required","research_complete","planned","in_progress","partially_complete","implemented","testing_required","blocked","owner_review_required","deferred","owner_complete","verified"];
assert.equal(ownerReleasePlanV014141.packages.length,8);
assert.deepEqual(ownerReleasePlanV014141.packages.map(p=>p.number),['01','02','03','04','05','06','07','08']);
assert(ownerReleasePlanV014141.packages.every(p=>/^CORE-\d{4}$/.test(p.roadmapId)));
assert(ownerReleasePlanV014141.packages.every(p=>p.title&&p.scope));
for(const stage of statuses){
 assert(server.includes("'"+stage+"'")||server.includes('"'+stage+'"'),stage+' missing from protected API');
 assert(client.includes("'"+stage+"'")||client.includes('"'+stage+'"'),stage+' missing from browser labels');
 assert(html.includes('value="'+stage+'"'),stage+' missing from filter');
}
assert(server.includes("['verified','research_complete'].includes(status)"));
assert(server.includes('releasePlan:ownerReleasePlanV014141'));
assert(admin.includes('admin-delivery-brief.js'));
assert(admin.includes('admin-delivery-brief.css'));
assert(delivery.includes("fetch('/api/owner-roadmap?action=delivery-summary'"));
assert(server.includes("searchParams.get('action')==='delivery-summary'"));
assert(server.includes('primaryTasks:base.length'));
assert(server.indexOf("searchParams.get('action')==='delivery-summary'")<server.indexOf('const productInventory=await ownerProductInventory(c)'), 'Summary must not load unnecessary product inventory');
assert(delivery.includes("response.status===401||response.status===403"));
assert(delivery.includes("token"));
assert(delivery.includes("cache:'no-store'"));
assert(!delivery.includes('localStorage'));
assert(!delivery.includes('innerHTML'));
assert(delivery.includes("titleHeading.id='cc-delivery-heading'"),'Owner dashboard region must have a valid accessible heading');
assert(!delivery.includes('site_settings'));
assert(html.includes('id="or-release-packages"'));
assert.equal((html.match(/id="or-release-packages"/g)||[]).length,1);
const base='https://site.example/api/owner-roadmap?action=delivery-summary';
const env={SUPABASE_URL:'https://fake-supabase.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const oldFetch=globalThis.fetch;
let role='OWNER',privateReads=0,productReads=0;
const json=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url)=>{
 const u=String(url);
 if(u.endsWith('/auth/v1/user'))return json({id:'12345678-1234-4234-8234-123456789abc'});
 if(u.includes('/profiles?'))return json([{account_kind:'member'}]);
 if(u.includes('/admin_user_roles?'))return json([{role_code:role,expires_at:null}]);
 if(u.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(u.includes('/site_settings?')){privateReads++;return json([])}
 if(u.includes('/platform_plans?')||u.includes('/platform_tools?')){productReads++;return json([])}
 throw Error('Unexpected private read '+u);
};
try{
 const req=()=>new Request(base,{headers:{authorization:'Bearer mock-member-jwt'}});
 let response=await onRequest({request:new Request(base),env});
 assert.equal(response.status,401,'Anonymous users cannot read Owner summary');
 role='ADMIN';response=await onRequest({request:req(),env});
 assert.equal(response.status,403,'Non-Owner cannot read the delivery summary');
 assert.equal(privateReads,0,'No private roadmap queries before authorization');
 role='OWNER';response=await onRequest({request:req(),env});
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.releasePlan.packages.length,8);
 assert.equal(data.deliverySummary.primaryTasks,375,'Preserve all original primary tasks');
 assert.equal(data.deliverySummary.preservedReferenceLines,1815);
 assert.equal(Object.values(data.deliverySummary.counts).reduce((n,v)=>n+v,0),375);
 assert.equal(productReads,0,'Summary should not load unnecessary private product tables');
 assert.equal(privateReads,1,'Summary requires exactly one scoped existing-settings read');
 assert(!('items' in data),'Do not return private individual task records in dashboard summary');
 assert(!('productInventory' in data),'Do not include member or product details in dashboard summary');
}finally{globalThis.fetch=oldFetch}
console.log('PASS v0.14.0.141: Owner-only delivery UI, eight source release packages, expanded status contract');
