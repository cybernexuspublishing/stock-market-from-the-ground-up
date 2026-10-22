/* v0.14.0.107: server-side only, genuine Tutor response transcript writer.
 * TRUST BOUNDARY: never import this from browser; authenticated Tutor endpoint
 * obtains userId from Supabase token, generates response and invokes this.
 * Older v102 browser-copied notes remain distinguishable from verified entries.
 */
const headersFor=key=>{
 const h={apikey:key,accept:'application/json','content-type':'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key))h.authorization='Bearer '+key;
 return h;
};
export async function saveVerifiedTutorExchange(env,userId,record){
 const url=String(env.SUPABASE_URL||'').replace(/\/$/,''),key=String(env.SUPABASE_SECRET_KEY||'');
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(!uuid.test(userId)||!/^https:\/\/[^/]+$/.test(url)||!key)return null;
 const requestId=String(record.requestId||'')||crypto.randomUUID();
 if(!uuid.test(requestId))return null;
 const mode=String(record.mode||''),question=String(record.question||'').trim(),
  answer=String(record.answer||'').trim(),reasoning=String(record.learnerAnswer||'').trim(),
  generation=String(record.generation||'').trim();
 if(!['explain','question','review','practice'].includes(mode)||question.length<4||question.length>450||
 answer.length<1||answer.length>4500||reasoning.length>1800||
 !['grounded-model-draft','original-competency-guide','reviewed-glossary-logic','authenticated-practice-history','deterministic-position-math'].includes(generation))
  return null;
 const sourceTitles=(Array.isArray(record.sources)?record.sources:[]).slice(0,3)
  .map(x=>String(x?.title||'').trim().slice(0,120)).filter(Boolean);
 const data={p_user_id:userId,p_request_id:requestId,p_question:question,
  p_learner_answer:reasoning,p_mode:mode,p_answer:answer,
  p_generation:'verified:'+generation,p_source_titles:sourceTitles};
 try{
  const response=await fetch(url+'/rest/v1/rpc/gu_v014102_save_member_tutor_exchange',{
   method:'POST',cache:'no-store',headers:headersFor(key),body:JSON.stringify(data)});
  if(!response.ok)return null;
  const id=await response.json();
  if(!uuid.test(String(id||'')))return null;
  // D07: the existing SQL RPC is request-ID idempotent. Do not report that a
  // DIFFERENT answer was saved if the same request ID was accidentally reused
  // by a retry with changed text. Verify the actual persisted row.
  const check=await fetch(url+'/rest/v1/gu_member_tutor_exchanges_v014102?select=question,learner_answer,mode,answer,generation'+
   '&user_id=eq.'+encodeURIComponent(userId)+'&id=eq.'+encodeURIComponent(id)+'&limit=1',
   {method:'GET',cache:'no-store',headers:headersFor(key)});
  if(!check.ok)return null;
  const rows=await check.json().catch(()=>null);
  const saved=Array.isArray(rows)&&rows.length===1?rows[0]:null;
  return saved&&saved.question===question&&saved.learner_answer===reasoning&&
    saved.mode===mode&&saved.answer===answer&&saved.generation==='verified:'+generation?id:null;
 }catch{return null}
}
