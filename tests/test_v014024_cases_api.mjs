import assert from 'node:assert/strict';
import {onRequestGet,onRequestPost} from '../functions/api/admin-report-cases-v01424.js';
const ENV={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_public'};
const uid='e5972562-c6e7-4591-89ab-241bb502625e';
const visited=[];let scenario='normal';
globalThis.fetch=async(url,init={})=>{
 visited.push({url:String(url),init});
 if(String(url).endsWith('/auth/v1/user'))return scenario==='expired'?new Response('{}',{status:401}):Response.json({id:uid});
 if(String(url).includes('/rpc/gu_mod_case_list_v01424')){
  if(scenario==='forbidden')return Response.json({message:'MODERATION_FORBIDDEN'},{status:403});
  return Response.json({ok:true,page:1,status:'open',hasMore:false,isOwner:true,cases:[{id:9,status:'open',reason:'spam',contentId:'commons:topic:12'}]});
 }
 if(String(url).includes('/rpc/gu_mod_case_transition_v01424')){
  const body=JSON.parse(init.body);
  assert.deepEqual(body,{p_report_id:9,p_expected_status:'open',p_action:'start_review',p_note:'Reviewed spam evidence.'});
  if(scenario==='stale')return Response.json({message:'MODERATION_STALE'},{status:409});
  return Response.json({ok:true,id:9,status:'reviewing',previousStatus:'open',audited:true});
 }
 throw Error('Unexpected call '+url);
};
function get(query='',auth='Bearer session'){
 return onRequestGet({request:new Request('https://site.test/api/admin-report-cases-v01424'+query,{headers:auth?{authorization:auth}:{}}),env:ENV})}
function post(data,auth='Bearer session'){
 return onRequestPost({request:new Request('https://site.test/api/admin-report-cases-v01424',{method:'POST',headers:auth?{authorization:auth,'content-type':'application/json'}:{},body:JSON.stringify(data)}),env:ENV})}
assert.equal((await get('',null)).status,401);
assert.equal((await get('?status=invalid')).status,400);
assert.equal((await get('?page=1001')).status,400);
assert.equal((await post({reportId:9,action:'resolve',expectedStatus:'open',note:'short'})).status,400);
assert.equal((await post({reportId:9,action:'resolve',expectedStatus:'open',note:'Valid reason here',userId:uid})).status,400);
scenario='expired';assert.equal((await get()).status,401);
scenario='forbidden';assert.equal((await get()).status,403);
scenario='normal';let r=await get('?status=open&page=1');assert.equal(r.status,200);assert.equal((await r.json()).cases.length,1);
r=await post({reportId:9,action:'start_review',expectedStatus:'open',note:'Reviewed spam evidence.'});
assert.equal(r.status,200);assert.equal((await r.json()).audited,true);
scenario='stale';r=await post({reportId:9,action:'start_review',expectedStatus:'open',note:'Reviewed spam evidence.'});
assert.equal(r.status,409);assert.equal((await r.json()).code,'STALE');
assert(visited.every(x=>x.init.headers.apikey==='sb_public'));
assert(visited.every(x=>x.init.headers.authorization==='Bearer session'));
assert(!visited.some(x=>JSON.stringify(x.init).includes('SUPABASE_SECRET_KEY')||JSON.stringify(x.init).includes('service_role')));
assert(visited.some(x=>x.url.includes('/rpc/gu_mod_case_transition_v01424')));
console.log('PASS v01424: JWT-bound SQL moderation role gate, strict mutations, no service role, stale lock, audit acknowledgement.');
