// v0.14.0.116 — real API route mock and SQL atomic source invariants.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/forum-member-content.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',time='2026-10-20T12:00:00.000Z';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
let rpcreason='',missing=false,accountKind='member',role='',status='active',calls=[],locked=false,showcaseExpires=null;
const originalFetch=globalThis.fetch;
const json=(data,code=200)=>new Response(JSON.stringify(data),{status:code,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,options={})=>{
 const u=String(url),method=options.method||'GET';calls.push({u,method,options});
 if(u.endsWith('/auth/v1/user'))return json({id:uid});
 if(u.includes('/profiles?'))return json([{account_kind:accountKind}]);
 if(u.includes('/admin_user_flags?'))return json([{status}]);
 if(u.includes('/admin_user_roles?')){
  assert(u.includes('expires_at'),'Expired Showcase roles must be evaluated consistently with the SQL RPC');
  return json(role?[{role_code:role,expires_at:showcaseExpires}]:[]);
 }
 if(['/forum_topics?','/forum_posts?','/commons_topics?','/commons_posts?'].some(x=>u.includes(x))){
  assert.equal(method,'GET','No independent content PATCH permitted');
  return json([{id:11,author_id:uid,author_user_id:uid,status:'published',
   body:'Previously published educational post',title:'A published topic',updated_at:time,
   topic_id:7,is_locked:locked,is_official:false}]);
 }
 if(u.includes('/rpc/gu_v014116_member_change_with_audit')){
  assert.equal(method,'POST');assert.equal(options.headers.apikey,env.SUPABASE_SECRET_KEY);
  const payload=JSON.parse(options.body);assert.equal(payload.p_actor,uid);
  assert.equal(payload.p_version,time);
  return missing?json({message:'RPC missing'},404):
   json(rpcreason?{ok:false,reason:rpcreason}:{ok:true,atomic:true,auditRecorded:true});
 }
 if(u.includes('/admin_audit_log'))throw Error('Unacceptable independent audit write');
 throw Error('Unexpected backend fetch '+u);
};
const body={scope:'commons',type:'topic',id:11,operation:'edit',version:time,
 title:'Better educational topic title',body:'This is a carefully edited discussion.'};
const invoke=async(data=body,origin='https://example.org')=>{
 const req=new Request('https://example.org/api/forum-member-content?action=change',{
  method:'POST',headers:{authorization:'Bearer verified-user-token',origin,
  'content-type':'application/json'},body:JSON.stringify(data)});
 return onRequest({request:req,env});
};
try{
 for(const [scope,type] of [['commons','topic'],['commons','post'],['legacy','topic'],['legacy','post']]){
  const r=await invoke({...body,scope,type});assert.equal(r.status,200,scope+'/'+type);
  const j=await r.json();assert.equal(j.atomic,true);assert.equal(j.auditRecorded,true);
 }
 let r=await invoke(body,'https://attacker.test');assert.equal(r.status,403);
 locked=true;r=await invoke(body);assert.equal(r.status,409);locked=false;
 role='SHOWCASE_VIEWER';r=await invoke(body);assert.equal(r.status,403,'Active indefinite Showcase role denied');
 showcaseExpires='2020-01-01T00:00:00.000Z';
 r=await invoke(body);assert.equal(r.status,200,'Expired Showcase role must not keep blocking a production member');
 showcaseExpires='2099-01-01T00:00:00.000Z';
 r=await invoke(body);assert.equal(r.status,403,'Unexpired Showcase role must still be denied');
 role='';showcaseExpires=null;
 status='suspended';r=await invoke(body);assert.equal(r.status,403);status='active';
 rpcreason='conflict';r=await invoke(body);assert.equal(r.status,409);
 rpcreason='denied';r=await invoke(body);assert.equal(r.status,403);rpcreason='';
 missing=true;r=await invoke(body);assert.equal(r.status,503,'Missing SQL must fail closed');missing=false;
 assert(!calls.some(c=>c.method==='PATCH'||c.u.includes('/admin_audit_log')));
 const src=read('functions/api/forum-member-content.js');
 assert(!src.includes("db(c,'admin_audit_log'"));assert(!src.includes("method:'PATCH'"));
 const sql=read('supabase/migrations/v0.14.0.116_ATOMIC_MEMBER_FORUM_EDITS_OWNER_REVIEW_REQUIRED.sql');
 for(const term of ['FOR UPDATE','FOR SHARE','gu_v014116_member_change_with_audit',
  'SHOWCASE_VIEWER','admin_user_flags','admin_audit_log','clock_timestamp()',
  'REVOKE ALL ON FUNCTION','TO service_role','BEGIN;','COMMIT;','v_item->>v_author'])
  assert(sql.includes(term),'Missing SQL invariant '+term);
 assert(!sql.includes('SECURITY DEFINER'));
 assert(!sql.includes('EXCEPTION WHEN others THEN'),'Audit failure must roll back');
 console.log('PASS v116: member changes in both forums use one owner-scoped atomic audit RPC; no unsafe separate PATCH/audit.');
}finally{globalThis.fetch=originalFetch;}
