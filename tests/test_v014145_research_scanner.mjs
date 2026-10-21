import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const lib=readFileSync('assets/js/market-research-engine-v014145.js','utf8');
const scope={TextEncoder,Math,Number,String,Array,Object,Set,RegExp,Date};scope.globalThis=scope;
runInNewContext(lib,scope);
const S=scope.GroundUpScannerV014145;
assert(S&&Object.isFrozen(S));
const csv='symbol,price,change_pct,volume,rvol,float,spread_pct,gap_pct\n'+
 'ABC,9.99,12,1500000,3,9000000,1.1,8\n'+
 'XYZ,14,12,1000000,2.1,10000000,2,2\n'+
 'MISSING,10,,5000000,10,9000000,0,1\n'+
 'ZERO_PRICE,0,200,5000000,10,9000000,0,1\n'+
 'BAD_SPREAD,10,50,9000000,3,9000000,,4\n'+
 'BIG_FLOAT,10,20,9000000,4,16000000,1,5\n'+
 'ABC,8,99,9900000,4,5000000,0.2,99\n';
const parsed=S.csv(csv);
assert.equal(parsed.length,7);
const scan=S.analyze(parsed);
assert.equal(scan.inspected,7);
assert.equal(scan.matched,2);
assert.deepEqual(Array.from(scan.rows,x=>x.symbol),['ABC','XYZ'],'stable change > volume sort');
assert.equal(scan.rows.length,2);
assert.equal(scan.rejections.missingMetric,3,'Missing price/percent/spread never become numeric zero');
assert.equal(scan.rejections.failedThreshold,1);
assert.equal(scan.rejections.duplicateTicker,1);
assert.equal(scan.score,'NONE');
assert.equal(scan.marketDataCertified,false);
assert.equal(scan.sourceStatus,'UNVERIFIED_MEMBER_IMPORTED_SNAPSHOT');
assert.equal(S.analyze([{symbol:'A',price:'10',change_pct:'10',volume:'1000000',rvol:'2',float:'10000',spread_pct:'0'}]).rows.length,1,'Zero spread numeric input allowed');
assert.throws(()=>S.csv('symbol,symbol,price,change_pct,volume,rvol,float,spread_pct\nA,A,1,2,3,4,5,6'),/Duplicate/);
assert.throws(()=>S.csv('symbol,price,change_pct,volume,rvol,float,spread_pct\nA,1,2,3,4,5,"unterminated'),/Unclosed/);
assert.throws(()=>S.csv('symbol,price,change_pct,volume,rvol,float,spread_pct\nA,1,2,3,4,5'),/Wrong column count/);
assert.throws(()=>S.csv('symbol,price\nA,1'),/Required CSV headers/);
assert.throws(()=>S.csv('x'.repeat(2_000_001)),/2 MB/);
assert.throws(()=>S.analyze(Array.from({length:2001},()=>({}))),/2,000/);
assert.throws(()=>S.filters({minVol:'-5'}),/Invalid filter/);
assert.throws(()=>S.filters({maxPrice:'Infinity'}),/Invalid filter/);
const ema=S.ema([10,11,12,13,14],3);
assert.equal(ema.period,3);
assert.equal(Math.round(ema.value*100),1300,'SMA seed+EMA smoothing');
assert.equal(S.ema([1,2],3),null);
assert.equal(S.ema([1,NaN,3,4],3),null);
const proxy=S.typicalPriceVwap([{high:11,low:9,close:10,volume:100},{high:23,low:17,close:20,volume:50}]);
assert(Math.abs(proxy.value-13.33333333333)<0.0001);
assert.match(proxy.label,/NOT trade-derived VWAP/);
assert.equal(S.typicalPriceVwap([{high:2,low:3,close:2,volume:40}]),null);
assert.equal(S.typicalPriceVwap([{high:3,low:1,close:2,volume:0}]),null);
const tool=readFileSync('assets/js/advanced-tools.js','utf8'),html=readFileSync('advanced-tool.html','utf8');
assert(tool.includes('engine.analyze(rows,getFilters())'));
assert(!tool.includes("Math.log10(Math.max(1,vol||1))*2"),'Opaque fake teaching score removed');
assert(tool.includes('UNVERIFIED_RESEARCH_CRITERIA'));
assert(html.indexOf('market-research-engine-v014145.js')<html.indexOf('advanced-tools.js'));
console.log('PASS v145: strict CSV, missing data, duplicate/review limits, deterministic sorting, EMA/VWAP scope and rights disclaimers');
