/* Sellable Product 04: member CSV integrity, provenance and bounds.
 * Exercises ACTUAL browser engine with no member credentials or live data.
 * No mocked provider results are claimed to be real authenticated tests.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const script=readFileSync('assets/js/simulator.js','utf8');
const env={window:{addEventListener(){}},document:{},Date,Number,Math,Intl,
 setInterval,clearInterval,console};
runInNewContext(script,env,{filename:'assets/js/simulator.js'});
assert.equal(typeof env.parseCSV,'function','Production CSV parser must be exercised');
const csv=readFileSync('data/simulator_csv_template.csv','utf8');
const bars=env.parseCSV(csv);
assert.equal(bars.length,3);
assert.equal(bars[0].open,10);
assert.equal(bars[2].volume,151000);
assert.equal(bars[1].time.toISOString(),'2026-01-02T14:35:00.000Z');

const head='timestamp,open,high,low,close,volume';
const a='2026-01-02T09:30:00-05:00,10,11,9,10.5,900';
const b='2026-01-02T09:35:00-05:00,10.5,11,10,10.8,0';
const valid=[head,a,b].join('\n');
assert.equal(env.parseCSV(valid).length,2,'Zero volume is valid when explicitly supplied');
const invalid=(row,pattern)=>assert.throws(()=>env.parseCSV([head,a,row].join('\n')),pattern);

invalid('2026-01-02T09:35:00-05:00,10,11,9,10,',/invalid OHLCV/i);
invalid('2026-01-02T09:35:00-05:00,10,11,9,10,not available',/invalid OHLCV/i);
invalid('2026-01-02T09:35:00-05:00,10,11,9,10,-1',/invalid OHLCV/i);
invalid('2026-01-02T09:35:00-05:00,0,11,9,10,100',/invalid OHLCV/i);
invalid('2026-01-02T09:35:00-05:00,12,11,9,10,100',/invalid OHLCV/i);
invalid('2026-01-02T09:35:00-05:00,10,11,12,10,100',/invalid OHLCV/i);
invalid('2026-01-02T09:35:00-05:00,10,11,9,foo,100',/invalid OHLCV/i);
invalid('2026-01-02T09:35:00,10,11,9,10,100',/timezone-qualified/);
invalid('2026-02-30T09:35:00-05:00,10,11,9,10,100',/valid ISO date/);
invalid('2026-01-02T09:30:00-05:00,10,11,9,10,100',/repeats an existing timestamp/);
invalid('2026-01-02T09:35:00-05:00,10,11,9,10',/has 5 cells/);
assert.throws(()=>env.parseCSV([head, a].join('\n')),/at least two/);
assert.throws(()=>env.parseCSV(['timestamp,open,high,low,close,volume,volume',
 a+',10',b+',11'].join('\n')),/unique/);
assert.throws(()=>env.parseCSV('x'.repeat(4*1024*1024+1)),/4 MiB/);
assert.throws(()=>env.parseCSV([head,...Array(20001).fill(a)].join('\n')),/20,000/);
assert.equal(env.parseCSV([head,b,a].join('\n'))[0].time.toISOString(),
 '2026-01-02T14:30:00.000Z','Existing import sorting remains compatible');

const extra='timestamp,open,high,low,close,volume,comments';
const quoted=[extra,a+',"label, with comma"',b+',"ordinary"'].join('\n');
assert.equal(env.parseCSV(quoted).length,2,'Quoted CSV metadata must not break parser');
assert(!script.includes("/fictional/i.test(String(SIM.sourceName"),'Fictional source cannot be inferred from upload filename');
assert(script.includes('SIM.originalFictional===true'));
assert(script.includes('SIM.sourceName=file.name;SIM.sourceProvider=')&&script.includes('SIM.originalFictional=false'));
assert(script.includes('SIM.candles=starter.generate();SIM.sourceName=starter.source;SIM.originalFictional=true'));
assert(script.includes("sourceProvider='csv_upload'"),'Legacy Journal source enum remains unchanged');
assert(script.includes("if(file.size>SIM_CSV_MAX_BYTES)"),'Bound member file before buffering');
assert(script.includes('SIM.index=warm')&&script.includes('SIM.candles.slice(start,end+1)'),
 'Chart still draws only observed candles, not future data');
assert(readFileSync('simulator.html','utf8').includes('browser developer tools'),
 'User-controlled CSV is NOT a protected blind assessment');
console.log('PASS Simulator 04 CSV: valid OHLCV, dates, explicit timezone, missingness, duplicates, size/bars, first-party source labeling and no future-chart data.');
