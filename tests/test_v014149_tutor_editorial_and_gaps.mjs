import assert from 'node:assert/strict';
import {onRequest as caseEndpoint} from '../functions/api/owner-tutor-case.js';
import {onRequest as gapEndpoint} from '../functions/api/owner-tutor-topic-gaps.js';
import {onRequest as oldFeedback} from '../functions/api/owner-tutor-feedback.js';
import {classifyTutorGap,recordTutorGap} from '../functions/_lib/tutor-gaps-v014149.js';
import {readFileSync} from 'node:fs';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const report='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',caseId='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SECRET_KEY:'sb_secret_test'};
let role='OWNER',kind='member',flag='active',reviewWrites=0,gapWrites=0,recordedTopic='';
const previous=globalThis.fetch;
const json=(v,s=200,more={})=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json',...more}});
globalThis.fetch=async(url,init={})=>{
 const u=String(url);
 if(u.endsWith('/auth/v1/user'))return json({id:uid});
 if(u.includes('/profiles?'))return json([{account_kind:kind}]);
 if(u.includes('/admin_user_flags?'))return json([{status:flag}]);
 if(u.includes('/admin_user_roles?'))return json([{role_code:role,expires_at:null}]);
 if(u.includes('/gu_member_tutor_exchanges_v014102?'))return json([
   {id:report,feedback:'report',feedback_note:'Needs clearer source.',
    source_titles:['VWAP'],created_at:'2026-10-22T00:00:00Z',
    feedback_at:'2026-10-22T00:00:00Z',generation:'verified:original-competency-guide',
    question:'private question',user_id:uid}],200,{'content-range':'0-0/1'});
 if(u.includes('/gu_tutor_editorial_cases_v014149?'))return json([{exchange_id:report,status:'investigating',resolution:null,
 updated_at:'2026-10-22T00:00:00Z'}]);
 if(u.includes('/rpc/gu_v014149_review_tutor_case')){
  reviewWrites++;const b=JSON.parse(init.body);assert.equal(b.p_actor,uid);
  assert.equal(b.p_exchange,report);assert.equal(b.p_status,'resolved');
  assert.equal(b.p_resolution,'instruction_clarified');
  return json({ok:true,case_id:caseId,unchanged:false});
 }
 if(u.includes('/gu_tutor_topic_gaps_v014149?'))
  return json([{topic:'risk',day_utc:'2026-10-22',requests:3},{topic:'other',day_utc:'2026-10-22',requests:1}]);
 if(u.includes('/rpc/gu_v014149_record_tutor_gap')){
  gapWrites++;recordedTopic=JSON.parse(init.body).p_topic;return json(null);
 }
 throw Error('Unexpected endpoint '+u);
};
const get=(path,method='GET',body,headers={})=>new Request('https://school.test/api/'+path,{method,
 headers:{authorization:'Bearer owner','content-type':'application/json',...headers},
 ...(body?{body:JSON.stringify(body)}:{})});
try{
 assert.equal(classifyTutorGap('Can you explain a previously unseen VWAP puzzle?'),'vwap');
 assert.equal(classifyTutorGap('Tell me about the history of financial taxes'),'other');
 assert.equal(await recordTutorGap(env,'How do I interpret an entirely new strange concept?'),true);
 assert.equal(recordedTopic,'other');assert.equal(gapWrites,1);
 let r=await oldFeedback({env,request:get('owner-tutor-feedback')});
 assert.equal(r.status,200);let d=await r.json();
 assert.equal(d.reports.length,1);assert.equal(d.reports[0].id,report);assert(!JSON.stringify(d).includes(uid));
 assert(!JSON.stringify(d).includes('private question'));
 r=await caseEndpoint({env,request:get('owner-tutor-case?ids='+report)});
 assert.equal(r.status,200);d=await r.json();
 assert.equal(d.cases.length,1);assert.equal(d.cases[0].status,'investigating');
 r=await caseEndpoint({env,request:get('owner-tutor-case','POST',
   {reportId:report,status:'resolved',resolution:'instruction_clarified'})});
 assert.equal(r.status,200);assert.equal(reviewWrites,1);
 r=await caseEndpoint({env,request:get('owner-tutor-case','POST',
   {reportId:report,status:'resolved',resolution:'instruction_clarified'},{origin:'https://evil.test'})});
 assert.equal(r.status,403);assert.equal(reviewWrites,1);
 r=await caseEndpoint({env,request:get('owner-tutor-case','POST',
   {reportId:report,status:'resolved',resolution:null})});
 assert.equal(r.status,400);assert.equal(reviewWrites,1);
 r=await gapEndpoint({env,request:get('owner-tutor-topic-gaps')});
 assert.equal(r.status,200);d=await r.json();
 assert.equal(d.totals[0].topic,'risk');assert.equal(d.totals[0].count,3);
 assert.equal(JSON.stringify(d).includes(uid),false);
 role='MODERATOR';r=await caseEndpoint({env,request:get('owner-tutor-case?ids='+report)});
 assert.equal(r.status,403);
 role='OWNER';kind='showcase';r=await gapEndpoint({env,request:get('owner-tutor-topic-gaps')});
 assert.equal(r.status,403);
 kind='member';flag='suspended';r=await caseEndpoint({env,request:get('owner-tutor-case?ids='+report)});
 assert.equal(r.status,403);
 const sql=readFileSync('supabase/migrations/v0.14.0.149b_TUTOR_EDITORIAL_AND_GAPS_OWNER_REVIEW_REQUIRED.sql','utf8');
 for(const marker of ['ENABLE ROW LEVEL SECURITY','REVOKE ALL','gu_v014149_review_tutor_case',
   'gu_v014149_record_tutor_gap','gu_tutor_editorial_audit_v014149','ON CONFLICT(topic,day_utc)'])
  assert(sql.includes(marker),'Missing SQL security/audit requirement '+marker);
 const ui=readFileSync('assets/js/admin-tutor-feedback-v014147.js','utf8');
 assert(ui.includes('owner-tutor-case')&&ui.includes('owner-tutor-topic-gaps'));
 assert(!ui.includes('innerHTML='),'No markup injection in Owner feedback workspace');
 console.log('PASS D09 owner-only audited report resolution, unanswered tag-only counters, security and privacy');
}finally{globalThis.fetch=previous}
