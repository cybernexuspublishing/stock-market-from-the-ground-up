/* v0.14.0.93 | Owner-private Lab delivery evidence. Read-only; no answer
 * text, questions, personally identifiable records or datasets leave server.
 * Source prechecks are NOT reviewed interactive lesson acceptance.
 */
import {verifiedHistoricalDataset} from './verified-historical-dataset-v014143.js';
const stamp=x=>{const n=Date.parse(x||'');return Number.isFinite(n)?n:NaN};
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
function eligibleRubric(x){
 if(x.review_state!=='reviewed'||!x.reviewed_by||!x.reviewed_at||
    !Array.isArray(x.questions)||!x.questions.length||!x.answer_key||typeof x.answer_key!=='object')return false;
 const ids=x.questions.map(q=>q?.id);
 return ids.every(id=>nonempty(id)&&Object.hasOwn(x.answer_key,id))&&new Set(ids).size===ids.length;
}
function substantiveInstruction(m){
 if(!m||typeof m!=='object')return false;
 return ['what','why','when','objective'].every(k=>nonempty(m[k]))&&
 Array.isArray(m.how)&&m.how.length>=3&&m.how.every(nonempty)&&
 Array.isArray(m.questions)&&m.questions.length>=1;
}
// Private row existence does not establish substantive individualized teaching.
// v96 original hypothetical scaffold is deliberately not a completed lesson.
// Content is read server-side for precheck ONLY and never returned to clients.
function substantivePrivateInstruction(row){
 if(!row||typeof row!=='object'||/^original_hypothetical_unreviewed_/i.test(String(row.source_status||'')))return false;
 const body=row.content;
 if(!body||typeof body!=='object'||Array.isArray(body))return false;
 const concept=body.concept??body.what,steps=body.steps??body.how;
 return nonempty(concept)&&concept.trim().length>=8&&
  nonempty(body.objective)&&body.objective.trim().length>=20&&
  nonempty(body.why)&&body.why.trim().length>=50&&
  Array.isArray(steps)&&steps.length>=3&&steps.every(x=>nonempty(x)&&x.trim().length>=12);
}
// Editorial inventory only. These source-shape checks are NOT lesson
// acceptance and return counts only; no private prose or grader leaves Owner.
function lessonDepthEvidence(row){
 const b=row?.content||{},t=b.teaching||{};
 const steps=Array.isArray(b.steps)?b.steps:Array.isArray(t.how)?t.how:[];
 const has=(v,min)=>typeof v==='string'&&v.trim().length>=min;
 return {
  objective:has(b.objective,20),
  purpose:has(b.why||t.why,50),
  guidedMethod:steps.length>=3&&steps.every(x=>has(x,12)),
  workedExample:has(b.workedExample||t.workedExample,70),
  misconception:has(b.commonError||t.commonError,25),
  limitation:has(b.limitation||t.limitation,30),
  independentTransfer:has(b.transfer||t.transfer,40)
 };
}
function individualizedB01Draft(row){
 const b=row?.content;
 return row?.source_status==='original_hypothetical_unreviewed_v01496'&&
  b?.lessonBatch==='2026-10-25-B01'&&
  b?.authoringStatus==='ORIGINAL_AUTHORED_EDUCATIONAL_DRAFT_NOT_EDITORIALLY_OR_GRADING_ACCEPTED'&&
  nonempty(b.concept)&&nonempty(b.objective)&&
  nonempty(b.workedExample)&&b.workedExample.startsWith('FICTIONAL:')&&
  Array.isArray(b.steps)&&b.steps.length>=4&&b.steps.every(nonempty);
}
function originalSimulation(l,d){
 return !!d&&d.dataset_code==='GUSIM_'+l.lab_id.replaceAll('-','_')&&
  d.status==='published'&&d.dataset_type==='ohlcv'&&d.ticker==='SIMULATION'&&
  d.metadata?.original_synthetic===true&&
  d.metadata?.historical_evidence_verified===false&&
  d.metadata?.licensed_for_member_display===true;
}
function eligibleContext(envelope,dataset){
 if(!envelope||!['verified','published'].includes(envelope.status)||
    !verifiedHistoricalDataset(dataset))return false;
 const series=['context_start_at','teaching_start_at','decision_boundary_at','teaching_end_at','context_end_at'].map(k=>stamp(envelope[k]));
 return series.every(Number.isFinite)&&series.every((t,i)=>i===0||t>=series[i-1]);
}
export function classifyOwnerLabs({labs,instructions,rubrics,envelopes,datasets}){
 for(const rows of [labs,instructions,rubrics,envelopes,datasets])
  if(!Array.isArray(rows)||rows.length>=1000)throw new Error('Lab audit response is incomplete or malformed; pagination review required.');
 const byInstruction=new Set(instructions.map(x=>x.lab_id));
 const privateDepth=new Map(instructions.map(row=>[row.lab_id,lessonDepthEvidence(row)]));
 const substantivePrivate=new Set(instructions.filter(substantivePrivateInstruction).map(x=>x.lab_id));
 const b01Drafts=new Set(instructions.filter(individualizedB01Draft).map(x=>x.lab_id));
 const byAuthored=new Set(labs.filter(x=>substantiveInstruction(x.metadata)).map(x=>x.lab_id));
 const drafted=new Set(rubrics.filter(x=>x.review_state==='draft').map(x=>x.lab_id));
 const reviewed=new Set(rubrics.filter(eligibleRubric).map(x=>x.lab_id));
 const data=new Map(datasets.map(x=>[x.dataset_code,x]));
 const context=new Set(envelopes.filter(x=>eligibleContext(x,data.get(x.dataset_code))).map(x=>x.lab_id));
 const seen=new Set(),breakdown={privateInstructions:0,existingDetailedNarratives:0,originalDraftRubrics:0,reviewedRubrics:0,originalSimulationReady:0,independentlyVerifiedHistoricalContext:0,substantivePrivateLessonPrechecks:0,individualizedB01Drafts:0,depthObjectives:0,depthPurposes:0,depthGuidedMethods:0,depthWorkedExamples:0,depthMisconceptions:0,depthLimitations:0,depthIndependentTransfers:0,depthAllSevenPrechecks:0};
 const counts={DISABLED:0,MISSING_PRIVATE_LESSON:0,MISSING_REVIEWED_GRADING:0,MISSING_LICENSED_HISTORICAL_CONTEXT:0,CONTENT_PRECHECK_ONLY_QA_REQUIRED:0};
 const rows=labs.map(l=>{
  if(!nonempty(l.lab_id)||seen.has(l.lab_id))throw new Error('Duplicate or invalid Lab IDs.');seen.add(l.lab_id);
  const hasInstruction=byInstruction.has(l.lab_id),hasB01Draft=b01Drafts.has(l.lab_id),hasSubstantivePrivate=substantivePrivate.has(l.lab_id),hasNarrative=byAuthored.has(l.lab_id),hasDraft=drafted.has(l.lab_id),hasReview=reviewed.has(l.lab_id),hasHistorical=context.has(l.lab_id);
  const synthetic=originalSimulation(l,data.get('GUSIM_'+l.lab_id.replaceAll('-','_')));
  if(hasInstruction)breakdown.privateInstructions++;
  if(hasInstruction){
   const depth=privateDepth.get(l.lab_id)||{};
   const measures={
    depthObjectives:'objective',depthPurposes:'purpose',depthGuidedMethods:'guidedMethod',
    depthWorkedExamples:'workedExample',depthMisconceptions:'misconception',
    depthLimitations:'limitation',depthIndependentTransfers:'independentTransfer'
   };
   for(const [counter,property] of Object.entries(measures))
    if(depth[property])breakdown[counter]++;
   if(Object.keys(measures).every(counter=>depth[measures[counter]]))
    breakdown.depthAllSevenPrechecks++;
  }

  if(hasB01Draft)breakdown.individualizedB01Drafts++;
  if(hasSubstantivePrivate)breakdown.substantivePrivateLessonPrechecks++;
  if(hasNarrative)breakdown.existingDetailedNarratives++;
  if(hasDraft)breakdown.originalDraftRubrics++;
  if(hasReview)breakdown.reviewedRubrics++;
  if(synthetic)breakdown.originalSimulationReady++;
  if(hasHistorical)breakdown.independentlyVerifiedHistoricalContext++;
  let stage= !l.active||!l.registry_visible?'DISABLED':!(hasSubstantivePrivate||hasNarrative)?'MISSING_PRIVATE_LESSON':
   !reviewed.has(l.lab_id)?'MISSING_REVIEWED_GRADING':!context.has(l.lab_id)?'MISSING_LICENSED_HISTORICAL_CONTEXT':'CONTENT_PRECHECK_ONLY_QA_REQUIRED';
  counts[stage]++;
  return {id:l.lab_id,title:l.title||'Untitled — editorial review required',ticker:l.ticker||null,
    historicalDate:l.historical_date||null,stage,
    instructionRecordPresent:hasInstruction,individualizedB01DraftPresent:hasB01Draft,substantivePrivateLessonPrecheck:hasSubstantivePrivate,authoredNarrativePresent:hasNarrative,
    privateDraftRubricPresent:hasDraft,reviewedRubricPresent:hasReview,
    originalSimulationAvailable:synthetic,
    verifiedLicensedContextPresent:hasHistorical,certifiedComplete:false};
 });
 rows.sort((a,b)=>a.id.localeCompare(b.id));
 return {available:true,registryCount:rows.length,sourceTarget:419,sourceCountMatches:rows.length===419,
  counts,breakdown,certifiedComplete:0,rows,asOf:new Date().toISOString(),
  certificationPolicy:'A private instruction row is not substantive education. A content-shape precheck excludes generic unreviewed v96 scaffolding; neither it nor CONTENT_PRECHECK certifies replay, chart accuracy, teaching quality, private access, grading security, historical license rights, accessibility or 100% completion.'};
}
async function auditRubrics(db){
 const current=new Map(),batch=250,hardLimit=8000;
 for(let offset=0;offset<=hardLimit;offset+=batch){
  const rows=await db('lab_training_sets_v014?select=lab_id,version,review_state,reviewed_by,reviewed_at,questions,answer_key&order=lab_id.asc,version.desc&limit='+batch+'&offset='+offset);
  if(!Array.isArray(rows)||rows.length>batch)throw new Error('Private rubric source pagination contract invalid');
  for(const x of rows){
   const lab=String(x.lab_id||''),kind=x.review_state==='reviewed'?'reviewed':'draft';
   if(!/^[A-Za-z0-9_-]{3,90}$/.test(lab))continue;
   const key=lab+'|'+kind;
   if(!current.has(key)||eligibleRubric(x)&&!eligibleRubric(current.get(key)))current.set(key,x);
  }
  if(rows.length<batch)return [...current.values()];
 }
 throw new Error('Rubric review inventory exceeds the bounded Owner audit capacity');
}
export async function loadOwnerLabAudit(db){
 try{
  const [labs,instructions,rubrics,envelopes,datasets]=await Promise.all([
   db('platform_labs?select=lab_id,title,active,registry_visible,ticker,historical_date,metadata&order=lab_id.asc&limit=1000'),
   db('lab_instruction_v014?select=lab_id,source_status,content&limit=1000'),
   auditRubrics(db),
   db('historical_context_envelopes?select=lab_id,dataset_code,status,context_start_at,teaching_start_at,decision_boundary_at,teaching_end_at,context_end_at&limit=1000'),
   db('market_datasets?select=dataset_code,ticker,dataset_type,status,source_attribution,license_note,metadata&limit=1000')
  ]);
  return classifyOwnerLabs({labs,instructions,rubrics,envelopes,datasets});
 }catch{return {available:false,registryCount:null,rows:[],certifiedComplete:null,
  error:'Private Lab evidence could not be verified. Review installed tables and the v0.14.0.92 read-only Lab gap matrix. No Lab is newly certified.'};}
}
