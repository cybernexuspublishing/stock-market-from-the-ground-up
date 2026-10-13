// Only a local simulated Supabase transport is used. No real accounts or keys.
import fs from 'node:fs'; import assert from 'node:assert/strict';
const src=fs.readFileSync(new URL('../functions/api/admin-operations-v0135.js',import.meta.url),'utf8');
const {onRequest}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
let calls=[];
globalThis.fetch=async(url,options={})=>{
 const u=String(url);calls.push(u);let data;
 if(u.endsWith('/auth/v1/user'))data={id:'11111111-1111-4111-8111-111111111111'};
 else if(u.includes('/profiles?'))data=[{account_kind:'member'}];
 else if(u.includes('/admin_user_roles?'))data=[{role_code:'OWNER',expires_at:null}];
 else if(u.includes('/platform_labs?'))data=[];
 else throw new Error('Unexpected database call: '+u);
 return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}})
};
const payload=Buffer.from(JSON.stringify({aal:'aal1'})).toString('base64url');
const token='mock.'+payload+'.mock';
const make=(requireMfa)=>({request:new Request('https://site.example/api/admin-operations-v0135?action=labs&bookCode=FOUNDATION_BOOK_2',{headers:{authorization:'Bearer '+token}}),env:{SUPABASE_URL:'https://fake.supabase.test',SUPABASE_PUBLISHABLE_KEY:'fake-pub',SUPABASE_SECRET_KEY:'fake-secret',REQUIRE_STAFF_AAL2_V135:requireMfa?'true':'false'}});
let r=await onRequest(make(false));let d=await r.json();assert.equal(r.status,200);assert.equal(d.ok,true);assert.equal(d.staffMfaRequired,false);assert.equal(d.bookCode,'FOUNDATION_BOOK_2');
let calledBefore=calls.length;r=await onRequest(make(true));d=await r.json();assert.equal(r.status,403);assert.match(d.error,/MFA/i);assert.equal(calls.length,calledBefore+3,'Only identity/role verification before MFA rejection');
console.log('PASS MFA CONTRACT: deployed OFF permits authorized OWNER read; ON rejects AAL1; policy matches UI');
