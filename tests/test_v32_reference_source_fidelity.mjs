/* Source parity contract for the owner-uploaded reference v3.2.
 * Educational, fictional examples only. Never import prototype client-side
 * official assessment data into the production UI, wallet or replay service.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {labs as prototype} from '../prototypes/Shared_Lab_Engine_v3.2/src/labs.mjs';
import {candleMetrics,weightedAverage} from '../prototypes/Shared_Lab_Engine_v3.2/src/engine.mjs';

const read=path=>readFileSync(path,'utf8');
const scope={};
runInNewContext(read('assets/js/lab-v34-interactive-lessons.js'),{globalThis:scope});
const teaching=scope.GroundUpLabV34InteractiveLessons;
assert(teaching&&typeof teaching.referenceIntro==='function');

for(const [kind,id] of [['candle','candlestick'],['vwap','vwap']]){
 const reference=prototype[id].intro;
 const actual=teaching.referenceIntro(kind);
 assert(actual,'Missing reference example for '+kind);
 for(const key of ['term','definition','why']){
  assert.equal(actual[key],reference[key],'Changed approved v3.2 '+kind+' '+key);
 }
 assert(actual.example.includes(kind==='candle'?'$31.00':'100 shares'),'Concrete beginner demonstration required');
 assert(actual.steps.length>=4,'Numerical worked reasoning is incomplete: '+kind);
 assert(actual.caution.length>=45,'Limitations must accompany every worked example');
}
const example=prototype.candlestick.base;
const result=candleMetrics(example);
assert.equal(result.body,1);
assert.equal(result.range,2);
assert.equal(result.percentage,50);
const candle=teaching.get({type:'candle',feature:'all',concept:'OHLC'});
assert(candle.example.includes('O=$31.00, H=$32.50, L=$30.50, C=$32.00'));
assert(!candle.example.includes('$21.20'),'Production example must match original v3.2 candle');
assert(teaching.get({type:'candle',feature:'percent'}).example.includes('50%'));
const vwap=weightedAverage([{price:10,volume:100},{price:11,volume:300}]);
assert.equal(vwap,10.75);
assert(teaching.referenceIntro('vwap').steps.join(' ').includes('$10.75'));
const instructor=read('assets/js/lab-v33-instructor.js');
assert(instructor.includes('referenceIntro?.(lessonContext.visualType)'),'Intro must be drawn from owner reference');
assert(instructor.includes("'Worked example: '+plan.example"),'A button must show an example before prompting');
const engine=read('assets/js/lab-engine-v32-universal.js');
assert(engine.includes('hero.append(chart,coach)'),'The visual demonstration must precede Talia');
assert(engine.includes('first?.click()'),'Start the teaching sequence when visual lesson opens');
assert(engine.includes('gu-v34-focus-answered'),'Preserve guided next-focus handling');

// Existing authenticated routing must retain requested *internal* paths,
// query strings and anchors after successful sign in; reject unsafe next URLs.
const signin=read('assets/js/signin.js');
const destinations=[
 ['/lab-player.html?lab=F3-C06-L01#analysis','/lab-player.html?lab=F3-C06-L01#analysis'],
 ['/bootcamp.html?day=12#lesson','/bootcamp.html?day=12#lesson'],
 ['https://evil.example/','/dashboard.html'],
 ['//evil.example/','/dashboard.html'],
 ['/signin.html','/dashboard.html']
];
for(const [requested,expected] of destinations){
 const fake={search:'?next='+encodeURIComponent(requested),origin:'https://learning.example'};
 const context={
  location:fake,window:{getSupabaseClient:()=>null},
  URL,URLSearchParams,document:{addEventListener(){}},
  console
 };
 runInNewContext(signin,context);
 assert.equal(context.nextDestination(),expected,'Unsafe or incorrect sign-in continuation: '+requested);
}
const boundary=read('assets/js/auth-boundary.js');
assert(boundary.includes('location.pathname+location.search+location.hash'));
assert(boundary.includes("encodeURIComponent(destination())"));
console.log('PASS: v3.2-approved definitions, worked examples, candle/VWAP arithmetic, visual-before-Talia layout, and sign-in continuation');
