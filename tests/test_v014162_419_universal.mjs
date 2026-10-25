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
 constructor(name='section'){this.name=name;this.children=[];this.value='';this.textContent='';this.dataset={};this.style={};}
 append(...x){this.children.push(...x)}
 replaceChildren(...x){this.children=x}
 setAttribute(){}
 addEventListener(){}
 focus(){}
}
const bridges=JSON.parse(readFileSync('data/lab-teaching-bridges-v014168.json','utf8'));
assert.equal(Object.keys(bridges.entries).length,419,'Canonical shared teaching content must cover 419 IDs');
const sources={'/data/competency-lab-paths-v01499.json':mapping,'/data/competency-study-guides-v01499.json':guides,
 '/data/lab-teaching-bridges-v014168.json':bridges};
const c={globalThis:null,document:{createElement:(x)=>new El(x)},fetch:async u=>({ok:!!sources[u],json:async()=>sources[u]})};c.globalThis=c;
runInNewContext(readFileSync('assets/js/lab-engine-v32-universal.js','utf8'),c);
const api=c.GroundUpLabEngineV32Universal;
assert.equal(api.version,'3.3.0');
assert.equal(api.canonicalTarget,419);
assert.equal(Array.from(api.steps).length,9);
let success=0;
for(const id of Object.keys(mapping.byLab)){
 const target=new El();const ok=await api.mount({labId:id,mode:'guided',target,lab:{id,concept:mapping.byLab[id].title}});
 assert.equal(ok,true,'Conceptual study bridge failed '+id);
 assert.equal(target.children.length,1);
 success++;
}
const refused=new El();assert.equal(await api.mount({labId:'SITE-001',mode:'blind',target:refused}),true);
assert.equal(refused.children.length,1,'Blind mode needs one neutral workstation, not a blank page');
assert.equal(refused.children[0].dataset.v32Progress,'0','Concealed stages cannot award progress');
assert.equal(await api.mount({labId:'SITE-001',mode:'assessment',target:refused}),true);
assert.equal(refused.children.length,1,'Assessment must retain protected decision shell');
assert.equal(await api.mount({labId:'NONCANONICAL',mode:'guided',target:refused}),false);
const player=readFileSync('assets/js/lab-player.js','utf8'),html=readFileSync('lab-player.html','utf8');
assert(player.includes("response.status===404"),'Private book entitlement denials cannot fall back to registry');
assert(player.includes('serverGuidedAllowed===true'),'Server must authorize guided access');
assert(player.includes('serverAdvancedAllowed===true'),'Server must authorize advanced access');
assert(html.includes('lab-engine-v32-universal.js'));
assert(html.includes('player-restart-mode'));
assert(player.includes('PLAYER.locked||policy.stage>=3'),'Mode selection must lock upon reaching Predict stage');
assert(player.includes('PLAYER.locked||stage>=3'),'Locked decisions cannot switch modes without restart');
assert(player.includes('Previously submitted server assessments are not deleted'),'Reset must preserve prior server submissions');
assert(html.includes('player-mode-select'),'Compact accessible mode selector required');
assert(html.includes('player-mode-confirm'),'Inline Yes/Cancel confirmation must remain in the toolbar');
assert(player.includes('inlineModeConfirmation'),'Mode change confirmation must be controlled in the Lab player');
assert(readFileSync('assets/js/lab-engine-v32-teaching.js','utf8').includes('box.dataset.v32Progress=String(stage/5)'));
assert(readFileSync('assets/js/lab-engine-v32-universal.js','utf8').includes('shell.dataset.v32Progress=String(stage/9)'));
assert(readFileSync('assets/js/lab-engine-v32-universal.js','utf8').includes("journey.className='gu-v33-journey'"));
assert(readFileSync('assets/js/lab-engine-v32-universal.js','utf8').includes('Teach This in More Depth'));
assert(!readFileSync('assets/js/lab-engine-v32-universal.js','utf8').includes('lab_training_sets_v014'),'Private training keys must not be published');
console.log('PASS shared Lab Engine v3.3 guided study across all '+success+' canonical IDs, exactly 30 competencies and secure mode gates');
