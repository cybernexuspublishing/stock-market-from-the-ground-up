import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {onRequest} from '../functions/api/admin-social.js';

const site='https://school.example.test';
const ownerId='11111111-1111-4111-8111-111111111111';
const postId='22222222-2222-4222-8222-222222222222';
const campaignId='33333333-3333-4333-8333-333333333333';
const env={
 SUPABASE_URL:'https://oxihglyfgzywsupnyicb.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',
 SUPABASE_SECRET_KEY:'sb_secret_test'
};
function network({role='OWNER',postStatus='approved',postVersion=1,ownerActive=true}={}){
 const original=globalThis.fetch,calls=[];
 globalThis.fetch=async (input,opts={})=>{
  const url=new URL(input),path=url.pathname,method=opts.method||'GET';
  const body=opts.body?JSON.parse(opts.body):null;
  calls.push({path,method,body,search:url.search});
  if(path==='/auth/v1/user')return Response.json({id:ownerId});
  if(path==='/rest/v1/admin_user_roles')return Response.json([{role_code:role,expires_at:null}]);
  if(path==='/rest/v1/profiles')return Response.json([{account_kind:'member',deleted_at:null}]);
  if(path==='/rest/v1/admin_user_flags')return Response.json([{status:ownerActive?'active':'suspended'}]);
  const prefix='/rest/v1/gu_social_';
  if(path.startsWith(prefix)){
   const table=path.slice('/rest/v1/'.length);
   if(method==='GET'){
    if(table==='gu_social_posts_v014276'&&url.searchParams.get('id')?.startsWith('eq.'))
     return Response.json([{id:postId,status:postStatus,version:postVersion,owner_id:ownerId}]);
    return Response.json([]);
   }
   return Response.json([{id:table.includes('campaigns')?campaignId:postId,...body,version:body?.version||1}]);
  }
  throw Error('Unexpected request: '+input);
 };
 return {calls,stop(){globalThis.fetch=original}};
}
function request(method='GET',body,token=null,origin=site){
 return new Request(site+'/api/admin-social',{
  method,headers:{...(token?{authorization:'Bearer '+token}:{}),
   ...(body?{'content-type':'application/json',origin}:{})},
  body:body?JSON.stringify(body):undefined
 });
}
const act=(body,token='valid')=>request('POST',body,token);
test('rejects anonymous and non-Owner before any social database read',async()=>{
 const m=network();try{
  const r=await onRequest({request:request(),env});assert.equal(r.status,401);
  assert(!m.calls.some(x=>x.path.startsWith('/rest/v1/gu_social_')));
 }finally{m.stop()}
 const n=network({role:'MEMBER'});try{
  for(const req of [request('GET',null,'valid'),act({action:'save_post',body:'Hello'})]){
   const r=await onRequest({request:req,env});assert.equal(r.status,403);
  }
  assert(!n.calls.some(x=>x.path.startsWith('/rest/v1/gu_social_')));
 }finally{n.stop()}
});
test('suspended Owner cannot open marketing records',async()=>{
 const m=network({ownerActive:false});try{
  const r=await onRequest({request:request('GET',null,'valid'),env});assert.equal(r.status,403);
 }finally{m.stop()}
});
test('Owner snapshot lists all integrated workstreams without external services',async()=>{
 const m=network();try{
  const r=await onRequest({request:request('GET',null,'valid'),env});
  const body=await r.json();assert.equal(r.status,200);
  for(const key of ['posts','communities','campaigns','templates','tasks','metrics','accounts','audit'])
   assert.deepEqual(body[key],[],key);
  assert.equal(body.account.apiPublishingEnabled,false);
  assert.equal(body.account.platformApiSpendingLimitCents,0);
  assert.equal(body.account.connectionStatus,'manual_only');
  assert(!m.calls.some(x=>!x.path.startsWith('/auth/')&&!x.path.startsWith('/rest/')));
 }finally{m.stop()}
});
test('Owner creates post and approves before manual publication',async()=>{
 const m=network();try{
  const draft=await onRequest({request:act({action:'save_post',body:'Candlesticks communicate prices.'}),env});
  assert.equal(draft.status,201);
  const approved=await onRequest({request:act({
   action:'save_post',id:postId,version:1,body:'Candlesticks communicate prices.',status:'approved'
  }),env});
  assert.equal(approved.status,200);
  const update=m.calls.find(x=>x.method==='PATCH');
  assert.match(update.search,/version=eq\.1/);
  assert.equal(update.body.version,2);
  assert.equal(update.body.status,'approved');
  assert.equal(update.body.approved_by,ownerId);
  assert.equal((await approved.json()).publicationVerified,false);
 }finally{m.stop()}
});
test('post update requires revision and Owner-only concurrency token',async()=>{
 const m=network();try{
  const bad=await onRequest({request:act({action:'save_post',id:postId,body:'Changed without expected revision.'}),env});
  assert.equal(bad.status,400);
  assert(!m.calls.some(x=>x.method==='PATCH'));
 }finally{m.stop()}
});
test('Owner cannot report publication from an unapproved post',async()=>{
 const m=network({postStatus:'draft'});try{
  const r=await onRequest({request:act({action:'record_manual_post',id:postId,version:1,
   externalUrl:'https://x.com/SMFGUAcademy/status/12345'}),env});
  assert.equal(r.status,409);
  assert(!m.calls.some(x=>x.method==='PATCH'));
 }finally{m.stop()}
});
test('manual publication is Owner-reported, not verified, and requires approved permalink',async()=>{
 const m=network();try{
  for(const externalUrl of ['https://x.com/WrongAccount/status/12345','http://x.com/SMFGUAcademy/status/12',
   'https://x.com/SMFGUAcademy/status/123?tracking=1']){
   const r=await onRequest({request:act({action:'record_manual_post',id:postId,version:1,externalUrl}),env});
   assert.equal(r.status,400);
  }
  const r=await onRequest({request:act({action:'record_manual_post',id:postId,version:1,
   externalUrl:'https://x.com/SMFGUAcademy/status/12345'}),env});
  assert.equal(r.status,200);
  assert.equal((await r.json()).publicationVerified,false);
  const patch=m.calls.find(x=>x.method==='PATCH');
  assert.equal(patch.body.status,'manual_recorded');
  assert.equal(patch.body.version,2);
  assert(!m.calls.some(x=>/stripe|api\.x\.com|api\.twitter\.com/.test(x.path)));
 }finally{m.stop()}
});
test('save a campaign, editable template and engagement task',async()=>{
 const m=network();try{
  for(const body of [
   {action:'save_campaign',title:'Founding 600 education',category:'founding600',state:'draft',
    objective:'Explain paid beta benefits',destinationUrl:'https://example.org/founders'},
   {action:'save_template',name:'Beginner definition',body:'What is a candlestick?',category:'education'},
   {action:'save_task',title:'Review community rules',kind:'community_review',details:'Read before posting'}
  ]){
   const r=await onRequest({request:act(body),env});assert.equal(r.status,201);
  }
  assert.deepEqual(m.calls.filter(x=>x.method==='POST').map(x=>x.path),[
   '/rest/v1/gu_social_campaigns_v014278','/rest/v1/gu_social_templates_v014278',
   '/rest/v1/gu_social_tasks_v014278'
  ]);
 }finally{m.stop()}
});
test('rejects unsafe destination, invalid task state and invalid community URL',async()=>{
 const m=network();try{
  for(const body of [
   {action:'save_campaign',title:'Unsafe campaign',destinationUrl:'http://localhost/test'},
   {action:'save_task',title:'Queue task',state:'published'},
   {action:'save_community',name:'Community',communityUrl:'https://x.com/home'}
  ]){
   const r=await onRequest({request:act(body),env});assert.equal(r.status,400);
  }
  assert(!m.calls.some(x=>x.method==='POST'));
 }finally{m.stop()}
});
test('community record records membership manually but never tries joining',async()=>{
 const m=network();try{
  const r=await onRequest({request:act({
   action:'save_community',name:'Day Trading Stocks',communityUrl:'https://x.com/i/communities/1234',
   membershipStatus:'requested',promotionPolicy:'restricted',notes:'Promotion needs approval'
  }),env});
  assert.equal(r.status,201);
  const insert=m.calls.find(x=>x.method==='POST');
  assert.equal(insert.body.membership_status,'requested');
  assert.equal(insert.body.promotion_policy,'restricted');
  assert.equal((await r.json()).publicationVerified,false);
 }finally{m.stop()}
});
test('manual metrics require a manually recorded published post and at least one observed value',async()=>{
 const draft=network({postStatus:'draft'});try{
  const r=await onRequest({request:act({action:'record_metrics',postId,likes:1}),env});
  assert.equal(r.status,409);
 }finally{draft.stop()}
 const m=network({postStatus:'manual_recorded'});try{
  const empty=await onRequest({request:act({action:'record_metrics',postId}),env});
  assert.equal(empty.status,400);
  const r=await onRequest({request:act({action:'record_metrics',postId,likes:0,views:13}),env});
  assert.equal(r.status,201);
  const write=m.calls.find(x=>x.method==='POST');
  assert.equal(write.body.likes,0);assert.equal(write.body.views,13);
  assert.equal(write.body.source,'owner_manual');
 }finally{m.stop()}
});
test('manual company account registry validates official provider URL and cannot claim OAuth connectivity',async()=>{
 const m=network();try{
  const bad=await onRequest({request:act({action:'save_account',provider:'x',handle:'@SMFGUAcademy',profileUrl:'https://attacker.example/SMFGUAcademy'}),env});
  assert.equal(bad.status,400);
  const okay=await onRequest({request:act({action:'save_account',provider:'x',handle:'@SMFGUAcademy',profileUrl:'https://x.com/SMFGUAcademy',notes:'Company educational account'}),env});
  assert.equal(okay.status,201);
  const write=m.calls.find(x=>x.method==='POST');assert.equal(write.path,'/rest/v1/gu_social_accounts_v014279');
  assert.equal(write.body.connection_status,'manual_only');
  assert.equal(write.body.profile_url,'https://x.com/SMFGUAcademy');
  assert.equal((await okay.json()).publicationVerified,false);
 }finally{m.stop()}
});
test('cross-origin mutation cannot reach social data writes',async()=>{
 const m=network();try{
  const r=await onRequest({request:request('POST',{action:'save_campaign',title:'Test campaign'},'valid','https://attacker.test'),env});
  assert.equal(r.status,403);
  assert(!m.calls.some(x=>x.method==='POST'||x.method==='PATCH'));
 }finally{m.stop()}
});
test('social UI uses new integrated module and no hidden automatic provider calls',()=>{
 const controller=fs.readFileSync('assets/js/admin-marketing-workspace.js','utf8');
 const ui=fs.readFileSync('assets/js/admin-social-operations-v014278.js','utf8');
 const schema=fs.readFileSync('supabase/migrations/v0.14.0.278_social_campaign_content_queue_metrics.sql','utf8');
 assert.match(controller,/admin-social-operations-v014278\.js/);
 for(const part of ['Publishing calendar','Post Studio','Campaign manager','X Communities directory','Manual performance snapshot'])
  assert.match(ui,new RegExp(part,'i'));
 assert.doesNotMatch(ui,/localStorage|sessionStorage|innerHTML\s*=/);
 // This DOM helper requires (host, tagName, text, className). An earlier
 // omitted tagName prevented the entire Owner social navigation from mounting.
 assert.match(ui,/text\(root,'p','Owner-only content, campaigns and community operations\./);
 assert.doesNotMatch(ui,/text\(root,'Owner-only content, campaigns and community operations\./);
 assert.match(schema,/ENABLE ROW LEVEL SECURITY/);
 assert.match(schema,/SOCIAL_APPROVAL_REQUIRED_BEFORE_MANUAL_PUBLICATION/);
 assert.match(schema,/SOCIAL_REVISION_CONFLICT/);
 assert.match(schema,/SOCIAL_CAMPAIGN_OWNER_MISMATCH/);
});
