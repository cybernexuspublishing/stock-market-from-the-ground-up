/* Founder QA learning access only. Never conveys ebook ownership, money, Sparks,
 * editorial acceptance, grading credit, or Founders Commons eligibility.
 * Caller must have verified memberIdentity + authorized ONDEMAND_TRAINING.
 * All grant data is fetched fresh from protected tables, never trusted from UI.
 */
export function authoredB01BetaLesson(row){
 const c=row?.content&&typeof row.content==='object'?row.content:row||{};
 const id=String(row?.lab_id||row?.labId||'');
 const source=String(row?.source_status||row?.sourceStatus||'');
 const batch=String(row?.lesson_batch||c.lessonBatch||'');
 const authoring=String(row?.authoring_status||c.authoringStatus||'');
 const concept=String(row?.concept||c.concept||'');
 const objective=String(row?.objective||c.objective||'');
 const why=String(row?.why||c.why||'');
 const steps=row?.steps||c.steps;
 return /^F[12]-C\d{2}-L\d{2}$/.test(id)&&
  source==='original_hypothetical_unreviewed_v01496'&&
  batch==='2026-10-25-B01'&&
  authoring==='ORIGINAL_AUTHORED_EDUCATIONAL_DRAFT_NOT_EDITORIALLY_OR_GRADING_ACCEPTED'&&
  concept.trim().length>=8&&objective.trim().length>=20&&why.trim().length>=50&&
  Array.isArray(steps)&&steps.length>=3&&
  steps.every(x=>typeof x==='string'&&x.trim().length>=12);
}
const validStatus=row=>['active','trialing'].includes(row?.status);
const validStart=(date,now)=>!date||Number.isFinite(Date.parse(date))&&Date.parse(date)<=now;
const validEnd=(date,now)=>!date||Number.isFinite(Date.parse(date))&&Date.parse(date)>now;
/* Only active Founding_30/60 test grants or genuine subscriptions enable
 * *scoped* testing of authored Labs. The presence of a paid founder number
 * is neither fabricated nor required for a separately authorized QA grant.
 */
export async function activeFoundingBetaLearningPlan(env,verifiedMemberId){
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(String(verifiedMemberId||'')))return false;
 const base=String(env?.SUPABASE_URL||'').replace(/\/$/,'');
 const secret=String(env?.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(base)||!secret)return false;
 const headers={apikey:secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret))
  headers.authorization='Bearer '+secret;
 const id=encodeURIComponent(verifiedMemberId),status='&status=in.(active,trialing)';
 const prefix=base+'/rest/v1/';
 const paths=[
  'user_plan_grants?select=plan_code,status,starts_at,ends_at&user_id=eq.'+id+status+'&plan_code=in.(FOUNDING_30,FOUNDING_60)&limit=10',
  'site_subscriptions?select=plan_code,status,current_period_end&user_id=eq.'+id+status+'&plan_code=in.(FOUNDING_30,FOUNDING_60)&limit=10'
 ];
 try{
  const responses=await Promise.all(paths.map(path=>fetch(prefix+path,{headers,cache:'no-store'})));
  if(responses.some(r=>!r.ok))return false;
  const [grants,subs]=await Promise.all(responses.map(r=>r.json()));
  if(!Array.isArray(grants)||!Array.isArray(subs)||grants.length>10||subs.length>10)return false;
  const now=Date.now(),tier=x=>['FOUNDING_30','FOUNDING_60'].includes(x?.plan_code);
  return grants.some(x=>tier(x)&&validStatus(x)&&validStart(x.starts_at,now)&&validEnd(x.ends_at,now))||
   subs.some(x=>tier(x)&&validStatus(x)&&x.current_period_end&&validEnd(x.current_period_end,now));
 }catch{return false}
}
