/* v0.14.0.114: paid private server-calculated Journal Analytics.
 * Server enforces current entitlement on every read; no raw journal notes
 * or full account history are downloaded for analytics.
 */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 let sb=null,activeUserId=null,requestCounter=0,echartsEquity=null;
 const fmt=(n,d=2)=>n==null?'—':Number(n).toLocaleString(undefined,
  {minimumFractionDigits:d,maximumFractionDigits:d});
 const money=n=>n==null?'—':Number(n).toLocaleString(undefined,
  {style:'currency',currency:'USD',maximumFractionDigits:2});
 const rate=n=>n==null?'—':fmt(n,1)+'%';
 const privateResultIds=[
  'analytics-kpis','analytics-quality','analytics-metric-methods',
  'analytics-equity-chart','analytics-equity-points','analytics-setups',
  'analytics-transfer','analytics-process','analytics-entry-reasons',
  'analytics-exit-reasons','analytics-sessions','analytics-mistakes',
  'analytics-plan-adherence','analytics-excursion'
 ];
 function erasePrivateAnalytics(reason){
  requestCounter++;activeUserId=null;echartsEquity?.dispose();echartsEquity=null;
  $('analytics-content').hidden=true;
  for(const id of privateResultIds)$(id)?.replaceChildren();
  $('analytics-gate').textContent=reason||'Sign in again to view private Journal Analytics.';
  $('analytics-status').textContent='Private analytics hidden. Verify your account session.';
 }

 function appendCell(row,name,value){
  const cell=document.createElement(name);cell.textContent=String(value);row.append(cell);
 }
 function metric(host,label,value){
  const el=document.createElement('div');el.className='journal-kpi';
  const number=document.createElement('strong'),name=document.createElement('span');
  number.textContent=String(value);name.textContent=label;el.append(number,name);host.append(el);
 }
 function tableRows(id,rows){
  const host=$(id);host.replaceChildren();
  for(const values of rows){
   const row=document.createElement('tr');
   for(let i=0;i<values.length;i++)appendCell(row,i===0?'th':'td',values[i]);
   row.firstElementChild.scope='row';host.append(row);
  }
  if(!rows.length){const row=document.createElement('tr'),cell=document.createElement('td');
   cell.colSpan=id==='analytics-equity-points'?2:5;
   cell.textContent='No eligible closed records for these filters.';row.append(cell);host.append(row);}
 }
 function renderEquity(points){
  const host=$('analytics-equity-chart');echartsEquity?.dispose();echartsEquity=null;
  host.style.height='auto';host.replaceChildren();
  if(!points.length){const p=document.createElement('p');p.textContent='No resolved trades to plot.';host.append(p);return}
  const values=points.map(p=>Number(p.value)).filter(Number.isFinite),lo=Math.min(0,...values),
    hi=Math.max(0,...values),range=Math.max(hi-lo,1);
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 800 240');svg.setAttribute('role','img');
  svg.setAttribute('aria-label','Cumulative member-entered net trading results, spanning '+money(lo)+' to '+money(hi));
  svg.style.width='100%';svg.style.height='auto';
  const make=(tag,attrs)=>{const node=document.createElementNS(ns,tag);
   for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));svg.append(node);return node};
  const x=i=>40+(points.length===1?0:i/(points.length-1)*730),
   y=v=>210-(v-lo)/range*175;
  make('line',{x1:40,y1:y(0),x2:770,y2:y(0),stroke:'currentColor','stroke-opacity':.4});
  const d=points.map((p,i)=>(i?'L':'M')+x(i).toFixed(1)+','+y(p.value).toFixed(1)).join(' ');
  make('path',{d,stroke:'#4a91bd','stroke-width':2.5,fill:'none'});
  const tip=document.createElementNS(ns,'title');
  tip.textContent='Journal net results from '+money(points[0].value)+' to '+money(points.at(-1).value);
  svg.append(tip);host.append(svg);
 }
 async function renderEChartsEquity(points,revision,userId){
  if(!Array.isArray(points)||!points.length)return;
  const adapter=window.CrownlightJournalEquityV1;
  if(!adapter)return;
  // The existing SVG is a fully functional fallback, retained until
  // verified asynchronous ECharts initialization succeeds.
  try{
   const series=adapter.prepare(points);
   const E=await window.CrownlightECharts?.load?.();
   if(!E||revision!==requestCounter||activeUserId!==userId||
     $('analytics-content')?.hidden===true)return;
   const host=$('analytics-equity-chart');
   if(!host)return;
   // Never show an old member's or filter's data after auth changes.
   const now=(await sb.auth.getSession()).data?.session;
   if(now?.user?.id!==userId||revision!==requestCounter)return;
   const fallback=host.firstChild;
   const staging=document.createElement('div');
   staging.style.cssText='width:100%;height:320px;min-height:320px';
   host.append(staging);
   const next=E.init(staging,'dark',{renderer:'canvas'});
   try{next.setOption(adapter.option(series),true);next.resize()}
   catch(err){next.dispose();staging.remove();throw err}
   if(revision!==requestCounter||activeUserId!==userId){
    next.dispose();staging.remove();return;
   }
   echartsEquity?.dispose();echartsEquity=next;
   if(fallback)fallback.remove();
   // The numeric ledger and detailed methodology remain available below.
  }catch{
   // The original static SVG and tabular data continue to work without ECharts.
  }
 }
 window.addEventListener?.('resize',()=>echartsEquity?.resize());
 function renderMethods(items){
  const host=$('analytics-metric-methods');host.replaceChildren();
  if(!Array.isArray(items)||items.length!==7||items.some(v=>
     !v||typeof v.name!=='string'||typeof v.unit!=='string'||
     typeof v.inclusion!=='string'||typeof v.costBasis!=='string'||
     !Number.isSafeInteger(v.denominatorCount)||v.denominatorCount<0||
     !Number.isSafeInteger(v.missingCount)||v.missingCount<0||
     typeof v.observationInterval!=='string'||typeof v.note!=='string'))
    throw Error('The calculation methodology could not be verified.');
  for(const item of items){
   const row=document.createElement('tr');
   const fields=[item.name+' ('+item.unit+')',item.inclusion,
     String(item.denominatorCount),String(item.missingCount),
     item.costBasis+'; '+item.note,item.observationInterval];
   fields.forEach((field,index)=>appendCell(row,index===0?'th':'td',field));
   row.firstElementChild.scope='row';host.append(row);
  }
 }
 function render(result){
  // Never show stale metrics if the server omits source/missingness contracts.
  renderMethods(result.metricDefinitions);
  const s=result.summary;
  const cards=$('analytics-kpis');cards.replaceChildren();
  const values=[
   ['Resolved trades',s.resolvedTrades],['Wins / Losses / Flat',s.winCount+' / '+s.lossCount+' / '+s.flatCount],
   ['Win rate',rate(s.winRate)],['Total recorded net',money(s.totalNet)],
   ['Avg net / resolved trade',money(s.expectancyPerTrade)],['Average recorded R',s.averageR==null?'—':fmt(s.averageR)+'R'],
   ['Gross profits',money(s.grossProfit)],['Gross losses',money(s.grossLoss)],
   ['Profit factor',s.profitFactor===null?'—':fmt(s.profitFactor)],
   ['Maximum running drawdown',money(s.maxDrawdownCurrency)]
  ];
  for(const [label,value] of values)metric(cards,label,value);
  const quality=$('analytics-quality');quality.replaceChildren();
  for(const line of [
   'Closed records selected: '+s.recordsMatched+'. Excluded from resolved calculations: '+s.excludedNoResult+'.',
   'Excluded records with future exit dates: '+(s.excludedFutureExitDates??0)+'. Invalid or before-entry exit dates: '+(s.excludedInvalidExitDates??0)+'.',
   'Average R uses '+s.rRatedTrades+' valid recorded R values; missing R is not treated as zero.',
   s.profitFactorReason?'Profit factor unavailable: '+s.profitFactorReason.replaceAll('_',' ')+'.':'Profit factor uses gross profit divided by absolute gross loss.',
   ...result.notices
  ]){const p=document.createElement('p');p.textContent=line;quality.append(p)}
  renderEquity(result.equity);
  const latest=result.equity.slice(-20);
  tableRows('analytics-equity-points',latest.map(v=>[v.date,money(v.value)]));
  tableRows('analytics-setups',result.setup.map(v=>[
   v.setup,v.n,rate(v.winRate),money(v.expectancyNet),v.avgR==null?'—':fmt(v.avgR)+'R']));
  tableRows('analytics-transfer',['live','paper'].map(type=>{
   const a=result.livePaper[type];return[type==='live'?'Live':'Paper / Simulator',
    a.n,rate(a.winRate),money(a.expectancyNet),a.avgR==null?'—':fmt(a.avgR)+'R'];
  }));
  const process=$('analytics-process');process.replaceChildren();
  for(const [name,val] of [
   ['Good process — self-rated',s.processGood],
   ['Bad process — self-rated',s.processBad],
   ['Process ungraded',s.processUnknown],
   ['Bad process / winning result',s.badProcessWins],
   ['Plan adherence — recorded only',rate(s.planFollowedRate)],
   ['Plan adherence documented',s.planFollowedKnown]
  ])metric(process,name,val);
  const b=result.breakdowns||{};
  const lists=[['analytics-entry-reasons',b.entryReasons],['analytics-exit-reasons',b.exitReasons],
   ['analytics-sessions',b.sessions],['analytics-mistakes',b.mistakes],
   ['analytics-plan-adherence',b.planAdherence]];
  for(const [name,items] of lists){
   const host=$(name);host.replaceChildren();
   for(const item of items||[]){
    const li=document.createElement('li'),label=document.createElement('span'),count=document.createElement('strong');
    label.textContent=item.label;count.textContent=String(item.count);li.append(label,count);host.append(li);
   }
   if(!host.children.length){const li=document.createElement('li');li.textContent='No recorded values.';host.append(li)}
  }
  const ext=b.exits||{},ex=b.excursion||{},exc=$('analytics-excursion');exc.replaceChildren();
  for(const [label,value] of [
   ['Comparable planned vs actual exits',ext.comparable??0],
   ['Exact exit category match',rate(ext.percentMatch)],
   ['Avg recorded MFE',ex.avgMfeR==null?'—':fmt(ex.avgMfeR)+'R'],
   ['Avg recorded MAE',ex.avgMaeR==null?'—':fmt(ex.avgMaeR)+'R'],
   ['Avg recorded MFE captured',rate(ex.avgMfeCapturePct)],
   ['MFE / MAE sample count',(ex.mfeCount??0)+' / '+(ex.maeCount??0)]
  ])metric(exc,label,value);
  $('analytics-status').textContent='Private analytics calculated from your recorded closed trades. '+
   (s.lowSample?'Small sample — interpret cautiously.':'Larger sample — still not a forecast.');
 }
 async function load(){
  const seq=++requestCounter,status=$('analytics-status');
  status.textContent='Checking membership and calculating private journal results…';
  try{
   if(!sb)sb=await window.getSupabaseClient();
   const session=(await sb.auth.getSession()).data?.session;
   const userId=session?.user?.id;
   if(!session?.access_token||!userId)throw Error('Sign in to view journal analytics.');
   if(activeUserId!==null&&activeUserId!==userId){$('analytics-content').hidden=true}
   activeUserId=userId;
   const type=$('analytics-type').value,days=$('analytics-window').value;
   const res=await fetch('/api/journal-analytics-v014114?type='+encodeURIComponent(type)+
    '&days='+encodeURIComponent(days),{cache:'no-store',headers:{authorization:'Bearer '+session.access_token}});
   const data=await res.json().catch(()=>null);
   if(seq!==requestCounter)return;
   const verify=(await sb.auth.getSession()).data?.session;
   if(!verify?.user?.id||verify.user.id!==userId){$('analytics-content').hidden=true;
    throw Error('The account session changed; analytics are hidden.')}
   if(!res.ok||data?.ok!==true)throw Error(data?.error||'Private analytics unavailable.');
   $('analytics-gate').textContent='';$('analytics-content').hidden=false;render(data);
   void renderEChartsEquity(data.equity,seq,userId);
  }catch(e){if(seq!==requestCounter)return;$('analytics-content').hidden=true;
   $('analytics-gate').textContent=e?.message||'Private analytics unavailable.';}
 }
 document.addEventListener('DOMContentLoaded',()=>{
  $('analytics-type').addEventListener('change',()=>void load());
  $('analytics-window').addEventListener('change',()=>void load());
  // Auth may change in another tab while this page still displays computed
  // private member results. Scrub the DOM immediately, not only after another
  // network request happens to finish. Request epochs invalidate in-flight IO.
  void (async()=>{
   try{
    sb=await window.getSupabaseClient();
    if(!sb?.auth?.onAuthStateChange)throw Error('Auth listener unavailable');
    sb.auth.onAuthStateChange((event,session)=>{
     const nextId=session?.user?.id||null;
     if(event==='SIGNED_OUT'||(activeUserId&&nextId!==activeUserId)){
      erasePrivateAnalytics('Your account session changed. Private analytics were cleared.');
      if(nextId)queueMicrotask(()=>void load());
      return;
     }
     if(event==='SIGNED_IN'&&nextId&&!activeUserId)queueMicrotask(()=>void load());
    });
    await load();
   }catch{
    erasePrivateAnalytics('Current account session cannot be verified. Reload after signing in.');
   }
  })();
 });
})();