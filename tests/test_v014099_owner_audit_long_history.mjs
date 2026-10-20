import assert from 'node:assert/strict';
import {loadOwnerLabAudit} from '../functions/_lib/owner-lab-readiness-v01493.js';
const labs=Array.from({length:419},(_,i)=>({
 lab_id:'SITE-'+String(i+1).padStart(3,'0'),title:'Existing original site Lab '+i,
 active:true,registry_visible:true,metadata:{
  what:'Observe the defined market concept',why:'Build a testable interpretation',
  when:'Before revealing later outcomes',objective:'State invalidation and facts',
  how:['Inspect only revealed data','Compare to prior evidence','Record decision'],questions:['What is observed?']}
}));
const rubrics=[];
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
for(const lab of labs){
 rubrics.push({lab_id:lab.lab_id,version:96,review_state:'draft',
  questions:[{id:'A'}],answer_key:{A:'SECRET_DRAFT'}});
 rubrics.push({lab_id:lab.lab_id,version:9,review_state:'reviewed',reviewed_by:owner,
  reviewed_at:'2026-10-19T00:00:00Z',questions:[{id:'Q'}],answer_key:{Q:'PRIVATE_REVIEWED_KEY'}});
 rubrics.push({lab_id:lab.lab_id,version:8,review_state:'draft',
  questions:[{id:'B'}],answer_key:{B:'SECRET_OLD_DRAFT'}});
}
rubrics.sort((a,b)=>a.lab_id.localeCompare(b.lab_id)||b.version-a.version);
const mapDatasets=labs.map(l=>({dataset_code:'GUSIM_'+l.lab_id.replaceAll('-','_'),ticker:'SIMULATION',
 status:'published',dataset_type:'ohlcv',source_attribution:'Original fictional case',
 license_note:'Owner authored',metadata:{original_synthetic:true,historical_evidence_verified:false,
 evidence_verified:true,licensed_for_member_display:true,corporate_action_policy:'Not applicable'}}));
let calls=0,offsets=[];
async function db(path){
 calls++;
 if(path.startsWith('platform_labs?'))return labs;
 if(path.startsWith('lab_instruction_v014?'))return [];
 if(path.startsWith('historical_context_envelopes?'))return [];
 if(path.startsWith('market_datasets?'))return mapDatasets;
 if(path.startsWith('lab_training_sets_v014?')){
  const limit=Number(/limit=(\d+)/.exec(path)?.[1]),offset=Number(/offset=(\d+)/.exec(path)?.[1]);
  assert.equal(limit,250);
  offsets.push(offset);
  return rubrics.slice(offset,offset+limit);
 }
 throw Error('Unexpected audit query '+path);
}
const result=await loadOwnerLabAudit(db);
assert.equal(result.available,true);
assert.equal(result.registryCount,419);
assert.equal(result.sourceCountMatches,true);
assert.equal(result.breakdown.existingDetailedNarratives,419);
assert.equal(result.breakdown.reviewedRubrics,419);
assert.equal(result.breakdown.originalDraftRubrics,419);
assert.equal(result.breakdown.originalSimulationReady,419);
assert.equal(result.breakdown.independentlyVerifiedHistoricalContext,0);
assert.equal(result.certifiedComplete,0);
assert(result.rows.every(x=>x.stage==='MISSING_LICENSED_HISTORICAL_CONTEXT'));
assert(!JSON.stringify(result).includes('SECRET_OLD_DRAFT'));
assert(!JSON.stringify(result).includes('PRIVATE_REVIEWED_KEY'));
assert.deepEqual(offsets,[0,250,500,750,1000,1250]);
assert(calls>=9);
console.log('PASS v99 Owner audit: 419 canonical Labs, 1257 source rubric versions, no 1000-row truncation, correct drafted/reviewed/synthetic/historical separation, no private keys in response.');
