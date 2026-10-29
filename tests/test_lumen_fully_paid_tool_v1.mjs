import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lumenDiscountPolicy,previewLumenDiscount} from '../functions/_lib/lumen-discount-policy-v1.js';
import {onRequest} from '../functions/api/member-lumen-tool-passes.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
assert.equal(lumenDiscountPolicy.denominationCents,7);
assert.equal(lumenDiscountPolicy.maxPercentBasisPoints,10000);
assert.equal(lumenDiscountPolicy.maxOrderDiscountCents,null);
const x=previewLumenDiscount({eligibleNetCents:2999,availableLumens:429,requestedLumens:429,productKind:'digital_tool'});
assert.equal(x.discountCents,2999);assert.equal(x.appliedLumens,429);assert.equal(x.remainingSubtotalCents,0);
assert.equal(previewLumenDiscount({eligibleNetCents:2999,availableLumens:428,requestedLumens:428,productKind:'digital_tool'}).fullyCovered,false);
const sql=read('supabase/migrations/20261029_lumen_tool_redeem_atomic_v1.sql');
assert.match(sql,/pg_advisory_xact_lock\(hashtextextended\(p_user_id::text,489301\)\)/);
assert.match(sql,/REVOKE ALL ON FUNCTION public.gu_lumen_tool_redeem_v1.*FROM PUBLIC,anon,authenticated/);
assert.match(sql,/ALREADY_INCLUDED/);
assert.match(sql,/PRICE_CHANGED/);
assert.match(sql,/REQUEST_REUSED/);
assert.match(sql,/expiry|expires_at|v_until/i);
assert.match(sql,/gu_lumen_tool_debits_v1/);
assert.match(sql,/state='active'/);
assert.match(sql,/ON CONFLICT DO NOTHING/);
assert.match(read('functions/api/member-lumen-tool-passes.js'),/ORIGIN_MISMATCH/);
assert.match(read('store-sparks.html'),/lumen-tool-offers/);
const original=globalThis.fetch;
const env={SUPABASE_URL:'https://mock.example',SUPABASE_PUBLISHABLE_KEY:'pub_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
const uuid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
globalThis.fetch=async(uri,options={})=>{
 const u=new URL(uri);
 const respond=v=>new Response(JSON.stringify(v),{status:200});
 if(u.pathname==='/auth/v1/user')return respond({id:uuid});
 if(u.pathname==='/rest/v1/profiles')return respond([{account_kind:'member',deleted_at:null}]);
 if(u.pathname==='/rest/v1/admin_user_flags')return respond([]);
 if(u.pathname==='/rest/v1/admin_user_roles')return respond([{role_code:'OWNER',expires_at:null}]);
 if(u.pathname==='/rest/v1/gu_lumen_tool_offers_v1')return respond([]);
 if(u.pathname==='/rest/v1/gu_lumen_value_settings_v1')return respond([{active_cents:7}]);
 throw Error('Unexpected endpoint '+u.pathname);
};
try{
 const get=new Request('https://site.example/api/member-lumen-tool-passes',{headers:{authorization:'Bearer member'}});
 let resp=await onRequest({request:get,env});assert.equal(resp.status,200);
 let data=await resp.json();assert.equal(data.ownerIncluded,true);assert.deepEqual(data.offers,[]);
 const post=new Request('https://site.example/api/member-lumen-tool-passes',{method:'POST',
  headers:{authorization:'Bearer member',origin:'https://site.example'},
  body:JSON.stringify({offerCode:'WATCHLIST_WORKBENCH_30D',requestId:'77777777-7777-4777-8777-777777777777',expectedCostLumens:429})});
 resp=await onRequest({request:post,env});assert.equal(resp.status,409);
 assert.equal((await resp.json()).error,'ALREADY_INCLUDED_OWNER');
}finally{globalThis.fetch=original}
console.log('PASS 7-cent 100% credit coverage, Owner no-charge, draft-only catalog and atomic redemption boundary');
