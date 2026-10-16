import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/admin-password-confirm-v01432r1.js';
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'testpub',SUPABASE_SECRET_KEY:'testsecret',ENFORCE_AUTH_TURNSTILE_V135:'true'};
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',sid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const jwt=`${btoa('{}')}.${btoa(JSON.stringify({sub:uid,session_id:sid}))}.test`;
function req(pass='correct-password',challenge='turnstile-valid-123456',origin='https://site.example',bearer='Bearer '+jwt){return new Request('https://site.example/api/admin-password-confirm-v01432r1',{method:'POST',headers:{origin,authorization:bearer,'content-type':'application/json'},body:JSON.stringify({password:pass,captchaToken:challenge})});}
const previous=globalThis.fetch;
try{
 globalThis.fetch=async()=>{throw Error('Unexpected provider call')};
 assert.equal((await onRequestPost({request:req('correct-password','turnstile-valid-123456','https://evil.example'),env})).status,403);
 assert.equal((await onRequestPost({request:req('correct-password','turnstile-valid-123456','https://site.example',''),env})).status,401);
 assert.equal((await onRequestPost({request:req('', ''),env})).status,400);
 let calls=[];
 globalThis.fetch=async(u,o)=>{calls.push([u,o]);if(u.endsWith('/auth/v1/user'))return Response.json({id:uid,email:'owner@example.com'});
 if(u.endsWith('/rpc/gu_staff_role_v01432r1'))return Response.json({ok:true,role:'OWNER'});
 if(u.endsWith('/rpc/gu_staff_stepup_rate_status_v01432r1'))return Response.json({blocked:false});
 if(u.includes('token?grant_type=password'))return Response.json({user:{id:uid},access_token:'verified-new-session-token'});
 if(u.includes('/auth/v1/logout?scope=local'))return new Response(null,{status:204});
 if(u.endsWith('/rpc/gu_staff_stepup_attempt_v01432r1'))return Response.json({ok:true,expiresInSeconds:300});
 throw Error('Unexpected provider path '+u)};
 const allowed=await onRequestPost({request:req(),env});assert.equal(allowed.status,200);const data=await allowed.json();assert.equal(data.expiresInSeconds,300);
 const authReq=calls.find(x=>x[0].includes('grant_type=password'));const body=JSON.parse(authReq[1].body);assert.equal(body.email,'owner@example.com');assert.equal(body.password,'correct-password');assert.equal(body.gotrue_meta_security.captcha_token,'turnstile-valid-123456');
 const register=calls.find(x=>x[0].includes('stepup_attempt'));assert.equal(JSON.parse(register[1].body).p_session,sid);assert.equal(JSON.parse(register[1].body).p_password_ok,true);
 assert(calls.some(x=>x[0].includes('/auth/v1/logout?scope=local')));
 assert(!JSON.stringify(await allowed.json().catch(()=>({}))).includes('correct-password'));
 calls=[];globalThis.fetch=async(u,o)=>{calls.push(u);if(u.endsWith('/auth/v1/user'))return Response.json({id:uid,email:'owner@example.com'});if(u.endsWith('/rpc/gu_staff_role_v01432r1'))return Response.json({ok:true,role:'ADMIN'});if(u.endsWith('/rpc/gu_staff_stepup_rate_status_v01432r1'))return Response.json({blocked:false});if(u.includes('grant_type=password'))return Response.json({msg:'invalid'}, {status:400});if(u.endsWith('/rpc/gu_staff_stepup_attempt_v01432r1'))return Response.json({ok:false,blocked:false});throw Error('not expected')};
 assert.equal((await onRequestPost({request:req('wrong-password'),env})).status,403);
 assert(calls.some(x=>x.includes('stepup_attempt')));
 calls=[];globalThis.fetch=async(u)=>{calls.push(u);if(u.endsWith('/auth/v1/user'))return Response.json({id:uid,email:'owner@example.com'});if(u.endsWith('/rpc/gu_staff_role_v01432r1'))return Response.json({ok:false}, {status:403});throw Error('Must not verify password for ordinary user')};
 assert.equal((await onRequestPost({request:req(),env})).status,403);assert(!calls.some(x=>x.includes('grant_type=password')));
 console.log('PASS: same-origin, bearer binding, staff-only, Supabase CAPTCHA consumption, session-bound server stepup, wrong password denial');
}finally{globalThis.fetch=previous}
