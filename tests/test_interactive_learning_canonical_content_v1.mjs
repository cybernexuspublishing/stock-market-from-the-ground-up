import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {INTERACTIVE_BETA_CANONICAL_IDS,originalInteractiveIntro} from '../functions/_lib/interactive-learning-canonical-v1.js';
import {BETA_CANDIDATE_IDS,BETA_UPCOMING_IDS} from '../functions/_lib/lab-beta-scope-v014286.js';
const ids=['F2-C06-L01','DT-C06-L03','F3-C01-L03','DT-C49-L01'];
assert.deepEqual([...INTERACTIVE_BETA_CANONICAL_IDS].sort(),[...ids].sort());
assert.equal(BETA_CANDIDATE_IDS.length,336);
assert.equal(BETA_UPCOMING_IDS.length,83);
for(const id of ids){
 assert(BETA_CANDIDATE_IDS.includes(id),'Supplement cannot add an unapproved Lab');
 const data=originalInteractiveIntro(id);
 assert.equal(data.id,id);
 assert.equal(data.stage,'Start');
 assert.equal(data.dataClassification,'fictional_illustrative');
 assert.equal(data.ungraded,true);
 assert.equal(data.futureObservationsIncluded,false);
 assert.equal(data.officialGradingAvailable,false);
 assert.equal(data.brokerConfirmedExecution,false);
 assert(data.objective.length>45&&data.what.length>40&&data.why.length>45);
 assert(data.decisionPrompt.length>35);
 const serialized=JSON.stringify(data);
 for(const token of ['correctAnswer','grader','rubric','futureCandles','subsequentBar','memberId','privateKey']){
  assert(!serialized.includes('"'+token+'"'),'Protected payload field: '+token);
 }
}
assert.equal(originalInteractiveIntro('SITE-018'),null);
assert.equal(originalInteractiveIntro('NOT_A_REAL_LAB'),null);
assert.match(originalInteractiveIntro('DT-C06-L03').currentObservation,/PROVISIONAL/);
assert.doesNotMatch(originalInteractiveIntro('DT-C06-L03').currentObservation,/FINAL HIGH|session close|following bar/i);
const server=readFileSync('functions/api/lab-player-context.js','utf8');
assert(server.includes("import {originalInteractiveIntro}"));
assert(server.includes("interactive&&isBetaCandidateLab(id)"));
assert(server.includes("originalInteractiveIntro(id)"));
assert(server.includes("'original_interactive_beta_intro_ungraded'"));
assert(server.includes("['ONDEMAND_TRAINING','INTERACTIVE_LEARNING']"));
assert(server.includes("if(!premium&&!owns&&!sample)"));
assert(!server.includes('res.send(correctAnswer)'));
console.log('PASS four 336-canonical original fictional Lab supplements; protected keys/future absent; prior server entitlement gates intact.');
