/* Paid instructional content is stored in Supabase service-role-only tables,
 * not in public/static JSON or public GitHub source. Member access is checked.
 */
import {toolAccess,memberIdentity} from './member-tool-access.js';
import {isBetaCandidateLab,isBetaUpcomingLab} from '../_lib/lab-beta-scope-v014286.js';
import {authoredSiteExclusiveBetaLesson} from '../_lib/site-exclusive-private-lesson-v014294.js';
import {authoredB01BetaLesson,foundingBetaLearningAccessKind} from '../_lib/founding-beta-learning-access.js';
const send=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
const SAMPLES=new Set(['F1-C02-L01','F2-C01-L01','F3-C01-L01']);
// Instructional prose only. The private database contains grading, editorial
// review and assessment fields that must NEVER pass through a member API.
// Use an allowlist rather than returning arbitrary JSON or removing a few
// currently-known secret keys (future private columns must also remain hidden).
const lessonText=(v,max=2200)=>typeof v==='string'?v.slice(0,max):'';
const lessonList=(v)=>Array.isArray(v)?v.filter(x=>typeof x==='string'&&x.trim()).slice(0,14)
 .map(x=>lessonText(x,850)):[];
export function publicGuidedLesson(raw,labId,bookNumber){
 const r=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const t=r.teaching&&typeof r.teaching==='object'&&!Array.isArray(r.teaching)?r.teaching:{};
 return {
  id:String(labId),book:Number(bookNumber)||0,
  concept:lessonText(r.concept,240),objective:lessonText(r.objective),
  what:lessonText(r.what),why:lessonText(r.why),when:lessonText(r.when),
  commonError:lessonText(r.commonError),limitation:lessonText(r.limitation),
  workedExample:lessonText(r.workedExample),transfer:lessonText(r.transfer),
  sourceLinks: Array.isArray(r.sourceURLs)?r.sourceURLs.filter(x=>typeof x==='string'&&/^https:\/\/(?:www\.)?(?:investor\.gov|sec\.gov|nyse\.com)\//i.test(x)).slice(0,3):[],
  steps:lessonList(r.steps),
  teaching:{
   what:lessonText(t.what||r.what),why:lessonText(t.why||r.why),
   when:lessonText(t.when||r.when),how:lessonList(t.how).length?lessonList(t.how):lessonList(r.steps),
   commonError:lessonText(t.commonError||r.commonError),
   limitation:lessonText(t.limitation||r.limitation),transfer:lessonText(t.transfer||r.transfer)
  }
 };
}
function cfg(env){const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),secret=env.SUPABASE_SECRET_KEY,pub=env.SUPABASE_PUBLISHABLE_KEY;if(!base||!secret||!pub)throw new Error('Private Lab server is not configured.');return{base,secret,pub}}
async function rest(env,path){const c=cfg(env),headers={apikey:c.secret,accept:'application/json'};if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(c.secret))headers.authorization='Bearer '+c.secret;const r=await fetch(c.base+'/rest/v1/'+path,{headers,cache:'no-store'});if(!r.ok)throw Object.assign(new Error('Private Lab service temporarily unavailable.'),{status:503,code:'PRIVATE_LAB_STORE_UNAVAILABLE'});return r.json()}
const bookCode=b=>({1:'FOUNDATION_BOOK_1',2:'FOUNDATION_BOOK_2',3:'FOUNDATION_BOOK_3',4:'DAY_TRADING_BOOK_1',5:'READING_THE_TAPE'})[Number(b)];
export async function getBookAccess(env,req,book){return getBookCodeAccess(env,req,bookCode(book));}
export async function getBookCodeAccess(env,req,productCode){
 if(!['FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','DAY_TRADING_BOOK_1','READING_THE_TAPE'].includes(productCode))return false;
const token=/^Bearer\s+(.+)$/i.exec(req.headers.get('authorization')||'')?.[1];if(!token)return false;const c=cfg(env),identity=await fetch(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+token},cache:'no-store'});if(!identity.ok)return false;const id=(await identity.json()).id;if(!id)return false;const p=await rest(env,'profiles?select=account_kind,deleted_at&id=eq.'+encodeURIComponent(id)+'&limit=1');
 if(!Array.isArray(p)||p.length!==1||p[0]?.account_kind!=='member'||p[0]?.deleted_at!=null)return false;
 const flags=await rest(env,'admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(id)+'&limit=20');
 if(!Array.isArray(flags)||flags.some(x=>['suspended','restricted'].includes(String(x?.status||'').toLowerCase())))return false;
 const roles=await rest(env,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(id));
 if(!Array.isArray(roles))return false;
 const now=Date.now();
 if(roles.some(x=>x.role_code==='SHOWCASE_VIEWER'&&(!x.expires_at||!Number.isFinite(Date.parse(x.expires_at))||Date.parse(x.expires_at)>now)))return false;
 // Check direct book ownership first. One optional subscription-join failure
 // must not disable an independently valid purchased/redeemed book entitlement.
 const library=await rest(env,'user_library?select=product_code,expires_at&user_id=eq.'+encodeURIComponent(id)+'&product_code=eq.'+productCode+'&limit=20');
 if(library.some(x=>!x.expires_at||Date.parse(x.expires_at)>now))return true;
 const redeemed=await rest(env,'book_key_redemptions?select=book_code,starts_at,ends_at&user_id=eq.'+encodeURIComponent(id)+'&book_code=eq.'+productCode+'&limit=20');
 if(redeemed.some(x=>(!x.starts_at||Date.parse(x.starts_at)<=now)&&(!x.ends_at||Date.parse(x.ends_at)>now)))return true;
 // PostgREST embedded platform_plans!inner requires an actual FK relationship.
 // Production grants/subscriptions have no such FK. Resolve plan definitions
 // separately by exact server-stored plan_code, then enforce all original
 // positive conditions. A missing/disabled plan never authorizes a book.
 const grants=await rest(env,'user_plan_grants?select=plan_code,status,starts_at,ends_at&user_id=eq.'+encodeURIComponent(id)+'&limit=25');
 const subscriptions=await rest(env,'site_subscriptions?select=plan_code,status,current_period_end&user_id=eq.'+encodeURIComponent(id)+'&limit=25');
 const candidateCodes=[...new Set([
  ...grants.filter(x=>x.status==='active'||x.status==='trialing').map(x=>x.plan_code),
  ...subscriptions.filter(x=>x.status==='active'||x.status==='trialing').map(x=>x.plan_code)
 ].filter(x=>typeof x==='string'&&/^[A-Z0-9_]{3,90}$/.test(x)))];
 if(candidateCodes.length>0){
  const plans=await rest(env,'platform_plans?select=plan_code,includes_all_books,active,billing_interval&plan_code=in.('+candidateCodes.map(encodeURIComponent).join(',')+')&limit=50');
  if(!Array.isArray(plans)||plans.length!==candidateCodes.length||
     plans.some(p=>!candidateCodes.includes(p.plan_code)))
   throw Object.assign(new Error('Book membership policy could not be verified.'),{status:503});
  const byCode=new Map(plans.map(p=>[p.plan_code,p]));
  if(grants.some(x=>{
   const p=byCode.get(x.plan_code);
   return p?.active===true&&p.includes_all_books===true&&
    ['active','trialing'].includes(x.status)&&x.starts_at&&
    Date.parse(x.starts_at)<=now&&(!x.ends_at||Date.parse(x.ends_at)>now);
  }))return true;
  if(subscriptions.some(x=>{
   const p=byCode.get(x.plan_code);
   return p?.active===true&&p.includes_all_books===true&&
    ['active','trialing'].includes(x.status)&&
    ((p.billing_interval==='lifetime'&&!x.current_period_end)||
     (x.current_period_end&&Date.parse(x.current_period_end)>now));
  }))return true;
 }
 return roles.some(x=>x.role_code==='OWNER'&&(!x.expires_at||Date.parse(x.expires_at)>now));}
