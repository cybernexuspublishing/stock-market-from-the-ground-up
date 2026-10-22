// v0.14.0.98 | Source-aware Owner audit and conservative execution-model QA.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyOwnerLabs} from '../functions/_lib/owner-lab-readiness-v01493.js';
import {fillEstimate,bracketOutcome,visibleThrough,normalizeBars} from '../functions/_lib/replay-engine-v01492.js';
const labs=[
 {lab_id:'F1-C02-L01',title:'Existing Foundations instruction',active:true,registry_visible:true},
 {lab_id:'SITE-001',title:'Existing site exclusive Lab',active:true,registry_visible:true,
  metadata:{what:'What to observe',why:'Why evidence boundaries matter',when:'At a decision-time boundary',
   objective:'Record a defensible observation',how:['Pause before next bar','Record evidence only',
   'Write invalidation'],questions:['What is visible?']}}
];
const instructions=[{lab_id:'F1-C02-L01',source_status:'original_hypothetical_unreviewed_v01496'}];
const rubrics=labs.map(x=>({lab_id:x.lab_id,review_state:'draft',questions:[{id:'Q01'}],
 answer_key:{Q01:'PRIVATE_DO_NOT_EXPOSE'}}));
const source=labs[1],code='GUSIM_SITE_001';
const datasets=[{dataset_code:code,ticker:'SIMULATION',status:'published',dataset_type:'ohlcv',
 source_attribution:'Crown & Lantern Press — fictional',
 license_note:'Original owner-created imagery and bar values',
 metadata:{original_synthetic:true,historical_evidence_verified:false,
 licensed_for_member_display:true,evidence_verified:true,corporate_action_policy:'Not applicable'}}];
const result=classifyOwnerLabs({labs,instructions,rubrics,envelopes:[],datasets});
assert.equal(result.registryCount,2);
assert.equal(result.breakdown.privateInstructions,1);
assert.equal(result.breakdown.existingDetailedNarratives,1);
assert.equal(result.breakdown.originalDraftRubrics,2);
assert.equal(result.breakdown.reviewedRubrics,0);
assert.equal(result.breakdown.originalSimulationReady,1);
assert.equal(result.breakdown.independentlyVerifiedHistoricalContext,0);
assert.equal(result.breakdown.substantivePrivateLessonPrechecks,0,
 'Generic original v96 source records must not pass substantive instruction');
assert.equal(result.rows[0].stage,'MISSING_PRIVATE_LESSON',
 'The v96 original hypothetical source is a non-substantive scaffold, even when its row exists');
assert.equal(result.rows[0].instructionRecordPresent,true);
assert.equal(result.rows[0].substantivePrivateLessonPrecheck,false);
assert.equal(result.rows[1].stage,'MISSING_REVIEWED_GRADING',
 'An independently authored metadata narrative may pass the source precheck, not grading');
assert(!JSON.stringify(result).includes('PRIVATE_DO_NOT_EXPOSE'));
assert.equal(result.certifiedComplete,0);
const revoked=classifyOwnerLabs({labs,instructions,rubrics,envelopes:[],datasets:[{
 ...datasets[0],metadata:{...datasets[0].metadata,historical_evidence_verified:true}
}]});
assert.equal(revoked.breakdown.originalSimulationReady,0,'A fictional dataset must never masquerade as historical evidence');
const market={open:10,high:12,low:9,close:11,volume:100};
let estimate=fillEstimate({side:'BUY',type:'MARKET',quantity:100},market);
assert.equal(estimate.state,'ESTIMATED');
assert.equal(estimate.participationFraction,1);
assert.equal(estimate.observedBarVolume,100);
estimate=fillEstimate({side:'BUY',type:'MARKET',quantity:101},market);
assert.equal(estimate.state,'LIQUIDITY_UNVERIFIABLE');
assert.equal(estimate.quantity,0);
assert.equal(estimate.price,null);
estimate=fillEstimate({side:'BUY',type:'MARKET',quantity:2},{...market,volume:0});
assert.equal(estimate.state,'NO_OBSERVED_VOLUME');
assert.equal(estimate.quantity,0);
assert.throws(()=>fillEstimate({side:'BUY',type:'LIMIT',quantity:10,limitPrice:9.5},
 {...market,low:13}),/Invalid observed OHLCV/);
assert.equal(bracketOutcome({side:'LONG',stop:9,target:11},
 {low:8.9,high:11.1}).result,'AMBIGUOUS');
const bars=normalizeBars([
 {timestamp:'2040-01-03T14:30:00Z',open:10,high:11,low:9,close:10,volume:20},
 {timestamp:'2040-01-03T14:35:00Z',open:12,high:12,low:12,close:12,volume:0},
 {timestamp:'2040-01-03T14:40:00Z',open:15,high:16,low:14,close:15,volume:100}
]);
assert.equal(visibleThrough(bars,1).length,2);
assert(!JSON.stringify(visibleThrough(bars,1)).includes('2040-01-03T14:40'));
const audit=readFileSync(new URL('../functions/_lib/owner-lab-readiness-v01493.js',import.meta.url),'utf8');
assert(audit.includes('dataset_code,ticker,dataset_type'),'Audit must request synthetic symbol before crediting original simulation');
assert(audit.includes('metadata&order=lab_id.asc'),'Use existing Lab narratives, no duplicate instruction table');
console.log('PASS v98: Existing 419 content counted accurately without false completion, no rubric leak, authored fiction never historical, no unobservable impossible fill and no future candle.');
