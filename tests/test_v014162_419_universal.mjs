/* All 419 v3.2 source journeys load from the existing single canonical catalog. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const mapping=JSON.parse(readFileSync('data/competency-lab-paths-v01499.json','utf8'));
const guides=JSON.parse(readFileSync('data/competency-study-guides-v01499.json','utf8'));
const validCodes=new Set(guides.guides.map(x=>x.code));
assert.equal(Object.keys(mapping.byLab).length,419);
assert.equal(validCodes.size,30);
for(const [id,v] of Object.entries(mapping.byLab)){
 assert(v.relatedCompetencies.length>0,'Missing competency bridge '+id);
 assert(v.relatedCompetencies.some(code=>validCodes.has(code)),'No approved guide '+id);
}
class El {
 constructor(name='section'){this.name=name;this.children=[];this.value='';this.textContent='';}
 append(...x){this.children.push(...x)}
 replaceChildren(...x){this.children=x}
 setAttribute(){}
 addEventListener(){}
 focus(){}
}
const sources={'/data/competency-lab-paths-v01499.json':mapping,'/data/competency-study-guides-v01499.json':guides};
const c={globalThis:null,document:{createElement:(x)=>new El(x)},fetch:async u=>({ok:!!sources[u],json:async()=>sources[u]})};c.globalThis=c;
runInNewContext(readFileSync('assets/js/lab-engine-v32-universal.js','utf8'),c);
const api=c.GroundUpLabEngineV32Universal;
assert.equal(api.version,'3.2.0');
assert.equal(api.canonicalTarget,419);
assert.equal(Array.from(api.steps).length,9);
let success=0;
for(const id of Object.keys(mapping.byLab)){
 const target=new El();const ok=await api.mount({labId:id,mode:'guided',target,lab:{id,concept:mapping.byLab[id].title}});
 assert.equal(ok,true,'Conceptual study bridge failed '+id);
 assert.equal(target.children.length,1);
 success++;
}
const refused=new El();assert.equal(await api.mount({labId:'SITE-001',mode:'blind',target:refused}),false);
assert.equal(refused.children.length,0);
assert.equal(await api.mount({labId:'SITE-001',mode:'assessment',target:refused}),false);
assert.equal(await api.mount({labId:'NONCANONICAL',mode:'guided',target:refused}),false);
const player=readFileSync('assets/js/lab-player.js','utf8'),html=readFileSync('lab-player.html','utf8');
assert(player.includes("response.status===404"),'Private book entitlement denials cannot fall back to registry');
assert(player.includes('serverGuidedAllowed===true'),'Server must authorize guided access');
assert(player.includes('serverAdvancedAllowed===true'),'Server must authorize advanced access');
assert(html.includes('lab-engine-v32-universal.js'));
assert(html.includes('player-restart-mode'));
assert(player.includes('fraction>=1/3'),'Mode selection must lock after one-third of the journey');
assert(player.includes('PLAYER.locked||fraction>=1/3'),'Locked decisions cannot switch modes without restart');
assert(player.includes('Server-submitted answers remain unchanged'),'Source must explain reset scope');
assert(readFileSync('assets/js/lab-engine-v32-teaching.js','utf8').includes('box.dataset.v32Progress=String(stage/5)'));
assert(readFileSync('assets/js/lab-engine-v32-universal.js','utf8').includes('wrapper.dataset.v32Progress=String(step/STEPS.length)'));
assert(!readFileSync('assets/js/lab-engine-v32-universal.js','utf8').includes('lab_training_sets_v014'),'Private training keys must not be published');
console.log('PASS shared Lab Engine v3.2 guided study across all '+success+' canonical IDs, exactly 30 competencies and secure mode gates');
