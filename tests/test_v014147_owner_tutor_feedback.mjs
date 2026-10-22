import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/owner-tutor-feedback.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_opaq'};
let role='OWNER',kind='member',flag='active',reads=0,rowsFault=false;
const old=globalThis.fetch;
const json=(v,s=200,headers={})=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json',...headers}});
globalThis.fetch=async(url,init={})=>{
 const u=String(url);
 if(u.endsWith('/auth/v1/user'))return json({id:uid});
 if(!u.includes('/rest/v1/'))throw Error('Unexpected network access '+u);
 assert.equal(init.headers.apikey,env.SUPABASE_SECRET_KEY);
 assert.equal(init.headers.authorization,undefined,'Opaque sb_secret is never a JWT');
 if(u.includes('/profiles?'))return json([{account_kind:kind}]);
 if(u.includes('/admin_user_flags?'))return json([{status:flag}]);
 if(u.includes('/admin_user_roles?'))return json([{role_code:role,expires_at:null}]);
 if(u.includes('/gu_member_tutor_exchanges_v014102?')){
  reads++;assert(u.includes('feedback=eq.report'));
  if(rowsFault)return json({error:'not installed'},400);
  return json([{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   feedback:'report',feedback_note:'Something does not sound educational.',generation:'verified:original-competency-guide',
   created_at:'2026-10-20T00:00:00Z',feedback_at:'2026-10-21T00:00:00Z',
   source_titles:['VWAP'],user_id:uid,question:'Private question',answer:'Private answer'}],200,{'content-range':'0-0/1'});
 }
 throw Error('Unexpected REST path '+u);
};
const req=(method='GET',page='1')=>new Request('https://site.test/api/owner-tutor-feedback?page='+page,
 {method,headers:{authorization:'Bearer owner-session'}});
try{
 let r=await onRequest({env,request:req()});const d=await r.json();
 assert.equal(r.status,200);assert.equal(d.total,1);assert.equal(d.reports.length,1);
 assert(!JSON.stringify(d).includes(uid));
 assert(!JSON.stringify(d).includes('Private question'));
 assert(!JSON.stringify(d).includes('Private answer'));
 assert.equal(r.headers.get('cache-control').includes('no-store'),true);
 let n=reads;role='MODERATOR';r=await onRequest({env,request:req()});
 assert.equal(r.status,403);assert.equal(reads,n);
 role='SHOWCASE_VIEWER';r=await onRequest({env,request:req()});assert.equal(r.status,403);
 role='OWNER';flag='suspended';r=await onRequest({env,request:req()});assert.equal(r.status,403);
 flag='active';kind='showcase';r=await onRequest({env,request:req()});assert.equal(r.status,403);
 kind='member';r=await onRequest({env,request:req('POST')});assert.equal(r.status,405);
 r=await onRequest({env,request:req('GET','-1')});assert.equal(r.status,400);
 rowsFault=true;r=await onRequest({env,request:req()});assert.equal(r.status,503);
 const admin=readFileSync('admin.html','utf8');
 const ui=readFileSync('assets/js/admin-tutor-feedback-v014147.js','utf8');
 assert(admin.includes('admin-tutor-feedback-v014147.js'));
 assert(ui.includes('data-panel="content"'));
 assert(!ui.includes('innerHTML='),'Untrusted report body must render through textContent');
 console.log('PASS D07: Owner-only feedback triage, no member questions/IDs, RLS failure signaling, Cloudflare protected API and existing Admin integration.');
}finally{globalThis.fetch=old}
