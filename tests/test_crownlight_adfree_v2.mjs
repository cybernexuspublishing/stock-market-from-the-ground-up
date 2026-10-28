import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/member-sparks-adfree.js';
const user='11111111-1111-4111-8111-111111111111';
const requestId='33333333-3333-4333-8333-333333333333';
const env={SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fixture',SUPABASE_SECRET_KEY:'sb_secret_fixture'};
const original=globalThis.fetch;
let requests=0;
const response=data=>new Response(JSON.stringify(data),{status:200});
globalThis.fetch=async (url,opts={})=>{
 const path=new URL(url).pathname;
 if(path==='/auth/v1/user')return response({id:user});
 assert.equal(opts.cache,'no-store');
 if(path.endsWith('gu_sparks_adfree_status_v1')){
  assert.equal(JSON.parse(opts.body).p_user_id,user);
  return response({ok:true,eligible:true,active:false});
 }
 if(path.endsWith('gu_sparks_adfree_redeem_v2')){
  const p=JSON.parse(opts.body);assert.equal(p.p_user_id,user);
  assert.equal(p.p_request_id,requestId);assert.equal(p.p_sku,'ADFREE_DAY');assert.equal(p.p_expected_cost,5);
  requests++;return response({ok:true,spent:5,expiresAt:'2026-11-01T12:00:00Z'});
 }
 throw Error('Undeclared fetch '+path);
};
const uri='https://site.example/api/member-sparks-adfree?userId=22222222-2222-4222-8222-222222222222';
const req=(method='GET',body,origin='https://site.example',auth=true)=>new Request(uri,{
 method,headers:{...(auth?{authorization:'Bearer fixture'}:{}),...(method==='POST'?{origin,'content-type':'application/json'}:{})},
 ...(method==='POST'?{body:JSON.stringify(body)}:{})
});
try{
 let r=await onRequest({request:req(),env});assert.equal(r.status,200);
 assert.equal((await r.json()).eligible,true);
 r=await onRequest({request:req('POST',{sku:'ADFREE_DAY',requestId,expectedCost:5,userId:'bogus'}),env});
 assert.equal(r.status,200);assert.equal((await r.json()).spent,5);
 r=await onRequest({request:req('POST',{sku:'ADFREE_DAY',requestId,expectedCost:5},'https://evil.example'),env});
 assert.equal(r.status,403);
 r=await onRequest({request:req('POST',{sku:'INVALID',requestId}),env});
 assert.equal(r.status,400);
 r=await onRequest({request:req('GET',null,'https://site.example',false),env});
 assert.equal(r.status,401);assert.equal(requests,1);
 const ad=readFileSync('functions/api/ad-slot.js','utf8');
 assert(ad.includes("return 'SPARKS_ADFREE'"));
 const catalog=JSON.parse(readFileSync('data/crownlight-sparks-store-v014167.json','utf8'));
 assert.equal(catalog.checkoutEnabled,false);
 assert.deepEqual(catalog.adFreePasses.map(x=>x.costSparks),[5,18,50]);
 assert.deepEqual(catalog.packages.map(x=>x.quantity),[25,55,90,125,275]);
 assert(readFileSync('store-sparks.html','utf8').includes('store-sparks-adfree-v2.js'));
 console.log('PASS Sparks V2 authenticated ad-free redemption and payment-off contract');
}finally{globalThis.fetch=original}
