import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifiedHistoricalDataset} from '../functions/_lib/verified-historical-dataset-v014143.js';
const rows=readFileSync('docs/research/HISTORICAL_REPLAY_78_SOURCE_CANDIDATES_20261028.csv','utf8').trim().split(/\r?\n/);
assert.equal(rows.length,79,'Exactly 78 historical candidates plus one header are required');
const cols=rows.shift().split(',');
const data=rows.map(x=>Object.fromEntries(x.split(',').map((v,i)=>[cols[i],v])));
const unique=new Set(data.map(x=>x.dataset_code));
assert.equal(unique.size,78,'Never duplicate dataset identities');
const completed=data.filter(x=>x.provider_continuity==='PROVIDER_WINDOW_CONTIGUOUS');
const exceptions=data.filter(x=>x.provider_continuity==='PROVIDER_WINDOW_INCOMPLETE');
assert.equal(completed.length,73);
assert.equal(exceptions.length,5);
assert.deepEqual(exceptions.map(x=>x.ticker).sort(),['GME','GPRO','KOSS','LOW','NOK'].sort());
for(const row of data){
 assert.match(row.dataset_code,/^HR_[A-Z0-9]+_2024\d{4}$/);
 assert.match(row.canonical_lab_id,/^(?:F\d|DT)-C\d\d-L\d\d$/);
 assert.match(row.trading_date,/^2024-\d\d-\d\d$/);
 assert.equal(row.redistribution_rights,'NOT_APPROVED');
 assert.equal(row.independent_verification,'PENDING');
 assert.equal(row.publication_status,'DRAFT_ONLY');
 assert.equal(verifiedHistoricalDataset({status:'draft',dataset_type:'ohlcv',ticker:row.ticker,metadata:{real_market_security:true,licensed_for_member_display:false}}),false,'Candidate must never unlock as verified');
}
assert.equal(data.find(x=>x.ticker==='DIS'&&x.trading_date==='2024-05-07')?.canonical_lab_id,'F1-C02-L02');
console.log('PASS: 78 canonical source candidates, 73 continuous opening windows, 5 explicit sparse exceptions, no redistribution approval or publication.');
