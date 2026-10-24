import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const contents=readFileSync('assets/js/lab-v34-interactive-lessons.js','utf8');
const instructor=readFileSync('assets/js/lab-v33-instructor.js','utf8');
const ctx=vm.createContext({console});
new vm.Script(contents,{filename:'lab-v34-interactive-lessons.js'}).runInContext(ctx);
const api=ctx.GroundUpLabV34InteractiveLessons;
const tabs=['understand','recognize','apply','mistake','limits'];
for(const concept of ['Bullish Candle','Bearish Candle']){
 const result=tabs.map(feature=>api.get({type:'candle',feature,concept,guide:{}}));
 assert.equal(result.length,5);
 assert.equal(new Set(result.map(x=>x.script)).size,5,
  'Each of the five Talia tabs must have different content: '+concept);
 for(const [i,r] of result.entries()){
  assert.equal(r.feature,tabs[i]);assert(r.script.length>150);
  assert(!r.script.includes('purpose is to recognize and explain this exact subject'),
   'Generic competency fallback may not replace candlestick teaching');
  assert(!r.script.includes('A illustrative'),'Correct indefinite article');
 }
 const applied=result[2].script,limits=result[4].script;
 assert(applied.includes(' = Body')&&applied.includes(' = Full Range')&&
  applied.includes(' = Upper Wick')&&applied.includes(' = Lower Wick')&&
  applied.includes(' = Body Percentage'),
  'Worked method must show five named equations');
 assert(applied.includes('Lower Wick + Body + Upper Wick = Full Range'),
  'The three pieces must reconcile to range');
 assert(limits.toLowerCase().includes('undefined'),
  'Zero range must be distinguished from zero body');
 if(concept==='Bullish Candle'){
  assert(applied.includes('$32.00 (Close) − $31.00 (Open) = $1.00'));
  assert(applied.includes('$0.50 + $1.00 + $0.50 = $2.00'));
  assert(applied.includes('50%'));
 }else{
  assert(applied.includes('$12.40 (Open) − $12.10 (Close) = $0.30'));
  assert(applied.includes('$0.20 + $0.30 + $0.30 = $0.80'));
  assert(applied.includes('37.5%'));
 }
}
assert(instructor.includes('custom?.narration||plan.script||'),
 'Authored tab narration must precede generic fallback');
assert(instructor.includes("candleFormula&&!plan.script"),
 'Tab scripts must not receive a duplicate catch-all formula');
const ref=api.referenceIntro('candle');
assert(ref.example.includes('order is unknown'),
 'Never fabricate which OHLC extreme happened first');
assert(ref.steps.some(x=>x.includes('Close − Open = Body')),
 'Reference introduction must display the formula before numerical substitution');
console.log('PASS 5 distinct original bullish and bearish scripts; labeled calculations, integrity check, 0/0, temporal and source boundaries');
