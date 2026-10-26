import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {onRequestPost,normalizeLoginUsername} from '../functions/api/username-login.js';
const url='https://oxihglyfgzywsupnyicb.supabase.co';
const env={SUPABASE_URL:url,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',
 SUPABASE_SECRET_KEY:'sb_secret_test',
 ENFORCE_AUTH_TURNSTILE_V135:'true',TURNSTILE_SITE_KEY:'test_site_key',TURNSTILE_SECRET_KEY:'test_private_secret'};
const input=(username='James-Test',captchaToken='fake-but-present')=>
 new Request('https://site.invalid/api/username-login',{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({username,password:'mock-password-used-only-in-test',captchaToken})});
const fakeProfile={id:'f42f9301-18e6-43a3-8531-32d371fd22c1',username:'James_Test'};
async function mock(run,remote){
 const saved=globalThis.fetch;
 let events=[];
 globalThis.fetch=async(path,options={})=>{
  events.push({path:String(path),options});
  return remote(new URL(path),options);
 };
 try{return await run(events)}finally{globalThis.fetch=saved}
}
const ok=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
test('James-Test maps to James_Test without creating or changing an account',()=>{
 assert.equal(normalizeLoginUsername('  James-Test  '),'james_test');
 assert.equal(normalizeLoginUsername('Adissel'),'adissel');
 assert.equal(normalizeLoginUsername(''), '');
});
test('username login accepts alias, exact-matches returned profile, and forwards CAPTCHA once',async()=>{
 await mock(async events=>{
  const r=await onRequestPost({request:input(),env});
  assert.equal(r.status,200);
  assert.deepEqual(await r.json(),{access_token:'mockaccess',refresh_token:'mockrefresh',expires_in:3600,token_type:'bearer'});
  assert.equal(events.length,3);
  assert.equal(new URL(events[0].path).searchParams.get('username'),'ilike.james_test');
  assert.equal(new URL(events[0].path).searchParams.get('select'),'id,username');
  for(const c of events.slice(0,2)){
   assert.equal(c.options.headers.apikey,env.SUPABASE_SECRET_KEY);
   assert.equal(c.options.headers.authorization,undefined,'Modern Supabase service key must not be sent as legacy JWT');
  }
  const request=JSON.parse(events[2].options.body);
  assert.equal(request.gotrue_meta_security.captcha_token,'fake-but-present');
  assert.equal(request.password,'mock-password-used-only-in-test');
 },async u=>u.pathname==='/rest/v1/profiles'?ok([{id:'strange-other-user',username:'JamesATest'},fakeProfile]):
  u.pathname==='/auth/v1/admin/users/'+fakeProfile.id?ok({email:'account@example.invalid'}):
  u.pathname==='/auth/v1/token'?ok({access_token:'mockaccess',refresh_token:'mockrefresh',expires_in:3600,token_type:'bearer'}):
  ok({},500));
});
test('ilike wildcard must never authenticate a different username',async()=>{
 await mock(async events=>{
  const r=await onRequestPost({request:input('James-Test'),env});
  assert.equal(r.status,401);
  assert.equal((await r.json()).error,'Invalid login credentials.');
  assert.equal(events.length,1,'Do not call auth admin for near-matches');
 },async u=>u.pathname==='/rest/v1/profiles'?ok([{id:'someone-else',username:'JamesATest'}]):ok({},500));
});
test('unverified Turnstile never requests a password grant',async()=>{
 let visited=0;
 await mock(async()=>{
  const r=await onRequestPost({request:input('Adissel',''),env});
  assert.equal(r.status,403);assert.match((await r.json()).error,/verification required/i);
  assert.equal(visited,0);
 },async()=>{visited++;return ok({},500)});
});
for(const [providerError,status,messagePart] of [
 [{error_code:'captcha_failed',msg:'captcha protection: request disallowed (invalid-input-secret)'},503,'not working'],
 [{error_code:'captcha_failed',msg:'captcha protection: request disallowed (no captcha_token found)'},403,'verification failed'],
 [{error_code:'invalid_credentials',msg:'Invalid login credentials'},401,'Invalid login credentials.']
]){
 test('provider failure does not disclose credential information: '+providerError.error_code+'/'+providerError.msg,async()=>{
  await mock(async()=>{
   const r=await onRequestPost({request:input('Adissel'),env});
   assert.equal(r.status,status);
   const body=await r.json();
   assert.match(body.error,new RegExp(messagePart,'i'));
   assert.equal(body.access_token,undefined);
  },async u=>u.pathname==='/rest/v1/profiles'?ok([{id:fakeProfile.id,username:'Adissel'}]):
   u.pathname==='/auth/v1/admin/users/'+fakeProfile.id?ok({email:'account@example.invalid'}):
   u.pathname==='/auth/v1/token'?ok(providerError,400):ok({},500));
 });
}
test('legacy service-role JWT compatibility retained for profiles and admin',async()=>{
 const legacy='eyJ0ZXN0.eyJ0ZXN0.mock';
 await mock(async events=>{
  const r=await onRequestPost({request:input('Adissel'),env:{...env,SUPABASE_SECRET_KEY:legacy}});
  assert.equal(r.status,401);
  assert.equal(events.length,3);
  for(const c of events.slice(0,2)){
   assert.equal(c.options.headers.apikey,legacy);
   assert.equal(c.options.headers.authorization,'Bearer '+legacy);
  }
 },async u=>u.pathname==='/rest/v1/profiles'?ok([{id:fakeProfile.id,username:'Adissel'}]):
  u.pathname==='/auth/v1/admin/users/'+fakeProfile.id?ok({email:'account@example.invalid'}):
  u.pathname==='/auth/v1/token'?ok({error_code:'invalid_credentials'},400):ok({},500));
});

