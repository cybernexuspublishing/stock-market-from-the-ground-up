/* Paid research quality metrics from existing member-owned decision_journal.
 * Record presence/coverage, not source credibility, grades or forecast returns.
 */
const exists=v=>typeof v==='string'&&v.trim().length>0;
const dateOK=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'));
export function journalResearchQuality(rows,{type='all',days='all',today=new Date().toISOString().slice(0,10)}={}){
 if(!Array.isArray(rows)||!['all','live','paper','observation','historical_lab'].includes(type)||
   !['all','30','90','365'].includes(String(days))||!dateOK(today))throw Error('Invalid research review source or filters.');
 const cutoff=days==='all'?null:Date.parse(today+'T00:00:00Z')-(Number(days)-1)*86400000;
 const selected=rows.filter(r=>r&&dateOK(r.trade_date)&&r.trade_date<=today&&
   (type==='all'||r.journal_type===type)&&(cutoff===null||Date.parse(r.trade_date+'T00:00:00Z')>=cutoff));
 const n=selected.length;
 const noTrade=selected.filter(r=>r.status==='no_trade'||r.decision==='NO TRADE').length;
 const notes=['evidence','thesis','invalidation','entry_trigger','catalyst_context','no_trade_condition'];
 const fields=Object.fromEntries(notes.map(f=>[f,{
   present:selected.filter(r=>exists(r[f])).length,
   missing:selected.filter(r=>!exists(r[f])).length,denominator:n
 }]));
 const groups=new Map();
 for(const r of selected){const key=exists(r.setup)?r.setup.trim().slice(0,80):'Not specified';groups.set(key,(groups.get(key)||0)+1)}
 const byStrategy=[...groups].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,12)
   .map(([name,count])=>({name,count}));
 const byType=['live','paper','observation','historical_lab'].map(name=>({
  name,count:selected.filter(r=>r.journal_type===name).length
 }));
 const knownPlan=selected.filter(r=>r.plan_followed==='YES'||r.plan_followed==='NO');
 const followed=knownPlan.filter(r=>r.plan_followed==='YES').length;
 return {
  denominator:n,totalRecordsReviewed:n,
  noTrade,noTradeRate:n?Math.round(noTrade/n*1000)/10:null,
  plansLocked:selected.filter(r=>r.plan_locked_at!=null).length,
  completed:selected.filter(r=>['closed','no_trade','reviewed'].includes(r.status)).length,
  sourceCoverage:fields,
  planAdherence:{documented:knownPlan.length,followed,missing:n-knownPlan.length,
    rate:knownPlan.length?Math.round(followed/knownPlan.length*1000)/10:null},
  byStrategy,byType,
  reviewedWindow:days,today,
  label:'Private member-reported Journal research completeness',
  notice:'Counts do not establish independent source reliability, market catalysts, execution fills, official assessment mastery or predictive win probabilities.'
 };
}
