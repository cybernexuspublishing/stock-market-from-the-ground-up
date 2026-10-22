/* D11: 94 Foundations Labs, do not confuse catalog presence with completed instruction.
 * Derives from the single D10 acceptance ledger and approved existing
 * canonical lab ID metadata. No private manuscript, grading key or synthetic
 * historical price is materialized into the public site.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();
const readJSON=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
const assert=(truth,message)=>{if(!truth)throw Error('D11 FOUNDATIONS CONTRACT: '+message)};
const catalog=readJSON('data/labs.json');
const cross=readJSON('data/competency-lab-paths-v01499.json');
const ledger=readJSON('artifacts/curriculum-acceptance-v014150.json');
const groups={FOUNDATION_BOOK_1:15,FOUNDATION_BOOK_2:46,FOUNDATION_BOOK_3:33};
assert(ledger.labCount===419&&ledger.competencies===30,'D10 evidence schema or skill count changed');
assert(Array.isArray(catalog)&&catalog.length===94,'Foundations public companion metadata must contain exactly 94 entries');
const ids=new Set(),totals={},reviewed=[],map=new Map(ledger.labs.map(l=>[l.id,l]));
for(const source of catalog){
 const id=String(source.id||''),book=Number(source.book),collection='FOUNDATION_BOOK_'+book;
 assert(/^F[123]-C\d{2}-L\d{2}$/.test(id),'invalid Foundations ID '+id);
 assert(book>=1&&book<=3&&Number.isInteger(book),'invalid Foundations book '+id);
 assert(!ids.has(id),'duplicate Foundations ID '+id);ids.add(id);
 assert(typeof source.concept==='string'&&source.concept.trim().length>=8,'missing concept '+id);
 assert(source.chapter>=1&&Number.isInteger(source.chapter),'invalid chapter '+id);
 const mapped=cross.byLab[id],evidence=map.get(id);
 assert(mapped?.bookCode===collection,'canonical crosswalk mismatch '+id);
 assert(evidence?.collection===collection,'acceptance-ledger mismatch '+id);
 assert(evidence.title===source.concept,'Lab source title changed '+id);
 const gap=Object.entries(evidence.criterionStatus).filter(([k,v])=>v!=='REVIEW_RECORDED').map(([k])=>k);
 const row={
  id,collection,book,chapter:source.chapter,title:source.concept,
  existingRegistry:'PRESENT',draftAssessment:'PRIVATE_V96_DRAFT_UNVERIFIED',
  independentPrivateInstruction:'NOT_VERIFIED_IN_GITHUB_SOURCE',
  bookManuscriptStatus:'V1_14_OWNER_FROZEN_NOT_REPRODUCED',
  historicalFeed:'NOT_INDEPENDENTLY_LICENSE_VERIFIED',
  contentEditorialStatus:evidence.criterionStatus.editorial,
  competencyCrosswalk:mapped.relatedCompetencies,
  remainingCriteria:gap,
  accepted:evidence.accepted,
  productionAccepted:false
 };
 reviewed.push(row);totals[collection]=(totals[collection]||0)+1;
}
for(const [group,expected] of Object.entries(groups)){
 assert(totals[group]===expected,'collection mismatch: '+group);
 assert(ledger.labs.filter(l=>l.collection===group).length===expected,'ledger collection mismatch: '+group);
}
const report={
 schema:'groundup-d11-foundations-lab-quality-v1',
 releaseTarget:'v0.14.0.151',scope:'94 Foundations private-authoring and member-delivery acceptance',
 sourceVersion:'D11 source candidate—not accepted or deployed',
 generatedAt:new Date().toISOString(),
 foundationsByBook:groups,total:reviewed.length,
 reviewedAcceptance:reviewed.filter(r=>r.accepted).length,
 productionAcceptanceVerified:false,
 blockingRequirements:[
  'Per-Lab private instruction from approved Book I/II/III manuscript or reviewed original companion content',
  'Reviewed topic-specific questions and private rubrics that cannot be learned from future bars',
  'Live book-entitlement authorization, member A/B and restricted/Showcase denial',
  'Source-permitted chart evidence, corporate-action review and no-lookahead graded replay',
  'Instructional quality, screen-reader/mobile navigation, trained reviewer and recorded test evidence'
 ],
 note:'Registered IDs, book concepts, supplemental question drafts, or CI results alone are NOT completed Labs.',
 labs:reviewed
};
mkdirSync(join(root,'artifacts'),{recursive:true});
writeFileSync(join(root,'artifacts/d11-foundations-94-content-gaps.json'),JSON.stringify(report,null,2)+'\n');
const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const columns=['lab_id','collection','chapter','concept','catalog_present','editorial_status','missing_criteria','accepted','production_verified'];
const csv=[
 columns,
 ...reviewed.map(r=>[r.id,r.collection,r.chapter,r.title,r.existingRegistry,r.contentEditorialStatus,r.remainingCriteria.join(';'),r.accepted,r.productionAccepted])
].map(row=>row.map(quote).join(',')).join('\n')+'\n';
writeFileSync(join(root,'artifacts/d11-foundations-94-content-gaps.csv'),csv);
console.log('D11 Foundations: '+report.reviewedAcceptance+'/'+report.total+' individually reviewed with all criteria recorded; actual production acceptance NOT VERIFIED.');
