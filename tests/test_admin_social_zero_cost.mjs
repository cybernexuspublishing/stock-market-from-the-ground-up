import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {onRequest} from '../functions/api/admin-social.js';

const origin='https://social.example.test',id='11111111-1111-4111-8111-111111111111';
const env={SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
function mock(owner=true){
 const old=globalThis.fetch,calls=[];
 globalThis.fetch=async (input,opts={})=>{
  const url=new URL(input),path=url.pathname,method=opts.method||'GET';
  calls.push({path,method});
  if(path==='/auth/v1/user')return Response.json({id});
  if(path==='/rest/v1/admin_user_roles')
   return Response.json(owner?[{role_code:'OWNER',expires_at:null}]:[{role_code:'MEMBER',expires_at:null}]);
  if(path==='/rest/v1/profiles')return Response.json([{account_kind:'member',deleted_at:null}]);
  if(path==='/rest/v1/admin_user_flags')return Response.json([{status:'active'}]);
  if(path==='/rest/v1/gu_social_posts_v014276')return Response.json(method==='POST'||method==='PATCH'?[{id,body:'A candle tells a price story.',status:'draft'}]:[]);
  if(path==='/rest/v1/gu_social_communities_v014276')return Response.json(method==='POST'||method==='PATCH'?[{id,name:'Day Trading Stocks'}]:[]);
  throw Error('Unexpected outbound request: '+input);
 };
 return {calls,restore(){globalThis.fetch=old}};
}
function req(method='GET',body,token=null,requestOrigin=origin){
 const headers={...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json',origin:requestOrigin}:{})};
 return new Request(origin+'/api/admin-social',{method,headers,body:body?JSON.stringify(body):undefined});
}
test('anonymous access is rejected before reading private social data',async()=>{
 const n=mock();try{const r=await onRequest({request:req(),env});assert.equal(r.status,401);
  assert(!n.calls.some(x=>x.path.includes('gu_social_')));
 }finally{n.restore()}
});
test('non-Owner access is rejected before private record reads and writes',async()=>{
 const n=mock(false);try{
  for(const request of [req('GET',null,'token'),req('POST',{action:'save_post',body:'Hello'},'token')]){
   const r=await onRequest({request,env});assert.equal(r.status,403);
  }
  assert(!n.calls.some(x=>x.path.includes('gu_social_')));
 }finally{n.restore()}
});
test('Owner receives accurate manual-only connection status and empty record sets',async()=>{
 const n=mock();try{
  const r=await onRequest({request:req('GET',null,'token'),env});assert.equal(r.status,200);
  const data=await r.json();assert.equal(data.account.connectionStatus,'manual_only');
  assert.deepEqual(data.posts,[]);assert.deepEqual(data.communities,[]);
 }finally{n.restore()}
});
test('Owner can save private X draft with no external publishing API call',async()=>{
 const n=mock();try{
  const r=await onRequest({request:req('POST',{action:'save_post',body:'A candle tells a price story.',status:'draft'},'token'),env});
  assert.equal(r.status,201);const body=await r.json();assert.equal(body.publicationVerified,false);
  assert(n.calls.some(x=>x.path==='/rest/v1/gu_social_posts_v014276'&&x.method==='POST'));
  assert(!n.calls.some(x=>/stripe|api\.x\.com|twitter\.com/.test(x.path)));
 }finally{n.restore()}
});
test('invalid oversized post is rejected without database modification',async()=>{
 const n=mock();try{
  const r=await onRequest({request:req('POST',{action:'save_post',body:'x'.repeat(281)},'token'),env});
  assert.equal(r.status,400);assert(!n.calls.some(x=>x.method==='POST'||x.method==='PATCH'));
 }finally{n.restore()}
});
test('cross-origin write fails closed',async()=>{
 const n=mock();try{
  const r=await onRequest({request:req('POST',{action:'save_post',body:'Hello'},'token','https://unauthorized.example'),env});
  assert.equal(r.status,403);assert(!n.calls.some(x=>x.method==='POST'||x.method==='PATCH'));
 }finally{n.restore()}
});
test('manual publication records only owned X permalinks and never calls X',async()=>{
 const n=mock();try{
  const wrong=await onRequest({request:req('POST',{action:'record_manual_post',id,externalUrl:'https://x.com/AnotherAccount/status/12345'},'token'),env});
  assert.equal(wrong.status,400);
  const correct=await onRequest({request:req('POST',{action:'record_manual_post',id,externalUrl:'https://x.com/SMFGUAcademy/status/12345'},'token'),env});
  assert.equal(correct.status,200);assert.equal((await correct.json()).publicationVerified,false);
  assert(!n.calls.some(x=>/api\.x\.com|stripe/i.test(x.path)));
 }finally{n.restore()}
});
test('Owner can save a community record without joining it',async()=>{
 const n=mock();try{
  const r=await onRequest({request:req('POST',{action:'save_community',name:'Day Trading Stocks',communityUrl:'https://x.com/i/communities/12345',membershipStatus:'requested',promotionPolicy:'unverified',notes:'Review rules'},'token'),env});
  assert.equal(r.status,201);assert.equal((await r.json()).publicationVerified,false);
  assert(n.calls.some(x=>x.path==='/rest/v1/gu_social_communities_v014276'&&x.method==='POST'));
 }finally{n.restore()}
});
test('source forbids free workflow claims of connected external publishing',()=>{
 const ui=fs.readFileSync('assets/js/admin-social-zero-cost.js','utf8');
 const migration=fs.readFileSync('supabase/migrations/v0.14.0.276_social_marketing_owner_only.sql','utf8');
 assert.match(ui,/manual-only connection/);
 assert.match(ui,/No X API or paid service is connected/);
 assert.doesNotMatch(ui,/localStorage|sessionStorage|innerHTML\s*=/);
 assert.match(migration,/ENABLE ROW LEVEL SECURITY/);
 assert.match(migration,/REVOKE ALL ON public\.gu_social_posts_v014276/);
 assert.match(migration,/CREATE TRIGGER gu_social_posts_audit_v014276/);
 const repair=fs.readFileSync('supabase/migrations/v0.14.0.277_social_audit_rowtype_repair.sql','utf8');
 assert.match(repair,/ELSIF TG_TABLE_NAME='gu_social_communities_v014276'/);
 assert.match(repair,/audit_details := pg_catalog\.jsonb_build_object/);
 assert.match(fs.readFileSync('assets/js/admin-marketing-workspace.js','utf8'),/admin-social-zero-cost\.js/);
});
