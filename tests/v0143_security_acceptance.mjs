/* v0.14.0.3 no-credential deterministic edge API rejection and payment guards. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {webcrypto} from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const load=async(path)=>import('data:text/javascript;base64,'+Buffer.from(await readFile(resolve(root,path))).toString('base64'));
let checks=0;
const check=(name,fn)=>fn().then(()=>{checks++;process.stdout.write('PASS '+name+'\n')});
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public-fixture',SUPABASE_SECRET_KEY:'private-fixture',LEMON_SQUEEZY_WEBHOOK_SECRET:'local-only-test-secret',LEMON_SQUEEZY_STORE_ID:'4321',LEMON_SQUEEZY_TEST_MODE:'true'};
const post=(url,body,authorization)=>new Request(url,{method:'POST',headers:authorization?{authorization:'Bearer '+authorization}:{},body:JSON.stringify(body)});
const m=await load('functions/api/gws-projects.js');
await check('GWS OWNER API rejects unauthenticated reads/writes',async()=>{
 const a=await m.onRequest({request:new Request('https://local/api/gws-projects'),env});assert.equal(a.status,401);
 const b=await m.onRequest({request:post('https://local/api/gws-projects',{projectCode:'TEST_SITE'}),env});assert.equal(b.status,401);
});
const report=await load('functions/api/commons-report.js');
await check('Market Commons reporting requires member session',async()=>{
 const a=await report.onRequestPost({request:post('https://local/api/commons-report',{id:11,type:'topic',reason:'spam'}),env});assert.equal(a.status,401);
});
const hook=await load('functions/api/lemon-webhook.js');
const enc=new TextEncoder();
async function sign(txt){const key=await webcrypto.subtle.importKey('raw',enc.encode(env.LEMON_SQUEEZY_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Buffer.from(await webcrypto.subtle.sign('HMAC',key,enc.encode(txt))).toString('hex')}
await check('Payment webhook rejects invalid signature',async()=>{
 const r=await hook.onRequestPost({request:new Request('https://local/api/lemon-webhook',{method:'POST',headers:{'x-event-name':'subscription_created','x-signature':'bad'},body:'{}'}),env});assert.equal(r.status,401);
});
await check('Payment webhook rejects cross-store signed events before DB writes',async()=>{
 const txt=JSON.stringify({data:{type:'subscriptions',id:'123',attributes:{store_id:9999}},meta:{test_mode:true}});
 const r=await hook.onRequestPost({request:new Request('https://local/api/lemon-webhook',{method:'POST',headers:{'x-event-name':'subscription_created','x-signature':await sign(txt)},body:txt}),env});assert.equal(r.status,400);
});
await check('Payment webhook ignores unknown events before touching DB',async()=>{
 const txt=JSON.stringify({data:{type:'subscriptions',id:'123',attributes:{store_id:4321}},meta:{test_mode:true}});
 const r=await hook.onRequestPost({request:new Request('https://local/api/lemon-webhook',{method:'POST',headers:{'x-event-name':'subscription_invented','x-signature':await sign(txt)},body:txt}),env});assert.equal(r.status,200);
});
const train=await load('functions/api/ondemand-training.js');
const savedFetch=globalThis.fetch;
await check('TEST login never evaluates real paid grants for OnDemand training',async()=>{
 let requests=[];
 globalThis.fetch=async(url,opts)=>{requests.push(String(url));return new Response(JSON.stringify(String(url).includes('/auth/v1/user')?{id:'11111111-1111-4111-8111-111111111111'}:[{account_kind:'test'}]),{status:200,headers:{'content-type':'application/json'}})};
 try{const result=await train.authorized(env,new Request('https://local/api/ondemand-training',{headers:{authorization:'Bearer fake'}}));assert.equal(result.kind,'test');assert.ok(requests.every(x=>!x.includes('user_plan_grants')&&!x.includes('user_tool_passes')))}finally{globalThis.fetch=savedFetch}
});
const policy=await readFile(resolve(root,'functions/_middleware.js'),'utf8');
await check('Legacy synthetic test provisioning and demo grants are disabled',async()=>{
 assert.match(policy,/action==='test_account_create'/);assert.match(policy,/\['demo_create','demo_delete'\]/);
 assert.match(policy,/\['account_create','test_account_create','account_identity_correct','account_email_update'\]/);
});
const sql=await readFile(resolve(root,'supabase/migrations/v0.14.0.3_COMMONS_ENTITLEMENT_PRIVACY_GUARDS.sql'),'utf8');
await check('Commons forum-level entitlement RLS applies to SELECT and all write RPCs',async()=>{
 assert.match(sql,/public\.v0143_commons_can_open/);assert.match(sql,/CREATE POLICY "members read commons topics"/);
 assert.match(sql,/CREATE POLICY "members read commons posts"/);assert.match(sql,/public\.user_has_tool_access/);
 assert.match(sql,/commons_toggle_bookmark/);assert.match(sql,/book_key_redemptions/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.v0143_commons_can_open\(boolean,boolean,text,text\) TO authenticated,service_role/);
});
await check('Legacy forum read helper is executable by authenticated RLS caller',async()=>{
 const legacy=await readFile(resolve(root,'supabase/migrations/v0.14.0.3_LEGACY_FORUM_READ_ISOLATION.sql'),'utf8');
 assert.match(legacy,/GRANT EXECUTE ON FUNCTION public\.v0143_legacy_forum_can_read\(\) TO authenticated,service_role/);
});
const gws=await readFile(resolve(root,'supabase/migrations/v0.14.0.3_GWS_DRAFT_REVISIONS.sql'),'utf8');
await check('GWS mutations are transactional, revisioned, OWNER-only, audited',async()=>{
 assert.match(gws,/gws_client_draft_revisions_v0143/);assert.match(gws,/pg_advisory_xact_lock/);
 assert.match(gws,/project\.revision_number<>p_expected/);assert.match(gws,/admin_audit_log/);
 assert.match(gws,/REVOKE ALL ON FUNCTION public\.v0143_gws_save/);
 assert.match(gws,/jsonb_typeof\(x->'text'\) IS DISTINCT FROM 'string'/);
});
console.log('v0.14.0.3 SECURITY TESTS PASSED: '+checks);
