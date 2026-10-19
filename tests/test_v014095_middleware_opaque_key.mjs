// Reuse existing Cloudflare Pages middleware, do not disable Showcase security.
import assert from 'node:assert/strict';
import {onRequest as middleware} from '../functions/_middleware.js';
import {onRequest as announcements} from '../functions/api/site-announcements.js';
const old=globalThis.fetch,log=[];
const member='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://example.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
let kind='member',status='active',roles=[],breakDb=false;
const json=(x,code=200)=>new Response(JSON.stringify(x),{status:code,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,options={})=>{
 const u=String(url);log.push({u,options});
 if(u.includes('/auth/v1/user'))return json({id:member});
 if(u.includes('/rest/v1/profiles?'))return breakDb?json({message:'no access'},401):json([{account_kind:kind}]);
 if(u.includes('/rest/v1/admin_user_roles?'))return json(roles);
 if(u.includes('/rest/v1/admin_user_flags?'))return json([{status}]);
 if(u.includes('/rest/v1/site_announcements?'))return json([
  {id:1,title:'Public',body:'Everyone',active:true,audience:'all'},
  {id:2,title:'Member',body:'Account',active:true,audience:'members'}]);
 throw Error('Unexpected fetch '+u);
};
try{
 const request=()=>new Request('https://example.com/api/market-tutor-v01492',{method:'POST',headers:{authorization:'Bearer member.jwt', 'content-type':'application/json'},body:'{}'});
 const run=()=>middleware({request:request(),env,next:async()=>json({ok:true})});
 let r=await run();assert.equal(r.status,200,'Private authenticated API mutation must pass non-showcase accounts');
 roles=[{role_code:'SHOWCASE_VIEWER',expires_at:null}];
 r=await run();assert.equal(r.status,403,'Existing Showcase isolation must remain fail-closed');
 roles=[];breakDb=true;r=await run();assert.equal(r.status,503);
 breakDb=false;
 r=await announcements({request:new Request('https://example.com/api/site-announcements'),env});
 let data=await r.json();assert.equal(r.status,200);assert.deepEqual(data.announcements.map(x=>x.id),[1]);
 r=await announcements({request:new Request('https://example.com/api/site-announcements',{headers:{authorization:'Bearer member.jwt'}}),env});
 data=await r.json();assert.deepEqual(data.announcements.map(x=>x.id),[1,2]);
 status='suspended';r=await announcements({request:new Request('https://example.com/api/site-announcements',{headers:{authorization:'Bearer member.jwt'}}),env});
 data=await r.json();assert.deepEqual(data.announcements.map(x=>x.id),[1]);
 for(const {u,options} of log.filter(x=>x.u.includes('/rest/v1/'))){
  assert.equal(options.headers.apikey,env.SUPABASE_SECRET_KEY);
  assert.equal(options.headers.authorization,undefined,'Opaque Supabase key must not be used as Bearer JWT');
 }
 console.log('PASS v95: production middleware opaque-key compatibility, Showcase write restrictions and announcement audience ACL.');
}finally{globalThis.fetch=old}
