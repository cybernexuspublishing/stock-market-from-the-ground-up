/* LAB-UX-STD-001 v1.0: canonical scope, visual selection, no-answer
 * leakage and no authorization regressions. Static/offline only.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,Script} from 'node:vm';
const read=p=>readFileSync(p,'utf8');
const map=JSON.parse(read('data/competency-lab-paths-v01499.json'));
const guides=JSON.parse(read('data/competency-study-guides-v01499.json'));
assert.equal(map.totalCanonicalLabs,419);
assert.equal(Object.keys(map.byLab).length,419);
assert.equal(guides.guides.length,30);
assert.equal(new Set(guides.guides.map(g=>g.code)).size,30);
const js=read('assets/js/lab-v33-contextual-visuals.js');
const context=createContext({});new Script(js,{filename:'lab-v33-contextual-visuals.js'}).runInContext(context);
const api=context.GroundUpLabV33Contextual;
assert.equal(api.version,'LAB-UX-STD-001-v1.0');
const distribution={};
for(const [id,entry] of Object.entries(map.byLab)){
 const type=api.select({lab:{id},topic:entry.title,competencies:entry.relatedCompetencies});
 assert(['none','candle','structure','vwap','ema','volume','tape','depth','routing'].includes(type),id);
 distribution[type]=(distribution[type]||0)+1;
}
assert.equal(Object.values(distribution).reduce((a,b)=>a+b,0),419);
for(const [id,type] of Object.entries({
 'F2-C07-L01':'candle','DT-C07-L01':'structure','DT-C11-L01':'vwap',
 'DT-C08-L01':'ema','DT-C09-L01':'volume','TAPE-C01-L01':'tape',
 'F2-C04-L01':'depth','F1-C04-L01':'routing'
})){
 const entry=map.byLab[id];assert(entry,'Missing canonical '+id);
 assert.equal(api.select({topic:entry.title,competencies:entry.relatedCompetencies}),type,id+' requires '+type);
}
assert.equal(api.select({topic:'Identify a Common Stock'}),'none','Do not invent irrelevant charts for abstract subjects');
assert.equal(api.select({lab:{teaching:{visualType:'none'}},topic:'VWAP'}),'none','Approved editorial visual suppression must work');
assert.equal(api.select({lab:{teaching:{visualType:'tape'}},topic:'VWAP'}),'tape','Approved subject visual override must work');
const universal=read('assets/js/lab-engine-v32-universal.js');
for(const stage of [1,2,3,4,6,7])assert(universal.includes('showVisual('+stage),'Missing stage-aware visual '+stage);
assert(universal.includes("if(['blind','assessment'].includes(mode))"),'Protected modes must not mount ungraded teaching');
assert(universal.includes("kind==='vwap'&&root.GroundUpLabV32SyntheticReplay?.create"),'Do not stack a conflicting visual above chronological replay');
for(const label of ['Explain This Concept','Teach This in More Depth','Show a Guided Example','Try Another Example','Explain My Mistake'])
 assert(universal.includes(label),'Missing required free remediation: '+label);
for(const piece of ['The price associated with','No answer keys, conceptual hints','server-graded question bank'])
 assert(read('assets/js/lab-player.js').includes(piece)||universal.includes(piece)||read('assets/js/lab-engine-v33-visual.js').includes(piece),piece+' protected flow not located');
assert(js.includes("!(variant==='practice'||variant==='transfer')"),'Practice/Transfer numerical result must remain masked before answer');
assert(js.includes('FICTIONAL • STUDY ONLY'),'Never present invented price data as real historical market evidence');
assert(!js.includes('/api/interactive-training'),'Fictional visual library must not call the official assessment API');
const html=read('lab-player.html');
assert(html.includes('assets/js/lab-v33-contextual-visuals.js'));
assert(html.includes('assets/js/lab-v33-visual-interactions.js'));
assert(html.indexOf('lab-v33-contextual-visuals.js')<html.indexOf('lab-v33-visual-interactions.js'));
assert(html.indexOf('lab-v33-visual-interactions.js')<html.indexOf('lab-engine-v32-universal.js'));
const controls=read('assets/js/lab-v33-visual-interactions.js');
assert(controls.includes('querySelectorAll'), 'Charts must support inspecting displayed bars');
assert(controls.includes('aria-pressed'), 'Chart toggles must expose selected state');
assert(html.includes('assets/css/lab-v33-contextual-visuals.css'));
assert(html.indexOf('lab-v33-contextual-visuals.js')<html.indexOf('lab-engine-v32-universal.js'),'Visual renderer must load before shared journey');
assert(html.includes('class="site-header"'),'Retain canonical site header');
assert(read('assets/js/labs-inline.js').includes("lab-player.html?lab="),'Retain in-page registry entrypoint');
assert(universal.includes('server-graded question bank'),'Scoring must continue through protected reviewed question bank');
console.log('PASS LAB-UX-STD-001; 419 canonical Labs; 30 competencies; visual types '+JSON.stringify(distribution)+'; nine-stage and member security contracts');
