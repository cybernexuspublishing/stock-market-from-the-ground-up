import assert from 'node:assert/strict';
import {onRequest,attachTutorExchange,ownedConversation} from '../functions/api/member-tutor-conversations.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const id='cccccccc-cccc-4ccc-8ccc-cccccccccccc',exchange='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const original=globalThis.fetch;let allowed=true,reads=0,links=0,foreignRequests=0;
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,opt={})=>{
 const u=String(url);
 if(u.endsWith('/auth/v1/user'))return json({id:uid});
 if(u.includes('/profiles?'))return json([{account_kind:'member'}]);
 if(u.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(u.includes('/admin_user_roles?'))return json([]);
 if(u.includes('/rpc/user_has_tool_access'))return json(allowed);
 if(u.includes('gu_member_tutor_conversations_v014149?')){
  reads++;assert(u.includes('user_id=eq.'+uid)||u.includes('user_id=eq.'+other));
  if(u.includes('user_id=eq.'+other)) {foreignRequests++;return json([])}
  if(opt.method==='PATCH')return json([{id,title:'Renamed'}]);
  if(opt.method==='DELETE')return json([{id}]);
  return json([{id,title:'Risk practice',created_at:'2026-10-22T00:00:00Z',updated_at:'2026-10-22T00:00:00Z'}]);
 }
 if(u.includes('rpc/gu_v014149_create_tutor_conversation')){
  const b=JSON.parse(opt.body);assert.equal(b.p_user,uid);return json(id);
 }
 if(u.includes('gu_member_tutor_exchanges_v014102?')){
  links++;assert(u.includes('user_id=eq.'+uid));return json([{id:exchange,conversation_id:id}]);
 }
 throw Error('Unexpected '+u);
};
const request=(method,url='https://school.test/api/member-tutor-conversations',headers={},body)=>new Request(url,{
 method,headers:{authorization:'Bearer test-token',...(body?{'content-type':'application/json'}:{}),...headers},
 ...(body?{body:JSON.stringify(body)}:{})});
try{
 assert.equal((await onRequest({env,request:request('GET')})).status,200);
 let r=await onRequest({env,request:request('POST',undefined,{}, {title:'Risk practice'})});
 assert.equal(r.status,201);assert.equal((await r.json()).id,id);
 r=await onRequest({env,request:request('PATCH','https://school.test/api/member-tutor-conversations?id='+id,{}, {title:'Renamed'})});
 assert.equal(r.status,200);
 r=await onRequest({env,request:request('DELETE','https://school.test/api/member-tutor-conversations?id='+id,{'x-confirm-delete':'DELETE_TUTOR_CONVERSATION'})});
 assert.equal(r.status,200);
 r=await onRequest({env,request:request('DELETE','https://school.test/api/member-tutor-conversations?id='+id)});
 assert.equal(r.status,400);
 r=await onRequest({env,request:request('POST',undefined,{origin:'https://evil.test'}, {title:'Attack'})});
 assert.equal(r.status,403);
 r=await onRequest({env,request:request('POST',undefined,{}, {title:' '})});
 assert.equal(r.status,400);
 assert.equal(await ownedConversation(env,other,id),false);
 assert.equal(await attachTutorExchange(env,uid,exchange,id),true);
 assert.equal(await attachTutorExchange(env,other,exchange,id),false);
 assert.equal(links,1);assert.equal(foreignRequests,2);
 allowed=false;r=await onRequest({env,request:request('GET')});
 assert.equal(r.status,403);
 assert.ok(reads>=4);
 console.log('PASS D09 scoped private conversations, CRUD, CSRF, entitlement and exchange owner isolation');
}finally{globalThis.fetch=original}
