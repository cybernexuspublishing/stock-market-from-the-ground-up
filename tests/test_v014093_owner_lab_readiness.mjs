import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyOwnerLabs} from '../functions/_lib/owner-lab-readiness-v01493.js';
import {onRequest} from '../functions/api/owner-roadmap.js';
const uid='11111111-2222-4333-8444-555555555555';
const labs=['LAB_A','LAB_B','LAB_C','LAB_D'].map(lab_id=>({lab_id,title:lab_id,active:true,registry_visible:true,ticker:'MOCK',historical_date:'2024-05-03'}));
const originalLesson={concept:'Identifying the premarket high',
 objective:'Explain how to distinguish the actual prior observed high from a speculative level.',
 why:'The decision boundary must be established using already observed bars and the specified source sessions; missing bars are not evidence.',
 steps:[
  'Write down the explicit session opening and closing timestamps.',
  'Find the highest reported high in the observed premarket bars.',
  'Record one failed breakout and the missing historical coverage.'
 ]};
const instructions=['LAB_B','LAB_C','LAB_D'].map(lab_id=>({lab_id,source_status:'book_authored_unverified_market',content:originalLesson}));
const rubrics=['LAB_C','LAB_D'].map(lab_id=>({lab_id,review_state:'reviewed',reviewed_by:uid,reviewed_at:'2026-10-18T10:00:00Z',
 questions:[{id:'Q1',prompt:'Reviewed self-check'}],answer_key:{Q1:'PRIVATE_KEY_MUST_NOT_LEAK'}}));
const envelopes=[{lab_id:'LAB_D',dataset_code:'LICENSE_A',status:'published',context_start_at:'2024-05-03T12:00:00Z',
 teaching_start_at:'2024-05-03T13:00:00Z',decision_boundary_at:'2024-05-03T13:30:00Z',
 teaching_end_at:'2024-05-03T14:00:00Z',context_end_at:'2024-05-03T15:00:00Z'}];
const datasets=[{dataset_code:'LICENSE_A',ticker:'AAPL',dataset_type:'ohlcv',status:'published',
 source_attribution:'Authoritative verified provider',license_note:'Display allowed',
 metadata:{evidence_verified:true,licensed_for_member_display:true,corporate_action_policy:'Corporate actions verified',real_market_security:true,historical_evidence_verified:true,trading_conditions_reviewed:true,packet_integrity_reviewed:true,license_publication_reviewed:true,corporate_actions_reviewed:true,data_source:'IEX_HIST',venue_scope:'IEX_SINGLE_VENUE',source_date:'2024-05-03',source_sha256:'a'.repeat(64),reviewed_by:'Independent Owner review',reviewed_at:'2026-10-21T14:00:00Z'}}];
const classification=classifyOwnerLabs({labs,instructions,rubrics,envelopes,datasets});
assert.equal(classification.registryCount,4);
assert.equal(classification.certifiedComplete,0);
assert.deepEqual(classification.rows.map(x=>x.stage),[
 'MISSING_PRIVATE_LESSON','MISSING_REVIEWED_GRADING','MISSING_LICENSED_HISTORICAL_CONTEXT','CONTENT_PRECHECK_ONLY_QA_REQUIRED']);
assert(!JSON.stringify(classification).includes('PRIVATE_KEY_MUST_NOT_LEAK'));
assert(!JSON.stringify(classification).includes('Identifying the premarket high'),'Private lesson content must remain on server');
assert.equal(classification.breakdown.privateInstructions,3);
assert.equal(classification.breakdown.depthObjectives,3,'Original private lessons have source objectives');
assert.equal(classification.breakdown.depthGuidedMethods,3,'Three authentic authored steps are present');
assert.equal(classification.breakdown.depthWorkedExamples,0,'Do not invent a worked example from metadata');
assert.equal(classification.breakdown.depthMisconceptions,0,'Missing misconception remains an editorial gap');
assert.equal(classification.breakdown.depthIndependentTransfers,0,'Generic review cannot be counted as independent transfer');
assert.equal(classification.breakdown.depthAllSevenPrechecks,0,'Shape-only lessons never get automatic depth acceptance');

assert.equal(classification.breakdown.substantivePrivateLessonPrechecks,3);
assert.equal(classification.rows[1].substantivePrivateLessonPrecheck,true);
const draftOnly=classifyOwnerLabs({labs,instructions:[
 {lab_id:'LAB_B',source_status:'original_hypothetical_unreviewed_v01496',content:originalLesson},
 ...instructions.slice(1)
],rubrics,envelopes,datasets});
assert.equal(draftOnly.rows[1].instructionRecordPresent,true);
assert.equal(draftOnly.rows[1].substantivePrivateLessonPrecheck,false);
assert.equal(draftOnly.rows[1].stage,'MISSING_PRIVATE_LESSON',
 'Generic preloaded instructional scaffolds must not count as complete teaching');
