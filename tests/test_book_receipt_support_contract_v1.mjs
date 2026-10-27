/* Synthetic-only contract: real session isolation and submitted evidence require Founding 600 beta testing.
 * No real users, purchases, file uploads, payments or entitlement grants.
 */
import assert from 'node:assert/strict';
import {onRequest as memberSupport} from '../functions/api/support.js';
import {onRequest as adminReceipt} from '../functions/api/admin-book-receipts.js';
import {readFileSync} from 'node:fs';
const USER='11111111-1111-4111-8111-111111111111',OWNER='22222222-2222-4222-8222-222222222222';
const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',
 SUPABASE_SECRET_KEY:'sb_secret_synthetic'};
const path=USER+'/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf';
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}});
let owner=false,receiptCreates=0,grantRequests=0,fileReads=0;
const original=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
 const u=new URL(String(url)),method=options.method||'GET';
 if(u.pathname==='/auth/v1/user')return json({id:owner?OWNER:USER,email:'member@fixture.test',email_confirmed_at:'2026-10-27T12:00:00Z'});
 if(u.pathname==='/rest/v1/profiles')return json([{account_kind:'member',deleted_at:null}]);
 if(u.pathname==='/rest/v1/admin_user_roles')return json(owner?[{role_code:'OWNER',expires_at:null}]:[]);
 if(u.pathname==='/rest/v1/admin_user_flags')return json([]);
 if(u.pathname==='/rest/v1/rpc/gu_support_create_book_receipt_v1'){
  receiptCreates++;const b=JSON.parse(options.body);
  assert.equal(b.p_member,USER);assert.equal(b.p_book_code,'FOUNDATION_BOOK_1');
  assert.equal(b.p_evidence_path,path);
  return json({ok:true,ticketId:55,ticketNumber:'SUP-FIXTURE',status:'pending_staff_validation'});
 }
 if(u.pathname==='/rest/v1/gu_book_receipt_claims_20261027')return json([{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',attachment_storage_reference:path}]);
 if(u.pathname==='/storage/v1/object/gu-book-receipts/'+path){
  fileReads++;return new Response(new Uint8Array(110).fill(37),{status:200});
 }
 if(u.pathname==='/rest/v1/rpc/gu_owner_decide_book_receipt_v1'){
  grantRequests++;const b=JSON.parse(options.body);
  assert.equal(b.p_owner,OWNER);assert.equal(b.p_action,'approve');return json({ok:true});
 }
 throw Error('Unexpected synthetic provider '+method+' '+u.pathname);
};
const make=(action,body,token='fixture_token')=>new Request('https://example.test/api/support?action='+action,{
 method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
 body:JSON.stringify(body)});
try{
 const input={bookCode:'FOUNDATION_BOOK_1',retailer:'Test Books',
  evidencePath:path,orderReference:'TEST-BOOK-1',notes:'Educational QA test'};
 let response=await memberSupport({env,request:make('book_receipt',{...input,evidencePath:'../../secret.pdf'})});
 assert.equal(response.status,400);assert.equal(receiptCreates,0,'Reject manipulated path before DB I/O');
 response=await memberSupport({env,request:new Request('https://example.test/api/support?action=book_receipt',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)})});
 assert.equal(response.status,401);assert.equal(receiptCreates,0);
 response=await memberSupport({env,request:make('book_receipt',input)});
 assert.equal(response.status,200);const result=await response.json();
 assert.equal(result.ticket.id,55);assert.equal(result.deadlineDays,3);assert.equal(receiptCreates,1);
 const getAdmin=()=>new Request('https://example.test/api/admin-book-receipts?action=list',{headers:{authorization:'Bearer fixture_token'}});
 response=await adminReceipt({env,request:getAdmin()});assert.equal(response.status,403,'Regular member cannot see Admin receipts');
 owner=true;response=await adminReceipt({env,request:getAdmin()});assert.equal(response.status,200);
 const decide=b=>new Request('https://example.test/api/admin-book-receipts?action=decide',{
  method:'POST',headers:{authorization:'Bearer fixture_token','content-type':'application/json',origin:'https://example.test'},body:JSON.stringify(b)});
 const b={claimId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',decision:'approve',
  note:'Independently verified synthetic matching purchase.'};
 response=await adminReceipt({env,request:decide(b)});assert.equal(response.status,403);assert.equal(grantRequests,0);
 response=await adminReceipt({env,request:decide({...b,confirmPhrase:'APPROVE VERIFIED BOOK PURCHASE'})});
 assert.equal(response.status,200);assert.equal(grantRequests,1);
 response=await adminReceipt({env,request:new Request('https://example.test/api/admin-book-receipts?action=file&id=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',{headers:{authorization:'Bearer fixture_token'}})});
 assert.equal(response.status,200);assert.equal(fileReads,1);
 assert.match(response.headers.get('content-disposition'),/^attachment;/);
}finally{globalThis.fetch=original;}
const source=readFileSync(new URL('../supabase/migrations/20261027_member_book_receipt_support_and_owner_review.sql',import.meta.url),'utf8');
assert.match(source,/CREATE POLICY gu_receipt_member_insert_v1/);
assert.match(source,/SECURITY DEFINER/);
assert.match(source,/GRANT EXECUTE.*service_role/);
assert.match(source,/gu_book_receipt_claims_20261027/);
assert.match(source,/ON CONFLICT DO NOTHING/);
console.log('PASS synthetic receipt support: member-only ticket, path isolation, Owner-only evidence and explicit reviewed entitlement transition, zero real member effects.');
