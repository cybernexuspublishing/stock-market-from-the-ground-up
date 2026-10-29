/* Apache ECharts Studio view. Optional foundational OHLCV analytics; not
 * brokerage execution, and never loads unrevealed or secret market data.
 * The calling Studio tier controller authenticates and sanitizes all bars.
 */
(function(root){'use strict';
 let view=null,chart=null,resize=null,serial=0,last=[],symbol='REPLAY',period='1-minute';
 const NUM=(v)=>typeof v==='number'&&Number.isFinite(v);
 function clean(input){
  const out=[];let prev=-Infinity;
  for(const b of Array.isArray(input)?input:[]){
   const t=Number(b.timestamp),o=Number(b.open),h=Number(b.high),l=Number(b.low),c=Number(b.close),v=Number(b.volume);
   if(!Number.isSafeInteger(t)||t<=prev||![o,h,l,c,v].every(NUM)||
      o<0||c<0||v<0||l>Math.min(o,c)||h<Math.max(o,c)||h<l)continue;
   out.push({t,o,h,l,c,v});prev=t;
   if(out.length>2500)out.shift();
  }
  return out;
 }
 function render(){
  if(!view||!chart)return;
  const labels=last.map(b=>new Date(b.t).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}));
  const summary=view.querySelector('[data-cl-echarts-summary]');
  summary.textContent=last.length
   ?symbol+' · '+period+' · '+last.length+' revealed candles · Last close '+last.at(-1).c.toFixed(4)
   :'No revealed candles. Load fictional or authorized replay history.';
  chart.setOption({
   animation:false,backgroundColor:'transparent',textStyle:{color:'#cfe2f0'},
   legend:{top:4,data:['Revealed OHLC','Observed volume'],textStyle:{color:'#c6dfef'}},
   tooltip:{trigger:'axis',axisPointer:{type:'cross'}},
   grid:[{left:65,right:35,top:44,height:'55%'},{left:65,right:35,top:'78%',height:'11%'}],
   xAxis:[
    {type:'category',data:labels,gridIndex:0,boundaryGap:true,axisLabel:{color:'#bbd3e0',hideOverlap:true}},
    {type:'category',data:labels,gridIndex:1,boundaryGap:true,axisLabel:{color:'#bbd3e0',hideOverlap:true}}
   ],
   yAxis:[
    {type:'value',gridIndex:0,scale:true,axisLabel:{color:'#bbd3e0'}},
    {type:'value',gridIndex:1,min:0,scale:true,axisLabel:{color:'#bbd3e0'}}
   ],
   series:[
    {name:'Revealed OHLC',type:'candlestick',data:last.map(b=>[b.o,b.c,b.l,b.h]),
     itemStyle:{color:'#36d5ae',color0:'#ff648b',borderColor:'#36d5ae',borderColor0:'#ff648b'},xAxisIndex:0,yAxisIndex:0},
    {name:'Observed volume',type:'bar',data:last.map(b=>b.v),itemStyle:{color:'#74abd5'},xAxisIndex:1,yAxisIndex:1}
   ],
   dataZoom:[
    {type:'inside',xAxisIndex:[0,1],filterMode:'none'},
    {type:'slider',xAxisIndex:[0,1],filterMode:'none',bottom:7,height:17,
     borderColor:'#415b77',textStyle:{color:'#a6c4d7'}}
   ]
  },{notMerge:true});
 }
 function update(bars,name,timeframe){
  last=clean(bars);symbol=String(name||'REPLAY').replace(/[^a-zA-Z0-9_. :-]/g,'').slice(0,40);
  period=String(timeframe||'1-minute').slice(0,45);
  render();
 }
 function unmount(){
  serial++;resize?.disconnect();resize=null;
  chart?.dispose();chart=null;
  view?.remove();view=null;
  last=[];symbol='REPLAY';period='1-minute';
 }
 async function mount(parent,bars,name,timeframe){
  if(!parent)throw Error('Studio chart container unavailable');
  unmount();
  const request=serial;
  const frame=document.createElement('section');frame.className='cl-tier-echarts-frame';
  frame.setAttribute('aria-label','Apache ECharts candlesticks and volume analytics');
  const h=document.createElement('h3');h.textContent='Apache ECharts · Revealed OHLCV';
  const p=document.createElement('p');p.textContent='Interactive candlesticks, volume, crosshair and zoom. Educational only.';
  const evidence=document.createElement('p');evidence.dataset.clEchartsSummary='';
  const graph=document.createElement('div');graph.className='cl-tier-echarts-canvas';
  graph.dataset.clEchartsChart='';
  graph.setAttribute('role','img');graph.setAttribute('aria-label','Revealed OHLCV candlestick and volume chart');
  frame.append(h,p,evidence,graph);parent.append(frame);view=frame;
  update(bars,name,timeframe);
  try{
   const e=await root.CrownlightECharts.load();
   if(serial!==request||!view?.isConnected)return false;
   chart=e.init(graph,null,{renderer:'canvas'});
   resize=new ResizeObserver(()=>chart?.resize());resize.observe(graph);
   render();return true;
  }catch(e){if(serial===request)unmount();throw e}
 }
 root.addEventListener('crownlight:member-changed',unmount);
 root.CrownlightEChartsStudio={
  mount,unmount,update,
  getStatus:()=>({ready:!!chart,barCount:last.length,symbol}),
  getObserved:()=>last.map(b=>({timestamp:b.t,open:b.o,high:b.h,low:b.l,close:b.c,volume:b.v}))
 };
})(window);
