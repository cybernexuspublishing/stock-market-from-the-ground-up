/* v0.14.0.114 — privacy-contained deterministic journal analytics.
 * Source is MEMBER-ENTERED journal work, never authenticated brokerage fills.
 * No trading recommendation, predictions, source dataset promotion, or scoring.
 */
const finite=v=>{
 // Empty or malformed member-entered observations are missing, never $0.
 // A database numeric value may be a number or canonical numeric string;
 // booleans/arrays/objects and whitespace cannot silently count as flats.
 if(v===null||v===undefined)return null;
 if(typeof v!=='number'&&typeof v!=='string')return null;
 if(typeof v==='string'&&(!v.trim()||!/^[-+]?(?:[0-9]+[.]?[0-9]*|[.][0-9]+)(?:[eE][-+]?[0-9]+)?$/.test(v.trim())))return null;
 const n=typeof v==='number'?v:Number(v);
 return Number.isFinite(n)?n:null;
};
const rounding=(n,d=4)=>n===null?null:Number(n.toFixed(d));
const pct=(n,d)=>d?rounding(n/d*100,2):null;
const avg=xs=>xs.length?rounding(xs.reduce((a,b)=>a+b,0)/xs.length):null;
const validDate=s=>{
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const date=new Date(s+'T12:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===s;
};
const settled=r=>r&&r.status==='closed'&&['live','paper'].includes(r.journal_type)&&
 !['NO TRADE','OBSERVATION ONLY'].includes(r.decision)&&finite(r.net_pnl)!==null;
// A closed journal row may be entered with an impossible, earlier-than-entry
// or future exit date. Its entered P&L is NOT available as-of this report.
// A missing exit date remains legacy self-reported data and is disclosed;
// do not silently delete old member records or invent a close timestamp.
const exitKnownAsOf=(r,today)=>{
 if(r.exit_date===null||r.exit_date===undefined||r.exit_date==='')return true;
 return validDate(r.exit_date)&&r.exit_date>=r.trade_date&&r.exit_date<=today;
};
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
 const excludedInvalidExitDates=base.filter(r=>
   r.exit_date!==null&&r.exit_date!==undefined&&r.exit_date!==''&&
   (!validDate(r.exit_date)||r.exit_date<r.trade_date)).length;
 const excludedFutureExitDates=base.filter(r=>
   validDate(r.exit_date)&&r.exit_date>today).length;
 const eligible=base.filter(r=>settled(r)&&exitKnownAsOf(r,today))
  .sort((a,b)=>orderKey(a).localeCompare(orderKey(b)));
 const unscored=base.length-eligible.length;
 let sum=0,peak=0,drawdown=0,winCount=0,lossCount=0,flatCount=0,grossProfit=0,grossLoss=0;
 let riskVals=[],processGood=0,processBad=0,processUnknown=0,follow=0,followKnown=0,badWins=0;
 const equity=[];
 const groups=new Map();
 const score={live:{n:0,wins:0,net:0,r:[]},paper:{n:0,wins:0,net:0,r:[]}};
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
  const a=score[r.journal_type];a.n++;if(positive)a.wins++;a.net+=net;if(rv!==null)a.r.push(rv);
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
  excludedInvalidExitDates,excludedFutureExitDates,
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
 // The research (8) journal audit requires every performance metric to expose
 // population, missingness, units, cost basis and observation interval. These
 // are metadata only; do not return individual journal records to the client.
 const observedWindow=String(days)==='all'?'all recorded dates':String(days)+' calendar days through '+today;
 const baseRule='Closed member-entered live/paper records with valid trade dates in the selected window';
 const resolvedRule=baseRule+' and valid self-reported net P&L with no invalid, before-entry, or post-as-of exit date; NO TRADE and OBSERVATION ONLY are excluded';
 const missingNet=base.length-n;
 const metricDefinitions=[
  {key:'winRate',name:'Win rate',unit:'percent',inclusion:resolvedRule,
   denominatorCount:n,missingCount:missingNet,costBasis:'Self-reported net P&L; individual transaction fees are not independently reconciled',
   observationInterval:observedWindow,note:'Flat $0 outcomes remain in the denominator. Unknown outcomes do not become losses or flats.'},
  {key:'expectancyPerTrade',name:'Mean net per resolved trade',unit:'USD per record',inclusion:resolvedRule,
   denominatorCount:n,missingCount:missingNet,costBasis:'Member-entered net P&L after any costs the member included; missing costs are not presumed zero',
   observationInterval:observedWindow,note:'Arithmetic historical average of the selected records, not a forecast.'},
  {key:'profitFactor',name:'Gross-positive / absolute-negative net ratio',unit:'ratio',inclusion:resolvedRule,
   denominatorCount:n,missingCount:missingNet,costBasis:'Ratio of positive entered net P&L to absolute negative entered net P&L; no separate cost audit',
   observationInterval:observedWindow,note:'Undefined when no recorded negative net P&L; not a verified investment return.'},
  {key:'averageR',name:'Average recorded R',unit:'R',inclusion:resolvedRule+' where an R value was separately recorded',
   denominatorCount:riskVals.length,missingCount:n-riskVals.length+missingNet,
   costBasis:'Self-reported R-multiples; initial modeled risk and expenses are not independently validated',
   observationInterval:observedWindow,note:'Missing initial risk/R is unavailable, not automatically zero.'},
  {key:'maxDrawdownCurrency',name:'Maximum cumulative-net drawdown',unit:'USD',
   inclusion:resolvedRule+' in chronological closing order from a zero baseline',
   denominatorCount:n,missingCount:missingNet,costBasis:'Running sum of recorded net P&L, not brokerage account equity',
   observationInterval:observedWindow,note:'Not account-equity percentage drawdown; deposits, withdrawals and open positions are not represented.'},
  {key:'mfe_r',name:'Average reported MFE',unit:'R',inclusion:resolvedRule+' with an MFE value',
   denominatorCount:mfe.length,missingCount:n-mfe.length+missingNet,costBasis:'Member-supplied excursion measure; intratrade market data and fill history are not verified',
   observationInterval:observedWindow,note:'A closing result cannot establish maximum favorable excursion.'},
  {key:'mae_r',name:'Average reported MAE',unit:'R',inclusion:resolvedRule+' with an MAE value',
   denominatorCount:mae.length,missingCount:n-mae.length+missingNet,costBasis:'Member-supplied excursion measure; intratrade market data and fill history are not verified',
   observationInterval:observedWindow,note:'A closing result cannot establish maximum adverse excursion.'}
 ]; 
 const setup=[...groups.values()].map(g=>({setup:g.setup,...summarizeGroup(g)}))
  .sort((a,b)=>b.n-a.n||a.setup.localeCompare(b.setup)).slice(0,30);
 return {ok:true,summary,metricDefinitions,setup,equity,breakdowns,livePaper:{
  live:summarizeGroup(score.live),paper:summarizeGroup(score.paper)},
  asOf:today,filter:{type,days:String(days)},
  notices:[
   n<20?'Small sample: fewer than 20 resolved trades; results are especially unstable.':'Even larger samples may not represent future performance.',
   unscored?'Records without a valid resolved outcome, including invalid or future-dated exits, are excluded from win rate, expectancy and drawdown.':'Only closed, resolved live/paper trades contribute.',
   excludedFutureExitDates?excludedFutureExitDates+' record(s) contain a future exit date and cannot contribute to an as-of analysis.':'No future-exit records in this selection.',
   excludedInvalidExitDates?excludedInvalidExitDates+' record(s) have an impossible or before-entry exit date and were excluded.':'No invalid-exit dates in this selection.',
   'No trading recommendation. Original hypothetical, paper and real-money results must remain distinguishable.'
  ]};
};
export {finite,settled,report};
