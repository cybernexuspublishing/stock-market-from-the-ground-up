import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/simulator-lab-context.js';
const id='11111111-1111-4111-8111-111111111111';
const env={SUPABASE_URL:'https://lab-fixture.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_mock',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock'};
const original=globalThis.fetch;
let freeEligible=true,premium=false;
globalThis.fetch=async(url,init={})=>{
 const u=new URL(url);
 assert.equal(u.hostname,'lab-fixture.supabase.co');
 if(u.pathname==='/auth/v1/user')return Response.json({id});
 if(u.pathname==='/rest/v1/profiles')return Response.json([{account_kind:'member',deleted_at:null}]);
 if(u.pathname==='/rest/v1/admin_user_flags')return Response.json([]);
 if(u.pathname==='/rest/v1/admin_user_roles')return Response.json([]);
 if(u.pathname==='/rest/v1/rpc/user_has_tool_access')return Response.json(premium);
 if(u.pathname==='/rest/v1/platform_labs'){
  const lab=u.searchParams.get('lab_id')?.replace(/^eq\./,'');
  return Response.json([{lab_id:lab,title:'Verified fixture Lab',ticker:'GOOG',historical_date:'2024-04-26',
   timeframe:null,public_sample:lab==='F1-C02-L01',active:true,metadata:{}}]);
 }
 throw Error('Unexpected private endpoint '+u.pathname);
};
const req=lab=>new Request('https://site-fixture.test/api/simulator-lab-context?lab='+encodeURIComponent(lab),{
 headers:{authorization:'Bearer mock-jwt'}});
try{
 let r=await onRequest({request:req('F1-C02-L01'),env});let x=await r.json();
 assert.equal(r.status,200);assert.equal(x.referenceDate,'2024-04-26');assert.equal(x.ticker,'GOOG');
 assert.equal(x.startTimeET,null);assert.equal(x.endTimeET,null);
 assert.equal(x.timeSource,'not_provided');
 r=await onRequest({request:req('F2-C07-L01'),env});assert.equal(r.status,403,'Premium Labs remain locked');
 premium=true;r=await onRequest({request:req('F2-C07-L01'),env});assert.equal(r.status,200);
 r=await onRequest({request:req('../etc'),env});assert.equal(r.status,400);
 console.log('PASS authenticated canonical Lab context, date sourced, unspecified times null, premium guarded and invalid IDs rejected');
}finally{globalThis.fetch=original}
