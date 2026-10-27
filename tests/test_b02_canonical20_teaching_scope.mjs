/* B02 first-20 source/content boundary; no private grading keys or member data.
 * This contract does NOT claim 20 authored/reviewed lessons or beta acceptance.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const document=JSON.parse(readFileSync(new URL('../docs/qa/2026-10-27_B02_CANONICAL20_TEACHING_MANIFEST.json',import.meta.url),'utf8'));
const ids=['F2-C03-L02','F2-C04-L01','F2-C04-L02','F2-C05-L01','F2-C05-L02','F2-C05-L03',
 'F2-C06-L01','F2-C06-L02','F2-C07-L01','F2-C07-L02','F2-C07-L03',
 'F2-C08-L01','F2-C08-L02','F2-C08-L03','F2-C08-L04','F2-C08-L05','F2-C08-L06',
 'F2-C09-L01','F2-C09-L02','F2-C09-L03'];
assert.equal(document.scope.batchCode,'2026-10-27-B02');
assert.equal(document.scope.labCount,20);
assert.equal(document.status,'B02_EDITORIAL_DEVELOPMENT_NOT_PUBLISHED');
assert.equal(document.scope.canonicalBook,'FOUNDATION_BOOK_2');
assert.equal(document.scope.memberStatus,'Not Beta Ready');
assert.deepEqual(document.labs.map(x=>x.labId),ids);
assert.equal(new Set(ids).size,20);
const fields=['canonicalTitle','learningObjective','fictionalDemonstration','guidedDecision','independentTransfer','riskBoundary'];
for(const [i,lab] of document.labs.entries()){
 assert.equal(lab.sortOrder,20006+i,'B02 must reuse canonical registry sorting');
 assert.equal(lab.bookCode,'FOUNDATION_BOOK_2');
 assert.equal(lab.chapter,Number(lab.labId.match(/^F2-C(\d+)-/)[1]));
 assert.equal(lab.historicalEvidence,'FICTIONAL_EXAMPLE_NOT_HISTORICAL');
 assert.equal(lab.assessmentStatus,'EXISTING_V96_DRAFT_NOT_GRADED');
 assert.equal(lab.editorialStatus,'AUTHORING_BRIEF_REQUIRES_INDIVIDUAL_CONTENT_REVIEW');
 assert.equal(lab.betaStatus,'NOT_YET_READY');
 for(const field of fields){
  assert.equal(typeof lab[field],'string',lab.labId+' missing '+field);
  assert.ok(lab[field].trim().length>50,lab.labId+' insufficient '+field);
 }
 assert.match(lab.fictionalDemonstration,/fictional/i,'B02 practice must never claim historical market evidence');
 for(const secret of ['answer_key','correctAnswer','authToken','userId','reviewedBy'])assert.equal(Object.hasOwn(lab,secret),false,'No protected/private answer material in B02 source');
}
const b01=[ 'F1-C02-L01','F1-C02-L02','F1-C04-L01','F1-C06-L01','F1-C07-L01','F1-C07-L02',
 'F1-C08-L01','F1-C08-L02','F1-C08-L03','F1-C09-L01','F1-C10-L01','F1-C10-L02',
 'F1-C12-L01','F1-C13-L01','F1-C13-L02','F2-C01-L01','F2-C02-L01','F2-C02-L02','F2-C02-L03','F2-C03-L01'];
assert.equal(b01.filter(x=>ids.includes(x)).length,0,'Never overlap B01 and B02');
console.log('PASS B02: 20 original canonical IDs; six instructional briefs per Lab, no B01 overlap, private keys or unapproved beta claims.');
