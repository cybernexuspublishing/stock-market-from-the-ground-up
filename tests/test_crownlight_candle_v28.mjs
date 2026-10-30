import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const script=fs.readFileSync('assets/js/crownlight-candle-measurements-v28.js','utf8');
const coach=fs.readFileSync('assets/js/gusim-dt-c01-l02-coach-v3.js','utf8');
const replayChart=fs.readFileSync('assets/js/lesson-gusim-dt-c01-l02-echarts-v1.js','utf8');
const html=fs.readFileSync('simulator.html','utf8');
const protectedApi=fs.readFileSync('functions/api/lab-question-pass.js','utf8');
const build=fs.readFileSync('scripts/build-pages.sh','utf8');
const fakeWindow={};
new vm.Script(script,{filename:'crownlight-candle-measurements-v28.js'}).runInNewContext({window:fakeWindow});
const api=fakeWindow.CrownlightCandleV28;
assert.equal(api.version,'2.8');
assert.equal(api.NAMES.length,10);
assert.deepEqual(Array.from(api.NAMES),['Welcome','What Is a Percentage?','Candle Experiment','Calculate the Body',
 'Calculate the Range','Calculate the Percentage','Independent Assessment','Review & Retry',
 'Transfer Challenge','Learning Report']);
const m=api.measures(api.WORKED);
assert.equal(m.body,1.1999999999999993); // floating representation; no silently rounded arithmetic
assert.equal(m.range,3);
assert(Math.abs(m.percentage-40)<1e-10);
assert.equal(api.measures({open:10,high:10,low:10,close:10}),null,'Zero range is undefined');
assert.equal(api.measures({open:20,high:22,low:19,close:23}),null,'Reject impossible candle');
assert.equal(api.ASSESS.length,2,'Independent retry illustration must use a different candle');
assert.notEqual(api.ASSESS[0].open,api.ASSESS[1].open);
assert.notEqual(api.measures(api.ASSESS[0]).percentage,api.measures(api.ASSESS[1]).percentage);
assert.equal(api.measures(api.TRANSFER).body,1);
assert.equal(api.measures(api.TRANSFER).range,3);
assert(script.includes("plot.setOption"),'Chart must use ECharts');
assert(script.includes('markLine'), 'OHLC labels must remain on actual chart prices');
assert(script.includes("formatter:key.toUpperCase()+' '+DOLLAR(q[key])"),'Direct horizontal price guides must label the actual illustrated values');
assert(script.includes("table.setAttribute('aria-label'"),'Accessible table is additional reference');
assert(script.includes("slider.type='range'"),'Experiment must be interactive');
for(const text of ['absolute value','Full range = High','percentage','What Is a Percentage?',
 'Check my calculation','Try again','firstIndependent','retryIndependent','Review & Retry',
 'Transfer Challenge','Learning Report','Simulated available credits','Confirm demo credit','Study Only',
 'Not Yet Assessed','F2-C07-L01&mode=assessment']){
 assert(script.includes(text),'Missing learning safeguard '+text);
}
assert(script.includes("state.firstIndependent!==null"),'Initial independent self-check cannot be overwritten');
assert(script.includes("reveal.disabled=state.credits<=0"),'Credits must gate convenience actions');
assert(script.includes("state.credits--"),'Demo wallet must deduct simulated credits');
assert(script.includes("state.assisted.add(state.stage)"),'Answer reveal/skip must not count as unassisted');
assert(!/fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|supabase|stripe|groundup_question_pass_spend/i.test(script),
 'Demonstration must not touch real payment, grading or wallet endpoints');
assert(protectedApi.includes('groundup_question_pass_spend_v2'),'Production wallet must remain independent');
assert(coach.includes('root.CrownlightCandleV28?.create?.({controlled:true})'));
assert(coach.includes('measurements?.setStep(stepIndex)'));
assert(coach.includes('stepIndex=7;showLesson()'),'Checkpoints must move to the Review step');
assert(coach.includes("stepIndex===2?'\\n\\n'+firstBarCopy()"),'First observation narration must match Candle Experiment');
assert(html.includes('crownlight-candle-measurements-v28.js?v=1'));
assert(html.includes('crownlight-candle-measurements-v28.css?v=1'));
assert(html.indexOf('crownlight-candle-measurements-v28.js')<html.indexOf('gusim-dt-c01-l02-coach-v3.js'),
 'Measurement module must load before instructor');
assert(replayChart.includes('markLine:{silent:true'),'Real revealed chart must retain direct price labels');
assert(replayChart.includes('const last=bars[bars.length-1]'),'Only the last server-revealed candle can label the chart');
assert(build.includes('node tests/test_crownlight_candle_v28.mjs'));
console.log('PASS v2.8 ten-step foundational candle teaching, exact-price ECharts labels, calculation order, retries, protected grading boundary and simulated pass isolation');