test('production login routes only hashed Yahoo deployment hosts to allowed Turnstile hostname',()=>{
 const callbacks={};const redirects=[];
 const ctx={
  document:{addEventListener(name,cb){callbacks[name]=cb}},
  location:{hostname:'3f4adff0.stock-market-from-the-ground-up-d1r.pages.dev',
   pathname:'/signin',search:'?next=%2Flab-player.html',hash:'',
   replace(dest){redirects.push(dest)}},
  window:{}
 };
 vm.createContext(ctx);
 vm.runInContext(fs.readFileSync('assets/js/signin.js','utf8'),ctx,{filename:'signin.js'});
 assert.equal(ctx.canonicalYahooSignin(),true);
 assert.deepEqual(redirects,['https://stock-market-from-the-ground-up-d1r.pages.dev/signin?next=%2Flab-player.html']);
 ctx.location.hostname='stock-market-from-the-ground-up-d1r.pages.dev';
 assert.equal(ctx.canonicalYahooSignin(),false,'canonical Yahoo production must not redirect itself');
 ctx.location.hostname='stock-market-from-the-ground-up.pages.dev';
 assert.equal(ctx.canonicalYahooSignin(),false,'legacy hostname is not silently rewritten by production logic');
 assert.equal(redirects.length,1);
});
test('real provider CAPTCHA errors are not misreported as incorrect passwords',()=>{
 const ctx={document:{addEventListener(){}},location:{hostname:'stock-market-from-the-ground-up-d1r.pages.dev'},window:{}};
 vm.createContext(ctx);
 vm.runInContext(fs.readFileSync('assets/js/signin.js','utf8'),ctx,{filename:'signin.js'});
 const secret=ctx.signinAuthError({code:'captcha_failed',message:'400: captcha protection: request disallowed (invalid-input-secret)'});
 assert.match(secret,/verification is not correctly configured/i);
 assert.match(secret,/password has not been checked/i);
 const absent=ctx.signinAuthError({code:'captcha_failed',message:'no captcha_token found'});
 assert.match(absent,/Start human verification/i);
 assert.match(absent,/password may not have been checked/i);
 assert.equal(ctx.signinAuthError({code:'invalid_credentials',message:'Invalid login credentials.'}),'Invalid login credentials.');
});
