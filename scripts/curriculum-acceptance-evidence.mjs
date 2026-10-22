/* Source-only acceptance ledger for D11–D14 and D18; does not grant progress.
 * Every canonical Lab and Bootcamp day is emitted, even if unreviewed.
 * Source registrations and structural CI never confer editorial acceptance.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {bootcampCurriculumV014144} from '../functions/_lib/bootcamp-curriculum-v014144.js';
const root=process.cwd(),read=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
const labData=read('data/competency-lab-paths-v01499.json');
const guides=read('data/competency-study-guides-v01499.json');
const decisions=read('docs/curriculum-acceptance-decisions-v014150.json');
const groups={FOUNDATION_BOOK_1:15,FOUNDATION_BOOK_2:46,FOUNDATION_BOOK_3:33,
 DAY_TRADING_BOOK_1:150,READING_THE_TAPE:75,SITE_EXCLUSIVE:100};
const labCriteria=['instruction','assessment','rubric','dataEvidence','visuals',
 'accessibility','endToEnd','editorial','production'];
const bootCriteria=['instruction','exercises','assessments','labIntegration',
 'competencyMapping','tutorIntegration','accessibility','endToEnd','editorial','production'];
function validDecision(obj){
 return obj&&obj.status==='accepted'&&typeof obj.reviewer==='string'&&
 obj.reviewer.trim().length>=3&&typeof obj.evidenceRef==='string'&&
 obj.evidenceRef.trim().length>=8&&typeof obj.reviewedAt==='string'&&
 /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(obj.reviewedAt)&&
 Number.isFinite(Date.parse(obj.reviewedAt))&&Date.parse(obj.reviewedAt)<=Date.now()+300000;
}
function decisionsFor(bucket,id,criteria){
 const choice=bucket[id]||{};
 return Object.fromEntries(criteria.map(k=>[k,validDecision(choice[k])?'REVIEW_RECORDED':'UNVERIFIED']));
}
function check(cond,why){if(!cond)throw Error('CURRICULUM EVIDENCE CONTRACT: '+why)}
check(labData.totalCanonicalLabs===419,'canonical catalog target changed');
check(Object.keys(labData.byLab).length===419,'canonical lab list changed');
const counts={};const ids=new Set();
const labRows=Object.entries(labData.byLab).map(([id,v])=>{
 check(id&&!ids.has(id),'empty or duplicate ID');ids.add(id);
 check(groups[v.bookCode]!==undefined,'unexpected collection '+v.bookCode);
 check(Array.isArray(v.relatedCompetencies),'mapping invalid');
 counts[v.bookCode]=(counts[v.bookCode]||0)+1;
 const review=decisionsFor(decisions.labDecisions||{},id,labCriteria);
 return {id,collection:v.bookCode,title:v.title,
  mappedCompetencies:v.relatedCompetencies,criterionStatus:review,
  accepted:labCriteria.every(k=>review[k]==='REVIEW_RECORDED')};
});
for(const [key,n] of Object.entries(groups))check(counts[key]===n,'collection size '+key);
const codeSet=new Set(guides.guides.map(g=>g.code));
check(codeSet.size===30,'exact 30 competencies required');
const days=bootcampCurriculumV014144.days;
check(days.length===30,'30-day sequence changed');
const bootRows=days.map((day,i)=>{
 check(day.day===i+1,'unexpected Bootcamp day');
 check(day.competencies.every(code=>codeSet.has(code)),'unknown competency day '+day.day);
 check(day.relatedLabs.every(lab=>ids.has(lab.id)),'invalid Lab bridge day '+day.day);
 const review=decisionsFor(decisions.bootcampDecisions||{},String(day.day),bootCriteria);
 return {day:day.day,title:day.title,relatedLabs:day.relatedLabs.map(l=>l.id),
  mappedCompetencies:day.competencies,criterionStatus:review,
  accepted:bootCriteria.every(k=>review[k]==='REVIEW_RECORDED')};
});
const extraLabs=Object.keys(decisions.labDecisions||{}).filter(id=>!ids.has(id));
const extraDays=Object.keys(decisions.bootcampDecisions||{}).filter(id=>!days.some(d=>String(d.day)===id));
check(extraLabs.length===0&&extraDays.length===0,'unrecognized signed acceptance IDs');
const acceptedByGroup=Object.fromEntries(Object.keys(groups).map(k=>
 [k,labRows.filter(r=>r.collection===k&&r.accepted).length]));
const summary={
 schema:'groundup-curriculum-acceptance-evidence-v1',type:'source-ledger-not-live-certified',
 createdAt:new Date().toISOString(),labCount:419,bootcampDays:30,competencies:30,
 groups,acceptedByGroup,
 acceptedLabs:labRows.filter(l=>l.accepted).length,
 acceptedDays:bootRows.filter(d=>d.accepted).length,
 independentProductionAcceptanceVerified:false,
 warnings:['A catalog ID is NOT a completed lesson or assessment.',
 'Recorded review fields require independent confirmation of evidence and actual customer-visible behavior.',
 'No actual market observations, rubrics or confidential student data are included.'],
 labs:labRows,bootcamp:bootRows
};
mkdirSync(join(root,'artifacts'),{recursive:true});
writeFileSync(join(root,'artifacts/curriculum-acceptance-v014150.json'),JSON.stringify(summary,null,2)+'\n');
function escapeCsv(s){const txt=String(s??'');return '"'+txt.replaceAll('"','""')+'"'}
const headers=['entity','id','collection','title','accepted','missingCriteria'];
const rows=[
 ...labRows.map(r=>['LAB',r.id,r.collection,r.title,String(r.accepted),
  labCriteria.filter(k=>r.criterionStatus[k]!=='REVIEW_RECORDED').join(';')]),
 ...bootRows.map(r=>['BOOTCAMP',r.day,'30_DAY',r.title,String(r.accepted),
  bootCriteria.filter(k=>r.criterionStatus[k]!=='REVIEW_RECORDED').join(';')])
];
writeFileSync(join(root,'artifacts/curriculum-acceptance-v014150.csv'),
 headers.map(escapeCsv).join(',')+'\n'+rows.map(r=>r.map(escapeCsv).join(',')).join('\n')+'\n');
console.log('Curriculum evidence ledger: '+summary.acceptedLabs+'/419 Labs, '+
 summary.acceptedDays+'/30 Bootcamp days have all review fields recorded. '+
 'No production or historical market-data verification is implied.');
