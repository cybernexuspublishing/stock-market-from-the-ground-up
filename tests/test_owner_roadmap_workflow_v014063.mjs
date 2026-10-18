// v0.14.0.63 — isolated private Owner Roadmap API acceptance, zero real writes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/owner-roadmap.js';
import {roadmapCatalog} from '../functions/_lib/owner-roadmap-catalog.js';
import {roadmapSupplementalItems} from '../functions/_lib/owner-roadmap-20261018-additions.js';
const publicHtml=readFileSync('owner-roadmap.html','utf8');
const privateApi=readFileSync('functions/api/owner-roadmap.js','utf8');
const js=readFileSync('assets/js/owner-roadmap.js','utf8');
assert.equal(roadmapCatalog.length,2096,'original registry preserved');
assert.equal(roadmapSupplementalItems.length,94,'latest approved work preserved');
assert.equal(roadmapCatalog.length+roadmapSupplementalItems.length,2190);
assert.equal(roadmapCatalog.filter(x=>x.scope==='core').length+roadmapSupplementalItems.length,375);
assert(publicHtml.includes('id="or-private-brief"'));
assert(!publicHtml.includes('The GU39 shadow acceptance path'));
assert(!publicHtml.includes('Owner-exported Supabase audit'));
assert(!publicHtml.includes('CURRENT Stripe TEST API 8/8'));
assert(!publicHtml.includes('all 8 product records'));
assert(!publicHtml.includes('id="or-deploy-sha"'),'deployed version must be rendered after Owner authorization');
assert(privateApi.includes('roadmapOperationalBrief'));
for(const s of ['or-action-board','or-origin','or-sort','or-clear-filters'])assert(publicHtml.includes(s),s);
for(const s of ["data-open-task","data-stage","function clearFilters()","expectedRevision","text.trimStart()","function renderPrivateBrief"])assert(js.includes(s),s);
const base='https://example.org/api/owner-roadmap';
const env={SUPABASE_URL:'https://fake-supabase.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_public',SUPABASE_SECRET_KEY:'sb_secret_only_server'};
const originalFetch=globalThis.fetch;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
let db=new Map(),roles='OWNER',kind='member',flag='active',auditWrites=0,dbWrites=0,privateRequests=0,wrongSecretAuth=false;
const user='11111111-2222-4333-8444-555555555555';
globalThis.fetch=async(path,opts={})=>{
 const u=String(path);
 if(u.endsWith('/auth/v1/user'))return json({id:user});
 if(!u.includes('/rest/v1/'))throw Error('Unexpected mock network request '+u);
 privateRequests++;
 // Modern Supabase server secret must never be passed as a fabricated JWT.
 if(opts.headers?.authorization==='Bearer sb_secret_only_server')wrongSecretAuth=true;
 if(u.includes('/profiles?'))return json([{account_kind:kind}]);
 if(u.includes('/admin_user_roles?'))return json([{role_code:roles,expires_at:null}]);
 if(u.includes('/admin_user_flags?'))return json([{status:flag}]);
 if(u.includes('/admin_audit_log')){
   auditWrites++;return json([],201);
 }
 if(u.includes('/site_settings?')){
   const method=opts.method||'GET';
   const key=(()=>{
     const found=/setting_key=eq\.([^&]+)/.exec(u);
     return found?decodeURIComponent(found[1]):null;
   })();
   if(method==='GET'){
     if(key)return json(db.has(key)?[db.get(key)]:[]);
     return json([...db.values()]);
   }
   const payload=JSON.parse(opts.body);
   if(method==='POST'){
     dbWrites++;
     if(db.has(payload.setting_key))return json([]);
     db.set(payload.setting_key,{...payload});
     return json([payload],201);
   }
   if(method==='PATCH'){
     dbWrites++;
     const stamp=/updated_at=eq\.([^&]+)/.exec(u)?.[1];
     const old=key?db.get(key):null;
     if(!old||old.updated_at!==decodeURIComponent(stamp||''))return json([]);
     const updated={...old,...payload};db.set(key,updated);
     return json([updated]);
   }
 }
 throw Error('Unexpected Supabase mock path '+u);
};
const request=(method='GET',body=null,origin='https://example.org')=>new Request(base,{
 method,headers:{authorization:'Bearer ephemeral-owner-jwt',
 ...(body?{'content-type':'application/json',origin}:{})},
 body:body?JSON.stringify(body):undefined
});
const call=async(req)=>{const r=await onRequest({request:req,env});return {status:r.status,data:await r.json()};};
try{
 let r=await call(new Request(base));assert.equal(r.status,401);assert(!('operationalBrief' in r.data));
 roles='ADMIN';r=await call(request());assert.equal(r.status,403);assert(!('operationalBrief' in r.data));
 roles='OWNER';kind='showcase';assert.equal((await call(request())).status,403);
 kind='test';assert.equal((await call(request())).status,403);
 kind='member';flag='restricted';assert.equal((await call(request())).status,403);
 flag='suspended';assert.equal((await call(request())).status,403);
 flag='active';
 r=await call(request());assert.equal(r.status,200);
 assert.equal(r.data.items.length,2190);
 assert.equal(r.data.metadata.totalCount,2190);
 assert.equal(r.data.items.filter(x=>x.scope==='core').length,375);
 assert.equal(r.data.operationalBrief.phases.length,6);
 assert.equal(r.data.operationalBrief.priorities.length,8);
 assert.equal(r.data.progress['CORE-0001'],undefined);
 assert.equal(r.data.delegatedBaseline['CORE-0001'].persisted,false);
 assert(!wrongSecretAuth,'server must not send modern sb_secret as Bearer token');
 assert(privateRequests>0);
 const start={action:'save',id:'CORE-0001',status:'in_progress',note:'Working on release parity',expectedRevision:null};
 r=await call(request('POST',start));assert.equal(r.status,200);assert.equal(r.data.auditLogged,true);
 const rev1=r.data.progress.revision;assert.match(rev1,/^[a-f0-9-]{36}$/i);
 assert.equal(db.get('owner_roadmap.task.CORE-0001').public_read,false);
 assert.equal(dbWrites,1);
 r=await call(request('POST',{...start,status:'verified',note:'No'}));assert.equal(r.status,409,'stale update must be rejected before evidence validation');
 r=await call(request('POST',{...start,expectedRevision:rev1,status:'verified',note:'No'}));assert.equal(r.status,400,'verified requires documentary evidence');
 r=await call(request('POST',{...start,expectedRevision:rev1,status:'verified',note:'Deployed commit and Cloudflare release SHA match in preview'}));
 assert.equal(r.status,200);const rev2=r.data.progress.revision;assert.notEqual(rev1,rev2);
 const now=db.get('owner_roadmap.task.CORE-0001');assert.equal(now.value.status,'verified');assert.equal(now.value.revision,rev2);
 r=await call(request('POST',{...start,expectedRevision:rev1,status:'blocked'}));assert.equal(r.status,409,'stale revision must never clobber');
 r=await call(request());assert.equal(r.data.progress['CORE-0001'].revision,rev2);
 assert.equal(r.data.progress['CORE-0001'].status,'verified');
 assert.equal((await call(request('POST',{action:'save',id:'CORE-9999',status:'owner_complete',expectedRevision:null}))).status,404);
 assert.equal((await call(request('POST',{...start,expectedRevision:rev2},'https://attacker.example'))).status,403);
 // Custom tasks may be added and archived but cannot be silently revived.
 const created=await call(request('POST',{action:'add',title:'Owner tracking acceptance test',area:'Operations',detail:'Isolated mock test'}));
 assert.equal(created.status,200);
 const id=created.data.item.id,rev=created.data.progress.revision;
 r=await call(request('POST',{action:'archive',id,expectedRevision:rev}));assert.equal(r.status,200);
 r=await call(request('POST',{action:'save',id,expectedRevision:r.data.progress.revision,status:'owner_complete'}));assert.equal(r.status,404);
 r=await call(request());assert(!r.data.custom.some(x=>x.id===id));
 assert(auditWrites>=4,'audit attempts recorded after completed mock mutations');
 console.log('PASS Owner Roadmap v0.14.0.63: 2190 records, private brief, role exclusions, modern secret, optimistic saving, evidence threshold, custom archive, no live privileges');
}finally{globalThis.fetch=originalFetch;}
