/* D17 Support member isolation and request-limit regression. Mocked only. */
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/support.js';
const uid='123e4567-e89b-12d3-a456-426614174000';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',
 SUPABASE_SECRET_KEY:'sb_secret_fixture'};
const original=globalThis.fetch;
let seen=[],ticketState='closed',owned=true,canUpdate=true;
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,opt={})=>{
 const path=String(url);seen.push({path,headers:opt.headers||{},method:opt.method||'GET'});
 if(path.endsWith('/auth/v1/user'))return json({id:uid});
 assert(path.includes('/rest/v1/'),'Only mocked Supabase REST may be accessed');
 assert.equal(opt.headers.apikey,env.SUPABASE_SECRET_KEY);
 assert.equal(Object.hasOwn(opt.headers,'authorization'),false,'Modern service keys are opaque');
 if(path.includes('/profiles?select=account_kind')){
  assert(path.includes('id=eq.'+uid),'Real profile bound to authenticated member');
  return json([{account_kind:'member'}]);
 }
 if(path.includes('support_tickets?select=')) {
  assert(path.includes('requester_user_id=eq.'+uid),'Member read must enforce ownership');
  return json(owned?[{id:11,status:ticketState}]:[]);
 }
 if(path.includes('support_tickets?id=eq.')) {
  assert(path.includes('requester_user_id=eq.'+uid),'Write must remain member scoped');
  return json(canUpdate?[{id:11}]:[]);
 }
 if(path.includes('support_ticket_messages'))return json([]);
 throw Error('Unexpected provider call '+path);
};
const request=(action,options={})=>new Request('https://course.example/api/support?action='+action,options);
const auth={authorization:'Bearer fixture-member-token'};
try{
 let response=await onRequest({env,request:request('reopen',{method:'POST',headers:{...auth,'content-type':'application/json'},body:JSON.stringify({id:11})})});
 assert.equal(response.status,200,'Verified owned closed ticket can reopen');
 assert(seen.some(x=>x.path.includes('support_tickets?id=eq.11')),'Authorized reopen must update the exact owned ticket');
 seen=[];owned=false;
 response=await onRequest({env,request:request('reopen',{method:'POST',headers:{...auth,'content-type':'application/json'},body:JSON.stringify({id:11})})});
 assert.equal(response.status,404,'Unowned ticket cannot reopen');
 assert(!seen.some(x=>x.path.includes('support_tickets?id=eq.11')),'Unowned ticket must never PATCH');
 seen=[];owned=true;ticketState='open';
 response=await onRequest({env,request:request('reopen',{method:'POST',headers:{...auth,'content-type':'application/json'},body:JSON.stringify({id:11})})});
 assert.equal(response.status,409,'Only closed/resolved tickets can reopen');
 seen=[];ticketState='closed';canUpdate=false;
 response=await onRequest({env,request:request('reopen',{method:'POST',headers:{...auth,'content-type':'application/json'},body:JSON.stringify({id:11})})});
 assert.equal(response.status,409,'Conditional reopen must reject a concurrent change');
 assert(seen.some(x=>x.path.includes('status=in.(closed,resolved)')),'Conditional status filter is required');
 seen=[];canUpdate=true;
 response=await onRequest({env,request:request('create',{method:'POST',headers:{...auth,'content-type':'application/json'},body:'x'.repeat(16385)})});
 assert.equal(response.status,413,'Actual bytes, not claimed length, enforce 16-KB cap');
 assert(!seen.some(x=>x.path.includes('/rest/v1/support_tickets')||x.path.includes('/rest/v1/support_ticket_messages')),'Oversize create must not touch ticket tables');
 response=await onRequest({env,request:request('detail&id=0',{headers:auth})});
 assert.equal(response.status,400,'Ticket IDs are positive integers');
}finally{globalThis.fetch=original}
console.log('PASS D17 Support: opaque key, member-scoped reopen and writes, fail-closed request boundaries');
