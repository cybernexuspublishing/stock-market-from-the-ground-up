import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/api/chart-studio-presentation.js';
const uid='11111111-1111-4111-8111-111111111111';
const env={SUPABASE_URL:'https://mocklayout.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',SUPABASE_SECRET_KEY:'sb_secret_fixture'};
let owner=false,enabled=false,restricted=false,ownerExpired=false;
const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
const original=globalThis.fetch;
globalThis.fetch=async (url,options={})=>{
 const u=new URL(url);assert.equal(u.hostname,'mocklayout.supabase.co');
 if(u.pathname==='/auth/v1/user')return response({id:uid});
 if(u.pathname==='/rest/v1/profiles')return response([{account_kind:'member',deleted_at:null}]);
 if(u.pathname==='/rest/v1/admin_user_flags')return response(restricted?[{status:'restricted'}]:[]);
 if(u.pathname==='/rest/v1/admin_user_roles'){
  if(u.searchParams.get('role_code')==='eq.SHOWCASE_VIEWER')return response([]);
  return response(owner?[{role_code:'OWNER',expires_at:ownerExpired?new Date(Date.now()-3600000).toISOString():null}]:[]);
 }
 if(u.pathname==='/rest/v1/rpc/user_has_tool_access')return response(false);
 if(u.pathname==='/rest/v1/site_settings')return response([{value:{enabled}}]);
 throw Error('Unexpected mock lookup '+u.pathname);
};
const get=async query=>{
 const url='https://site.example/api/chart-studio-presentation'+(query?'?workspace='+query:'');
 const r=await onRequestGet({request:new Request(url,{headers:{authorization:'Bearer fixture-user-session'}}),env});
 return {status:r.status,body:await r.json()};
};
try{
 let a=await get('continuous');assert.equal(a.body.mode,'classic');assert.equal(a.body.ownerPreview,false);
 owner=true;a=await get('continuous');assert.equal(a.body.mode,'continuous');assert.equal(a.body.preview,true);
 a=await get();assert.equal(a.body.mode,'classic');assert.equal(a.body.ownerPreview,true);
 ownerExpired=true;a=await get('continuous');assert.equal(a.body.mode,'classic');
 ownerExpired=false;owner=false;enabled=true;
 a=await get();assert.equal(a.body.mode,'continuous');assert.equal(a.body.enabled,true);
 a=await get('classic');assert.equal(a.body.mode,'continuous','Non-Owner cannot override published layout');
 owner=true;a=await get('classic');assert.equal(a.body.mode,'classic');
 restricted=true;a=await get('continuous');assert.equal(a.status,403,'Restricted account cannot preview layout');
 const guest=await onRequestGet({request:new Request('https://site.example/api/chart-studio-presentation'),env});
 assert.equal(guest.status,401);
 console.log('PASS published/disabled/OWNER preview/Owner classic comparison/expired Owner/restricted/guest layout authorization');
}finally{globalThis.fetch=original}
