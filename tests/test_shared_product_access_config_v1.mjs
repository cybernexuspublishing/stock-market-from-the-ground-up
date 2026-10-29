import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/product-access-config.js';
import {readProductAccessConfig,publicProductAccess} from '../functions/_lib/product-access-config-v1.js';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const old=globalThis.fetch;
let role='OWNER',configured='legacy',version=1,updates=0;
const data=()=>({product_code:'WATCHLIST_WORKBENCH',label:'Watchlist & Trade-Plan Workbench',
 free_access:true,trial_access:false,paid_access:true,included_memberships:['FULL_MONTHLY'],
 purchase_durations:[1,7,14,30,180],access_expiration_policy:'fixed_term',
 policy_mode:configured,version});
const respond=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,init={})=>{
 const u=String(url),method=init.method||'GET';
 if(u.endsWith('/auth/v1/user'))return respond({id:uid});
 if(u.includes('/profiles?'))return respond([{account_kind:'member',deleted_at:null}]);
 if(u.includes('/admin_user_roles?'))return respond([{role_code:role,expires_at:null}]);
 if(u.includes('/admin_user_flags?'))return respond([]);
 if(u.includes('/gu_product_access_config_v1?')){
  assert.equal(init.headers.apikey,env.SUPABASE_SECRET_KEY);
  assert.equal(init.headers.authorization,undefined,'Never send opaque secret as bearer');
  if(method==='GET')return respond([data()]);
  if(method==='PATCH'){
   if(!u.includes('version=eq.'+version))return respond([]);
   const input=JSON.parse(init.body);
   assert.equal(input.updated_by,uid);
   assert.equal(input.version,version+1);
   assert.equal(input.paid_access,true);
   updates++;version++;configured=input.policy_mode;
   return respond([{...data(),...input}]);
  }
 }
 throw Error('Unexpected endpoint '+u);
};
const request=(method='GET',body,headers={})=>new Request('https://site.example/api/product-access-config',{
 method,headers:{authorization:'Bearer valid',...(body?{'content-type':'application/json'}:{}),...headers},
 body:body?JSON.stringify(body):undefined
});
const policy=(extra={})=>({...data(),...extra});
try{
 let response=await onRequest({env,request:request()});
 assert.equal(response.status,200);assert.equal((await response.json()).policies[0].policy_mode,'legacy');
 role='MEMBER';
 response=await onRequest({env,request:request()});
 assert.equal(response.status,403,'Members must not read Owner editor');
 role='OWNER';
 response=await onRequest({env,request:request('POST',policy({policy_mode:'configured'}),{origin:'https://bad.example'})});
 assert.equal(response.status,403,'Cross-origin policy writes must be rejected');
 response=await onRequest({env,request:request('POST',policy({purchase_durations:[3]}))});
 assert.equal(response.status,400,'Unapproved durations rejected');
 response=await onRequest({env,request:request('POST',policy({policy_mode:'configured'}))});
 assert.equal(response.status,200);assert.equal(updates,1);
 response=await onRequest({env,request:request('POST',policy({version:1}))});
 assert.equal(response.status,409,'Stale revision rejected');
 let read=await readProductAccessConfig({base:env.SUPABASE_URL,secret:env.SUPABASE_SECRET_KEY},'WATCHLIST_WORKBENCH');
 assert.equal(read.policy_mode,'configured');
 assert.equal(publicProductAccess(read).trial_access,false);
 const migration=readFileSync(new URL('../supabase/migrations/20261029_shared_product_access_config_v1.sql',import.meta.url),'utf8');
 assert.match(migration,/ENABLE ROW LEVEL SECURITY/i);
 assert.match(migration,/REVOKE ALL ON public.gu_product_access_config_v1 FROM PUBLIC, anon, authenticated/i);
 assert.match(migration,/AFTER UPDATE ON public.gu_product_access_config_v1/i);
 const oldAdvanced=readFileSync(new URL('../functions/_lib/advanced-tool-access-v014110.js',import.meta.url),'utf8');
 assert.match(oldAdvanced,/entitled===true/);
 assert.match(oldAdvanced,/config\.free_access===true/);
 console.log('PASS Owner-only product policies, optimistic revisions, safe duration validation, audit + legacy entitlement compatibility');
}finally{globalThis.fetch=old}
