/* Paid research quality metrics from existing member-owned decision_journal.
 * Record presence/coverage, not source credibility, grades or forecast returns.
 */
const exists=v=>typeof v==='string'&&v.trim().length>0;
const dateOK=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const finite=v=>{
 if(v===null||v===undefined||v==='')return null;
 const n=Number(v);return Number.isFinite(n)?n:null;
};
const aggregate=items=>{
 const values=items.map(finite).filter(v=>v!==null);
 return {sum:values.length?Math.round(values.reduce((a,b)=>a+b,0)*10000)/10000:null,
  average:values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length*10000)/10000:null,
  known:values.length,missing:items.length-values.length,denominator:items.length};
};
export function journalResearchQuality(rows,{type='all',days='all',today=new Date().toISOString().slice(0,10),researchLinks=[]}={}){
 if(!Array.isArray(rows)||!Array.isArray(researchLinks)||!['all','live','paper','observation','historical_lab'].includes(type)||
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
 // Execution analysis is restricted to explicit closed member-recorded paper/live
 // trades; observation-only, historical lessons, WATCH and NO TRADE remain excluded.
 const recorded=selected.filter(r=>['live','paper'].includes(r.journal_type)&&
  ['closed','reviewed'].includes(r.status)&&r.decision!=='NO TRADE'&&r.status!=='no_trade');
 const entryPairs=recorded.flatMap(r=>{
  const p=finite(r.planned_entry),a=finite(r.actual_entry);
  if(!(p>0)||!(a>0)||!['LONG','SHORT'].includes(r.direction))return [];
  const signed=(a-p)/p*100*(r.direction==='LONG'?1:-1);
  return [signed];
 });
 const linkedJournalIds=new Set(researchLinks.map(x=>Number(x?.journal_id)).filter(Number.isSafeInteger));
 const selectedIds=new Set(selected.map(x=>Number(x.id)).filter(Number.isSafeInteger));
 const linkedCount=[...selectedIds].filter(id=>linkedJournalIds.has(id)).length;
 const matchingLinks=researchLinks.filter(x=>selectedIds.has(Number(x?.journal_id)));
 return {
  researchToJournal:{
   linkedJournalRecords:linkedCount,
   linkedPlanReferences:new Set(matchingLinks.map(x=>Number(x.workbench_record_id))
    .filter(Number.isSafeInteger)).size,
   denominator:n,unlinkedJournalRecords:n-linkedCount,
   source:'EXISTING_OWNER_SCOPED_SAVED_RESEARCH_LINKS_NOT_INDEPENDENT_SOURCE_VERIFICATION'
  },
  recordedExecution:{
   denominator:recorded.length,
   status:'MEMBER_REPORTED_PAPER_OR_LIVE_ONLY_NOT_BROKER_VERIFIED',
   plannedVsRecordedEntryAdversePct:aggregate(entryPairs),
   entryPairsMissing:recorded.length-entryPairs.length,
   quantities:aggregate(recorded.map(r=>r.share_quantity)),
   fees:aggregate(recorded.map(r=>r.fees)),
   grossPnl:aggregate(recorded.map(r=>r.gross_pnl)),
   netPnl:aggregate(recorded.map(r=>r.net_pnl)),
   realizedR:aggregate(recorded.map(r=>r.r_multiple)),
   mfePerShare:aggregate(recorded.map(r=>r.mfe_per_share)),
   maePerShare:aggregate(recorded.map(r=>r.mae_per_share)),
   recordBoundary:'A Journal field is a member-reported observation, not a broker-confirmed execution; totals exclude unknown fields and do not imply verified returns.'
  },

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
  notice:'Counts do not establish independent source reliability, market catalysts, broker-confirmed execution fills, official assessment mastery or predictive win probabilities. Every financial metric has its own denominator; unknowns are excluded, not zero.'
 };
}
