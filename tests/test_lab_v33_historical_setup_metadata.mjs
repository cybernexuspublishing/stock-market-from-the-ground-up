/* Editorial metadata regression only — does NOT validate market candles or grant historical-data rights. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const labs=JSON.parse(readFileSync('data/labs.json','utf8'));
const engine=readFileSync('assets/js/lab-engine-v32-universal.js','utf8');
assert.equal(labs.length,94,'Retain all 94 original book-authored historical lab setups');
const ids=new Set();
const holidays2024=new Set(['2024-01-01','2024-01-15','2024-02-19','2024-03-29','2024-05-27','2024-06-19','2024-07-04','2024-09-02','2024-11-28','2024-12-25']);
for(const lab of labs){
 assert(!ids.has(lab.id),'Duplicate authored Lab ID '+lab.id);
 ids.add(lab.id);
 assert(/^[A-Z][A-Z0-9.\-]{0,8}$/.test(lab.ticker),'Ticker formatting '+lab.id);
 const date=new Date(lab.date+' 12:00:00 GMT');
 assert(Number.isFinite(date.getTime()),'Unparseable historical date '+lab.id);
 const weekday=date.getUTCDay(),ymd=date.toISOString().slice(0,10);
 assert(weekday!==0&&weekday!==6,'US exchange closed for weekend '+lab.id);
 if(ymd.startsWith('2024-'))assert(!holidays2024.has(ymd),'2024 holiday closure '+lab.id);
 for(const name of ['start','end']){
  const value=String(lab[name]||'');
  if(value)assert(/^\d{1,2}:\d{2}(?:-\d{1,2}:\d{2})? [ap]\.m\. ET$/.test(value),'Use explicit ET pause times '+lab.id+' '+name);
 }
}
const aapl=labs.find(x=>x.id==='F3-C01-L01');
assert.deepEqual([aapl?.ticker,aapl?.date,aapl?.start],['AAPL','May 20, 2024','9:45 a.m. ET']);
assert(/completed 5-minute candles/i.test(aapl.setup));
assert(engine.includes('setupTimeframe'),'The timeframe must display even when stored in the approved setup instruction');
assert(engine.includes("['Ticker',lab?.ticker]")&&engine.includes("['Historical date',lab?.date]"));
assert(engine.includes('A historical chart must match the named ticker, date, time, source and verified prices.')&&
 engine.includes('Practice examples are not live quotes or guaranteed trade outcomes.'),
 'Historical setups must disclose source validation requirements without misrepresenting study examples as verified bars');
console.log('PASS 94 original setups: unique IDs, formatted ticker/date, 2024 weekday/holiday gate, preserved AAPL May 20 2024 pause. Historical OHLCV NOT validated.');
