// Support creates exactly one durable private ticket even if mirroring its
// initial message fails. No production users, payments or database writes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/support.js';
const USER='11111111-1111-4111-8111-111111111111';
const BASE='https://example.supabase.co';
const env={SUPABASE_URL:BASE,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',SUPABASE_SECRET_KEY:'sb_secret_fixture'};
let failedMirror=false,ticketPosts=0,messagePosts=0,lastDescription='';
const oldFetch=globalThis.fetch;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async (input,init={})=>{
 const u=new URL(String(input));
 if(u.pathname==='/auth/v1/user')return json({id:USER});
 if(u.pathname==='/rest/v1/profiles'){
  assert.equal(u.searchParams.get('id'),'eq.'+USER);
  return json([{account_kind:'member'}]);
 }
 assert.equal(init.headers.apikey,env.SUPABASE_SECRET_KEY);
 if(u.pathname==='/rest/v1/support_tickets'&&init.method==='POST'){
  ticketPosts++;
  const body=JSON.parse(init.body);
  assert.equal(body.requester_user_id,USER);
  lastDescription=body.description;
  return json([{id:41,subject:body.subject,description:body.description,status:'new'}],201);
 }
 if(u.pathname==='/rest/v1/support_ticket_messages'&&init.method==='POST'){
  messagePosts++;
  assert.equal(JSON.parse(init.body).ticket_id,41);
  return failedMirror?json({error:'Simulated message storage outage'},503):json(null,201);
 }
 throw Error('Unexpected provider call '+u.pathname);
};
const request=()=>new Request('https://course.example/api/support?action=create',{
 method:'POST',headers:{authorization:'Bearer member_token','content-type':'application/json'},
 body:JSON.stringify({category:'historical_labs',subject:'B01 study reflection did not save',
 description:'Lab F1-C02-L01: After saving my reflection, the page reported an error.'})
});
try{
 let r=await onRequest({env,request:request()});
 assert.equal(r.status,200);
 let body=await r.json();
 assert.equal(body.ticket.id,41);
 assert.equal(body.initialMessageRecorded,true);
 assert.equal(messagePosts,1);assert.equal(ticketPosts,1);
 failedMirror=true;
 r=await onRequest({env,request:request()});
 assert.equal(r.status,200,'Durable ticket must not be reported as total failure when mirror fails');
 body=await r.json();
 assert.equal(body.ok,true);
 assert.equal(body.ticket.id,41);
 assert.equal(body.initialMessageRecorded,false);
 assert.match(body.notice,/Ticket saved/);
 assert.match(lastDescription,/Lab F1-C02-L01/);
 assert.equal(ticketPosts,2,'One durable ticket per intentional create request');
 assert.equal(messagePosts,2,'Failed mirror must not autonomously retry');
}finally{globalThis.fetch=oldFetch;}
const client=readFileSync('assets/js/member-support-panel.js','utf8');
assert(client.includes('Original private report: '+''),'Client must render ticket description on empty conversation');
assert(client.includes('answer.initialMessageRecorded===false'));
console.log('PASS Support partial creation: authenticated owner-bound ticket saved and visible despite failed optional mirror, no auto-duplicate.');
