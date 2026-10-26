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
/* A genuine active Founding learning grant OR an Owner-issued, time-limited
 * noncommercial B01 QA tool pass qualifies. Neither route assigns a founder
 * seat, refund rights, purchased books, Store discounts or reviewed grades.
 * Verify the issuer from the existing Owner role records, not user_metadata.
 */
export async function activeFoundingBetaLearningPlan(env,verifiedMemberId){
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(String(verifiedMemberId||'')))return false;
 const base=String(env?.SUPABASE_URL||'').replace(/[/]$/,'');
 const secret=String(env?.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(base)||!secret)return false;
 const headers={apikey:secret,accept:'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+[.]eyJ[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+$/.test(secret))
  headers.authorization='Bearer '+secret;
 const id=encodeURIComponent(verifiedMemberId),status='&status=in.(active,trialing)';
 const prefix=base+'/rest/v1/';
 const requests=[
  'user_plan_grants?select=plan_code,status,starts_at,ends_at&user_id=eq.'+id+status+'&plan_code=in.(FOUNDING_30,FOUNDING_60)&limit=10',
  'site_subscriptions?select=plan_code,status,current_period_end&user_id=eq.'+id+status+'&plan_code=in.(FOUNDING_30,FOUNDING_60)&limit=10',
  'user_tool_passes?select=tool_code,status,starts_at,ends_at,provider,provider_subscription_id,metadata&user_id=eq.'+id+status+'&tool_code=eq.ONDEMAND_TRAINING&limit=10'
 ];
 const read=async path=>{
  const response=await fetch(prefix+path,{headers,cache:'no-store'});
  if(!response.ok)throw Error('Verified beta entitlement record unavailable');
  const items=await response.json();
  if(!Array.isArray(items)||items.length>10)throw Error('Invalid beta entitlement record count');
  return items;
 };
 const results=await Promise.allSettled(requests.map(read));
 const now=Date.now(),tier=x=>['FOUNDING_30','FOUNDING_60'].includes(x?.plan_code);
 const rows=idx=>results[idx].status==='fulfilled'?results[idx].value:[];
 if(rows(0).some(x=>tier(x)&&validStatus(x)&&validStart(x.starts_at,now)&&validEnd(x.ends_at,now))||
    rows(1).some(x=>tier(x)&&validStatus(x)&&x.current_period_end&&validEnd(x.current_period_end,now)))
  return true;
 // A provider-issued pass or a manual pass lacking this specific authorized QA
 // provenance is never enough to disclose original book-aligned B01 instruction.
 for(const pass of rows(2)){
  const meta=pass?.metadata;
  const start=Date.parse(pass?.starts_at||''),end=Date.parse(pass?.ends_at||'');
  const issuer=String(meta?.adminGrantedBy||'');
  if(pass?.tool_code!=='ONDEMAND_TRAINING'||!validStatus(pass)||
     pass.provider!==null||pass.provider_subscription_id!==null||
     meta?.admin_manual!==true||meta?.source!=='owner_manual'||
     !String(meta?.reason||'').startsWith('F600_GUIDED_QA_V1:')||
     !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(issuer)||
     !Number.isFinite(start)||start>now||
     !Number.isFinite(end)||end<=now||
     end-start>31*24*60*60*1000)
   continue;
  try{
   // Role check must be read from the authoritative staff table. A client
   // never supplies the Owner issuer or the pass expiration to this function.
   const roles=await read('admin_user_roles?select=role_code,expires_at&user_id=eq.'+
    encodeURIComponent(issuer)+'&role_code=eq.OWNER&limit=2');
   if(roles.some(r=>r.role_code==='OWNER'&&validEnd(r.expires_at,now)))return true;
  }catch{/* Deny this QA pass if its issuer cannot be verified. */}
 }
 return false;
}
