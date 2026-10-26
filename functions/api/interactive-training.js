/* v0.14.0 reviewed, server-graded training steps. No future market bars are
 * generated or exposed. This API is not a broker or a market-data feed.
 * All answer keys and attempts remain in service-role-only tables.
 */
import {toolAccess} from './member-tool-access.js';
import {isBetaCandidateLab} from '../_lib/lab-beta-scope-v014286.js';
import {authoredB01BetaLesson,activeFoundingBetaLearningPlan} from '../_lib/founding-beta-learning-access.js';
import {getBookAccess,getBookCodeAccess} from './lab-content.js';
const H={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:H});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const esc=encodeURIComponent;
function cfg(env){const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),secret=String(env.SUPABASE_SECRET_KEY||'');if(!/^https:\/\/[^/]+$/.test(base)||!secret)throw fail('Training system configuration unavailable.',503);return {base,secret}}
// Opaque sb_secret_* Supabase keys MUST NOT be sent as Bearer JWTs.
const serviceHeaders=secret=>{const headers={apikey:secret,accept:'application/json'};if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))headers.authorization='Bearer '+secret;return headers};
async function db(env,path,method='GET',body){const c=cfg(env),r=await fetch(c.base+'/rest/v1/'+path,{method,headers:{...serviceHeaders(c.secret),...(body===undefined?{}:{'content-type':'application/json',prefer:'return=representation'})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'}),t=await r.text();if(!r.ok)throw fail('Training database contract unavailable; verify installed objects and server permissions.',503);try{return t?JSON.parse(t):[]}catch{throw fail('Invalid training database response.',503)}}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Reviewed book-derived exercises require BOTH a premium training entitlement
// and the matching book entitlement. The private Lab metadata is not public.
const publicSamples=new Set(['F1-C02-L01','F2-C01-L01','F3-C01-L01']);
async function requireMatchingBook(env,request,labId,verifiedActorId){
 if(!isBetaCandidateLab(labId))throw fail('This Lab is upcoming and not released for beta grading.',404);
 // One authoritative canonical Lab registry for all 419 existing IDs. A book
 // entitlement must NEVER revive an archived or hidden Lab assessment.
 const rows=await db(env,'platform_labs?select=lab_id,book_code,active,registry_visible&lab_id=eq.'+
  esc(labId)+'&limit=1'),lab=rows[0];
 if(!lab||lab.active!==true||lab.registry_visible!==true)
  throw fail('This Lab is not in the released registry.',404);
 const privateInstruction=await db(env,'lab_instruction_v014?select=lab_id,book_number,source_status,content&lab_id=eq.'+
  esc(labId)+'&limit=1');
 if(privateInstruction[0]){
  const book=Number(privateInstruction[0].book_number);
  if(!Number.isInteger(book)||book<1||book>3||
     lab.book_code!=='FOUNDATION_BOOK_'+book)
   throw fail('Private lesson source does not agree with the canonical Lab registry.',503);
 }
 if(['FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3',
    'DAY_TRADING_BOOK_1','READING_THE_TAPE'].includes(lab.book_code)){
  if(!publicSamples.has(labId)||!lab.book_code.startsWith('FOUNDATION_BOOK_')){
   const owns=await getBookCodeAccess(env,request,lab.book_code);
   // Founding Beta learning-tool access is a narrowly scoped *testing*
   // entitlement for already-authored B01 lessons, not ebook ownership.
   // The whole API still requires authenticated ONDEMAND_TRAINING access,
   // and the SQL grader still requires a separately reviewed rubric.
   const founderTest= !owns && authoredB01BetaLesson(privateInstruction[0])&&
    await activeFoundingBetaLearningPlan(env,verifiedActorId);
   if(!owns&&!founderTest)
    throw fail('Matching book access or active Founding 600 B01 testing access is required.',403);
  }
  return lab.book_code;
 }
 if(lab.book_code==='SITE_EXCLUSIVE')return lab.book_code;
 throw fail('Unknown or unapproved Lab collection.',403);
}
// The same private key must never always appear as option one.
// Shuffle answer options per pinned attempt and question, reproducibly on refresh.
function shuffledChoiceOptions(options,attemptId,questionId){
 if(!Array.isArray(options)||options.length<2)return Array.isArray(options)?options:[];
 const arr=[...options];let seed=2166136261;
 for(const ch of String(attemptId)+'|'+String(questionId))seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;
 for(let i=arr.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 const j=seed%(i+1);[arr[i],arr[j]]=[arr[j],arr[i]]}
 return arr;
}
// Completion feedback is teaching output, not an answer-key export. The
// protected RPC persists the full audit report, but only these reviewed
// member-facing fields cross the server boundary. Never spread RPC JSON into
// an API response: future database fields must stay private by default.
function memberReport(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const score=Number(raw.score),correct=Number(raw.correct),total=Number(raw.total);
 if(!Number.isInteger(score)||score<0||score>100||
    !Number.isInteger(correct)||correct<0||
    !Number.isInteger(total)||total<1||correct>total)return null;
 const details=Array.isArray(raw.details)?raw.details:[];
 const safeDetails=details.slice(0,40).map(entry=>({
  question:String(entry?.question??'').slice(0,1000),
  submitted:String(entry?.submitted??'').slice(0,600),
  correct:entry?.correct===true,
  creditFraction:Number.isFinite(Number(entry?.creditFraction))&&Number(entry.creditFraction)>=0&&Number(entry.creditFraction)<=1
   ?Number(entry.creditFraction):(entry?.correct===true?1:0),
  criticalError:entry?.criticalError===true,
  explanation:String(entry?.explanation??'').slice(0,1600)
 }));
 return {score,correct,total,details:safeDetails,
  criticalErrors:Number.isSafeInteger(Number(raw.criticalErrors))&&Number(raw.criticalErrors)>=0
   ?Number(raw.criticalErrors):safeDetails.filter(entry=>entry.criticalError).length,
  note:String(raw.note??'').slice(0,600),
  sourceStatus:String(raw.sourceStatus??'').slice(0,120)};
}
function publicState(attempt,set){const step=attempt.step_index||0,n=set.questions.length;return{ok:true,attemptId:attempt.id,labId:attempt.lab_id,mode:attempt.mode,stepIndex:step,total:n,complete:!!attempt.completed_at,question:step<n?{id:set.questions[step].id,prompt:set.questions[step].prompt,kind:set.questions[step].kind,options:shuffledChoiceOptions(set.questions[step].options,attempt.id,set.questions[step].id)}:null,report:attempt.completed_at?memberReport(attempt.report):null,sourceStatus:set.source_status,note:set.source_status?.startsWith('original_hypothetical')?'Original hypothetical instructional assessment. Its invented numbers are NOT historical or actual market observations.':'Uses reviewed book-authored answers only. Historical market data/tape has not been independently verified.'}}
export async function onRequest({request,env}){try{
 const acl=await toolAccess(env,request,'ONDEMAND_TRAINING');if(!acl.authorized)return reply({ok:false,error:acl.reason},403);
 const u=new URL(request.url),action=u.searchParams.get('action')||'';
 // Existing member-owned, completed server grades. Returns no answer keys,
 // unseen observations, Journal text, rubric rows or skill certifications.
 if(action==='progress'&&request.method==='GET'){
  // Do not silently discard older completed Labs after 500 member retakes.
  // Every page is privately scoped to the independently authenticated actor.
  const rows=[],pageSize=250,hardCap=10000;
  let exhaustive=false;
  for(let offset=0;offset<hardCap;offset+=pageSize){
   const page=await db(env,'lab_training_attempts_v014?select=id,lab_id,mode,score,completed_at&user_id=eq.'+
    esc(acl.userId)+'&completed_at=not.is.null&score=not.is.null&order=completed_at.desc,id.desc&limit='+
    pageSize+'&offset='+offset);
   if(!Array.isArray(page)||page.length>pageSize)throw fail('Invalid graded learning history page.',503);
   rows.push(...page);
   if(page.length<pageSize){exhaustive=true;break}
  }
  if(!exhaustive)throw fail('Graded history exceeds the safe audit window; full history must be verified before summary.',503);
  const latest=new Map(),latestAssessment=new Map(),safe=[];
  for(const row of rows){
   const id=String(row?.lab_id||''),score=Number(row?.score),completedAt=String(row?.completed_at||'');
   if(!/^[A-Za-z0-9_-]{3,90}$/.test(id)||!Number.isInteger(score)||score<0||score>100||
      !['guided','practice','blind','assessment'].includes(row?.mode)||
      !Number.isFinite(Date.parse(completedAt)))continue;
   safe.push({labId:id,score,mode:row.mode,completedAt});
   if(!latest.has(id))latest.set(id,{labId:id,score,mode:row.mode,completedAt});
   if(row.mode==='assessment'&&!latestAssessment.has(id))latestAssessment.set(id,{labId:id,score,mode:row.mode,completedAt});
  }
  return reply({ok:true,latestByLab:[...latest.values()],
   latestAssessmentByLab:[...latestAssessment.values()],recentCompleted:safe.slice(0,100),
   reviewedRows:safe.length,truncated:false,
   interpretation:'Recorded, server-graded conceptual/book exercises. NOT historical replay proof, four-dimensional competency certification, P&L or brokerage performance.',
   masteryAwarded:false});
 }
 if(action==='sync-reviewed-knowledge'&&request.method==='POST'){
  // This RPC reads actual completed grades and exact-version Owner-approved
  // mappings. It creates at most the KNOWLEDGE dimension, idempotently.
  const result=await db(env,'rpc/gu_v014105_sync_member_reviewed_knowledge','POST',{p_actor:acl.userId});
  if(result?.ok!==true)throw fail('Reviewed knowledge reconciliation was not accepted.',503);
  return reply({ok:true,...result,
   interpretation:'Only the knowledge dimension from a reviewed conceptual quiz may be recorded. Other competency dimensions and real historical market skill remain unverified.',
   masteryAwarded:false});
 }
 if(action==='available'&&request.method==='GET'){const id=u.searchParams.get('labId')||'';if(!/^[A-Za-z0-9_-]{3,90}$/.test(id))throw fail('Invalid Lab ID.');await requireMatchingBook(env,request,id,acl.userId);const rows=await db(env,'lab_training_sets_v014?select=lab_id,version,review_state,source_status,title,questions&lab_id=eq.'+esc(id)+'&review_state=eq.reviewed&order=version.desc&limit=1');return reply({ok:true,available:!!rows[0],sourceStatus:rows[0]?.source_status||null,questionCount:rows[0]?.questions?.length||0})}
 if(action==='start'&&request.method==='POST'){const body=await request.json().catch(()=>null),id=String(body?.labId||''),mode=String(body?.mode||'');if(!/^[A-Za-z0-9_-]{3,90}$/.test(id)||!['guided','practice','blind','assessment'].includes(mode))throw fail('Valid Lab and learning mode required.');await requireMatchingBook(env,request,id,acl.userId);const sets=await db(env,'lab_training_sets_v014?select=lab_id,version,review_state,source_status,title,questions&lab_id=eq.'+esc(id)+'&review_state=eq.reviewed&order=version.desc&limit=1');const set=sets[0];if(!set)return reply({ok:false,error:'Reviewed question-by-question training is not published for this Lab.'},404);
 const record=await db(env,'rpc/v014_training_start','POST',{p_actor:acl.userId,p_lab:id,p_mode:mode});
 if(!record?.id)throw fail('Training attempt was not created.',503);
 // Resume uses the original review version, not a rubric published since start.
 const pinned=record.set_version===set.version?set:(await db(env,'lab_training_sets_v014?select=lab_id,version,review_state,source_status,questions&lab_id=eq.'+esc(id)+'&version=eq.'+Number(record.set_version)+'&limit=1'))[0];
 if(!pinned)throw fail('Pinned rubric version unavailable.',503);
 // Withdrawn review state must hide pinned questions even for resumed attempts.
 // Existing member grades stay intact in the private history route.
 if(pinned.review_state!=='reviewed')
  return reply({ok:false,error:'This pinned grading version is no longer reviewed. Your saved record remains preserved.'},409);
 return reply(publicState(record,pinned),record.resumed?200:201)}
 if(action==='resume'&&request.method==='GET'){const id=u.searchParams.get('id')||'';if(!uuid.test(id))throw fail('Invalid attempt ID.');const rows=await db(env,'lab_training_attempts_v014?select=id,user_id,lab_id,set_version,mode,step_index,completed_at,report&id=eq.'+esc(id)+'&user_id=eq.'+esc(acl.userId)+'&limit=1');const a=rows[0];if(!a)return reply({ok:false,error:'Attempt not found.'},404);await requireMatchingBook(env,request,a.lab_id,acl.userId);const sets=await db(env,'lab_training_sets_v014?select=lab_id,version,review_state,source_status,questions&lab_id=eq.'+esc(a.lab_id)+'&version=eq.'+a.set_version+'&limit=1');const set=sets[0];if(!set)return reply({ok:false,error:'Training version unavailable.'},503);
 // Do not reveal questions or old answer-bearing reports after editorial withdrawal.
 if(set.review_state!=='reviewed')
  return reply({ok:false,error:'This pinned training version is no longer reviewed. Prior completed results remain in your private progress record.'},409);
 return reply(publicState(a,set))}
 if(action==='answer'&&request.method==='POST'){const b=await request.json().catch(()=>null),id=String(b?.attemptId||''),answer=String(b?.answer??'').trim();
 if(!uuid.test(id)||!answer||answer.length>600||!Number.isSafeInteger(b?.expectedStep)||b.expectedStep<0)throw fail('Attempt, current step, and response are required.');
 const attempts=await db(env,'lab_training_attempts_v014?select=lab_id,mode&user_id=eq.'+esc(acl.userId)+'&id=eq.'+esc(id)+'&limit=1');if(!attempts[0])throw fail('Attempt not found.',404);await requireMatchingBook(env,request,attempts[0].lab_id,acl.userId);const r=await db(env,'rpc/v014_training_answer','POST',{p_actor:acl.userId,p_attempt:id,p_answer:answer,p_expected_step:b.expectedStep});if(!r?.ok)throw fail('Answer could not be evaluated.',503);
 let knowledgeSync=r.complete===true?'formative_mode_not_eligible':'not_applicable';
 if(r.complete===true&&attempts[0].mode==='assessment'){
  // The grade was already committed atomically. A missing optional v105 mapping
  // NEVER undoes or forges it. Members may retry evidence sync from Skills.
  try{
   const rec=await db(env,'rpc/gu_v014105_sync_reviewed_knowledge','POST',
    {p_actor:acl.userId,p_attempt:id});
   knowledgeSync=rec?.ok===true?'reviewed_knowledge_only':
    rec?.reason==='critical_error_unresolved'?'critical_error_requires_retest':'mapping_not_yet_approved';
  }catch{knowledgeSync='optional_mapping_unavailable'}
 }
 // A completed grade is immutable; filter every returned field, including
 // historical reports resumed from the database. Graded feedback is safe for
 // the member, whereas the answer key remains server-only.
 if(r.complete===true)return reply({ok:true,complete:true,report:memberReport(r.report),
  knowledgeSync,masteryAwarded:false});
 return reply({ok:true,complete:false,
  correct:r.correct===true?true:r.correct===false?false:null,
  explanation:typeof r.explanation==='string'?r.explanation.slice(0,1600):null,
  stepIndex:Number.isSafeInteger(r.stepIndex)?r.stepIndex:null,
  knowledgeSync,masteryAwarded:false})}
 return reply({ok:false,error:'Unknown training action.'},405);
}catch(e){return reply({ok:false,error:e.message||'Training request failed.'},e.status||500)}}
