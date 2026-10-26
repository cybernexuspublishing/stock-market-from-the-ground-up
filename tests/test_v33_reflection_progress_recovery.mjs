/* Regression: no false green save status and no duplicate reflection on
 * partially successful member Lab persistence. Source and stubs only. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,createContext} from 'node:vm';
const source=readFileSync('assets/js/lab-player.js','utf8');
const workflow=readFileSync('.github/workflows/sitewide-playwright-v014136.yml','utf8');
assert(workflow.includes('node tests/test_v33_reflection_progress_recovery.mjs'));
let inserts=0,progressWrites=0,failProgress=true;
const els={
 'attempt-msg':{textContent:'',innerHTML:'',className:''},
 'complete-attempt':{disabled:false,textContent:'Save Lab'},
 'discuss-lab':{hidden:true},
 'reflection':{value:'Recorded before viewing feedback'}
};
const sb={from:table=>({
 insert:async()=>{assert.equal(table,'lab_attempts');inserts++;return {error:null}},
 upsert:async()=>{assert.equal(table,'lab_progress');progressWrites++;return {error:failProgress?{message:'Mock progress failure'}:null}}
})};
const document={getElementById:id=>els[id]||null,querySelectorAll:()=>[],addEventListener(){}};
const context=createContext({document,window:{addEventListener(){}},console,Date,Number,String,Set,URLSearchParams});
new Script(source).runInContext(context);
context.sb=sb;
new Script(`
PLAYER.lab={id:'SITE-001',skill:'RISK',book:6};PLAYER.mode='practice';
PLAYER.access={user:{id:'fixture-member'},sb};
collectDecision=()=>({decision:'wait',confidence:4,structure:'range',location:'at support',
 volume:'low',invalidation:'below support',notes:'no entry'});
processScore=()=>100;processBreakdown=()=>({decision:true});
`).runInContext(context);
const run=()=>new Script('saveAttempt()').runInContext(context);
await run();
assert.equal(inserts,1);
assert.equal(progressWrites,1);
assert.equal(els['complete-attempt'].disabled,false,'Failed progress sync allows safe retry');
assert.match(els['attempt-msg'].textContent,/saved, but Lab progress was not synchronized/);
assert.match(els['complete-attempt'].textContent,/Retry progress sync/);
failProgress=false;
await run();
assert.equal(inserts,1,'Retry must not insert a duplicate reflection');
assert.equal(progressWrites,2);
assert.equal(els['complete-attempt'].disabled,true);
assert.match(els['attempt-msg'].innerHTML,/progress synchronized/);
assert.equal(els['discuss-lab'].hidden,false);
new Script('PLAYER.reflectionSaved=false;PLAYER.attemptGeneration++;').runInContext(context);
await Promise.all([run(),run()]);
assert.equal(inserts,2,'Concurrent saves must insert a single reflection for a new attempt');
console.log('PASS member reflection saved-vs-progress truth, retry idempotency, and double-click guard');
