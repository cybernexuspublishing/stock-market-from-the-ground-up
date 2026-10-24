/* Owner teaching-standard regression: actual instructional content in every
 * canonical Lab rather than generic directives masquerading as teaching.
 * The test is not editorial approval of any private graded assessment. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,Script} from 'node:vm';
const load=p=>readFileSync(p,'utf8');
const text=load('assets/js/lab-v33-instruction-content.js');
const instructor=load('assets/js/lab-v33-instructor.js');
const bridge=load('assets/js/lab-engine-v32-universal.js');
const html=load('lab-player.html');
assert(html.indexOf('lab-v33-instruction-content.js')<html.indexOf('lab-v33-instructor.js'),
 'Reviewed teaching content must load before the instructor panel');
assert(bridge.includes('lessonContext:{visualType,guide,subject,teaching:authorizedTeaching,topicSource,')&&
 bridge.includes('labId,bridge:map.bridges.get(labId)'),
 'Instructor must use authorized subject and competency content');
for(const bad of ['We will examine ','Read the explanation alongside','Try changing one permitted input'])
 assert(!instructor.includes(bad),'No "go read" pseudo-teaching: '+bad);
const env=createContext({});
new Script(text,{filename:'lab-v33-instruction-content.js'}).runInContext(env);
const author=env.GroundUpLabV33InstructionContent;
assert(author);
const resolved=author.lesson({
 stage:1,concept:'F3-C06-L01',
 guide:{title:'VWAP Reclaim',concept:'Recognize a completed VWAP reclaim',
 procedure:'Check prior and current close against the relevant VWAP'}
});
assert(resolved.blocks.join(' ').includes('VWAP Reclaim'),'Narrate the educational topic, never the locator ID');
assert(!resolved.blocks.join(' ').includes('F3-C06-L01'),'The administrative ID must not be voiced as lesson content');
const cases=[
 ['candle','Construct an Up / Bullish Candle',/(Open \(O\)|High \(H\)|Low \(L\)|Close \(C\))/,'40%'],
 ['vwap','VWAP Reclaim',/Σ means SUM/,'$11.50'],
 ['ema','EMA9/EMA20',/smoothing factor/,'$10.10'],
 ['structure','Higher Highs and Higher Lows',/swing high/,'$10.65'],
 ['volume','Reading Volume',/shares traded/,'3.0'],
 ['tape','Time & Sales',/execution time/,'490 shares'],
 ['depth','Bid and Ask',/spread is Ask − Bid/,'$0.20'],
 ['routing','Order Routing',/acknowledgment/,'40 shares']
];
for(const [type,topic,fact,workedFact] of cases){
 const lesson=author.lesson({visualType:type,concept:topic,stage:1});
 assert(lesson.blocks.length>=3,topic+' should teach several substantive facts');
 assert(fact.test(lesson.blocks.join(' ')),topic+' missing a definition/mechanism');
 assert(lesson.worked.some(x=>x.includes(workedFact)),topic+' missing actual worked calculation or example');
 assert(lesson.check?.choices.length>=3,topic+' missing the ungraded understanding check');
 assert(lesson.misconception&&lesson.limitation,topic+' missing the important mistakes/limits');
 assert(!lesson.blocks.join(' ').includes('Read the explanation'));
}
const catalog=JSON.parse(load('data/competency-lab-paths-v01499.json')).byLab;
const guides=JSON.parse(load('data/competency-study-guides-v01499.json')).guides;
const byGuide=new Map(guides.map(g=>[g.code,g]));
const original=new Map(JSON.parse(load('data/labs.json')).map(l=>[l.id,l]));
assert.equal(Object.keys(catalog).length,419);
let generic=0;
for(const [id,meta] of Object.entries(catalog)){
 const topic=original.get(id)?.concept||meta.title;
 const guide=byGuide.get(meta.relatedCompetencies?.[0]);
 assert(guide,'Official guide is required for '+id);
 const plan=author.lesson({stage:1,concept:topic,guide});
 assert(plan.blocks.length>=3,'No teaching text for '+id);
 if(plan.category==='general'){
  generic++;
  assert(plan.blocks.some(x=>x.includes(guide.concept)),
   'General-domain Lab must teach from its own guide rather than use filler: '+id);
 }
 const practice=author.lesson({stage:4,concept:topic,guide});
 assert(!practice.blocks.some(x=>/revealed next bar/i.test(x)),id+' should not reveal future data');
}
assert(generic>0);
assert(author.lesson({stage:5,visualType:'candle',concept:'Candle'}).blocks.length===0,
 'Instructor may not present explanations in protected assessment');
console.log('PASS substantive instructor: 8 subject families + 419 source-grounded canonical Lab teaching paths; '+generic+' use competency-specific fallback, not private assessment keys');
