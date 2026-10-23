/* Source-only v3.2/v3.3 reconciliation contract; no network, account, grades, or trades. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const player=fs.readFileSync('assets/js/lab-player.js','utf8');
const journey=fs.readFileSync('assets/js/lab-engine-v32-universal.js','utf8');
const html=fs.readFileSync('lab-player.html','utf8');
const css=fs.readFileSync('assets/css/lab-engine-v33-workstation.css','utf8');
assert.doesNotThrow(()=>new vm.Script(player,{filename:'lab-player.js'}));
assert.doesNotThrow(()=>new vm.Script(journey,{filename:'lab-engine-v32-universal.js'}));
assert(html.includes('lab-engine-v33-workstation.css'));
assert(html.indexOf('lab-engine-v32-teaching.css')<html.indexOf('lab-engine-v33-workstation.css'));
for(const token of ['class="gu-ws"','gu-ws-disclosures','gu-ws-member-workbench','gu-v32-teaching-slot','gu-ws-study-source','v014-training-slot','complete-attempt'])
 assert(player.includes(token),'Missing integrated component: '+token);
assert(player.indexOf('gu-v32-teaching-slot')<player.indexOf('v014-training-slot'),'Shared education must appear before protected decision and grading');
assert(!player.includes('class="lab-learning-split"'),'Deprecated permanently expanded split layout must not return');
assert(player.includes('serverGuidedAllowed===true'),'Access gate must remain server-authoritative');
assert(player.includes('serverAdvancedAllowed===true'),'Advanced access gate must remain server-authoritative');
assert(player.includes("blind?'':originalScenarioLink(lab)"),'Do not preload synthetic scenario cue in Blind/Assessment');
assert(player.includes("if(!blind)void attachFoundationsCurriculum(lab.id)"),'No competency cue before Blind decision lock');
assert(journey.includes('authorizedTeaching'),'Authorized Lab-specific teaching must precede general fallback');
assert(journey.includes('gu-v33-progress'),'Nine-stage progress must be visible');
assert(journey.includes('No answer keys, conceptual hints'),'Blind/Assessment may render a shell without disclosing answers');
assert(journey.includes('getElementById(\'gu-ws-member-workbench\')'),'Assessment must open the existing protected workbench');
assert(css.includes('gu-v33-journey')&&css.includes('background:#151e28'),'Stage grid must use legible dark styling');
assert(css.includes('@media(max-width:740px)'),'Small-screen layout must be supported');
console.log('PASS Learning v3.3 source: compact v3.2 workstation, nine stages, protected member controls and blind concealment');
