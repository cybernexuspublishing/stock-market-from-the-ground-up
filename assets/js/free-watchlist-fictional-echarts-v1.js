/* Free Watchlist fictional chart teaching. No stored/user/provider price input. */
(function(root){
 'use strict';
 function bars(){
  const result=[];let previous=24.65;
  for(let i=0;i<42;i++){
   const open=previous;
   const close=+(open+0.22*Math.sin(i*0.67)+0.08*Math.cos(i*0.3)+(i>25?0.07:-0.012)).toFixed(3);
   const high=+(Math.max(open,close)+0.08+0.04*(i%3)).toFixed(3);
   const low=+(Math.min(open,close)-0.09-0.025*(i%4)).toFixed(3);
   const volume=12000+(i%7)*2800+(i>25?9500:0);
   result.push({label:'Fictional bar '+(i+1),open,close,low,high,volume});
   previous=close;
  }
  return result;
 }
 function ema(data,period){
  if(!Number.isInteger(period)||period<1)throw Error('Invalid EMA period');
  const out=Array(data.length).fill(null);
  if(data.length<period)return out;
  let avg=data.slice(0,period).reduce((s,b)=>s+b.close,0)/period;
  out[period-1]=+avg.toFixed(4);
  for(let i=period;i<data.length;i++){
   avg=(data[i].close-avg)*2/(period+1)+avg;out[i]=+avg.toFixed(4);
  }
  return out;
 }
 // Educational typical-price approximation: not an official tick-level VWAP.
 function vwap(data){
  let priceVolume=0,volume=0;
  return data.map(b=>{
   priceVolume+=(b.high+b.low+b.close)/3*b.volume;volume+=b.volume;
   return volume?+(priceVolume/volume).toFixed(4):null;
  });
 }
 const api=Object.freeze({bars,ema,vwap,fictional:true,providerData:false});
 root.CrownlightFreeWatchlistFictionalChartV1=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 function mount(){
  if(typeof document==='undefined')return;
  const button=document.getElementById('free-fictional-chart-open'),
   host=document.getElementById('free-fictional-chart'),
   note=document.getElementById('free-fictional-chart-status');
  if(!button||!host||!note)return;
  let instance=null;
  button.addEventListener('click',async()=>{
   button.disabled=true;note.textContent='Building fictional educational chart…';
   try{
    const E=await root.CrownlightECharts?.load?.();
    if(!E)throw Error('The local ECharts bundle is unavailable.');
    const data=bars(),labels=data.map((_,i)=>'Bar '+(i+1));
    host.hidden=false;
    if(!instance)instance=E.init(host,'dark',{renderer:'canvas'});
    const studies=ema(data,9),slow=ema(data,20),weighted=vwap(data);
    instance.setOption({
     animation:false,backgroundColor:'transparent',textStyle:{color:'#d9e8ef'},
     legend:{top:4,data:['Fictional candles','EMA 9','EMA 20','Illustrative VWAP proxy','Fictional volume'],textStyle:{color:'#d9e8ef'}},
     tooltip:{trigger:'axis',axisPointer:{type:'cross'}},
     axisPointer:{link:[{xAxisIndex:[0,1]}]},
     grid:[{left:60,right:24,top:65,height:'54%'},{left:60,right:24,top:'78%',height:'14%'}],
     xAxis:[{type:'category',data:labels,boundaryGap:true,axisLabel:{color:'#bcd0da'}},
      {type:'category',data:labels,boundaryGap:true,gridIndex:1,axisLabel:{color:'#bcd0da'}}],
     yAxis:[{type:'value',scale:true,name:'Fictional USD',axisLabel:{color:'#bcd0da'}},
      {type:'value',gridIndex:1,name:'Fictional volume',axisLabel:{color:'#bcd0da'}}],
     dataZoom:[{type:'inside',xAxisIndex:[0,1]},{type:'slider',xAxisIndex:[0,1],bottom:0,height:15}],
     series:[{name:'Fictional candles',type:'candlestick',data:data.map(b=>[b.open,b.close,b.low,b.high])},
      {name:'EMA 9',type:'line',data:studies,showSymbol:false,connectNulls:false},
      {name:'EMA 20',type:'line',data:slow,showSymbol:false,connectNulls:false},
      {name:'Illustrative VWAP proxy',type:'line',data:weighted,showSymbol:false},
      {name:'Fictional volume',type:'bar',xAxisIndex:1,yAxisIndex:1,data:data.map(b=>b.volume)}
     ]
    },true);
    instance.resize();note.textContent='Showing 42 fabricated bars only. EMA values use a simple-average seed; the VWAP proxy uses bar typical prices and fictional volume. No source or live quote is implied.';
   }catch(e){note.textContent=e.message||'The fictional chart could not be displayed.';}
   finally{button.disabled=false;}
  });
  root.addEventListener?.('resize',()=>instance?.resize());
  root.addEventListener?.('pagehide',()=>{instance?.dispose();instance=null;});
 }
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
 }
})(typeof window!=='undefined'?window:globalThis);
