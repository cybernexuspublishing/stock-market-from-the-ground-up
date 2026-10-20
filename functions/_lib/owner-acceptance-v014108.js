/* v0.14.0.108: read-only Owner acceptance diagnostics.
 * Permission check is done by caller before this module is entered.
 * Do not expose prompts, usernames, member identifiers, raw notes,
 * moderation reports, unpublished legal policy text, or API keys.
 * SQL Editor "Success" indicates execution, not live verification.
 */
const countMatch=response=>{
 const n=/\/(\d+)$/.exec(response.headers.get('content-range')||'');
 return n?Number(n[1]):null;
};
const jwt=k=>/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(k);
export async function ownerAcceptanceSnapshot(env){
 const base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const key=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(base)||!key)return {verified:false,checks:[],error:'Private project credentials unavailable.'};
 const headers={apikey:key,accept:'application/json',prefer:'count=exact'};
 if(jwt(key))headers.authorization='Bearer '+key;
 const targets=[
  ['v102_member_tutor_history','gu_member_tutor_exchanges_v014102','id'],
  ['v103_paid_ai_request_ledger','gu_ai_service_requests_v014103','id'],
  ['v105_candidate_lab_mappings','gu_lab_competency_knowledge_map_v014105','lab_id'],
  ['v107_source_request_rate_limit','gu_tutor_rate_bucket_v014107','user_id'],
  ['v105_knowledge_evidence','competency_evidence','id']
 ];
 const checks=await Promise.all(targets.map(async ([code,table,column])=>{
  try{
   const r=await fetch(base+'/rest/v1/'+table+'?select='+column+'&limit=1',
    {headers,cache:'no-store'});
   if(!r.ok)return {code,state:'not_verified',rowCount:null};
   const rows=countMatch(r);
   return rows===null?{code,state:'not_verified',rowCount:null}:
    {code,state:'readable',rowCount:rows};
  }catch{return {code,state:'not_verified',rowCount:null}}
 }));
 const map=checks.find(x=>x.code==='v105_candidate_lab_mappings');
 return {verified:checks.every(x=>x.state==='readable'),checks,
  labMappingCountVerified:map?.state==='readable'&&map.rowCount===419,
  v105ReviewAccepted:false,
  liveAiProviderTestVerified:false,liveCustomerPurchaseTestVerified:false,
  privacyRetentionPolicyVerified:false,
  explanation:'Counts only confirm Owner read access; they do not verify member permissions, function grants, approved rubrics, authentic historical market data, provider inference, full legal publication, or commercial checkout.'};
}
