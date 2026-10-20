import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/admin-forum-actions.js';
const env={SUPABASE_URL:'https://supabase.example',SUPABASE_PUBLISHABLE_KEY:'test-public',SUPABASE_SECRET_KEY:'server-secret'};
const original=globalThis.fetch;
const authId='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',oldVersion='2026-10-10T00:00:00.000Z';
let role='MODERATOR',flag='active',official=false,patches=[];
const response=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async (url,options={})=>{
 const u=new URL(url),path=u.pathname,method=options.method||'GET';
 if(path==='/auth/v1/user')return response({id:authId});
 if(path.endsWith('/profiles'))return response([{account_kind:role==='SHOWCASE_VIEWER'?'showcase':'member'}]);
 if(path.endsWith('/admin_user_flags'))return response([{status:flag}]);
 if(path.endsWith('/admin_user_roles'))return response([{role_code:role}]);
 if(path.endsWith('/admin_role_permissions'))return response(role==='MODERATOR'?[{role_code:'MODERATOR'}]:[]);
 if(path.endsWith('/rpc/gu_v014113_moderate_with_audit')){patches.push({path,body:JSON.parse(options.body)});return response({ok:true,auditRecorded:true,atomic:true});}
 if(path.endsWith('/admin_audit_log'))return response([]);
 if(['/forum_topics','/forum_posts','/commons_topics','/commons_posts'].some(x=>path.endsWith(x))){
  if(method==='PATCH'){patches.push({path,body:JSON.parse(options.body)});return response([{id:11}]);}
  return response([{id:11,updated_at:oldVersion,status:'published',is_official:official,is_locked:false,is_pinned:false,title:'Original discussion title',body:'Original forum text'}]);
 }
 return response([]);
};
const request=(body)=>new Request('https://stock-market-from-the-ground-up.pages.dev/api/admin-forum-actions',{method:'POST',headers:{authorization:'Bearer test-session','content-type':'application/json'},body:JSON.stringify(body)});
const edit={scope:'commons',type:'topic',id:11,action:'edit',version:oldVersion,note:'Moderator corrected unsafe misinformation in a test discussion.',title:'Updated discussion title',body:'Reviewed correction with evidence and source context.'};
try {
 for(const [kind,type] of [['commons','topic'],['legacy','topic'],['commons','post'],['legacy','post']]){
  const x={...edit,scope:kind,type,...(type==='post'?{title:undefined}:{})};
  let r=await onRequest({env,request:request(x)});assert.equal(r.status,200,`${kind}/${type} editor should be accepted`);const p=patches.at(-1);assert.equal(p.body.p_body,x.body);if(type==='topic')assert.equal(p.body.p_title,x.title);else assert.equal(p.body.p_title,null);assert.equal(p.body.p_actor,authId);
 }
 let wrote=patches.length;
 for(const x of [{...edit,version:'stale'},{...edit,note:'no'},{...edit,body:'no',title:'Updated discussion title'}, {...edit,title:'bad'}]){
  const r=await onRequest({env,request:request(x)});assert(r.status>=400,`invalid edit should fail ${r.status}`);assert.equal(patches.length,wrote);
 }
 role='SHOWCASE_VIEWER';let r=await onRequest({env,request:request(edit)});assert.equal(r.status,403);assert.equal(patches.length,wrote);
 role='MODERATOR';flag='suspended';r=await onRequest({env,request:request(edit)});assert.equal(r.status,403);assert.equal(patches.length,wrote);
 flag='active';official=true;r=await onRequest({env,request:request(edit)});assert.equal(r.status,403);assert.equal(patches.length,wrote);
 role='OWNER';r=await onRequest({env,request:request(edit)});assert.equal(r.status,200);
 const workflow=readFileSync(new URL('../assets/js/admin-workflows.js',import.meta.url),'utf8');
 const admin=readFileSync(new URL('../assets/js/admin.js',import.meta.url),'utf8');
 assert.match(workflow,/const panel=p,s=p\.querySelector/,'Inspector must use its mounted panel, not a nonexistent variable');
 assert.match(workflow,/data-operation="edit"/);
 assert.match(admin,/admin-report-inspect/);
 assert.match(admin,/GroundUpAdminWorkflows\?\.openModeration/);
 console.log('PASS v0.14.0.16: four forum editorial paths, authorization and validation, report-to-inspector UI contracts');
}finally{globalThis.fetch=original;}
