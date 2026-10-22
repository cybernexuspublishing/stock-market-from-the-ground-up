import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/advanced-tool-workspace-v014110.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
let kind='member',flag='active',mutations=0,records=1;
const saved=globalThis.fetch;
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,opt={})=>{
 const u=String(url),method=opt.method||'GET';
 if(u.endsWith('/auth/v1/user'))return json({id:uid});
 if(u.includes('/profiles?'))return json([{account_kind:kind}]);
 if(u.includes('/admin_user_flags?'))return json([{status:flag}]);
 if(u.includes('/admin_user_roles?'))return json([{role_code:'MEMBER',expires_at:null}]);
 if(u.includes('/platform_tools?'))return json([{tool_code:'WATCHLIST_WORKBENCH',name:'Watchlist',status:'beta',active:true,free_preview:true}]);
 if(u.endsWith('/rpc/user_has_tool_access'))return json(false);
 if(u.includes('/tool_workspace_records')&&method==='PATCH'){
  mutations++;
  assert(u.includes('user_id=eq.'+uid),'server-scoped member');
  assert(u.includes('tool_code=eq.WATCHLIST_WORKBENCH'),'scoped tool');
  assert(u.includes('record_type=eq.watchlist'),'cannot mutate unrelated type');
  assert(u.includes('updated_at=eq.'),'exact timestamp revision lease');
  assert(u.includes('id=eq.27'),'only requested record ID');
  assert(!u.includes('bbbbbbbb'),'reject injected user IDs');
  assert.equal(opt.headers.apikey,env.SUPABASE_SECRET_KEY);
  const b=JSON.parse(opt.body);
  assert.equal(b.title,'XYZ');
  assert.equal(b.user_id,undefined);
  return json(records?[{id:27}]:[]);
 }
 throw Error('Unexpected URL '+u);
};
const route='https://site.example/api/advanced-tool-workspace-v014110?tool=WATCHLIST_WORKBENCH&id=27';
const payload={recordType:'watchlist',title:'XYZ',payload:{status:'WATCH',asOf:'2026-10-22T09:30:00-04:00',sourceNote:'Dated source',invalidation:'NO TRADE'},expectedUpdatedAt:'2026-10-22T15:00:00.000Z'};
const req=(method,data,headers={})=>new Request(route,{method,headers:{authorization:'Bearer good-session','content-type':'application/json',...headers},body:JSON.stringify(data)});
try{
 let r=await onRequest({env,request:req('PATCH',payload,{origin:'https://other.example'})});
 assert.equal(r.status,403);assert.equal(mutations,0);
 r=await onRequest({env,request:req('PATCH',{...payload,expectedUpdatedAt:'wrong'})});
 assert.equal(r.status,400);assert.equal(mutations,0);
 r=await onRequest({env,request:req('PATCH',payload,{origin:'https://site.example'})});
 assert.equal(r.status,200);assert.equal((await r.json()).updated,true);assert.equal(mutations,1);
 records=0;r=await onRequest({env,request:req('PATCH',payload)});assert.equal(r.status,409,'stale revision conflicts');
 flag='suspended';r=await onRequest({env,request:req('PATCH',payload)});assert.equal(r.status,403);
 flag='active';kind='showcase';r=await onRequest({env,request:req('PATCH',payload)});assert.equal(r.status,403);
 const ui=readFileSync('assets/js/advanced-tools.js','utf8');
 for(const s of ['Update Saved Candidate','expectedUpdatedAt:editing.revision',"workspaceApi('&id='+encodeURIComponent(editing.id),'PATCH'"])
  assert(ui.includes(s),'UI edit action missing: '+s);
 console.log('PASS D10 watchlist optimistic-concurrency editing, tenant isolation, cross-origin and Showcase/suspended denial');
}finally{globalThis.fetch=saved}
