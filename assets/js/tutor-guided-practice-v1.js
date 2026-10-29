/* Talia Guided Practice v1: public, source-grounded, ungraded.
 * Shared visual and decision engine for original indicator/watchlist modules.
 * No live ticker feed, no proprietary chart, no browser storage and no grading.
 */
(function(root){
 'use strict';
 const STAGES=['Start','Learn','Experiment','Predict','Practice','Assess','Review','Transfer','Results'];
 const $=id=>document.getElementById(id);
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);if(cls)el.className=cls;return el};
 const add=(parent,tag,text,cls)=>{const el=node(tag,text,cls);parent.appendChild(el);return el};
 const svgNS='http://www.w3.org/2000/svg';
 const svgEl=(name,attrs)=>{const el=document.createElementNS(svgNS,name);Object.entries(attrs||{}).forEach(([k,v])=>el.setAttribute(k,String(v)));return el};
 const sourceAllowed=/^https:\/\/(?:chartschool\.stockcharts\.com|toslc\.thinkorswim\.com)\//;
 const finite=v=>typeof v==='number'&&Number.isFinite(v);
 const round=(v,d=2)=>finite(v)?v.toFixed(d):'not available yet';
 const sample=[
  0.08,0.13,0.05,-0.04,0.12,0.09,-0.08,0.18,0.11,-0.03,0.06,0.16,
  -0.05,0.07,0.09,-0.12,0.14,0.07,-0.06,0.12,0.02,-0.07,0.13,0.07,
  -0.12,0.09,0.04,0.08,-0.05,0.06,0.11,-0.07,0.08,0.10,-0.13,0.09,
  0.04,0.09,-0.08,0.06,-0.04,0.10,0.05,-0.09,0.07,-0.02,0.08,0.03
 ];
 const state={units:[],unit:null,stage:0,maxStage:0,showBars:40,period:null,attempts:0,answer:null,
  evaluated:false,correct:false,feedback:'',transferAnswer:null,transferEvaluated:false,transferCorrect:false,
  reflection:'',reviewVisible:false,maxSpread:1,minRvol:2,requiresVerified:true,excludeHalted:true};
 function candleData(pattern){
  let previous=18.2;
  return sample.map((raw,i)=>{
   let delta=raw;
   if(pattern==='chop')delta=(i%2===0?1:-1)*(0.07+(i%3)*0.02);
   if(pattern==='gap'&&i===20){previous+=0.62}
   if(pattern==='reversal')delta=i>29?-(Math.abs(raw)*1.55):Math.abs(raw);
   if(pattern==='trend')delta=raw+(i%5===0?0.08:0);
   const open=Number(previous.toFixed(3)),close=Number((open+delta).toFixed(3));
   const high=Number((Math.max(open,close)+0.035+(i%3)*0.014).toFixed(3));
   const low=Number((Math.min(open,close)-0.035-(i%4)*0.008).toFixed(3));
   previous=close;
   return {time:new Date(Date.UTC(2026,9,27,13,30+i)).toISOString(),
    open,high,low,close,volume:14000+(i*2713)%19500+(i%7===0?26000:0)};
  });
 }
 function getBars(){return candleData(state.unit?.pattern||'trend').slice(0,state.showBars)}
 function metric(bars){
  const math=root.CrownlightIndicatorMath;
  if(!math||!bars.length)return {value:null,series:[],note:'Indicator math is unavailable.'};
  const len=state.period||8,k=state.unit.metric,n=bars.length-1;
  if(k==='sma'){const v=math.sma(bars.map(b=>b.close),len);return {value:v[n],series:v,note:'SMA of completed closes ('+len+' bars)'};}
  if(k==='ema'){const v=math.ema(bars.map(b=>b.close),len);return {value:v[n],series:v,note:'EMA seed is a simple average of the first '+len+' completed closes.'};}
  if(k==='rsi'){const v=math.rsi(bars,len);return {value:v[n],series:[],note:"Wilder-smoothed RSI ("+len+" bars), 0–100. Not a reversal forecast."};}
  if(k==='macd'){const m=math.macd(bars,12,26,9);return {value:m.histogram[n],series:[],note:'MACD(12,26,9) histogram = MACD line minus its signal line.'};}
  if(k==='atr'){const v=math.atr(bars,len);return {value:v[n],series:[],note:'Wilder-smoothed true range, including price gaps ('+len+' bars).'};}
  if(k==='bollinger'){const m=math.bollinger(bars,len,2);return {value:m.middle[n],series:m.middle,upper:m.upper[n],lower:m.lower[n],note:'Rolling mean +/- 2 population standard deviations ('+len+' bars).'};}
  if(k==='vwap'){const v=math.vwapProxy(bars);return {value:v[n],series:v,note:'BAR PROXY: HLC3 x volume, session weighted. Not exact trade-price VWAP.'};}
  if(k==='rvol'){
   const observed=bars.reduce((v,b)=>v+b.volume,0);
   const baseline=bars.length*20000;
   return {value:observed/baseline,series:[],note:'Fictional matched-clock baseline: '+baseline.toLocaleString()+' shares over '+bars.length+' bars. Activity, not direction.'};
  }
  if(k==='obv'){
   let v=0;for(let i=1;i<bars.length;i++){
    if(bars[i].close>bars[i-1].close)v+=bars[i].volume;
    if(bars[i].close<bars[i-1].close)v-=bars[i].volume;
   }
   return {value:v,series:[],note:'Zero-seeded OBV: signed volume by close change, not identified buy/sell orders.'};
  }
  if(k==='cmf'){
   if(bars.length<len)return {value:null,series:[],note:'CMF needs '+len+' completed bars.'};
   let numerator=0,denominator=0;
   for(const b of bars.slice(-len)){
    const range=b.high-b.low,clv=range===0?0:(2*b.close-b.high-b.low)/range;
    numerator+=clv*b.volume;denominator+=b.volume;
   }
   return {value:denominator>0?numerator/denominator:null,series:[],note:'CMF sums close-location-weighted volume; not actual institutional fund flow.'};
  }
  if(k==='mfi'){
   if(bars.length<=len)return {value:null,series:[],note:'MFI needs '+(len+1)+' completed bars.'};
   let pos=0,neg=0;
   for(let i=bars.length-len;i<bars.length;i++){
    const old=(bars[i-1].high+bars[i-1].low+bars[i-1].close)/3,now=(bars[i].high+bars[i].low+bars[i].close)/3;
    const value=now*bars[i].volume;
    if(now>old)pos+=value;else if(now<old)neg+=value;
   }
   return {value:neg===0?(pos===0?50:100):pos===0?0:100-100/(1+pos/neg),series:[],
    note:'Typical-price × volume MFI. The no-flow case is defined as 50; not identified buyer flow.'};
  }
  if(k==='roc'){
   if(bars.length<=len)return {value:null,series:[],note:'ROC needs '+(len+1)+' completed bars.'};
   const old=bars[bars.length-len-1].close;
   return {value:old!==0?100*(bars.at(-1).close/old-1):null,series:[],
    note:'ROC = percentage change over '+len+' completed closes, with split-adjustment requirements.'};
  }
  if(k==='donchian'){
   const series=[],upperSeries=[],lowerSeries=[];
   for(let i=0;i<bars.length;i++){
    if(i<len-1){series.push(null);upperSeries.push(null);lowerSeries.push(null);continue}
    const window=bars.slice(i-len+1,i+1),hi=Math.max(...window.map(x=>x.high)),lo=Math.min(...window.map(x=>x.low));
    upperSeries.push(hi);lowerSeries.push(lo);series.push((hi+lo)/2);
   }
   return {value:series[n],series,upperSeries,lowerSeries,upper:upperSeries[n],lower:lowerSeries[n],
    note:'Inclusive Donchian rolling high/low from completed bars; a prior-channel breakout needs an offset.'};
  }
  if(k==='keltner'){
   const series=math.ema(bars.map(b=>b.close),len),ranges=math.atr(bars,len);
   const upperSeries=series.map((v,i)=>finite(v)&&finite(ranges[i])?v+2*ranges[i]:null);
   const lowerSeries=series.map((v,i)=>finite(v)&&finite(ranges[i])?v-2*ranges[i]:null);
   return {value:series[n],series,upperSeries,lowerSeries,upper:upperSeries[n],lower:lowerSeries[n],
    note:'Explicit Keltner variant: EMA of closes +/- two Wilder ATR units. Platform methods vary.'};
  }
  if(k==='wma'){
   const closes=bars.map(b=>b.close),series=Array(bars.length).fill(null),denom=len*(len+1)/2;
   for(let i=len-1;i<bars.length;i++){
    let total=0;
    for(let j=0;j<len;j++)total+=closes[i-len+1+j]*(j+1);
    series[i]=total/denom;
   }
   return {value:series[n],series,note:'WMA: linearly weighted completed closes, newest weight '+len+'; not a forward forecast.'};
  }
  if(k==='ppo'){
   const closes=bars.map(b=>b.close),fast=math.ema(closes,12),slow=math.ema(closes,26);
   const v=finite(fast[n])&&finite(slow[n])&&slow[n]!==0?100*(fast[n]-slow[n])/slow[n]:null;
   return {value:v,series:[],note:'PPO main line only: 100*(EMA12-EMA26)/EMA26. No PPO signal line or histogram here; requires 26 completed closes.'};
  }
  if(k==='stochastic'||k==='williamsr'){
   if(bars.length<len)return {value:null,series:[],note:'Range oscillator needs '+len+' completed bars.'};
   const window=bars.slice(-len),hi=Math.max(...window.map(x=>x.high)),lo=Math.min(...window.map(x=>x.low)),range=hi-lo;
   const value=range===0?null:k==='stochastic'?100*(bars[n].close-lo)/range:-100*(hi-bars[n].close)/range;
   return {value,series:[],note:range===0?'Undefined: equal highest high and lowest low; do not invent a zero-denominator signal.':
    k==='stochastic'?'Fast stochastic %K on completed bars; no %D smoothing shown.':'Williams %R ranges from -100 to 0; correlated with fast stochastic %K.'};
  }
  if(k==='atrp'){
   const atr=math.atr(bars,len)[n],close=bars[n].close;
   const value=finite(atr)&&close!==0?100*atr/close:null;
   return {value,series:[],note:'ATRP = 100*Wilder ATR/last completed close, percent units; not price direction or executable loss.'};
  }
  if(k==='volumesma'){
   if(bars.length<len)return {value:null,series:[],note:'Average volume needs '+len+' comparable completed bars.'};
   const total=bars.slice(-len).reduce((n,b)=>n+b.volume,0);
   return {value:total/len,series:[],note:'Per-bar volume SMA in shares. One-minute bars only; not cumulative matched-time RVOL or order-side flow.'};
  }
  return {value:null,series:[],note:'Study calculation unavailable.'};
 }
 function reset(unit){
  state.unit=unit;state.stage=0;state.maxStage=0;state.showBars=['macd','ppo'].includes(unit.metric)?40:32;
  state.period=unit.period||8;state.attempts=0;state.answer=null;state.evaluated=false;state.correct=false;
  state.feedback='';state.transferAnswer=null;state.transferEvaluated=false;state.transferCorrect=false;
  state.reflection='';state.reviewVisible=false;
  state.maxSpread=1;state.minRvol=2;state.requiresVerified=true;state.excludeHalted=true;
  render();
 }
 function header(host){
  const top=add(host,'div',undefined,'tgp-head');
  add(top,'p','Talia · One-on-one guided practice','tgp-kicker');
  add(top,'h2','Learn it. Observe it. Decide it. Explain it.');
  add(top,'p','Original fictional demonstrations. No market feed, trade recommendation, official assessment grade, or competency credit. Your choices remain in this page session only.','tgp-note');
  const selector=add(top,'div',undefined,'tgp-picker');
  const label=add(selector,'label','Choose an instructional scenario','tgp-field-label');label.htmlFor='tgp-select';
  const select=add(selector,'select');select.id='tgp-select';select.setAttribute('aria-label','Choose guided practice topic');
  for(const g of ['indicator','watchlist']){
   const group=node('optgroup');group.label=g==='indicator'?'Indicator demonstrations':'Advanced watchlist decisions';
   state.units.filter(u=>u.kind===g).forEach(u=>{const o=node('option',u.title);o.value=u.id;group.append(o)});
   select.append(group);
  }
  select.value=state.unit.id;
  select.addEventListener('change',()=>reset(state.units.find(u=>u.id===select.value)||state.units[0]));
  const ind=state.units.filter(x=>x.kind==='indicator').length;
  const small=add(selector,'span',state.units.length+' original scenarios · '+ind+' indicator / '+(state.units.length-ind)+' watchlist · 9 learning stages','tgp-meta');
  small.setAttribute('aria-label','Available practice lessons');
 }
 function stages(host){
  const prog=add(host,'div',undefined,'tgp-stage-wrap');
  const bar=add(prog,'div',undefined,'tgp-progress');bar.setAttribute('role','progressbar');
  bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','8');bar.setAttribute('aria-valuenow',String(state.stage));
  bar.setAttribute('aria-label','Guided practice progress');
  const filled=add(bar,'span');filled.style.width=(state.stage/8*100)+'%';
  const nav=add(prog,'nav',undefined,'tgp-stage-nav');nav.setAttribute('aria-label','Guided practice stages');
  STAGES.forEach((s,i)=>{
   const b=add(nav,'button',s,'tgp-stage'+(i===state.stage?' is-current':''));
   b.type='button';b.disabled=i>state.maxStage;
   b.setAttribute('aria-current',i===state.stage?'step':'false');
   b.addEventListener('click',()=>{if(i<=state.maxStage){state.stage=i;render()}});
  });
 }
 function lessonText(host){
  const g=state.unit;
  add(host,'h3',g.title);
  if(state.stage===0){
   add(host,'p','The goal is to explain an observation and the limits of an interpretation before choosing any action.');
   add(host,'p','First you learn the idea, then inspect a fictional chart or scanner, predict, practice, review, and transfer the reasoning to a changed case.');
  }else if(state.stage===1){
   add(host,'h4','What it means');
   add(host,'p',g.learn);
   if(g.method){add(host,'h4','How to calculate or apply it');add(host,'p',g.method)}
   add(host,'h4','Why it matters');
   if(g.why)add(host,'p',g.why);
   add(host,'p',g.kind==='indicator'?'Indicators describe a chosen calculation on observed bars. Their context can help organize research, but they cannot independently prove an entry, HOLD, EXIT or probability of profit.':'A professional watchlist separates source verification, candidate discovery, setup qualification and risk. An impressive scan result must still survive hard vetoes.');
   add(host,'h4','What can go wrong');
   if(g.limitation)add(host,'p',g.limitation);
   add(host,'p',g.kind==='indicator'?'Changing the lookback, bar completion, session or data feed can change the plotted value. A crossing may fail.':'Stale quotes, source-timestamp errors, missing catalyst evidence, halts and borrow restrictions can invalidate an otherwise attractive candidate.');
  }else if(state.stage===2){
   add(host,'p',g.kind==='indicator'?'Move the historical-pause slider or study length and watch calculations change using only the revealed fictional bars.':'Change the fictional scanner requirements. Each row is re-evaluated against mandatory gates; a high RVOL never overrides a liquidity veto.');
  }else if(state.stage===3){
   add(host,'h4','Predict before receiving feedback');
   add(host,'p','Look at the available evidence and decide which statement is supportable. You will test the choice in Practice.');
  }else if(state.stage===4){
   add(host,'h4','Practice and correct');
   add(host,'p','Choose your interpretation and check it. If it is inaccurate, Talia explains the missing condition; after two attempts she provides a scaffold.');
  }else if(state.stage===5){
   add(host,'h4','Ungraded understanding check');
   add(host,'p','In your own words, explain what the evidence establishes, one uncertainty, and one condition that would change your decision. This is not a scored assessment.');
  }else if(state.stage===6){
   add(host,'h4','Review the reasoning');
   add(host,'p',g.feedback);
   add(host,'p','Misconception to avoid: treating a helpful indicator or scanner match as proof of an executable trading edge.');
  }else if(state.stage===7){
   add(host,'h4','Transfer to a changed scenario');
   add(host,'p','Apply the same evidence rule to a different, still-fictional circumstance. The transfer response is ungraded.');
  }else{
   add(host,'h4','What you practiced');
   add(host,'p','You practiced a specific observation, a source/risk limitation, and a changed example. This activity awards no official knowledge score or mastery.');
   add(host,'p','Ask Talia for another explanation or open a protected Lab when your membership includes one.');
  }
 }
 function renderChart(host){
  const bars=getBars(),last=bars.at(-1),info=metric(bars);
  const controls=add(host,'div',undefined,'tgp-controls');
  const label=add(controls,'label','Visible completed bars: '+state.showBars,'tgp-field-label');label.htmlFor='tgp-bars';
  const slider=add(controls,'input');slider.type='range';slider.id='tgp-bars';
  slider.min=state.unit.metric==='macd'?'36':state.unit.metric==='ppo'?'26':'16';slider.max='48';slider.step='1';slider.value=String(state.showBars);
  slider.addEventListener('input',e=>{state.showBars=Number(e.target.value);render()});
  if(!['macd','ppo','vwap','rvol'].includes(state.unit.metric)){
   const periodLabel=add(controls,'label','Indicator length: '+state.period+' bars','tgp-field-label');periodLabel.htmlFor='tgp-period';
   const period=add(controls,'input');period.type='range';period.id='tgp-period';period.min='5';period.max='20';
   period.step='1';period.value=String(state.period);
   period.addEventListener('input',e=>{state.period=Number(e.target.value);render()});
  }
  const svg=svgEl('svg',{viewBox:'0 0 720 270',role:'img','aria-label':'Fictional OHLCV candles visible only to the current replay pause. Indicator overlay when on price scale.','class':'tgp-candle-chart'});
  const width=720,height=240,left=52,right=15,top=17,plotBottom=202;
  const low=Math.min(...bars.map(b=>b.low)),high=Math.max(...bars.map(b=>b.high));
  const bounds=Math.max(0.2,high-low);
  const y=p=>top+(high+0.1*bounds-p)/(1.2*bounds)*(plotBottom-top);
  const span=(width-left-right)/bars.length, bWidth=Math.min(9,Math.max(4,span*0.56));
  for(let k=0;k<4;k++){
   const p=low+(high-low)*k/3;
   const yy=y(p);
   svg.append(svgEl('line',{x1:left,y1:yy,x2:width-right,y2:yy,stroke:'#5d6a79','stroke-opacity':0.25}));
   const tx=svgEl('text',{x:2,y:yy+4,fill:'currentColor','font-size':12});tx.textContent='$'+p.toFixed(2);svg.append(tx);
  }
  const maxVol=Math.max(...bars.map(b=>b.volume));
  bars.forEach((b,i)=>{
   const x=left+span*(i+0.5),up=b.close>=b.open,color=up?'#27a997':'#cf6470';
   svg.append(svgEl('rect',{x:x-bWidth/2,y:213+(maxVol-b.volume)/maxVol*33,width:bWidth,height:b.volume/maxVol*33,fill:color,opacity:0.5}));
   svg.append(svgEl('line',{x1:x,y1:y(b.high),x2:x,y2:y(b.low),stroke:color,'stroke-width':1.4}));
   svg.append(svgEl('rect',{x:x-bWidth/2,y:y(Math.max(b.open,b.close)),width:bWidth,height:Math.max(1,Math.abs(y(b.open)-y(b.close))),fill:color}));
  });
  if(info.series&&info.series.length){
   let buffer='';
   info.series.forEach((v,i)=>{if(!finite(v))return;const x=left+span*(i+0.5),yy=y(v);buffer+=(buffer?' L ':'M ')+x.toFixed(2)+' '+yy.toFixed(2)});
   if(buffer)svg.append(svgEl('path',{d:buffer,stroke:'#c8ad66','stroke-width':2.2,fill:'none','stroke-linejoin':'round'}));
  }
  if(info.upperSeries&&info.lowerSeries){
   for(const values of [info.upperSeries,info.lowerSeries]){
    let d='',continuous=false;
    values.forEach((v,i)=>{
     if(!finite(v)){continuous=false;return}
     const x=left+span*(i+0.5),yy=y(v);
     d+=(continuous?' L ':' M ')+x.toFixed(2)+' '+yy.toFixed(2);continuous=true;
    });
    if(d)svg.append(svgEl('path',{d,stroke:'#95a6c7','stroke-width':1.5,fill:'none','stroke-dasharray':'5 3'}));
   }
  }
  const xt=svgEl('text',{x:left,y:262,fill:'currentColor','font-size':12});xt.textContent='09:30 ET  ·  1-minute bars  ·  '+bars.length+' completed / 48 fictional';svg.append(xt);
  host.append(svg);
  const stats=add(host,'div',undefined,'tgp-stats');
  [['Open','$'+round(last.open)],['High','$'+round(last.high)],['Low','$'+round(last.low)],['Close','$'+round(last.close)],['Volume',last.volume.toLocaleString()],['Study',round(info.value,info.value!==null&&state.unit.metric==='rvol'?2:3)]].forEach(([a,b])=>{
   const x=add(stats,'div',undefined,'tgp-stat');add(x,'span',a);add(x,'strong',b);
  });
  add(host,'p',info.note,'tgp-caption');
  if(info.upper!==undefined){add(host,'p','Bands (when available): lower $'+round(info.lower)+' / upper $'+round(info.upper),'tgp-caption');}
  add(host,'p','These are deterministic invented prices. A pause only calculates from bars shown, not later bars. Price overlays are not displayed for separate-scale oscillators.','tgp-caption');
 }
 const candidates=[
  {symbol:'FICT-A',spread:0.40,rvol:2.8,verified:true,halted:false,trigger:true,price:12,allowed:true,restricted:false,relative:1.08,shortable:false,fresh:true,listedCommon:true,identityVerified:true,actionReconciled:true,levelsKnown:true,fiveMinuteClosed:true,higherFrameStamped:true,score:78,criticalUnknown:false,snapshotFrozen:true},
  {symbol:'FICT-B',spread:3.20,rvol:4.1,verified:true,halted:false,trigger:true,price:8,allowed:true,restricted:false,relative:0.90,shortable:true,fresh:true,listedCommon:false,identityVerified:true,actionReconciled:true,levelsKnown:true,fiveMinuteClosed:false,higherFrameStamped:true,score:95,criticalUnknown:false,snapshotFrozen:false},
  {symbol:'FICT-C',spread:0.35,rvol:3.7,verified:false,halted:false,trigger:true,price:4,allowed:true,restricted:false,relative:1.12,shortable:true,fresh:false,listedCommon:true,identityVerified:false,actionReconciled:false,levelsKnown:false,fiveMinuteClosed:true,higherFrameStamped:false,score:98,criticalUnknown:true,snapshotFrozen:false},
  {symbol:'FICT-D',spread:0.45,rvol:2.3,verified:true,halted:true,trigger:false,price:6,allowed:false,restricted:true,relative:1.14,shortable:false,fresh:true,listedCommon:false,identityVerified:false,actionReconciled:false,levelsKnown:false,fiveMinuteClosed:false,higherFrameStamped:false,score:65,criticalUnknown:true,snapshotFrozen:false}
 ];
 function specialGate(c,rule){
  if(rule==='boolean'){
   const all=c.price>=5&&c.allowed,any=c.relative>=1.05||c.shortable,none=!c.restricted;
   return {pass:all&&any&&none,description:'ALL(price at least $5 and selected universe) + ANY(relative strength at least 1.05 or borrow) + NONE(restricted)',
    reason:!all?'mandatory universe/price condition failed':!any?'no ANY condition passed':!none?'restricted list exclusion':'passed all Boolean groups'};
  }
  if(rule==='freshness')return {pass:c.fresh===true,description:'Quote and source timestamp verified',
   reason:c.fresh?'fresh source in fictional scenario':'stale source or quote'};
  if(rule==='sector')return {pass:c.relative>=1,description:'Same-period sector relative ratio at least 1.00',
   reason:c.relative>=1?'benchmark-relative context passes':'underperforms its chosen benchmark'};
  if(rule==='borrow')return {pass:c.shortable===true,description:'Broker short-borrow eligibility independently confirmed',
   reason:c.shortable?'fictional borrow appears available':'short borrow unavailable or unverified'};
  if(rule==='universe')return {pass:c.listedCommon===true&&c.identityVerified===true,
   description:'Listed common shares with verified issuer and share class',
   reason:!c.identityVerified?'issuer/security identity unverified':'wrong instrument or listing universe'};
  if(rule==='identity')return {pass:c.identityVerified===true&&c.actionReconciled===true,
   description:'Corporate action and share identity reconciled at this date',
   reason:!c.identityVerified?'security identifier cannot be verified':'corporate action adjustment unresolved'};
  if(rule==='levels')return {pass:c.levelsKnown===true,
   description:'PMH, PDH and as-of-time levels observed before the decision',
   reason:'price-level timestamp or completed reference unavailable'};
  if(rule==='timeframes')return {pass:c.fiveMinuteClosed===true&&c.higherFrameStamped===true,
   description:'Completed five-minute setup and time-stamped higher-frame context',
   reason:!c.fiveMinuteClosed?'five-minute confirmation still unfinished':'higher timeframe context unverified'};
  if(rule==='riskfirst')return {pass:c.criticalUnknown===false,display:'Score '+c.score+' / '+(c.criticalUnknown?'Veto':'Review'),
   description:'Explanatory score never overrides hard identity, data and execution vetoes',
   reason:'unresolved critical security or execution-risk field'};
  if(rule==='snapshot')return {pass:c.snapshotFrozen===true,
   description:'Frozen query revision, timestamp, filters and candidate record',
   reason:'no reproducible pre-outcome scanner snapshot'};
  return null;
 }
 function assessCandidate(c,rule=state.unit?.rule){
  const reasons=[],special=specialGate(c,rule);
  if(c.spread>state.maxSpread)reasons.push('spread exceeds limit');
  if(c.rvol<state.minRvol)reasons.push('RVOL below threshold');
  if(state.requiresVerified&&!c.verified)reasons.push('catalyst not verified');
  if(state.excludeHalted&&c.halted)reasons.push('halt risk');
  if(!c.trigger)reasons.push('trigger not confirmed');
  if(special&&!special.pass)reasons.push(special.reason);
  return {pass:reasons.length===0,reasons,special};
 }
 function renderWatch(host){
  const controls=add(host,'div',undefined,'tgp-gates');
  const fields=[{id:'maxSpread',label:'Maximum spread (%)',min:0.25,max:4,step:0.25},
   {id:'minRvol',label:'Minimum same-clock RVOL',min:0.5,max:4.5,step:0.25}];
  fields.forEach(f=>{
   const holder=add(controls,'label',f.label+': '+state[f.id],'tgp-gate');
   const input=add(holder,'input');input.type='range';input.min=String(f.min);input.max=String(f.max);
   input.step=String(f.step);input.value=String(state[f.id]);
   input.addEventListener('input',e=>{state[f.id]=Number(e.target.value);render()});
  });
  for(const f of [{id:'requiresVerified',label:'Require verified primary catalyst'},{id:'excludeHalted',label:'Exclude halted symbols'}]){
   const holder=add(controls,'label',undefined,'tgp-gate tgp-check');const input=add(holder,'input');input.type='checkbox';
   input.checked=state[f.id];holder.append(document.createTextNode(' '+f.label));
   input.addEventListener('change',e=>{state[f.id]=e.target.checked;render()});
  }
  const extra=specialGate(candidates[0],state.unit?.rule);
  if(extra)add(host,'p','Focus rule for this lesson: '+extra.description,'tgp-caption');
  const wrapper=add(host,'div',undefined,'tgp-table-scroll'),table=add(wrapper,'table',undefined,'tgp-scan-table');
  const thead=add(table,'thead'),tr=add(thead,'tr');
  ['Fictional symbol','Spread','RVOL','Primary source','Halt','Setup',...(extra?['Special gate']:[]),'Gate result'].forEach(h=>add(tr,'th',h));
  const tbody=add(table,'tbody');
  candidates.forEach(c=>{
   const r=add(tbody,'tr');const a=assessCandidate(c);
   [c.symbol,c.spread.toFixed(2)+'%',c.rvol.toFixed(1)+'×',c.verified?'Verified':'Pending',c.halted?'Halted':'Clear',
    c.trigger?'Observed':'Waiting',...(extra?[a.special?.display||(a.special?.pass?'Pass':'Fail')]:[]),a.pass?'Eligible for risk review':'Not qualified']
      .forEach((x,i)=>add(r,'td',x,i===(extra?7:6)?(a.pass?'tgp-good':'tgp-warning'):undefined));
   if(!a.pass){const hint=add(tbody,'tr');const cell=add(hint,'td','Reason: '+a.reasons.join('; '),'tgp-caption');cell.colSpan=extra?8:7;}
  });
  add(host,'p','The adjustable values are fictional learning-policy gates, not recommended thresholds. “Eligible for risk review” never means an order is placed.','tgp-caption');
 }
 function renderQuestion(host,transfer){
  const g=state.unit,opts=transfer?g.transferOptions:g.options;
  const selected=transfer?state.transferAnswer:state.answer;
  const prompt=transfer?g.transferQuestion:g.question;
  add(host,'p',prompt,'tgp-prompt');
  const group=add(host,'fieldset',undefined,'tgp-choices');
  add(group,'legend','Select the best evidence-based explanation');
  opts.forEach((option,i)=>{
   const label=add(group,'label',undefined,'tgp-choice');
   const input=add(label,'input');input.type='radio';input.name=transfer?'tgp-transfer':'tgp-prediction';input.value=String(i);
   input.checked=selected===i;
   input.addEventListener('change',()=>{if(transfer){state.transferAnswer=i;state.transferEvaluated=false}else{state.answer=i;state.evaluated=false}render()});
   label.append(document.createTextNode(' '+option));
  });
  const isChecked=transfer?state.transferEvaluated:state.evaluated;
  if(!transfer&&state.stage===3){
   add(host,'p','Your selection moves with you into Practice. The outcome remains hidden until you check the reasoning.','tgp-caption');
  }else{
   const button=add(host,'button',transfer?'Check transferred reasoning':'Check my reasoning','btn secondary');
   button.type='button';button.disabled=selected===null;
   button.addEventListener('click',()=>{
    if(transfer){state.transferEvaluated=true;state.transferCorrect=selected===g.transferCorrect;}
    else{state.attempts++;state.evaluated=true;state.correct=selected===g.correct;
     state.feedback=state.correct?g.feedback:(g.choiceFeedback?.[selected]||g.feedback);}
    render();
   });
   if(isChecked){
    const correct=transfer?state.transferCorrect:state.correct;
    const text=transfer?(correct?'The changed scenario is well interpreted. '+g.transferFeedback:'Talia identified this misconception: '+(g.transferFeedbackByChoice?.[selected]||g.transferFeedback)):
     (correct?'Your reasoning is consistent with the evidence. ':'Not yet: ')+state.feedback;
    const feedback=add(host,'p',text,'tgp-feedback '+(correct?'tgp-success':'tgp-warning'));
    feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
   }
   if(!transfer&&state.attempts>=2&&!state.correct){
    add(host,'p',g.scaffold||'Talia’s scaffold: Identify what the indicator or scanner *measures*. Rule out answers promising future price or ignoring a documented source, execution, or risk veto. Try another option.','tgp-feedback');
   }
  }
 }
 function actionBar(host){
  const bar=add(host,'div',undefined,'tgp-actions');
  const prev=add(bar,'button','Previous','btn secondary');prev.type='button';prev.disabled=state.stage===0;
  prev.addEventListener('click',()=>{state.stage--;render()});
  if(state.stage<8){
   const next=add(bar,'button',state.stage===4?'Continue to self-check':'Continue','btn');next.type='button';
   next.addEventListener('click',()=>{
    if(state.stage===4&&state.attempts<1){
     const msg=$('tgp-status');if(msg)msg.textContent='Choose a reason and check it at least once before continuing.';return;
    }
    if(state.stage===7&&!state.transferEvaluated){
     const msg=$('tgp-status');if(msg)msg.textContent='Check your transfer reasoning once before Results.';return;
    }
    state.stage++;state.maxStage=Math.max(state.maxStage,state.stage);render();
   });
  }
  const ask=add(bar,'button','Ask Talia to teach this another way','btn secondary');ask.type='button';
  ask.addEventListener('click',()=>{
   const question=$('tutor-question'),mode=$('tutor-mode');
   if(!question)return;
   question.value=('Teach me '+state.unit.title+' another way. Explain the evidence, risks, a fictional example and why WAIT or NO TRADE may be correct.').slice(0,450);
   question.dispatchEvent(new Event('input',{bubbles:true}));
   if(mode)mode.value='explain';
   question.focus();question.scrollIntoView({behavior:'smooth',block:'center'});
  });
  const status=add(host,'p','','tgp-status');status.id='tgp-status';status.setAttribute('role','status');
 }
 function render(){
  const host=$('tutor-guided-practice');
  if(!host||!state.unit)return;
  host.replaceChildren();
  header(host);stages(host);
  const body=add(host,'section',undefined,'tgp-content');
  lessonText(body);
  // Render exactly one visualization per stage; scanner tables are not duplicated.
  if(state.unit.kind==='indicator'&&[2,3,4].includes(state.stage))renderChart(body);
  if(state.unit.kind==='watchlist'&&state.stage===2)renderWatch(body);
  if(state.stage===3||state.stage===4)renderQuestion(body,false);
  if(state.stage===5){
   const label=add(body,'label','Your explanation (session-only; ungraded)','tgp-field-label');
   const textarea=add(body,'textarea');textarea.rows=4;textarea.maxLength=1400;label.append(textarea);
   textarea.value=state.reflection;
   textarea.addEventListener('input',e=>{state.reflection=e.target.value});
   add(body,'p','Suggested structure: I observed ___; it means ___; it does not prove ___; the no-trade condition is ___.','tgp-caption');
  }
  if(state.stage===6){
   const button=add(body,'button',state.reviewVisible?'Hide review criterion':'Show review criterion','btn secondary');button.type='button';
   button.addEventListener('click',()=>{state.reviewVisible=!state.reviewVisible;render()});
   if(state.reviewVisible)add(body,'p','An evidence-based answer states timeframe, source and formula/filter, separates observation from prediction, recognizes one invalidation or hard veto, and does not claim a guaranteed fill. Your reflection: '+(state.reflection||'(nothing submitted)'),'tgp-feedback');
  }
  if(state.stage===7)renderQuestion(body,true);
  if(state.stage===8){
   add(body,'p','Practice attempt count: '+state.attempts+'; initial scenario corrected: '+(state.correct?'yes':'not demonstrated')+'; transferred scenario: '+(state.transferCorrect?'consistent':'requires another look')+'.','tgp-caption');
   const repeat=add(body,'button','Try this lesson again','btn secondary');repeat.type='button';repeat.addEventListener('click',()=>reset(state.unit));
  }
  const url=state.unit.sourceUrl;
  if(sourceAllowed.test(url)){const p=add(body,'p',undefined,'tgp-source');const a=add(p,'a','Read the educational reference');a.href=url;a.target='_blank';a.rel='noopener noreferrer';}
  add(body,'p',state.unit.scope,'tgp-caption');
  actionBar(body);
 }
 async function init(){
  const host=$('tutor-guided-practice');if(!host)return;
  try{
   const r=await fetch('/data/tutor-guided-practice-v1.json',{credentials:'same-origin',cache:'no-cache'});
   if(!r.ok)throw Error('Teaching asset missing');
   const data=await r.json(),units=data?.modules;
   if(data?.kind!=='talia_guided_practice_original_ungraded_v1'||data?.indicatorCount!==20||
     data?.watchlistCount!==16||!Array.isArray(units)||units.length!==36||
     !root.CrownlightIndicatorMath)throw Error('Teaching catalog or indicator math unavailable');
   const ids=new Set();
   for(const m of units){
    if(!/^(IND|WATCH)-\d{2}$/.test(m?.id||'')||ids.has(m.id)||
     !/^STUDY_[A-Z0-9_]{3,80}$/.test(m.guideCode)||!['indicator','watchlist'].includes(m.kind)||
     !Array.isArray(m.options)||m.options.length!==3||
     !Array.isArray(m.transferOptions)||m.transferOptions.length!==3||
     !Number.isInteger(m.correct)||m.correct<0||m.correct>2||
     !Number.isInteger(m.transferCorrect)||m.transferCorrect<0||m.transferCorrect>2||
     !sourceAllowed.test(m.sourceUrl))throw Error('Invalid educational scenario');
    ids.add(m.id);
   }
   state.units=units;
   reset(units[0]);
  }catch{
   host.replaceChildren();
   add(host,'h2','Guided practice is unavailable');
   add(host,'p','The existing Market Tutor and protected Labs remain accessible. No grade or answer has been lost.');
  }
 }
 // Nonprivate, side-effect free test exposure: neither stored learner data nor order actions.
 root.TaliaGuidedPracticeV1=Object.freeze({candleData,assessCandidate,specialGate,metric:(bars,metricName,period)=>{
  const prior=state.unit,priorPeriod=state.period;
  state.unit={metric:metricName};state.period=period;
  try{return metric(bars)}finally{state.unit=prior;state.period=priorPeriod}
 }});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else void init();
})(typeof window!=='undefined'?window:globalThis);
