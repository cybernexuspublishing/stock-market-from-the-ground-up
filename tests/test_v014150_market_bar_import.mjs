/* D10 educational CSV bars are member-uploaded, never certified market history. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync('assets/js/market-bars-import-v014150.js','utf8');
const context={TextEncoder,Date,Number,Math,Set,Object,Array,RegExp,String};context.globalThis=context;
runInNewContext(source,context);
const B=context.GroundUpResearchBarsV014150;
assert(B&&Object.isFrozen(B)&&typeof B.csvBars==='function');
const head='timestamp,open,high,low,close,volume\n';
const a='2026-10-22T09:30:00-04:00,2,2.1,1.9,2.06,100\n';
const b='2026-10-22T09:31:00-04:00,2.06,2.2,2,2.1,20\n';
const bars=B.csvBars(head+a+b);
assert.equal(bars.length,2);
assert.equal(bars[0].time.toISOString(),'2026-10-22T13:30:00.000Z');
assert.equal(bars[1].close,2.1);
assert.equal(bars[0].volume,100);
assert.equal(B.csvBars('date,time,open,high,low,close,volume\n2026-10-22,09:30:00-04:00,2,2.1,1.9,2.06,100').length,1);
assert.equal(B.csvBars('timestamp,open,high,low,close,volume,comment\n2026-10-22T09:30:00-04:00,2,2.1,1.9,2.06,100,"Member, unverified"').length,1);
for(const [file,error] of [
 [head+a+a,/duplicate|strictly increasing/],
 [head+a+b+a,/out-of-order|strictly increasing/],
 [head+a.replace('-04:00',''),/time zone/],
 [head+a.replace('2026-10-22','2026-02-30'),/calendar date/],
 [head+a.replace('09:30:00','25:30:00'),/invalid date, clock time/],
 [head+a.replace('2.1,1.9','2.01,1.9'),/price relationship/],
 [head+a.replace(',100',',0.5'),/whole-share volume/],
 [head+a.replace('2,2.1','$2,2.1'),/valid number/],
 [head+a.slice(0,-1)+',EXTRA\n',/column count/],
 [head+a.replace('2026-10-22T09:30:00-04:00','2026-10-22'),/time zone/],
 [head+'2026-10-22T09:30:00-04:00,2,2.1,1.9,2.06,"unclosed',/unclosed/],
 [head.replace('timestamp,','timestamp,timestamp,')+a,/unique/]
])assert.throws(()=>B.csvBars(file),error,'Must reject corrupt CSV, not silently discard rows');
assert.throws(()=>B.csvBars('x'.repeat(2_000_001)),/2 MB/);
const ui=readFileSync('assets/js/advanced-tools.js','utf8');
const page=readFileSync('advanced-tool.html','utf8');
assert(ui.includes('GroundUpResearchBarsV014150'));
assert(!ui.includes('parseBars(parseCsv('),'No legacy permissive parse after migration');
assert(ui.includes("document.getElementById('mc-file').onchange=async e=>{const epoch=++importEpoch"),'Market Context upload must reject stale files');
assert(ui.includes("document.getElementById('mc-out').replaceChildren()"),'Market Context must clear stale output on upload');
assert(ui.includes("if(!rows.length)return status('Load valid, timezone-explicit OHLCV bars"),'Market Context must not analyze a failed or empty upload');
assert(page.indexOf('market-bars-import-v014150.js')<page.indexOf('advanced-tools.js'),'Importer runs before workbench');
assert(ui.includes("rows=[];status(err.message||'Invalid candle CSV.'"),'UI must clear prior good bars after bad upload');
console.log('PASS D10 fail-closed local educational OHLCV importer, explicit timestamps, input integrity and safe UI failures');
