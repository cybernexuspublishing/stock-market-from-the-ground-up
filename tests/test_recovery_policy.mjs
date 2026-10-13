// Controlled, dependency-free negative tests. No network, provider, or Supabase writes.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const root=process.cwd();
const checkout=await import(pathToFileURL(`${root}/functions/api/checkout.js`).href);
const book=await import(pathToFileURL(`${root}/functions/api/checkout-v0135.js`).href);
const admin=await import(pathToFileURL(`${root}/functions/api/admin-v013.js`).href);
let calls=[];
const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
const uid='11111111-1111-4111-8111-111111111111';
globalThis.fetch=async function(url){const s=String(url);calls.push(s);
 if(s.includes('/auth/v1/user'))return response({id:uid,email:'test@example.invalid'});
 if(s.includes('/rest/v1/profiles?'))return response([{account_kind:'member'}]);
 if(s.includes('/rest/v1/admin_user_flags?'))return response([{status:'active'}]);
 if(s.includes('/rest/v1/account_private_identity?'))return response([{age_eligible:true,date_of_birth:'1990-01-01'}]);
 if(s.includes('/rest/v1/admin_user_roles?'))return response([{role_code:'MODERATOR',expires_at:null}]);
 throw new Error('Unexpected outbound request: '+s);
};
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public-stub',SUPABASE_SECRET_KEY:'server-stub'};
for(const [label,handler,url,payload] of [
 ['legacy checkout',checkout,'https://test.invalid/api/checkout?action=create',{type:'plan',code:'FULL_MONTHLY'}],
 ['format checkout',book,'https://test.invalid/api/checkout-v0135?action=create',{type:'book',code:'FOUNDATION_BOOK_1',format:'digital'}],
]){
 calls=[];
 const req=new Request(url,{method:'POST',headers:{authorization:'Bearer valid-for-fixture','content-type':'application/json'},body:JSON.stringify(payload)});
 const res=await handler.onRequest({request:req,env});const result=await res.json();
 assert.equal(res.status,503,`${label} must fail-closed while payment rollout flag absent`);
 assert.match(result.error,/Checkout is disabled/);
 assert.ok(!calls.some(s=>s.includes('checkout_intents')||s.includes('lemonsqueezy')),'No provider write on rollout-disabled request');
 console.log('PASS',label,'blocked before payment/provider writes');
}
calls=[];
const adminReq=new Request('https://test.invalid/api/admin-v013?action=archive_restore', {method:'POST',headers:{authorization:'Bearer valid-for-fixture','content-type':'application/json'},body:JSON.stringify({type:'book',id:'FOUNDATION_BOOK_1'})});
const a=await admin.onRequest({request:adminReq,env});
assert.equal(a.status,403,'A moderator may not restore books from archive');
assert.ok(!calls.some(s=>s.includes('catalog_products?')),'No legacy archive write attempted');
console.log('PASS archive restore requires OWNER, not Moderator');
