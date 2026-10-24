import test from 'node:test';
import assert from 'node:assert/strict';
import {certificateEligibility,earlyMaterialAccess,validateImprovementVote,visibleFoundingNotice,expirePremiumPreserveProgress,qualifyingInterruption} from '../functions/_lib/founding600-benefit-guards-v014170.mjs';
const u='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',at='2026-10-24T16:00:00Z';
const f={userId:u,accountKind:'member',founderNumber:600,founderTier:'FOUNDING_60',subscriptionActive:true,paidFrom:'2026-10-01T00:00:00Z',paidThrough:'2026-12-01T00:00:00Z',restricted:false,showcase:false};
test('verified completion only and never a professional license',()=>{
 const r=certificateEligibility({founder:f,trackCode:'FOUNDING_EXTENDED',evidence:{userId:u,trackCode:'FOUNDING_EXTENDED',reviewed:true,independentlyCompleted:true,verifiedEvidenceId:'checked-123'}});
 assert.equal(r.professionalCredential,false);
 assert.throws(()=>certificateEligibility({founder:f,trackCode:'FOUNDING_EXTENDED',evidence:{userId:other}}),/VERIFIED_COMPLETION_REQUIRED/);
});
test('reviewed and rights-cleared Extended previews only',()=>{
 const r={state:'reviewed',rightsCleared:true,publishedAt:'2026-10-01T00:00:00Z',audience:'FOUNDING_EXTENDED'};
 assert.equal(earlyMaterialAccess({founder:f,resource:r,now:at}),true);
 assert.equal(earlyMaterialAccess({founder:{...f,founderTier:'FOUNDING_30'},resource:r,now:at}),false);
 assert.equal(earlyMaterialAccess({founder:f,resource:{...r,rightsCleared:false},now:at}),false);
});
test('equal vote weight, no repeat vote, no expired ballot',()=>{
 const b={id:'ballot',status:'open',opensAt:'2026-10-01T00:00:00Z',closesAt:'2026-11-01T00:00:00Z',options:['charts','lessons']};
 assert.equal(validateImprovementVote({founder:f,ballot:b,choice:'charts',now:at}).weight,1);
 assert.throws(()=>validateImprovementVote({founder:f,ballot:b,choice:'charts',priorVote:{},now:at}),/ALREADY_VOTED/);
});
test('priority announcements restricted to intended audience',()=>{
 const n={published:true,audience:'FOUNDER_EXTENDED',startsAt:'2026-10-01T00:00:00Z'};
 assert.equal(visibleFoundingNotice({founder:f,notice:n,now:at}),true);
 assert.equal(visibleFoundingNotice({founder:{...f,founderTier:'FOUNDING_30'},notice:n,now:at}),false);
});
test('expiry of premium access does not erase own progress',()=>{
 const r=expirePremiumPreserveProgress({founder:f,progress:[{id:'L1',userId:u}]});
 assert.deepEqual(r.preservedProgressIds,['L1']);
 assert.equal(r.premiumAccess,false);
 assert.throws(()=>expirePremiumPreserveProgress({founder:f,progress:[{id:'L2',userId:other}]}),/CROSS_MEMBER_RECORD/);
});
test('service protection uses verified incident and one grant per member',()=>{
 const i={id:'33333333-3333-4333-8333-333333333333',verified:true,qualifying:true,startedAt:'2026-10-20T12:00:00Z',endedAt:'2026-10-20T18:00:00Z',extensionSeconds:21600};
 assert.equal(qualifyingInterruption({founder:f,incident:i,now:at}).extensionSeconds,21600);
 assert.throws(()=>qualifyingInterruption({founder:f,incident:i,alreadyCredited:true,now:at}),/INCIDENT_ALREADY_CREDITED/);
});
test('showcase account cannot access founder benefits',()=>{
 assert.throws(()=>expirePremiumPreserveProgress({founder:{...f,showcase:true},progress:[]}),/INELIGIBLE_FOUNDER/);
});
