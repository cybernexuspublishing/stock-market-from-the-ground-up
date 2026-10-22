import assert from 'node:assert/strict';
import {strictTradingDate,validateHistoricalOhlcv} from '../functions/_lib/market-data-integrity-v014150.js';
import {readFileSync} from 'node:fs';
const req={startDate:'2026-10-22',endDate:'2026-10-22'};
const first={date:'2026-10-22T09:30:00-04:00',open:9.5,high:10,low:9,close:9.7,volume:250};
const late={date:'2026-10-23T00:00:00Z',open:9.7,high:9.9,low:9.6,close:9.8,volume:0};
const sample=validateHistoricalOhlcv([first,late],req);
assert.equal(sample.length,2);
assert.equal(sample[0].timestamp,'2026-10-22T13:30:00.000Z');
assert.equal(sample[1].timestamp,'2026-10-23T00:00:00.000Z',
 'UTC next-day late bar is still the requested NY trading date');
assert.equal(validateHistoricalOhlcv([],req).length,0,'Do not fill real history with synthetic bars');
for(const bad of ['2026-02-30','2026-13-01','2026-00-11','2026-10-99'])
 assert.throws(()=>strictTradingDate(bad),/Invalid calendar date/);
assert.equal(strictTradingDate('2026-10-22'),'2026-10-22');
const invalidRows=[
 [[late,first],/strictly chronological/],
 [[first,first],/duplicate/],
 [[{...first,date:'2026-10-22T09:30:00'}],/time-zone offset/],
 [[{...first,date:'2026-10-23T04:01:00Z'}],/outside requested/],
 [[{...first,volume:undefined}],/missing or nonnumeric/],
 [[{...first,volume:0.5}],/invalid reported share volume/],
 [[{...first,low:10.1}],/impossible prices/],
 [[{...first,open:NaN}],/missing or nonnumeric/],
 [[{...first,volume:'300'}],/missing or nonnumeric/]
];
for(const [rows,error] of invalidRows)
 assert.throws(()=>validateHistoricalOhlcv(rows,req),error);
assert.throws(()=>validateHistoricalOhlcv([first],{startDate:'2026-10-25',endDate:'2026-10-22'}),/date range/);
assert.throws(()=>validateHistoricalOhlcv([first],{startDate:'2026-01-01',endDate:'2026-03-01'}),/date range/);
const api=readFileSync('functions/api/marketdata.js','utf8');
assert.match(api,/validateHistoricalOhlcv\(rows,\{startDate:start,endDate:end\}\)/);
assert.match(api,/approvedForOfficialReplay:false/);
assert.match(api,/licensedForMemberWidePublication:false/);
assert.match(api,/must NEVER be used to certify no-lookahead assessment replay/);
console.log('PASS D10 strict provider trading dates (New York and DST), sequence, zero filling, volume/price integrity and replay rights gates');
