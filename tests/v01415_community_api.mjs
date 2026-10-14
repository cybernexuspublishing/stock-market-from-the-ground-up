import assert from 'node:assert/strict';
import {onRequest as content} from '../functions/api/forum-member-content.js';
import {onRequest as moderate} from '../functions/api/admin-forum-actions.js';
const uid='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', outsider='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const env={SUPABASE_URL:'https://supabase.example',SUPABASE_PUBLISHABLE_KEY:'public-test',SUPABASE_SECRET_KEY:'private-test'};
const original=globalThis.fetch;
let writes=0,privilege='member',ownerRow=uid;
function respond(obj,status=200){return new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}})}
globalThis.fetch=async (url,opts={})=>{const u=new URL(url),p=u.pathname,search=u.searchParams,method=opts.method||'GET';
 if(p==='/auth/v1/user')return respond({id:uid});
 if(p.endsWith('/profiles'))return respond([{account_kind:privilege==='showcase'?'showcase':'member'}]);
 if(p.endsWith('/admin_user_flags'))return respond([{status:privilege==='restricted'?'restricted':'active'}]);
 if(p.endsWith('/admin_user_roles'))return respond(privilege==='moderator'?[{role_code:'MODERATOR'}]:privilege==='owner'?[{role_code:'OWNER'}]:[]);
 if(p.endsWith('/admin_role_permissions'))return respond(privilege==='moderator'?[{role_code:'MODERATOR'}]:[]);
 if(p.endsWith('/forum_posts')){
  if(method==='PATCH'){writes++;return respond([{id:9}])}
  return respond([{id:9,author_id:ownerRow,body:'A source-backed observation',status:'published',updated_at:'2026-10-10T00:00:00.000Z',topic_id:2}])
 }
 if(p.endsWith('/forum_topics'))return respond([{id:2,status:'published',updated_at:'2026-10-10T00:00:00.000Z',is_locked:false,is_pinned:false}]);
 if(p.endsWith('/commons_topics')){if(method==='PATCH'){writes++;return respond([{id:2}])}return respond([{id:2,status:'published',updated_at:'2026-10-10T00:00:00.000Z',is_locked:false,is_pinned:false,is_official:false,title:'Testing'}])}
 if(p.endsWith('/admin_audit_log'))return respond([]);
 return respond([]);
};
const req=(route,body,method='POST')=>new Request('https://example.pages.dev'+route,{method,headers:{authorization:'Bearer test',...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
const changed={scope:'legacy',type:'post',id:9,operation:'edit',body:'Revised evidence and explanation',version:'2026-10-10T00:00:00.000Z'};
try{
 ownerRow=outsider;let r=await content({env,request:req('/api/forum-member-content?action=change',changed)});assert.equal(r.status,403);assert.equal(writes,0,'cross-author modification denied');
 ownerRow=uid;privilege='showcase';r=await content({env,request:req('/api/forum-member-content?action=change',changed)});assert.equal(r.status,403);
 privilege='restricted';r=await content({env,request:req('/api/forum-member-content?action=change',changed)});assert.equal(r.status,403);
 privilege='member';r=await content({env,request:req('/api/forum-member-content?action=change',{...changed,version:'wrong'})});assert.equal(r.status,409);
 r=await content({env,request:req('/api/forum-member-content?action=change',changed)});assert.equal(r.status,200);assert.equal(writes,1);
 r=await moderate({env,request:req('/api/admin-forum-actions',{scope:'commons',type:'topic',id:2,action:'hide',version:'2026-10-10T00:00:00.000Z',note:'Misleading information'})});assert.equal(r.status,403,'members cannot moderate');
 privilege='moderator';r=await moderate({env,request:req('/api/admin-forum-actions',{scope:'commons',type:'topic',id:2,action:'hide',version:'2026-10-10T00:00:00.000Z',note:'Misleading information'})});assert.equal(r.status,200,'moderator with permission may hide');
 r=await moderate({env,request:req('/api/admin-forum-actions',{scope:'commons',type:'topic',id:2,action:'delete',version:'2026-10-10T00:00:00.000Z',note:'Policy breach'})});assert.equal(r.status,400,'delete requires confirmation');
 console.log('PASS v0.14.0.15 member ownership, account restrictions, optimistic versioning, staff permission, audit notes and delete confirmation');
}finally{globalThis.fetch=original}
