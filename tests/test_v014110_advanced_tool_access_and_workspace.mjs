// v0.14.0.110: full beta tool access, no cross-member workspace data, and SQL lock.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ADVANCED_CODES} from '../functions/_lib/advanced-tool-access-v014110.js';
import {onRequest as access} from '../functions/api/advanced-tool-access-v014110.js';
import {onRequest as workspace} from '../functions/api/advanced-tool-workspace-v014110.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
assert.equal(ADVANCED_CODES.length,16);assert.equal(new Set(ADVANCED_CODES).size,16);
let kind='member',state='active',role='MEMBER',entitled=false,preview=false,active=true,toolStatus='beta';
let authorizedBearer='Bearer good-session',mutationCount=0,dbRequests=[];
const original=globalThis.fetch;
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,opt={})=>{
 const u=String(url),m=opt.method||'GET';dbRequests.push({u,m,opt});
 if(u.endsWith('/auth/v1/user')){
  if(opt.headers?.authorization!=='Bearer good-session')return json({message:'bad token'},401);
  return json({id:uid});
 }
 if(u.includes('/profiles?'))return json([{account_kind:kind}]);
 if(u.includes('/admin_user_flags?'))return json([{status:state}]);
 if(u.includes('/admin_user_roles?'))return json([]);
 if(u.includes('/admin_user_roles?'))return json([{role_code:role,expires_at:null}]);
 if(u.includes('/platform_tools?'))return json([{
  tool_code:'WATCHLIST_WORKBENCH',name:'Watchlist & Trade-Plan Workbench',
  description:'Member research workbench',category:'Research',
  status:toolStatus,active,free_preview:preview,individual_price_cents:2999
 }]);
 if(u.endsWith('/rpc/user_has_tool_access')){assert.equal(JSON.parse(opt.body).target_user,uid);return json(entitled)}
 if(u.includes('/tool_workspace_records')){
  assert.equal(opt.headers.apikey,env.SUPABASE_SECRET_KEY);
  assert.equal(opt.headers.authorization,undefined,'Opaque Supabase secret must never be used as bearer JWT');
  assert(u.includes('user_id=eq.'+uid)||m==='POST','All reads/deletes must be user-scoped');
  if(m==='POST'){
   mutationCount++;const v=JSON.parse(opt.body);
   assert.equal(v.user_id,uid);assert.equal(v.tool_code,'WATCHLIST_WORKBENCH');
   return json([{id:27,tool_code:v.tool_code}]);
  }
  if(m==='DELETE'){mutationCount++;assert(u.includes('tool_code=eq.WATCHLIST_WORKBENCH'));return new Response(null,{status:204})}
  return json([{id:27,user_id:uid,tool_code:'WATCHLIST_WORKBENCH',record_type:'watchlist',title:'ABC',payload:{ticker:'ABC'}}]);
 }
 throw Error('Unexpected service URL: '+u);
};
const req=(path,method='GET',body,headers={})=>new Request('https://site.example/api/'+path,{method,
 headers:{authorization:authorizedBearer,...(body?{'content-type':'application/json'}:{}),...headers},
 body:body?JSON.stringify(body):undefined});
const path='advanced-tool-workspace-v014110?tool=WATCHLIST_WORKBENCH';
const document=readFileSync(new URL('../assets/js/advanced-tools.js',import.meta.url),'utf8');
try{
 let r=await access({env,request:req('advanced-tool-access-v014110?tool=WATCHLIST_WORKBENCH')});
 assert.equal(r.status,200);let result=await r.json();assert.equal(result.authorized,false);
 let denial=await workspace({env,request:req(path)});assert.equal(denial.status,403);
 assert(!dbRequests.some(x=>x.u.includes('/tool_workspace_records')),'Denied plan cannot read workspace');
 preview=true;
 r=await access({env,request:req('advanced-tool-access-v014110?tool=WATCHLIST_WORKBENCH')});
 result=await r.json();assert.equal(result.authorized,true);assert.equal(result.accessLevel,'free_preview');
 r=await workspace({env,request:req(path)});result=await r.json();assert.equal(r.status,200);
 assert.equal(result.records.length,1);
 const payload={recordType:'watchlist',title:'ABC',payload:{status:'WATCH',ticker:'ABC'}};
 r=await workspace({env,request:req(path,'POST',payload,{origin:'https://attacker.example'})});
 assert.equal(r.status,403);assert.equal(mutationCount,0);
 r=await workspace({env,request:req(path,'POST',{...payload,user_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'},{origin:'https://site.example'})});
 assert.equal(r.status,201);assert.equal(mutationCount,1);
 r=await workspace({env,request:req(path+'&id=27','DELETE',undefined,{origin:'https://site.example'})});
 assert.equal(r.status,200);assert.equal(mutationCount,2);
 r=await workspace({env,request:req(path+'&all=true','DELETE',undefined,{origin:'https://site.example'})});
 assert.equal(r.status,400);assert.equal(mutationCount,2);
 r=await workspace({env,request:req(path+'&all=true','DELETE',undefined,{origin:'https://site.example','x-confirm-delete':'DELETE_MY_TOOL_WORKSPACE'})});
 assert.equal(r.status,200);assert.equal(mutationCount,3);
 preview=false;entitled=true;
 r=await access({env,request:req('advanced-tool-access-v014110?tool=WATCHLIST_WORKBENCH')});
 assert.equal((await r.json()).accessLevel,'entitled');
 for(const value of ['restricted','suspended']){
  state=value;r=await workspace({env,request:req(path)});assert.equal(r.status,403);
 }
 state='active';kind='showcase';r=await workspace({env,request:req(path)});assert.equal(r.status,403);
 kind='member';role='SHOWCASE_VIEWER';r=await workspace({env,request:req(path)});assert.equal(r.status,403);
 role='MEMBER';active=false;r=await workspace({env,request:req(path)});assert.equal(r.status,403);
 active=true;toolStatus='planned';r=await workspace({env,request:req(path)});assert.equal(r.status,403);
 toolStatus='beta';authorizedBearer='Bearer invalid-token';r=await workspace({env,request:req(path)});assert.equal(r.status,401);
 authorizedBearer='Bearer good-session';r=await access({env,request:req('advanced-tool-access-v014110?tool=OPTIONS_LAB')});assert.equal(r.status,404);
 r=await workspace({env,request:req(path+'&offset=-5')});assert.equal(r.status,400);
 assert(!document.includes(".from('tool_workspace_records')"),'Browser must no longer access paid workspace table directly');
 assert(!document.includes("rpc('my_platform_access')"),'Browser-computed entitlements may not authorize beta tools');
 assert(document.includes('renderWorkspaceManager()')&&document.includes('Export all tool records'));
 const sql=readFileSync(new URL('../supabase/migrations/v0.14.0.110_ADVANCED_WORKSPACE_ENTITLEMENT_LOCKDOWN_OWNER_REVIEW_REQUIRED.sql',import.meta.url),'utf8');
 for(const token of ['BEGIN;','COMMIT;','DROP POLICY IF EXISTS "manage own tool workspaces"',
  'REVOKE ALL ON TABLE public.tool_workspace_records FROM PUBLIC,anon,authenticated',
  'GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.tool_workspace_records TO service_role'])
  assert(sql.includes(token),'Missing direct SQL privilege closure: '+token);
 console.log('PASS v110: 16 beta tools, authoritative member access, free preview, restricted/test/Showcase denial, origin defense, id-scoped exports/deletes, direct database bypass removal SQL.');
}finally{globalThis.fetch=original}
