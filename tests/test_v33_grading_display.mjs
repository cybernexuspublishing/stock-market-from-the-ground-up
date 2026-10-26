/* Source-level v3.3 grade-view contract: no production member access. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,createContext} from 'node:vm';
const read=p=>readFileSync(p,'utf8');
const source=read('assets/js/lab-v33-grade-display.js');
const engine=read('assets/js/lab-engine-v32-universal.js');
const training=read('assets/js/interactive-training.js');
const markup=read('lab-player.html');
const styles=read('assets/css/lab-v33-experience.css');
assert.doesNotThrow(()=>new Script(source));
assert.doesNotThrow(()=>new Script(engine));
assert.doesNotThrow(()=>new Script(training));
assert(markup.includes('lab-v33-grade-display.js'));
assert(engine.includes('GroundUpLabV33GradeDisplay?.mount?.({labId,target:recorded})'));
assert(markup.includes('class="journey-progress-track-inner"'));
assert(markup.indexOf('id="player-stage-grid"')>markup.indexOf('id="player-stage-progress"'));
assert(engine.includes("heading.hidden=stage===0"));
assert(!engine.includes("0:'Start — Your personal learning session'"));
assert(!source.includes('/rpc/')&&!source.includes('supabase/migrations'));
assert(source.includes('/api/interactive-training?action=progress'));
assert(styles.includes('grid-template-columns:repeat(9,minmax(0,1fr))'));
assert(training.includes('Reviewed conceptual assessment:'));
class Element{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attrs={};this.style={};this.textContent='';this.isConnected=true;}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=[...nodes]}
 setAttribute(key,value){this.attrs[key]=String(value)}
}
const document={createElement:tag=>new Element(tag),createTextNode:value=>{const el=new Element('#text');el.textContent=String(value);return el}};
const json={ok:true,truncated:false,latestByLab:[{labId:'F2-C07-L01',score:92,mode:'guided',completedAt:'2026-10-24T21:00:00Z'}],
 latestAssessmentByLab:[{labId:'F2-C07-L01',score:84,mode:'assessment',completedAt:'2026-10-23T21:00:00Z'}],
 recentCompleted:[{labId:'F2-C07-L01',score:92,mode:'guided',completedAt:'2026-10-24T21:00:00Z'},
 {labId:'F2-C07-L01',score:84,mode:'assessment',completedAt:'2026-10-23T21:00:00Z'},
  {labId:'F2-C07-L01',score:76,mode:'assessment',completedAt:'2026-10-22T21:00:00Z'}]};
const ctx=createContext({document,console,Date,
 getSupabaseClient:async()=>({auth:{getSession:async()=>({data:{session:{access_token:'TEST_ONLY'}}})}}),
 fetch:async()=>({ok:true,status:200,json:async()=>json})});
new Script(source).runInContext(ctx);
const target=new Element('section');
assert.equal(await ctx.GroundUpLabV33GradeDisplay.mount({labId:'F2-C07-L01',target}),true);
const walk=node=>[node,...(node.children||[]).flatMap(walk)];
let nodes=walk(target);
assert(nodes.some(x=>x.textContent==='84%'),'An older Assessment-mode score must remain visible when Guided score is newer');
assert(nodes.some(x=>x.textContent.includes('Latest scored Guided activity: 92%')),'Guided score labeled as learning evidence');
assert(nodes.some(x=>x.textContent.includes('Not Yet Assessed')),'Unverified competencies stay unassessed');
assert.equal(nodes.filter(x=>x.className==='gu-v33-grade-dimension').length,4);
assert.equal(nodes.filter(x=>x.attrs['data-grade-dimension']).length,4);
assert(nodes.filter(x=>x.attrs.role==='progressbar').length>=3);
assert(!nodes.some(x=>x.textContent.includes('Grade A')),'Never invent letter-grade thresholds');
const emptyTarget=new Element('section');
assert.equal(await ctx.GroundUpLabV33GradeDisplay.mount({labId:'SITE-999',target:emptyTarget}),true);
assert(walk(emptyTarget).some(x=>x.textContent.includes('Not Yet Assessed')));
json.latestAssessmentByLab=[];
json.latestByLab=[{labId:'F2-C07-L01',score:92,mode:'guided',completedAt:'2026-10-24T21:00:00Z'}];
const guidedOnly=new Element('section');
assert.equal(await ctx.GroundUpLabV33GradeDisplay.mount({labId:'F2-C07-L01',target:guidedOnly}),true);
assert(walk(guidedOnly).some(x=>x.textContent.includes('Not Yet Assessed')));
assert(!walk(guidedOnly).some(x=>x.textContent==='92%'),'Guided score must not be the primary Assessment score');
console.log('PASS Learning v3.3: mode-accurate assessment score, formative exercise labeling, unassessed dimensions');
