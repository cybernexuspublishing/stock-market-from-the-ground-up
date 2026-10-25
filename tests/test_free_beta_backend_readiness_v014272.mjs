import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/api/free-beta-readiness-v014272.js';
const env={SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_ci',
 SUPABASE_SECRET_KEY:'sb_secret_ci_fake_01234567890',
 ENFORCE_AUTH_TURNSTILE_V135:'true',
 TURNSTILE_SITE_KEY:'sitekey_ci',TURNSTILE_SECRET_KEY:'private_fake_not_real'};
async function call(e){const r=await onRequestGet({env:e});assert.equal(r.status,200);
 assert.equal(r.headers.get('cache-control'),'no-store');return r.json()}
test('the new Cloudflare account without a server secret never advertises signup as ready',async()=>{
 const saved=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No request expected')};
 try{const d=await call({...env,SUPABASE_SECRET_KEY:''});assert.equal(d.signupAvailable,false);assert.equal(calls,0)}
 finally{globalThis.fetch=saved}
});
test('real registration controls and modern key must all pass before signup is advertised',async()=>{
 const previous=globalThis.fetch,seen=[];
 globalThis.fetch=async(input,options={})=>{const u=new URL(input);seen.push(u.pathname);
   assert.equal(options.headers.apikey,env.SUPABASE_SECRET_KEY);
   assert.equal(options.headers.authorization,undefined);
   if(u.pathname.endsWith('site_feature_controls'))return new Response('[{"enabled":true}]',{status:200});
   if(u.pathname.endsWith('site_settings'))return new Response('[{"value":true}]',{status:200});
   throw Error('Unrecognized readiness path '+u.pathname);
 };
 try{const d=await call(env);assert.equal(d.signupAvailable,true);assert.deepEqual(seen.sort(),[
 '/rest/v1/site_feature_controls','/rest/v1/site_settings']);}
 finally{globalThis.fetch=previous}
});
test('closed registration and invalid service response fail closed',async()=>{
 const saved=globalThis.fetch;
 globalThis.fetch=async input=>new Response(String(input).includes('site_feature_controls')?'[{"enabled":false}]':'[{"value":true}]',{status:200});
 try{assert.equal((await call(env)).signupAvailable,false)}finally{globalThis.fetch=saved}
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response('Bad upstream',{status:503});
 try{assert.equal((await call(env)).signupAvailable,false)}finally{globalThis.fetch=original}
});
test('Turnstile verification absence prevents a false public readiness signal',async()=>{
 const x=await call({...env,TURNSTILE_SECRET_KEY:''});assert.equal(x.signupAvailable,false)
});
