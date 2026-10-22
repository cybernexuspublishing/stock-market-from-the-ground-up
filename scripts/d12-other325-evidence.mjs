/* D12 v0.14.0.152 — other 325 Lab gap report, never private data or auto-acceptance. */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const get=p=>JSON.parse(readFileSync(p,'utf8'));
const source=get('lab-catalog.json'),cross=get('data/competency-lab-paths-v01499.json'),
 ledger=get('artifacts/curriculum-acceptance-v014150.json');
const groups={DAY_TRADING_BOOK_1:150,READING_THE_TAPE:75,SITE_EXCLUSIVE:100};
if(!Array.isArray(source.labs)||source.labs.length!==419||ledger.labCount!==419||
 Object.keys(cross.byLab||{}).length!==419)throw Error('D12 canonical 419-Lab baseline unavailable');
const byId=new Map(ledger.labs.map(l=>[l.id,l])),counts={},seen=new Set(),rows=[];
for(const c of source.labs){
 if(String(c.book_code||'').startsWith('FOUNDATION_BOOK_'))continue;
 const {lab_id:id,book_code:collection,title}=c;
 if(!(collection in groups)||!id||seen.has(id)||typeof title!=='string'||title.length<3)
  throw Error('D12 source invalid or duplicate canonical Lab ID');
 seen.add(id);
 const m=cross.byLab[id],l=byId.get(id);
 if(!m||!l||m.bookCode!==collection||m.title!==title||l.collection!==collection||
  !Array.isArray(m.relatedCompetencies)||m.relatedCompetencies.length<1)
  throw Error('D12 mapping/title/evidence contract mismatch for '+id);
 counts[collection]=(counts[collection]||0)+1;
 rows.push({id,collection,title,competencies:m.relatedCompetencies,
  canonicalRegistered:true,privateInstructionVerified:false,privateAssessmentVerified:false,
  separatelyRecordedCriterionReview:l.criterionStatus,
  recordedAllCriteria:l.accepted,productionVerified:false,
  missingCriteria:Object.entries(l.criterionStatus).filter(([k,v])=>v!=='REVIEW_RECORDED').map(([k])=>k)});
}
for(const [k,n] of Object.entries(groups))if(counts[k]!==n)throw Error('D12 incorrect '+k+' count');
if(rows.length!==325||seen.size!==325)throw Error('D12 expected exactly 325 independent IDs');
const report={schema:'groundup-d12-other325-lab-qa-v1',versionTarget:'v0.14.0.152',
 sourceOnly:true,productionAccepted:false,privateDatabaseRowsRead:false,
 total:325,groups,recordedAllCriteria:rows.filter(x=>x.recordedAllCriteria).length,
 warning:'No individual rubric, manuscript, member permissions, chart rights, teaching quality, server grading or historical truth is independently verified by this catalog audit.',
 rows};
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/d12-other325-acceptance.json',JSON.stringify(report,null,2)+'\n');
const escaped=s=>'"'+String(s??'').replaceAll('"','""')+'"';
writeFileSync('artifacts/d12-other325-acceptance.csv',
 [['lab_id','collection','title','competencies','review_recorded','production_verified','missing_criteria'],
 ...rows.map(r=>[r.id,r.collection,r.title,r.competencies.join(';'),r.recordedAllCriteria,r.productionVerified,r.missingCriteria.join(';')])]
 .map(r=>r.map(escaped).join(',')).join('\n')+'\n');
console.log('PASS D12 source inventory: 325 canonical ID/title/competency rows; 150/75/100 collections; acceptance not inferred');
