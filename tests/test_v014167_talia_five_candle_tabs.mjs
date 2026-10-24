import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const contents=readFileSync('assets/js/lab-v34-interactive-lessons.js','utf8');
const instructor=readFileSync('assets/js/lab-v33-instructor.js','utf8');
const startPlan=readFileSync('assets/js/lab-v33-instruction-content.js','utf8');
const engine=readFileSync('assets/js/lab-engine-v32-universal.js','utf8');
const css=readFileSync('assets/css/lab-v33-experience.css','utf8');
const ctx=vm.createContext({console});
new vm.Script(contents,{filename:'lab-v34-interactive-lessons.js'}).runInContext(ctx);
const api=ctx.GroundUpLabV34InteractiveLessons;
new vm.Script(startPlan,{filename:'lab-v33-instruction-content.js'}).runInContext(ctx);
const intro=ctx.GroundUpLabV33InstructionContent.lesson({stage:0,concept:'Bullish Candle',guide:{}});
assert(intro.blocks.some(x=>x.includes('four prices')),'Start must preview the three learning aims');
assert(intro.blocks.every(x=>!/(?:\$\d|Calculate the body:|Please answer|Question \d)/i.test(x)),
 'Start must not include arithmetic or assessment questions before teaching');
assert(engine.includes('gu-v40-start-hero')&&engine.includes('gu-v40-start-candle'),
 'Start must show an actual candle illustration alongside Talia');
assert(css.includes('.gu-v40-start-preview')&&css.includes('.gu-v40-preview-goal'),
 'Visual lesson preview must be styled across desktop and mobile');
assert(instructor.includes("const transcriptTitle=el('h3'")&&
 instructor.includes('transcriptTitle.textContent=label;'),
 'Talia lesson titles must be semantic headings, not unstyled narration text');

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
const guidance={
 code:'CANDLE_BASICS',title:'Market Structure',concept:'Describe observable price structure.',
 procedure:'Mark the highs, lows and closes of the visible candles.',
 commonError:'Do not confuse a wick with a completed close.',
 limit:'One candle cannot establish a full trend.'
};
const generic=['understand','recognize','apply','mistake','limits']
 .map(feature=>api.get({type:'general',feature,concept:'Market Structure',guide:guidance}).script);
assert.equal(new Set(generic).size,5,'Unreviewed canonical competency guides must still have five distinct, source-bound teachings');
assert(generic.every(x=>typeof x==='string'&&x.length>80));
assert(generic[3].includes('wick'));
assert(generic[4].includes('One candle cannot establish a full trend'));
const ref=api.referenceIntro('candle');
assert.equal(ref.steps.length,9,'One-to-one reference candle now has nine fully explained mathematical steps');
assert(ref.steps[5].includes('highest price reached')&&
 ref.steps[5].indexOf('highest price reached')<ref.steps[5].indexOf('$32.50 (High)'),
 'Explain the upper wick between the formula and the substituted dollar values');
assert(ref.steps[6].includes('lowest price reached')&&
 ref.steps[6].indexOf('lowest price reached')<ref.steps[6].indexOf('$31.00 (Open)'),
 'Explain the lower wick before numerical substitution');
assert(ref.example.includes('order is unknown'),
 'Never fabricate which OHLC extreme happened first');
assert(ref.steps.some(x=>x.includes('Close − Open = Body')),
 'Reference introduction must display the formula before numerical substitution');
console.log('PASS 5 distinct original bullish and bearish scripts; labeled calculations, integrity check, 0/0, temporal and source boundaries');
