import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const root='assets/js/';
const specialistSource=fs.readFileSync(root+'lab-engine-v32-teaching.js','utf8');
const universalSource=fs.readFileSync(root+'lab-engine-v32-universal.js','utf8');
function get(source){const ctx={globalThis:{},console};vm.runInNewContext(source,ctx,{timeout:2000});return ctx.globalThis}
const specialist=get(specialistSource).GroundUpLabEngineV32;
const universal=get(universalSource).GroundUpLabEngineV32Universal;
test('single shared journey supports the nine approved stages',()=>{
 assert.equal(universal.version,'3.3.0');
 assert.equal(universal.canonicalTarget,419);
 assert.equal(universal.steps.join('|'),'Start|Learn|Experiment|Predict|Practice|Assess|Review|Transfer|Results');
});
test('uses original v3.2 specialist configuration, no duplicate lab catalog',()=>{
 assert.equal(specialist.kindFor('F2-C07-L01'),'candle');
 assert.equal(specialist.kindFor('F3-C06-L01'),'vwap');
 assert.equal(specialist.kindFor('OTHER'),null);
 assert.equal(specialist.lessons.candle.name,'Candlestick construction');
});
test('adaptive math diagnosis distinguishes mistakes from final score',()=>{
 assert.match(universal.mathDiagnostic('candle','1'),/body size/i);
 assert.match(universal.mathDiagnostic('candle','.5'),/decimal ratio/i);
 assert.match(universal.mathDiagnostic('vwap','9'),/simple average/i);
 assert.match(universal.mathDiagnostic('vwap','2600'),/traded dollar value/i);
});
test('numeric validation rejects blank, NaN, and near misses',()=>{
 assert.equal(universal.validNumber('',0),false);
 assert.equal(universal.validNumber('NaN',5),false);
 assert.equal(universal.validNumber('8.67',2600/300),true);
 assert.equal(universal.validNumber('8.2',2600/300),false);
});
test('no private answer banks or fabricated Question Pass credits in universal engine',()=>{
 assert.ok(!universalSource.includes('/rpc/v014_training_answer'));
 assert.ok(!universalSource.includes('secret_key'));
 assert.ok(!universalSource.includes('purchasedCreditAllocation('));
 assert.ok(!universalSource.includes('includedCreditAllocation('));
 assert.match(universalSource,/Not Yet Assessed/);
 assert.match(universalSource,/creditRequest/);
 assert.match(universalSource,/practiceAssisted=true/);
});
test('player gives all Labs one shared teaching renderer, preserves private grader',()=>{
 const player=fs.readFileSync(root+'lab-player.js','utf8');
 assert.match(player,/GroundUpLabEngineV32Universal\.mount/);
 assert.match(player,/GroundUpInteractiveTraining/);
 assert.match(player,/serverAdvancedAllowed/);
});
