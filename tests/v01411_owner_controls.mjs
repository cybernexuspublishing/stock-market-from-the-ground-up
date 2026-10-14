/* Release v0.14.0.11: no external API calls, mocked Supabase REST only. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const root=new URL('../',import.meta.url);
const take=(p)=>fs.readFileSync(new URL(p,root),'utf8');
const moduleFrom=(p)=>import('data:text/javascript;base64,'+Buffer.from(take(p)).toString('base64'));
const orig=globalThis.fetch;
const setting={mode:'range',registeredMin:100,registeredMax:150,onlineMin:5,onlineMax:40,refreshMinMinutes:1,refreshMaxMinutes:30,show:true,customRegistered:120,customOnline:10};
const rows=[{id:1,title:'Shown',body:'Welcome',active:true,audience:'all',starts_at:null,ends_at:null,dismissible:true},
 {id:2,title:'Future',body:'Not yet',active:true,audience:'all',starts_at:'2099-01-01T00:00:00.000Z',ends_at:null},
 {id:3,title:'Expired',body:'Gone',active:true,audience:'all',starts_at:null,ends_at:'2000-01-01T00:00:00.000Z'},
 {id:4,title:'Member',body:'Private',active:true,audience:'members',starts_at:null,ends_at:null},
 {id:5,title:'Disabled',body:'Inactive',active:false,audience:'all',starts_at:null,ends_at:null}];
function reply(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json',...headers}})}
const env={SUPABASE_URL:'https://fake.local',SUPABASE_SECRET_KEY:'service-mock',SUPABASE_PUBLISHABLE_KEY:'anon-mock'};
const calls=[];
globalThis.fetch=async(url,opts={})=>{
 url=String(url);calls.push({url,method:opts.method||'GET',body:opts.body});
 if(url.includes('/auth/v1/user'))return reply({id:'owner-1'});
 if(url.includes('admin_user_roles'))return reply([{role_code:'OWNER',expires_at:null}]);
 if(url.includes('admin_user_flags'))return reply([{status:'active'}]);
 if(url.includes('profiles'))return reply([{account_kind:'member'}]);
 if(url.includes('setting_key=eq.community.member_stats'))return reply([{value:setting}]);
 if(url.includes('site_announcements'))return reply(rows);
 if(url.includes('admin_audit_log'))return reply([]);
 return reply({error:'Unknown mock'},404);
};
try{
 const {onRequest:stats}=await moduleFrom('functions/api/home-member-stats-v01353.js');
 const statRequest=new Request('https://example.org/api/home-member-stats-v01353?action=public');
 const a=await (await stats({request:statRequest,env})).json();
 assert.equal(a.mode,'range');assert(a.registered>=100&&a.registered<=150);assert(a.online>=5&&a.online<=40);assert(a.online<=a.registered);assert(a.nextRefreshSeconds>=15);assert(a.intervalMinutes>=1&&a.intervalMinutes<=30);assert.equal(a.label,'');
 const b=await (await stats({request:statRequest,env})).json();assert.equal(a.registered,b.registered);assert.equal(a.online,b.online);
 const badReq=new Request('https://example.org/api/home-member-stats-v01353?action=save',{method:'POST',headers:{authorization:'Bearer dummy'},body:JSON.stringify({...setting,refreshMinMinutes:31})});
 const invalid=await stats({request:badReq,env});assert.equal(invalid.status,400);
 const goodReq=new Request('https://example.org/api/home-member-stats-v01353?action=save',{method:'POST',headers:{authorization:'Bearer dummy'},body:JSON.stringify(setting)});
 const accepted=await stats({request:goodReq,env});assert.equal(accepted.status,200);
 const {onRequest:ann}=await moduleFrom('functions/api/site-announcements.js');
 const publicRes=await (await ann({request:new Request('https://example.org/api/site-announcements'),env})).json();
 assert.deepEqual(publicRes.announcements.map(x=>x.title),['Shown']);
 const memberRes=await (await ann({request:new Request('https://example.org/api/site-announcements',{headers:{authorization:'Bearer dummy'}}),env})).json();
 assert.deepEqual(memberRes.announcements.map(x=>x.title),['Shown','Member']);
 const denied=await ann({request:new Request('https://example.org/api/site-announcements',{method:'POST'}),env});assert.equal(denied.status,405);
 const {onRequest:admin}=await moduleFrom('functions/api/admin-v013.js');
 let resp=await admin({request:new Request('https://example.org/api/admin-v013?action=announcement_save',{method:'POST',headers:{authorization:'Bearer dummy'},body:JSON.stringify({title:'New',body:'body',active:true,audience:'all',startsAt:'2026-11-04T10:00:00Z',endsAt:'2026-11-04T09:00:00Z'})}),env});assert.equal(resp.status,400);
 resp=await admin({request:new Request('https://example.org/api/admin-v013?action=announcement_save',{method:'POST',headers:{authorization:'Bearer dummy'},body:JSON.stringify({title:'New',body:'body',active:true,audience:'all',startsAt:'2026-11-04T09:00:00Z',endsAt:'2026-11-04T10:00:00Z'})}),env});assert.equal(resp.status,200);
 assert(calls.some(x=>x.url.includes('site_announcements')&&x.method==='POST'));
 resp=await admin({request:new Request('https://example.org/api/admin-v013?action=announcement_delete',{method:'POST',headers:{authorization:'Bearer dummy'},body:JSON.stringify({id:1,confirmation:'DELETE ANNOUNCEMENT'})}),env});assert.equal(resp.status,200);
 assert(calls.some(x=>x.url.includes('site_announcements?id=eq.1')&&x.method==='DELETE'));
 resp=await admin({request:new Request('https://example.org/api/admin-v013?action=announcement_delete',{method:'POST',headers:{authorization:'Bearer dummy'},body:JSON.stringify({id:1,confirmation:'DELETE'})}),env});assert.equal(resp.status,400);
 console.log('PASS v0.14.0.11: rotating demo bounds/stability, interval validation, announcement schedules, audience gate, CRUD and delete confirmation.');
}finally{globalThis.fetch=orig}
