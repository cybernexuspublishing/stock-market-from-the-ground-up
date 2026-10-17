import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/owner-roadmap.js';
import {roadmapCatalog} from '../functions/_lib/owner-roadmap-catalog.js';
import {roadmapEngineeringReview} from '../functions/_lib/owner-roadmap-engineering-review.js';
import {delegatedProgressFor,delegatedReviewPolicy,delegatedStages} from '../functions/_lib/owner-roadmap-delegation-v014046.js';
const stageStatus={deployed_verified:'owner_complete',source_implemented:'implemented',
 in_progress:'in_progress',blocked:'blocked',backlog:'deferred'};
const expected={approved_delivered_control:12,approved_source_delivery_pending_QA:153,
 not_approved_active:47,not_approved_blocked:25,not_approved_backlog:44};
assert.equal(roadmapCatalog.filter(x=>x.scope==='core').length,281);
assert.equal(delegatedReviewPolicy.reviewDate,'2026-10-17');
assert(!('jwt' in delegatedReviewPolicy),'Delegation is not an authenticated OWNER role');
assert.equal(delegatedProgressFor('OWN-anything',{stage:'deployed_verified'}),null);
for(const key of Object.keys(stageStatus))assert.equal(delegatedStages[key].status,stageStatus[key]);

const previous=globalThis.fetch;
const base='https://dummy000.supabase.co';
const env={SUPABASE_URL:base,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const account='2ab33c3f-df45-46ab-a526-c56915db1e8f';
let role='OWNER',kind='member',flag='active',writes=0,settings={};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,options={})=>{
 const path=String(url);
 if(path.endsWith('/auth/v1/user'))return reply({id:account});
 if(path.includes('/rest/v1/profiles?'))return reply([{account_kind:kind}]);
 if(path.includes('/rest/v1/admin_user_roles?'))return reply([{role_code:role,expires_at:null}]);
 if(path.includes('/rest/v1/admin_user_flags?'))return reply([{status:flag}]);
 if(path.includes('/rest/v1/site_settings?')&&options.method==='POST'){
   const item=JSON.parse(options.body);settings[item.setting_key]={...item};writes++;return reply([item],201);
 }
 if(path.includes('/rest/v1/site_settings?')){
   if(path.includes('setting_key=eq.')){const key=decodeURIComponent(path.split('setting_key=eq.')[1].split('&')[0]);return reply(settings[key]?[settings[key]]:[]);}
   return reply(Object.values(settings));
 }
 if(path.includes('/rest/v1/admin_audit_log')&&options.method==='POST')return reply([],201);
 throw Error('Unexpected mocked network request '+path);
};
const api='https://owner.example.com/api/owner-roadmap';
const req=(method='GET',data=null)=>new Request(api,{method,
 headers:{authorization:'Bearer user-mock',...(data?{'content-type':'application/json',origin:'https://owner.example.com'}:{})},
 ...(data?{body:JSON.stringify(data)}:{})});
try{
 const anonymous=await onRequest({request:new Request(api),env});assert.equal(anonymous.status,401);
 role='ADMIN';assert.equal((await onRequest({request:req(),env})).status,403);
 role='OWNER';kind='showcase';assert.equal((await onRequest({request:req(),env})).status,403);
 kind='member';flag='restricted';assert.equal((await onRequest({request:req(),env})).status,403);
 flag='active';
 let response=await onRequest({request:req(),env});assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.items.length,2096);
 assert.equal(Object.keys(data.delegatedBaseline).length,281);
 assert.equal(Object.keys(data.progress).length,0,'GET must not create Owner signed status rows');
 assert.equal(writes,0,'GET and delegation must never write to Supabase');
 assert.equal(data.delegatedReview.version,'0.14.0.46');
 assert.deepEqual(data.delegatedReview.counts,expected);
 for(const item of data.items.filter(x=>x.scope==='core')){
   const p=data.delegatedBaseline[item.id];
   assert(p && p.persisted===false && p.provenance==='assistant_delegated_source_review');
   const stage=item.engineeringReview.stage;
   assert.equal(p.status,stageStatus[stage],item.id);
   assert(p.note.includes('Evidence/limitation:'));
 }
 for(const item of data.items.filter(x=>x.scope==='trace')){
   assert.equal(data.delegatedBaseline[item.id],undefined,'Trace records cannot inherit blanket completion approval');
 }
 assert.equal(data.delegatedBaseline['CORE-0001'].status,'owner_complete');
 assert.equal(data.delegatedBaseline['CORE-0077'].status,'in_progress');
 assert.equal(data.delegatedBaseline['CORE-0080'].status,'blocked');
 assert.equal(data.delegatedBaseline['EXEC-72'].status,'deferred');
 const update=await onRequest({request:req('POST',{id:'CORE-0001',status:'blocked',note:'Owner override: new external dependency'}),env});
 assert.equal(update.status,200);
 assert.equal(writes,1);
 response=await onRequest({request:req(),env});const updated=await response.json();
 assert.equal(updated.progress['CORE-0001'].status,'blocked','Explicit Owner state must take precedence in client');
 assert.equal(updated.delegatedBaseline['CORE-0001'].status,'owner_complete','Immutable reviewed source baseline still visible for traceability');
 assert.equal(writes,1,'Reading after Owner write must never modify approved history');
 console.log('PASS v0.14.0.46: 12 evidence-supported delegated checkmarks, 153 source acceptance, 47 current, 25 blocked, 44 backlog; Owner state retained and role-negative checks pass.');
}finally{globalThis.fetch=previous}
