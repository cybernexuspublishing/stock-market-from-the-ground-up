/* D09 privacy-preserving knowledge gap metrics.
 * Raw learner questions, ids, IPs, journals and model text are NEVER retained.
 * Only a fixed textbook taxonomy enum and aggregate day/count are persisted.
 */
const REFS=[
 ['vwap',/\bvwap\b|volume.weighted.average/i],
 ['ema',/\bema(?:9|20)?\b|exponential.moving.average/i],
 ['volume',/\bvolume\b/i],
 ['liquidity',/\bliquidity\b/i],
 ['spread',/\bspread\b|bid.ask/i],
 ['tape',/\btape\b|time.and.sales|level.ii|level.2/i],
 ['risk',/\brisk\b|stop.loss|position.siz/i],
 ['mfe',/\bmfe\b|max(?:imum)?.favorable.excursion/i],
 ['mae',/\bmae\b|max(?:imum)?.adverse.excursion/i],
 ['structure',/\bstructure\b|higher.high|lower.low|higher.low|lower.high/i],
 ['breakout',/\bbreakout\b|false.breakout|failed.breakout/i],
 ['bootcamp',/\bbootcamp\b/i],
 ['journal',/\bjournal\b/i]
];
export function classifyTutorGap(q){
 const s=typeof q==='string'?q.slice(0,450):'';
 for(const [name,re] of REFS)if(re.test(s))return name;
 return 'other';
}
export async function recordTutorGap(env,question){
 const url=String(env.SUPABASE_URL||'').replace(/\/$/,''),
  key=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(url)||!key)return false;
 const headers={apikey:key,accept:'application/json','content-type':'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key))
  headers.authorization='Bearer '+key;
 try{
  const result=await fetch(url+'/rest/v1/rpc/gu_v014149_record_tutor_gap',{
   method:'POST',cache:'no-store',headers,
   body:JSON.stringify({p_topic:classifyTutorGap(question)})});
  return result.ok;
 }catch{return false}
}
