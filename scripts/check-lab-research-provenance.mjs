/* v0.14.0.165: every canonical Lab has a research pathway, not a
 * fabricated historical source credential. Uses built-in Node only. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const originalFile='docs/419_LAB_EDITORIAL_ACCEPTANCE_v014100.csv';
const crosswalkFile='docs/research/419_LAB_RESEARCH_AND_HISTORICAL_PROVENANCE_CROSSWALK_v014165.csv';
const visualFile='docs/qa/LAB-UX-STD-001_419_Lab_Visual_Audit.json';
function csvRows(text){
 const result=[];let row=[],value='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){
   if(quoted&&text[i+1]==='"'){value+='"';i++}
   else quoted=!quoted;
  }else if(c===','&&!quoted){row.push(value);value=''}
  else if((c==='\n'||c==='\r')&&!quoted){
   if(c==='\r'&&text[i+1]==='\n')i++;
   row.push(value);if(row.some(x=>x!==''))result.push(row);
   row=[];value='';
  }else value+=c;
 }
 if(row.length||value){row.push(value);result.push(row)}
 assert.equal(quoted,false,'Unterminated CSV quoted value');
 const heads=result.shift();
 return result.map(values=>{
  assert.equal(values.length,heads.length,'CSV column mismatch');
  return Object.fromEntries(heads.map((key,n)=>[key,values[n]]));
 });
}
const original=csvRows(fs.readFileSync(originalFile,'utf8'));
const rows=csvRows(fs.readFileSync(crosswalkFile,'utf8'));
const visual=JSON.parse(fs.readFileSync(visualFile,'utf8'));
assert.equal(original.length,419,'Original canonical count must remain 419');
assert.equal(rows.length,419,'Crosswalk must cover exactly 419 canonical Labs');
assert.equal(visual.canonicalLabCount,419);
assert.equal(visual.competencyCount,30,'Never add a 31st official competency');
const canonical=new Map(original.map(lab=>[lab.lab_id,lab]));
assert.equal(canonical.size,419,'Canonical Lab IDs must be unique');
const seen=new Set(),summary={};
for(const row of rows){
 assert(!seen.has(row.lab_id),'Duplicated source Lab: '+row.lab_id);
 seen.add(row.lab_id);
 const approved=canonical.get(row.lab_id);
 assert(approved,'Crosswalk inserted unknown Lab '+row.lab_id);
 assert.equal(row.collection,approved.collection,'Collection mismatch '+row.lab_id);
 assert.equal(row.title,approved.title,'Title mismatch '+row.lab_id);
 assert.equal(row.source_narrative_present,approved.existing_substantive_narrative);
 assert.equal(row.proposed_visual,visual.labs[row.lab_id]?.visualTypeSuggested);
 assert(row.archive_note_reference.startsWith('BATCH_'));
 assert(row.verification_questions.length>=35,'Missing evidence request '+row.lab_id);
 assert.equal(row.verified_historical_ohlcv,'NOT_VERIFIED',
  'Never mark historical data verified from topic/visual suggestions');
 assert.equal(row.individual_editorial_acceptance,'NOT_REVIEWED');
 assert.equal(row.deployment_status,'NOT_PRODUCTION_ACCEPTED');
 summary[row.proposed_visual]=(summary[row.proposed_visual]||0)+1;
}
assert.deepEqual([...seen].sort(),[...canonical.keys()].sort());
assert.equal(visual.summary.approvedVerifiedHistoricalChartsFromThisAudit,0);
console.log('PASS: 419/419 source research pathways; 30 competencies unchanged; zero false historical or editorial attestations.');
console.log('Visual suggestions (not approved): '+JSON.stringify(summary));
