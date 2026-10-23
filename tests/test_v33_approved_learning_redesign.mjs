/* Approved unified Lab redesign: no separate Lab product or answer-key leakage.
 * All tests operate on source/synthetic fixtures, not live customer records.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,Script} from 'node:vm';
const file=p=>readFileSync(p,'utf8');
const html=file('lab-player.html');
const engine=file('assets/js/lab-engine-v32-universal.js');
const enhancements=file('assets/js/lab-v33-visual-interactions.js');
const workshop=file('assets/js/lab-v33-decision-workshop.js');
const css=file('assets/css/lab-v33-experience.css');
assert(html.includes('assets/js/lab-v33-visual-interactions.js'));
assert(html.includes('assets/js/lab-v33-decision-workshop.js'));
assert(html.includes('assets/css/lab-v33-experience.css'));
assert(html.indexOf('lab-v33-contextual-visuals.js')<html.indexOf('lab-v33-visual-interactions.js'));
assert(html.indexOf('lab-v33-decision-workshop.js')<html.indexOf('lab-engine-v32-universal.js'));
assert(engine.includes('gu-v33-stage-hero'));
const player=file('assets/js/lab-player.js');
assert(player.includes('bounded(window.getSupabaseClient?.(),8000,null)'), 'SDK cannot stall an unauthenticated sample indefinitely');
assert(player.includes('fetchLabWithDeadline'), 'Lab HTTP operations must have bounded waits');
assert(player.includes("if(response.status===404||response.status===503)"), 'Only missing/unavailable content may enter the separately authorized metadata fallback');
assert(player.includes('serverGuidedAllowed=payload.guidedAllowed===true'), 'Member instruction remains server-authorized');
assert(engine.includes('gu-v33-skill-summary')&&engine.includes('data-skill-dimension'),'Results must include evidence-based four-dimension Skill Development');
for(const dimension of ['Knowledge','Recognition','Decision-making','Process'])assert(engine.includes("'"+dimension+"'"),'Missing skill dimension '+dimension);
assert(engine.includes("'Not Yet Assessed'"),'Never invent competency scores without reviewed evidence');
assert(css.includes('gu-v33-stage-hero')&&css.includes('grid-template-columns'));
assert(css.includes('gu-v33-journey'));
assert(engine.includes("const workshop=root.GroundUpLabV33DecisionWorkshop?.create?.({topic,labId});"));
for(const allowed of ['Explain This Concept','Teach This in More Depth','Show a Guided Example','Try Another Example','Explain My Mistake'])
 assert(engine.includes(allowed),'Learning action missing '+allowed);
for(const forbidden of ['— Always Free','— Free','(free)','free retry'])
 assert(!engine.includes(forbidden),'Member-facing promotional tag remains in v3.3 source: '+forbidden);
assert(enhancements.includes("view.querySelector('details table tbody tr')")||enhancements.includes("view.querySelectorAll('details table tbody tr')"));
assert(enhancements.includes("already rendered fictional OHLCV table"));
assert(!enhancements.includes('/api/verified-replay'));
assert(!enhancements.includes('/api/lab-assessment'));
assert(enhancements.includes('aria-pressed'));
assert(engine.includes('server-graded question bank'),'Assessment must remain protected');
for(const p of ['assets/js/lab-v33-visual-interactions.js','assets/js/lab-v33-decision-workshop.js','assets/js/lab-engine-v32-universal.js'])
 assert.doesNotThrow(()=>new Script(file(p),{filename:p}));
class E{
 constructor(tag){this.tag=tag;this.children=[];this.handlers={};this.attrs={};this.className='';this.textContent='';this.value='';this.maxLength=0;this.disabled=false;this.style={}}
 append(...x){this.children.push(...x)}
 setAttribute(k,v){this.attrs[k]=v}
 addEventListener(k,f){this.handlers[k]=f}
}
const doc={createElement:t=>new E(t)};
const world=createContext({document:doc});
new Script(workshop).runInContext(world);
const w=world.GroundUpLabV33DecisionWorkshop;
assert.equal(w.caseIds.length,8);
assert.equal(new Set(w.caseIds).size,8);
const subjects=[
 ['VWAP reclaim','H-01'],
 ['journal thesis','H-02'],
 ['risk reward target','H-03'],
 ['level II spread','H-04'],
 ['net costs','H-05'],
 ['earnings timing','H-06'],
 ['price action pattern','H-07'],
 ['scanner eligibility','H-08']
];
for(const [topic,id] of subjects){assert.equal(w.choose(topic)?.id,id,'Wrong matched research scenario for '+topic)}
assert.equal(w.choose('Corporate voting rights'),null,'Do not introduce unrelated decision cards');
const view=w.create({topic:'level II spread',labId:'TAPE-C04-L01'});
assert.equal(view.tag,'details','Practice extension should remain collapsed until requested');
function all(n){return[n,...(n.children||[]).flatMap(all)]}
const elements=all(view);
const answer=elements.find(n=>n.tag==='textarea');
const lock=elements.find(n=>n.tag==='button');
assert(answer&&lock);
assert(!elements.some(n=>String(n.textContent).includes('Spread = $10.10')),'Feedback must not render before learner locks a reason');
answer.value='The quote width is too large and the halt status is unresolved.';
lock.handlers.click();
assert.equal(answer.disabled,true);
assert.equal(lock.disabled,true);
assert(all(view).some(n=>String(n.textContent).includes('Spread = $10.10')),'Meaningful correction must appear after lock');
assert(!workshop.includes('fetch('),'Fictional exercises never post customer answers to third parties');
console.log('PASS approved redesign: protected source boundary, contextual charts, labels, layout, eight original decision cases and locked feedback');
