/* D17 Support API regression — Node 22, fully mocked Supabase, no provider calls. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/support.js';
const UID='11111111-1111-4111-8111-111111111111';
const base='https://example.supabase.co';
const env={SUPABASE_URL:base,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock',SUPABASE_SECRET_KEY:'sb_secret_mock'};
const originalFetch=globalThis.fetch;
const calls=[];
let status='closed',belongs=true,canUpdate=true;
function reply(data,statusCode=200){
 return new Response(JSON.stringify(data),{status:statusCode,headers:{'content-type':'application/json'}});
}
globalThis.fetch=async (input,options={})=>{
 const address=String(input);calls.push({address,options});
 if(address===base+'/auth/v1/user'){
  assert.equal(options.headers.apikey,env.SUPABASE_PUBLISHABLE_KEY);
  return reply({id:UID,email:'member@example.test'});
 }
 assert(address.startsWith(base+'/rest/v1/'),'Unexpected service request');
 assert.equal(options.headers.apikey,env.SUPABASE_SECRET_KEY);
 assert.equal(options.headers.authorization,undefined,'Opaque sb_secret must never become JWT Bearer');
 const path=address.slice((base+'/rest/v1/').length);
 if(path.startsWith('support_tickets?select=id,status')){
  assert(path.includes('requester_user_id=eq.'+UID),'Support record lookup must be member scoped');
  return reply(belongs?[{id:41,status}]:[]);
 }
 if(path.startsWith('support_tickets?select=id,ticket_number,')){
  assert(!path.includes('select=*'),'Member details must be column-minimized');
  assert(path.includes('requester_user_id=eq.'+UID));
  return reply(belongs?[{id:41,status}]:[]);
 }
 if(path.startsWith('support_tickets?')&&options.method==='PATCH'){
  assert(path.includes('requester_user_id=eq.'+UID),'Support mutations must scope member ID');
  return reply(canUpdate?[{id:41}]:[]);
 }
 if(path.startsWith('support_ticket_messages?'))return reply([]);
 throw Error('Unexpected mock call '+path);
};
function req(action,method='POST',body={id:41},headers={}){
 return new Request('https://app.example/api/support?action='+action,{
  method,headers:{authorization:'Bearer mock-member','content-type':'application/json',...headers},
  ...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})
 });
}
try{
 let result=await onRequest({request:req('reopen','POST',{id:41}),env});
 assert.equal(result.status,200,'Owned closed ticket may reopen');
 assert(calls.some(x=>x.options.method==='PATCH'),'Confirmed ownership then patched ticket');
 calls.length=0;belongs=false;
 result=await onRequest({request:req('reopen','POST',{id:41}),env});
 assert.equal(result.status,404,'Other member tickets cannot be reopened');
 assert(!calls.some(x=>x.options.method==='PATCH'),'Never patch a foreign ticket');
 belongs=true;status='open';calls.length=0;
 result=await onRequest({request:req('reopen','POST',{id:41}),env});
 assert.equal(result.status,409,'Open ticket must not reset its lifecycle');
 assert(!calls.some(x=>x.options.method==='PATCH'));
 status='closed';calls.length=0;canUpdate=false;
 result=await onRequest({request:req('reopen','POST',{id:41}),env});
 assert.equal(result.status,409,'Reopen rejects an intervening ticket state transition');
 assert(calls.some(x=>x.address.includes('status=in.(closed,resolved)')),'Database PATCH must include eligible states');
 canUpdate=true;calls.length=0;
 result=await onRequest({request:req('reopen','POST',{id:'41 OR 1=1'}),env});
 assert.equal(result.status,400,'SQL/PostgREST filter injection not permitted');
 assert(!calls.some(x=>x.options.method==='PATCH'));
 result=await onRequest({request:req('reopen','POST',{id:null}),env});
 assert.equal(result.status,400);
 result=await onRequest({request:req('create','POST',JSON.stringify({category:'technical',subject:'hello',description:'x'.repeat(17000)}),{'content-length':'3'}),env});
 assert.equal(result.status,413,'Actual oversize body rejected even with forged small length');
 result=await onRequest({request:req('reply','POST',{id:41,body:'ok'},{'content-length':'17000'}),env});
 assert.equal(result.status,413,'Claimed oversize rejected before parsing');
 result=await onRequest({request:req('create','POST','{malformed'),env});
 assert.equal(result.status,400,'Invalid JSON rejected as bad request');
 result=await onRequest({request:req('detail','GET'),env});
 assert.equal(result.status,400);
 result=await onRequest({request:req('detail','GET',null,{}),env});
 assert.equal(result.status,400);
 result=await onRequest({request:req('detail','GET',null,{}),env});
 assert.equal(result.status,400);
 const source=readFileSync('functions/api/support.js','utf8');
 assert(!source.includes("authorization:`Bearer ${secret}`"));
 assert(!source.includes('request.json()'));
 assert(source.includes("Only closed or resolved tickets can be reopened"));
 console.log('PASS D17 Support modern Supabase key, member-scoped ownership, bounded JSON and error handling');
}finally{globalThis.fetch=originalFetch}
