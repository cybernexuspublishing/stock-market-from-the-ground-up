/* Fictional ECharts candle/VWAP classroom: no API, member profile or data upload. */
(function(root){'use strict';
const bars=Object.freeze([
 {time:'09:30',o:5.00,h:5.12,l:4.92,c:5.08,v:2000},
 {time:'09:35',o:5.08,h:5.20,l:5.01,c:5.15,v:3200},
 {time:'09:40',o:5.15,h:5.18,l:4.98,c:5.00,v:1800},
 {time:'09:45',o:5.00,h:5.06,l:4.84,c:4.92,v:2400},
 {time:'09:50',o:4.92,h:5.04,l:4.88,c:5.02,v:3500},
 {time:'09:55',o:5.02,h:5.28,l:5.00,c:5.24,v:5400},
 {time:'10:00',o:5.24,h:5.30,l:5.14,c:5.19,v:2600},
 {time:'10:05',o:5.19,h:5.22,l:5.03,c:5.07,v:1900}
]);
function evaluate(visible){
 let numerator=0,denominator=0;
 return bars.slice(0,visible).map(b=>{
  const typical=(b.h+b.l+b.c)/3;
  numerator+=typical*b.v;denominator+=b.v;
  return {...b,typical,vwap:numerator/denominator};
 });
}
function N(tag,text,cls){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x}
function mount(){
 const host=document.getElementById('kd-workshop');if(!host)return;
 host.classList.add('kd-workshop');
 host.append(N('p','FREE INTERACTIVE CHART STUDY · FICTIONAL DATA','kd-eyebrow'),
  N('h2','Reveal the candles. Calculate the evidence.'),
  N('p','A guided original eight-bar OHLCV dataset illustrates price structure, session volume and approximate VWAP. The next bar stays hidden until you reveal it. This is a deliberately fictional example, not a historical stock, live quote or verified market prediction.'));
 const grid=N('div',undefined,'kd-workshop-grid');
 const left=N('div'),right=N('div');
 const visual=N('div',undefined,'kd-workshop-chart');
 visual.setAttribute('role','img');visual.setAttribute('aria-label','Fictional revealed candlestick chart with volume-weighted typical-price approximation');
 const caption=N('p','Approximate VWAP = cumulative Σ[(high + low + close) ÷ 3 × volume] ÷ cumulative volume. This OHLCV bar approximation differs from exact execution-price VWAP.','kd-workshop-output');
 const controls=N('div',undefined,'kd-workshop-controls');
 const next=N('button','Reveal next completed candle','btn');next.type='button';
 const reset=N('button','Reset to first candle','btn secondary');reset.type='button';
 controls.append(next,reset);
 const status=N('p','', 'kd-workshop-output');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 left.append(visual,caption,controls,status);
 right.append(N('h3','Visible data and worked calculation'));
 const table=N('table',undefined,'kd-workshop-table');
 const thead=N('thead'),tr=N('tr');
 for(const label of ['Time','Close','Volume','VWAP*'])tr.append(N('th',label));
 thead.append(tr);table.append(thead);
 const tbody=N('tbody');table.append(tbody);
 const notice=N('p','*VWAP uses typical price per completed bar, rather than individual transaction prices. The chart has no implied trade signal.','kd-workshop-output');
 right.append(table,notice);
 grid.append(left,right);host.append(grid);
 let count=1,chart=null,renderNumber=0;
 function renderTable(rows){
  tbody.replaceChildren();
  for(const b of rows){
   const r=N('tr');
   for(const value of [b.time,'$'+b.c.toFixed(2),b.v.toLocaleString(),'$'+b.vwap.toFixed(4)])r.append(N('td',value));
   tbody.append(r);
  }
  const last=rows.at(-1);
  status.textContent='Completed candles revealed: '+count+' of '+bars.length+
   '. Current approximate VWAP: $'+last.vwap.toFixed(4)+
   '. Current candle body: $'+Math.abs(last.c-last.o).toFixed(2)+
   '; range: $'+(last.h-last.l).toFixed(2)+'.';
  next.disabled=count>=bars.length;
 }
 async function draw(){
  const token=++renderNumber,rows=evaluate(count);renderTable(rows);
  try{
   const lib=await root.CrownlightECharts?.load?.();
   if(!lib||token!==renderNumber)return;
   if(!chart)chart=lib.init(visual,'dark',{renderer:'canvas'});
   const times=rows.map(x=>x.time);
   const opts={animation:false,backgroundColor:'transparent',
    textStyle:{color:'#dcebf4',fontSize:11},
    legend:{top:5,data:['Fictional OHLC','Approximate VWAP','Share volume'],textStyle:{color:'#c5d8e4'}},
    tooltip:{trigger:'axis',axisPointer:{type:'cross'}},
    grid:[{left:53,right:16,top:43,height:'52%'},{left:53,right:16,top:'79%',height:'12%'}],
    xAxis:[{type:'category',gridIndex:0,data:times,axisLabel:{color:'#a9c7d8'}},
     {type:'category',gridIndex:1,data:times,axisLabel:{show:false}}],
    yAxis:[{type:'value',gridIndex:0,scale:true,axisLabel:{color:'#accbd9'}},
     {type:'value',gridIndex:1,min:0,axisLabel:{color:'#accbd9'}}],
    series:[{name:'Fictional OHLC',type:'candlestick',
      itemStyle:{color:'#3cc399',color0:'#e68181',borderColor:'#3cc399',borderColor0:'#e68181'},
      data:rows.map(x=>[x.o,x.c,x.l,x.h])},
     {name:'Approximate VWAP',type:'line',symbol:'circle',symbolSize:5,
      data:rows.map(x=>Number(x.vwap.toFixed(5))),lineStyle:{color:'#e0b77b',width:2},itemStyle:{color:'#e0b77b'}},
     {name:'Share volume',type:'bar',data:rows.map(x=>x.v),xAxisIndex:1,yAxisIndex:1,
      itemStyle:{color:'#6c99ca'}}]};
   chart.setOption(opts,true);chart.resize();
  }catch(e){status.textContent+=' Visual chart unavailable; the accessible calculations and reveal controls remain usable.'}
 }
 next.addEventListener('click',()=>{count=Math.min(count+1,bars.length);void draw()});
 reset.addEventListener('click',()=>{count=1;void draw()});
 root.addEventListener?.('resize',()=>chart?.resize());
 void draw();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
root.GroundUpKnowledgeWorkshopV1=Object.freeze({bars,evaluate,version:'1.0'});
})(typeof window==='undefined'?globalThis:window);
