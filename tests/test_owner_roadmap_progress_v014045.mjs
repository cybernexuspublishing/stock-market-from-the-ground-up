import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/owner-roadmap.js';
import { roadmapCatalog } from '../functions/_lib/owner-roadmap-catalog.js';
import { roadmapEngineeringReview } from '../functions/_lib/owner-roadmap-engineering-review.js';

const ids=roadmapCatalog.filter(x=>x.scope==='core');
assert.equal(ids.length,281);
assert.equal(roadmapCatalog.length,2096);
assert.equal(Object.keys(roadmapEngineeringReview.items).length,166);
for(const task of ids.filter(x=>x.id.startsWith('CORE-'))) {
 const stage=roadmapEngineeringReview.items[task.id]?.stage;
 assert(stage,['deployed_verified','source_implemented','in_progress','blocked','backlog'].join(' '));
}
const URL='https://learn.example.com/api/owner-roadmap';
const environment={SUPABASE_URL:'https://fake123.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
let role='OWNER',kind='member',flag='active',saveCalls=0,state={},writes=[];
const user='1bd8155c-b8df-4f99-9e3f-110c3ad9d7d8';
const previous=globalThis.fetch;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(path,opts={})=>{
 const target=String(path);
 if(target.includes('/auth/v1/user'))return json({id:user});
 if(target.includes('/rest/v1/profiles?'))return json([{account_kind:kind}]);
 if(target.includes('/rest/v1/admin_user_roles?'))return json([{role_code:role,expires_at:null}]);
 if(target.includes('/rest/v1/admin_user_flags?'))return json([{status:flag}]);
 if(target.includes('/rest/v1/site_settings?')&&opts.method==='POST'){
   const next=JSON.parse(opts.body);saveCalls++;writes.push(next);
   state[next.setting_key]={setting_key:next.setting_key,value:next.value,public_read:next.public_read};
   return json([next],201);
 }
 if(target.includes('/rest/v1/site_settings?')){
   if(target.includes('setting_key=eq.')) {
    const key=decodeURIComponent(target.split('setting_key=eq.')[1].split('&')[0]);
    return json(state[key]?[state[key]]:[]);
   }
   return json(Object.values(state));
 }
 if(target.includes('/rest/v1/admin_audit_log'))return json([],201);
 throw Error('Unexpected backend request '+target);
};
try {
 const anonymous=await onRequest({request:new Request(URL),env:environment});
 assert.equal(anonymous.status,401);
 const req=(method='GET',body)=>new Request(URL,{method,headers:{
   authorization:'Bearer user-mock',...(body?{'content-type':'application/json',origin:'https://learn.example.com'}:{})
  },body:body?JSON.stringify(body):undefined});
 role='ADMIN';
 assert.equal((await onRequest({request:req(),env:environment})).status,403);
 role='OWNER';kind='showcase';
 assert.equal((await onRequest({request:req(),env:environment})).status,403);
 kind='member';flag='suspended';
 assert.equal((await onRequest({request:req(),env:environment})).status,403);
 flag='active';
 const r=await onRequest({request:req(),env:environment});
 assert.equal(r.status,200);
 const payload=await r.json();
 assert.equal(payload.items.length,2190);
 assert.equal(Object.values(payload.engineeringReview.counts).reduce((a,b)=>a+b,0),375);
 assert.equal(payload.progress['CORE-0001'],undefined,'No Owner checkbox may be auto-set from engineering audit');
 assert.equal(payload.items.find(x=>x.id==='CORE-0001').engineeringReview.stage,'deployed_verified');
 assert.equal(payload.items.find(x=>x.id==='CORE-0030').engineeringReview.stage,'in_progress');
 assert.equal(payload.items.find(x=>x.id==='CORE-0080').engineeringReview.stage,'blocked');
 assert.equal(payload.items.find(x=>x.scope==='trace')?.engineeringReview,null);
 const commit=await onRequest({request:req('POST',{id:'CORE-0001',status:'in_progress',note:'Owner accepted testing note'}),env:environment});
 assert.equal(commit.status,200);
 assert.equal(writes.at(-1).public_read,false);
 assert.equal(saveCalls,1);
 const again=await onRequest({request:req(),env:environment});
 assert.equal((await again.json()).progress['CORE-0001'].status,'in_progress',
   'Explicit Owner progress must remain independent of source review');
 const invalid=await onRequest({request:req('POST',{id:'CORE-1234',status:'owner_complete',note:''}),env:environment});
 assert.equal(invalid.status,404);
 const cross=new Request(URL,{method:'POST',headers:{authorization:'Bearer owner','content-type':'application/json',origin:'https://evil.example'},
   body:JSON.stringify({id:'CORE-0001',status:'verified'})});
 assert.equal((await onRequest({request:cross,env:environment})).status,403);
 console.log('PASS v0.14.0.45: 281 status assessments, Owner-only and status-isolation contract');
}finally{globalThis.fetch=previous}
