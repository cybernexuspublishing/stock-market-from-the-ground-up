import assert from 'node:assert/strict';
import {verifiedHistoricalDataset,replayAvailableToEntitlement,historicalQaReleasePermitted} from '../functions/_lib/verified-historical-dataset-v014143.js';
import {readFileSync} from 'node:fs';
const d={dataset_code:'IEX_AAPL_20261007',ticker:'AAPL',status:'published',dataset_type:'ohlcv',
 source_attribution:'Data provided for free by IEX',license_note:'Reviewed restricted educational distribution',
 metadata:{original_synthetic:false,real_market_security:true,evidence_verified:true,
 historical_evidence_verified:true,licensed_for_member_display:true,
 trading_conditions_reviewed:true,packet_integrity_reviewed:true,
 corporate_actions_reviewed:true,license_publication_reviewed:true,ondemand_training_approved:false,
 corporate_action_policy:'Raw / splits checked',data_source:'IEX_HIST',
 venue_scope:'IEX_SINGLE_VENUE',source_date:'2026-10-07',source_sha256:'a'.repeat(64),
 reviewed_by:'Owner verification evidence',reviewed_at:'2026-10-21T13:00:00Z'}};
assert(verifiedHistoricalDataset(d));
assert(replayAvailableToEntitlement(d,'MARKET_SIMULATOR'));
assert(!replayAvailableToEntitlement(d,'ONDEMAND_TRAINING'));
assert(replayAvailableToEntitlement({...d,metadata:{...d.metadata,ondemand_training_approved:true}},'ONDEMAND_TRAINING'));
for(const [label,bad] of [
 ['synthetic',{original_synthetic:true}],
 ['not historical',{historical_evidence_verified:false}],
 ['unreviewed license',{license_publication_reviewed:false}],
 ['unreviewed market flags',{trading_conditions_reviewed:false}],
 ['incomplete packet evidence',{packet_integrity_reviewed:false}],
 ['unreviewed adjustments',{corporate_actions_reviewed:false}],
 ['invalid sha',{source_sha256:'fake'}],
 ['wrong scope',{venue_scope:'SIP_CONSOLIDATED'}],
 ['missing actor',{reviewed_by:''}],
 ['member access revoked',{licensed_for_member_display:false}]
]){
 assert.equal(verifiedHistoricalDataset({...d,metadata:{...d.metadata,...bad}}),false,label);
}
assert(!verifiedHistoricalDataset({...d,status:'draft'}));
assert(!verifiedHistoricalDataset({...d,source_attribution:''}));
assert(readFileSync('scripts/market-data/prepare_replay_import.py','utf8').includes("'status':'draft'"));

const qa='f42f9301-18e6-43a3-8531-32d371fd22c1';
const visitor='00000000-0000-4000-8000-000000000222';
const unpublished={...d,metadata:{...d.metadata,qa_release_only:true,qa_allowed_user_ids:[qa]}};
assert(historicalQaReleasePermitted(unpublished,qa));
assert(!historicalQaReleasePermitted(unpublished,visitor));
assert(!historicalQaReleasePermitted(unpublished,null));
assert(historicalQaReleasePermitted(d,visitor));
for(const wrong of ['true',null,1,{},[]]){
 assert.equal(historicalQaReleasePermitted({...d,metadata:{...d.metadata,qa_release_only:wrong}},qa),false);
}
assert.equal(historicalQaReleasePermitted({...unpublished,metadata:{...unpublished.metadata,qa_allowed_user_ids:[]}},qa),false);

const replaySource=readFileSync('functions/api/learning-replay-v01492.js','utf8');
const rightsReads=(replaySource.match(/market_datasets\?select=dataset_code,ticker,dataset_type,status,source_attribution,license_note,metadata&dataset_code=eq\./g)||[]).length;
assert.equal(rightsReads,2,'Every protected historical rights recheck must retrieve the ticker');
assert(!replaySource.includes('market_datasets?select=dataset_code,dataset_type,status,source_attribution,license_note,metadata&dataset_code=eq.'),
 'Ticker omission would incorrectly deny a valid signed-in historical replay');
console.log('PASS v143: authentic-source data gate, spoofed provenance rejection, free IEX scope and paid entitlement separation');
