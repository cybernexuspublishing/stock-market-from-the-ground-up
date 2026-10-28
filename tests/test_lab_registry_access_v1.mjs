import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/lab-registry-access.js';
const env={SUPABASE_URL:'https://lab-access-fixture.test',SUPABASE_PUBLISHABLE_KEY:'pub_fixture',SUPABASE_SECRET_KEY:'secret_fixture'};
const userId='11111111-1111-4111-8111-111111111111';
const state={interactive:false,training:false,owned:null,restricted:false};
const prior=globalThis.fetch;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(uri,options={})=>{
 const u=new URL(uri),path=u.pathname;
 assert.equal(u.hostname,'lab-access-fixture.test','Never connect to real Supabase in fixture');
 if(path==='/auth/v1/user')return json({id:userId});
 if(path==='/rest/v1/profiles')return json([{account_kind:'member',deleted_at:null}]);
 if(path==='/rest/v1/admin_user_flags')return json(state.restricted?[{status:'restricted'}]:[]);
 if(path==='/rest/v1/admin_user_roles')return json([]);
 if(path==='/rest/v1/rpc/user_has_tool_access'){
  const tool=JSON.parse(options.body).target_tool;
  return json(tool==='INTERACTIVE_LEARNING'?state.interactive:tool==='ONDEMAND_TRAINING'?state.training:false);
 }
 if(path==='/rest/v1/user_library'){
  const code=u.searchParams.get('product_code')?.replace(/^eq\./,'');
  return json(code===state.owned?[{product_code:code,expires_at:null}]:[]);
 }
 if(['/rest/v1/book_key_redemptions','/rest/v1/user_plan_grants','/rest/v1/site_subscriptions'].includes(path))return json([]);
 throw Error('Unexpected provider request: '+path);
};
const req=(auth=true)=>new Request('https://website-fixture.test/api/lab-registry-access',{headers:auth?{authorization:'Bearer fixture-jwt'}:{}});
try{
 let r=await onRequest({request:req(false),env});assert.equal(r.status,401);
 r=await onRequest({request:req(),env});let b=await r.json();
 assert.equal(r.status,200);assert.equal(b.freeEligible,true);
 assert.equal(b.interactive,false);assert.equal(b.training,false);
 assert.deepEqual(b.bookCodes,[]);assert.equal(b.freeSampleIds.length,3);
 assert(!JSON.stringify(b).includes(userId),'Do not echo subject ID');
 state.interactive=true;r=await onRequest({request:req(),env});b=await r.json();
 assert.equal(b.interactive,true);assert.equal(b.training,false);
 state.interactive=false;state.training=true;r=await onRequest({request:req(),env});b=await r.json();
 assert.equal(b.training,true);
 state.training=false;state.owned='FOUNDATION_BOOK_2';
 r=await onRequest({request:req(),env});b=await r.json();
 assert.deepEqual(b.bookCodes,['FOUNDATION_BOOK_2']);
 state.restricted=true;r=await onRequest({request:req(),env});
 assert.equal(r.status,403,'Restricted member denied even with a historic book');
 console.log('PASS Lab Registry server: guests denied, Free samples, paid and book entitlements separated, restricted denied');
}finally{globalThis.fetch=prior}
