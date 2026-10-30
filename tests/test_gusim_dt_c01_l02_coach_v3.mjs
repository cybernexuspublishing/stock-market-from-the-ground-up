import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync('assets/js/gusim-dt-c01-l02-coach-v3.js','utf8');
const css=fs.readFileSync('assets/css/gusim-dt-c01-l02-coach-v3.css','utf8');
const simulator=fs.readFileSync('simulator.html','utf8');
const plot=fs.readFileSync('assets/js/lesson-gusim-dt-c01-l02-echarts-v1.js','utf8');
const replay=fs.readFileSync('assets/js/verified-replay-v01492.js','utf8');
const lab=fs.readFileSync('assets/js/lab-player.js','utf8');
const build=fs.readFileSync('scripts/build-pages.sh','utf8');
new vm.Script(src,{filename:'gusim-dt-c01-l02-coach-v3.js'});
assert.equal(src.includes("CODE='GUSIM_DT_C01_L02'"),true);
for(const item of ['I Do','We Do','You Do','Play Candles','Pause Candles','Play Talia’s explanation',
 'Pause Talia’s explanation','Show full explanation','Previous teaching step','Next teaching step',
 'Review', 'NO TRADE','invalidation','guarantee']){
 assert(src.includes(item),'Missing teaching or transport behavior: '+item);
}
for(const event of ['groundup:replay-reset','groundup:replay-observation','groundup:replay-state',
 'groundup:replay-dataset','crownlight:member-changed']){
 assert(src.includes(event),'Missing event '+event);
}
assert(src.includes("if(!state.sessionId||!state.locked)"),'Playback must refuse unlocked session');
assert(src.includes("!state.locked||state.busy||checkpoint"),'Playback may only schedule authorized sequential server actions');
assert(src.includes('advance.click()'),'Use the existing protected advance endpoint via the original button');
assert(src.includes("if(observed.length>=TOTAL)"),'Playback must stop at the finite case end');
assert(src.includes("document.hidden&&playing"),'Hidden tabs should not keep playing');
assert(src.includes("root.clearTimeout(playTimer)"),'Replay must clean scheduled timers');
assert(src.includes("checkpoint=true"),'Replay should pause for teaching checkpoints');
assert(!/fetch\\s*\\(|localStorage|sessionStorage|Supabase|Stripe|grading|wallet|gu_replay_bars/i.test(src),
 'Instructor must not open private data or commerce endpoints');
assert(simulator.includes('gusim-dt-c01-l02-coach-v3.js?v=1'));
assert(simulator.includes('gusim-dt-c01-l02-coach-v3.css?v=1'));
assert(simulator.indexOf('lesson-gusim-dt-c01-l02-echarts-v1.js')<
 simulator.indexOf('gusim-dt-c01-l02-coach-v3.js'),'Coach must mount after ECharts panel');
assert(plot.includes('barWidth:17')&&plot.includes('barWidth:21'),'A single visible bar should not fill the chart width');
assert(plot.includes("if(nine.checked&&bars.length>=9)")&&
 plot.includes("if(twenty.checked&&bars.length>=20)"),'EMA warm-up cannot invent unavailable values');
assert(replay.includes("if(Array.from($('vr-dataset').options).some(o=>o.value===r.dataset?.code))"),
 'Resume should reconcile dropdown with private restored session');
assert(lab.includes("id==='DT-C01-L02'?'simulator.html?scope=fictional"),'Lesson practice must open repaired simulator route');
assert(css.includes('dt-l02-coach')&&css.includes('dt-l02-transport'),'Coach and playback must remain legible');
assert(build.includes('node tests/test_gusim_dt_c01_l02_coach_v3.mjs'),'Build must execute this regression');
console.log('PASS DT-C01-L02 V3 Prototype V2-style Talia dialogue, two Play controls, gated server playback, scoped ECharts and case synchronization');
