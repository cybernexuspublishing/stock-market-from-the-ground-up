/* Ten-stage Learning Workstation v4.4: source-contract and policy regression.
 * Does not purport to grade all 419 distinct Lab editorial experiences. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const engine=get('assets/js/lab-engine-v32-universal.js');
const stylesheet=get('assets/css/learning-workstation-v44.css');
assert.doesNotThrow(()=>new Script(engine));
assert(engine.includes("const STEPS=Object.freeze(['Start','Learn','Experiment','Predict','Practice','Assess','Review','Transfer','Results']);"),'Backend stage IDs stay unchanged');
assert(engine.includes("const DISPLAY_STEPS=Object.freeze(['Start','Learn','Calculate','Experiment','Predict','Replay / Practice','Assess','Review & Retry','Transfer Challenge','Results']);"),'Visible stages must total ten');
assert(engine.includes("if(stage===2&&!calculateDone){renderCalculateGate();return}"),'Calculate is a real instructional step, not a decorative label');
assert(engine.includes("calculateDone=true;render()"),'Completed method check opens Experiment');
assert(engine.includes("if(stage===2&&!calculateDone){mark("),'Next cannot skip the Calculate method check');
assert(engine.includes("if(chosen.value!=='0')"),'Incorrect method answer must not pass');
assert(engine.includes("proceed.disabled=false"),'A correct method answer unlocks continuation');
assert(engine.includes('Free explanations and retries remain available'),'Remediation remains free');
assert(engine.includes("['blind','assessment'].includes(mode)"),'Protected modes unchanged');
assert(engine.includes("answer keys")||engine.includes("Answer keys"),'Independent answer keys remain protected');
assert(!engine.includes('Check my answer — free retry'),'No promotional labels in the instructional buttons');
for(const path of ['lab-player.html','bootcamp-academy.html'])
 assert(get(path).includes('assets/css/learning-workstation-v44.css'),path+' must load the shared design');
assert(stylesheet.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),'Three-column navigator required');
assert(stylesheet.includes('grid-template-columns:minmax(0,1.22fr) minmax(0,.9fr)'),'Chart-left Talia-right workstation required');
assert(stylesheet.includes('@media(max-width:1100px)'),'Small screens stack');
console.log('PASS 10-stage design, real ungraded Calculate gate, chart-left Talia-right, protected assessment and backend ID compatibility');
