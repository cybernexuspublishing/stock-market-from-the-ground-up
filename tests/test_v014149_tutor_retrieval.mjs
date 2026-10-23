import assert from 'node:assert/strict';
import {terms,rankApprovedTutorTopics} from '../functions/_lib/tutor-retrieval-v014149.js';
const topics=[
 {id:'vwap',title:'VWAP',aliases:['volume weighted average price'],summary:'Weighted price benchmark',related:['market price']},
 {id:'risk',title:'Position sizing',aliases:['risk per share'],summary:'Risk and shares',related:[]},
 {id:'tape',title:'Time and Sales',aliases:['tape'],summary:'Trade prints and execution',related:[]}
];
assert.deepEqual(terms('Explain VOLUME-WEIGHTED AVERAGE PRICE'),['vwap']);
assert.deepEqual(terms('previous day high, previous day high'),['pdh']);
assert.deepEqual(terms('time and sales and time and sales'),['tape']);
assert.deepEqual(terms('maximum favorable excursion, maximum favorable excursion'),['mfe']);
assert.equal(rankApprovedTutorTopics('How does VWAP work?',topics)[0].id,'vwap');
assert.equal(rankApprovedTutorTopics('Explain risk per share',topics)[0].id,'risk');
assert.equal(rankApprovedTutorTopics('time & sales execution',topics)[0].id,'tape');
assert.deepEqual(rankApprovedTutorTopics('What is it?',topics),[]);
assert.deepEqual(rankApprovedTutorTopics('completely unrelated topic',topics),[]);
assert.equal(rankApprovedTutorTopics('vwap',topics).length,1);
assert.equal(rankApprovedTutorTopics('vwap',topics,0).length,0);
console.log('PASS D09 deterministic source-only retrieval (8 assertions)');
