import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/interactive-training.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',secret='sb_secret_private';
const env={SUPABASE_URL:'https://fixtures.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:secret};
let calls=0,reads=0,account='member',flag='active';
const records=Array.from({length:250},(_,i)=>({
 id:'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),
 lab_id:'SITE-001',mode:'assessment',score:90-i%20,
 completed_at:new Date(Date.UTC(2026,9,22,12,0,0)-i*60000).toISOString()
}));
records.push({id:'11111111-1111-4111-8111-111111111111',lab_id:'F1-C02-L01',mode:'practice',
 score:72,completed_at:'2026-10-01T15:30:00Z'});
const original=globalThis.fetch;
const json=(v,code=200)=>new Response(JSON.stringify(v),{status:code,headers:{'content-type':'application/json'}});
globalThis.fetch=async(raw,opts={})=>{
 const u=new URL(String(raw)),path=u.pathname;
 if(path.endsWith('/auth/v1/user'))return json({id:uid});
 if(path.endsWith('/rest/v1/profiles'))return json([{account_kind:account}]);
 if(path.endsWith('/rest/v1/admin_user_flags'))return json([{status:flag}]);
 if(path.endsWith('/rest/v1/rpc/user_has_tool_access'))return json(true);
 if(path.endsWith('/rest/v1/lab_training_attempts_v014')){
  calls++;reads++;
  assert.equal(u.searchParams.get('user_id'),'eq.'+uid,'Tenant-scoped read');
  assert.equal(u.searchParams.get('limit'),'250');
  assert.equal(u.searchParams.get('order'),'completed_at.desc,id.desc');
  assert.equal(opts.headers.apikey,secret);
  const offset=Number(u.searchParams.get('offset'));
  return json(records.slice(offset,offset+250));
 }
 throw Error('Unexpected private API query '+u.href);
};
const request=()=>new Request('https://learning.example/api/interactive-training?action=progress',
 {headers:{authorization:'Bearer signed-member'}});
try{
 let resp=await onRequest({request:request(),env});
 assert.equal(resp.status,200);
 let body=await resp.json();
 assert.equal(body.reviewedRows,251);
 assert.equal(body.latestByLab.length,2,'Older last-attempt for another Lab must remain discoverable');
 assert.equal(body.latestAssessmentByLab.length,1,'Only Assessment-mode attempts belong in assessment summary');
 assert(body.latestAssessmentByLab.every(x=>x.mode==='assessment'));
 assert(!body.latestAssessmentByLab.some(x=>x.labId==='F1-C02-L01'),'Practice score must never masquerade as Assessment score');
 assert(body.latestByLab.some(x=>x.labId==='F1-C02-L01'&&x.score===72));
 assert.equal(body.truncated,false);
 assert.equal(body.recentCompleted.length,100);
 assert.equal(calls,2,'Two exact pages required to retrieve 251 results');
 assert.equal(body.masteryAwarded,false);
 assert(!JSON.stringify(body).includes('answer_key'));
 flag='restricted';const before=reads;
 resp=await onRequest({request:request(),env});
 assert.equal(resp.status,403);
 assert.equal(reads,before,'Restricted user cannot query history');
 console.log('PASS D13 member grade history: >500-cap pagination, latest Lab not lost, tenant scope, safe result bounds, denied accounts and no key leakage');
}finally{globalThis.fetch=original}
