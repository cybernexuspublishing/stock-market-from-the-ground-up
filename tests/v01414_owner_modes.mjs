// v0.14.0.14 Read-only / mocked backend contract tests. No live writes.
import assert from 'node:assert/strict';import fs from 'node:fs';
const load=async p=>import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8')).toString('base64'));
const replies=[];
const setting={mode:'range',registeredMin:120,registeredMax:240,onlineMin:12,onlineMax:80,refreshMinMinutes:1,refreshMaxMinutes:30,customRegistered:200,customOnline:30,show:true};
const calls=[];
const env={SUPABASE_URL:'https://mock.invalid',SUPABASE_PUBLISHABLE_KEY:'public-test',SUPABASE_SECRET_KEY:'secret-test'};
const orig=globalThis.fetch;
const res=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json','content-range':'0-0/1'}});
globalThis.fetch=async(url,o={})=>{const u=String(url);calls.push({u,method:o.method||'GET',body:o.body?JSON.parse(o.body):null});if(u.includes('/auth/v1/user'))return res({id:'owner-demo'});if(u.includes('profiles?'))return res([{account_kind:'member'}]);if(u.includes('admin_user_roles'))return res([{role_code:'OWNER'}]);if(u.includes('admin_user_flags'))return res([{status:'active'}]);if(u.includes('site_settings'))return res([{value:setting}]);if(u.includes('site_announcements'))return res([]);if(u.includes('admin_audit_log'))return res([]);if(u.includes('user_notifications'))return res([]);return res({error:'Mock route missing'},404)};
const req=(url,method='GET',body)=>new Request('https://site.invalid'+url,{method,headers:{authorization:'Bearer valid-owner',...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
try{
 const stats=(await load('functions/api/home-member-stats-v01353.js')).onRequest;
 const pub=async()=> (await stats({request:req('/api/home-member-stats-v01353?action=public'),env})).json();
 let x=await pub();assert.equal(x.label,'','There must be no default demonstration caption');
 let r=await stats({request:req('/api/home-member-stats-v01353?action=save','POST',{...setting,message:'Welcome to our learning community'}),env});assert.equal(r.status,200);
 assert.equal(calls.findLast(c=>c.u.includes('site_settings')&&c.method==='PATCH').body.value.message,'Welcome to our learning community');
 r=await stats({request:req('/api/home-member-stats-v01353?action=save','POST',{...setting,message:'A'.repeat(161)}),env});assert.equal(r.status,400);
 const admin=(await load('functions/api/admin-v013.js')).onRequest;
 const before=calls.length;
 r=await admin({request:req('/api/admin-v013?action=announcement_save','POST',{title:'Duration notice',body:'Notice body',audience:'all',active:true,expirationMode:'duration',durationAmount:30,durationUnit:'minutes'}),env});assert.equal(r.status,200);
 const written=calls.slice(before).find(c=>c.u.includes('site_announcements')&&c.method==='POST')?.body;assert(written?.starts_at&&written?.ends_at,'fixed absolute timestamps required');assert.equal(Date.parse(written.ends_at)-Date.parse(written.starts_at),30*60*1000);
 r=await admin({request:req('/api/admin-v013?action=announcement_save','POST',{title:'Invalid duration',body:'Notice',audience:'all',active:true,expirationMode:'duration',durationAmount:367,durationUnit:'days'}),env});assert.equal(r.status,400);
 r=await admin({request:req('/api/admin-v013?action=announcement_save','POST',{title:'No expiration',body:'Notice body',audience:'all',active:true,expirationMode:'none'}),env});assert.equal(r.status,200);assert.equal(calls.findLast(c=>c.u.includes('site_announcements')&&c.method==='POST').body.ends_at,null);
 const ui=(await load('functions/api/ui-state.js')).onRequest;
 r=await ui({request:req('/api/ui-state?action=notifications_dismiss','POST',{ids:[4,5]}),env});assert.equal(r.status,200);
 assert(calls.some(c=>c.u.includes('user_notifications?')&&c.u.includes('user_id=eq.owner-demo')&&c.method==='DELETE'));
 r=await ui({request:req('/api/ui-state?action=notifications_dismiss','POST',{ids:['abc']}),env});assert.equal(r.status,400);
 console.log('PASS v0.14.0.14: no default caption, user caption validation, fixed expiration, duration range, no-expiration and user-scoped notification dismiss.');
}finally{globalThis.fetch=orig}
