/* D09 Source-only: never send or store a raw member question for gap analytics */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyUnansweredTopic,recordTutorGap} from '../functions/_lib/tutor-gap-tracking-v014149.js';
import {onRequest as owner} from '../functions/api/owner-tutor-feedback.js';
assert.equal(classifyUnansweredTopic('How do I read VWAP?'),'charting');
assert.equal(classifyUnansweredTopic('What is the bid ask spread?'),'order_flow');
assert.equal(classifyUnansweredTopic('How does MAE affect my risk?'),'risk');
assert.equal(classifyUnansweredTopic('Where are the bootcamp exercises?'),'learning_platform');
assert.equal(classifyUnansweredTopic('not covered by these approved topics'),'other');
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_SECRET_KEY:'sb_secret_synthetic',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic'};
const calls=[];let roles=[{role_code:'OWNER',expires_at:null}],accountKind='member',status='active',success=true;
const original=globalThis.fetch;
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,options={})=>{
 const x=String(url);calls.push({url:x,options});
 if(x.endsWith('/auth/v1/user'))return json({id:uid});
 if(x.includes('/profiles?'))return json([{account_kind:accountKind}]);
 if(x.includes('/admin_user_roles?'))return json(roles);
 if(x.includes('/admin_user_flags?'))return json([{status}]);
 if(x.includes('/rpc/gu_v014149_record_tutor_gap'))
  return success?json(true):json({message:'not installed'},404);
 if(x.includes('/gu_tutor_gap_aggregate_v014149?'))
  return json([{month_utc:'2026-10-01',topic_code:'charting',question_mode:'explain',total:7}]);
 throw Error('Unexpected external call '+x);
};
const req=(method='GET')=>new Request('https://example.test/api/owner-tutor-feedback?view=unanswered',{
 method,headers:{authorization:'Bearer synthetic-owner'}});
try{
 const sentence='What does VWAP mean; my account UUID is private and my trade plan is private';
 assert.equal(await recordTutorGap(env,sentence,'explain'),true);
 const call=calls.find(x=>x.url.includes('rpc/gu_v014149_record_tutor_gap'));
 assert.deepEqual(JSON.parse(call.options.body),{p_topic:'charting',p_mode:'explain'});
 assert(!call.options.body.includes('my account')&&!call.options.body.includes(uid));
 assert.equal(call.options.headers.apikey,env.SUPABASE_SECRET_KEY);
 assert.equal(call.options.headers.authorization,undefined);
 assert.equal(await recordTutorGap(env,sentence,'malformed_mode'),false);
 assert.equal(calls.filter(x=>x.url.includes('record_tutor_gap')).length,1);
 success=false;assert.equal(await recordTutorGap(env,sentence,'question'),false);success=true;
 let result=await owner({request:req(),env}),body=await result.json();
 assert.equal(result.status,200);assert.equal(body.counts.length,1);
 assert.equal(body.counts[0].unansweredCount,7);
 assert(!JSON.stringify(body).includes(uid));
 result=await owner({request:req('POST'),env});assert.equal(result.status,405);
 roles=[{role_code:'ADMIN',expires_at:null}];
 result=await owner({request:req(),env});assert.equal(result.status,403);
 roles=[{role_code:'OWNER',expires_at:null}];status='restricted';
 result=await owner({request:req(),env});assert.equal(result.status,403);
 status='active';accountKind='showcase';
 result=await owner({request:req(),env});assert.equal(result.status,403);
 accountKind='member';
 const sql=readFileSync(new URL('../supabase/migrations/v0.14.0.149_TUTOR_CONVERSATIONS_OWNER_REVIEW_REQUIRED.sql',import.meta.url),'utf8');
 for(const key of ['gu_tutor_gap_aggregate_v014149','p_topic','month_utc','REVOKE ALL','GRANT EXECUTE','gu_v014149_record_tutor_gap'])
  assert(sql.includes(key));
 const js=readFileSync(new URL('../assets/js/admin-tutor-feedback-v014147.js',import.meta.url),'utf8');
 assert(js.includes('?view=unanswered')&&js.includes('textContent'));
 console.log('PASS D09: aggregate-only unanswered topics, denied non-Owners, server-only metrics, approved SQL gate.');
}finally{globalThis.fetch=original}