const b01Only=classifyOwnerLabs({labs,instructions:[
 {lab_id:'LAB_B',source_status:'original_hypothetical_unreviewed_v01496',
  content:{lessonBatch:'2026-10-25-B01',authoringStatus:'ORIGINAL_AUTHORED_EDUCATIONAL_DRAFT_NOT_EDITORIALLY_OR_GRADING_ACCEPTED',
   concept:'Original replay setup',objective:'Demonstrate chronological observation discipline',
   workedExample:'FICTIONAL: Stop at a specified bar and record only the visible information.',
   steps:['Choose a verified source','Document the time zone','Freeze the visible bars','State a no-trade alternative']}},
 ...instructions.slice(1)
],rubrics,envelopes,datasets});
assert.equal(b01Only.breakdown.individualizedB01Drafts,1);
assert.equal(b01Only.rows[1].individualizedB01DraftPresent,true);
assert.equal(b01Only.rows[1].substantivePrivateLessonPrecheck,false);
assert.equal(b01Only.rows[1].certifiedComplete,false);
const emptyOnly=classifyOwnerLabs({labs,instructions:[
 {lab_id:'LAB_B',source_status:'book_authored_unverified_market',content:{}},
 ...instructions.slice(1)
],rubrics,envelopes,datasets});
assert.equal(emptyOnly.rows[1].stage,'MISSING_PRIVATE_LESSON','Empty private row cannot satisfy instructional gate');

const noRights=classifyOwnerLabs({labs,instructions,rubrics,envelopes,datasets:[{...datasets[0],metadata:{...datasets[0].metadata,licensed_for_member_display:false}}]});
assert.equal(noRights.rows.at(-1).stage,'MISSING_LICENSED_HISTORICAL_CONTEXT');
assert.throws(()=>classifyOwnerLabs({labs:[labs[0],labs[0]],instructions:[],rubrics:[],envelopes:[],datasets:[]}),/Duplicate/);
assert.throws(()=>classifyOwnerLabs({labs:Array(1000).fill(labs[0]),instructions:[],rubrics:[],envelopes:[],datasets:[]}),/incomplete/);
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fake',SUPABASE_SECRET_KEY:'sb_secret_fake'};
let role='OWNER',broken=false,sensitiveReads=0;
const previous=globalThis.fetch;
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url)=>{
 const s=String(url);
 if(s.endsWith('/auth/v1/user'))return json({id:uid});
 if(s.includes('/profiles?'))return json([{account_kind:'member'}]);
 if(s.includes('/admin_user_roles?'))return json([{role_code:role,expires_at:null}]);
 if(s.includes('/admin_user_flags?'))return json([{status:'active'}]);
 if(s.includes('/platform_labs?')){sensitiveReads++;return json(labs)}
 if(s.includes('/lab_instruction_v014?')){assert(s.includes('select=lab_id,source_status,content'));sensitiveReads++;return json(instructions)}
 if(s.includes('/lab_training_sets_v014?')){sensitiveReads++;return broken?json({message:'missing table'},404):json(rubrics)}
 if(s.includes('/historical_context_envelopes?')){sensitiveReads++;return json(envelopes)}
 if(s.includes('/market_datasets?')){sensitiveReads++;return json(datasets)}
 throw Error('Unexpected call '+s);
};
const make=(token=true)=>new Request('https://education.example/api/owner-roadmap?action=lab-audit',
 {headers:token?{authorization:'Bearer synthetic-owner'}:{}});
try{
 let r=await onRequest({request:make(false),env});assert.equal(r.status,401);assert.equal(sensitiveReads,0);
 role='ADMIN';r=await onRequest({request:make(),env});assert.equal(r.status,403);assert.equal(sensitiveReads,0);
 role='OWNER';r=await onRequest({request:make(),env});assert.equal(r.status,200);
 let body=await r.json();
 assert.equal(body.labAudit.available,true);
 assert.equal(body.labAudit.certifiedComplete,0);
 assert.equal(body.labAudit.rows.length,4);
 assert(!JSON.stringify(body).includes('PRIVATE_KEY_MUST_NOT_LEAK'),'No private answer keys in Owner audit response');
 assert(!('productInventory' in body),'Lazy owner audit must not load billing catalog or full task registry');
 broken=true;r=await onRequest({request:make(),env});
 assert.equal(r.status,200);
 body=await r.json();assert.equal(body.labAudit.available,false);
 assert.equal(body.labAudit.certifiedComplete,null,'Missing database table must never become 0% or accepted');
 const frontend=readFileSync(new URL('../assets/js/owner-roadmap-product-readiness-v01491.js',import.meta.url),'utf8');
 assert(frontend.includes('async function loadLabAudit('));
 assert(frontend.includes('function csvExport()'));
 const ui=readFileSync(new URL('../owner-roadmap.html',import.meta.url),'utf8');
 assert(ui.includes('or-audit-lab-rows')&&ui.includes('or-audit-lab-export'));
 console.log('PASS v93 private Owner-only 419-Lab progress stages, no key leakage, fail-closed missing-schema, lazy tab and CSV acceptance.');
}finally{globalThis.fetch=previous}