export async function onRequest({request,env}){try{if(request.method!=='GET')return send({ok:false,error:'Method not allowed.'},405);const url=new URL(request.url),action=url.searchParams.get('action')||'case';
 if(action==='list'){
  const [trainingAccess,interactiveAccess]=await Promise.all([
   toolAccess(env,request,'ONDEMAND_TRAINING'),toolAccess(env,request,'INTERACTIVE_LEARNING')
  ]);
  if(!trainingAccess.authorized&&!interactiveAccess.authorized)
   return send({ok:false,error:'A matching Interactive Learning or training subscription is required.'},403);
  const actor=await memberIdentity(env,request);
  // Mirror case-by-case access. A Founding or Owner-issued QA entitlement
  // authorizes the original B01 *learning* content, never ebook ownership,
  // rubrics, grading or unreviewed generic material.
  const premiumAuthorized=trainingAccess.authorized===true;
  const [coverage,betaKind,rows]=await Promise.all([
   Promise.all([1,2,3].map(book=>getBookAccess(env,request,book))),
   foundingBetaLearningAccessKind(env,actor.userId),
   rest(env,'lab_instruction_v014?select=lab_id,book_number,content,source_status,reviewed_by,reviewed_at&order=lab_id.asc&limit=500')
  ]);
  // Support all 419 canonical Lab identifiers without silently truncating a
  // 336-Lab beta catalog. An unexpected provider cap is an explicit error,
  // never a misleading 'nothing to test' response.
  if(!Array.isArray(rows)||rows.length>=500)
   throw Object.assign(new Error('Private Lab catalog incomplete; retry after source synchronization.'),{status:503});
  const allowed=rows.filter(row=>(isBetaCandidateLab(row.lab_id)||isBetaUpcomingLab(row.lab_id))&&(
   Number(row.book_number)===6?premiumAuthorized&&authoredSiteExclusiveBetaLesson(row):
   coverage[Number(row.book_number)-1]===true||
   (betaKind!==null&&authoredB01BetaLesson(row))));
  return send({ok:true,labs:allowed.map(row=>({
   ...publicGuidedLesson(row.content,row.lab_id,row.book_number),
   learningAccess:Number(row.book_number)===6?'authorized_site_exclusive_beta':
    coverage[Number(row.book_number)-1]===true?'book':'scoped_beta',
   officialGradingAvailable:false
  }))});
 }
 const id=url.searchParams.get('id')||'';if(!/^[A-Za-z0-9_-]{3,90}$/.test(id))return send({ok:false,error:'Invalid Lab ID.'},400);
// Authenticate BEFORE privileged database reads, even for published sample IDs.
// A sample means free guided education for eligible signed-in members—not a
// public API bypass for guest, suspended, or Showcase accounts.
const actor=await memberIdentity(env,request);
if(!isBetaCandidateLab(id)&&!isBetaUpcomingLab(id))return send({ok:false,error:'This Lab is not released for beta learning.'},404);
if(SAMPLES.has(id)){
 const [profiles,flags]=await Promise.all([
  rest(env,'profiles?select=account_kind&id=eq.'+encodeURIComponent(actor.userId)+'&limit=1'),
  rest(env,'admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(actor.userId)+'&limit=1')
 ]);
 if(profiles[0]?.account_kind!=='member'||['suspended','restricted'].includes(String(flags[0]?.status||'').toLowerCase()))
  return send({ok:false,error:'An eligible member account is required for this guided sample.'},403);
}
const rows=await rest(env,'lab_instruction_v014?select=lab_id,book_number,content,source_status,reviewed_by,reviewed_at&lab_id=eq.'+encodeURIComponent(id)+'&limit=1'),row=rows[0];if(!row)return send({ok:false,error:'This instructional Lab has not been loaded privately.'},404);
const siteLesson=isBetaUpcomingLab(id)&&authoredSiteExclusiveBetaLesson(row);
if(isBetaUpcomingLab(id)&&!siteLesson)return send({ok:false,error:'This Site-Exclusive lesson is not yet authored for guided study.'},404);
 // Independent entitled products can still be confirmed if the other lookup
 // fails. Never infer an entitlement from a source/network error.
 const checks=await Promise.allSettled([
  toolAccess(env,request,'ONDEMAND_TRAINING'),
  toolAccess(env,request,'INTERACTIVE_LEARNING')
 ]);
 const training=checks[0].status==='fulfilled'&&checks[0].value.authorized===true;
 const interactive=checks[1].status==='fulfilled'&&checks[1].value.authorized===true;
 const premium=training||interactive;
 // Free samples rely on account eligibility, not on an unrelated book ledger.
// When a paid training member lacks this particular book, do not expose its
// authored material. Instead return 404 so the member player can invoke its
// separately authorized, metadata-only Lab context; 403 remains hard denial.
const sample=SAMPLES.has(id);
const ownsBook=sample?false:await getBookAccess(env,request,row.book_number);
const betaAccessKind=premium&&authoredB01BetaLesson(row)?
 await foundingBetaLearningAccessKind(env,actor.userId):null;
const scopedFoundingBeta=!!betaAccessKind;
const guided=ownsBook||sample||scopedFoundingBeta||(siteLesson&&training);
if(!guided&&premium)return send({ok:false,error:'This book-authored lesson requires the matching book; use the authorized Lab orientation instead.'},404);
if(!guided)return send({ok:false,error:'An active matching book or training entitlement is required.'},403);
 const unreviewed=String(row.source_status||'').startsWith('original_hypothetical_unreviewed_');
 const instructionReviewed=row.source_status==='editorially_reviewed_educational_illustrative_b01_v1'&&
  !!row.reviewed_by&&Number.isFinite(Date.parse(String(row.reviewed_at||'')));
 return send({ok:true,lab:publicGuidedLesson(row.content,row.lab_id,row.book_number),guidedAllowed:true,advancedAllowed:premium,
  sourceStatus:siteLesson?'site_exclusive_original_authored_guided_beta_ungraded':
   betaAccessKind==='owner_qa'?'owner_authorized_b01_guided_beta_ungraded':
   scopedFoundingBeta?
   (instructionReviewed?'founding600_editorially_reviewed_b01_guided_beta':'founding600_authored_b01_guided_beta_ungraded'):
   unreviewed?'private_unreviewed_conceptual_orientation':
   instructionReviewed?'private_editorially_reviewed_b01_instruction':'private_instruction_review_not_established',
  foundingBetaStudy:scopedFoundingBeta||siteLesson&&training,ownerQAStudy:betaAccessKind==='owner_qa',gradedCreditEligible:false,
  instructionReviewed,assessmentReviewed:false});
}catch(e){return send({ok:false,error:e.message||'Lab service unavailable.',...(e.code?{code:e.code}:{})},e.status||503)}}
