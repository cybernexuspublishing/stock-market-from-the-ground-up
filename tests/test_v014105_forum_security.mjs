// v0.14.0.105 forum regression tests with entirely mocked Supabase.
import assert from 'node:assert/strict';
import {onRequest as memberContent} from '../functions/api/forum-member-content.js';
import {onRequest as moderate} from '../functions/api/admin-forum-actions.js';
import {onRequestPost as report} from '../functions/api/commons-report.js';
import {boundedForumJson,checkMutationOrigin} from '../functions/_lib/forum-request-guards-v014105.js';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',SUPABASE_SECRET_KEY:'sb_secret_mock'};
const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const prior=globalThis.fetch,headers={'content-type':'application/json'};
const out=(v,status=200)=>new Response(JSON.stringify(v),{status,headers});
let role='OWNER',locked=false,reportWrites=0,postWrites=0,moderationWrites=0,forumReads=[];
globalThis.fetch=async(url,init={})=>{
 const u=String(url),method=init.method||'GET';forumReads.push({u,init});
 if(u.endsWith('/auth/v1/user'))return out({id:actor});
 if(u.includes('/profiles?'))return out([{account_kind:'member'}]);
 if(u.includes('/admin_user_flags?'))return out([{status:'active'}]);
 if(u.includes('/admin_user_roles?'))return out(u.includes('role_code=eq.SHOWCASE_VIEWER')?[]:role==='OWNER'?[{role_code:'OWNER',expires_at:null}]:[]);
 if(u.includes('/admin_role_permissions?'))return out([]);
 if(u.includes('/commons_topics?')){
  if(method==='PATCH'){moderationWrites++;return out([{id:7}])}
  return out([{id:7,author_user_id:actor,body:'Author observations',title:'Original topic',updated_at:'2026-10-01T00:00:00Z',status:'published',is_locked:locked,is_official:false}]);
 }
 if(u.includes('/forum_topics?'))return out([{id:7,author_id:actor,body:'Original notes',title:'Original topic',updated_at:'2026-10-01T00:00:00Z',status:'published',is_locked:locked}]);
 if(u.includes('/forum_posts?')){
  if(method==='PATCH'){postWrites++;return out([{id:9}])}
  return out([{id:9,author_id:actor,body:'Existing post',topic_id:7,status:'published',updated_at:'2026-10-01T00:00:00Z'}]);
 }
 if(u.includes('/commons_posts?'))return out([{id:9,author_user_id:actor,body:'existing post',topic_id:7,status:'published',updated_at:'2026-10-01T00:00:00Z'}]);
 if(u.includes('/admin_audit_log'))return out([]);
 if(u.includes('/rpc/forum_get_topic'))return out([{topic_id:7,discussion_unlocked:true}]);
 if(u.includes('/rpc/forum_list_posts'))return out([{post_id:9}]);
 if(u.includes('/rpc/v014_community_report')){reportWrites++;return out({ok:true})}
 throw Error('Unexpected backend URL '+u);
};
function req(path,method='POST',body={},origin='https://site.example'){
 return new Request('https://site.example/api/'+path,{
  method,headers:{authorization:'Bearer mock',origin,'content-type':'application/json'},
  body:method==='GET'?undefined:JSON.stringify(body)});
}
const now='2026-10-01T00:00:00Z';
try{
 // Cross-origin authorization tokens never authorize browser writes alone.
 for(const [path,endpoint,payload] of [
  ['forum-member-content?action=change',memberContent,{scope:'legacy',type:'post',id:9,operation:'edit',body:'Changed original text',version:now}],
  ['admin-forum-actions',moderate,{scope:'commons',type:'topic',id:7,action:'hide',version:now,note:'Unsafe post'}],
  ['commons-report',report,{scope:'legacy',type:'topic',id:7,topicId:7,reason:'scam'}]
 ]) {
  const result=await (endpoint===report?endpoint({request:req(path,'POST',payload,'https://attacker.example'),env}):
  endpoint({request:req(path,'POST',payload,'https://attacker.example'),env}));
  assert.equal(result.status,403,path+' rejects cross-origin modifications');
 }
 assert.equal(postWrites,0);assert.equal(moderationWrites,0);assert.equal(reportWrites,0);
 locked=true;
 let r=await memberContent({request:req('forum-member-content?action=detail','GET'),env});
 // Missing selector returns validation rather than leaking records.
 assert.equal(r.status,400);
 r=await memberContent({request:req('forum-member-content?action=detail&scope=commons&type=topic&id=7','GET'),env});
 assert.equal(r.status,409,'Authors cannot edit locked topics');
 r=await memberContent({request:req('forum-member-content?action=change','POST',{
  scope:'commons',type:'topic',id:7,operation:'edit',body:'Longer updated notes',title:'Updated title',version:now}),env});
 assert.equal(r.status,409);
 locked=false;
 // Moderators get only the fields needed; never select=* for private rows.
 r=await moderate({request:req('admin-forum-actions?scope=legacy&type=post&id=9','GET'),env});
 assert.equal(r.status,200);
 assert(forumReads.find(x=>x.u.includes('forum_posts?select=id,status,updated_at,body&id=')),'Post lookup excludes topic-only columns');
 assert(!forumReads.some(x=>x.u.includes('select=*')),'Moderation read must never expose raw table row');
 // Request size limit applies even when Content-Length is absent.
 const oversize=new Request('https://site.example/',{method:'POST',body:'A'.repeat(17000)});
 await assert.rejects(()=>boundedForumJson(oversize,16000),e=>e.status===413);
 const malformed=new Request('https://site.example/',{method:'POST',body:'{bad json'});
 await assert.rejects(()=>boundedForumJson(malformed),e=>e.status===400);
 assert.throws(()=>checkMutationOrigin(new Request('https://site.example/',{headers:{origin:'https://hostile.example'}})),e=>e.status===403);
 console.log('PASS v105: forum rejects cross-origin writes, controls actual-byte payloads, locked-topic member edits, and limits moderation projections.');
}finally{globalThis.fetch=prior}
