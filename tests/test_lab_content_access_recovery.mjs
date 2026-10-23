import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/lab-content.js';

const env={SUPABASE_URL:'https://unit.supabase.test',SUPABASE_PUBLISHABLE_KEY:'unit_public',SUPABASE_SECRET_KEY:'unit_secret'};
const originalFetch=globalThis.fetch;
const user='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let book=4,owned=true,training=true,storeUnavailable=false,sourceStatus='private_owner_authored';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async url=>{
 const u=new URL(url);
 if(u.pathname.endsWith('/auth/v1/user'))return json({id:user});
 if(u.pathname.endsWith('/rpc/user_has_tool_access'))return json(training);
 if(u.pathname.endsWith('/lab_instruction_v014'))return storeUnavailable?json({code:'42P01'},404):json([{lab_id:'SITE-001',book_number:book,source_status:sourceStatus,content:{id:'SITE-001',book,concept:'Original exercise'}}]);
 if(u.pathname.endsWith('/profiles'))return json([{account_kind:'member'}]);
 if(u.pathname.endsWith('/admin_user_flags'))return json([{status:'active'}]);
 if(u.pathname.endsWith('/user_library')){
  const expected={1:'FOUNDATION_BOOK_1',4:'DAY_TRADING_BOOK_1',5:'READING_THE_TAPE'}[book];
  assert.equal(u.searchParams.get('product_code'),'eq.'+expected);
  return json(owned?[{product_code:expected,expires_at:null}]:[]);
 }
 if(u.pathname.endsWith('/book_key_redemptions')||u.pathname.endsWith('/user_plan_grants')||u.pathname.endsWith('/site_subscriptions')||u.pathname.endsWith('/admin_user_roles'))return json([]);
 throw Error('Unexpected request '+u.pathname);
};
const request=()=>new Request('https://site.test/api/lab-content?id=SITE-001',{headers:{authorization:'Bearer member.token'}});
try{
 for(book of [4,5]){
  owned=true;training=false;
  let r=await onRequest({request:request(),env});assert.equal(r.status,200,'Matching book unlocks its own authored lesson');
  owned=false;r=await onRequest({request:request(),env});assert.equal(r.status,403,'No book or learning entitlement cannot read private instruction');
 }
 book=6;training=true;
 let r=await onRequest({request:request(),env});assert.equal(r.status,200,'Site-exclusive authored lesson requires learning entitlement');
 training=false;r=await onRequest({request:request(),env});assert.equal(r.status,403);
 book=1;owned=true;sourceStatus='original_hypothetical_unreviewed_v01496';training=true;
 r=await onRequest({request:request(),env});assert.equal(r.status,200);
 assert.equal((await r.json()).sourceStatus,'private_unreviewed_conceptual_orientation');
 storeUnavailable=true;r=await onRequest({request:request(),env});assert.equal(r.status,503);
 assert.equal((await r.json()).code,'PRIVATE_LAB_STORE_UNAVAILABLE','The player may retry through independently authorized metadata only');
 console.log('PASS private Lab book mapping, site-exclusive access, entitlement denial and unavailable-store signal');
}finally{globalThis.fetch=originalFetch}
