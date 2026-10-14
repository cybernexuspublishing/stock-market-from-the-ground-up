import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const location=path.resolve('functions/api/admin-report-policy.js');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ground-up-policy-'));
fs.copyFileSync(location,path.join(temp,'api.mjs'));
const {onRequestGet,onRequestPost}=await import(pathToFileURL(path.join(temp,'api.mjs')).href);
const id='12345678-1234-1234-1234-123456789abc';
const env={SUPABASE_URL:'https://fake.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public-key',SUPABASE_SECRET_KEY:'private-server-key'};
const j=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
const full={policy_id:1,quota_enabled:true,quota_max:10,quota_hours:24,duplicate_enabled:true,duplicate_hours:24,version:9,updated_at:'2026-10-14T20:00:00Z'};
let role='OWNER',account='member',flag='active',calls=[],fail='';
const previous=globalThis.fetch;
globalThis.fetch=async(url,opts={})=>{const x=String(url);calls.push({x,method:opts.method||'GET',body:opts.body});
 if(x.endsWith('/auth/v1/user'))return j({id});
 if(x.includes('/profiles?'))return j([{account_kind:account}]);
 if(x.includes('/admin_user_flags?'))return j([{status:flag}]);
 if(x.includes('/admin_user_roles?'))return j([{role_code:role,expires_at:null}]);
 if(x.includes('/admin_role_permissions?'))return j([{role_code:'MODERATOR'}]);
 if(x.includes('/community_report_policy_v01417?'))return fail==='missing'?j({message:'Table unavailable'},404):j([full]);
 if(x.includes('/rpc/gu_owner_report_policy_save_v01417'))return fail==='stale'?j({message:'POLICY_STALE'},409):j({...full,version:10});
 throw Error('Unexpected URL '+x)
};
const req=(body)=>new Request('https://site.example/api/admin-report-policy',{method:body?'POST':'GET',headers:{authorization:'Bearer test-session',...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
const payload={expectedVersion:9,quotaEnabled:false,quotaMax:12,quotaHours:24,duplicateEnabled:false,duplicateHours:48};
try{
 let r=await onRequestGet({request:req(),env});assert.equal(r.status,200);let d=await r.json();assert.equal(d.canEdit,true);assert.equal(d.policy.quota_max,10);
 r=await onRequestPost({request:req(payload),env});assert.equal(r.status,200);assert(calls.some(x=>x.x.includes('/rpc/gu_owner_report_policy_save_v01417')));assert(calls.some(x=>x.body&&x.body.includes('p_duplicate_enabled')));
 r=await onRequestPost({request:req({...payload,quotaMax:200}),env});assert.equal(r.status,400);
 role='ADMIN';calls=[];r=await onRequestPost({request:req(payload),env});assert.equal(r.status,403);assert(!calls.some(x=>x.x.includes('/rpc/')));
 role='MODERATOR';r=await onRequestGet({request:req(),env});assert.equal(r.status,200);assert.equal((await r.json()).canEdit,false);
 role='SHOWCASE_VIEWER';r=await onRequestGet({request:req(),env});assert.equal(r.status,403);
 role='OWNER';flag='suspended';r=await onRequestGet({request:req(),env});assert.equal(r.status,403);
 flag='active';fail='stale';r=await onRequestPost({request:req(payload),env});assert.equal(r.status,409);assert.equal((await r.json()).code,'POLICY_STALE');
 fail='missing';r=await onRequestGet({request:req(),env});assert.equal(r.status,503);
 console.log('PASS policy API: owner read/write, admin deny write, moderator read, showcase deny, suspended deny, input ranges, optimistic lock, absent migration');
}finally{globalThis.fetch=previous;fs.rmSync(temp,{recursive:true,force:true})}
