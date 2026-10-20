// Source-inventory QA: NEVER infer member grades or production release from ID counts.
// Run: node scripts/check-419-editorial-register.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const labs=JSON.parse(text('lab-catalog.json')).labs;
const cross=JSON.parse(text('data/competency-lab-paths-v01499.json'));
const guides=JSON.parse(text('data/competency-study-guides-v01499.json'));
const csv=text('docs/419_LAB_EDITORIAL_ACCEPTANCE_v014100.csv');
function parse(text){
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const ch=text[i];
  if(ch==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted;continue}
  if(!quoted&&ch===','){row.push(field);field='';continue}
  if(!quoted&&ch==='\n'){row.push(field);rows.push(row);row=[];field='';continue}
  if(ch!=='\r')field+=ch;
 }return rows;
}
const [header,...records]=parse(csv);
assert.equal(records.length,419,'All source Lab IDs require their own editorial acceptance record');
assert.equal(labs.length,419);
assert.equal(new Set(records.map(r=>r[0])).size,419,'No duplicated editorial records');
const index=new Map(records.map(r=>[r[0],Object.fromEntries(header.map((h,i)=>[h,r[i]]))]));
const guideCodes=new Set(guides.guides.map(x=>x.code));
let detailed=0,foundations=0;
for(const lab of labs){
 const r=index.get(lab.lab_id);assert(r,lab.lab_id+' is missing an acceptance entry');
 assert.equal(r.collection,lab.book_code);
 assert.equal(r.title,lab.title);
 assert.equal(r.original_scenario_code,'GUSIM_'+lab.lab_id.replaceAll('-','_'));
 assert.equal(r.hypothetical_assessment_source,'v96_PRIVATE_DRAFT_NOT_REVIEWED');
 assert.equal(r.verified_historical_data,'NOT_VERIFIED');
 for(const fld of ['grading_accepted','e2e_accepted','owner_editorial_accepted','production_accepted'])
  assert.equal(r[fld],'NOT_CONFIRMED','No fictional acceptance or made-up certification: '+lab.lab_id+' '+fld);
 const m=lab.metadata||{},rich=Array.isArray(m.how)&&m.how.length>=3&&
  ['what','why','when','objective'].every(k=>typeof m[k]==='string'&&m[k].trim().length>=26)&&
  Array.isArray(m.questions)&&m.questions.length>0;
 assert.equal(r.existing_substantive_narrative,rich?'YES_SOURCE_TEXT':'NO_PRIVATE_BOOK_INSTRUCTION_ONLY');
 if(rich)detailed++;else foundations++;
 const canonical=cross.byLab[lab.lab_id];assert(canonical);
 for(const c of canonical.relatedCompetencies)assert(guideCodes.has(c));
 assert.deepEqual([r.competency_1,r.competency_2,r.competency_3].filter(Boolean),canonical.relatedCompetencies.slice(0,3));
}
assert.equal(detailed,325);assert.equal(foundations,94);
console.log('PASS 419 editorial records, 325 source narratives, 94 Foundations source gaps; 419 independent pending approvals; 0 fabricated customer readiness.');
