/** v0.14.0.5 — locally mocked security regression (NO real Supabase credentials/data). */
import {strict as assert} from 'node:assert';
import {readFile} from 'node:fs/promises';
const load=async path => import('data:text/javascript;base64,'+Buffer.from(await readFile(path,'utf8')).toString('base64'));
const plan=await load('functions/api/plan-controls.js');
const gws=await load('functions/api/gws-projects.js');
const env={SUPABASE_URL:'https://fixture.invalid',SUPABASE_PUBLISHABLE_KEY:'fixture-public',SUPABASE_SECRET_KEY:'fixture-secret'};
let status='active',kind='member',role='OWNER',writes=0,reads=[];
const respond=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async (url,opts={})=>{
 const p=String(url);reads.push(p);
 if(p.includes('/auth/v1/user'))return respond({id:'10000000-0000-4000-8000-000000000005'});
 if(p.includes('/profiles?'))return respond([{account_kind:kind}]);
 if(p.includes('/admin_user_roles?'))return respond([{role_code:role,expires_at:null}]);
 if(p.includes('/admin_user_flags?'))return respond([{status}]);
 if(p.includes('/platform_plans?'))return respond([{plan_code:'FULL_MONTHLY',name:'Monthly',active:true,public_visible:true,checkout_enabled:false,price_cents:6999}]);
 if(p.includes('/gws_client_drafts_v014?'))return respond([]);
 if(p.includes('/rpc/')){writes++;return respond({ok:true});}
 throw new Error('Unexpected fixture DB action: '+p);
};
const request=(path,method='GET',body)=>new Request('https://site.invalid/api/'+path,{method,headers:{authorization:'Bearer fixture-token',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const ops=[
 ['membership read',r=>plan.onRequest({request:r,env}),()=>request('plan-controls')],
 ['membership write',r=>plan.onRequest({request:r,env}),()=>request('plan-controls','POST',{planCode:'FULL_MONTHLY',checkoutEnabled:false})],
 ['GWS drafts read',r=>gws.onRequest({request:r,env}),()=>request('gws-projects')],
 ['GWS drafts write',r=>gws.onRequest({request:r,env}),()=>request('gws-projects','POST',{projectCode:'TEST_PROJ',expectedRevision:0,label:'Example site',pageTitle:'Sample page',pageSummary:'',pageBlocks:[]})]
];
let assertions=0;
for(const st of ['suspended','restricted']){
 status=st;kind='member';role='OWNER';
 for(const [label,call,req] of ops){const before=writes;const response=await call(req());assert.equal(response.status,403,`${st}: ${label}`);assert.equal(writes,before,`${st}: ${label} no RPC writes`);assert.equal((await response.json()).ok,false);assertions++;}
}
status='active';kind='test';role='OWNER';
for(const [label,call,req] of ops){assert.equal((await call(req())).status,403,`TEST: ${label}`);assertions++}
kind='showcase';
for(const [label,call,req] of ops){assert.equal((await call(req())).status,403,`SHOWCASE: ${label}`);assertions++}
kind='member';role='MODERATOR';
for(const [label,call,req] of ops){assert.equal((await call(req())).status,403,`non-OWNER: ${label}`);assertions++}
role='OWNER';
const r1=await plan.onRequest({request:request('plan-controls'),env});assert.equal(r1.status,200,'active OWNER sees plan list');assert.equal((await r1.json()).plans.length,1);assertions++;
const r2=await gws.onRequest({request:request('gws-projects'),env});assert.equal(r2.status,200,'active OWNER sees drafts');assert.equal((await r2.json()).publishingEnabled,false);assertions++;
const r3=await plan.onRequest({request:request('plan-controls','POST',{planCode:'FULL_MONTHLY',checkoutEnabled:true}),env});assert.equal(r3.status,403,'paid checkout still blocked');assertions++;
assert(reads.some(x=>x.includes('/admin_user_flags?')),'status flags queried server-side');
console.log(`PASS v0.14.0.5 Owner plan/GWS status guard: ${assertions} authorization assertions; no unauthorized writes`);
