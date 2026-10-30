/* Free Watchlist Research Review v1 — member-owned records, no extra storage,
 * market-feed calls, trades, grades or entitlement changes. Apache ECharts
 * draws existing research classifications only, NEVER prices or win rates.
 */
(function(root){
 'use strict';
 const STATES=Object.freeze(['RESEARCH','WAITING_FOR_SOURCE','NO_TRADE','ARCHIVED']);
 const SOURCES=Object.freeze(['UNVERIFIED','USER_RESEARCH','FICTIONAL']);
 const count=(names)=>Object.fromEntries(names.map(k=>[k,0]));
 function summarize(records){
  const counts=count(STATES),sources=count(SOURCES);
  let total=0,withSourceNote=0,reasonGiven=0;
  for(const r of Array.isArray(records)?records:[]){
   if(!r||typeof r!=='object'||typeof r.symbol!=='string')continue;
   total++;
   const status=String(r.status||'').toUpperCase();
   const source=String(r.sourceKind||'').toUpperCase();
   if(Object.prototype.hasOwnProperty.call(counts,status))counts[status]++;
   if(Object.prototype.hasOwnProperty.call(sources,source))sources[source]++;
   if(String(r.sourceNote||'').trim())withSourceNote++;
   if(String(r.researchNote||'').trim().length>=30)reasonGiven++;
  }
  return Object.freeze({total,counts,sources,withSourceNote,reasonGiven,
   withoutSourceNote:total-withSourceNote,
   denominator:'Only current saved Free Watchlist entries loaded for this signed-in member. Source notes and decisions are self-reported; presence does not prove reliability or skill.'});
 }
 const byId=id=>document.getElementById(id);
 const mk=(tag,label)=>{const el=document.createElement(tag);if(label!==undefined)el.textContent=String(label);return el;};
 let active=false,rows=[],chartInstance=null,seq=0;
 function showSummary(stats){
  const host=byId('free-watchlist-review-metrics');
  if(!host)return;
  host.replaceChildren();
  const statsList=[
   ['Saved candidates',stats.total+' / 20'],
   ['Research / source review',stats.counts.RESEARCH+' / '+stats.counts.WAITING_FOR_SOURCE],
   ['NO TRADE / archived',stats.counts.NO_TRADE+' / '+stats.counts.ARCHIVED],
   ['Source note recorded',stats.withSourceNote+' / '+stats.total],
   ['Research reasoning recorded',stats.reasonGiven+' / '+stats.total]
  ];
  for(const [name,value] of statsList){
   const tile=mk('div');tile.className='free-watchlist-review-stat';
   tile.append(mk('span',name),mk('strong',value));host.append(tile);
  }
  const note=byId('free-watchlist-review-denominator');
  if(note)note.textContent=stats.denominator;
 }
 async function draw(){
  const selected=++seq,chart=byId('free-watchlist-review-chart'),
   message=byId('free-watchlist-review-chart-status'),button=byId('free-watchlist-review-chart-button');
  if(!active||!chart||!button)return;
  if(!rows.length){message.textContent='Save a research candidate before charting.';return;}
  button.disabled=true;message.textContent='Preparing a chart of your saved research categories…';
  try{
   const E=await root.CrownlightECharts?.load?.();
   if(!E||!active||selected!==seq)throw Error('Chart not available in this session');
   chart.hidden=false;
   if(!chartInstance)chartInstance=E.init(chart,'dark',{renderer:'canvas'});
   const summary=summarize(rows);
   chartInstance.setOption({
    animation:false,backgroundColor:'transparent',
    grid:{left:150,right:24,top:24,bottom:35,containLabel:false},
    textStyle:{color:'#d7eaf0'},
    tooltip:{trigger:'axis',axisPointer:{type:'shadow'}},
    xAxis:{type:'value',min:0,minInterval:1,axisLabel:{color:'#d7eaf0'}},
    yAxis:{type:'category',axisLabel:{color:'#d7eaf0',fontSize:12},
      data:['Research','Wait for source','NO TRADE','Archived']},
    series:[{type:'bar',name:'Saved research entries',
      data:[summary.counts.RESEARCH,summary.counts.WAITING_FOR_SOURCE,
       summary.counts.NO_TRADE,summary.counts.ARCHIVED],
      barMaxWidth:32,itemStyle:{color:'#58bccd'},
      label:{show:true,position:'right',color:'#d7eaf0'}}]
   },true);
   chartInstance.resize();
   message.textContent='Chart of '+summary.total+' current member-entered research decisions. No market prices, performance rates, or verified signals.';
  }catch(e){
   if(active&&selected===seq)message.textContent='ECharts unavailable. The numeric research summary above remains available.';
  }finally{if(active&&selected===seq)button.disabled=rows.length===0;}
 }
 function update(data){
  if(!active)return;
  rows=(Array.isArray(data)?data:[]).slice(0,20);
  showSummary(summarize(rows));
  const btn=byId('free-watchlist-review-chart-button');
  if(btn)btn.disabled=rows.length===0;
  // A chart created before a change should never display stale counts.
  if(chartInstance){chartInstance.dispose();chartInstance=null;}
  const chart=byId('free-watchlist-review-chart');
  if(chart)chart.hidden=true;
  const status=byId('free-watchlist-review-chart-status');
  if(status)status.textContent='Chart research decisions to compare your current categories (not outcomes).';
  ++seq;
 }
 function clear(){
  ++seq;rows=[];
  if(chartInstance){chartInstance.dispose();chartInstance=null;}
  const chart=byId('free-watchlist-review-chart');if(chart)chart.hidden=true;
  showSummary(summarize([]));
  const btn=byId('free-watchlist-review-chart-button');if(btn)btn.disabled=true;
  const message=byId('free-watchlist-review-chart-status');
  if(message)message.textContent='Your private research summary is cleared on sign-out or account change.';
 }
 function mount(){
  if(active)return true;
  const btn=byId('free-watchlist-review-chart-button');
  if(!btn)return false;
  active=true;btn.disabled=true;btn.addEventListener('click',()=>void draw());
  root.addEventListener?.('resize',()=>{if(active&&chartInstance)chartInstance.resize()});
  clear();return true;
 }
 root.GroundUpFreeWatchlistReviewV1=Object.freeze({summarize,mount,update,clear});
 if(typeof module!=='undefined'&&module.exports)module.exports=root.GroundUpFreeWatchlistReviewV1;
})(typeof globalThis!=='undefined'?globalThis:window);
