import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedHistoricalDataset} from '../functions/_lib/verified-historical-dataset-v014143.js';
const parse=file=>{const [header,...lines]=readFileSync(file,'utf8').trim().split(/\r?\n/);const keys=header.split(',');return lines.map(l=>Object.fromEntries(l.split(',').map((v,i)=>[keys[i],v])))};
const rows=parse('docs/research/HISTORICAL_REPLAY_ALL_89_SOURCE_CANDIDATES_20261028.csv');
const prior=parse('docs/research/HISTORICAL_REPLAY_78_SOURCE_CANDIDATES_20261028.csv');
assert.equal(rows.length,89);
assert.equal(prior.length,78,'Do not rewrite the verified first-batch research');
assert.equal(new Set(rows.map(r=>r.dataset_code)).size,89);
for(const first of prior)assert(rows.some(x=>x.dataset_code===first.dataset_code),'First batch records must survive expansion');
const continuous=rows.filter(x=>x.provider_continuity==='PROVIDER_WINDOW_CONTIGUOUS');
const exception=rows.filter(x=>x.provider_continuity==='PROVIDER_WINDOW_INCOMPLETE');
assert.equal(continuous.length,83);
assert.equal(exception.length,6);
assert.deepEqual(exception.map(x=>x.ticker).sort(),['GME','GPRO','HUBC','KOSS','LOW','NOK'].sort());
for(const x of rows){
 assert.match(x.dataset_code,/^HR_[A-Z0-9]+_20\d{6}$/);
 assert.match(x.trading_date,/^20\d\d-\d\d-\d\d$/);
 assert.match(x.canonical_lab_id,/^(F[123]|DT|TAPE|SITE)-\w+/);
 assert.equal(x.redistribution_rights,'NOT_APPROVED');
 assert.equal(x.publication_status,'DRAFT_ONLY');
 assert.equal(x.independent_verification,'PENDING');
 assert.equal(verifiedHistoricalDataset({status:'draft',ticker:x.ticker,dataset_type:'ohlcv',metadata:{real_market_security:true,licensed_for_member_display:false}}),false);
}
assert.equal(rows.find(r=>r.ticker==='DIS'&&r.trading_date==='2024-05-07')?.canonical_lab_id,'F1-C02-L02');
console.log('PASS: 89 distinct historical ticker/date cases, 83 provider-continuous windows, six sparse exceptions, all unlicensed and draft-only.');
