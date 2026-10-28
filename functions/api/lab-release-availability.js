import {isBetaCandidateLab,isBetaUpcomingLab} from '../_lib/lab-beta-scope-v014286.js';
import {SITE_BETA_BATCH,SITE_BETA_STATUS} from '../_lib/site-exclusive-private-lesson-v014294.js';
/* Public Lab availability: reveal ONLY published Lab IDs; never serve grading
 * questions, answer keys, private lessons, member data, or implementation secrets.
 * Registry visibility does not imply an approved member assessment.
 */
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0',
 'x-content-type-options':'nosniff'}});
const goodId=/^[A-Za-z0-9_-]{3,90}$/;
async function rows(env,table,select,condition='',limit=1200){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const secret=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(base)||!secret)throw Error('Private readiness unavailable');
 const headers={apikey:secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))
  headers.authorization='Bearer '+secret;
 const url=base+'/rest/v1/'+table+'?select='+encodeURIComponent(select)+condition+'&limit='+limit;
 const res=await fetch(url,{headers,cache:'no-store'});
 if(!res.ok)throw Error('Readiness database unavailable');
 const data=await res.json();
 if(!Array.isArray(data)||data.length>=limit)throw Error('Readiness result unverified or truncated');
 return data;
}
export async function onRequest({request,env}){
 if(request.method!=='GET')return reply({ok:false,error:'Method not allowed'},405);
 try{
  // Every requirement is taken from existing authoritative tables. A public
  // listing of an ID, or an unfinished draft, does not grant beta assessment.
  const [catalog,lessons,approved]=await Promise.all([
   rows(env,'platform_labs','lab_id,active,registry_visible,what:metadata->>what,why:metadata->>why,objective:metadata->>objective,how:metadata->how','',700),
   rows(env,'lab_instruction_v014','lab_id,book_number,source_status,reviewed_by,reviewed_at,concept:content->>concept,objective:content->>objective,why:content->>why,steps:content->steps,lesson_batch:content->>lessonBatch,example_type:content->>exampleType,sources:content->sourceURLs','',700),
   rows(env,'lab_training_sets_v014','lab_id,review_state,reviewed_at,reviewed_by',
        '&review_state=eq.reviewed&reviewed_at=not.is.null&reviewed_by=not.is.null',1500)
  ]);
  const allowed=new Set(catalog.filter(r=>r.active===true&&r.registry_visible===true)
   .map(r=>r.lab_id).filter(id=>goodId.test(id)));
  // An instruction row is not an editorial approval. An unreviewed/draft row
  // must NEVER become Start-eligible solely because its rubric was reviewed.
  // Explicit status recognition is deliberately fail-closed until the
  // existing editorial approval workflow records the reviewed state.
  // Testability is separate from publication. All 336 selected canonical IDs
  // have pre-existing instructional material (94 private lessons / 242 registry
  // narratives at the verified 2026-10-26 snapshot). Identify actual authored
  // material, not answer keys, and make it eligible for UNGRADED beta study.
  // A selected ID alone must not create a lesson or imply graded readiness.
  const authoredPrivate=new Set(lessons.filter(r=>
   allowed.has(r.lab_id)&&isBetaCandidateLab(r.lab_id)&&
   typeof r.concept==='string'&&r.concept.trim().length>=8&&
   typeof r.objective==='string'&&r.objective.trim().length>=20&&
   typeof r.why==='string'&&r.why.trim().length>=40&&
   Array.isArray(r.steps)&&r.steps.length>=3&&
   r.steps.every(v=>typeof v==='string'&&v.trim().length>=12))
   .map(r=>r.lab_id));
  const canonicalTeaching=new Set(catalog.filter(r=>
   allowed.has(r.lab_id)&&isBetaCandidateLab(r.lab_id)&&
   typeof r.what==='string'&&r.what.trim().length>=30&&
   typeof r.why==='string'&&r.why.trim().length>=30&&
   typeof r.objective==='string'&&r.objective.trim().length>=20&&
   Array.isArray(r.how)&&r.how.length>=3)
   .map(r=>r.lab_id));
  const authoredSite=new Set(lessons.filter(r=>
    allowed.has(r.lab_id)&&isBetaUpcomingLab(r.lab_id)&&
    r.book_number===6&&r.source_status===SITE_BETA_STATUS&&
    r.lesson_batch===SITE_BETA_BATCH&&r.example_type==='ORIGINAL_FICTIONAL_EDUCATIONAL'&&
    typeof r.concept==='string'&&r.concept.trim().length>25&&
    typeof r.objective==='string'&&r.objective.trim().length>25&&
    Array.isArray(r.steps)&&r.steps.length===9&&r.steps.every(x=>typeof x==='string'&&x.length>=40)&&
    Array.isArray(r.sources)&&r.sources.length>0&&r.sources.every(u=>typeof u==='string'&&
      /^https:\/\/(?:www\.)?(?:investor\.gov|sec\.gov|nyse\.com)\//i.test(u)))
   .map(r=>r.lab_id));
  const reviewedLesson=new Set(lessons.filter(r=>
   /^(editorially_reviewed|owner_reviewed)(?:_|$)/i.test(String(r.source_status||''))&&
   typeof r.reviewed_by==='string'&&r.reviewed_by.length>0&&
   typeof r.reviewed_at==='string'&&Number.isFinite(Date.parse(r.reviewed_at)))
   .map(r=>r.lab_id).filter(id=>goodId.test(id)&&isBetaCandidateLab(id)));
  const ids=[...new Set(approved.filter(r=>
   r.review_state==='reviewed'&&!!r.reviewed_at&&!!r.reviewed_by)
   .map(r=>r.lab_id).filter(id=>
   goodId.test(id)&&isBetaCandidateLab(id)&&allowed.has(id)&&reviewedLesson.has(id)))].sort();
  // Reviewed assessments are not ungraded beta studies. Never assign
  // official grade credit from the guided list; let the protected grading
  // API independently confirm the signed/reviewed bank.
  const published=new Set(ids);
  const guidedBetaIds=[...new Set([...authoredPrivate,...canonicalTeaching,...authoredSite]
   .filter(id=>allowed.has(id)&&(isBetaCandidateLab(id)||isBetaUpcomingLab(id))&&!published.has(id)))].sort();
  // These public IDs are a subset of guidedBetaIds; they do not disclose
  // teaching material and identify the existing training-only SITE scope.
  const trainingOnlyIds=[...authoredSite].filter(id=>guidedBetaIds.includes(id)).sort();
  return reply({ok:true,publishedIds:ids,guidedBetaIds,trainingOnlyIds,guidedBetaTestingOpen:guidedBetaIds.length>0,memberEntitlementRequired:true,scope:'approved_beta_candidate_with_editorially_reviewed_lesson_and_reviewed_assessment',
   guidedBetaPolicy:'ungraded_existing_private_canonical_or_site_original_teaching_no_mastery',betaReadyCertified:false});
 }catch{
  return reply({ok:false,error:'Lab availability cannot be verified. No unreleased Lab should be started.'},503);
 }
}
