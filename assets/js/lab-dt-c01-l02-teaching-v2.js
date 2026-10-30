/* DT-C01-L02: teaching before private replay in the canonical nine-stage Lab.
 * Worked ECharts bars below are a distinct authored ILLUSTRATION, not GUSIM
 * history or the hidden server-owned GUSIM_DT_C01_L02 dataset.
 */
(function(root){
 'use strict';
 const ID='DT-C01-L02',CODE='GUSIM_DT_C01_L02';
 const stages={
  0:{objectives:[
   'Explain why intraday trading requires a preparation routine, a defined risk limit and the willingness to do nothing.',
   'Read completed candles and volume as evidence, not guaranteed forecasts.',
   'State when to ENTER, WATCH or choose NO TRADE without using unrevealed prices.'
  ],blocks:[
   'I am Talia. We will learn what day trading demands before you make a market decision.',
   'First I will demonstrate a fictional candle and explain what it can and cannot tell you. Then you will change the demonstration and describe what you notice.',
   'Next you will write a prediction using only the evidence available at the pause, practice a decision and review your reasoning.',
   'Only after the guided lesson should you open the separate, server-controlled GUSIM_DT_C01_L02 fictional replay. You do not need to place an order or win a trade to learn.'
  ]},
  1:{blocks:[
   'Day trading means opening and closing a trading position within the same trading day. The defining skill here is a repeatable decision process, not rapid clicking.',
   'Before considering an entry, identify the instrument, session time, current completed candle, relevant level, trading participation and what you still cannot know.',
   'For one candle, Open is its first price, High its highest, Low its lowest and Close its final price in the interval. The real body spans Open to Close; the wicks show the extremes.',
   'Green indicates Close at or above Open in this illustration. Red indicates Close below Open. Neither color guarantees the next price direction.',
   'Volume measures the number of shares represented by the candle. Compare participation with available context; one elevated bar does not establish a safe trade.',
   'A plan must have a reason to act, a measurable invalidation condition and an acceptable potential loss. You can choose WATCH or NO TRADE if evidence is incomplete.',
   'EMA 9 and EMA 20 are lagging averages calculated from completed closes. They need at least 9 and 20 observations respectively for the defined seed. We will not manufacture missing early EMA values.'
  ],worked:[
   'Step 1: In the separate fictional demonstration, inspect the candle with Open $22.00, High $22.18, Low $21.90 and Close $22.12.',
   'Step 2: The candle closes $0.12 above its open. Its range is $22.18 − $21.90 = $0.28. A rising close alone is not a trade trigger.',
   'Step 3: Inspect the next completed candle and its volume; compare observable evidence without inventing what another candle will do.',
   'Step 4: Write down what would invalidate your interpretation and whether waiting is more defensible than entering.'
  ]},
  2:{blocks:[
   'Experiment with the illustration: adjust the last completed candle close and volume while keeping the open, high and low coherent.',
   'Observe which parts of the candlestick and its volume change. A different close can change its color, but cannot by itself prove future direction.',
   'Name one piece of missing evidence and explain why it might change an ENTER decision into WATCH or NO TRADE.'
  ]},
  4:{blocks:[
   'Practice the complete sequence: establish the information cutoff, describe what is visible, identify uncertainty, set invalidation and record ENTER, WATCH or NO TRADE.',
   'The protected fictional replay is a separate exercise. It reveals new observations only after the replay decision is locked by the server.',
   'No real broker fill, historical performance, market-data certification, skill grade or guaranteed outcome is represented.'
  ]},
  6:{blocks:[
   'Compare your original reasoning with only the candles visible at your decision time. Do not rewrite the original thesis after seeing additional information.',
   'A valid NO TRADE can be a successful process choice. An attractive later price move does not prove that the earlier evidence justified an entry.',
   'Identify one mistake: acting without a trigger, ignoring invalidation, assuming EMA predicts price, or confusing OHLCV with proof of a fill.'
  ]},
  7:{blocks:[
   'Transfer the method to a different fictional example rather than memorizing the answer to this one.',
   'State the cutoff candle, the supporting evidence, the missing information, the proposed invalidation and a decision to enter, watch or not trade.'
  ]},
  8:{blocks:[
   'You have practiced describing observable intraday evidence and planning a response before new data arrive.',
   'Review your own documented process and return to new scenarios. This guided work is not an independent, protected competency grade.'
  ]}
 };
 function lesson(stage){
  const content=stages[stage]||stages[1];
  return {
   category:'general',heading:'Day-trading decision discipline',
   objectives:stages[0].objectives,blocks:content.blocks,
   worked:content.worked||[],
   misconception:'A strong green candle, EMA crossing or large volume bar does not guarantee a profitable entry.',
   limitation:'Original fictional illustrative OHLCV is not historical exchange data, real execution evidence or an assessment key.',
   check:null,
   sourceNote:'Original ungraded instructional demonstration. GUSIM_DT_C01_L02 remains private and server-revealed only.'
  };
 }
 const example=[
  [22.00,22.12,21.90,22.18,2400],
  [22.12,22.09,22.00,22.19,1800],
  [22.09,22.30,22.02,22.34,4300],
  [22.30,22.25,22.18,22.38,2600],
  [22.25,22.28,22.11,22.33,2100],
  [22.28,22.16,22.10,22.34,3500]
 ];
 function createVisual({stage}={}){
  const box=document.createElement('section');box.className='dt-l02-study';
  box.setAttribute('aria-label','ECharts day trading lesson demonstration');
  const heading=document.createElement('h3');
  heading.textContent=stage===1?'I Do — Talia demonstrates completed candles':'We Do — Change a fictional completed candle';
  const note=document.createElement('p');
  note.textContent='Distinct fictional teaching illustration · NOT the hidden GUSIM_DT_C01_L02 dataset · No verified market history or future replay bars.';
  box.append(heading,note);
  const canvas=document.createElement('div');canvas.className='dt-l02-study-chart';
  canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label','Fictional ECharts candlesticks and volume; observable values are described below');
  box.append(canvas);
  const tools=document.createElement('div');tools.className='dt-l02-study-tools';
  const out=document.createElement('p');out.className='dt-l02-study-output';out.setAttribute('role','status');
  const visible=stage===1?1:6;
  let reveal=visible,close=22.16,vol=3500,plot=null;
  let disposed=false;
  const add=(node)=>{tools.append(node);return node};
  if(stage===1){
   const btn=document.createElement('button');btn.type='button';btn.className='btn secondary';
   btn.textContent='Show next fictional demonstration candle';add(btn);
   btn.addEventListener('click',()=>{reveal=Math.min(6,reveal+1);btn.disabled=reveal===6;render()});
  }else{
   const controls=[['Last close, $',22.10,22.34,.01,close,v=>close=v],
    ['Last candle volume',1000,6500,250,vol,v=>vol=v]];
   for(const [name,min,max,step,value,set] of controls){
    const label=document.createElement('label');label.textContent=name+' ';
    const input=document.createElement('input');
    input.type='range';input.min=String(min);input.max=String(max);
    input.step=String(step);input.value=String(value);
    input.addEventListener('input',()=>{set(Number(input.value));render()});
    label.append(input);add(label);
   }
  }
  box.append(tools,out);
  const disclaimer=document.createElement('p');disclaimer.className='dt-l02-study-caption';
  disclaimer.textContent='Question: What is observed, what remains uncertain, and would you ENTER, WATCH or choose NO TRADE? There is no automatically correct trade choice from these candles.';
  box.append(disclaimer);
  function bars(){
   return example.slice(0,reveal).map((raw,i)=>{
    const [o,c,l,h,v]=raw;
    return i===5&&stage===2?[o,close,l,h,vol]:[o,c,l,h,v];
   });
  }
  function render(){
   const rows=bars(),last=rows[rows.length-1];
   out.textContent='Illustration candle '+rows.length+' of 6 · O $'+last[0].toFixed(2)+
    ' · H $'+last[3].toFixed(2)+' · L $'+last[2].toFixed(2)+
    ' · C $'+last[1].toFixed(2)+' · Volume '+last[4].toLocaleString('en-US')+
    '. Candles are illustrative; this is not a price prediction.';
   if(!plot)return;
   const times=rows.map((_,i)=>'Example '+(i+1));
   plot.setOption({animation:false,backgroundColor:'transparent',
    textStyle:{color:'#deedf5'},tooltip:{trigger:'axis',axisPointer:{type:'cross'}},
    grid:[{left:60,right:20,top:30,height:'57%'},{left:60,right:20,top:'78%',height:'13%'}],
    xAxis:[{type:'category',data:times,gridIndex:0,axisLabel:{color:'#b6cddd'}},
     {type:'category',data:times,gridIndex:1,axisLabel:{color:'#b6cddd'}}],
    yAxis:[{type:'value',gridIndex:0,scale:true,axisLabel:{color:'#b6cddd'}},
     {type:'value',gridIndex:1,min:0,axisLabel:{color:'#b6cddd'}}],
    series:[
     {name:'Fictional candles',type:'candlestick',xAxisIndex:0,yAxisIndex:0,
      data:rows.map(r=>r.slice(0,4)),itemStyle:{color:'#30c8a3',color0:'#ea6c86',
       borderColor:'#30c8a3',borderColor0:'#ea6c86'}},
     {name:'Illustrative volume',type:'bar',xAxisIndex:1,yAxisIndex:1,
      data:rows.map(r=>({value:r[4],itemStyle:{color:r[1]>=r[0]?'#30c8a3':'#ea6c86'}}))}
    ]},{notMerge:true});
  }
  render();
  Promise.resolve().then(async()=>{
   if(!box.isConnected||disposed)return;
   try{
    const engine=await root.CrownlightECharts?.load?.();
    if(!engine||!box.isConnected||disposed)return;
    plot=engine.init(canvas,null,{renderer:'canvas'});render();
   }catch{
    const fallback=document.createElement('p');
    fallback.textContent='The interactive chart is unavailable; the complete OHLCV observation appears above.';
    box.append(fallback);
   }
  });
  const observer=typeof MutationObserver!=='undefined'?new MutationObserver(()=>{
   if(!box.isConnected){disposed=true;plot?.dispose();plot=null;observer.disconnect()}
  }):null;
  if(observer)observer.observe(document.body,{subtree:true,childList:true});
  return box;
 }
 function replayLink(){
  const section=document.createElement('section');section.className='dt-l02-study dt-l02-replay';
  section.append(Object.assign(document.createElement('h3'),{textContent:'You Do — Protected fictional replay'}));
  section.append(Object.assign(document.createElement('p'),{
   textContent:'After studying the concept, open your authenticated 2040 GUSIM_DT_C01_L02 case. Before any later candle is released, lock an evidence-based decision on the replay server. The result is ungraded.'}));
  const a=document.createElement('a');a.className='btn secondary';
  a.href='simulator.html?scope=fictional&dataset='+encodeURIComponent(CODE)+'&lessonPractice=1';
  a.textContent='Open GUSIM_DT_C01_L02 server-controlled practice';
  section.append(a);return section;
 }
 function extra(stage){
  if(stage===1||stage===2)return createVisual({stage});
  if(stage===4)return replayLink();
  return null;
 }
 root.CrownlightDT01L02Lesson=Object.freeze({id:ID,dataset:CODE,lesson,extra});
})(window);
