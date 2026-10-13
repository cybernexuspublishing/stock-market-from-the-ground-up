import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const load=async f=>import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(new URL(f,root),'utf8')).toString('base64'));
const id='11111111-1111-4111-8111-111111111111';
const env={SUPABASE_URL:'https://fake.supabase.test',SUPABASE_SECRET_KEY:'secret',SUPABASE_PUBLISHABLE_KEY:'publishable',ENABLE_PAID_CHECKOUT:'true'};
const response=(x,status=200,extra={})=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json',...extra}});
const assessment=(await load('functions/api/assessment-v0135.js')).onRequest;
for(const stat of ['suspended','restricted','SUSPENDED']){
 let reads=[];
 globalThis.fetch=async u=>{
  let s=String(u);reads.push(s);
  if(s.includes('/auth/v1/user'))return response({id});
  if(s.includes('/profiles?'))return response([{account_kind:'member'}]);
  if(s.includes('/admin_user_flags?'))return response([{status:stat}]);
  if(s.includes('/rpc/my_platform_access'))throw new Error('restricted actor reached entitlement RPC');
  throw new Error('Unexpected '+s);
 };
 const r=await assessment({request:new Request('https://site.example/api/assessment-v0135?action=list',{headers:{authorization:'Bearer fake'}}),env});
 assert.equal(r.status,403);assert.match((await r.json()).error,/restricted/i);
 assert.equal(reads.length,3);console.log('PASS assessment denies '+stat);
}
for(const kind of ['showcase','test']){
 globalThis.fetch=async u=>{let s=String(u);if(s.includes('/auth/v1/user'))return response({id});if(s.includes('/profiles?'))return response([{account_kind:kind}]);throw Error('Unexpected access: '+s)};
 const r=await assessment({request:new Request('https://site.example/api/assessment-v0135?action=list',{headers:{authorization:'Bearer fake'}}),env});
 assert.equal(r.status,403);console.log('PASS assessment denies '+kind);
}
// Legacy checkout never quotes or creates book purchases without format/KDP safeguards.
const checkout=(await load('functions/api/checkout.js')).onRequest;
for(const action of ['quote','create']){
 let calls=[];
 globalThis.fetch=async(u,opts={})=>{const s=String(u);calls.push(s);
  if(s.includes('/auth/v1/user'))return response({id,email:'valid@example.test'});
  if(s.includes('/profiles?'))return response([{account_kind:'member'}]);
  if(s.includes('/admin_user_flags?'))return response([{status:'active'}]);
  if(s.includes('/account_private_identity?'))return response([{age_eligible:true,date_of_birth:'1988-01-01'}]);
  if(s.includes('/catalog_products?'))throw Error('Legacy book lookup must never be used');
  if(s.includes('/checkout_intents'))throw Error('Legacy book checkout created intent');
  throw Error('Unexpected request '+s);
 };
 const method=action==='quote'?'GET':'POST';
 const request=new Request(`https://site.example/api/checkout?action=${action}${action==='quote'?'&type=book&code=FOUNDATION_BOOK_1':''}`,{method,headers:{authorization:'Bearer fake',...(method==='POST'?{'content-type':'application/json'}:{})},...(method==='POST'?{body:JSON.stringify({type:'book',code:'FOUNDATION_BOOK_1'})}:{})});
 const r=await checkout({request,env});
 assert.equal(r.status,404);assert.ok(!calls.some(s=>s.includes('checkout_intents')));
 console.log('PASS legacy '+action+' fails closed for books');
}
// Owner stats edits and even reading private settings cannot bypass a frozen account.
const stats=(await load('functions/api/home-member-stats-v01353.js')).onRequest;
for(const stat of ['suspended','restricted']){
 globalThis.fetch=async(u,opts={})=>{const s=String(u);
 if(s.includes('/auth/v1/user'))return response({id});
 if(s.includes('/profiles?'))return response([{account_kind:'member'}]);
 if(s.includes('/admin_user_roles?'))return response([{role_code:'OWNER',expires_at:null}]);
 if(s.includes('/admin_user_flags?'))return response([{status:stat}]);
 throw Error('No settings data should be fetched: '+s)};
 const r=await stats({request:new Request('https://site.example/api/home-member-stats-v01353?action=settings',{headers:{authorization:'Bearer fake'}}),env});
 assert.equal(r.status,403);console.log('PASS stats denies '+stat+' Owner');
}
console.log('PASS v0.14.0.6 security guards without live Supabase data');
const legacyV13=(await load('functions/api/admin-v013.js')).onRequest;
for(const action of ['demo_create','demo_delete','test_account_create']){
 globalThis.fetch=async()=>{throw Error('Legacy admin mutation contacted backend')};
 const r=await legacyV13({request:new Request(`https://site.example/api/admin-v013?action=${action}`,{method:'POST',body:'{}'}),env});
 assert.equal(r.status,410,action);console.log('PASS deprecated v013 action blocked at handler: '+action);
}
const legacyV134=(await load('functions/api/admin-v0134.js')).onRequest;
for(const action of ['account_create','test_account_create','showcase_account_create','account_identity_correct','account_email_update']){
 globalThis.fetch=async()=>{throw Error('Legacy account mutation contacted backend')};
 const r=await legacyV134({request:new Request(`https://site.example/api/admin-v0134?action=${action}`,{method:'POST',body:'{}'}),env});
 assert.equal(r.status,410,action);console.log('PASS deprecated v0134 action blocked at handler: '+action);
}
