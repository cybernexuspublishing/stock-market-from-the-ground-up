/* DT-C01-L02 author-owned fictional chart. Uses only server-revealed candles.
 * Visualization cannot fetch unpublished bars, authorize trades, or issue grades.
 */
(function(root){
 'use strict';
 const CODE='GUSIM_DT_C01_L02';
 const palette={up:'#2ac49c',down:'#ed738a',ema9:'#e9bf72',ema20:'#6caeea',ink:'#dce9f6',muted:'#9db4c9'};
 function cleanBar(raw){
  if(!raw||typeof raw!=='object')return null;
  const index=Number(raw.index),ms=Date.parse(raw.timestamp);
  const o=Number(raw.open),h=Number(raw.high),l=Number(raw.low),c=Number(raw.close),v=Number(raw.volume);
  if(!Number.isSafeInteger(index)||index<0||index>=24||!Number.isFinite(ms)||
   new Date(ms).getUTCFullYear()!==2040||![o,h,l,c,v].every(Number.isFinite)||
   o<=0||c<=0||l<=0||v<0||h<Math.max(o,c,l)||l>Math.min(o,c)||h<l)return null;
  return {index,ms,o,h,l,c,v};
 }
 function ema(bars,period){
  const result=Array(bars.length).fill(null);
  if(!Number.isInteger(period)||period<2||bars.length<period)return result;
  let avg=bars.slice(0,period).reduce((sum,b)=>sum+b.c,0)/period;
  result[period-1]=Number(avg.toFixed(5));
  const alpha=2/(period+1);
  for(let i=period;i<bars.length;i++){
   avg=bars[i].c*alpha+avg*(1-alpha);
   result[i]=Number(avg.toFixed(5));
  }
  return result;
 }
 root.CrownlightDT01L02Math=Object.freeze({cleanBar,ema});
 function init(){
  const source=document.getElementById('vr-source');
  const session=document.getElementById('vr-session');
  if(!source||!session||!root.CrownlightECharts)return;
  const basicChart=session.querySelector(':scope > figure');
  const make=(type,cls,txt)=>{
   const n=document.createElement(type);
   if(cls)n.className=cls;
   if(txt!==undefined)n.textContent=txt;
   return n;
  };
  const panel=make('section','dt-l02-panel');panel.id='dt-c01-l02-echarts';
  panel.hidden=true;panel.setAttribute('aria-label','DT-C01-L02 original fictional chart study');
  const header=make('div','dt-l02-header'),left=make('div','');
  left.append(make('div','dt-l02-kicker','DAY TRADING · CHAPTER 1 · LESSON 2'),
   make('h3','','What Day Trading Demands'),
   make('p','','Practice patience, risk awareness, observable evidence and the option not to trade. This chart shows only fictional server-revealed candles.'));
  header.append(left,make('span','dt-l02-tag','FICTIONAL · 2040 · 5 MIN'));
  panel.append(header);
  const stats=make('div','dt-l02-stats'),
   count=make('strong','','0 revealed candles'),lockNotice=make('span','','Decision not yet locked');
  stats.append(count,lockNotice);panel.append(stats);
  const controls=make('div','dt-l02-controls');
  function toggle(label){
   const wrap=make('label','dt-l02-toggle'),input=make('input','');
   input.type='checkbox';input.checked=true;
   wrap.append(input,document.createTextNode(label));controls.append(wrap);
   return input;
  }
  const nine=toggle('EMA 9'),twenty=toggle('EMA 20'),volume=toggle('Volume');
  controls.append(make('span','dt-l02-note','EMAs are initialized only from 9 or 20 completed closes; never treat them as a standalone entry signal.'));
  panel.append(controls);
  const chart=make('div','dt-l02-chart');
  chart.setAttribute('role','img');
  chart.setAttribute('aria-label','Apache ECharts candlesticks from only server-revealed fictional bars');
  panel.append(chart);
  const summary=make('p','dt-l02-summary'),message=make('p','dt-l02-notice');
  summary.setAttribute('role','status');summary.setAttribute('aria-live','polite');
  panel.append(summary,message);
  const teaching=make('div','dt-l02-teaching'),intro=make('div','');
  intro.append(make('h4','','Talia’s decision checkpoint'),
   make('p','','Before revealing another candle, distinguish observed evidence from assumptions.'));
  const prompt=make('p','dt-l02-prompt','State evidence, uncertainty and invalidation before a decision.');
  teaching.append(intro,prompt,
   make('p','dt-l02-reminder','Use the server-controlled decision controls below to lock your answer. This display cannot reveal candles, award grades or simulate confirmed fills.'));
  panel.append(teaching);
  source.insertAdjacentElement('afterend',panel);
  let dataset='',member='',bars=[],plot=null,observer=null,serial=0,locked=false;
  const time=ms=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ms));
  function dispose(){
   serial++;if(observer){observer.disconnect();observer=null}
   if(plot){plot.dispose();plot=null}
   if(basicChart)basicChart.hidden=false;
  }
  function reset(){
   dispose();dataset='';member='';bars=[];locked=false;panel.hidden=true;
   session.classList.remove('dt-l02-active');
   summary.textContent='';message.textContent='';count.textContent='0 revealed candles';
  }
  function describe(){
   count.textContent=bars.length+' revealed fictional candle'+(bars.length===1?'':'s');
   nine.disabled=bars.length<9;twenty.disabled=bars.length<20;
   nine.title=nine.disabled?'Requires 9 completed server-revealed closes':'EMA 9 based on observed bars';
   twenty.title=twenty.disabled?'Requires 20 completed server-revealed closes':'EMA 20 based on observed bars';
   lockNotice.textContent=locked?'Decision locked; replay controls can advance':'Lock your decision before advancing';
   if(!bars.length){
    summary.textContent='No completed observation revealed.';
    prompt.textContent='Observe the first candle and document uncertainty.';
    return;
   }
   const b=bars[bars.length-1],prev=bars[bars.length-2];
   summary.textContent='Latest fictional candle '+time(b.ms)+' ET · O $'+b.o.toFixed(2)+
    ' · H $'+b.h.toFixed(2)+' · L $'+b.l.toFixed(2)+' · C $'+b.c.toFixed(2)+
    ' · Volume '+b.v.toLocaleString('en-US')+
    (prev?' · Close change '+(b.c-prev.c).toFixed(2):'')+'.';
   prompt.textContent=bars.length<9?
    'There is not enough evidence to calculate EMA 9 or EMA 20. What do you know, and why could WATCH or NO TRADE be the right decision?':
    bars.length<20?
    'EMA 9 is available but EMA 20 is not yet initialized. What independent confirmation and invalidation would an entry require?':
    'Compare EMA context, candle structure and volume. What would disqualify an entry, and what execution costs or risks are invisible in OHLCV?';
  }
  function options(){
   const labels=bars.map(b=>time(b.ms));
   const series=[{name:'Fictional OHLC',type:'candlestick',data:bars.map(b=>[b.o,b.c,b.l,b.h]),
    xAxisIndex:0,yAxisIndex:0,barWidth:17,barMaxWidth:23,itemStyle:{color:palette.up,color0:palette.down,borderColor:palette.up,borderColor0:palette.down}}];
   if(nine.checked&&bars.length>=9)series.push({name:'EMA 9',type:'line',data:ema(bars,9),xAxisIndex:0,yAxisIndex:0,showSymbol:false,connectNulls:false,
    lineStyle:{color:palette.ema9,width:2},itemStyle:{color:palette.ema9}});
   if(twenty.checked&&bars.length>=20)series.push({name:'EMA 20',type:'line',data:ema(bars,20),xAxisIndex:0,yAxisIndex:0,showSymbol:false,connectNulls:false,
    lineStyle:{color:palette.ema20,width:2},itemStyle:{color:palette.ema20}});
   if(volume.checked)series.push({name:'Revealed volume',type:'bar',barWidth:21,barMaxWidth:26,xAxisIndex:1,yAxisIndex:1,
    data:bars.map(b=>({value:b.v,itemStyle:{color:b.c>=b.o?palette.up:palette.down}}))});
   const zoomAxes=volume.checked?[0,1]:[0];
   return {animation:false,backgroundColor:'transparent',
    textStyle:{color:palette.ink,fontFamily:'system-ui'},
    tooltip:{trigger:'axis',axisPointer:{type:'cross'},confine:true},
    legend:{top:5,textStyle:{color:palette.muted}},
    grid:volume.checked?
     [{left:65,right:25,top:48,height:'56%'},{left:65,right:25,top:'77%',height:'13%'}]:
     [{left:65,right:25,top:48,bottom:60},{left:65,right:25,top:'77%',height:'13%'}],
    xAxis:[
     {type:'category',gridIndex:0,data:labels,boundaryGap:true,axisLabel:{color:palette.muted,hideOverlap:true}},
     {type:'category',gridIndex:1,data:labels,boundaryGap:true,show:volume.checked,axisLabel:{color:palette.muted}}],
    yAxis:[
     {type:'value',gridIndex:0,scale:true,axisLabel:{color:palette.muted},splitLine:{lineStyle:{color:'#284356'}}},
     {type:'value',gridIndex:1,min:0,show:volume.checked,axisLabel:{color:palette.muted},splitLine:{show:false}}],
    dataZoom:[
     {type:'inside',xAxisIndex:zoomAxes,filterMode:'none'},
     {type:'slider',xAxisIndex:zoomAxes,filterMode:'none',bottom:8,height:17,
      borderColor:'#49647b',textStyle:{color:palette.muted}}],
    series};
  }
  function paint(){
   if(!plot||dataset!==CODE)return;
   if(bars.length)plot.setOption(options(),{notMerge:true,lazyUpdate:false});
   else plot.clear();
  }
  async function openChart(){
   const request=++serial;message.textContent='Loading locally hosted Apache ECharts…';
   try{
    const engine=await root.CrownlightECharts.load();
    if(request!==serial||dataset!==CODE)return;
    plot=engine.init(chart,null,{renderer:'canvas'});
    if(typeof ResizeObserver!=='undefined'){
     observer=new ResizeObserver(()=>plot?.resize());observer.observe(chart);
    }
    paint();if(basicChart)basicChart.hidden=true;
    message.textContent='ECharts displays only server-revealed fictional bars. Basic SVG view remains a fallback.';
   }catch{
    if(request===serial&&dataset===CODE)
     message.textContent='Chart unavailable. Continue with the server-controlled replay and OHLCV table.';
   }
  }
  [nine,twenty,volume].forEach(input=>input.addEventListener('change',paint));
  root.addEventListener('resize',()=>plot?.resize());
  root.addEventListener('groundup:replay-reset',reset);
  root.addEventListener('crownlight:member-changed',reset);
  root.addEventListener('groundup:replay-dataset',e=>{
   reset();const d=e.detail?.dataset;
   if(d?.code!==CODE||!e.detail?.memberId)return;
   dataset=CODE;member=String(e.detail.memberId);panel.hidden=false;
   session.classList.add('dt-l02-active');
   describe();void openChart();
  });
  root.addEventListener('groundup:replay-observation',e=>{
   if(dataset!==CODE||!member)return;
   const b=cleanBar(e.detail?.bar),last=bars[bars.length-1];
   if(!b){message.textContent='Malformed fictional OHLCV rejected.';return}
   if(last&&b.index===last.index&&b.ms===last.ms)return;
   if((!last&&b.index!==0)||(last&&(b.index!==last.index+1||b.ms<=last.ms))){
    message.textContent='Out-of-order observations rejected. Resume the authorized replay.';return;
   }
   bars.push(b);describe();paint();
  });
  root.addEventListener('groundup:replay-state',e=>{
   if(dataset!==CODE)return;
   locked=e.detail?.locked===true;describe();
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(window);
