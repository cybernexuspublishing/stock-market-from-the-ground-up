/* Additional analytics; NOT a primary trading price chart.
 * Source is strictly the already revealed OHLCV stream from Crownlight.
 */
(function(root){
 'use strict';
 const host=document.getElementById('crownlight-replay-echarts');
 if(!host)return;
 const button=host.querySelector('[data-ce-open]');
 const status=host.querySelector('[data-ce-status]');
 const chartHost=host.querySelector('[data-ce-chart]');
 const count=host.querySelector('[data-ce-count]');
 let last=[],symbol='REPLAY',instance=null,opened=false,serial=0,ro=null;
 function valid(raw){
  const result=[];let prev=0;
  for(const b of Array.isArray(raw)?raw:[]){
   const time=Number(b.timestamp),open=Number(b.open),high=Number(b.high),
    low=Number(b.low),close=Number(b.close),volume=Number(b.volume);
   if(!Number.isSafeInteger(time)||time<=prev||!Number.isFinite(open)||!Number.isFinite(high)||
      !Number.isFinite(low)||!Number.isFinite(close)||!Number.isFinite(volume)||
      open<0||close<0||volume<0||low>Math.min(open,close)||
      high<Math.max(open,close)||high<low)continue;
   result.push({time,close,volume});prev=time;
   if(result.length>2500)result.shift();
  }
  return result;
 }
 const xlabels=()=>last.map(b=>new Date(b.time).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}));
 function paint(){
  if(!instance||!opened)return;
  count.textContent=last.length+' revealed bars · '+symbol;
  if(!last.length){instance.clear();status.textContent='Reveal a replay candle to populate analytics.';return}
  const prices=last.map(x=>x.close),volume=last.map(x=>x.volume);
  const hi=Math.max(...prices),lo=Math.min(...prices);
  instance.setOption({
   animation:false,backgroundColor:'transparent',
   textStyle:{color:'#c6d7e6',fontFamily:'system-ui'},
   tooltip:{trigger:'axis',axisPointer:{type:'cross'},
    valueFormatter:value=>typeof value==='number'?value.toLocaleString(undefined,{maximumFractionDigits:4}):String(value)},
   legend:{top:3,data:['Revealed close','Observed volume'],textStyle:{color:'#bfd5e3'}},
   grid:[{left:68,right:24,top:46,height:'48%'},{left:68,right:24,top:'71%',height:'15%'}],
   xAxis:[{type:'category',gridIndex:0,data:xlabels(),boundaryGap:false,axisLabel:{color:'#b1c2d1'}},
    {type:'category',gridIndex:1,data:xlabels(),axisLabel:{color:'#b1c2d1'},boundaryGap:true}],
   yAxis:[{type:'value',gridIndex:0,min:lo===hi?undefined:lo,max:lo===hi?undefined:hi,scale:true,axisLabel:{color:'#b1c2d1'}},
    {type:'value',gridIndex:1,scale:true,axisLabel:{color:'#b1c2d1'},min:0}],
   series:[{name:'Revealed close',type:'line',data:prices,symbol:'none',smooth:false,
     lineStyle:{width:2,color:'#55cee4'},itemStyle:{color:'#55cee4'},xAxisIndex:0,yAxisIndex:0},
    {name:'Observed volume',type:'bar',data:volume,
     itemStyle:{color:'#788ddd'},xAxisIndex:1,yAxisIndex:1}],
   dataZoom:[{type:'inside',xAxisIndex:[0,1],filterMode:'none'},
    {type:'slider',xAxisIndex:[0,1],filterMode:'none',bottom:8,height:15,
     borderColor:'#38526a',textStyle:{color:'#aec6d6'}}]
  },{notMerge:true});
  status.textContent='Chart uses only '+last.length+' revealed candles; unrevealed future bars are excluded.';
 }
 root.addEventListener('crownlight:revealed-bars',event=>{
  // Do not fetch scenario arrays or provider credentials from any source.
  last=valid(event.detail?.bars);
  symbol=String(event.detail?.symbol||'REPLAY').replace(/[^a-zA-Z0-9_ .:-]/g,'').slice(0,40);
  if(opened)paint();
 });
 function resetForMember(){
  // An in-flight library load may not reopen old member data after a switch.
  serial++;
  last=[];symbol='REPLAY';opened=false;
  ro?.disconnect();ro=null;
  instance?.dispose();instance=null;
  chartHost.hidden=true;
  count.textContent='0 revealed bars · REPLAY';
  status.textContent='Account changed. Replay analytics cleared; open a new session to view new observations.';
  button.textContent='Open replay analytics';
  button.disabled=false;
 }
 root.addEventListener('crownlight:member-changed',resetForMember);
 button.addEventListener('click',async()=>{
  if(opened){serial++;opened=false;instance?.dispose();instance=null;ro?.disconnect();ro=null;chartHost.hidden=true;button.textContent='Open replay analytics';status.textContent='Visualization closed.';return}
  const request=++serial;button.disabled=true;status.textContent='Loading Apache ECharts analytics…';
  try{
   const echarts=await root.CrownlightECharts.load();
   if(request!==serial)return;
   chartHost.hidden=false;
   instance=echarts.init(chartHost,null,{renderer:'canvas'});
   opened=true;button.textContent='Close replay analytics';
   ro=new ResizeObserver(()=>instance?.resize());ro.observe(chartHost);
   paint();
  }catch(e){status.textContent=e.message;chartHost.hidden=true}
  finally{button.disabled=false}
 });
 root.CrownlightReplayAnalytics={
  getStatus:()=>({open:opened,barCount:last.length,symbol}),
  getObserved:()=>last.map(b=>({...b}))
 };
})(window);
