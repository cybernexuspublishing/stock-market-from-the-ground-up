import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/api/page-workspace-presentation.js';
const uid='11111111-1111-4111-8111-111111111111',host='https://mock-pages.supabase.co';
const env={SUPABASE_URL:host,SUPABASE_PUBLISHABLE_KEY:'sb_public_fixture',SUPABASE_SECRET_KEY:'sb_secret_fixture'};
let enabled=false,pages=['simulator.html'],owner=false,expired=false,restricted=false;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
const original=globalThis.fetch;
globalThis.fetch=async (url,options={})=>{
 const u=new URL(url);assert.equal(u.hostname,'mock-pages.supabase.co');
 if(u.pathname==='/rest/v1/site_settings')return json([{value:{enabled,pages}}]);
 if(u.pathname==='/auth/v1/user')return json({id:uid});
 if(u.pathname==='/rest/v1/profiles')return json([{account_kind:'member',deleted_at:null}]);
 if(u.pathname==='/rest/v1/admin_user_flags')return json(restricted?[{status:'restricted'}]:[]);
 if(u.pathname==='/rest/v1/admin_user_roles'){
  if(u.searchParams.get('role_code')==='eq.SHOWCASE_VIEWER')return json([]);
  return json(owner?[{role_code:'OWNER',expires_at:expired?new Date(Date.now()-60000).toISOString():null}]:[]);
 }
 if(u.pathname==='/rest/v1/rpc/user_has_tool_access')return json(false);
 throw Error('Unexpected remote dependency '+u.pathname);
};
const call=async(page,workspace,token=false)=>{
 const qs=new URLSearchParams({page});if(workspace)qs.set('workspace',workspace);
 const r=await onRequestGet({env,request:new Request('https://site.example/api/page-workspace-presentation?'+qs,{
  headers:token?{authorization:'Bearer test-session'}:{}})});
 return {status:r.status,data:await r.json()};
};
try{
 let x=await call('simulator.html','continuous');assert.equal(x.data.mode,'classic','Guest may not force unpublished layout');
 owner=true;x=await call('simulator.html','continuous',true);
 assert.equal(x.data.mode,'continuous');assert.equal(x.data.preview,true);
 x=await call('journal.html','continuous',true);assert.equal(x.data.mode,'continuous','Owner can preview a page not yet selected');
 owner=false;x=await call('journal.html','continuous',true);assert.equal(x.data.mode,'classic','Regular member may not force preview');
 owner=true;expired=true;x=await call('journal.html','continuous',true);assert.equal(x.data.mode,'classic','Expired OWNER role must not preview');
 expired=false;restricted=true;x=await call('journal.html','continuous',true);
 assert.equal(x.data.mode,'classic','Restricted OWNER is not privileged');
 restricted=false;owner=false;enabled=true;pages=['journal.html','labs.html'];
 x=await call('journal.html');assert.equal(x.data.mode,'continuous','Published selected page works for guest');
 x=await call('simulator.html');assert.equal(x.data.mode,'classic','Unselected chart page stays Classic');
 x=await call('labs.html','classic',true);assert.equal(x.data.mode,'continuous','Non-Owner cannot override published layout');
 owner=true;x=await call('labs.html','classic',true);assert.equal(x.data.mode,'classic','Owner can compare Classic on published page');
 x=await call('admin.html','continuous',true);assert.equal(x.status,400,'Never allow admin page selection');
 x=await call('checkout.html','continuous',true);assert.equal(x.status,400,'Never allow checkout page selection');
 console.log('PASS published page selections; no spillover; Owner preview/Classic compare; expired/restricted denial; no admin/checkout');
}finally{globalThis.fetch=original}
