/* v0.14.0.114 — privacy-contained deterministic journal analytics.
 * Source is MEMBER-ENTERED journal work, never authenticated brokerage fills.
 * No trading recommendation, predictions, source dataset promotion, or scoring.
 */
const finite=v=>{
 if(v===null||v===undefined||v==='')return null;
 const n=typeof v==='number'?v:Number(v);
 return Number.isFinite(n)?n:null;
};
const rounding=(n,d=4)=>n===null?null:Number(n.toFixed(d));
const pct=(n,d)=>d?rounding(n/d*100,2):null;
const avg=xs=>xs.length?rounding(xs.reduce((a,b)=>a+b,0)/xs.length):null;
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 !Number.isNaN(Date.parse(s+'T12:00:00Z'));
const settled=r=>r&&r.status==='closed'&&['live','paper'].includes(r.journal_type)&&
 !['NO TRADE','OBSERVATION ONLY'].includes(r.decision)&&finite(r.net_pnl)!==null;
const orderKey=r=>(validDate(r.exit_date)?r.exit_date:validDate(r.trade_date)?r.trade_date:'9999-12-31')+
 '|'+String(r.created_at||'')+'|'+String(r.id??'');
const sanitizedText=x=>String(x||'Unclassified').trim().slice(0,80)||'Unclassified';
const report=(rows,{type='all',days='all',today=new Date().toISOString().slice(0,10)}={})=>{
 if(!Array.isArray(rows))throw new Error('Journal rows must be a list.');
 if(!['all','live','paper'].includes(type)||!['all','30','90','365'].includes(String(days)))
  throw new Error('Invalid journal filter.');
 const todayDate=validDate(today)?Date.parse(today+'T12:00:00Z'):NaN;
 if(!Number.isFinite(todayDate))throw new Error('Invalid analytics as-of date.');
 const cutoff=days==='all'?null:todayDate-(Number(days)-1)*86400000;
 const base=rows.filter(r=>r&&r.status==='closed'&&['live','paper'].includes(r.journal_type)&&
  (type==='all'||r.journal_type===type)&&validDate(r.trade_date)&&
  (cutoff===null||Date.parse(r.trade_date+'T12:00:00Z')>=cutoff)&&
  Date.parse(r.trade_date+'T12:00:00Z')<=todayDate);
 const eligible=base.filter(settled).sort((a,b)=>orderKey(a).localeCompare(orderKey(b)));
 const unscored=base.length-eligible.length;
 let sum=0,peak=0,drawdown=0,winCount=0,lossCount=0,flatCount=0,grossProfit=0,grossLoss=0;
 let riskVals=[],processGood=0,processBad=0,processUnknown=0,follow=0,followKnown=0,badWins=0;
 const equity=[];
 const groups=new Map();
 const score={live:{n:0,net:0,r:[]},paper:{n:0,net:0,r:[]}};
 for(const r of eligible){
  const net=finite(r.net_pnl),rv=finite(r.r_multiple),key=sanitizedText(r.setup);
  sum+=net;peak=Math.max(peak,sum);drawdown=Math.max(drawdown,peak-sum);
  const positive=net>0,negative=net<0;
  if(positive){winCount++;grossProfit+=net}
  else if(negative){lossCount++;grossLoss+=Math.abs(net)}else flatCount++;
  if(rv!==null)riskVals.push(rv);
  if(r.process_grade==='GOOD')processGood++;
  else if(r.process_grade==='BAD'){processBad++;if(positive)badWins++}
  else processUnknown++;
  if(['YES','NO'].includes(r.plan_followed)){followKnown++;if(r.plan_followed==='YES')follow++}
  let g=groups.get(key);if(!g){g={setup:key,n:0,wins:0,net:0,r:[]};groups.set(key,g)}
  g.n++;if(positive)g.wins++;g.net+=net;if(rv!==null)g.r.push(rv);
  const a=score[r.journal_type];a.n++;a.net+=net;if(rv!==null)a.r.push(rv);
  equity.push({date:validDate(r.exit_date)?r.exit_date:r.trade_date,value:rounding(sum,2)});
 }
 const categ=(field)=>{
  const counts=new Map();
  for(const r of eligible){
   const key=sanitizedText(r[field]);counts.set(key,(counts.get(key)||0)+1);
  }
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
   .slice(0,10).map(([label,count])=>({label,count}));
 };
 const mistakeCounts=new Map(),matrix={good_win:0,good_loss:0,bad_win:0,bad_loss:0};
 let exitMatched=0,exitComparable=0;
 const mfe=[],mae=[],capture=[];
 for(const r of eligible){
  const net=finite(r.net_pnl);
  if(net!==0){
   if(r.process_grade==='GOOD')matrix[net>0?'good_win':'good_loss']++;
   if(r.process_grade==='BAD')matrix[net>0?'bad_win':'bad_loss']++;
  }
  if(r.planned_exit_reason_category&&r.actual_exit_reason_category){
   exitComparable++;
   if(r.planned_exit_reason_category===r.actual_exit_reason_category)exitMatched++;
  }
  for(const tag of Array.isArray(r.mistakes)?r.mistakes.slice(0,30):[]){
   const key=sanitizedText(tag);mistakeCounts.set(key,(mistakeCounts.get(key)||0)+1);
  }
  for(const [field,to] of [['mfe_r',mfe],['mae_r',mae],['mfe_capture_pct',capture]]){
   const v=finite(r[field]);if(v!==null)to.push(v);
  }
 }
 const byMistake=[...mistakeCounts.entries()].sort((a,b)=>b[1]-a[1])
  .slice(0,10).map(([label,count])=>({label,count}));
 const breakdowns={
  entryReasons:categ('entry_reason_category'),exitReasons:categ('actual_exit_reason_category'),
  sessions:categ('session_label'),planAdherence:categ('plan_followed'),
  mistakes:byMistake,processOutcome:matrix,
  exits:{comparable:exitComparable,matches:exitMatched,
   percentMatch:pct(exitMatched,exitComparable)},
  excursion:{avgMfeR:avg(mfe),avgMaeR:avg(mae),avgMfeCapturePct:avg(capture),
   mfeCount:mfe.length,maeCount:mae.length,captureCount:capture.length}
 };
 const n=eligible.length;
 const summarizeGroup=g=>({n:g.n,winRate:pct(g.wins,g.n),totalNet:rounding(g.net,2),
  expectancyNet:g.n?rounding(g.net/g.n,2):null,avgR:avg(g.r),ratedRCount:g.r.length});
 const summary={
  recordsMatched:base.length,resolvedTrades:n,excludedNoResult:unscored,
  winCount,lossCount,flatCount,winRate:pct(winCount,n),
  totalNet:rounding(sum,2),grossProfit:rounding(grossProfit,2),grossLoss:rounding(grossLoss,2),
  profitFactor:grossLoss>0?rounding(grossProfit/grossLoss):null,
  profitFactorReason:grossLoss===0?(grossProfit>0?'no_recorded_losses':'no_losses_or_wins'):null,
  expectancyPerTrade:n?rounding(sum/n,2):null,
  averageR:avg(riskVals),rRatedTrades:riskVals.length,
  maxDrawdownCurrency:rounding(drawdown,2),drawdownPercent:null,
  processGood,processBad,processUnknown,badProcessWins:badWins,
  planFollowedRate:pct(follow,followKnown),planFollowedKnown:followKnown,
  lowSample:n<20,performanceBasis:'self_reported_member_journal',
  caveat:'Member-entered trade results are neither broker-reconciled nor licensed historical market evidence; drawdown is cumulative journal net from a zero baseline, not percentage account drawdown.'
 };
 const setup=[...groups.values()].map(g=>({setup:g.setup,...summarizeGroup(g)}))
  .sort((a,b)=>b.n-a.n||a.setup.localeCompare(b.setup)).slice(0,30);
 return {ok:true,summary,setup,equity,breakdowns,livePaper:{
  live:summarizeGroup(score.live),paper:summarizeGroup(score.paper)},
  asOf:today,filter:{type,days:String(days)},
  notices:[
   n<20?'Small sample: fewer than 20 resolved trades; results are especially unstable.':'Even larger samples may not represent future performance.',
   unscored?'Closed journal records missing valid net P&L are excluded from win rate, expectancy and drawdown.':'Only closed, resolved live/paper trades contribute.',
   'No trading recommendation. Original hypothetical, paper and real-money results must remain distinguishable.'
  ]};
};
export {finite,settled,report};
