import assert from 'node:assert/strict';
import {getApprovedLabContext,labGuidance,requestedLearningStage} from '../functions/_lib/tutor-lab-context-v014149.js';

const cases=[
 ['F2-C07-L01','Construct an Up / Bullish Candle','open and close'],
 ['DT-C11-L01','VWAP as a session reference','session reference'],
 ['DT-C19-L02','Share Volume','traded shares'],
 ['DT-C34-L01','Define the Box','upper and lower bounds'],
 ['DT-C45-L01','Failed breakout','proposed breakout level'],
 ['DT-C05-L01','Risk per trade','distance per share']
];
const byLab=Object.fromEntries(cases.map(([id,title])=>[id,{title}]));
const bySkill={TEST_COMPETENCY:cases.map(([id])=>id)};
const asset={fetch:async()=>new Response(JSON.stringify({totalCanonicalLabs:419,byLab,bySkill}))};
const request=new Request('https://school.test/api/market-tutor');
for(const [id,title,cue] of cases){
 const context=await getApprovedLabContext({ASSETS:asset},request,`Lab ${id}. Learning Journey stage: Practice. Explain this concept.`);
 assert.equal(context.labId,id);
 assert.equal(context.labTitle,title);
 assert.equal(context.learningStage,'Practice');
 const answer=labGuidance(context,'question');
 assert(answer.includes(cue),`${id} must have its own teaching cue`);
 assert(answer.includes('Try the next step independently'));
 assert(!/answer.?key|future price|actual fill/i.test(answer));
}
assert.equal(requestedLearningStage('Learning Journey stage: Review'),'Review');
assert.equal(requestedLearningStage('No stage supplied'),null);
console.log('PASS six public Lab teaching paths and stage-aware fallback');

