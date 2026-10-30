/* Crownlight ECharts Learning Workstation v1.
 * Public, authored FICTIONAL teaching data only. Never accepts private answers,
 * member balances, entitlements, replay buffers, or future market bars.
 * Visual accompaniment to the existing protected nine-stage Learning Engine.
 */
(function(root){'use strict';
 const sessions=new WeakMap();
 const money=n=>'$'+Number(n).toFixed(2);
 const node=(name,value)=>{const el=document.createElement(name);if(value!==undefined)el.textContent=String(value);return el;};
 function candleMetrics(b){
  if(!b||![b.o,b.h,b.l,b.c].every(v=>typeof v==='number'&&Number.isFinite(v))||
   b.l<0||b.l>Math.min(b.o,b.c)||b.h<Math.max(b.o,b.c))return null;
  const body=Math.abs(b.c-b.o),range=b.h-b.l;
  return {body,range,percent:range===0?null:100*body/range,
   upper:b.h-Math.max(b.o,b.c),lower:Math.min(b.o,b.c)-b.l,
   direction:b.c>b.o?'Bullish':b.c<b.o?'Bearish':'Doji'};
 }
 function vwapMetrics(aPrice,aVolume,bPrice,bVolume){
  if(![aPrice,aVolume,bPrice,bVolume].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0)||
   aVolume+bVolume===0)return null;
  const dollarsA=aPrice*aVolume,dollarsB=bPrice*bVolume;
  return {dollarsA,dollarsB,totalDollars:dollarsA+dollarsB,
   totalShares:aVolume+bVolume,price:(dollarsA+dollarsB)/(aVolume+bVolume)};
 }
 function mount(target,options={}){
  if(!target||typeof target.replaceChildren!=='function')return null;
  sessions.get(target)?.dispose();
  const kind=options.kind==='vwap'?'vwap':'candle';
  const original=options.candle&&candleMetrics(options.candle)?options.candle:{o:31,h:32.5,l:30.5,c:32};
  const candle={o:original.o,h:original.h,l:original.l,c:original.c};
  let secondVolume=100,instance=null,observer=null,disposed=false;
  const section=node('section');section.className='gu-echarts-lesson';
  section.setAttribute('aria-label','Talia interactive fictional chart experiment');
  const eyebrow=node('p','APACHE ECHARTS · FICTIONAL TEACHING DATA');
  eyebrow.className='gu-echarts-eyebrow';
  const heading=node('h3',kind==='vwap'?'See how trading volume changes VWAP':'Construct and measure a candlestick');
  const description=node('p',kind==='vwap'
   ?'Talia: Price is weighted by the number of shares. Change the second group and observe the recalculated average.'
   :'Talia: Open and Close mark the body. High and Low mark the full range. Change Close to see which measurements move.');
  const chart=node('div');chart.className='gu-echarts-plot';
  chart.setAttribute('role','img');chart.setAttribute('aria-label',kind==='vwap'?
   'Fictional trade prices, quantities and volume-weighted average':'Fictional candlestick with price-positioned Open, High, Low and Close guides');
  const note=node('p','This is a synthetic, ungraded teaching example—not a live quote, a historical replay, an assessment answer, a trading signal, or an official mastery result.');
  note.className='gu-echarts-source';
  const controls=node('div');controls.className='gu-echarts-controls';
  const facts=node('div');facts.className='gu-echarts-facts';facts.setAttribute('aria-live','polite');
  const table=node('table');table.className='gu-echarts-table';
  const caption=node('caption',kind==='vwap'?'Fictional trades and quantities':'Accessible open, high, low and close reference');
  table.append(caption);
  const th=node('thead'),theadRow=node('tr');
  for(const txt of (kind==='vwap'?['Group','Price','Shares','Traded value']:['Price level','Value']))
   theadRow.append(node('th',txt));
  th.append(theadRow);table.append(th);
  const tbody=node('tbody');table.append(tbody);
  section.append(eyebrow,heading,description,chart,note,controls,table,facts);
  target.replaceChildren(section);
  let slider=null,output=null;
  if(options.interactive!==false){
   const label=node('label',kind==='vwap'?'Shares traded at $10 (fictional)':'Closing price (USD, fictional)');
   slider=node('input');slider.type='range';slider.min=kind==='vwap'?'50':String(candle.l);
   slider.max=kind==='vwap'?'500':String(candle.h);slider.step=kind==='vwap'?'50':'0.05';
   slider.value=kind==='vwap'?'100':String(candle.c);
   output=node('output');output.className='gu-echarts-value';
   label.append(slider,output);controls.append(label);
   slider.addEventListener('input',()=>{
    if(kind==='vwap')secondVolume=Number(slider.value);else candle.c=Number(slider.value);
    render();
   });
  }
  function row(...cells){
   const tr=node('tr');for(const cell of cells)tr.append(node('td',cell));tbody.append(tr);
  }
  function lines(b){
   return [
    {name:'HIGH '+money(b.h),yAxis:b.h,lineStyle:{color:'#d4ae60',type:'dashed'}},
    {name:'CLOSE '+money(b.c),yAxis:b.c,lineStyle:{color:'#73d6b6',type:'dashed'}},
    {name:'OPEN '+money(b.o),yAxis:b.o,lineStyle:{color:'#91baf6',type:'dashed'}},
    {name:'LOW '+money(b.l),yAxis:b.l,lineStyle:{color:'#d4ae60',type:'dashed'}}
   ];
  }
  function option(){
   const common={animation:false,backgroundColor:'transparent',aria:{enabled:true},
    textStyle:{color:'#d1e2ef'},grid:{left:64,right:152,top:35,bottom:48},
    tooltip:{trigger:'axis',axisPointer:{type:'cross'}},
    xAxis:{type:'category',data:kind==='vwap'?['Group A','Group B']:['Fictional candle'],
     axisLabel:{color:'#d1e2ef'}},
    yAxis:{type:'value',scale:true,axisLabel:{color:'#d1e2ef'}},
    dataZoom:[{type:'inside',filterMode:'none'}]};
   if(kind==='vwap'){
    const m=vwapMetrics(8,200,10,secondVolume);
    common.yAxis=[{type:'value',min:0,max:12,name:'USD/share',nameTextStyle:{color:'#d1e2ef'},
     axisLabel:{color:'#d1e2ef'}},{type:'value',min:0,name:'Shares',nameTextStyle:{color:'#d1e2ef'},
     axisLabel:{color:'#d1e2ef'}}];
    common.series=[
     {name:'Trade price',type:'line',data:[8,10],symbolSize:12,itemStyle:{color:'#44c7db'},
      lineStyle:{width:3},markLine:{silent:true,symbol:['none','none'],
       lineStyle:{color:'#f0c66f',type:'dashed'},
       label:{show:true,position:'insideEndTop',formatter:'VWAP '+money(m.price)},
       data:[{yAxis:m.price}]}},
     {name:'Trade shares',type:'bar',yAxisIndex:1,data:[200,secondVolume],
      barMaxWidth:45,itemStyle:{color:'#6c83c5',opacity:.65}}
    ];
   }else{
    common.yAxis={type:'value',scale:true,min:Math.max(0,candle.l-(candle.h-candle.l)*.16-.01),
     max:candle.h+(candle.h-candle.l)*.16+.01,axisLabel:{color:'#d1e2ef'}};
    common.series=[{type:'candlestick',name:'Fictional OHLC',barWidth:56,
     data:[[candle.o,candle.c,candle.l,candle.h]],
     itemStyle:{color:'#24b79c',color0:'#ee7487',borderColor:'#24b79c',borderColor0:'#ee7487'},
     markLine:{silent:true,symbol:['none','none'],precision:2,
      label:{show:true,position:'end',fontSize:11,color:'#e8f2fb',formatter:p=>p.data.name},
      data:lines(candle)}}];
   }
   return common;
  }
  function render(){
   if(disposed)return;
   tbody.replaceChildren();facts.replaceChildren();
   if(kind==='vwap'){
    const m=vwapMetrics(8,200,10,secondVolume);
    row('A','$8.00','200','$1,600.00');
    row('B','$10.00',String(secondVolume),money(m.dollarsB));
    row('Total','—',String(m.totalShares),money(m.totalDollars));
    facts.append(node('p','Step 1 · Dollar value = price × shares. Group A: $8.00 × 200 = $1,600.00; Group B: $10.00 × '+secondVolume+' = '+money(m.dollarsB)+'.'),
     node('p','Step 2 · Total traded dollars = '+money(m.totalDollars)+'; total shares = '+m.totalShares+'.'),
     node('p','Step 3 · VWAP = total traded dollars ÷ total shares = '+money(m.totalDollars)+' ÷ '+m.totalShares+' = '+money(m.price)+' per share.'),
     node('p','Σ means add together. VWAP describes an observed weighted average; it does not predict the next price.'));
    if(output)output.textContent=String(secondVolume)+' shares · VWAP '+money(m.price);
   }else{
    const m=candleMetrics(candle);
    for(const [label,value] of [['Open',candle.o],['High',candle.h],['Low',candle.l],['Close',candle.c]])row(label,money(value));
    facts.append(node('p','Step 1 · Real body = |Close − Open| = |'+money(candle.c)+' − '+money(candle.o)+'| = '+money(m.body)+'. The absolute value bars mean a nonnegative distance.'),
     node('p','Step 2 · Full range = High − Low = '+money(candle.h)+' − '+money(candle.l)+' = '+money(m.range)+'. The range includes both wicks and the body.'),
     node('p',m.percent===null?'Step 3 · Body percentage is undefined because the candle has zero range. Division by zero is not allowed.':
      'Step 3 · Body percentage = body ÷ range × 100 = '+money(m.body)+' ÷ '+money(m.range)+' × 100 = '+m.percent.toFixed(1)+'%. A percentage expresses a part of a whole.'),
     node('p','Upper wick '+money(m.upper)+' · Lower wick '+money(m.lower)+' · '+m.direction+' completed candle. The candle does not reveal the order of High and Low or predict the next interval.'));
    if(output)output.textContent=money(candle.c)+' · '+m.direction+' · body '+money(m.body);
   }
   instance?.setOption(option(),{notMerge:true});
  }
  const session={
   update(values){
    if(kind==='vwap'){
     if(Number.isFinite(values?.sharesB)&&values.sharesB>=0&&values.sharesB<=100000)
      secondVolume=values.sharesB;
    }else if(Number.isFinite(values?.c)&&values.c>=candle.l&&values.c<=candle.h)candle.c=values.c;
    if(slider)slider.value=String(kind==='vwap'?secondVolume:candle.c);
    render();
   },
   resize(){if(instance&&chart.clientWidth>0)instance.resize();},
   dispose(){if(disposed)return;disposed=true;observer?.disconnect();observer=null;instance?.dispose();instance=null;section.remove();}
  };
  sessions.set(target,session);
  render(); // Accessible table and worked instruction remain even without ECharts.
  if(root.CrownlightECharts?.load){
   Promise.resolve(root.CrownlightECharts.load()).then(e=>{
    if(disposed||!section.isConnected)return;
    instance=e.init(chart,null,{renderer:'svg'});
    if(typeof ResizeObserver!=='undefined'){
     observer=new ResizeObserver(()=>session.resize());observer.observe(chart);
    }
    render();session.resize();
   }).catch(()=>{if(!disposed){const msg=node('p','Chart rendering is unavailable. The accessible data and complete worked explanation remain available.');chart.replaceChildren(msg);}});
  }else chart.append(node('p','Chart engine unavailable. The accessible data and worked explanation remain available.'));
  return session;
 }
 function autoMount(){
  for(const details of document.querySelectorAll('[data-crownlight-echarts-tutorial]')){
   const host=details.querySelector('[data-crownlight-echarts-host]');
   if(!host)continue;
   details.addEventListener('toggle',()=>{if(details.open){
    if(!sessions.has(host))mount(host,{kind:'candle',interactive:true,candle:{o:20,h:22,l:19,c:21.2}});
    sessions.get(host)?.resize();
   }else sessions.get(host)?.dispose();});
  }
 }
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',autoMount,{once:true});
  else autoMount();
 }
 root.CrownlightLearningEChartsV1=Object.freeze({mount,candleMetrics,vwapMetrics,version:'1.0.0'});
})(typeof window==='undefined'?globalThis:window);
