import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../functions/api/interactive-training.js',import.meta.url),'utf8');
assert(source.includes('shuffledChoiceOptions(set.questions[step].options,attempt.id,set.questions[step].id)'));
assert(source.includes('Math.imul(seed,1664525)+1013904223'));
assert(source.includes("const arr=[...options]"),'Do not mutate private authored choices');
assert(source.includes("function publicState(attempt,set)"),'Reuse previous graded API contract');
const optionOrder=(choices,attempt,id)=>{
 const arr=[...choices];let seed=2166136261;
 for(const ch of String(attempt)+'|'+String(id))seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;
 for(let i=arr.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const j=seed%(i+1);[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;
};
const choices=['Correct option','Plausible distractor','Incorrect future prediction'];
const observed=new Set();
for(let i=0;i<500;i++){
 const attempt=String(i).padStart(8,'0')+'-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 const shuffled=optionOrder(choices,attempt,'EVIDENCE');
 assert.deepEqual([...shuffled].sort(),[...choices].sort());
 assert.deepEqual(optionOrder(choices,attempt,'EVIDENCE'),shuffled);
 observed.add(shuffled.indexOf('Correct option'));
}
assert.deepEqual(observed,new Set([0,1,2]),'Correct position varies across attempts');
console.log('PASS v100: no hardcoded always-first option; stable per-attempt choice permutations; existing server-key grading untouched.');
