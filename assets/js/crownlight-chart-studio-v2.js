/* Crownlight Chart Studio v2 - private member-led educational charting.
 * Uses Lightweight Charts 5.x when available; legacy Canvas stays as an offline fallback.
 * DO NOT send unrevealed bars or secret credentials to chart series.
 */
(function(root){
 'use strict';
 const MathLib=()=>root.CrownlightIndicatorMath;
 const LABELS={
  EMA:'Exponential Moving Average',SMA:'Simple Moving Average',
  VWAP:'Session HLC3 VWAP estimate',RSI:'Relative Strength Index',
  MACD:'MACD (12, 26, 9)',BB:'Bollinger Bands',ATR:'Average True Range',
  VOL_SMA:'Volume Moving Average',PMH:'Observed Premarket High',PML:'Observed Premarket Low',
  HOD:'Observed High of Day',LOD:'Observed Low of Day',
  PDH:'Previous Observed Day High',PDL:'Previous Observed Day Low',
  ORH:'Observed Opening Range High',ORL:'Observed Opening Range Low',
  STRUCTURE:'Confirmed HH / HL / LH / LL pivots'
 };
 const COLORS=['#a78bfa','#22d3ee','#f5c768','#46edbc','#fb7185','#ffb65b','#90a7ff','#50d4f5'];
 const KEY='crownlight.chartstudio.v2.appearance';
 const defaults=[
  {id:'ema9',type:'EMA',period:9,color:'#b49aff',width:2},
  {id:'ema20',type:'EMA',period:20,color:'#37ddf6',width:2},
  {id:'vwap',type:'VWAP',period:1,color:'#f7c76a',width:2}
 ];
 let prefs={studies:defaults.map(x=>({...x})),levels:[],follow:true};
 const state={mounted:false,chart:null,candles:null,volume:null,series:[],lines:[],source:'',count:-1,
  hover:null,sim:null,follow:true,fullscreen:false,inspectOpen:false,modal:null,observer:null,markerApi:null,userId:null};
 const $=id=>document.getElementById(id);
 const h=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x};
 const money=n=>Number.isFinite(n)?n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4}):'—';
 const num=n=>Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:3}):'—';
 const save=()=>{if(!state.userId)return;try{localStorage.setItem(KEY+':'+state.userId,JSON.stringify({studies:prefs.studies,levels:prefs.levels.slice(-15),follow:state.follow}))}catch{}};
 function scopeToMember(userId){
  if(typeof userId!=='string'||!userId)return;
  if(state.userId===userId)return;
  state.userId=userId;let stored=null;
  try{stored=JSON.parse(localStorage.getItem(KEY+':'+userId)||'null')}catch{}
  prefs=stored&&Array.isArray(stored.studies)?stored:{studies:defaults.map(x=>({...x})),levels:[],follow:true};
  prefs.studies=prefs.studies.filter(x=>LABELS[x?.type]&&typeof x.color==='string').slice(0,18);
  if(!Array.isArray(prefs.levels))prefs.levels=[];
  state.follow=prefs.follow!==false;state.source='';state.count=-1;state.hover=null;
  if(state.mounted){updateFollow();renderLegend()}
 }
 function timeNY(ms){
  return new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ms));
 }
 function initialize(){
  if(state.mounted)return !!state.chart;
  const canvas=$('sim-chart'),panel=canvas?.closest('.sim-chart-panel');
  if(!canvas||!panel||!MathLib()||!root.LightweightCharts?.createChart)return false;
  const lib=root.LightweightCharts;
  const shell=h('div','crownlight-shell');
  shell.innerHTML='<div class="crownlight-toolbar">'+
   '<div class="crownlight-identity"><span class="crownlight-mark">C</span><span><strong>CROWNLIGHT</strong><small>CHART STUDIO <em>2.0</em></small></span></div>'+
   '<div class="crownlight-toolbar-actions" role="toolbar" aria-label="Chart controls">'+
   '<button type="button" data-cl="zoom-in" title="Zoom in">＋<span class="sr-only">Zoom in</span></button>'+
   '<button type="button" data-cl="zoom-out" title="Zoom out">−<span class="sr-only">Zoom out</span></button>'+
   '<button type="button" data-cl="reset" title="Fit revealed history">Fit</button>'+
   '<button type="button" data-cl="follow" title="Follow the latest revealed candle">Follow</button>'+
   '<button type="button" data-cl="studies">Indicators <span class="cl-dot">●</span></button>'+
   '<button type="button" data-cl="level">＋ Level</button>'+
   '<button type="button" data-cl="source">Source</button>'+ 
   '<button type="button" data-cl="coach">Talia · Chart Lab</button>'+
   '<button type="button" data-cl="fullscreen">⛶ <span class="cl-text">Expand</span></button></div></div>'+
   '<div class="crownlight-legend" aria-label="Selected indicators"></div>'+
   '<div class="crownlight-market-strip" aria-live="off"><span data-cl="hover-title">Move over a candle to inspect it</span><span data-cl="hover-data">O — H — L — C — V —</span></div>'+
   '<div class="crownlight-plot" role="img" aria-label="Interactive candle chart. Mouse wheel zooms; drag pans. Keyboard controls are above."></div>'+
   '<div class="crownlight-help">Scroll to zoom at the cursor · Drag to explore revealed candles · Crosshair displays exact observed values · ET timestamps · <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">TradingView Lightweight Charts™</a> (Copyright © 2025 TradingView, Inc.)</div>'+ 
   '<section class="crownlight-coach" hidden aria-label="Talia chart learning panel"><div class="crownlight-coach-head"><span class="crownlight-coach-symbol">T</span><div><span>CHART LAB</span><h3>Read the Evidence with Talia</h3></div></div><div data-cl="coach-body"></div><label for="crownlight-observation">Your observation — what is known, unknown, or invalidated?</label><textarea id="crownlight-observation" rows="3" placeholder="Write your own analysis before revealing the next candle. No-trade is a valid conclusion."></textarea><div class="actions"><button type="button" data-cl="copy-observation">Copy observation</button><span data-cl="coach-feedback" role="status" aria-live="polite"></span></div></section>'+
   '<section class="crownlight-source" hidden aria-label="Market data source"><h3>Source and data integrity</h3><div data-cl="source-body"></div></section>';
  canvas.before(shell);
  const chartBox=shell.querySelector('.crownlight-plot');
  const chart=lib.createChart(chartBox,{
   width:Math.max(280,chartBox.clientWidth),height:620,
   layout:{background:{type:'solid',color:'#06101d'},textColor:'#c0d4e6',fontFamily:'Inter,system-ui,-apple-system,Segoe UI,sans-serif',fontSize:12,attributionLogo:true},
   grid:{vertLines:{color:'rgba(83,116,158,.12)'},horzLines:{color:'rgba(83,116,158,.14)'}},
   crosshair:{mode:lib.CrosshairMode?.Normal??0,vertLine:{color:'#8a70f7',style:lib.LineStyle?.Dashed??2,labelBackgroundColor:'#6c50cf'},horzLine:{color:'#43dcf5',style:lib.LineStyle?.Dashed??2,labelBackgroundColor:'#11657e'}},
   rightPriceScale:{borderColor:'#2e486b',scaleMargins:{top:.1,bottom:.12}},
   timeScale:{borderColor:'#2e486b',barSpacing:14,minBarSpacing:.6,rightOffset:16,timeVisible:true,secondsVisible:false,fixRightEdge:false,fixLeftEdge:false,
    tickMarkFormatter:time=>timeNY(Number(time)*1000).replace(/,\s*\d{4}/,'')},
   localization:{timeFormatter:time=>timeNY(Number(time)*1000)},
   handleScroll:{pressedMouseMove:true,mouseWheel:false,horzTouchDrag:true,vertTouchDrag:true},
   handleScale:{axisPressedMouseMove:true,mouseWheel:true,pinch:true},
   kineticScroll:{touch:true,mouse:true}
  });
  state.candles=chart.addSeries(lib.CandlestickSeries,{
   upColor:'#2bf2b1',downColor:'#ff5f86',wickUpColor:'#83ffda',wickDownColor:'#ff94a9',borderUpColor:'#1bd698',borderDownColor:'#ff648d',
   priceLineVisible:true,priceLineColor:'#f7c76a',lastValueVisible:true
  });
  state.volume=chart.addSeries(lib.HistogramSeries,{priceFormat:{type:'volume'},priceLineVisible:false,lastValueVisible:false},1);
  state.chart=chart;state.shell=shell;state.mounted=true;
  chart.subscribeCrosshairMove(param=>{
   if(!state.sim||param?.time===undefined||!param.time){return}
   const ms=Number(param.time)*1000;
   const rows=state.sim.candles.slice(0,state.sim.index+1);
   const bar=rows.find(b=>Math.floor(b.time.getTime()/1000)===Number(param.time));
   if(bar){state.hover=bar;showHover(bar)}
  });
  const actions=shell.querySelector('.crownlight-toolbar-actions');
  actions.addEventListener('click',event=>{
   const button=event.target.closest('[data-cl]');if(!button)return;
   const cmd=button.dataset.cl,scale=chart.timeScale();
   if(cmd==='zoom-in'||cmd==='zoom-out'){const current=scale.options().barSpacing||16;scale.applyOptions({barSpacing:Math.max(.6,Math.min(56,current*(cmd==='zoom-in'?1.3:.66)))})}
   if(cmd==='reset'){state.follow=true;fitVisible();save()}
   if(cmd==='follow'){state.follow=!state.follow;updateFollow();save();if(state.follow)scale.scrollToRealTime()}
   if(cmd==='studies')openStudies();
   if(cmd==='level')addLevel();
   if(cmd==='source'){const element=shell.querySelector('.crownlight-source');element.hidden=!element.hidden; if(!element.hidden)showSource()}
   if(cmd==='coach'){const element=shell.querySelector('.crownlight-coach');element.hidden=!element.hidden;if(!element.hidden)showCoach(state.hover||state.sim?.candles[state.sim?.index])}
   if(cmd==='copy-observation')void copyObservation();
   if(cmd==='fullscreen')toggleFullscreen();
  });
  state.observer=new ResizeObserver(()=>{if(state.chart){chart.resize(Math.max(280,chartBox.clientWidth),chartBox.clientHeight||620)}});
  state.observer.observe(chartBox);
  panel.classList.add('crownlight-active');
  updateFollow();renderLegend();
  return true;
 }
 function fitVisible(){
  if(!state.chart||!state.count)return;
  const scale=state.chart.timeScale();
  const count=state.count;
  scale.setVisibleLogicalRange({from:Math.max(-1,count-Math.min(90,Math.max(23,count))),to:count+16});
 }
 function updateFollow(){
  const button=state.shell?.querySelector('[data-cl="follow"]');
  if(button){button.classList.toggle('is-on',state.follow);button.setAttribute('aria-pressed',String(state.follow))}
 }
 function renderLegend(){
  if(!state.shell)return;
  const panel=state.shell.querySelector('.crownlight-legend');panel.replaceChildren();
  prefs.studies.forEach(study=>{
   const chip=h('button','crownlight-study-chip');chip.type='button';chip.title='Configure '+LABELS[study.type];
   const dot=h('span','cl-color');dot.style.background=study.color;
   chip.append(dot,h('span','',study.type+(study.period>1?' '+study.period:'')));
   chip.onclick=openStudies;panel.append(chip);
  });
  if(!prefs.studies.length)panel.append(h('span','cl-empty','Indicators off · use Indicators to add studies'));
 }
 function linesToPoints(vals,visible){
  const points=[];for(let i=0;i<vals.length&&i<visible.length;i++){
   if(Number.isFinite(vals[i]))points.push({time:Math.floor(visible[i].time.getTime()/1000),value:vals[i]});
  }return points;
 }
 function createLine(points,color,width,pane,name){
  if(!points.length)return;
  const series=state.chart.addSeries(root.LightweightCharts.LineSeries,{
   color,lineWidth:Math.max(1,Math.min(4,Number(width)||2)),title:name,priceLineVisible:false,lastValueVisible:true,
   crosshairMarkerVisible:true},pane||0);
  series.setData(points);state.series.push(series);
 }
 function makeStudy(study,bars){
  const m=MathLib(),c=bars.map(b=>b.close),p=study.period||9;
  const add=(vals,col=study.color,pane=0,label=study.type)=>createLine(linesToPoints(vals,bars),col,study.width,pane,label);
  if(study.type==='EMA')add(m.ema(c,p));
  else if(study.type==='SMA')add(m.sma(c,p));
  else if(study.type==='VWAP')add(m.vwapProxy(bars),study.color,0,'HLC3 VWAP proxy');
  else if(study.type==='BB'){
   const v=m.bollinger(bars,p,Number(study.multiplier)||2);
   add(v.middle,study.color,0,'BB mid');add(v.upper,'#8de6fb',0,'BB upper');add(v.lower,'#8de6fb',0,'BB lower');
  }
  else if(study.type==='RSI')add(m.rsi(bars,p),study.color,2,'RSI '+p);
  else if(study.type==='ATR')add(m.atr(bars,p),study.color,2,'ATR '+p);
  else if(study.type==='MACD'){
   const v=m.macd(bars,12,26,9);add(v.line,study.color,2,'MACD');add(v.signal,'#ffd074',2,'MACD signal');
  }
  else if(study.type==='VOL_SMA')add(m.sma(bars.map(b=>b.volume),p),study.color,1,'Volume MA '+p);
  else if(study.type==='ORH'||study.type==='ORL'){
   const range=m.openingRange(bars,Number(study.period)||5);
   add(study.type==='ORH'?range.upper:range.lower,study.color,0,study.type+' observed');
  }
  else if(['HOD','LOD','PMH','PML','PDH','PDL'].includes(study.type)){
   add(m.observedLevels(bars)[study.type],study.color,0,study.type+' observed');
  }
 }
 function redraw(sim){
  scopeToMember(sim?.user?.id);
  if(!initialize())return false;
  const data=sim.candles.slice(0,sim.index+1);
  const source=sim.sourceProvider+'|'+sim.sourceName+'|'+sim.candles.length;
  const reset=source!==state.source||state.count>data.length;
  const prior=state.chart.timeScale().getVisibleLogicalRange();
  state.sim=sim;state.source=source;state.count=data.length;
  const candlePoints=data.map(b=>({time:Math.floor(b.time.getTime()/1000),open:b.open,high:b.high,low:b.low,close:b.close}));
  state.candles.setData(candlePoints);
  state.volume.setData(data.map(b=>({time:Math.floor(b.time.getTime()/1000),value:b.volume,color:b.close>=b.open?'rgba(43,242,177,.58)':'rgba(255,95,134,.60)'})));
  // Never compute a study using bars after sim.index.
  state.series.forEach(series=>{try{state.chart.removeSeries(series)}catch{}});state.series=[];
  prefs.studies.forEach(study=>{try{makeStudy(study,data)}catch(error){console.warn('Chart indicator unavailable',study.type,error?.message)}});
  // Swing classifications appear only after their right-side confirmation bars have been revealed.
  const structure=prefs.studies.find(study=>study.type==='STRUCTURE');
  if(typeof root.LightweightCharts.createSeriesMarkers==='function'){
   const markers=structure?MathLib().confirmedStructure(data,structure.period||2).map(p=>({
    time:Math.floor(data[p.index].time.getTime()/1000),
    position:p.kind==='high'?'aboveBar':'belowBar',
    shape:p.kind==='high'?'arrowDown':'arrowUp',
    color:p.kind==='high'?'#ff91af':'#5fffd6',text:p.label
   })):[];
   if(!state.markerApi)state.markerApi=root.LightweightCharts.createSeriesMarkers(state.candles,markers);
   else state.markerApi.setMarkers(markers);
  }
  state.lines.forEach(x=>{try{state.candles.removePriceLine(x)}catch{}});state.lines=[];
  (prefs.levels||[]).filter(x=>Number.isFinite(x.price)&&x.source===state.source).slice(-15).forEach(x=>{
   try{state.lines.push(state.candles.createPriceLine({price:x.price,color:x.color||'#f7c76a',lineWidth:2,axisLabelVisible:true,title:'Member level'}))}catch{}
  });
  const pos=sim.position;
  if(pos){
   [['entry','#ffd26f','ENTRY'],['stop','#ff668c','STOP'],['target','#36e4bb','TARGET']].forEach(([key,color,title])=>{
    if(Number.isFinite(pos[key])&&pos[key]>0){
     try{state.lines.push(state.candles.createPriceLine({price:pos[key],color,lineWidth:2,axisLabelVisible:true,title}))}catch{}
    }
   });
  }
  if(reset||!prior)fitVisible();
  else if(state.follow)state.chart.timeScale().scrollToRealTime();
  else state.chart.timeScale().setVisibleLogicalRange({from:Math.max(0,prior.from),to:Math.min(data.length+2,prior.to)});
  state.hover=data[data.length-1]||null;showHover(state.hover);renderLegend();
  if(!state.shell.querySelector('.crownlight-source').hidden)showSource();
  // Shared read-only chart adapter: emit only revealed OHLCV data. Never send
  // an unrevealed candle, a full scenario array, or member credentials.
  root.dispatchEvent(new CustomEvent('crownlight:revealed-bars',{detail:{
   symbol:String(sim.sourceName||'REPLAY').slice(0,40),
   timeframe:String(document.querySelector('#sim-timeframe')?.value||'').slice(0,48),
   source:String(sim.sourceProvider||''),
   bars:data.map(b=>({timestamp:b.time.getTime(),open:b.open,high:b.high,low:b.low,close:b.close,volume:b.volume}))
  }}));
  return true;
 }
 function showHover(b){
  if(!state.shell||!b)return;
  const label=state.shell.querySelector('[data-cl="hover-title"]'),details=state.shell.querySelector('[data-cl="hover-data"]');
  const ss=MathLib().session(b);
  const name={pre:'Premarket',regular:'Regular',after:'After-hours',overnight:'Overnight / outside 04–20 ET'}[ss.kind];
  label.textContent=timeNY(b.time.getTime())+' ET  ·  '+name;
  let extra='';
  if(Number.isFinite(b.tradeCount))extra+=' · Trades '+num(b.tradeCount);
  if(Number.isFinite(b.providerVwap))extra+=' · Bar VWAP $'+money(b.providerVwap);
  details.textContent='O '+money(b.open)+'  H '+money(b.high)+'  L '+money(b.low)+'  C '+money(b.close)+'  Vol '+num(b.volume)+extra;
  if(!state.shell.querySelector('.crownlight-coach').hidden)showCoach(b);
 }
 function showSource(){
  const body=state.shell?.querySelector('[data-cl="source-body"]');if(!body||!state.sim)return;
  const sim=state.sim;body.replaceChildren();const visible=sim.candles.slice(0,sim.index+1);
  const outside=visible.filter(bar=>MathLib().session(bar).kind==='overnight').length;
  const rows=[
   ['Source',sim.sourceName||'Member-provided file'],['Provider',sim.sourceProvider||'User import'],
   ['Loaded bar count',sim.isServerReplay?sim.candles.length+' revealed observations only':sim.candles.length+' (client-inspectable for this practice mode)'],
   ['Revealed bars',sim.index+1],
   ['Time zone','America/New_York'],
   ['Current session',sim.candles[sim.index]?MathLib().session(sim.candles[sim.index]).kind:'No candles loaded'],
   ['Trade counts',visible.some(b=>Number.isFinite(b.tradeCount))?'Available on revealed bars':'Not supplied on revealed bars'],
   ['Per-bar provider VWAP',visible.some(b=>Number.isFinite(b.providerVwap))?'Available on revealed bars':'Not supplied on revealed bars'],
   ['Outside 04:00–20:00 ET',outside+' revealed bars (provider timestamp retained; verify coverage)'],
   ['Session VWAP overlay','HLC3 × volume approximation, not exact trade VWAP'],
   ['Feed integrity',sim.isServerReplay?'Published historical dataset, server-enforced authorization and licensing gate':'Not independently certified; data completeness and redistribution rights not established'],
   ['Assessment',sim.isServerReplay?'First decision server locked; browser receives revealed bars only':'Ungraded personal practice only; browser contains full source array']
  ];
  const dl=h('dl','crownlight-facts');rows.forEach(([k,v])=>{dl.append(h('dt','',k),h('dd','',String(v)))});
  body.append(dl);
  if(sim.sourceNote)body.append(h('p','crownlight-source-note',sim.sourceNote));
 }
 function showCoach(bar){
  const target=state.shell?.querySelector('[data-cl="coach-body"]');if(!target||!bar)return;
  const range=bar.high-bar.low,body=Math.abs(bar.close-bar.open),upper=bar.high-Math.max(bar.open,bar.close);
  const lower=Math.min(bar.open,bar.close)-bar.low,position=range>0?(bar.close-bar.low)/range:null;
  const direction=bar.close>bar.open?'Bullish':bar.close<bar.open?'Bearish':'Doji / unchanged close';
  const index=state.sim.candles.findIndex(x=>x.time.getTime()===bar.time.getTime());
  const prior=state.sim.candles.slice(Math.max(0,index-20),index).filter(x=>x.volume>=0);
  const relative=prior.length>=5&&prior.reduce((sum,x)=>sum+x.volume,0)>0?
   bar.volume/(prior.reduce((sum,x)=>sum+x.volume,0)/prior.length):null;
  target.replaceChildren();
  const title=h('p','crownlight-coach-lead',direction+' candle · '+timeNY(bar.time.getTime())+' ET');
  const table=h('dl','crownlight-coach-math');
  const values=[
   ['Real body',money(body)+' = |close − open|'],
   ['Full range',money(range)+' = high − low'],
   ['Upper wick',money(Math.max(0,upper))],
   ['Lower wick',money(Math.max(0,lower))],
   ['Body / range',range>0?(100*body/range).toFixed(1)+'%':'Undefined (zero range)'],
   ['Close position',position===null?'Undefined (zero range)':(100*position).toFixed(1)+'% above candle low'],
   ['Relative volume',relative===null?'Not assessed: need at least five prior observed bars':relative.toFixed(2)+'× preceding '+prior.length+'-bar mean (local sample)']
  ];
  values.forEach(([name,value])=>{table.append(h('dt','',name),h('dd','',value))});
  const question=h('p','crownlight-coach-question','What does the current candle establish? Which market observations are still unknown, and what evidence would justify waiting rather than trading?');
  const warning=h('p','crownlight-coach-notice','A candle describes past observations. It cannot prove the next price move or trade execution. This is ungraded educational practice.');
  target.append(title,table,question,warning);
  const tutor=root.CrownlightChartTutor?.analyze(
   state.sim.candles.slice(0,Math.min(state.sim.index,index)+1)
  );
  if(tutor){
   const heading=h('h4','crownlight-tutor-heading','What the indicators actually establish');
   const facts=h('div','crownlight-tutor-facts');
   tutor.facts.forEach(item=>{
    const row=h('div','crownlight-tutor-fact');row.append(h('strong','',item.name),h('p','',item.reading));facts.append(row);
   });
   const cues=h('div','crownlight-tutor-cues');
   tutor.cues.forEach(t=>cues.append(h('p','',t)));
   const prompts=h('ol','crownlight-tutor-questions');
   tutor.questions.forEach(t=>{const li=h('li','',t);prompts.append(li)});
   target.append(heading,facts,cues,h('h4','crownlight-tutor-heading','Entry, exit and no-trade evidence'),prompts,
    h('p','crownlight-coach-notice',tutor.sourceNote));
  }
 }
 async function copyObservation(){
  const note=state.shell?.querySelector('#crownlight-observation')?.value?.trim();
  const feedback=state.shell?.querySelector('[data-cl="coach-feedback"]');
  if(!note){if(feedback)feedback.textContent='Write your own observation first.';return}
  const b=state.hover||state.sim?.candles[state.sim.index];if(!b)return;
  const message='Crownlight Chart Lab — '+(state.sim.sourceName||'Member source')+
    '\n'+timeNY(b.time.getTime())+' ET — O '+b.open+' H '+b.high+' L '+b.low+' C '+b.close+' Volume '+b.volume+
    '\nMember observation: '+note+'\nUngraded personal practice; source not independently certified.';
  try{await navigator.clipboard.writeText(message);if(feedback)feedback.textContent='Copied for your Trading Journal.'}
  catch{if(feedback)feedback.textContent='Browser clipboard access unavailable; select and copy your observation manually.'}
 }
 function openStudies(){
  if(!state.shell)return;state.modal?.remove();
  const dialog=h('dialog','crownlight-dialog');state.modal=dialog;
  dialog.innerHTML='<header><span class="crownlight-eyebrow">CHART INTELLIGENCE</span><h2>Indicator Studio</h2>'+
   '<p>Customize calculations and overlays. Values use only revealed candles; insufficient warmup remains missing.</p></header>'+
   '<div class="crownlight-dialog-toolbar"><label for="cl-new-study">Add a study</label><select id="cl-new-study">'+
   Object.keys(LABELS).map(k=>'<option value="'+k+'">'+LABELS[k]+'</option>').join('')+'</select>'+
   '<button type="button" data-add>＋ Add indicator</button></div>'+
   '<div class="crownlight-study-list"></div>'+
   '<footer><p>VWAP is an HLC3 approximation. HOD / PMH / PDH levels reflect only observed history, not a guaranteed full-session market high.</p>'+
   '<button type="button" data-preset>Restore learning preset</button><button type="button" data-close>Done</button></footer>';
  document.body.append(dialog);
  function populate(){
   const list=dialog.querySelector('.crownlight-study-list');list.replaceChildren();
   if(!prefs.studies.length)list.append(h('p','cl-empty','No indicators selected.'));
   prefs.studies.forEach((study,i)=>{
    const row=h('div','crownlight-study-row');
    const header=h('div','crownlight-study-heading',LABELS[study.type]);
    row.append(header);
    const controls=h('div','crownlight-study-settings');
    if(['EMA','SMA','RSI','ATR','BB','VOL_SMA','STRUCTURE','ORH','ORL'].includes(study.type)){
     const label=h('label','','Period');const input=h('input');input.type='number';input.min=study.type==='STRUCTURE'||study.type==='ORH'||study.type==='ORL'?'1':'2';input.max=study.type==='STRUCTURE'?'5':study.type==='ORH'||study.type==='ORL'?'60':'200';input.value=String(study.period||14);
     input.setAttribute('aria-label',LABELS[study.type]+' period');input.addEventListener('change',()=>{
      const next=Math.round(Number(input.value));const min=study.type==='STRUCTURE'||study.type==='ORH'||study.type==='ORL'?1:2;const max=study.type==='STRUCTURE'?5:study.type==='ORH'||study.type==='ORL'?60:200;study.period=Number.isFinite(next)?Math.max(min,Math.min(max,next)):14;input.value=String(study.period);save();redraw(state.sim)});
     label.append(input);controls.append(label);
    }
    const colorLabel=h('label','','Color');const color=h('input');color.type='color';color.value=/^#[0-9a-f]{6}$/i.test(study.color)?study.color:'#a78bfa';
    color.setAttribute('aria-label',LABELS[study.type]+' color');color.oninput=()=>{study.color=color.value;save();redraw(state.sim)};
    colorLabel.append(color);controls.append(colorLabel);
    const widthLabel=h('label','','Thickness');const width=h('select');
    for(let n=1;n<=4;n++){const o=h('option','',n+' px');o.value=String(n);if(n===(study.width||2))o.selected=true;width.append(o)}
    width.setAttribute('aria-label',LABELS[study.type]+' line thickness');width.onchange=()=>{study.width=Number(width.value);save();redraw(state.sim)};
    widthLabel.append(width);controls.append(widthLabel);
    const remove=h('button','crownlight-remove','Remove');remove.type='button';remove.onclick=()=>{prefs.studies.splice(i,1);save();redraw(state.sim);populate()};
    controls.append(remove);row.append(controls);list.append(row);
   });
  }
  dialog.querySelector('[data-add]').onclick=()=>{
   if(prefs.studies.length>=18)return;
   const type=dialog.querySelector('#cl-new-study').value;
   prefs.studies.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),type,period:['BB','EMA','SMA'].includes(type)?20:['ORH','ORL'].includes(type)?5:type==='STRUCTURE'?2:14,color:COLORS[prefs.studies.length%COLORS.length],width:2});
   save();redraw(state.sim);populate();
  };
  dialog.querySelector('[data-preset]').onclick=()=>{prefs.studies=defaults.map(x=>({...x}));save();redraw(state.sim);populate()};
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{dialog.remove();state.modal=null},{once:true});
  populate();dialog.showModal();
 }
 function addLevel(){
  if(!state.sim?.candles.length)return;
  const bar=state.hover||state.sim.candles[state.sim.index];
  const input=prompt('Add a horizontal price level (USD):',String(bar.close));
  if(input===null)return;
  const price=Number(input);
  if(!Number.isFinite(price)||price<=0){alert('Enter a positive numeric price.');return}
  prefs.levels.push({price,color:'#f7c76a',source:state.source});prefs.levels=prefs.levels.slice(-15);save();redraw(state.sim);
 }
 function toggleFullscreen(){
  const panel=state.shell?.closest('.sim-chart-panel');if(!panel)return;
  panel.classList.toggle('crownlight-expanded');
  state.fullscreen=panel.classList.contains('crownlight-expanded');
  document.body.classList.toggle('crownlight-chart-expanded',state.fullscreen);
  const btn=state.shell.querySelector('[data-cl="fullscreen"] .cl-text');
  if(btn)btn.textContent=state.fullscreen?'Exit':'Expand';
  requestAnimationFrame(()=>state.chart?.resize(Math.max(280,state.shell.querySelector('.crownlight-plot').clientWidth),state.shell.querySelector('.crownlight-plot').clientHeight));
 }
 function clearMemberState(){
  // A user change must not leave provider candles, notes or studies visible in a former session.
  state.sim=null;state.hover=null;state.userId=null;state.source='';state.count=0;
  prefs={studies:defaults.map(x=>({...x})),levels:[],follow:true};
  state.follow=true;
  if(state.chart){
   try{state.candles?.setData([]);state.volume?.setData([])}catch{}
   state.series.forEach(s=>{try{state.chart.removeSeries(s)}catch{}});state.series=[];
   state.lines.forEach(line=>{try{state.candles.removePriceLine(line)}catch{}});state.lines=[];
   try{state.markerApi?.setMarkers([])}catch{}
  }
  if(state.modal){state.modal.remove();state.modal=null}
  if(state.shell){
   const title=state.shell.querySelector('[data-cl="hover-title"]');
   const values=state.shell.querySelector('[data-cl="hover-data"]');
   if(title)title.textContent='Sign in to view chart observations';
   if(values)values.textContent='O — H — L — C — V —';
   const source=state.shell.querySelector('.crownlight-source');
   const coach=state.shell.querySelector('.crownlight-coach');
   if(source)source.hidden=true;
   if(coach)coach.hidden=true;
   state.shell.querySelector('[data-cl="source-body"]')?.replaceChildren();
   state.shell.querySelector('[data-cl="coach-body"]')?.replaceChildren();
   const note=state.shell.querySelector('#crownlight-observation');
   if(note)note.value='';
   const feedback=state.shell.querySelector('[data-cl="coach-feedback"]');
   if(feedback)feedback.textContent='';
   const panel=state.shell.closest('.sim-chart-panel');
   panel?.classList.remove('crownlight-expanded');
  }
  state.fullscreen=false;
  document.body.classList.remove('crownlight-chart-expanded');
  if(state.mounted)renderLegend();
  root.dispatchEvent(new CustomEvent('crownlight:revealed-bars',
   {detail:{symbol:'REPLAY',timeframe:'',source:'',bars:[]}}));
 }
 root.CrownlightStudio={render:redraw,clearMemberState,getStatus:()=>({mounted:state.mounted,library:!!root.LightweightCharts,studies:prefs.studies.map(s=>s.type),revealed:state.count,spacing:state.chart?.timeScale().options().barSpacing??null})};
})(window);
