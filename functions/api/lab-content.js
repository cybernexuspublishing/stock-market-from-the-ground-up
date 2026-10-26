/* Paid instructional content is stored in Supabase service-role-only tables,
 * not in public/static JSON or public GitHub source. Member access is checked.
 */
import {toolAccess,memberIdentity} from './member-tool-access.js';
import {isBetaCandidateLab} from '../_lib/lab-beta-scope-v014286.js';
import {authoredB01BetaLesson,activeFoundingBetaLearningPlan} from '../_lib/founding-beta-learning-access.js';
const send=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
const SAMPLES=new Set(['F1-C02-L01','F2-C01-L01','F3-C01-L01']);
function cfg(env){const base=String(env.SUPABASE_URL||'').replace(/\/$/,''),secret=env.SUPABASE_SECRET_KEY,pub=env.SUPABASE_PUBLISHABLE_KEY;if(!base||!secret||!pub)throw new Error('Private Lab server is not configured.');return{base,secret,pub}}
async function rest(env,path){const c=cfg(env),headers={apikey:c.secret,accept:'application/json'};if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(c.secret))headers.authorization='Bearer '+c.secret;const r=await fetch(c.base+'/rest/v1/'+path,{headers,cache:'no-store'});if(!r.ok)throw Object.assign(new Error('Private Lab service temporarily unavailable.'),{status:503,code:'PRIVATE_LAB_STORE_UNAVAILABLE'});return r.json()}
const bookCode=b=>({1:'FOUNDATION_BOOK_1',2:'FOUNDATION_BOOK_2',3:'FOUNDATION_BOOK_3',4:'DAY_TRADING_BOOK_1',5:'READING_THE_TAPE'})[Number(b)];
export async function getBookAccess(env,req,book){return getBookCodeAccess(env,req,bookCode(book));}
export async function getBookCodeAccess(env,req,productCode){
 if(!['FOUNDATION_BOOK_1','FOUNDATION_BOOK_2','FOUNDATION_BOOK_3','DAY_TRADING_BOOK_1','READING_THE_TAPE'].includes(productCode))return false;
const token=/^Bearer\s+(.+)$/i.exec(req.headers.get('authorization')||'')?.[1];if(!token)return false;const c=cfg(env),identity=await fetch(c.base+'/auth/v1/user',{headers:{apikey:c.pub,authorization:'Bearer '+token},cache:'no-store'});if(!identity.ok)return false;const id=(await identity.json()).id;if(!id)return false;const p=await rest(env,'profiles?select=account_kind&id=eq.'+encodeURIComponent(id)+'&limit=1');if(p[0]?.account_kind!=='member')return false;
 const flags=await rest(env,'admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(id)+'&limit=1');
 if(['suspended','restricted'].includes(flags[0]?.status))return false;
 const now=Date.now();
 // Check direct book ownership first. One optional subscription-join failure
 // must not disable an independently valid purchased/redeemed book entitlement.
 const library=await rest(env,'user_library?select=product_code,expires_at&user_id=eq.'+encodeURIComponent(id)+'&product_code=eq.'+productCode+'&limit=20');
 if(library.some(x=>!x.expires_at||Date.parse(x.expires_at)>now))return true;
 const redeemed=await rest(env,'book_key_redemptions?select=book_code,starts_at,ends_at&user_id=eq.'+encodeURIComponent(id)+'&book_code=eq.'+productCode+'&limit=20');
 if(redeemed.some(x=>(!x.starts_at||Date.parse(x.starts_at)<=now)&&(!x.ends_at||Date.parse(x.ends_at)>now)))return true;
 const grants=await rest(env,'user_plan_grants?select=plan_code,status,starts_at,ends_at,platform_plans!inner(includes_all_books)&user_id=eq.'+encodeURIComponent(id)+'&limit=25');
 if(grants.some(x=>x.platform_plans?.includes_all_books===true&&['active','trialing'].includes(x.status)&&(!x.starts_at||Date.parse(x.starts_at)<=now)&&(!x.ends_at||Date.parse(x.ends_at)>now)))return true;
 const subscriptions=await rest(env,'site_subscriptions?select=plan_code,status,current_period_end,platform_plans!inner(includes_all_books)&user_id=eq.'+encodeURIComponent(id)+'&limit=25');
 if(subscriptions.some(x=>x.platform_plans?.includes_all_books===true&&['active','trialing'].includes(x.status)&&(!x.current_period_end||Date.parse(x.current_period_end)>now)))return true;
 const roles=await rest(env,'admin_user_roles?select=role_code,expires_at&user_id=eq.'+encodeURIComponent(id));
 return roles.some(x=>x.role_code==='OWNER'&&(!x.expires_at||Date.parse(x.expires_at)>now));}
export async function onRequest({request,env}){try{if(request.method!=='GET')return send({ok:false,error:'Method not allowed.'},405);const url=new URL(request.url),action=url.searchParams.get('action')||'case';
 if(action==='list'){const a=await toolAccess(env,request,'ONDEMAND_TRAINING');if(!a.authorized)return send({ok:false,error:a.reason},403);
 // Tool access is NOT equivalent to purchasing every textbook. Filter each book
 // before any book-derived lesson body leaves the service-role backend.
 const coverage=await Promise.all([1,2,3].map(book=>getBookAccess(env,request,book)));
 const rows=await rest(env,'lab_instruction_v014?select=lab_id,book_number,content&order=lab_id.asc&limit=150');
 return send({ok:true,labs:rows.filter(r=>isBetaCandidateLab(r.lab_id)&&coverage[Number(r.book_number)-1]===true).map(r=>r.content)})}
 const id=url.searchParams.get('id')||'';if(!/^[A-Za-z0-9_-]{3,90}$/.test(id))return send({ok:false,error:'Invalid Lab ID.'},400);
// Authenticate BEFORE privileged database reads, even for published sample IDs.
// A sample means free guided education for eligible signed-in members—not a
// public API bypass for guest, suspended, or Showcase accounts.
const actor=await memberIdentity(env,request);
if(!isBetaCandidateLab(id))return send({ok:false,error:'This Lab is upcoming and not released for beta learning.'},404);
if(SAMPLES.has(id)){
 const [profiles,flags]=await Promise.all([
  rest(env,'profiles?select=account_kind&id=eq.'+encodeURIComponent(actor.userId)+'&limit=1'),
  rest(env,'admin_user_flags?select=status&user_id=eq.'+encodeURIComponent(actor.userId)+'&limit=1')
 ]);
 if(profiles[0]?.account_kind!=='member'||['suspended','restricted'].includes(String(flags[0]?.status||'').toLowerCase()))
  return send({ok:false,error:'An eligible member account is required for this guided sample.'},403);
}
const rows=await rest(env,'lab_instruction_v014?select=lab_id,book_number,content,source_status&lab_id=eq.'+encodeURIComponent(id)+'&limit=1'),row=rows[0];if(!row)return send({ok:false,error:'This instructional Lab has not been loaded privately.'},404);
 let premium=false;try{premium=(await toolAccess(env,request,'ONDEMAND_TRAINING')).authorized}catch{}
 // Free samples rely on account eligibility, not on an unrelated book ledger.
// When a paid training member lacks this particular book, do not expose its
// authored material. Instead return 404 so the member player can invoke its
// separately authorized, metadata-only Lab context; 403 remains hard denial.
const sample=SAMPLES.has(id);
const ownsBook=sample?false:await getBookAccess(env,request,row.book_number);
const scopedFoundingBeta=premium&&authoredB01BetaLesson(row)&&
 await activeFoundingBetaLearningPlan(env,actor.userId);
const guided=ownsBook||sample||scopedFoundingBeta||Number(row.book_number)===6&&premium;
if(!guided&&premium)return send({ok:false,error:'This book-authored lesson requires the matching book; use the authorized Lab orientation instead.'},404);
if(!guided)return send({ok:false,error:'An active matching book or training entitlement is required.'},403);
 const unreviewed=String(row.source_status||'').startsWith('original_hypothetical_unreviewed_');
 return send({ok:true,lab:row.content,guidedAllowed:true,advancedAllowed:premium,
  sourceStatus:scopedFoundingBeta?'founding600_authored_b01_guided_beta_ungraded':
   unreviewed?'private_unreviewed_conceptual_orientation':'private_instruction_review_not_established',
  foundingBetaStudy:scopedFoundingBeta,gradedCreditEligible:false,
  instructionReviewed:false,assessmentReviewed:false});
}catch(e){return send({ok:false,error:e.message||'Lab service unavailable.',...(e.code?{code:e.code}:{})},e.status||503)}}
