/* D16: zero-cost regression for opaque Supabase service keys in BOTH Admin APIs. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const admin=readFileSync('functions/api/admin.js','utf8');
const accounts=readFileSync('functions/api/admin-accounts-v01353.js','utf8');
function helper(source,name,signature){
 const at=source.indexOf('function '+name+'('+signature+'){');
 assert(at>=0,'Missing '+name);
 const until=source.indexOf('\n}',at);assert(until>at,'Helper terminator missing');
 const definition=source.slice(at,until+2);
 return new Function('clean','problem',definition+'\nreturn '+name+';')(
  x=>String(x??'').trim(),
  (message,status)=>Object.assign(new Error(message),{status})
 );
}
const service=helper(admin,'serviceHeaders','value'),account=helper(accounts,'apiHeaders','value,body');
const modern='sb_secret_example_not_a_jwt',legacy='eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature';
assert.deepEqual(service(modern),{apikey:modern});
assert.deepEqual(account(modern),{apikey:modern,accept:'application/json'});
assert.deepEqual(account(modern,{}),{apikey:modern,accept:'application/json','content-type':'application/json'});
assert.equal(service(legacy).authorization,'Bearer '+legacy);
assert.equal(account(legacy).authorization,'Bearer '+legacy);
assert.throws(()=>service('not_a_key'),/malformed/);
assert.throws(()=>account('not_a_key'),e=>e.status===503);
assert(!admin.includes('authorization:`Bearer ${secret}`'),'Legacy Admin backend must not blindly use opaque secret as Bearer');
assert(!accounts.includes('authorization:`Bearer ${secret}`'),'Account Management backend must not blindly use opaque secret as Bearer');
const {onRequest}=await import('data:text/javascript;base64,'+Buffer.from(admin).toString('base64'));
const originalFetch=globalThis.fetch;
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',SUPABASE_SECRET_KEY:modern};
const observed=[];
globalThis.fetch=async(input,opts={})=>{
 const url=String(input),head=opts.headers||{},serviceCall=!url.endsWith('/auth/v1/user');
 if(serviceCall){
  assert.equal(head.apikey,modern,'Service request uses API key');
  assert(!('authorization' in head),'Opaque sb_secret must not be placed in Bearer header');
 }else{
  assert.equal(head.apikey,'sb_publishable_mock');
  assert.equal(head.authorization,'Bearer example-member-jwt');
 }
 observed.push(url);
 const response=value=>new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json','content-range':'0-0/0'}});
 if(url.includes('/auth/v1/user'))return response({id:'123e4567-e89b-12d3-a456-426614174000',email:'staff@example.test'});
 if(url.includes('/rest/v1/admin_user_roles?select=role_code'))return response([{role_code:'OWNER',expires_at:null}]);
 if(url.includes('/rest/v1/admin_role_permissions'))return response([{permission_code:'users.view'}]);
 if(url.includes('/rest/v1/admin_user_roles?select=*'))return response([]);
 if(url.includes('/auth/v1/admin/users'))return response({users:[]});
 throw Error('Unexpected service request '+url);
};
try{
 const req=new Request('https://site.example/api/admin?action=users',{headers:{authorization:'Bearer example-member-jwt'}});
 const response=await onRequest({request:req,env}),data=await response.json();
 assert.equal(response.status,200,'Authenticated staff list should run with modern secret');
 assert.equal(data.ok,true);
 assert(Array.isArray(data.users)&&data.users.length===0);
 assert(observed.some(u=>u.includes('/auth/v1/admin/users')),'Administrative Auth endpoint actually invoked');
}finally{globalThis.fetch=originalFetch;}
console.log('PASS D16 opaque sb_secret and legacy JWT service headers in Admin and Account Management');
