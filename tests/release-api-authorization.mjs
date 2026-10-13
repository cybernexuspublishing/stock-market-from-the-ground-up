import{readFileSync}from'node:fs';import assert from'node:assert/strict';
const imported=async f=>import('data:text/javascript;base64,'+Buffer.from(readFileSync(f)).toString('base64'));
const [admin,report]=await Promise.all([imported('functions/api/admin-v0133.js'),imported('functions/api/commons-report.js')]);
const env={SUPABASE_URL:'https://example.test',SUPABASE_PUBLISHABLE_KEY:'public-placeholder',SUPABASE_SECRET_KEY:'server-placeholder'};
const req=(url,method='GET',body,auth='')=>new Request('https://local.test'+url,{method,headers:{...(auth?{authorization:'Bearer '+auth}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
let r=await admin.onRequest({env,request:req('/api/admin-v0133?action=commons_mod_queue')});assert.equal(r.status,401);
r=await report.onRequestPost({env,request:req('/api/commons-report','POST',{id:2,type:'topic',reason:'scam'})});assert.equal(r.status,401);
// Test accounts are prohibited from production community moderation even if misassigned OWNER.
let calls=[];global.fetch=async(url,opt={})=>{calls.push(url);if(url.endsWith('/auth/v1/user'))return Response.json({id:'00000000-0000-0000-0000-000000000001'});if(url.includes('admin_user_roles'))return Response.json([{role_code:'OWNER',expires_at:null}]);if(url.includes('profiles'))return Response.json([{account_kind:'test'}]);throw Error('Unexpected call '+url)};
r=await admin.onRequest({env,request:req('/api/admin-v0133?action=commons_topic_moderate','POST',{topicId:12,field:'status',value:'hidden',expectedUpdatedAt:'2026-10-11T00:00:00Z'},'test-jwt')});assert.equal(r.status,403);assert(!calls.some(x=>x.includes('commons_topics')));
// Normal verified member submitting an invalid report must fail prior to any mutation.
global.fetch=async(url,opt={})=>{if(url.endsWith('/auth/v1/user'))return Response.json({id:'00000000-0000-0000-0000-000000000001'});if(url.includes('/profiles?'))return Response.json([{account_kind:'member'}]);throw Error('Unexpected call '+url)};
r=await report.onRequestPost({env,request:req('/api/commons-report','POST',{id:12,type:'topic',reason:'made-up'},'verified-jwt')});assert.equal(r.status,400);
// Valid owner queue returns bounded reports and topics.
global.fetch=async(url,opt={})=>{if(url.endsWith('/auth/v1/user'))return Response.json({id:'00000000-0000-0000-0000-000000000001'});if(url.includes('admin_user_roles'))return Response.json([{role_code:'OWNER',expires_at:null}]);if(url.includes('profiles'))return Response.json([{account_kind:'member'}]);if(url.includes('forum_reports'))return Response.json([]);if(url.includes('commons_topics'))return Response.json([]);throw Error('Unexpected call '+url)};
r=await admin.onRequest({env,request:req('/api/admin-v0133?action=commons_mod_queue','GET',null,'owner-jwt')});assert.equal(r.status,200);const d=await r.json();assert.equal(d.ok,true);assert.equal(d.reports.length,0);
// A moderator may moderate content, but cannot publish or convert an Official Guide.
global.fetch=async(url,opt={})=>{if(url.endsWith('/auth/v1/user'))return Response.json({id:'00000000-0000-0000-0000-000000000001'});if(url.includes('admin_user_roles'))return Response.json([{role_code:'MODERATOR',expires_at:null}]);if(url.includes('profiles'))return Response.json([{account_kind:'member'}]);if(url.includes('admin_role_permissions'))return Response.json([{role_code:'MODERATOR'}]);throw Error('Unexpected Owner-only official-guide backend read '+url)};
r=await admin.onRequest({env,request:req('/api/admin-v0133?action=commons_topic_save','POST',{title:'Candle guide',body:'Education only',forumCode:'START_HERE'},'moderator-jwt')});assert.equal(r.status,403,'Moderator cannot impersonate official platform guide');
console.log('API mocks PASS: anonymous denial, demonstration account denial, report validation, authorized Owner moderation queue');
