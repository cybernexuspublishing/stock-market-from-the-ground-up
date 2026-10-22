import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/member-tutor-data-delete.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_pub_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
let executed=0,authorized=true;const old=globalThis.fetch;
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,options={})=>{
 const path=String(url);
 if(path.endsWith('/auth/v1/user'))return authorized?json({id:uid}):json({error:'expired'},401);
 if(path.includes('/rpc/gu_v014149_delete_tutor_member_data')){
  executed++;assert.equal(options.method,'POST');
  assert.equal(JSON.parse(options.body).p_user,uid);
  assert.equal(options.headers.apikey,'sb_secret_test');
  return json({exchanges_deleted:5,conversations_deleted:2});
 }
 throw Error('Unexpected API '+path);
};
function request(headers={}){return new Request('https://site.test/api/member-tutor-data-delete',{
 method:'DELETE',headers:{authorization:'Bearer member','x-confirm-delete':'DELETE_MY_TUTOR_HISTORY',...headers}})}
try{
 let r=await onRequest({env,request:request()});
 assert.equal(r.status,200);let d=await r.json();assert.equal(d.deletedCount,5);
 assert.equal(d.deletedConversationCount,2);assert.equal(executed,1);
 r=await onRequest({env,request:request({origin:'https://evil.test'})});
 assert.equal(r.status,403);assert.equal(executed,1);
 r=await onRequest({env,request:request({'x-confirm-delete':'NO'})});
 assert.equal(r.status,400);assert.equal(executed,1);
 authorized=false;r=await onRequest({env,request:request()});
 assert.equal(r.status,401);assert.equal(executed,1);
 console.log('PASS D09 authenticated atomic post-entitlement privacy deletion with explicit confirmation and cross-site denial');
}finally{globalThis.fetch=old}
