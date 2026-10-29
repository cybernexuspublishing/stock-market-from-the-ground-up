/* First-party snapshot intelligence: only saved, current member-owned watchlist.
 * No brokerage activity, P&L, time-spent inference or unverified market data.
 */
(function(root){
 'use strict';
 const STATES=['DISCOVERY','WATCH','READY','INVALID','NO TRADE'];
 function summarize(records){
  const rows=(Array.isArray(records)?records:[]).filter(x=>x&&x.record_type==='watchlist');
  const counts=Object.fromEntries(STATES.map(k=>[k,0]));
  let gates=0,checked=0,sourceMissing=0,asOfMissing=0;
  for(const row of rows){
   const status=String(row.payload?.status||'WATCH').toUpperCase();
   if(Object.hasOwn(counts,status))counts[status]++;
   const g=row.payload?.researchGates;
   if(g&&typeof g==='object'){
    gates++;if(['source','structure','liquidity','invalidation'].every(k=>g[k]===true))checked++;
   }
   if(!String(row.payload?.sourceNote||'').trim())sourceMissing++;
   if(!String(row.payload?.asOf||'').trim())asOfMissing++;
  }
  return {total:rows.length,counts,gates,checked,sourceMissing,asOfMissing,
   denominator:'Latest current member research records returned by this private workspace (not all historical candidates).'};
 }
 function mount({host,recs,alive=()=>true}){
  if(!host)return;
  const stats=summarize(recs),mk=(t,txt,cls)=>{
   const n=document.createElement(t);if(txt!==undefined)n.textContent=String(txt);if(cls)n.className=cls;return n};
  const section=mk('section',undefined,'v11-workbench-panel tp-intelligence');
  section.setAttribute('aria-label','Watchlist research intelligence report');
  section.append(mk('h2','Watchlist Intelligence · current saved research'),
   mk('p','This report counts your existing saved candidates only. It does not assume any trade, validated strategy, live quote or historical state transition.'));
  const cards=mk('div',undefined,'tp-stats');
  for(const [name,value] of [['Candidates',stats.total],['Marked READY',stats.counts.READY],
    ['Rejected / no trade',stats.counts.INVALID+stats.counts['NO TRADE']],
    ['Completed evidence gates',stats.checked+' / '+stats.gates],
    ['Missing source note',stats.sourceMissing],['Missing observation time',stats.asOfMissing]]){
   const card=mk('div',undefined,'tp-stat');card.append(mk('span',name),mk('strong',value));cards.append(card);
  }
  section.append(cards);
  const description=mk('p',stats.denominator,'small');section.append(description);
  const button=mk('button','Chart saved research decisions','btn secondary');button.type='button';
  const graph=mk('div',undefined,'tp-chart');graph.hidden=true;
  graph.setAttribute('role','img');graph.setAttribute('aria-label','Counts of current candidate states from member-entered watchlist records');
  const notice=mk('p','', 'small');notice.setAttribute('role','status');
  section.append(button,graph,notice);
  let instance=null;
  button.addEventListener('click',async()=>{
   try{
    const E=await root.CrownlightECharts?.load?.();
    if(!E||!alive())throw Error('Chart unavailable in this session');
    graph.hidden=false;
    if(!instance)instance=E.init(graph,'dark',{renderer:'canvas'});
    instance.setOption({animation:false,backgroundColor:'transparent',
     grid:{left:112,right:20,top:15,bottom:36},
     textStyle:{color:'#d5e8ef'},
     tooltip:{trigger:'axis',axisPointer:{type:'shadow'}},
     xAxis:{type:'value',min:0,axisLabel:{color:'#bed3e0',precision:0}},
     yAxis:{type:'category',axisLabel:{color:'#bed3e0'},
      data:['Discovery','Watch','Ready','Invalid','No trade']},
     series:[{name:'Saved member decisions',type:'bar',
      data:STATES.map(x=>stats.counts[x]),barMaxWidth:25,itemStyle:{color:'#58bccd'}}]});
    instance.resize();notice.textContent='Chart uses only '+stats.total+' saved research candidates; no outcome or probability is calculated.';
   }catch(e){notice.textContent='Visualization unavailable. Numeric counts remain available.'}
  });
  host.append(section);
  return Object.freeze(stats);
 }
 root.GroundUpWatchlistIntelligenceV1=Object.freeze({summarize,mount,version:'1.0'});
})(window);
