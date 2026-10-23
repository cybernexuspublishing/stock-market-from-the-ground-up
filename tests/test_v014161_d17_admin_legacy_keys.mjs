/* D17 legacy Admin owner endpoints: modern Supabase opaque-key compatibility. No provider calls. */
import assert from 'node:assert/strict';
import {onRequest as site} from '../functions/api/admin-site-v01354.js';
import {onRequest as notices} from '../functions/api/admin-owner-notifications.js';
const UID='11111111-1111-4111-8111-111111111111';
const origin='https://mock.supabase.co',oldFetch=globalThis.fetch;
const jwt='eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzZXJ2aWNlX3JvbGUifQ.test_signature';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
let key='',calls=[];
globalThis.fetch=async (url,options={})=>{
 const address=String(url);calls.push({address,options});
 if(address===origin+'/auth/v1/user'){
  assert.equal(options.headers.apikey,'sb_publishable_fixture');
  assert.equal(options.headers.authorization,'Bearer member-access');
  return json({id:UID});
 }
 assert(address.startsWith(origin+'/rest/v1/'),'Unexpected external request '+address);
 assert.equal(options.headers.apikey,key,'Service apikey must be set');
 assert.equal(options.headers.authorization,key===jwt?'Bearer '+jwt:undefined,
  'Opaque service secrets must not be used as JWT Authorization headers');
 if(address.includes('/profiles?select=account_kind'))return json([{account_kind:'member'}]);
 if(address.includes('/admin_user_roles?'))return json([{role_code:'OWNER',expires_at:null}]);
 if(address.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(address.includes('/profiles?select=id,username'))return json([]);
 if(address.includes('/site_modules_v1354?'))return json([]);
 if(address.includes('/user_notifications?'))return json([]);
 throw Error('Unexpected Admin query: '+address);
};
const req=action=>new Request('https://course.example/api/'+action,{headers:{authorization:'Bearer member-access'}});
try{
 for(const secret of ['sb_secret_fixture',jwt]){
  key=secret;calls=[];
  const env={SUPABASE_URL:origin,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',
   SUPABASE_SECRET_KEY:secret};
  const siteResponse=await site({env,request:req('admin-site-v01354?action=modules')});
  assert.equal(siteResponse.status,200,'Owner website modules should load with service key');
  assert.equal((await siteResponse.json()).ok,true);
  const noticesResponse=await notices({env,request:req('admin-owner-notifications')});
  assert.equal(noticesResponse.status,200,'Owner notifications should load with service key');
  assert.equal((await noticesResponse.json()).ok,true);
  assert(calls.some(x=>x.address.includes('/site_modules_v1354?')));
  assert(calls.some(x=>x.address.includes('/user_notifications?')));
 }
 console.log('PASS D17 Admin site and Owner notifications: opaque service and legacy JWT compatibility');
}finally{globalThis.fetch=oldFetch}
