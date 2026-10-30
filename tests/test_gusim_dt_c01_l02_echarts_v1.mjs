import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('assets/js/lesson-gusim-dt-c01-l02-echarts-v1.js','utf8');
const page=fs.readFileSync('simulator.html','utf8');
const replay=fs.readFileSync('verified-replay.html','utf8');
const player=fs.readFileSync('assets/js/lab-player.js','utf8');
const build=fs.readFileSync('scripts/build-pages.sh','utf8');
const fakeRoot={};
const ctx=vm.createContext({window:fakeRoot,document:{readyState:'loading',addEventListener(){}}});
new vm.Script(source).runInContext(ctx);
const {cleanBar,ema}=fakeRoot.CrownlightDT01L02Math;
const make=i=>({index:i,timestamp:new Date(Date.UTC(2040,0,3,14,30+i*5)).toISOString(),
 open:10+i*.1,high:10.5+i*.1,low:9.8+i*.1,close:10.2+i*.1,volume:20000+i*100});
assert.equal(cleanBar(make(0)).index,0);
assert.equal(cleanBar({...make(0),high:8}),null);
assert.equal(cleanBar({...make(0),timestamp:'2024-01-03T14:30:00Z'}),null);
assert.equal(cleanBar({...make(0),index:24}),null);
const bars=Array.from({length:24},(_,i)=>cleanBar(make(i)));
assert(ema(bars.slice(0,8),9).every(x=>x===null));
const a=ema(bars,9),b=ema(bars,20);
assert(a.slice(0,8).every(x=>x===null));
assert(b.slice(0,19).every(x=>x===null));
assert.equal(a.filter(x=>x!==null).length,16);
assert.equal(b.filter(x=>x!==null).length,5);
assert.equal(a[8],10.6);
assert.equal(b[19],11.15);
for(const event of ['groundup:replay-dataset','groundup:replay-reset','groundup:replay-observation','crownlight:member-changed'])
 assert(source.includes(event),event);
assert(!/fetch\s*\(|localStorage|sessionStorage|gradeAttempt|Stripe|supabase\.from/.test(source));
for(const html of [page,replay]){
 assert(html.includes('lesson-gusim-dt-c01-l02-echarts-v1.js'));
 assert(html.includes('lesson-gusim-dt-c01-l02-echarts-v1.css'));
}
assert(player.includes('verified-replay.html?scope=fictional&amp;dataset='));
assert(build.includes('node tests/test_gusim_dt_c01_l02_echarts_v1.mjs'));
console.log('PASS DT-C01-L02 private-reveal chart, EMA warmup, original-fictional provenance and scoped link');
