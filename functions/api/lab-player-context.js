/* D11–D13: Existing 419 canonical Lab registry -> safe member player context.
 * Only public metadata for currently entitled members is returned. Does not
 * publish book text, unapproved answer keys, chart history or future bars.
 */
import {memberIdentity} from './member-tool-access.js';
import {isBetaCandidateLab,isBetaUpcomingLab} from '../_lib/lab-beta-scope-v014286.js';
import {authoredSiteExclusiveBetaLesson} from '../_lib/site-exclusive-private-lesson-v014294.js';
import {originalInteractiveIntro} from '../_lib/interactive-learning-canonical-v1.js';
import {getBookCodeAccess,publicGuidedLesson} from './lab-content.js';
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',
 'x-content-type-options':'nosniff'}});
const code=/^[A-Za-z0-9_-]{3,90}$/;
const BOOKS=Object.freeze({
 FOUNDATION_BOOK_1:{number:1,label:'Foundations Book I'},
 FOUNDATION_BOOK_2:{number:2,label:'Foundations Book II'},
 FOUNDATION_BOOK_3:{number:3,label:'Foundations Book III'},
 DAY_TRADING_BOOK_1:{number:4,label:'Day Trading'},
 READING_THE_TAPE:{number:5,label:'Reading the Tape'},
 SITE_EXCLUSIVE:{number:6,label:'Site-Exclusive Labs'}
});
function config(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const secret=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(base)||!secret)throw Object.assign(Error('Lab registry unavailable.'),{status:503});
 return {base,secret};
}
async function read(env,id){
 const c=config(env);
 const headers={apikey:c.secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(c.secret))
  headers.authorization='Bearer '+c.secret;
 const columns='lab_id,title,book_code,chapter_number,ticker,historical_date,timeframe,lab_type,metadata,active,registry_visible';
 const url=c.base+'/rest/v1/platform_labs?select='+columns+
  '&lab_id=eq.'+encodeURIComponent(id)+'&limit=1';
 const r=await fetch(url,{headers,cache:'no-store'});
 if(!r.ok)throw Object.assign(Error('Lab registry query unavailable.'),{status:503});
 const rows=await r.json();
 if(!Array.isArray(rows)||rows.length>1)throw Object.assign(Error('Unexpected Lab registry response.'),{status:503});
 return rows[0]||null;
}
const safe=(v,max)=>String(v??'').slice(0,max);
const sentences=(value,maxItems=6)=>Array.isArray(value)?value.filter(x=>typeof x==='string'&&x.trim()).slice(0,maxItems).map(x=>safe(x,550)):[];
export async function onRequest({request,env}){
 let stage='REQUEST';
 try{
  if(request.method!=='GET')return reply({ok:false,error:'Method not allowed.'},405);
  const id=new URL(request.url).searchParams.get('id')||'';
  if(!code.test(id))return reply({ok:false,error:'Invalid Lab ID.'},400);
  // Authenticate independently of the premium RPC. A member owning a book
  // must not lose Guided orientation merely because premium RPC is unavailable.
  stage='AUTH';
  const actor=await memberIdentity(env,request);
  if(!isBetaCandidateLab(id)&&!isBetaUpcomingLab(id))return reply({ok:false,error:'This Lab is not released for beta learning.'},404);
  stage='REGISTRY';
  const lab=await read(env,id);
  if(!lab||lab.active!==true||lab.registry_visible!==true||!BOOKS[lab.book_code])
   return reply({ok:false,error:'This Lab is not published.'},404);
  const book=BOOKS[lab.book_code];
  const sample=new Set(['F1-C02-L01','F2-C01-L01','F3-C01-L01']).has(id);
  // The original member account gates must remain authoritative.
  // Check the actor without invoking the premium entitlement RPC first.
  const c=config(env),headers={apikey:c.secret,accept:'application/json'};
  if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(c.secret))headers.authorization='Bearer '+c.secret;
  stage='MEMBER';
  const profile=await fetch(c.base+'/rest/v1/profiles?select=account_kind&id=eq.'+
   encodeURIComponent(actor.userId)+'&limit=1',{headers,cache:'no-store'});
  if(!profile.ok)throw Object.assign(Error('Lab member status unavailable.'),{status:503});
  const profiles=await profile.json();
  if(profiles?.[0]?.account_kind!=='member')
   return reply({ok:false,error:'A production member account is required.'},403);
  stage='FLAGS';
  const flagsResponse=await fetch(c.base+'/rest/v1/admin_user_flags?select=status&user_id=eq.'+
   encodeURIComponent(actor.userId)+'&limit=1',{headers,cache:'no-store'});
  if(!flagsResponse.ok)throw Object.assign(Error('Account restriction status unavailable.'),{status:503});
  const flags=await flagsResponse.json();
  if(['suspended','restricted'].includes(String(flags?.[0]?.status||'').toLowerCase()))
   return reply({ok:false,error:'Account access is restricted.'},403);
  // A premium RPC outage must not block an independently confirmed book owner
  // or an approved free sample. For other Labs, entitlement failure is fail-closed.
  stage='PREMIUM';
  // Both existing sellable product entitlements use ONE authoritative RPC.
  // Interactive Learning authorizes beta orientation; SITE-exclusive private
  // teaching remains restricted to its separate authorized training scope.
  const checks=await Promise.allSettled(
   ['ONDEMAND_TRAINING','INTERACTIVE_LEARNING'].map(async tool=>{
    const rpc=await fetch(c.base+'/rest/v1/rpc/user_has_tool_access',{
     method:'POST',headers:{...headers,'content-type':'application/json'},
     body:JSON.stringify({target_user:actor.userId,target_tool:tool}),cache:'no-store'
    });
    if(!rpc.ok)throw Error('Premium entitlement service unavailable');
    return await rpc.json()===true;
   })
  );
  const training=checks[0].status==='fulfilled'&&checks[0].value===true;
  const interactive=checks[1].status==='fulfilled'&&checks[1].value===true;
  const premium=training||interactive;
  const premiumFailure=!premium&&checks.some(x=>x.status==='rejected')?
   Error('An independent entitlement service failed.'):null;
  stage='BOOK';
  let owns=false,bookFailure=null;
  if(!premium&&!sample&&lab.book_code!=='SITE_EXCLUSIVE'){
   try{owns=await getBookCodeAccess(env,request,lab.book_code)}
   catch(e){bookFailure=e}
  }
  if(!premium&&!owns&&!sample){
   if(premiumFailure||bookFailure){
    stage=bookFailure?'BOOK':'PREMIUM';
    throw Object.assign(Error('Entitlement verification unavailable.'),{status:503});
   }
   return reply({ok:false,error:'Matching book or active Interactive Learning access required.'},403);
  }
  stage='TEACHING';
  // A Site-Exclusive entry is not unlocked by registry visibility alone.
  // The service-role-only record must contain all nine original teaching
  // stages and verified original provenance; all identity, entitlement and
  // restricted-account gates above must already have succeeded.
  if(isBetaUpcomingLab(id)){
   if(lab.book_code!=='SITE_EXCLUSIVE'||!training)
    return reply({ok:false,error:'Authorized interactive learning is required.'},403);
   stage='PRIVATE_TEACHING';
   const uri=c.base+'/rest/v1/lab_instruction_v014?select=lab_id,book_number,source_status,content'+
     '&lab_id=eq.'+encodeURIComponent(id)+'&limit=1';
   const response=await fetch(uri,{headers,cache:'no-store'});
   if(!response.ok)throw Object.assign(Error('Private Site teaching unavailable.'),{status:503});
   const records=await response.json();
   if(!Array.isArray(records)||records.length!==1||!authoredSiteExclusiveBetaLesson(records[0]))
    return reply({ok:false,error:'This Site-Exclusive lesson is not yet released for beta study.'},404);
   const privateLesson=publicGuidedLesson(records[0].content,id,6);
   const context={
    id,book:6,bookCode:'SITE_EXCLUSIVE',chapter:0,chapterTitle:'Site-Exclusive Labs',
    concept:privateLesson.concept,goal:privateLesson.objective,
    ticker:'',date:'',timeframe:'',skill:safe(lab.lab_type,90),
    teaching:{...privateLesson.teaching,questions:[]},
    practiceSteps:privateLesson.steps,
    beforeAdvance:[],
    workedExample:privateLesson.workedExample,
    commonError:privateLesson.commonError,
    limitation:privateLesson.limitation,
    sourceLinks:privateLesson.sourceLinks,
    dataNote:'Original FICTIONAL instructional case. No verified market history, fills, private rubric or grading is included.'
   };
   return reply({ok:true,lab:context,guidedAllowed:true,advancedAllowed:true,
    sourceStatus:'site_exclusive_original_authored_guided_beta_ungraded',
    instructionReviewed:false,assessmentReviewed:false,
    notice:'Author-created Site-Exclusive Guided Beta lesson. Ungraded; no official mastery or broker-simulation claim.'});
  }
  const title=safe(lab.title,180);
  // These fields already exist in the public canonical catalog. Whitelist
  // only instructional prose; never forward arbitrary metadata or keys.
  const source=lab.metadata&&typeof lab.metadata==='object'?lab.metadata:{};
  const teaching={what:safe(source.what,700),why:safe(source.why,700),when:safe(source.when,700),
   how:sentences(source.how,9),questions:sentences(source.questions,5)};
  const context={
   id:lab.lab_id,book:book.number,bookCode:lab.book_code,
   chapter:lab.chapter_number||0,chapterTitle:book.label,
   concept:title||id,goal:safe(source.objective,700)||'Apply the concept to visible evidence without using later market observations.',
   ticker:safe(lab.ticker,20),date:safe(lab.historical_date,40),
   timeframe:safe(lab.timeframe,35),skill:safe(lab.lab_type,90),
   // Only publish catalog observation boundaries when they actually exist.
   // Invented start/end instructions would imply a verified replay or a
   // companion lesson that this metadata-only beta study does not possess.
   start:safe(source.start,350),
   end:safe(source.end,350),
   teaching,practiceSteps:teaching.how.length>=3?teaching.how:[
    'Define the concept in your own words before examining the example.',
    'Name the source, timeframe and observations actually available at this moment.',
    'Record the evidence that supports your interpretation and an alternative explanation.',
    'State a condition that would invalidate your current interpretation.',
    'Compare your first decision with any subsequently permitted observation; do not claim a reviewed grade from reflection.'
   ],
   beforeAdvance:[],dataNote:'Canonical registry metadata only. A substantive authored private lesson or reviewed answer set may still be unavailable; no market history or grade is implied.'
  };
  // Only the independently verified paid Interactive Learning tool unlocks
  // these four original fictional, predecision teaching supplements.
  // Free samples, book-only access and separate training subscriptions do not.
  const originalInteractiveSupplement=interactive&&isBetaCandidateLab(id)
   ?originalInteractiveIntro(id):null;
  if(originalInteractiveSupplement){
   context.goal=originalInteractiveSupplement.objective;
   context.teaching={...context.teaching,
    what:originalInteractiveSupplement.what+' '+originalInteractiveSupplement.currentObservation,
    why:originalInteractiveSupplement.why,
    when:'Before making an as-of-time decision using a source-sensitive chart or journal',
    how:[
     'Inspect the FICTIONAL initial observation and record exactly what is known at this decision time.',
     'State one assumption that is NOT established by the evidence.',
     originalInteractiveSupplement.decisionPrompt,
     'State an invalidation or no-trade condition without requesting future data.'
    ],questions:[originalInteractiveSupplement.decisionPrompt]};
   context.practiceSteps=context.teaching.how;
   context.beforeAdvance=[originalInteractiveSupplement.decisionPrompt];
   context.dataNote=originalInteractiveSupplement.limitations+
    ' No future bars, brokerage fills, scoring keys or verified historical observations are included.';
  }
  return reply({ok:true,lab:context,guidedAllowed:true,
   advancedAllowed:premium,
   sourceStatus:originalInteractiveSupplement?'original_interactive_beta_intro_ungraded':'canonical_registry_safe_orientation_only',
   instructionReviewed:false,assessmentReviewed:false,
   notice:'Original member orientation, not an approved 419-Lab graded assessment.'});
 }catch(e){
  const status=[400,401,403,404,405].includes(e?.status)?e.status:503;
  if(status===503)console.error('lab-player-context unavailable at stage',stage,'status',Number(e?.status)||503);
  return reply({ok:false,error:status===401?'Sign in required.':
   status===403?'Active matching access required.':
   'Lab service temporarily unavailable.',
   ...(status===503?{code:'LAB_'+stage+'_UNAVAILABLE'}:{})},status);
 }
}
