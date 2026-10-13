/** v0.14.0.7: Offline endpoint boundary tests. These do NOT verify live Supabase RLS. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
const moduleCode=fs.readFileSync(new URL('../functions/api/commons-report.js',import.meta.url),'utf8');
const {onRequestPost}=await import('data:text/javascript;base64,'+Buffer.from(moduleCode).toString('base64'));
const env={SUPABASE_URL:'https://test.example',SUPABASE_PUBLISHABLE_KEY:'public-demo',SUPABASE_SECRET_KEY:'server-demo'};
function makeResponse(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}})}
const validTopic=[{topic_id:22,title:'Available topic',discussion_unlocked:true}];
const validPosts=[{post_id:34,body:'Allowed reply'}];
async function test(name,payload,{errorRoute='',responseStatus=200,expectedStatus=200,scope,visible=true,caller=true,accountStatus='',accountKind='member',expectedContent}={}){
 let calls=[];
 globalThis.fetch=async(url,init={})=>{
  calls.push({url,init});
  if(url.endsWith('/auth/v1/user'))return makeResponse({id:'member-1'});
  if(url.includes('/rest/v1/profiles?'))return makeResponse([{account_kind:accountKind}]);
  if(url.includes('/rest/v1/admin_user_flags?'))return makeResponse(accountStatus?[{status:accountStatus}]:[]);
  if(url.endsWith('/rpc/forum_get_topic'))return makeResponse(visible?validTopic:[]);
  if(url.endsWith('/rpc/forum_list_posts'))return makeResponse(visible?validPosts:[]);
  if(url.includes('/rest/v1/commons_topics?'))return makeResponse(visible?[{id:22}]:[]);
  if(url.includes('/rest/v1/commons_posts?'))return makeResponse(visible?[{id:34,topic_id:22}]:[]);
  if(url.endsWith('/rpc/v014_community_report'))return makeResponse({ok:true},responseStatus);
  throw new Error('Unexpected fetch:'+url);
 };
 const request=new Request('https://site.example/api/commons-report',{method:'POST',headers:{'content-type':'application/json',...(caller?{authorization:'Bearer member-token'}:{})},body:JSON.stringify(payload)});
 const res=await onRequestPost({request,env});
 assert.equal(res.status,expectedStatus,name+' response status');
 if(expectedContent){
  const report=calls.find(c=>c.url.endsWith('/rpc/v014_community_report'));
  assert.ok(report,name+' should create report through RPC');
  assert.equal(JSON.parse(report.init.body).p_content,expectedContent,name+' proper namespace');
  assert.equal(report.init.headers.apikey,env.SUPABASE_SECRET_KEY,'RPC uses service role');
  const check=calls.find(c=>c.url.endsWith('/rpc/forum_get_topic'));
  if(scope==='legacy')assert.equal(check.init.headers.authorization,'Bearer member-token','topic visibility checked with member token');
 }
 if(expectedStatus!==200 && responseStatus===200)assert.equal(calls.filter(c=>c.url.endsWith('/rpc/v014_community_report')).length,0,name+' must reject before RPC');
 console.log('PASS',name);
}
await test('no authorization', {scope:'legacy',type:'topic',id:22,topicId:22,reason:'spam'},{caller:false,expectedStatus:401});
await test('legacy topic', {scope:'legacy',type:'topic',id:22,topicId:22,reason:'spam',details:'abuse'},{scope:'legacy',expectedContent:'legacy:topic:22'});
await test('legacy reply', {scope:'legacy',type:'post',id:34,topicId:22,reason:'scam',details:'abuse'},{scope:'legacy',expectedContent:'legacy:post:34'});
await test('legacy nonexistent reply', {scope:'legacy',type:'post',id:99,topicId:22,reason:'scam'},{expectedStatus:404});
await test('legacy inaccessible topic', {scope:'legacy',type:'topic',id:22,topicId:22,reason:'spam'},{expectedStatus:404,visible:false});
await test('mismatched legacy topic ID', {scope:'legacy',type:'topic',id:23,topicId:22,reason:'spam'},{expectedStatus:400});
await test('commons topic', {scope:'commons',type:'topic',id:22,reason:'spam'},{expectedContent:'commons:topic:22'});
await test('commons reply', {type:'post',id:34,reason:'misinformation'},{expectedContent:'commons:post:34'});
await test('suspended member blocked', {scope:'legacy',type:'topic',id:22,topicId:22,reason:'spam'},{accountStatus:'suspended',expectedStatus:403});
await test('restricted member blocked', {scope:'legacy',type:'topic',id:22,topicId:22,reason:'spam'},{accountStatus:'RESTRICTED',expectedStatus:403});
await test('test account blocked', {scope:'legacy',type:'topic',id:22,topicId:22,reason:'spam'},{accountKind:'test',expectedStatus:403});
await test('invalid reason', {scope:'legacy',type:'topic',id:22,topicId:22,reason:'hacky'},{expectedStatus:400});
await test('quota reject', {scope:'legacy',type:'topic',id:22,topicId:22,reason:'spam'},{responseStatus:429,expectedStatus:429});
const legacyUI=fs.readFileSync(new URL('../assets/js/forum-topic.js',import.meta.url),'utf8');
assert.ok(!legacyUI.includes("sb.from('forum_reports').insert"),'Legacy direct forum report insert removed');
assert.match(legacyUI,/scope:'legacy'/);
const sqlA=fs.readFileSync(new URL('../supabase/migrations/v0.14.0.7_A_PREPARE_LEGACY_FORUM_REPORT_RPC.sql',import.meta.url),'utf8');
const sqlB=fs.readFileSync(new URL('../supabase/migrations/v0.14.0.7_B_FINALIZE_FORUM_REPORT_LOCKDOWN.sql',import.meta.url),'utf8');
assert.match(sqlA,/v014_community_report/);
assert.match(sqlB,/REVOKE INSERT ON TABLE public\.forum_reports FROM PUBLIC,anon,authenticated/);
assert.match(sqlA,/FROM PUBLIC,anon,authenticated/);
console.log('All v0.14.0.7 local API regression tests passed.');
