/* node tests/test_v014020_backend_api.mjs — mock integration contract tests. */
import assert from 'node:assert/strict';
import {onRequest as inventory} from '../functions/api/backend-contract-v01420.js';
import {onRequest as notificationsPreference} from '../functions/api/community-notification-preferences.js';
const env={SUPABASE_URL:'https://unit-test.supabase.local',SUPABASE_PUBLISHABLE_KEY:'PUB_MOCK',SUPABASE_SECRET_KEY:'SENSITIVE_MOCK'};
const uid='51d6d1a4-2493-4db5-96bd-ed34deaf0cd3';
const context=(url,{method='GET',token=null,body}={})=>({
 request:new Request(url,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),env
});
const json=async response=>({status:response.status,body:await response.json(),headers:response.headers});
let count=0;
globalThis.fetch=async(url,opts)=>{
 count++;
 assert(!String(url).includes('SENSITIVE_MOCK'),'Secrets must not appear in request path');
 const path=String(url);
 const give=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}});
 if(path.endsWith('/auth/v1/user'))return give({id:uid});
 if(path.includes('/profiles?'))return give([{account_kind:'member'}]);
 if(path.includes('/admin_user_flags?'))return give([]);
 if(path.includes('/admin_user_roles?'))return give([{role_code:globalThis.role||'OWNER',expires_at:null},...(globalThis.showcase?[{role_code:'SHOWCASE_VIEWER',expires_at:null}]:[])]);
 if(path.includes('/rpc/gu_commons_notice_pref_get_v01420'))return give({subscribed_replies_enabled:true,updated_at:null});
 if(path.includes('/rpc/gu_commons_notice_pref_save_v01420')){
   assert.equal(opts?.headers?.apikey,'PUB_MOCK','User RPC must not use service role key');
   assert.equal(opts?.headers?.authorization,'Bearer MEMBER_TOKEN');
   assert.deepEqual(JSON.parse(opts.body),{p_subscribed_replies_enabled:false});
   return give({subscribed_replies_enabled:false,updated_at:'2026-10-15T00:00:00Z'});
 }
 if(path.includes('/rest/v1/'))return give([]);
 throw new Error('Unexpected fetch '+path);
};
let r=await json(await inventory(context('https://site.test/api/backend-contract-v01420')));
assert.equal(r.status,401,'Inventory must reject unsigned requests');
assert.equal(count,0,'Anonymous inventory must not query DB');
globalThis.role='ADMIN';r=await json(await inventory(context('https://site.test/api/backend-contract-v01420',{token:'MEMBER_TOKEN'})));
assert.equal(r.status,403,'Staff may not enumerate backend inventory without OWNER');
globalThis.role='OWNER';globalThis.showcase=true;r=await json(await inventory(context('https://site.test/api/backend-contract-v01420',{token:'MEMBER_TOKEN'})));
assert.equal(r.status,403,'Showcase viewers with Owner role remain blocked');
globalThis.showcase=false;r=await json(await inventory(context('https://site.test/api/backend-contract-v01420',{token:'MEMBER_TOKEN'})));
assert.equal(r.status,200);assert.equal(r.body.checks.length,14);assert(r.body.checks.every(c=>c.reachable===true));
assert(!JSON.stringify(r.body).includes('SENSITIVE_MOCK'));
env.REQUIRE_STAFF_AAL2_V135='true';
r=await json(await inventory(context('https://site.test/api/backend-contract-v01420',{token:'MEMBER_TOKEN'})));
assert.equal(r.status,403,'With AAL2 rollout enabled an unverified assurance token cannot view Owner inventory');
delete env.REQUIRE_STAFF_AAL2_V135;
assert.equal(r.headers.get('cache-control')?.includes('no-store'),true);
r=await json(await inventory(context('https://site.test/api/backend-contract-v01420',{method:'POST',token:'MEMBER_TOKEN'})));
assert.equal(r.status,405);
r=await json(await notificationsPreference(context('https://site.test/api/community-notification-preferences')));
assert.equal(r.status,401);
r=await json(await notificationsPreference(context('https://site.test/api/community-notification-preferences',{token:'MEMBER_TOKEN'})));
assert.equal(r.status,200);assert.equal(r.body.preferences.subscribedRepliesEnabled,true);
r=await json(await notificationsPreference(context('https://site.test/api/community-notification-preferences',{method:'POST',token:'MEMBER_TOKEN',body:{subscribedRepliesEnabled:'false'}})));
assert.equal(r.status,400,'Boolean parameter must not be coerced');
r=await json(await notificationsPreference(context('https://site.test/api/community-notification-preferences',{method:'POST',token:'MEMBER_TOKEN',body:{subscribedRepliesEnabled:false}})));
assert.equal(r.status,200);assert.equal(r.body.preferences.subscribedRepliesEnabled,false);
console.log('v0.14.0.20: owner authorization, read-only inventory, private RPC, negative cases PASS');
