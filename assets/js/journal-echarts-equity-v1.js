/* Crownlight Journal ECharts Equity v1. First-party visualization adapter.
 * Input is the EXISTING server-calculated member-specific cumulative net P&L
 * series; no additional broker data, calculations of trade fills or access.
 * Drawdown is shown below zero as the deficit from the prior cumulative peak.
 */
(function(root){
 'use strict';
 const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
  Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
 function prepare(points){
  if(!Array.isArray(points)||points.length>3000)throw Error('Invalid Journal equity series length.');
  let peak=0,maximumDrawdown=0;
  const dates=[],cumulative=[],drawdown=[];
  for(const row of points){
   const value=row?.value;
   if(!validDate(row?.date)||typeof value!=='number'||!Number.isFinite(value))
    throw Error('Invalid dated Journal cumulative result.');
   dates.push(row.date);
   cumulative.push(value);
   peak=Math.max(peak,value);
   const deficit=Math.max(0,peak-value);
   drawdown.push(-Number(deficit.toFixed(2)));
   maximumDrawdown=Math.max(maximumDrawdown,deficit);
  }
  return {dates,cumulative,drawdown,maximumDrawdown:Number(maximumDrawdown.toFixed(2)),
   denominator:points.length};
 }
 function option(series){
  const usd=n=>Number(n).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2});
  return {
   animation:false,backgroundColor:'transparent',
   textStyle:{color:'#dce9f2'},
   legend:{top:0,textStyle:{color:'#e0e9f0'},data:['Cumulative recorded net','Drawdown from prior peak (negative)']},
   grid:{left:72,right:28,top:48,bottom:72,containLabel:true},
   tooltip:{trigger:'axis',axisPointer:{type:'cross'},valueFormatter:usd},
   xAxis:{type:'category',boundaryGap:false,name:'Recorded close date',nameLocation:'middle',nameGap:43,
    data:series.dates,axisLabel:{color:'#bacddd',hideOverlap:true}},
   yAxis:{type:'value',name:'USD',nameGap:12,axisLabel:{color:'#bacddd',formatter:v=>usd(v)}},
   dataZoom:[{type:'inside',start:series.denominator>80?75:0,end:100},
    {type:'slider',height:17,bottom:20,start:series.denominator>80?75:0,end:100,
     textStyle:{color:'#dce9f2'}}],
   series:[
    {name:'Cumulative recorded net',type:'line',showSymbol:series.denominator<=50,
     symbolSize:6,sampling:'none',data:series.cumulative,
     itemStyle:{color:'#5cb9b7'},lineStyle:{width:2.5}},
    {name:'Drawdown from prior peak (negative)',type:'line',showSymbol:false,
     sampling:'none',data:series.drawdown,
     itemStyle:{color:'#d7a56d'},lineStyle:{width:2},
     areaStyle:{opacity:0.07}}
   ]
  };
 }
 const api=Object.freeze({prepare,option});
 root.CrownlightJournalEquityV1=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
