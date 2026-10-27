import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const code=readFileSync(new URL('../assets/js/free-foundations-formative-v1.js',import.meta.url),'utf8');
const scope={fetch:()=>{throw Error('Forbidden external request');}};
runInNewContext(code,scope);
const review=scope.GroundUpFreeFormativeV1.review;
for(let d=1;d<=5;d++){
 const result=review(d,'FICTIONAL case with several unknown details that need much more reasoning before making any decision.');
 assert.equal(result.sentToServer,false);assert.equal(result.masteryAwarded,false);
 assert.equal(result.kind,'UNGRADED_WORDING_AID');assert(!Object.hasOwn(result,'score'));
 assert(result.followUps.length>0);
}
const p=review(1,'The previous last trade is an older transaction, but I am unsure about what else can affect my actual fill.');
assert(p.noted.length>0&&p.followUps.length>0);
assert(review(5,'The stop guarantees my loss will be exactly twenty dollars because it is a stop.').ambiguous.length===1);
assert(review(5,'The stop does not guarantee a fill, and a gap may make loss worse.').ambiguous.length===0);
assert.equal(review(99,'invalid'),null);
console.log('PASS Phase A lexical cues: partial reasoning, targeted follow-up, risky wording, no grades or network.');
