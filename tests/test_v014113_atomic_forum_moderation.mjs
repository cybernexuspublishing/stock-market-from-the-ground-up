// v0.14.0.113 — atomic forum moderation source-side security and schema contract.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/admin-forum-actions.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',time='2026-10-20T12:00:00.000Z';
const env={SUPABASE_URL:'https://mock.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
let role='OWNER',status='active',official=false,dbUnavailable=false,reason=null,spy=[];
const original=globalThis.fetch;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,
 headers:{'content-type':'application/json'}});
globalThis.fetch=async (url,options={})=>{
 const u=String(url),method=options.method||'GET';spy.push({u,method,options});
 if(u.endsWith('/auth/v1/user'))return json({id:uid});
 if(u.includes('/profiles?'))return json([{account_kind:'member'}]);
 if(u.includes('/admin_user_flags?'))return json([{status}]);
 if(u.includes('/admin_user_roles?'))return json([{role_code:role,expires_at:null}]);
 if(u.includes('/admin_role_permissions?'))return json(role==='MODERATOR'?[{role_code:'MODERATOR'}]:[]);
 if(['/forum_topics?','/forum_posts?','/commons_topics?','/commons_posts?'].some(x=>u.includes(x))){
  assert.equal(method,'GET','No browser/API PATCH mutation permitted outside atomic RPC');
  return json([{id:11,status:'published',updated_at:time,title:'Original topic',
   body:'A published discussion and explanation',is_official:official,
   is_locked:false,is_pinned:false}]);
 }
 if(u.includes('/rpc/gu_v014113_moderate_with_audit')){
  assert.equal(method,'POST');assert.equal(options.headers.apikey,env.SUPABASE_SECRET_KEY);
  assert.equal(options.headers.authorization,undefined,'Modern Supabase secret is apikey only');
  const params=JSON.parse(options.body);
  assert.equal(params.p_actor,uid,'Actor identity must be verified server-side');
  assert.equal(params.p_version,time);assert.equal(params.p_note,'A clear moderation reason.');
  return dbUnavailable?json({message:'not found'},404):
   json(reason?{ok:false,reason}:{ok:true,action:params.p_action,atomic:true,auditRecorded:true});
 }
 if(u.includes('/admin_audit_log'))throw Error('Unsafe separate audit INSERT is forbidden');
 throw Error('Unexpected backend '+u);
};
const req=(body,origin='https://example.org')=>new Request('https://example.org/api/admin-forum-actions',{
 method:'POST',headers:{authorization:'Bearer real-user-session',
  'content-type':'application/json',origin},body:JSON.stringify(body)});
const base={scope:'legacy',type:'topic',id:11,action:'hide',
 version:time,note:'A clear moderation reason.'};
try{
 for(const [scope,type] of [['legacy','topic'],['legacy','post'],
  ['commons','topic'],['commons','post']]){
  const r=await onRequest({request:req({...base,scope,type}),env});
  assert.equal(r.status,200,scope+'/'+type);
  const d=await r.json();assert.equal(d.atomic,true);assert.equal(d.auditRecorded,true);
 }
 const writes=spy.filter(x=>x.u.includes('/rpc/gu_v014113')).length;
 assert.equal(writes,4);
 let r=await onRequest({request:req(base,'https://malicious.invalid'),env});
 assert.equal(r.status,403);
 role='ADMIN';r=await onRequest({request:req(base),env});assert.equal(r.status,403);
 role='MODERATOR';r=await onRequest({request:req({...base,scope:'commons',type:'topic'}),env});
 assert.equal(r.status,200);
 official=true;r=await onRequest({request:req({...base,scope:'commons',type:'topic'}),env});
 assert.equal(r.status,403);
 role='OWNER';r=await onRequest({request:req({...base,scope:'commons',type:'topic'}),env});
 assert.equal(r.status,200);
 role='SHOWCASE_VIEWER';official=false;r=await onRequest({request:req(base),env});assert.equal(r.status,403);
 role='OWNER';status='suspended';r=await onRequest({request:req(base),env});assert.equal(r.status,403);
 status='active';reason='conflict';r=await onRequest({request:req(base),env});assert.equal(r.status,409);
 reason='denied';r=await onRequest({request:req(base),env});assert.equal(r.status,403);
 reason=null;dbUnavailable=true;r=await onRequest({request:req(base),env});
 assert.equal(r.status,503,'Missing v113 RPC must fail CLOSED without a PATCH fallback');
 assert(!JSON.stringify(await r.json()).includes('not found'));
 dbUnavailable=false;
 assert(!spy.some(x=>x.method==='PATCH'),'No unsafe direct update can reach backend');
 const source=readFileSync(new URL('../functions/api/admin-forum-actions.js',import.meta.url),'utf8');
 assert(!source.includes("db(c,'admin_audit_log'"));
 assert(!source.includes("method:'PATCH'"));
 const sql=readFileSync(new URL('../supabase/migrations/v0.14.0.113_ATOMIC_FORUM_MODERATION_AUDIT_OWNER_REVIEW_REQUIRED.sql',import.meta.url),'utf8');
 assert.equal((sql.match(/AS \$forum_v014113\$/g)||[]).length,1);
 assert.equal((sql.match(/END \$forum_v014113\$;/g)||[]).length,1);
 for(const fragment of ['BEGIN;','COMMIT;','FOR UPDATE',
  'pg_temp','admin_user_roles','admin_role_permissions','SHOWCASE_VIEWER',
  'clock_timestamp()','admin_audit_log','RETURNING id INTO v_audit',
  'SECURITY INVOKER','REVOKE ALL ON FUNCTION','TO service_role',
  "p_scope='commons' AND p_type='topic'","p_version::timestamptz"])
  assert(sql.includes(fragment),'Critical atomic moderation invariant missing: '+fragment);
 assert(!sql.includes('EXCEPTION WHEN others THEN'),'Never swallow audit failure after a content update');
 console.log('PASS v113: both forums, topics/posts, per-action atomic RPC only, staff/Owner/Showcase authorization, SQL row lock/audit, no mutation fallback.');
}finally{globalThis.fetch=original}
