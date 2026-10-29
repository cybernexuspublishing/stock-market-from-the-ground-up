import assert from 'node:assert/strict';
import {getApprovedLabContext,labGuidance,requestedLearningStage} from '../functions/_lib/tutor-lab-context-v014149.js';

const cases=[
 ['F2-C07-L01','Construct an Up / Bullish Candle','open, high, low, and close'],
 ['DT-C11-L01','VWAP as a session reference','session reference'],
 ['DT-C19-L02','Share Volume','shares traded'],
 ['DT-C34-L01','Define the Box','upper and lower boundary'],
 ['DT-C45-L01','Failed breakout','predeclared boundary'],
 ['DT-C05-L01','Risk per trade','Risk per share']
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
 assert(answer.includes('Worked example (fictional):'));
 assert(answer.includes('Practice independently:'));
 assert(answer.includes('Public reference for further study:'));
 assert(answer.includes('Try the next step independently'));
 assert(!/answer.?key|future price|actual fill/i.test(answer));
}
// Direct learner questions select the relevant published teaching sections.
const candleContext=await getApprovedLabContext({ASSETS:asset},request,
 'Lab F2-C07-L01. Learning Journey stage: Learn. Why does a candle matter?');
const whyAnswer=labGuidance(candleContext,'explain','','Why does a candle matter?');
assert(whyAnswer.includes('Why it matters:'));
assert(!whyAnswer.includes('Worked example (fictional):'));
const calculation=labGuidance(candleContext,'explain','','How do I calculate the candle range?');
assert(calculation.includes('Worked example (fictional):'));
assert(!calculation.includes('Why it matters:'));
const assessContext={...candleContext,learningStage:'Assess'};
const assessAnswer=labGuidance(assessContext,'explain','','How do I calculate the answer?');
assert(!assessAnswer.includes('Worked example (fictional):'));
assert(assessAnswer.includes('I cannot reveal a worked answer or answer key.'));

// Non-example canonical Labs remain on the shared protected fallback.
const fallbackId='SITE-001';
const fallbackAsset={fetch:async()=>new Response(JSON.stringify({
 totalCanonicalLabs:419,byLab:{[fallbackId]:{title:'A separate public practice Lab'}},
 bySkill:{TEST_COMPETENCY:[fallbackId]}
}))};
const fallback=await getApprovedLabContext({ASSETS:fallbackAsset},request,
 `For canonical Lab ${fallbackId}. Learning Journey stage: Assess. Explain this concept.`);
assert.equal(fallback.labId,fallbackId);
assert.equal(fallback.learningStage,'Assess');
const fallbackAnswer=labGuidance(fallback,'question');
assert(fallbackAnswer.includes('Use only the evidence visible at the Lab observation point'));
assert(fallbackAnswer.includes('I cannot provide its answer key'));
assert(fallbackAnswer.includes('Ungraded self-check'));
assert(!fallbackAnswer.includes('distance per share'));

assert.equal(requestedLearningStage('Learning Journey stage: Review'),'Review');
assert.equal(requestedLearningStage('No stage supplied'),null);
console.log('PASS six public Lab teaching paths and stage-aware fallback');
