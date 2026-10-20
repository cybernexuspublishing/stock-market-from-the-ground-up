/* v0.14.0.93 | Owner-private Lab delivery evidence. Read-only; no answer
 * text, questions, personally identifiable records or datasets leave server.
 * Source prechecks are NOT reviewed interactive lesson acceptance.
 */
const stamp=x=>{const n=Date.parse(x||'');return Number.isFinite(n)?n:NaN};
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
function eligibleRubric(x){
 if(x.review_state!=='reviewed'||!x.reviewed_by||!x.reviewed_at||
    !Array.isArray(x.questions)||!x.questions.length||!x.answer_key||typeof x.answer_key!=='object')return false;
 const ids=x.questions.map(q=>q?.id);
 return ids.every(id=>nonempty(id)&&Object.hasOwn(x.answer_key,id))&&new Set(ids).size===ids.length;
}
function eligibleContext(envelope,dataset){
 if(!envelope||!dataset||!['verified','published'].includes(envelope.status)||
   dataset.status!=='published'||dataset.dataset_type!=='ohlcv'||dataset.metadata?.evidence_verified!==true||
   dataset.metadata?.licensed_for_member_display!==true||
   dataset.metadata?.original_synthetic===true||dataset.metadata?.historical_evidence_verified===false||!nonempty(dataset.source_attribution)||
   !nonempty(dataset.license_note)||!nonempty(dataset.metadata?.corporate_action_policy))return false;
 const series=['context_start_at','teaching_start_at','decision_boundary_at','teaching_end_at','context_end_at'].map(k=>stamp(envelope[k]));
 return series.every(Number.isFinite)&&series.every((t,i)=>i===0||t>=series[i-1]);
}
export function classifyOwnerLabs({labs,instructions,rubrics,envelopes,datasets}){
 for(const rows of [labs,instructions,rubrics,envelopes,datasets])
  if(!Array.isArray(rows)||rows.length>=1000)throw new Error('Lab audit response is incomplete or malformed; pagination review required.');
 const byInstruction=new Set(instructions.map(x=>x.lab_id));
 const reviewed=new Set(rubrics.filter(eligibleRubric).map(x=>x.lab_id));
 const data=new Map(datasets.map(x=>[x.dataset_code,x]));
 const context=new Set(envelopes.filter(x=>eligibleContext(x,data.get(x.dataset_code))).map(x=>x.lab_id));
 const seen=new Set(),counts={DISABLED:0,MISSING_PRIVATE_LESSON:0,MISSING_REVIEWED_GRADING:0,MISSING_LICENSED_HISTORICAL_CONTEXT:0,CONTENT_PRECHECK_ONLY_QA_REQUIRED:0};
 const rows=labs.map(l=>{
  if(!nonempty(l.lab_id)||seen.has(l.lab_id))throw new Error('Duplicate or invalid Lab IDs.');seen.add(l.lab_id);
  let stage= !l.active||!l.registry_visible?'DISABLED':!byInstruction.has(l.lab_id)?'MISSING_PRIVATE_LESSON':
   !reviewed.has(l.lab_id)?'MISSING_REVIEWED_GRADING':!context.has(l.lab_id)?'MISSING_LICENSED_HISTORICAL_CONTEXT':'CONTENT_PRECHECK_ONLY_QA_REQUIRED';
  counts[stage]++;
  return {id:l.lab_id,title:l.title||'Untitled — editorial review required',ticker:l.ticker||null,
    historicalDate:l.historical_date||null,stage,
    instructionRecordPresent:byInstruction.has(l.lab_id),reviewedRubricPresent:reviewed.has(l.lab_id),
    verifiedLicensedContextPresent:context.has(l.lab_id),certifiedComplete:false};
 });
 rows.sort((a,b)=>a.id.localeCompare(b.id));
 return {available:true,registryCount:rows.length,sourceTarget:419,sourceCountMatches:rows.length===419,
  counts,certifiedComplete:0,rows,asOf:new Date().toISOString(),
  certificationPolicy:'CONTENT_PRECHECK does not certify replay, chart accuracy, teaching quality, private access, grading security, historical license rights, accessibility or 100% completion.'};
}
export async function loadOwnerLabAudit(db){
 try{
  const [labs,instructions,rubrics,envelopes,datasets]=await Promise.all([
   db('platform_labs?select=lab_id,title,active,registry_visible,ticker,historical_date&order=lab_id.asc&limit=1000'),
   db('lab_instruction_v014?select=lab_id,source_status&limit=1000'),
   db('lab_training_sets_v014?select=lab_id,review_state,reviewed_by,reviewed_at,questions,answer_key&limit=1000'),
   db('historical_context_envelopes?select=lab_id,dataset_code,status,context_start_at,teaching_start_at,decision_boundary_at,teaching_end_at,context_end_at&limit=1000'),
   db('market_datasets?select=dataset_code,dataset_type,status,source_attribution,license_note,metadata&limit=1000')
  ]);
  return classifyOwnerLabs({labs,instructions,rubrics,envelopes,datasets});
 }catch{return {available:false,registryCount:null,rows:[],certifiedComplete:null,
  error:'Private Lab evidence could not be verified. Review installed tables and the v0.14.0.92 read-only Lab gap matrix. No Lab is newly certified.'};}
}
