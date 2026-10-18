'use strict';
/* No real Supabase users or Turnstile tokens. This test exercises the deployed API handler in isolation. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('create-account.html','utf8');
const signup = fs.readFileSync('assets/js/signup.js','utf8');
const legacy = fs.readFileSync('assets/js/production-completion.js','utf8');
const ts = fs.readFileSync('src/ts/production-completion.ts','utf8');
for (const id of ['signup-first-name','signup-last-name','signup-dob','signup-username','signup-email','signup-password','signup-password-confirm','signup-terms']) {
  assert.ok(html.includes('id="'+id+'"'), 'Missing required signup field: '+id);
}
assert.ok(html.includes('onsubmit="createAccount(event)"'));
assert.ok(signup.includes("fetch('/api/account?action=signup'"),'Primary registration form must use server age gate');
assert.ok(signup.includes('bookClaimToken:claimToken'),'Book Key claims must survive server handoff');
assert.ok(signup.includes('captchaToken}'),'Native CAPTCHA token must survive server handoff');
assert.ok(!legacy.includes('function createAccountUpgrade'),'Obsolete duplicate submit handler still deployed');
assert.ok(!ts.includes('function createAccountUpgrade'),'Obsolete duplicate submit handler still in TypeScript source');

const apiSource = fs.readFileSync('functions/api/account.js','utf8')
  .replace('export async function onRequest','async function onRequest');
const calls = [];
let available=true;
const fakeFetch=async (url,opts={}) => {
  const target=String(url);
  calls.push({target,opts});
  let body={};
  if(target.includes('/rest/v1/rpc/username_is_available')) body=available;
  else if(target.includes('/rest/v1/site_feature_controls')) body=[{enabled:true}];
  else if(target.includes('/auth/v1/signup')) body={user:{id:'00000000-0000-4000-8000-000000000009'},session:null};
  else if(target.includes('/rest/v1/')) body=[];
  else throw Error('Unexpected test network request: '+target);
  return new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});
};
const sandbox={fetch:fakeFetch,Request,Response,URL,Date,JSON,Error,encodeURIComponent};
vm.createContext(sandbox);
vm.runInContext(apiSource+'\nthis.signupHandler=onRequest; this.canonicalUsername=normalizeUsername;',sandbox);
assert.equal(sandbox.canonicalUsername('James_Test'),'James_Test');
assert.equal(sandbox.canonicalUsername('james_test'),'James_test');
for (const bad of ['James.Test','James-Test','Ab','J'.repeat(25),'12James','James Test']) {
  assert.throws(()=>sandbox.canonicalUsername(bad),/Username must/);
}
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public',
 SUPABASE_SECRET_KEY:'secret',ENFORCE_AUTH_TURNSTILE_V135:'true',
 TURNSTILE_SITE_KEY:'publicsitekey',TURNSTILE_SECRET_KEY:'private-test-placeholder'};
const base={firstName:'James',lastName:'Example',dateOfBirth:'01/01/1990',
 username:'James_Test',email:'james-test@example.invalid',password:'GoodPassword!12',
 confirmPassword:'GoodPassword!12',termsAccepted:true,bookClaimToken:'12345678-1234-1234-1234-123456789abc',
 captchaToken:'sample-cloudflare-verification-token-should-be-validated-by-supabase'};
async function run(body) {
 const req=new Request('https://stock-market-from-the-ground-up.pages.dev/api/account?action=signup',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const res=await sandbox.signupHandler({request:req,env});
 return {status:res.status,body:await res.json()};
}
(async()=>{
  assert.equal((await run({...base,username:'James.Test'})).status,400);
  assert.equal((await run({...base,dateOfBirth:'01/01/2015'})).status,403);
  assert.equal((await run({...base,termsAccepted:false})).status,400);
  assert.equal((await run({...base,captchaToken:''})).status,400);
  assert.equal((await run({...base,password:'short',confirmPassword:'short'})).status,400);
  const before=calls.length;
  available=false;
  assert.equal((await run(base)).status,409);
  assert.ok(!calls.slice(before).some(x=>x.target.includes('/auth/v1/signup')),'Unavailable username must not create an Auth user');
  available=true;
  const result=await run(base);
  assert.equal(result.status,200);
  assert.equal(result.body.ok,true);
  const signupCall=calls.find(x=>x.target.includes('/auth/v1/signup'));
  assert.ok(signupCall,'Supabase Auth signup not called');
  const forwarded=JSON.parse(signupCall.opts.body);
  assert.equal(forwarded.data.username,'James_Test');
  assert.equal(forwarded.data.book_claim_token,base.bookClaimToken);
  assert.equal(forwarded.gotrue_meta_security.captcha_token,base.captchaToken);
  assert.ok(calls.some(x=>x.target.includes('/rest/v1/account_private_identity')),'Private DOB must be saved');
  console.log('PASS: single registration path, canonical username, age gate, terms, CAPTCHA, Book Key, identity storage');
})().catch(e=>{console.error(e);process.exitCode=1});
