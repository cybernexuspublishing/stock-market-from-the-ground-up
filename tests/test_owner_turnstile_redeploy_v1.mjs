import assert from 'node:assert/strict';
import {onRequestGet,onRequestPost} from '../functions/api/owner-turnstile-redeploy-v1.js';
import {readFileSync} from 'node:fs';
const env={SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_testonly',
 SUPABASE_SECRET_KEY:'sb_secret_testonly',
 GU_OWNER_CLOUDFLARE_PAGES_TOKEN:'scoped_account_pages_test_token_not_real',
 TURNSTILE_SITE_KEY:'site-key-unit-test',
 TURNSTILE_SECRET_KEY:'turnstile-secret-unit-test',
 ENFORCE_AUTH_TURNSTILE_V135:'false'};
const deployment='99999999-9999-4999-8999-999999999999';
const newDeployment='88888888-8888-4888-8888-888888888888';
const jwt='test-owner-session-not-real';
const req=(method,body,origin='https://site.example')=>new Request('https://site.example/api/owner-turnstile-redeploy-v1',{
 method,headers:{authorization:'Bearer '+jwt,origin,'content-type':'application/json'},
 ...(body?{body:JSON.stringify(body)}:{})});
let patched=false,retried=false,audited=false,role='OWNER',stepup=true;
const originalFetch=globalThis.fetch;
globalThis.fetch=async (url,options={})=>{
 const u=new URL(url),path=u.pathname;
 if(path==='/auth/v1/user')return Response.json({id:'12345678-1234-4234-8234-123456789012'});
 if(path==='/rest/v1/rpc/gu_staff_role_v01432r1')return Response.json({ok:true,role});
 if(path==='/rest/v1/rpc/gu_staff_stepup_active_v01432r1')return Response.json(stepup);
 if(path==='/rest/v1/admin_audit_log'){audited=true;return Response.json([{id:123}]);}
 if(path==='/client/v4/accounts/4fe9e562905cf607b6f004d2374299fc/pages/projects/stock-market-from-the-ground-up'){
  assert.equal(options.headers.authorization,'Bearer '+env.GU_OWNER_CLOUDFLARE_PAGES_TOKEN);
  if(options.method==='PATCH'){
   const b=JSON.parse(options.body);
   assert.deepEqual(Object.keys(b.deployment_configs.production.env_vars),['ENFORCE_AUTH_TURNSTILE_V135']);
   assert.equal(b.deployment_configs.production.env_vars.ENFORCE_AUTH_TURNSTILE_V135.value,'true');
   patched=true;
  }
  return Response.json({success:true,result:{
   name:'stock-market-from-the-ground-up',production_branch:'main',
   deployment_configs:{production:{env_vars:{
    ENFORCE_AUTH_TURNSTILE_V135:{type:'plain_text',value:patched?'true':'false'},
    TURNSTILE_SITE_KEY:{type:'plain_text',value:'test'},TURNSTILE_SECRET_KEY:{type:'secret_text'}
   }}},
   latest_deployment:{id:deployment,deployment_trigger:{type:'github:push'}}
  }});
 }
 if(path.endsWith('/deployments/'+deployment+'/retry')){
  retried=true;return Response.json({success:true,result:{id:newDeployment}});
 }
 throw Error('Unexpected endpoint '+url);
};
try{
 assert.equal((await (await onRequestGet({env,request:req('GET')})).json()).configured,true);
 assert.equal((await (await onRequestGet({env:{...env,GU_OWNER_CLOUDFLARE_PAGES_TOKEN:undefined},request:req('GET')})).json()).configured,false);
 role='ADMIN';
 assert.equal((await onRequestPost({env,request:req('POST',{confirm:'ENABLE_AUTH_TURNSTILE_AND_REDEPLOY'})})).status,403);
 role='OWNER';
 stepup=false;
 assert.equal((await onRequestPost({env,request:req('POST',{confirm:'ENABLE_AUTH_TURNSTILE_AND_REDEPLOY'})})).status,403);
 stepup=true;
 assert.equal((await onRequestPost({env,request:req('POST',{confirm:'ENABLE_AUTH_TURNSTILE_AND_REDEPLOY'},'https://evil.example')})).status,403);
 assert.equal((await onRequestPost({env,request:req('POST',{confirm:'BAD'})})).status,400);
 assert.equal(patched,false);assert.equal(retried,false);
 assert.equal((await onRequestPost({env:{...env,GU_OWNER_CLOUDFLARE_PAGES_TOKEN:undefined},
   request:req('POST',{confirm:'ENABLE_AUTH_TURNSTILE_AND_REDEPLOY'})})).status,503);
 const result=await onRequestPost({env,request:req('POST',{confirm:'ENABLE_AUTH_TURNSTILE_AND_REDEPLOY'})});
 assert.equal(result.status,200);
 const body=await result.json();
 assert.equal(body.ok,true);assert.equal(body.enabled,true);assert.equal(body.redeployStarted,true);
 assert.equal(body.deploymentId,newDeployment);assert(patched&&retried&&audited);
 assert(!JSON.stringify(body).includes('test_token'),'Never return management credentials');
 const client=readFileSync(new URL('../assets/js/admin-human-verification-v01434.js',import.meta.url),'utf8');
 assert.match(client,/Enable Turnstile & Redeploy/);
 assert.match(client,/GroundUpAdminPasswordConfirm\?\.ensure/);
 assert.match(client,/ENABLE_AUTH_TURNSTILE_AND_REDEPLOY/);
 assert.doesNotThrow(()=>new Function(client));
 const css=readFileSync(new URL('../assets/css/admin-human-verification-v01434.css',import.meta.url),'utf8');
 assert(!css.includes('border-left:3px solid #ffcd52'),'No warning-yellow status banner');
 console.log('PASS Owner Turnstile: secure step-up, exact Cloudflare flag PATCH, redeploy, audit and compact status');
}finally{globalThis.fetch=originalFetch}
