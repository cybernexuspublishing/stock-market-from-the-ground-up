import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest as moderation} from '../functions/api/admin-forum-actions.js';
import {onRequestPost as staging} from '../functions/api/stripe-customer-checkout-v01438.js';
const source=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
const modules=['functions/api/admin-forum-actions.js','functions/api/admin-v0133.js',
 'functions/api/checkout-v0135.js','functions/api/stripe-customer-checkout-v01438.js'];
for(const f of modules){
 const text=source(f);
 assert(text.includes('apikey:'),f+' must supply private project key');
 assert(text.includes('eyJ[A-Za-z0-9_-]+'),f+' must identify legacy service-role JWT only');
 assert(!text.includes("apikey:c.secret,authorization:'Bearer '+c.secret"),f+' must not send sb_secret as Bearer');
 assert(!text.includes('authorization:`Bearer ${secret}`'),f+' must not send opaque secret as Bearer');
}
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://mock.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const calls=[],original=globalThis.fetch;
let roles=[{role_code:'OWNER',expires_at:null}],kind='member',restricted=false;
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,init={})=>{
 const path=String(url);calls.push({path,init});
 if(path.endsWith('/auth/v1/user'))return json({id:uid});
 if(path.includes('/profiles?'))return json([{account_kind:kind}]);
 if(path.includes('/admin_user_flags?'))return json([{status:restricted?'restricted':'active'}]);
 if(path.includes('/admin_user_roles?'))return json(roles);
 if(path.includes('/commons_topics?'))return json([{
  id:9,status:'published',updated_at:'2026-10-19T16:00:00Z',title:'Published member topic',
  body:'Member-authored topic test only',is_locked:false,is_pinned:false,is_official:false}]);
 if(path.includes('/admin_role_permissions?'))return json([]);
 throw Error('Unexpected forum request '+path);
};
const get=async()=>{const resp=await moderation({request:new Request(
 'https://site.example/api/admin-forum-actions?scope=commons&type=topic&id=9',
 {headers:{authorization:'Bearer member.jwt'}}),env});return[resp.status,await resp.json()]};
try{
 let [status,result]=await get();assert.equal(status,200);assert.equal(result.content.id,9);
 assert.equal(result.content.body,'Member-authored topic test only');
 assert(source('functions/api/admin-forum-actions.js').includes('auditRecorded'));
 assert(source('functions/api/forum-member-content.js').includes('auditRecorded'));
 assert(source('functions/api/admin-forum-actions.js').includes('gu_v014113_moderate_with_audit'),'Moderator must only mutate via atomic audit RPC');
 assert(!source('functions/api/admin-forum-actions.js').includes('Moderation change was applied'),'Forum mutations cannot succeed after their audit failed');;
 assert(source('functions/api/forum-member-content.js').includes('gu_v014116_member_change_with_audit'), 'Member edits must use one transactional audit RPC');
 assert(!source('functions/api/forum-member-content.js').includes('Content change succeeded'), 'Member updates must not survive failed audit writes');

 const tables=calls.filter(x=>x.path.includes('/rest/v1/'));
 assert(tables.length>0);
 for(const {init} of tables){
  assert.equal(init.headers.apikey,'sb_secret_test');
  assert.equal(init.headers.authorization,undefined,'Supabase apikey must not be forged into JWT');
 }
 roles=[{role_code:'SHOWCASE_VIEWER',expires_at:null}];
 [status]=await get();assert.equal(status,403,'Showcase cannot moderate real forum data');
 roles=[{role_code:'OWNER',expires_at:null}];restricted=true;
 [status]=await get();assert.equal(status,403,'Restricted accounts cannot moderate');
 restricted=false;kind='showcase';
 [status]=await get();assert.equal(status,403,'Showcase profile excluded');
 const stagingStatus=await staging({request:new Request('https://site.example/api/stripe-customer-checkout-v01438',{method:'POST',body:'{}'}),env});
 assert.equal(stagingStatus.status,503,'Do not activate staging or paid rails without matching staging project and test keys');
 console.log('PASS v99: existing Owner/Market Commons backend works with opaque sb_secret, disallows Showcase/restricted moderation, legacy commerce key correctness and staging remains locked.');
}finally{globalThis.fetch=original}
