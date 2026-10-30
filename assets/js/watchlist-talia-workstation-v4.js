/* Talia Watchlist Research Workstation V4. One shared Free/Premium instructor surface.
 * Existing member records are read-only. Guided work is UNGRADED and IN MEMORY,
 * never a substitute for the protected nine-stage Lab, private research API,
 * live data, official mastery, an alert, or a paid entitlement.
 */
(function(root){'use strict';
 const C=root.GroundUpTaliaResearchV4;
 if(!C)return;
 const make=(tag,text,cls)=>{
  const el=document.createElement(tag);
  if(text!==undefined)el.textContent=String(text);
  if(cls)el.className=cls;
  return el;
 };
 const select=(values,labels)=>{
  const s=make('select');
  values.forEach((value,i)=>{const o=make('option',labels?.[i]||value);o.value=value;s.append(o)});
  return s;
 };
 const dimension=step=>({Observe:'Recognition',Explain:'Knowledge',
  Investigate:'Process',Interpret:'Recognition',Challenge:'Decision',
  Plan:'Decision',Practice:'Decision',Review:'Process'})[step];
 const pct=n=>n===null?'not available':n.toFixed(2);
 function create({source='free',records=[]}={}){
  let topicId='building',step=0,caseId='trend',visible=12,seriesMode='none',
   chart=null,resize=null,disposed=false,epoch=0,typing=null,typingAt=0;
  let selectedRecordCount=Array.isArray(records)?records.filter(x=>x&&typeof x==='object').length:0;
  let selectedSymbol='';
  const checkpoints=[],revisions=[],reveals=[];
  const rootEl=make('section',undefined,'cl-talia-v4');
  rootEl.setAttribute('aria-label','Talia interactive watchlist research instruction');
  const head=make('div',undefined,'cl-talia-head');
  head.append(make('span','T','cl-talia-avatar'));
  const title=make('div');
  title.append(make('h2','Talia · Watchlist & Trade Research Instructor'),
   make('p','One-to-one guided instruction · 27 research subjects · Free explanations and retries'));
  head.append(title);rootEl.append(head);
  const notice=make('p','Research practice, not a stock recommendation. Eight research actions below complement the existing nine-stage Learning Lab; they do not replace its protected assessments.','cl-talia-disclosure');
  rootEl.append(notice);
  const selectors=make('div',undefined,'cl-talia-selectors');
  const topicLabel=make('label','Study subject');
  const topics=select(C.TOPICS.map(x=>x.id),C.TOPICS.map(x=>x.title));
  topicLabel.append(topics);
  const caseLabel=make('label','Original fictional chart example');
  const scenarios=select(['trend','range','failure'],['Developing trend','Sideways consolidation','Breakout then failure']);
  caseLabel.append(scenarios);
  selectors.append(topicLabel,caseLabel);
  rootEl.append(selectors);
  const activeSymbol=make('p','Current member-entered symbol: none selected. Fictional teaching bars are independent of any saved ticker.','cl-talia-disclosure');
  rootEl.append(activeSymbol);
  const lesson=make('div',undefined,'cl-talia-lesson'),indicator=make('p',undefined,'cl-talia-step-label'),
    heading=make('h3'),narration=make('p',undefined,'cl-talia-narration'),
    transcript=make('p',undefined,'cl-talia-transcript');
  transcript.className='cl-talia-sr';
  narration.setAttribute('aria-hidden','true');
  transcript.setAttribute('aria-label','Full accessible Talia lesson explanation');
  lesson.append(indicator,heading,narration,transcript);
  const coachActions=make('div',undefined,'cl-talia-actions');
  const play=make('button','Play Talia’s written explanation','btn secondary');
  const full=make('button','Show full explanation','btn secondary');
  const deeper=make('button','Teach This in More Depth · Free','btn secondary');
  const example=make('button','Try Another Guided Example · Free','btn secondary');
  for(const b of [play,full,deeper,example])b.type='button';
  coachActions.append(play,full,deeper,example);lesson.append(coachActions);
  const more=make('div',undefined,'cl-talia-more');more.setAttribute('role','status');
  lesson.append(more);
  rootEl.append(lesson);
  const chartSection=make('section',undefined,'cl-talia-chart-card');
  chartSection.append(make('h3','Illustrative evidence workspace'));
  const context=make('p','Originally authored fictional 5-minute candles. NOT a market feed, current security, authorized historical case or private server replay. Later candles remain hidden in the practice example until revealed.','cl-talia-disclosure');
  chartSection.append(context);
  const chartControls=make('div',undefined,'cl-talia-chart-controls');
  const indicatorLabel=make('label','One indicator at a time');
  const overlay=select(['none','ema','vwap','macd','rsi','bollinger'],
   ['Price & volume only','EMA 9 / EMA 20','Session VWAP (bar approximation)','MACD (12/26/9)','RSI (14 Wilder)','Bollinger (20, 2σ)']);
  indicatorLabel.append(overlay);
  const nextCandle=make('button','Reveal next fictional bar','btn secondary');
  const restart=make('button','Restart fictional example','btn secondary');
  for(const b of [nextCandle,restart])b.type='button';
  chartControls.append(indicatorLabel,nextCandle,restart);
  const chartDiv=make('div',undefined,'cl-talia-chart');chartDiv.setAttribute('role','img');
  chartDiv.setAttribute('aria-label','Fictional ECharts OHLCV chart, showing no bars beyond learner reveal cutoff');
  const readout=make('p',undefined,'cl-talia-readout');readout.setAttribute('role','status');
  const priceTable=make('table',undefined,'cl-talia-price-table');
  priceTable.setAttribute('aria-label','Accessible OHLCV for the latest revealed fictional candle');
  chartSection.append(chartControls,chartDiv,readout,priceTable);
  rootEl.append(chartSection);
  const calculators=make('section',undefined,'cl-talia-calculators');
  const riskLab=make('section',undefined,'cl-talia-math');
  const rvolLab=make('section',undefined,'cl-talia-math');
  function numeric(host,name,value){
   const l=make('label',name),n=make('input');n.type='number';n.step='.01';n.min='0';n.value=String(value);
   l.append(n);host.append(l);return n;
  }
  riskLab.append(make('h3','Position Size and Adverse Fills'),
   make('p','Simplified fictional long example, including spread and slippage allowances. Stops do not guarantee fills or a maximum loss.'));
  const rf=make('div',undefined,'cl-talia-number-fields');
  const e=numeric(rf,'Entry 
  const question=make('section',undefined,'cl-talia-prompt');
  question.append(make('h3','Talia’s decision checkpoint'));
  const cue=make('p');
  const response=make('textarea');response.rows=4;response.maxLength=1400;
  response.placeholder='Distinguish observed facts, uncertainties and what would change your conclusion.';
  response.setAttribute('aria-label','Your research reasoning and evidence');
  const mistakeLabel=make('label','Which misconception or research gap are you checking?');
  const mistake=select(['NONE','MISSING_SOURCE','FUTURE_KNOWLEDGE','INDICATOR_CERTAINTY','LIQUIDITY_RISK','NO_INVALIDATION','OTHER'],
   ['No specific problem identified','Unverified issuer / source','Using information from the future',
    'Treating an indicator as certain','Ignoring spread, borrow or liquidity',
    'Missing invalidation / risk plan','Other misconception']);
  mistakeLabel.append(mistake);
  const save=make('button','Record ungraded research checkpoint','btn');
  const retry=make('button','Retry with more instruction · Free','btn secondary');
  const result=make('p',undefined,'cl-talia-result');result.setAttribute('role','status');
  result.setAttribute('aria-live','polite');
  question.append(cue,response,mistakeLabel,save,retry,result);
  rootEl.append(question);
  const report=make('section',undefined,'cl-talia-report');
  report.append(make('h3','Your Talia Watchlist Research Report'));
  const reportText=make('p','This member-session report covers research practice, not official assessment mastery.');
  const metrics=make('div',undefined,'cl-talia-metrics');
  const history=make('ol',undefined,'cl-talia-history');
  const copy=make('button','Copy research report','btn secondary');
  const reportStatus=make('p',undefined,'cl-talia-result');
  report.append(reportText,metrics,make('h4','Research checkpoints and recurring errors'),history,copy,reportStatus);
  rootEl.append(report);
  const nav=make('div',undefined,'cl-talia-nav');
  const previous=make('button','Previous research action','btn secondary');
  const next=make('button','Next research action','btn');
  const lab=make('a','Open the canonical nine-stage Learning Labs','btn secondary');
  lab.href='labs.html';nav.append(previous,next,lab);rootEl.append(nav);
  const footer=make('p','All guidance and ordinary retries are included for every member who can access this learning screen. The original Free watchlist still has 20 stored symbols. Advanced persistence, alerts and trade plans require separate entitlement. No Lumens are spent.','cl-talia-disclosure');
  rootEl.append(footer);
  let bars=C.fictional(caseId);
  function stopTyping(){if(typing!==null){root.clearInterval(typing);typing=null}}
  function showFull(){stopTyping();typingAt=transcript.textContent.length;narration.textContent=transcript.textContent;play.textContent='Replay written explanation'}
  const reduced=()=>root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  function runTyping(reset=false){
   stopTyping();if(reset){typingAt=0;narration.textContent=''}
   if(reduced()){showFull();return}
   play.textContent='Pause written explanation';
   typing=root.setInterval(()=>{
    if(!rootEl.isConnected){stopTyping();return}
    typingAt=Math.min(transcript.textContent.length,typingAt+4);
    narration.textContent=transcript.textContent.slice(0,typingAt);
    if(typingAt===transcript.textContent.length)showFull();
   },36);
  }
  play.addEventListener('click',()=>{
   if(typing!==null){stopTyping();play.textContent='Resume written explanation';return}
   runTyping(typingAt>=transcript.textContent.length);
  });
  full.addEventListener('click',showFull);
  function currentStep(){return C.STEPS[step]}
  const recent=()=>checkpoints.filter(x=>x.topic===topicId&&x.step===currentStep()&&x.fictionalCase===caseId);
  function renderNarration(){
   const current=C.byId(topicId),stage=currentStep();
   indicator.textContent='Research action '+(step+1)+' of 8 · '+stage+
    ' · Primary skill dimension: '+dimension(stage);
   heading.textContent=current.title;
   transcript.textContent=C.stageText(current,stage);
   runTyping(true);
   cue.textContent=C.prompt(current,stage)+' Record at least 25 characters of reasoning; an unresolved question is a valid response.';
   previous.disabled=step===0;next.disabled=step===7;
   const saved=recent();
   response.value=saved.length?saved[saved.length-1].answer:'';
   mistake.value=saved.length?saved[saved.length-1].mistake:'NONE';
   result.textContent=saved.length?'Prior in-session checkpoint preserved. Edits create another chronological revision.':'Not yet recorded for this action.';
   more.replaceChildren();
  }
  function extraText(kind){
   const t=C.byId(topicId);
   return kind==='depth'?
    'More depth — '+t.definition+' Worked case: '+t.worked+
    ' Verify source and mathematical assumptions: '+t.investigate+
    ' Common wrong approach: '+t.contradiction+
    ' Why it matters: a visual pattern or indicator is not an order, a verified source, or a known future outcome.':
    'Independent transfer — '+t.transfer+
    ' Use a fresh fictional chart or a separately time-stamped issuer source. Explain what is known, absent and contrary before deciding.';
  }
  deeper.addEventListener('click',()=>{
   const p=make('p',extraText('depth'));more.append(p);
  });
  example.addEventListener('click',()=>{
   more.append(make('p',extraText('transfer')));
  });
  topics.addEventListener('change',()=>{
   topicId=topics.value;step=0;renderNarration();renderReport();
  });
  scenarios.addEventListener('change',()=>{
   caseId=scenarios.value;bars=C.fictional(caseId);visible=12;draw();
  });
  overlay.addEventListener('change',()=>{seriesMode=overlay.value;draw()});
  function reveal(){
   if(visible>=bars.length)return;
   if(currentStep()==='Practice'&&!recent().some(x=>x.cutoff===visible)){
    result.textContent='Document your initial practice observation before viewing another fictional candle.';
    response.focus();return;
   }
   reveals.push({topic:topicId,at:new Date().toISOString(),cutoff:visible});
   visible+=1;draw();renderReport();
  }
  nextCandle.addEventListener('click',reveal);
  restart.addEventListener('click',()=>{visible=12;draw()});
  previous.addEventListener('click',()=>{if(step>0){step--;renderNarration()}});
  next.addEventListener('click',()=>{if(step<7){step++;renderNarration()}});
  save.addEventListener('click',()=>{
   const value=response.value.trim();
   if(value.length<25){result.textContent='Please record at least 25 characters. You may describe missing information, WATCH, REJECT or NO TRADE; retries are free.';return}
   const event={topic:topicId,step:currentStep(),dimension:dimension(currentStep()),
    answer:value.slice(0,1400),mistake:mistake.value,symbol:selectedSymbol,cutoff:visible,
    fictionalCase:caseId,at:new Date().toISOString()};
   const prior=recent()[0];
   checkpoints.push(event);
   if(prior)revisions.push({topic:topicId,step:event.step,at:event.at});
   result.textContent='Research practice recorded for this browser session at '+event.at+'. Not an independently graded answer or persistent watchlist save.';
   renderReport();
  });
  retry.addEventListener('click',()=>{
   more.append(make('p',extraText('depth')));
   result.textContent='Try again using clearer evidence, source time, alternative interpretation and invalidation. Additional attempts are free.';
   response.focus();
  });
  function renderReport(){
   metrics.replaceChildren();history.replaceChildren();
   for(const dim of C.DIMS){
    const matching=checkpoints.filter(x=>x.dimension===dim);
    const box=make('div',undefined,'cl-talia-metric');
    box.append(make('strong',dim),make('span',matching.length+' recorded research attempt'+(matching.length===1?'':'s')));
    metrics.append(box);
   }
   const mistakes=new Map();
   for(const entry of checkpoints){
    if(entry.mistake!=='NONE')mistakes.set(entry.mistake,(mistakes.get(entry.mistake)||0)+1);
   }
   const unique=new Set(checkpoints.map(x=>x.topic+'|'+x.step));
   reportText.textContent='Ungraded member-session evidence · '+unique.size+' distinct subject/action checkpoints across '+
    new Set(checkpoints.map(x=>x.topic)).size+' subjects · '+revisions.length+' written revisions · '+
    reveals.length+' fictional bar reveals · '+selectedRecordCount+' member-owned watchlist records available on this page. '+
    'Not Yet Assessed remains the only formal mastery status shown here.';
   if(!checkpoints.length)history.append(make('li','No practice checkpoints yet. Start with Observe.'));
   for(const [key,count] of mistakes){
    history.append(make('li',key.replaceAll('_',' ')+' noted '+count+' time'+(count===1?'':'s')+'. Revisit Talia’s explanations and the related Lab.'));
   }
   for(const x of checkpoints.slice(-10).reverse()){
    history.append(make('li',x.at+' · '+C.byId(x.topic).title+' · '+x.step+' · '+
     'evidence cutoff: fictional bar '+x.cutoff+' · '+(x.mistake==='NONE'?'No misconception selected':x.mistake.replaceAll('_',' '))));
   }
  }
  function reportString(){
   return [
    'Crownlight Talia — Watchlist Research Report (UNGRADED, IN-SESSION)',
    'Generated '+new Date().toISOString(),'Source: member-entered fictional educational exercises, not market data',
    'No official assessment grade, trade outcome or entitlement is implied.',
    'Advanced records seen: '+selectedRecordCount,
    ...C.DIMS.map(d=>d+': '+checkpoints.filter(x=>x.dimension===d).length+' practice checkpoint(s)'),
    ...checkpoints.map(e=>[e.at,e.topic,e.step,e.dimension,e.fictionalCase,
     'symbol '+(e.symbol||'NONE'),'cutoff '+e.cutoff,'misconception '+e.mistake,'reasoning '+e.answer].join(' | '))
   ].join('\n');
  }
  copy.addEventListener('click',async()=>{
   try{
    if(!root.navigator?.clipboard?.writeText)throw Error('Copy unavailable');
    await root.navigator.clipboard.writeText(reportString());
    reportStatus.textContent='Copied the research report to your clipboard. It is not a persistent server-saved assessment.';
   }catch{
    reportStatus.textContent='Clipboard unavailable in this browser. Checkpoint history remains visible above; do not assume it was saved.';
   }
  });
  function draw(){
   if(disposed)return;
   const set=bars.slice(0,visible),closes=set.map(x=>x.close),names=set.map((_,i)=>'Bar '+(i+1));
   const latest=set[set.length-1];
   readout.textContent='Observed fictional candles '+visible+' / '+bars.length+' · Latest O $'+latest.open.toFixed(2)+
    ' · H $'+latest.high.toFixed(2)+' · L $'+latest.low.toFixed(2)+' · C $'+latest.close.toFixed(2)+
    ' · Volume '+latest.volume.toLocaleString()+' shares · Not market data.';
   priceTable.replaceChildren();
   const tr=make('tr');for(const txt of ['Open','High','Low','Close','Volume'])tr.append(make('th',txt));
   const val=make('tr');for(const n of [latest.open,latest.high,latest.low,latest.close])val.append(make('td','$'+n.toFixed(2)));
   val.append(make('td',latest.volume.toLocaleString()));priceTable.append(tr,val);
   nextCandle.disabled=visible===bars.length;
   if(!chart)return;
   const indicators=[],palette={up:'#31c6a2',down:'#e77b91',blue:'#8ec6ed',gold:'#f1c778'};
   const guides=[['H',latest.high,'#f1ca87'],['O',latest.open,'#83c9f4'],
    ['C',latest.close,'#daeefc'],['L',latest.low,'#eaa883']].map(([k,p,c])=>({
    yAxis:p,label:{show:true,formatter:k+' $'+p.toFixed(2),position:'end',color:c},
    lineStyle:{color:c,type:'dashed',width:1}}));
   const price={name:'Fictional OHLC',type:'candlestick',xAxisIndex:0,yAxisIndex:0,
    data:set.map(x=>[x.open,x.close,x.low,x.high]),barMaxWidth:16,
    itemStyle:{color:palette.up,color0:palette.down,borderColor:palette.up,borderColor0:palette.down},
    markLine:{silent:true,symbol:['none','none'],animation:false,data:guides}};
   indicators.push(price);
   const volume={name:'Fictional volume',type:'bar',xAxisIndex:1,yAxisIndex:1,
    data:set.map(x=>({value:x.volume,itemStyle:{color:x.close>=x.open?palette.up:palette.down}}))};
   indicators.push(volume);
   let modeText='OHLCV only · no indicator is independently predictive.';
   if(seriesMode==='ema'){
    for(const n of [9,20]){
     indicators.push({name:'EMA '+n,type:'line',data:C.ema(closes,n),xAxisIndex:0,yAxisIndex:0,
      showSymbol:false,connectNulls:false,lineStyle:{width:2,color:n===9?palette.gold:palette.blue}});
    }
    modeText='EMA 9/20: seed after 9/20 completed closes. Lagging context, not an entry trigger.';
   }else if(seriesMode==='vwap'){
    indicators.push({name:'Bar-based session VWAP',type:'line',data:C.vwap(set),xAxisIndex:0,yAxisIndex:0,
     showSymbol:false,lineStyle:{width:2,color:palette.gold}});
    modeText='Approximate bar-typical-price VWAP; not trade-by-trade execution VWAP.';
   }else if(seriesMode==='bollinger'){
    const bands=C.bollinger(closes);
    for(const [key,label,color] of [['upper','Upper band',palette.blue],['middle','SMA 20',palette.gold],['lower','Lower band',palette.blue]]){
     indicators.push({name:label,type:'line',data:bands.map(x=>x?x[key]:null),xAxisIndex:0,yAxisIndex:0,
      showSymbol:false,lineStyle:{width:key==='middle'?2:1.4,type:key==='middle'?'solid':'dashed',color}});
    }
    modeText='Bollinger 20 ± 2 population SD; not a mechanical buy/sell signal.';
   }else if(seriesMode==='rsi'){
    const data=C.rsi(closes,14);
    indicators.push({name:'RSI 14',type:'line',data,xAxisIndex:2,yAxisIndex:2,
     showSymbol:false,connectNulls:false,lineStyle:{color:palette.gold,width:2}});
    modeText='Wilder RSI 14 (0–100); no plotted value before 14 changes.';
   }else if(seriesMode==='macd'){
    const m=C.macd(closes);
    for(const [key,label,color] of [['line','MACD',palette.gold],['signal','Signal 9',palette.blue]]){
     indicators.push({name:label,type:'line',data:m[key],xAxisIndex:2,yAxisIndex:2,
      showSymbol:false,connectNulls:false,lineStyle:{color,width:2}});
    }
    indicators.push({name:'Histogram',type:'bar',data:m.hist,xAxisIndex:2,yAxisIndex:2,
     itemStyle:{color:palette.up}});
    modeText='MACD 12/26/9 uses completed closes; signal line needs 9 valid MACD observations.';
   }
   const hasLower=['rsi','macd'].includes(seriesMode);
   chart.setOption({animation:false,backgroundColor:'transparent',
    textStyle:{color:'#d6e7f1'},legend:{top:0,textStyle:{color:'#bad4e2'},type:'scroll'},
    tooltip:{trigger:'axis',confine:true,axisPointer:{type:'cross'}},
    grid:hasLower?
     [{left:62,right:103,top:44,height:'46%'},{left:62,right:103,top:'60%',height:'12%'},
      {left:62,right:103,top:'77%',height:'14%'}]:
     [{left:62,right:103,top:44,height:'66%'},{left:62,right:103,top:'78%',height:'15%'},
      {left:62,right:103,top:'77%',height:'14%'}],
    xAxis:[0,1,2].map(i=>({type:'category',data:names,gridIndex:i,show:i!==0&&((i===2&&hasLower)||(i===1&&!hasLower)),axisLabel:{color:'#b7cddd',hideOverlap:true}})),
    yAxis:[0,1,2].map(i=>({type:'value',gridIndex:i,scale:i!==1,min:i===1?0:undefined,
     axisLabel:{color:'#b7cddd'},splitLine:{lineStyle:{color:'#244154'}}})),
    series:indicators},{notMerge:true,lazyUpdate:false});
   const n=chartDiv.nextElementSibling;
   if(n?.classList.contains('cl-talia-indicator-caption'))n.textContent=modeText;
   else chartDiv.insertAdjacentElement('afterend',make('p',modeText,'cl-talia-indicator-caption'));
  }
  function reset(){stopTyping();checkpoints.length=0;revisions.length=0;reveals.length=0;selectedRecordCount=0;selectedSymbol='';activeSymbol.textContent='Current member-entered symbol: none selected.';topicId='building';step=0;caseId='trend';visible=12;seriesMode='none';
   topics.value=topicId;scenarios.value=caseId;overlay.value=seriesMode;bars=C.fictional('trend');
   response.value='';renderNarration();renderReport();draw();
  }
  function setRecords(records){if(disposed)return;selectedRecordCount=Array.isArray(records)?records.length:0;renderReport()}
  function focusRecord({symbol}={}){
   const value=String(symbol||'').trim().toUpperCase();
   if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(value))return false;
   selectedSymbol=value;
   activeSymbol.textContent='Current member-entered symbol: '+value+'. This is your research context only; fictional examples are NOT prices for '+value+'.';
   rootEl.scrollIntoView?.({block:'start',behavior:'smooth'});
   return true;
  }
  function dispose(){disposed=true;++epoch;stopTyping();resize?.disconnect();chart?.dispose();chart=null;checkpoints.length=0;revisions.length=0;reveals.length=0;rootEl.remove()}
  renderNarration();renderReport();draw();
  Promise.resolve().then(async()=>{
   try{
    if(disposed||!rootEl.isConnected)return;
    const engine=await root.CrownlightECharts?.load?.();
    if(disposed||!rootEl.isConnected||!engine)return;
    chart=engine.init(chartDiv,null,{renderer:'canvas'});
    if(typeof ResizeObserver!=='undefined'){
     resize=new ResizeObserver(()=>chart?.resize());resize.observe(chartDiv);
    }
    draw();
   }catch{chartDiv.textContent='Chart could not load. The OHLCV table and Talia’s written instruction remain available.'}
  });
  return Object.freeze({element:rootEl,reset,setRecords,focusRecord,dispose,reportString});
 }
 function mount({host,source='free',records=[]}={}){
  if(!host)return null;
  const prior=host._groundUpTaliaV4;
  if(prior)return prior;
  const instance=create({source,records});
  host.append(instance.element);
  host._groundUpTaliaV4=instance;
  return instance;
 }
 function mountFree(){
  const host=document.getElementById('free-watchlist-talia-v4-host');
  if(host)mount({host,source:'free'});
 }
 const API=Object.freeze({mount,mountFree,create,version:'4.0'});
 root.GroundUpTaliaWorkstationV4=API;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountFree,{once:true});
 else mountFree();
})(globalThis);
,5),st=numeric(rf,'Stop reference 
  const question=make('section',undefined,'cl-talia-prompt');
  question.append(make('h3','Talia’s decision checkpoint'));
  const cue=make('p');
  const response=make('textarea');response.rows=4;response.maxLength=1400;
  response.placeholder='Distinguish observed facts, uncertainties and what would change your conclusion.';
  response.setAttribute('aria-label','Your research reasoning and evidence');
  const mistakeLabel=make('label','Which misconception or research gap are you checking?');
  const mistake=select(['NONE','MISSING_SOURCE','FUTURE_KNOWLEDGE','INDICATOR_CERTAINTY','LIQUIDITY_RISK','NO_INVALIDATION','OTHER'],
   ['No specific problem identified','Unverified issuer / source','Using information from the future',
    'Treating an indicator as certain','Ignoring spread, borrow or liquidity',
    'Missing invalidation / risk plan','Other misconception']);
  mistakeLabel.append(mistake);
  const save=make('button','Record ungraded research checkpoint','btn');
  const retry=make('button','Retry with more instruction · Free','btn secondary');
  const result=make('p',undefined,'cl-talia-result');result.setAttribute('role','status');
  result.setAttribute('aria-live','polite');
  question.append(cue,response,mistakeLabel,save,retry,result);
  rootEl.append(question);
  const report=make('section',undefined,'cl-talia-report');
  report.append(make('h3','Your Talia Watchlist Research Report'));
  const reportText=make('p','This member-session report covers research practice, not official assessment mastery.');
  const metrics=make('div',undefined,'cl-talia-metrics');
  const history=make('ol',undefined,'cl-talia-history');
  const copy=make('button','Copy research report','btn secondary');
  const reportStatus=make('p',undefined,'cl-talia-result');
  report.append(reportText,metrics,make('h4','Research checkpoints and recurring errors'),history,copy,reportStatus);
  rootEl.append(report);
  const nav=make('div',undefined,'cl-talia-nav');
  const previous=make('button','Previous research action','btn secondary');
  const next=make('button','Next research action','btn');
  const lab=make('a','Open the canonical nine-stage Learning Labs','btn secondary');
  lab.href='labs.html';nav.append(previous,next,lab);rootEl.append(nav);
  const footer=make('p','All guidance and ordinary retries are included for every member who can access this learning screen. The original Free watchlist still has 20 stored symbols. Advanced persistence, alerts and trade plans require separate entitlement. No Lumens are spent.','cl-talia-disclosure');
  rootEl.append(footer);
  let bars=C.fictional(caseId);
  function stopTyping(){if(typing!==null){root.clearInterval(typing);typing=null}}
  function showFull(){stopTyping();typingAt=transcript.textContent.length;narration.textContent=transcript.textContent;play.textContent='Replay written explanation'}
  const reduced=()=>root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  function runTyping(reset=false){
   stopTyping();if(reset){typingAt=0;narration.textContent=''}
   if(reduced()){showFull();return}
   play.textContent='Pause written explanation';
   typing=root.setInterval(()=>{
    if(!rootEl.isConnected){stopTyping();return}
    typingAt=Math.min(transcript.textContent.length,typingAt+4);
    narration.textContent=transcript.textContent.slice(0,typingAt);
    if(typingAt===transcript.textContent.length)showFull();
   },36);
  }
  play.addEventListener('click',()=>{
   if(typing!==null){stopTyping();play.textContent='Resume written explanation';return}
   runTyping(typingAt>=transcript.textContent.length);
  });
  full.addEventListener('click',showFull);
  function currentStep(){return C.STEPS[step]}
  const recent=()=>checkpoints.filter(x=>x.topic===topicId&&x.step===currentStep()&&x.fictionalCase===caseId);
  function renderNarration(){
   const current=C.byId(topicId),stage=currentStep();
   indicator.textContent='Research action '+(step+1)+' of 8 · '+stage+
    ' · Primary skill dimension: '+dimension(stage);
   heading.textContent=current.title;
   transcript.textContent=C.stageText(current,stage);
   runTyping(true);
   cue.textContent=C.prompt(current,stage)+' Record at least 25 characters of reasoning; an unresolved question is a valid response.';
   previous.disabled=step===0;next.disabled=step===7;
   const saved=recent();
   response.value=saved.length?saved[saved.length-1].answer:'';
   mistake.value=saved.length?saved[saved.length-1].mistake:'NONE';
   result.textContent=saved.length?'Prior in-session checkpoint preserved. Edits create another chronological revision.':'Not yet recorded for this action.';
   more.replaceChildren();
  }
  function extraText(kind){
   const t=C.byId(topicId);
   return kind==='depth'?
    'More depth — '+t.definition+' Worked case: '+t.worked+
    ' Verify source and mathematical assumptions: '+t.investigate+
    ' Common wrong approach: '+t.contradiction+
    ' Why it matters: a visual pattern or indicator is not an order, a verified source, or a known future outcome.':
    'Independent transfer — '+t.transfer+
    ' Use a fresh fictional chart or a separately time-stamped issuer source. Explain what is known, absent and contrary before deciding.';
  }
  deeper.addEventListener('click',()=>{
   const p=make('p',extraText('depth'));more.append(p);
  });
  example.addEventListener('click',()=>{
   more.append(make('p',extraText('transfer')));
  });
  topics.addEventListener('change',()=>{
   topicId=topics.value;step=0;renderNarration();renderReport();
  });
  scenarios.addEventListener('change',()=>{
   caseId=scenarios.value;bars=C.fictional(caseId);visible=12;draw();
  });
  overlay.addEventListener('change',()=>{seriesMode=overlay.value;draw()});
  function reveal(){
   if(visible>=bars.length)return;
   if(currentStep()==='Practice'&&!recent().some(x=>x.cutoff===visible)){
    result.textContent='Document your initial practice observation before viewing another fictional candle.';
    response.focus();return;
   }
   reveals.push({topic:topicId,at:new Date().toISOString(),cutoff:visible});
   visible+=1;draw();renderReport();
  }
  nextCandle.addEventListener('click',reveal);
  restart.addEventListener('click',()=>{visible=12;draw()});
  previous.addEventListener('click',()=>{if(step>0){step--;renderNarration()}});
  next.addEventListener('click',()=>{if(step<7){step++;renderNarration()}});
  save.addEventListener('click',()=>{
   const value=response.value.trim();
   if(value.length<25){result.textContent='Please record at least 25 characters. You may describe missing information, WATCH, REJECT or NO TRADE; retries are free.';return}
   const event={topic:topicId,step:currentStep(),dimension:dimension(currentStep()),
    answer:value.slice(0,1400),mistake:mistake.value,symbol:selectedSymbol,cutoff:visible,
    fictionalCase:caseId,at:new Date().toISOString()};
   const prior=recent()[0];
   checkpoints.push(event);
   if(prior)revisions.push({topic:topicId,step:event.step,at:event.at});
   result.textContent='Research practice recorded for this browser session at '+event.at+'. Not an independently graded answer or persistent watchlist save.';
   renderReport();
  });
  retry.addEventListener('click',()=>{
   more.append(make('p',extraText('depth')));
   result.textContent='Try again using clearer evidence, source time, alternative interpretation and invalidation. Additional attempts are free.';
   response.focus();
  });
  function renderReport(){
   metrics.replaceChildren();history.replaceChildren();
   for(const dim of C.DIMS){
    const matching=checkpoints.filter(x=>x.dimension===dim);
    const box=make('div',undefined,'cl-talia-metric');
    box.append(make('strong',dim),make('span',matching.length+' recorded research attempt'+(matching.length===1?'':'s')));
    metrics.append(box);
   }
   const mistakes=new Map();
   for(const entry of checkpoints){
    if(entry.mistake!=='NONE')mistakes.set(entry.mistake,(mistakes.get(entry.mistake)||0)+1);
   }
   const unique=new Set(checkpoints.map(x=>x.topic+'|'+x.step));
   reportText.textContent='Ungraded member-session evidence · '+unique.size+' distinct subject/action checkpoints across '+
    new Set(checkpoints.map(x=>x.topic)).size+' subjects · '+revisions.length+' written revisions · '+
    reveals.length+' fictional bar reveals · '+selectedRecordCount+' member-owned watchlist records available on this page. '+
    'Not Yet Assessed remains the only formal mastery status shown here.';
   if(!checkpoints.length)history.append(make('li','No practice checkpoints yet. Start with Observe.'));
   for(const [key,count] of mistakes){
    history.append(make('li',key.replaceAll('_',' ')+' noted '+count+' time'+(count===1?'':'s')+'. Revisit Talia’s explanations and the related Lab.'));
   }
   for(const x of checkpoints.slice(-10).reverse()){
    history.append(make('li',x.at+' · '+C.byId(x.topic).title+' · '+x.step+' · '+
     'evidence cutoff: fictional bar '+x.cutoff+' · '+(x.mistake==='NONE'?'No misconception selected':x.mistake.replaceAll('_',' '))));
   }
  }
  function reportString(){
   return [
    'Crownlight Talia — Watchlist Research Report (UNGRADED, IN-SESSION)',
    'Generated '+new Date().toISOString(),'Source: member-entered fictional educational exercises, not market data',
    'No official assessment grade, trade outcome or entitlement is implied.',
    'Advanced records seen: '+selectedRecordCount,
    ...C.DIMS.map(d=>d+': '+checkpoints.filter(x=>x.dimension===d).length+' practice checkpoint(s)'),
    ...checkpoints.map(e=>[e.at,e.topic,e.step,e.dimension,e.fictionalCase,
     'symbol '+(e.symbol||'NONE'),'cutoff '+e.cutoff,'misconception '+e.mistake,'reasoning '+e.answer].join(' | '))
   ].join('\n');
  }
  copy.addEventListener('click',async()=>{
   try{
    if(!root.navigator?.clipboard?.writeText)throw Error('Copy unavailable');
    await root.navigator.clipboard.writeText(reportString());
    reportStatus.textContent='Copied the research report to your clipboard. It is not a persistent server-saved assessment.';
   }catch{
    reportStatus.textContent='Clipboard unavailable in this browser. Checkpoint history remains visible above; do not assume it was saved.';
   }
  });
  function draw(){
   if(disposed)return;
   const set=bars.slice(0,visible),closes=set.map(x=>x.close),names=set.map((_,i)=>'Bar '+(i+1));
   const latest=set[set.length-1];
   readout.textContent='Observed fictional candles '+visible+' / '+bars.length+' · Latest O $'+latest.open.toFixed(2)+
    ' · H $'+latest.high.toFixed(2)+' · L $'+latest.low.toFixed(2)+' · C $'+latest.close.toFixed(2)+
    ' · Volume '+latest.volume.toLocaleString()+' shares · Not market data.';
   priceTable.replaceChildren();
   const tr=make('tr');for(const txt of ['Open','High','Low','Close','Volume'])tr.append(make('th',txt));
   const val=make('tr');for(const n of [latest.open,latest.high,latest.low,latest.close])val.append(make('td','$'+n.toFixed(2)));
   val.append(make('td',latest.volume.toLocaleString()));priceTable.append(tr,val);
   nextCandle.disabled=visible===bars.length;
   if(!chart)return;
   const indicators=[],palette={up:'#31c6a2',down:'#e77b91',blue:'#8ec6ed',gold:'#f1c778'};
   const guides=[['H',latest.high,'#f1ca87'],['O',latest.open,'#83c9f4'],
    ['C',latest.close,'#daeefc'],['L',latest.low,'#eaa883']].map(([k,p,c])=>({
    yAxis:p,label:{show:true,formatter:k+' $'+p.toFixed(2),position:'end',color:c},
    lineStyle:{color:c,type:'dashed',width:1}}));
   const price={name:'Fictional OHLC',type:'candlestick',xAxisIndex:0,yAxisIndex:0,
    data:set.map(x=>[x.open,x.close,x.low,x.high]),barMaxWidth:16,
    itemStyle:{color:palette.up,color0:palette.down,borderColor:palette.up,borderColor0:palette.down},
    markLine:{silent:true,symbol:['none','none'],animation:false,data:guides}};
   indicators.push(price);
   const volume={name:'Fictional volume',type:'bar',xAxisIndex:1,yAxisIndex:1,
    data:set.map(x=>({value:x.volume,itemStyle:{color:x.close>=x.open?palette.up:palette.down}}))};
   indicators.push(volume);
   let modeText='OHLCV only · no indicator is independently predictive.';
   if(seriesMode==='ema'){
    for(const n of [9,20]){
     indicators.push({name:'EMA '+n,type:'line',data:C.ema(closes,n),xAxisIndex:0,yAxisIndex:0,
      showSymbol:false,connectNulls:false,lineStyle:{width:2,color:n===9?palette.gold:palette.blue}});
    }
    modeText='EMA 9/20: seed after 9/20 completed closes. Lagging context, not an entry trigger.';
   }else if(seriesMode==='vwap'){
    indicators.push({name:'Bar-based session VWAP',type:'line',data:C.vwap(set),xAxisIndex:0,yAxisIndex:0,
     showSymbol:false,lineStyle:{width:2,color:palette.gold}});
    modeText='Approximate bar-typical-price VWAP; not trade-by-trade execution VWAP.';
   }else if(seriesMode==='bollinger'){
    const bands=C.bollinger(closes);
    for(const [key,label,color] of [['upper','Upper band',palette.blue],['middle','SMA 20',palette.gold],['lower','Lower band',palette.blue]]){
     indicators.push({name:label,type:'line',data:bands.map(x=>x?x[key]:null),xAxisIndex:0,yAxisIndex:0,
      showSymbol:false,lineStyle:{width:key==='middle'?2:1.4,type:key==='middle'?'solid':'dashed',color}});
    }
    modeText='Bollinger 20 ± 2 population SD; not a mechanical buy/sell signal.';
   }else if(seriesMode==='rsi'){
    const data=C.rsi(closes,14);
    indicators.push({name:'RSI 14',type:'line',data,xAxisIndex:2,yAxisIndex:2,
     showSymbol:false,connectNulls:false,lineStyle:{color:palette.gold,width:2}});
    modeText='Wilder RSI 14 (0–100); no plotted value before 14 changes.';
   }else if(seriesMode==='macd'){
    const m=C.macd(closes);
    for(const [key,label,color] of [['line','MACD',palette.gold],['signal','Signal 9',palette.blue]]){
     indicators.push({name:label,type:'line',data:m[key],xAxisIndex:2,yAxisIndex:2,
      showSymbol:false,connectNulls:false,lineStyle:{color,width:2}});
    }
    indicators.push({name:'Histogram',type:'bar',data:m.hist,xAxisIndex:2,yAxisIndex:2,
     itemStyle:{color:palette.up}});
    modeText='MACD 12/26/9 uses completed closes; signal line needs 9 valid MACD observations.';
   }
   const hasLower=['rsi','macd'].includes(seriesMode);
   chart.setOption({animation:false,backgroundColor:'transparent',
    textStyle:{color:'#d6e7f1'},legend:{top:0,textStyle:{color:'#bad4e2'},type:'scroll'},
    tooltip:{trigger:'axis',confine:true,axisPointer:{type:'cross'}},
    grid:hasLower?
     [{left:62,right:103,top:44,height:'46%'},{left:62,right:103,top:'60%',height:'12%'},
      {left:62,right:103,top:'77%',height:'14%'}]:
     [{left:62,right:103,top:44,height:'66%'},{left:62,right:103,top:'78%',height:'15%'},
      {left:62,right:103,top:'77%',height:'14%'}],
    xAxis:[0,1,2].map(i=>({type:'category',data:names,gridIndex:i,show:i!==0&&((i===2&&hasLower)||(i===1&&!hasLower)),axisLabel:{color:'#b7cddd',hideOverlap:true}})),
    yAxis:[0,1,2].map(i=>({type:'value',gridIndex:i,scale:i!==1,min:i===1?0:undefined,
     axisLabel:{color:'#b7cddd'},splitLine:{lineStyle:{color:'#244154'}}})),
    series:indicators},{notMerge:true,lazyUpdate:false});
   const n=chartDiv.nextElementSibling;
   if(n?.classList.contains('cl-talia-indicator-caption'))n.textContent=modeText;
   else chartDiv.insertAdjacentElement('afterend',make('p',modeText,'cl-talia-indicator-caption'));
  }
  function reset(){stopTyping();checkpoints.length=0;revisions.length=0;reveals.length=0;selectedRecordCount=0;selectedSymbol='';activeSymbol.textContent='Current member-entered symbol: none selected.';topicId='building';step=0;caseId='trend';visible=12;seriesMode='none';
   topics.value=topicId;scenarios.value=caseId;overlay.value=seriesMode;bars=C.fictional('trend');
   response.value='';renderNarration();renderReport();draw();
  }
  function setRecords(records){if(disposed)return;selectedRecordCount=Array.isArray(records)?records.length:0;renderReport()}
  function focusRecord({symbol}={}){
   const value=String(symbol||'').trim().toUpperCase();
   if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(value))return false;
   selectedSymbol=value;
   activeSymbol.textContent='Current member-entered symbol: '+value+'. This is your research context only; fictional examples are NOT prices for '+value+'.';
   rootEl.scrollIntoView?.({block:'start',behavior:'smooth'});
   return true;
  }
  function dispose(){disposed=true;++epoch;stopTyping();resize?.disconnect();chart?.dispose();chart=null;checkpoints.length=0;revisions.length=0;reveals.length=0;rootEl.remove()}
  renderNarration();renderReport();draw();
  Promise.resolve().then(async()=>{
   try{
    if(disposed||!rootEl.isConnected)return;
    const engine=await root.CrownlightECharts?.load?.();
    if(disposed||!rootEl.isConnected||!engine)return;
    chart=engine.init(chartDiv,null,{renderer:'canvas'});
    if(typeof ResizeObserver!=='undefined'){
     resize=new ResizeObserver(()=>chart?.resize());resize.observe(chartDiv);
    }
    draw();
   }catch{chartDiv.textContent='Chart could not load. The OHLCV table and Talia’s written instruction remain available.'}
  });
  return Object.freeze({element:rootEl,reset,setRecords,focusRecord,dispose,reportString});
 }
 function mount({host,source='free',records=[]}={}){
  if(!host)return null;
  const prior=host._groundUpTaliaV4;
  if(prior)return prior;
  const instance=create({source,records});
  host.append(instance.element);
  host._groundUpTaliaV4=instance;
  return instance;
 }
 function mountFree(){
  const host=document.getElementById('free-watchlist-talia-v4-host');
  if(host)mount({host,source:'free'});
 }
 const API=Object.freeze({mount,mountFree,create,version:'4.0'});
 root.GroundUpTaliaWorkstationV4=API;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountFree,{once:true});
 else mountFree();
})(globalThis);
,4.8),
   b=numeric(rf,'Modeled loss budget 
  const question=make('section',undefined,'cl-talia-prompt');
  question.append(make('h3','Talia’s decision checkpoint'));
  const cue=make('p');
  const response=make('textarea');response.rows=4;response.maxLength=1400;
  response.placeholder='Distinguish observed facts, uncertainties and what would change your conclusion.';
  response.setAttribute('aria-label','Your research reasoning and evidence');
  const mistakeLabel=make('label','Which misconception or research gap are you checking?');
  const mistake=select(['NONE','MISSING_SOURCE','FUTURE_KNOWLEDGE','INDICATOR_CERTAINTY','LIQUIDITY_RISK','NO_INVALIDATION','OTHER'],
   ['No specific problem identified','Unverified issuer / source','Using information from the future',
    'Treating an indicator as certain','Ignoring spread, borrow or liquidity',
    'Missing invalidation / risk plan','Other misconception']);
  mistakeLabel.append(mistake);
  const save=make('button','Record ungraded research checkpoint','btn');
  const retry=make('button','Retry with more instruction · Free','btn secondary');
  const result=make('p',undefined,'cl-talia-result');result.setAttribute('role','status');
  result.setAttribute('aria-live','polite');
  question.append(cue,response,mistakeLabel,save,retry,result);
  rootEl.append(question);
  const report=make('section',undefined,'cl-talia-report');
  report.append(make('h3','Your Talia Watchlist Research Report'));
  const reportText=make('p','This member-session report covers research practice, not official assessment mastery.');
  const metrics=make('div',undefined,'cl-talia-metrics');
  const history=make('ol',undefined,'cl-talia-history');
  const copy=make('button','Copy research report','btn secondary');
  const reportStatus=make('p',undefined,'cl-talia-result');
  report.append(reportText,metrics,make('h4','Research checkpoints and recurring errors'),history,copy,reportStatus);
  rootEl.append(report);
  const nav=make('div',undefined,'cl-talia-nav');
  const previous=make('button','Previous research action','btn secondary');
  const next=make('button','Next research action','btn');
  const lab=make('a','Open the canonical nine-stage Learning Labs','btn secondary');
  lab.href='labs.html';nav.append(previous,next,lab);rootEl.append(nav);
  const footer=make('p','All guidance and ordinary retries are included for every member who can access this learning screen. The original Free watchlist still has 20 stored symbols. Advanced persistence, alerts and trade plans require separate entitlement. No Lumens are spent.','cl-talia-disclosure');
  rootEl.append(footer);
  let bars=C.fictional(caseId);
  function stopTyping(){if(typing!==null){root.clearInterval(typing);typing=null}}
  function showFull(){stopTyping();typingAt=transcript.textContent.length;narration.textContent=transcript.textContent;play.textContent='Replay written explanation'}
  const reduced=()=>root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  function runTyping(reset=false){
   stopTyping();if(reset){typingAt=0;narration.textContent=''}
   if(reduced()){showFull();return}
   play.textContent='Pause written explanation';
   typing=root.setInterval(()=>{
    if(!rootEl.isConnected){stopTyping();return}
    typingAt=Math.min(transcript.textContent.length,typingAt+4);
    narration.textContent=transcript.textContent.slice(0,typingAt);
    if(typingAt===transcript.textContent.length)showFull();
   },36);
  }
  play.addEventListener('click',()=>{
   if(typing!==null){stopTyping();play.textContent='Resume written explanation';return}
   runTyping(typingAt>=transcript.textContent.length);
  });
  full.addEventListener('click',showFull);
  function currentStep(){return C.STEPS[step]}
  const recent=()=>checkpoints.filter(x=>x.topic===topicId&&x.step===currentStep()&&x.fictionalCase===caseId);
  function renderNarration(){
   const current=C.byId(topicId),stage=currentStep();
   indicator.textContent='Research action '+(step+1)+' of 8 · '+stage+
    ' · Primary skill dimension: '+dimension(stage);
   heading.textContent=current.title;
   transcript.textContent=C.stageText(current,stage);
   runTyping(true);
   cue.textContent=C.prompt(current,stage)+' Record at least 25 characters of reasoning; an unresolved question is a valid response.';
   previous.disabled=step===0;next.disabled=step===7;
   const saved=recent();
   response.value=saved.length?saved[saved.length-1].answer:'';
   mistake.value=saved.length?saved[saved.length-1].mistake:'NONE';
   result.textContent=saved.length?'Prior in-session checkpoint preserved. Edits create another chronological revision.':'Not yet recorded for this action.';
   more.replaceChildren();
  }
  function extraText(kind){
   const t=C.byId(topicId);
   return kind==='depth'?
    'More depth — '+t.definition+' Worked case: '+t.worked+
    ' Verify source and mathematical assumptions: '+t.investigate+
    ' Common wrong approach: '+t.contradiction+
    ' Why it matters: a visual pattern or indicator is not an order, a verified source, or a known future outcome.':
    'Independent transfer — '+t.transfer+
    ' Use a fresh fictional chart or a separately time-stamped issuer source. Explain what is known, absent and contrary before deciding.';
  }
  deeper.addEventListener('click',()=>{
   const p=make('p',extraText('depth'));more.append(p);
  });
  example.addEventListener('click',()=>{
   more.append(make('p',extraText('transfer')));
  });
  topics.addEventListener('change',()=>{
   topicId=topics.value;step=0;renderNarration();renderReport();
  });
  scenarios.addEventListener('change',()=>{
   caseId=scenarios.value;bars=C.fictional(caseId);visible=12;draw();
  });
  overlay.addEventListener('change',()=>{seriesMode=overlay.value;draw()});
  function reveal(){
   if(visible>=bars.length)return;
   if(currentStep()==='Practice'&&!recent().some(x=>x.cutoff===visible)){
    result.textContent='Document your initial practice observation before viewing another fictional candle.';
    response.focus();return;
   }
   reveals.push({topic:topicId,at:new Date().toISOString(),cutoff:visible});
   visible+=1;draw();renderReport();
  }
  nextCandle.addEventListener('click',reveal);
  restart.addEventListener('click',()=>{visible=12;draw()});
  previous.addEventListener('click',()=>{if(step>0){step--;renderNarration()}});
  next.addEventListener('click',()=>{if(step<7){step++;renderNarration()}});
  save.addEventListener('click',()=>{
   const value=response.value.trim();
   if(value.length<25){result.textContent='Please record at least 25 characters. You may describe missing information, WATCH, REJECT or NO TRADE; retries are free.';return}
   const event={topic:topicId,step:currentStep(),dimension:dimension(currentStep()),
    answer:value.slice(0,1400),mistake:mistake.value,symbol:selectedSymbol,cutoff:visible,
    fictionalCase:caseId,at:new Date().toISOString()};
   const prior=recent()[0];
   checkpoints.push(event);
   if(prior)revisions.push({topic:topicId,step:event.step,at:event.at});
   result.textContent='Research practice recorded for this browser session at '+event.at+'. Not an independently graded answer or persistent watchlist save.';
   renderReport();
  });
  retry.addEventListener('click',()=>{
   more.append(make('p',extraText('depth')));
   result.textContent='Try again using clearer evidence, source time, alternative interpretation and invalidation. Additional attempts are free.';
   response.focus();
  });
  function renderReport(){
   metrics.replaceChildren();history.replaceChildren();
   for(const dim of C.DIMS){
    const matching=checkpoints.filter(x=>x.dimension===dim);
    const box=make('div',undefined,'cl-talia-metric');
    box.append(make('strong',dim),make('span',matching.length+' recorded research attempt'+(matching.length===1?'':'s')));
    metrics.append(box);
   }
   const mistakes=new Map();
   for(const entry of checkpoints){
    if(entry.mistake!=='NONE')mistakes.set(entry.mistake,(mistakes.get(entry.mistake)||0)+1);
   }
   const unique=new Set(checkpoints.map(x=>x.topic+'|'+x.step));
   reportText.textContent='Ungraded member-session evidence · '+unique.size+' distinct subject/action checkpoints across '+
    new Set(checkpoints.map(x=>x.topic)).size+' subjects · '+revisions.length+' written revisions · '+
    reveals.length+' fictional bar reveals · '+selectedRecordCount+' member-owned watchlist records available on this page. '+
    'Not Yet Assessed remains the only formal mastery status shown here.';
   if(!checkpoints.length)history.append(make('li','No practice checkpoints yet. Start with Observe.'));
   for(const [key,count] of mistakes){
    history.append(make('li',key.replaceAll('_',' ')+' noted '+count+' time'+(count===1?'':'s')+'. Revisit Talia’s explanations and the related Lab.'));
   }
   for(const x of checkpoints.slice(-10).reverse()){
    history.append(make('li',x.at+' · '+C.byId(x.topic).title+' · '+x.step+' · '+
     'evidence cutoff: fictional bar '+x.cutoff+' · '+(x.mistake==='NONE'?'No misconception selected':x.mistake.replaceAll('_',' '))));
   }
  }
  function reportString(){
   return [
    'Crownlight Talia — Watchlist Research Report (UNGRADED, IN-SESSION)',
    'Generated '+new Date().toISOString(),'Source: member-entered fictional educational exercises, not market data',
    'No official assessment grade, trade outcome or entitlement is implied.',
    'Advanced records seen: '+selectedRecordCount,
    ...C.DIMS.map(d=>d+': '+checkpoints.filter(x=>x.dimension===d).length+' practice checkpoint(s)'),
    ...checkpoints.map(e=>[e.at,e.topic,e.step,e.dimension,e.fictionalCase,
     'symbol '+(e.symbol||'NONE'),'cutoff '+e.cutoff,'misconception '+e.mistake,'reasoning '+e.answer].join(' | '))
   ].join('\n');
  }
  copy.addEventListener('click',async()=>{
   try{
    if(!root.navigator?.clipboard?.writeText)throw Error('Copy unavailable');
    await root.navigator.clipboard.writeText(reportString());
    reportStatus.textContent='Copied the research report to your clipboard. It is not a persistent server-saved assessment.';
   }catch{
    reportStatus.textContent='Clipboard unavailable in this browser. Checkpoint history remains visible above; do not assume it was saved.';
   }
  });
  function draw(){
   if(disposed)return;
   const set=bars.slice(0,visible),closes=set.map(x=>x.close),names=set.map((_,i)=>'Bar '+(i+1));
   const latest=set[set.length-1];
   readout.textContent='Observed fictional candles '+visible+' / '+bars.length+' · Latest O $'+latest.open.toFixed(2)+
    ' · H $'+latest.high.toFixed(2)+' · L $'+latest.low.toFixed(2)+' · C $'+latest.close.toFixed(2)+
    ' · Volume '+latest.volume.toLocaleString()+' shares · Not market data.';
   priceTable.replaceChildren();
   const tr=make('tr');for(const txt of ['Open','High','Low','Close','Volume'])tr.append(make('th',txt));
   const val=make('tr');for(const n of [latest.open,latest.high,latest.low,latest.close])val.append(make('td','$'+n.toFixed(2)));
   val.append(make('td',latest.volume.toLocaleString()));priceTable.append(tr,val);
   nextCandle.disabled=visible===bars.length;
   if(!chart)return;
   const indicators=[],palette={up:'#31c6a2',down:'#e77b91',blue:'#8ec6ed',gold:'#f1c778'};
   const guides=[['H',latest.high,'#f1ca87'],['O',latest.open,'#83c9f4'],
    ['C',latest.close,'#daeefc'],['L',latest.low,'#eaa883']].map(([k,p,c])=>({
    yAxis:p,label:{show:true,formatter:k+' $'+p.toFixed(2),position:'end',color:c},
    lineStyle:{color:c,type:'dashed',width:1}}));
   const price={name:'Fictional OHLC',type:'candlestick',xAxisIndex:0,yAxisIndex:0,
    data:set.map(x=>[x.open,x.close,x.low,x.high]),barMaxWidth:16,
    itemStyle:{color:palette.up,color0:palette.down,borderColor:palette.up,borderColor0:palette.down},
    markLine:{silent:true,symbol:['none','none'],animation:false,data:guides}};
   indicators.push(price);
   const volume={name:'Fictional volume',type:'bar',xAxisIndex:1,yAxisIndex:1,
    data:set.map(x=>({value:x.volume,itemStyle:{color:x.close>=x.open?palette.up:palette.down}}))};
   indicators.push(volume);
   let modeText='OHLCV only · no indicator is independently predictive.';
   if(seriesMode==='ema'){
    for(const n of [9,20]){
     indicators.push({name:'EMA '+n,type:'line',data:C.ema(closes,n),xAxisIndex:0,yAxisIndex:0,
      showSymbol:false,connectNulls:false,lineStyle:{width:2,color:n===9?palette.gold:palette.blue}});
    }
    modeText='EMA 9/20: seed after 9/20 completed closes. Lagging context, not an entry trigger.';
   }else if(seriesMode==='vwap'){
    indicators.push({name:'Bar-based session VWAP',type:'line',data:C.vwap(set),xAxisIndex:0,yAxisIndex:0,
     showSymbol:false,lineStyle:{width:2,color:palette.gold}});
    modeText='Approximate bar-typical-price VWAP; not trade-by-trade execution VWAP.';
   }else if(seriesMode==='bollinger'){
    const bands=C.bollinger(closes);
    for(const [key,label,color] of [['upper','Upper band',palette.blue],['middle','SMA 20',palette.gold],['lower','Lower band',palette.blue]]){
     indicators.push({name:label,type:'line',data:bands.map(x=>x?x[key]:null),xAxisIndex:0,yAxisIndex:0,
      showSymbol:false,lineStyle:{width:key==='middle'?2:1.4,type:key==='middle'?'solid':'dashed',color}});
    }
    modeText='Bollinger 20 ± 2 population SD; not a mechanical buy/sell signal.';
   }else if(seriesMode==='rsi'){
    const data=C.rsi(closes,14);
    indicators.push({name:'RSI 14',type:'line',data,xAxisIndex:2,yAxisIndex:2,
     showSymbol:false,connectNulls:false,lineStyle:{color:palette.gold,width:2}});
    modeText='Wilder RSI 14 (0–100); no plotted value before 14 changes.';
   }else if(seriesMode==='macd'){
    const m=C.macd(closes);
    for(const [key,label,color] of [['line','MACD',palette.gold],['signal','Signal 9',palette.blue]]){
     indicators.push({name:label,type:'line',data:m[key],xAxisIndex:2,yAxisIndex:2,
      showSymbol:false,connectNulls:false,lineStyle:{color,width:2}});
    }
    indicators.push({name:'Histogram',type:'bar',data:m.hist,xAxisIndex:2,yAxisIndex:2,
     itemStyle:{color:palette.up}});
    modeText='MACD 12/26/9 uses completed closes; signal line needs 9 valid MACD observations.';
   }
   const hasLower=['rsi','macd'].includes(seriesMode);
   chart.setOption({animation:false,backgroundColor:'transparent',
    textStyle:{color:'#d6e7f1'},legend:{top:0,textStyle:{color:'#bad4e2'},type:'scroll'},
    tooltip:{trigger:'axis',confine:true,axisPointer:{type:'cross'}},
    grid:hasLower?
     [{left:62,right:103,top:44,height:'46%'},{left:62,right:103,top:'60%',height:'12%'},
      {left:62,right:103,top:'77%',height:'14%'}]:
     [{left:62,right:103,top:44,height:'66%'},{left:62,right:103,top:'78%',height:'15%'},
      {left:62,right:103,top:'77%',height:'14%'}],
    xAxis:[0,1,2].map(i=>({type:'category',data:names,gridIndex:i,show:i!==0&&((i===2&&hasLower)||(i===1&&!hasLower)),axisLabel:{color:'#b7cddd',hideOverlap:true}})),
    yAxis:[0,1,2].map(i=>({type:'value',gridIndex:i,scale:i!==1,min:i===1?0:undefined,
     axisLabel:{color:'#b7cddd'},splitLine:{lineStyle:{color:'#244154'}}})),
    series:indicators},{notMerge:true,lazyUpdate:false});
   const n=chartDiv.nextElementSibling;
   if(n?.classList.contains('cl-talia-indicator-caption'))n.textContent=modeText;
   else chartDiv.insertAdjacentElement('afterend',make('p',modeText,'cl-talia-indicator-caption'));
  }
  function reset(){stopTyping();checkpoints.length=0;revisions.length=0;reveals.length=0;selectedRecordCount=0;selectedSymbol='';activeSymbol.textContent='Current member-entered symbol: none selected.';topicId='building';step=0;caseId='trend';visible=12;seriesMode='none';
   topics.value=topicId;scenarios.value=caseId;overlay.value=seriesMode;bars=C.fictional('trend');
   response.value='';renderNarration();renderReport();draw();
  }
  function setRecords(records){if(disposed)return;selectedRecordCount=Array.isArray(records)?records.length:0;renderReport()}
  function focusRecord({symbol}={}){
   const value=String(symbol||'').trim().toUpperCase();
   if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(value))return false;
   selectedSymbol=value;
   activeSymbol.textContent='Current member-entered symbol: '+value+'. This is your research context only; fictional examples are NOT prices for '+value+'.';
   rootEl.scrollIntoView?.({block:'start',behavior:'smooth'});
   return true;
  }
  function dispose(){disposed=true;++epoch;stopTyping();resize?.disconnect();chart?.dispose();chart=null;checkpoints.length=0;revisions.length=0;reveals.length=0;rootEl.remove()}
  renderNarration();renderReport();draw();
  Promise.resolve().then(async()=>{
   try{
    if(disposed||!rootEl.isConnected)return;
    const engine=await root.CrownlightECharts?.load?.();
    if(disposed||!rootEl.isConnected||!engine)return;
    chart=engine.init(chartDiv,null,{renderer:'canvas'});
    if(typeof ResizeObserver!=='undefined'){
     resize=new ResizeObserver(()=>chart?.resize());resize.observe(chartDiv);
    }
    draw();
   }catch{chartDiv.textContent='Chart could not load. The OHLCV table and Talia’s written instruction remain available.'}
  });
  return Object.freeze({element:rootEl,reset,setRecords,focusRecord,dispose,reportString});
 }
 function mount({host,source='free',records=[]}={}){
  if(!host)return null;
  const prior=host._groundUpTaliaV4;
  if(prior)return prior;
  const instance=create({source,records});
  host.append(instance.element);
  host._groundUpTaliaV4=instance;
  return instance;
 }
 function mountFree(){
  const host=document.getElementById('free-watchlist-talia-v4-host');
  if(host)mount({host,source:'free'});
 }
 const API=Object.freeze({mount,mountFree,create,version:'4.0'});
 root.GroundUpTaliaWorkstationV4=API;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountFree,{once:true});
 else mountFree();
})(globalThis);
,25),sl=numeric(rf,'Adverse slippage/share 
  const question=make('section',undefined,'cl-talia-prompt');
  question.append(make('h3','Talia’s decision checkpoint'));
  const cue=make('p');
  const response=make('textarea');response.rows=4;response.maxLength=1400;
  response.placeholder='Distinguish observed facts, uncertainties and what would change your conclusion.';
  response.setAttribute('aria-label','Your research reasoning and evidence');
  const mistakeLabel=make('label','Which misconception or research gap are you checking?');
  const mistake=select(['NONE','MISSING_SOURCE','FUTURE_KNOWLEDGE','INDICATOR_CERTAINTY','LIQUIDITY_RISK','NO_INVALIDATION','OTHER'],
   ['No specific problem identified','Unverified issuer / source','Using information from the future',
    'Treating an indicator as certain','Ignoring spread, borrow or liquidity',
    'Missing invalidation / risk plan','Other misconception']);
  mistakeLabel.append(mistake);
  const save=make('button','Record ungraded research checkpoint','btn');
  const retry=make('button','Retry with more instruction · Free','btn secondary');
  const result=make('p',undefined,'cl-talia-result');result.setAttribute('role','status');
  result.setAttribute('aria-live','polite');
  question.append(cue,response,mistakeLabel,save,retry,result);
  rootEl.append(question);
  const report=make('section',undefined,'cl-talia-report');
  report.append(make('h3','Your Talia Watchlist Research Report'));
  const reportText=make('p','This member-session report covers research practice, not official assessment mastery.');
  const metrics=make('div',undefined,'cl-talia-metrics');
  const history=make('ol',undefined,'cl-talia-history');
  const copy=make('button','Copy research report','btn secondary');
  const reportStatus=make('p',undefined,'cl-talia-result');
  report.append(reportText,metrics,make('h4','Research checkpoints and recurring errors'),history,copy,reportStatus);
  rootEl.append(report);
  const nav=make('div',undefined,'cl-talia-nav');
  const previous=make('button','Previous research action','btn secondary');
  const next=make('button','Next research action','btn');
  const lab=make('a','Open the canonical nine-stage Learning Labs','btn secondary');
  lab.href='labs.html';nav.append(previous,next,lab);rootEl.append(nav);
  const footer=make('p','All guidance and ordinary retries are included for every member who can access this learning screen. The original Free watchlist still has 20 stored symbols. Advanced persistence, alerts and trade plans require separate entitlement. No Lumens are spent.','cl-talia-disclosure');
  rootEl.append(footer);
  let bars=C.fictional(caseId);
  function stopTyping(){if(typing!==null){root.clearInterval(typing);typing=null}}
  function showFull(){stopTyping();typingAt=transcript.textContent.length;narration.textContent=transcript.textContent;play.textContent='Replay written explanation'}
  const reduced=()=>root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  function runTyping(reset=false){
   stopTyping();if(reset){typingAt=0;narration.textContent=''}
   if(reduced()){showFull();return}
   play.textContent='Pause written explanation';
   typing=root.setInterval(()=>{
    if(!rootEl.isConnected){stopTyping();return}
    typingAt=Math.min(transcript.textContent.length,typingAt+4);
    narration.textContent=transcript.textContent.slice(0,typingAt);
    if(typingAt===transcript.textContent.length)showFull();
   },36);
  }
  play.addEventListener('click',()=>{
   if(typing!==null){stopTyping();play.textContent='Resume written explanation';return}
   runTyping(typingAt>=transcript.textContent.length);
  });
  full.addEventListener('click',showFull);
  function currentStep(){return C.STEPS[step]}
  const recent=()=>checkpoints.filter(x=>x.topic===topicId&&x.step===currentStep()&&x.fictionalCase===caseId);
  function renderNarration(){
   const current=C.byId(topicId),stage=currentStep();
   indicator.textContent='Research action '+(step+1)+' of 8 · '+stage+
    ' · Primary skill dimension: '+dimension(stage);
   heading.textContent=current.title;
   transcript.textContent=C.stageText(current,stage);
   runTyping(true);
   cue.textContent=C.prompt(current,stage)+' Record at least 25 characters of reasoning; an unresolved question is a valid response.';
   previous.disabled=step===0;next.disabled=step===7;
   const saved=recent();
   response.value=saved.length?saved[saved.length-1].answer:'';
   mistake.value=saved.length?saved[saved.length-1].mistake:'NONE';
   result.textContent=saved.length?'Prior in-session checkpoint preserved. Edits create another chronological revision.':'Not yet recorded for this action.';
   more.replaceChildren();
  }
  function extraText(kind){
   const t=C.byId(topicId);
   return kind==='depth'?
    'More depth — '+t.definition+' Worked case: '+t.worked+
    ' Verify source and mathematical assumptions: '+t.investigate+
    ' Common wrong approach: '+t.contradiction+
    ' Why it matters: a visual pattern or indicator is not an order, a verified source, or a known future outcome.':
    'Independent transfer — '+t.transfer+
    ' Use a fresh fictional chart or a separately time-stamped issuer source. Explain what is known, absent and contrary before deciding.';
  }
  deeper.addEventListener('click',()=>{
   const p=make('p',extraText('depth'));more.append(p);
  });
  example.addEventListener('click',()=>{
   more.append(make('p',extraText('transfer')));
  });
  topics.addEventListener('change',()=>{
   topicId=topics.value;step=0;renderNarration();renderReport();
  });
  scenarios.addEventListener('change',()=>{
   caseId=scenarios.value;bars=C.fictional(caseId);visible=12;draw();
  });
  overlay.addEventListener('change',()=>{seriesMode=overlay.value;draw()});
  function reveal(){
   if(visible>=bars.length)return;
   if(currentStep()==='Practice'&&!recent().some(x=>x.cutoff===visible)){
    result.textContent='Document your initial practice observation before viewing another fictional candle.';
    response.focus();return;
   }
   reveals.push({topic:topicId,at:new Date().toISOString(),cutoff:visible});
   visible+=1;draw();renderReport();
  }
  nextCandle.addEventListener('click',reveal);
  restart.addEventListener('click',()=>{visible=12;draw()});
  previous.addEventListener('click',()=>{if(step>0){step--;renderNarration()}});
  next.addEventListener('click',()=>{if(step<7){step++;renderNarration()}});
  save.addEventListener('click',()=>{
   const value=response.value.trim();
   if(value.length<25){result.textContent='Please record at least 25 characters. You may describe missing information, WATCH, REJECT or NO TRADE; retries are free.';return}
   const event={topic:topicId,step:currentStep(),dimension:dimension(currentStep()),
    answer:value.slice(0,1400),mistake:mistake.value,symbol:selectedSymbol,cutoff:visible,
    fictionalCase:caseId,at:new Date().toISOString()};
   const prior=recent()[0];
   checkpoints.push(event);
   if(prior)revisions.push({topic:topicId,step:event.step,at:event.at});
   result.textContent='Research practice recorded for this browser session at '+event.at+'. Not an independently graded answer or persistent watchlist save.';
   renderReport();
  });
  retry.addEventListener('click',()=>{
   more.append(make('p',extraText('depth')));
   result.textContent='Try again using clearer evidence, source time, alternative interpretation and invalidation. Additional attempts are free.';
   response.focus();
  });
  function renderReport(){
   metrics.replaceChildren();history.replaceChildren();
   for(const dim of C.DIMS){
    const matching=checkpoints.filter(x=>x.dimension===dim);
    const box=make('div',undefined,'cl-talia-metric');
    box.append(make('strong',dim),make('span',matching.length+' recorded research attempt'+(matching.length===1?'':'s')));
    metrics.append(box);
   }
   const mistakes=new Map();
   for(const entry of checkpoints){
    if(entry.mistake!=='NONE')mistakes.set(entry.mistake,(mistakes.get(entry.mistake)||0)+1);
   }
   const unique=new Set(checkpoints.map(x=>x.topic+'|'+x.step));
   reportText.textContent='Ungraded member-session evidence · '+unique.size+' distinct subject/action checkpoints across '+
    new Set(checkpoints.map(x=>x.topic)).size+' subjects · '+revisions.length+' written revisions · '+
    reveals.length+' fictional bar reveals · '+selectedRecordCount+' member-owned watchlist records available on this page. '+
    'Not Yet Assessed remains the only formal mastery status shown here.';
   if(!checkpoints.length)history.append(make('li','No practice checkpoints yet. Start with Observe.'));
   for(const [key,count] of mistakes){
    history.append(make('li',key.replaceAll('_',' ')+' noted '+count+' time'+(count===1?'':'s')+'. Revisit Talia’s explanations and the related Lab.'));
   }
   for(const x of checkpoints.slice(-10).reverse()){
    history.append(make('li',x.at+' · '+C.byId(x.topic).title+' · '+x.step+' · '+
     'evidence cutoff: fictional bar '+x.cutoff+' · '+(x.mistake==='NONE'?'No misconception selected':x.mistake.replaceAll('_',' '))));
   }
  }
  function reportString(){
   return [
    'Crownlight Talia — Watchlist Research Report (UNGRADED, IN-SESSION)',
    'Generated '+new Date().toISOString(),'Source: member-entered fictional educational exercises, not market data',
    'No official assessment grade, trade outcome or entitlement is implied.',
    'Advanced records seen: '+selectedRecordCount,
    ...C.DIMS.map(d=>d+': '+checkpoints.filter(x=>x.dimension===d).length+' practice checkpoint(s)'),
    ...checkpoints.map(e=>[e.at,e.topic,e.step,e.dimension,e.fictionalCase,
     'symbol '+(e.symbol||'NONE'),'cutoff '+e.cutoff,'misconception '+e.mistake,'reasoning '+e.answer].join(' | '))
   ].join('\n');
  }
  copy.addEventListener('click',async()=>{
   try{
    if(!root.navigator?.clipboard?.writeText)throw Error('Copy unavailable');
    await root.navigator.clipboard.writeText(reportString());
    reportStatus.textContent='Copied the research report to your clipboard. It is not a persistent server-saved assessment.';
   }catch{
    reportStatus.textContent='Clipboard unavailable in this browser. Checkpoint history remains visible above; do not assume it was saved.';
   }
  });
  function draw(){
   if(disposed)return;
   const set=bars.slice(0,visible),closes=set.map(x=>x.close),names=set.map((_,i)=>'Bar '+(i+1));
   const latest=set[set.length-1];
   readout.textContent='Observed fictional candles '+visible+' / '+bars.length+' · Latest O $'+latest.open.toFixed(2)+
    ' · H $'+latest.high.toFixed(2)+' · L $'+latest.low.toFixed(2)+' · C $'+latest.close.toFixed(2)+
    ' · Volume '+latest.volume.toLocaleString()+' shares · Not market data.';
   priceTable.replaceChildren();
   const tr=make('tr');for(const txt of ['Open','High','Low','Close','Volume'])tr.append(make('th',txt));
   const val=make('tr');for(const n of [latest.open,latest.high,latest.low,latest.close])val.append(make('td','$'+n.toFixed(2)));
   val.append(make('td',latest.volume.toLocaleString()));priceTable.append(tr,val);
   nextCandle.disabled=visible===bars.length;
   if(!chart)return;
   const indicators=[],palette={up:'#31c6a2',down:'#e77b91',blue:'#8ec6ed',gold:'#f1c778'};
   const guides=[['H',latest.high,'#f1ca87'],['O',latest.open,'#83c9f4'],
    ['C',latest.close,'#daeefc'],['L',latest.low,'#eaa883']].map(([k,p,c])=>({
    yAxis:p,label:{show:true,formatter:k+' $'+p.toFixed(2),position:'end',color:c},
    lineStyle:{color:c,type:'dashed',width:1}}));
   const price={name:'Fictional OHLC',type:'candlestick',xAxisIndex:0,yAxisIndex:0,
    data:set.map(x=>[x.open,x.close,x.low,x.high]),barMaxWidth:16,
    itemStyle:{color:palette.up,color0:palette.down,borderColor:palette.up,borderColor0:palette.down},
    markLine:{silent:true,symbol:['none','none'],animation:false,data:guides}};
   indicators.push(price);
   const volume={name:'Fictional volume',type:'bar',xAxisIndex:1,yAxisIndex:1,
    data:set.map(x=>({value:x.volume,itemStyle:{color:x.close>=x.open?palette.up:palette.down}}))};
   indicators.push(volume);
   let modeText='OHLCV only · no indicator is independently predictive.';
   if(seriesMode==='ema'){
    for(const n of [9,20]){
     indicators.push({name:'EMA '+n,type:'line',data:C.ema(closes,n),xAxisIndex:0,yAxisIndex:0,
      showSymbol:false,connectNulls:false,lineStyle:{width:2,color:n===9?palette.gold:palette.blue}});
    }
    modeText='EMA 9/20: seed after 9/20 completed closes. Lagging context, not an entry trigger.';
   }else if(seriesMode==='vwap'){
    indicators.push({name:'Bar-based session VWAP',type:'line',data:C.vwap(set),xAxisIndex:0,yAxisIndex:0,
     showSymbol:false,lineStyle:{width:2,color:palette.gold}});
    modeText='Approximate bar-typical-price VWAP; not trade-by-trade execution VWAP.';
   }else if(seriesMode==='bollinger'){
    const bands=C.bollinger(closes);
    for(const [key,label,color] of [['upper','Upper band',palette.blue],['middle','SMA 20',palette.gold],['lower','Lower band',palette.blue]]){
     indicators.push({name:label,type:'line',data:bands.map(x=>x?x[key]:null),xAxisIndex:0,yAxisIndex:0,
      showSymbol:false,lineStyle:{width:key==='middle'?2:1.4,type:key==='middle'?'solid':'dashed',color}});
    }
    modeText='Bollinger 20 ± 2 population SD; not a mechanical buy/sell signal.';
   }else if(seriesMode==='rsi'){
    const data=C.rsi(closes,14);
    indicators.push({name:'RSI 14',type:'line',data,xAxisIndex:2,yAxisIndex:2,
     showSymbol:false,connectNulls:false,lineStyle:{color:palette.gold,width:2}});
    modeText='Wilder RSI 14 (0–100); no plotted value before 14 changes.';
   }else if(seriesMode==='macd'){
    const m=C.macd(closes);
    for(const [key,label,color] of [['line','MACD',palette.gold],['signal','Signal 9',palette.blue]]){
     indicators.push({name:label,type:'line',data:m[key],xAxisIndex:2,yAxisIndex:2,
      showSymbol:false,connectNulls:false,lineStyle:{color,width:2}});
    }
    indicators.push({name:'Histogram',type:'bar',data:m.hist,xAxisIndex:2,yAxisIndex:2,
     itemStyle:{color:palette.up}});
    modeText='MACD 12/26/9 uses completed closes; signal line needs 9 valid MACD observations.';
   }
   const hasLower=['rsi','macd'].includes(seriesMode);
   chart.setOption({animation:false,backgroundColor:'transparent',
    textStyle:{color:'#d6e7f1'},legend:{top:0,textStyle:{color:'#bad4e2'},type:'scroll'},
    tooltip:{trigger:'axis',confine:true,axisPointer:{type:'cross'}},
    grid:hasLower?
     [{left:62,right:103,top:44,height:'46%'},{left:62,right:103,top:'60%',height:'12%'},
      {left:62,right:103,top:'77%',height:'14%'}]:
     [{left:62,right:103,top:44,height:'66%'},{left:62,right:103,top:'78%',height:'15%'},
      {left:62,right:103,top:'77%',height:'14%'}],
    xAxis:[0,1,2].map(i=>({type:'category',data:names,gridIndex:i,show:i!==0&&((i===2&&hasLower)||(i===1&&!hasLower)),axisLabel:{color:'#b7cddd',hideOverlap:true}})),
    yAxis:[0,1,2].map(i=>({type:'value',gridIndex:i,scale:i!==1,min:i===1?0:undefined,
     axisLabel:{color:'#b7cddd'},splitLine:{lineStyle:{color:'#244154'}}})),
    series:indicators},{notMerge:true,lazyUpdate:false});
   const n=chartDiv.nextElementSibling;
   if(n?.classList.contains('cl-talia-indicator-caption'))n.textContent=modeText;
   else chartDiv.insertAdjacentElement('afterend',make('p',modeText,'cl-talia-indicator-caption'));
  }
  function reset(){stopTyping();checkpoints.length=0;revisions.length=0;reveals.length=0;selectedRecordCount=0;selectedSymbol='';activeSymbol.textContent='Current member-entered symbol: none selected.';topicId='building';step=0;caseId='trend';visible=12;seriesMode='none';
   topics.value=topicId;scenarios.value=caseId;overlay.value=seriesMode;bars=C.fictional('trend');
   response.value='';renderNarration();renderReport();draw();
  }
  function setRecords(records){if(disposed)return;selectedRecordCount=Array.isArray(records)?records.length:0;renderReport()}
  function focusRecord({symbol}={}){
   const value=String(symbol||'').trim().toUpperCase();
   if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(value))return false;
   selectedSymbol=value;
   activeSymbol.textContent='Current member-entered symbol: '+value+'. This is your research context only; fictional examples are NOT prices for '+value+'.';
   rootEl.scrollIntoView?.({block:'start',behavior:'smooth'});
   return true;
  }
  function dispose(){disposed=true;++epoch;stopTyping();resize?.disconnect();chart?.dispose();chart=null;checkpoints.length=0;revisions.length=0;reveals.length=0;rootEl.remove()}
  renderNarration();renderReport();draw();
  Promise.resolve().then(async()=>{
   try{
    if(disposed||!rootEl.isConnected)return;
    const engine=await root.CrownlightECharts?.load?.();
    if(disposed||!rootEl.isConnected||!engine)return;
    chart=engine.init(chartDiv,null,{renderer:'canvas'});
    if(typeof ResizeObserver!=='undefined'){
     resize=new ResizeObserver(()=>chart?.resize());resize.observe(chartDiv);
    }
    draw();
   }catch{chartDiv.textContent='Chart could not load. The OHLCV table and Talia’s written instruction remain available.'}
  });
  return Object.freeze({element:rootEl,reset,setRecords,focusRecord,dispose,reportString});
 }
 function mount({host,source='free',records=[]}={}){
  if(!host)return null;
  const prior=host._groundUpTaliaV4;
  if(prior)return prior;
  const instance=create({source,records});
  host.append(instance.element);
  host._groundUpTaliaV4=instance;
  return instance;
 }
 function mountFree(){
  const host=document.getElementById('free-watchlist-talia-v4-host');
  if(host)mount({host,source:'free'});
 }
 const API=Object.freeze({mount,mountFree,create,version:'4.0'});
 root.GroundUpTaliaWorkstationV4=API;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountFree,{once:true});
 else mountFree();
})(globalThis);
,.08),sp=numeric(rf,'Spread allowance/share 
  const question=make('section',undefined,'cl-talia-prompt');
  question.append(make('h3','Talia’s decision checkpoint'));
  const cue=make('p');
  const response=make('textarea');response.rows=4;response.maxLength=1400;
  response.placeholder='Distinguish observed facts, uncertainties and what would change your conclusion.';
  response.setAttribute('aria-label','Your research reasoning and evidence');
  const mistakeLabel=make('label','Which misconception or research gap are you checking?');
  const mistake=select(['NONE','MISSING_SOURCE','FUTURE_KNOWLEDGE','INDICATOR_CERTAINTY','LIQUIDITY_RISK','NO_INVALIDATION','OTHER'],
   ['No specific problem identified','Unverified issuer / source','Using information from the future',
    'Treating an indicator as certain','Ignoring spread, borrow or liquidity',
    'Missing invalidation / risk plan','Other misconception']);
  mistakeLabel.append(mistake);
  const save=make('button','Record ungraded research checkpoint','btn');
  const retry=make('button','Retry with more instruction · Free','btn secondary');
  const result=make('p',undefined,'cl-talia-result');result.setAttribute('role','status');
  result.setAttribute('aria-live','polite');
  question.append(cue,response,mistakeLabel,save,retry,result);
  rootEl.append(question);
  const report=make('section',undefined,'cl-talia-report');
  report.append(make('h3','Your Talia Watchlist Research Report'));
  const reportText=make('p','This member-session report covers research practice, not official assessment mastery.');
  const metrics=make('div',undefined,'cl-talia-metrics');
  const history=make('ol',undefined,'cl-talia-history');
  const copy=make('button','Copy research report','btn secondary');
  const reportStatus=make('p',undefined,'cl-talia-result');
  report.append(reportText,metrics,make('h4','Research checkpoints and recurring errors'),history,copy,reportStatus);
  rootEl.append(report);
  const nav=make('div',undefined,'cl-talia-nav');
  const previous=make('button','Previous research action','btn secondary');
  const next=make('button','Next research action','btn');
  const lab=make('a','Open the canonical nine-stage Learning Labs','btn secondary');
  lab.href='labs.html';nav.append(previous,next,lab);rootEl.append(nav);
  const footer=make('p','All guidance and ordinary retries are included for every member who can access this learning screen. The original Free watchlist still has 20 stored symbols. Advanced persistence, alerts and trade plans require separate entitlement. No Lumens are spent.','cl-talia-disclosure');
  rootEl.append(footer);
  let bars=C.fictional(caseId);
  function stopTyping(){if(typing!==null){root.clearInterval(typing);typing=null}}
  function showFull(){stopTyping();typingAt=transcript.textContent.length;narration.textContent=transcript.textContent;play.textContent='Replay written explanation'}
  const reduced=()=>root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  function runTyping(reset=false){
   stopTyping();if(reset){typingAt=0;narration.textContent=''}
   if(reduced()){showFull();return}
   play.textContent='Pause written explanation';
   typing=root.setInterval(()=>{
    if(!rootEl.isConnected){stopTyping();return}
    typingAt=Math.min(transcript.textContent.length,typingAt+4);
    narration.textContent=transcript.textContent.slice(0,typingAt);
    if(typingAt===transcript.textContent.length)showFull();
   },36);
  }
  play.addEventListener('click',()=>{
   if(typing!==null){stopTyping();play.textContent='Resume written explanation';return}
   runTyping(typingAt>=transcript.textContent.length);
  });
  full.addEventListener('click',showFull);
  function currentStep(){return C.STEPS[step]}
  const recent=()=>checkpoints.filter(x=>x.topic===topicId&&x.step===currentStep()&&x.fictionalCase===caseId);
  function renderNarration(){
   const current=C.byId(topicId),stage=currentStep();
   indicator.textContent='Research action '+(step+1)+' of 8 · '+stage+
    ' · Primary skill dimension: '+dimension(stage);
   heading.textContent=current.title;
   transcript.textContent=C.stageText(current,stage);
   runTyping(true);
   cue.textContent=C.prompt(current,stage)+' Record at least 25 characters of reasoning; an unresolved question is a valid response.';
   previous.disabled=step===0;next.disabled=step===7;
   const saved=recent();
   response.value=saved.length?saved[saved.length-1].answer:'';
   mistake.value=saved.length?saved[saved.length-1].mistake:'NONE';
   result.textContent=saved.length?'Prior in-session checkpoint preserved. Edits create another chronological revision.':'Not yet recorded for this action.';
   more.replaceChildren();
  }
  function extraText(kind){
   const t=C.byId(topicId);
   return kind==='depth'?
    'More depth — '+t.definition+' Worked case: '+t.worked+
    ' Verify source and mathematical assumptions: '+t.investigate+
    ' Common wrong approach: '+t.contradiction+
    ' Why it matters: a visual pattern or indicator is not an order, a verified source, or a known future outcome.':
    'Independent transfer — '+t.transfer+
    ' Use a fresh fictional chart or a separately time-stamped issuer source. Explain what is known, absent and contrary before deciding.';
  }
  deeper.addEventListener('click',()=>{
   const p=make('p',extraText('depth'));more.append(p);
  });
  example.addEventListener('click',()=>{
   more.append(make('p',extraText('transfer')));
  });
  topics.addEventListener('change',()=>{
   topicId=topics.value;step=0;renderNarration();renderReport();
  });
  scenarios.addEventListener('change',()=>{
   caseId=scenarios.value;bars=C.fictional(caseId);visible=12;draw();
  });
  overlay.addEventListener('change',()=>{seriesMode=overlay.value;draw()});
  function reveal(){
   if(visible>=bars.length)return;
   if(currentStep()==='Practice'&&!recent().some(x=>x.cutoff===visible)){
    result.textContent='Document your initial practice observation before viewing another fictional candle.';
    response.focus();return;
   }
   reveals.push({topic:topicId,at:new Date().toISOString(),cutoff:visible});
   visible+=1;draw();renderReport();
  }
  nextCandle.addEventListener('click',reveal);
  restart.addEventListener('click',()=>{visible=12;draw()});
  previous.addEventListener('click',()=>{if(step>0){step--;renderNarration()}});
  next.addEventListener('click',()=>{if(step<7){step++;renderNarration()}});
  save.addEventListener('click',()=>{
   const value=response.value.trim();
   if(value.length<25){result.textContent='Please record at least 25 characters. You may describe missing information, WATCH, REJECT or NO TRADE; retries are free.';return}
   const event={topic:topicId,step:currentStep(),dimension:dimension(currentStep()),
    answer:value.slice(0,1400),mistake:mistake.value,symbol:selectedSymbol,cutoff:visible,
    fictionalCase:caseId,at:new Date().toISOString()};
   const prior=recent()[0];
   checkpoints.push(event);
   if(prior)revisions.push({topic:topicId,step:event.step,at:event.at});
   result.textContent='Research practice recorded for this browser session at '+event.at+'. Not an independently graded answer or persistent watchlist save.';
   renderReport();
  });
  retry.addEventListener('click',()=>{
   more.append(make('p',extraText('depth')));
   result.textContent='Try again using clearer evidence, source time, alternative interpretation and invalidation. Additional attempts are free.';
   response.focus();
  });
  function renderReport(){
   metrics.replaceChildren();history.replaceChildren();
   for(const dim of C.DIMS){
    const matching=checkpoints.filter(x=>x.dimension===dim);
    const box=make('div',undefined,'cl-talia-metric');
    box.append(make('strong',dim),make('span',matching.length+' recorded research attempt'+(matching.length===1?'':'s')));
    metrics.append(box);
   }
   const mistakes=new Map();
   for(const entry of checkpoints){
    if(entry.mistake!=='NONE')mistakes.set(entry.mistake,(mistakes.get(entry.mistake)||0)+1);
   }
   const unique=new Set(checkpoints.map(x=>x.topic+'|'+x.step));
   reportText.textContent='Ungraded member-session evidence · '+unique.size+' distinct subject/action checkpoints across '+
    new Set(checkpoints.map(x=>x.topic)).size+' subjects · '+revisions.length+' written revisions · '+
    reveals.length+' fictional bar reveals · '+selectedRecordCount+' member-owned watchlist records available on this page. '+
    'Not Yet Assessed remains the only formal mastery status shown here.';
   if(!checkpoints.length)history.append(make('li','No practice checkpoints yet. Start with Observe.'));
   for(const [key,count] of mistakes){
    history.append(make('li',key.replaceAll('_',' ')+' noted '+count+' time'+(count===1?'':'s')+'. Revisit Talia’s explanations and the related Lab.'));
   }
   for(const x of checkpoints.slice(-10).reverse()){
    history.append(make('li',x.at+' · '+C.byId(x.topic).title+' · '+x.step+' · '+
     'evidence cutoff: fictional bar '+x.cutoff+' · '+(x.mistake==='NONE'?'No misconception selected':x.mistake.replaceAll('_',' '))));
   }
  }
  function reportString(){
   return [
    'Crownlight Talia — Watchlist Research Report (UNGRADED, IN-SESSION)',
    'Generated '+new Date().toISOString(),'Source: member-entered fictional educational exercises, not market data',
    'No official assessment grade, trade outcome or entitlement is implied.',
    'Advanced records seen: '+selectedRecordCount,
    ...C.DIMS.map(d=>d+': '+checkpoints.filter(x=>x.dimension===d).length+' practice checkpoint(s)'),
    ...checkpoints.map(e=>[e.at,e.topic,e.step,e.dimension,e.fictionalCase,
     'symbol '+(e.symbol||'NONE'),'cutoff '+e.cutoff,'misconception '+e.mistake,'reasoning '+e.answer].join(' | '))
   ].join('\n');
  }
  copy.addEventListener('click',async()=>{
   try{
    if(!root.navigator?.clipboard?.writeText)throw Error('Copy unavailable');
    await root.navigator.clipboard.writeText(reportString());
    reportStatus.textContent='Copied the research report to your clipboard. It is not a persistent server-saved assessment.';
   }catch{
    reportStatus.textContent='Clipboard unavailable in this browser. Checkpoint history remains visible above; do not assume it was saved.';
   }
  });
  function draw(){
   if(disposed)return;
   const set=bars.slice(0,visible),closes=set.map(x=>x.close),names=set.map((_,i)=>'Bar '+(i+1));
   const latest=set[set.length-1];
   readout.textContent='Observed fictional candles '+visible+' / '+bars.length+' · Latest O $'+latest.open.toFixed(2)+
    ' · H $'+latest.high.toFixed(2)+' · L $'+latest.low.toFixed(2)+' · C $'+latest.close.toFixed(2)+
    ' · Volume '+latest.volume.toLocaleString()+' shares · Not market data.';
   priceTable.replaceChildren();
   const tr=make('tr');for(const txt of ['Open','High','Low','Close','Volume'])tr.append(make('th',txt));
   const val=make('tr');for(const n of [latest.open,latest.high,latest.low,latest.close])val.append(make('td','$'+n.toFixed(2)));
   val.append(make('td',latest.volume.toLocaleString()));priceTable.append(tr,val);
   nextCandle.disabled=visible===bars.length;
   if(!chart)return;
   const indicators=[],palette={up:'#31c6a2',down:'#e77b91',blue:'#8ec6ed',gold:'#f1c778'};
   const guides=[['H',latest.high,'#f1ca87'],['O',latest.open,'#83c9f4'],
    ['C',latest.close,'#daeefc'],['L',latest.low,'#eaa883']].map(([k,p,c])=>({
    yAxis:p,label:{show:true,formatter:k+' $'+p.toFixed(2),position:'end',color:c},
    lineStyle:{color:c,type:'dashed',width:1}}));
   const price={name:'Fictional OHLC',type:'candlestick',xAxisIndex:0,yAxisIndex:0,
    data:set.map(x=>[x.open,x.close,x.low,x.high]),barMaxWidth:16,
    itemStyle:{color:palette.up,color0:palette.down,borderColor:palette.up,borderColor0:palette.down},
    markLine:{silent:true,symbol:['none','none'],animation:false,data:guides}};
   indicators.push(price);
   const volume={name:'Fictional volume',type:'bar',xAxisIndex:1,yAxisIndex:1,
    data:set.map(x=>({value:x.volume,itemStyle:{color:x.close>=x.open?palette.up:palette.down}}))};
   indicators.push(volume);
   let modeText='OHLCV only · no indicator is independently predictive.';
   if(seriesMode==='ema'){
    for(const n of [9,20]){
     indicators.push({name:'EMA '+n,type:'line',data:C.ema(closes,n),xAxisIndex:0,yAxisIndex:0,
      showSymbol:false,connectNulls:false,lineStyle:{width:2,color:n===9?palette.gold:palette.blue}});
    }
    modeText='EMA 9/20: seed after 9/20 completed closes. Lagging context, not an entry trigger.';
   }else if(seriesMode==='vwap'){
    indicators.push({name:'Bar-based session VWAP',type:'line',data:C.vwap(set),xAxisIndex:0,yAxisIndex:0,
     showSymbol:false,lineStyle:{width:2,color:palette.gold}});
    modeText='Approximate bar-typical-price VWAP; not trade-by-trade execution VWAP.';
   }else if(seriesMode==='bollinger'){
    const bands=C.bollinger(closes);
    for(const [key,label,color] of [['upper','Upper band',palette.blue],['middle','SMA 20',palette.gold],['lower','Lower band',palette.blue]]){
     indicators.push({name:label,type:'line',data:bands.map(x=>x?x[key]:null),xAxisIndex:0,yAxisIndex:0,
      showSymbol:false,lineStyle:{width:key==='middle'?2:1.4,type:key==='middle'?'solid':'dashed',color}});
    }
    modeText='Bollinger 20 ± 2 population SD; not a mechanical buy/sell signal.';
   }else if(seriesMode==='rsi'){
    const data=C.rsi(closes,14);
    indicators.push({name:'RSI 14',type:'line',data,xAxisIndex:2,yAxisIndex:2,
     showSymbol:false,connectNulls:false,lineStyle:{color:palette.gold,width:2}});
    modeText='Wilder RSI 14 (0–100); no plotted value before 14 changes.';
   }else if(seriesMode==='macd'){
    const m=C.macd(closes);
    for(const [key,label,color] of [['line','MACD',palette.gold],['signal','Signal 9',palette.blue]]){
     indicators.push({name:label,type:'line',data:m[key],xAxisIndex:2,yAxisIndex:2,
      showSymbol:false,connectNulls:false,lineStyle:{color,width:2}});
    }
    indicators.push({name:'Histogram',type:'bar',data:m.hist,xAxisIndex:2,yAxisIndex:2,
     itemStyle:{color:palette.up}});
    modeText='MACD 12/26/9 uses completed closes; signal line needs 9 valid MACD observations.';
   }
   const hasLower=['rsi','macd'].includes(seriesMode);
   chart.setOption({animation:false,backgroundColor:'transparent',
    textStyle:{color:'#d6e7f1'},legend:{top:0,textStyle:{color:'#bad4e2'},type:'scroll'},
    tooltip:{trigger:'axis',confine:true,axisPointer:{type:'cross'}},
    grid:hasLower?
     [{left:62,right:103,top:44,height:'46%'},{left:62,right:103,top:'60%',height:'12%'},
      {left:62,right:103,top:'77%',height:'14%'}]:
     [{left:62,right:103,top:44,height:'66%'},{left:62,right:103,top:'78%',height:'15%'},
      {left:62,right:103,top:'77%',height:'14%'}],
    xAxis:[0,1,2].map(i=>({type:'category',data:names,gridIndex:i,show:i!==0&&((i===2&&hasLower)||(i===1&&!hasLower)),axisLabel:{color:'#b7cddd',hideOverlap:true}})),
    yAxis:[0,1,2].map(i=>({type:'value',gridIndex:i,scale:i!==1,min:i===1?0:undefined,
     axisLabel:{color:'#b7cddd'},splitLine:{lineStyle:{color:'#244154'}}})),
    series:indicators},{notMerge:true,lazyUpdate:false});
   const n=chartDiv.nextElementSibling;
   if(n?.classList.contains('cl-talia-indicator-caption'))n.textContent=modeText;
   else chartDiv.insertAdjacentElement('afterend',make('p',modeText,'cl-talia-indicator-caption'));
  }
  function reset(){stopTyping();checkpoints.length=0;revisions.length=0;reveals.length=0;selectedRecordCount=0;selectedSymbol='';activeSymbol.textContent='Current member-entered symbol: none selected.';topicId='building';step=0;caseId='trend';visible=12;seriesMode='none';
   topics.value=topicId;scenarios.value=caseId;overlay.value=seriesMode;bars=C.fictional('trend');
   response.value='';renderNarration();renderReport();draw();
  }
  function setRecords(records){if(disposed)return;selectedRecordCount=Array.isArray(records)?records.length:0;renderReport()}
  function focusRecord({symbol}={}){
   const value=String(symbol||'').trim().toUpperCase();
   if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(value))return false;
   selectedSymbol=value;
   activeSymbol.textContent='Current member-entered symbol: '+value+'. This is your research context only; fictional examples are NOT prices for '+value+'.';
   rootEl.scrollIntoView?.({block:'start',behavior:'smooth'});
   return true;
  }
  function dispose(){disposed=true;++epoch;stopTyping();resize?.disconnect();chart?.dispose();chart=null;checkpoints.length=0;revisions.length=0;reveals.length=0;rootEl.remove()}
  renderNarration();renderReport();draw();
  Promise.resolve().then(async()=>{
   try{
    if(disposed||!rootEl.isConnected)return;
    const engine=await root.CrownlightECharts?.load?.();
    if(disposed||!rootEl.isConnected||!engine)return;
    chart=engine.init(chartDiv,null,{renderer:'canvas'});
    if(typeof ResizeObserver!=='undefined'){
     resize=new ResizeObserver(()=>chart?.resize());resize.observe(chartDiv);
    }
    draw();
   }catch{chartDiv.textContent='Chart could not load. The OHLCV table and Talia’s written instruction remain available.'}
  });
  return Object.freeze({element:rootEl,reset,setRecords,focusRecord,dispose,reportString});
 }
 function mount({host,source='free',records=[]}={}){
  if(!host)return null;
  const prior=host._groundUpTaliaV4;
  if(prior)return prior;
  const instance=create({source,records});
  host.append(instance.element);
  host._groundUpTaliaV4=instance;
  return instance;
 }
 function mountFree(){
  const host=document.getElementById('free-watchlist-talia-v4-host');
  if(host)mount({host,source:'free'});
 }
 const API=Object.freeze({mount,mountFree,create,version:'4.0'});
 root.GroundUpTaliaWorkstationV4=API;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountFree,{once:true});
 else mountFree();
})(globalThis);
,.02);
  const riskOut=make('p',undefined,'cl-talia-calc-output');
  riskOut.setAttribute('role','status');
  function calcRisk(){
   const input={entry:+e.value,stop:+st.value,budget:+b.value,slippage:+sl.value,spread:+sp.value};
   const x=input.entry>input.stop?C.risk(input):null;
   riskOut.textContent=x?'Risk/share 
  const question=make('section',undefined,'cl-talia-prompt');
  question.append(make('h3','Talia’s decision checkpoint'));
  const cue=make('p');
  const response=make('textarea');response.rows=4;response.maxLength=1400;
  response.placeholder='Distinguish observed facts, uncertainties and what would change your conclusion.';
  response.setAttribute('aria-label','Your research reasoning and evidence');
  const mistakeLabel=make('label','Which misconception or research gap are you checking?');
  const mistake=select(['NONE','MISSING_SOURCE','FUTURE_KNOWLEDGE','INDICATOR_CERTAINTY','LIQUIDITY_RISK','NO_INVALIDATION','OTHER'],
   ['No specific problem identified','Unverified issuer / source','Using information from the future',
    'Treating an indicator as certain','Ignoring spread, borrow or liquidity',
    'Missing invalidation / risk plan','Other misconception']);
  mistakeLabel.append(mistake);
  const save=make('button','Record ungraded research checkpoint','btn');
  const retry=make('button','Retry with more instruction · Free','btn secondary');
  const result=make('p',undefined,'cl-talia-result');result.setAttribute('role','status');
  result.setAttribute('aria-live','polite');
  question.append(cue,response,mistakeLabel,save,retry,result);
  rootEl.append(question);
  const report=make('section',undefined,'cl-talia-report');
  report.append(make('h3','Your Talia Watchlist Research Report'));
  const reportText=make('p','This member-session report covers research practice, not official assessment mastery.');
  const metrics=make('div',undefined,'cl-talia-metrics');
  const history=make('ol',undefined,'cl-talia-history');
  const copy=make('button','Copy research report','btn secondary');
  const reportStatus=make('p',undefined,'cl-talia-result');
  report.append(reportText,metrics,make('h4','Research checkpoints and recurring errors'),history,copy,reportStatus);
  rootEl.append(report);
  const nav=make('div',undefined,'cl-talia-nav');
  const previous=make('button','Previous research action','btn secondary');
  const next=make('button','Next research action','btn');
  const lab=make('a','Open the canonical nine-stage Learning Labs','btn secondary');
  lab.href='labs.html';nav.append(previous,next,lab);rootEl.append(nav);
  const footer=make('p','All guidance and ordinary retries are included for every member who can access this learning screen. The original Free watchlist still has 20 stored symbols. Advanced persistence, alerts and trade plans require separate entitlement. No Lumens are spent.','cl-talia-disclosure');
  rootEl.append(footer);
  let bars=C.fictional(caseId);
  function stopTyping(){if(typing!==null){root.clearInterval(typing);typing=null}}
  function showFull(){stopTyping();typingAt=transcript.textContent.length;narration.textContent=transcript.textContent;play.textContent='Replay written explanation'}
  const reduced=()=>root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  function runTyping(reset=false){
   stopTyping();if(reset){typingAt=0;narration.textContent=''}
   if(reduced()){showFull();return}
   play.textContent='Pause written explanation';
   typing=root.setInterval(()=>{
    if(!rootEl.isConnected){stopTyping();return}
    typingAt=Math.min(transcript.textContent.length,typingAt+4);
    narration.textContent=transcript.textContent.slice(0,typingAt);
    if(typingAt===transcript.textContent.length)showFull();
   },36);
  }
  play.addEventListener('click',()=>{
   if(typing!==null){stopTyping();play.textContent='Resume written explanation';return}
   runTyping(typingAt>=transcript.textContent.length);
  });
  full.addEventListener('click',showFull);
  function currentStep(){return C.STEPS[step]}
  const recent=()=>checkpoints.filter(x=>x.topic===topicId&&x.step===currentStep()&&x.fictionalCase===caseId);
  function renderNarration(){
   const current=C.byId(topicId),stage=currentStep();
   indicator.textContent='Research action '+(step+1)+' of 8 · '+stage+
    ' · Primary skill dimension: '+dimension(stage);
   heading.textContent=current.title;
   transcript.textContent=C.stageText(current,stage);
   runTyping(true);
   cue.textContent=C.prompt(current,stage)+' Record at least 25 characters of reasoning; an unresolved question is a valid response.';
   previous.disabled=step===0;next.disabled=step===7;
   const saved=recent();
   response.value=saved.length?saved[saved.length-1].answer:'';
   mistake.value=saved.length?saved[saved.length-1].mistake:'NONE';
   result.textContent=saved.length?'Prior in-session checkpoint preserved. Edits create another chronological revision.':'Not yet recorded for this action.';
   more.replaceChildren();
  }
  function extraText(kind){
   const t=C.byId(topicId);
   return kind==='depth'?
    'More depth — '+t.definition+' Worked case: '+t.worked+
    ' Verify source and mathematical assumptions: '+t.investigate+
    ' Common wrong approach: '+t.contradiction+
    ' Why it matters: a visual pattern or indicator is not an order, a verified source, or a known future outcome.':
    'Independent transfer — '+t.transfer+
    ' Use a fresh fictional chart or a separately time-stamped issuer source. Explain what is known, absent and contrary before deciding.';
  }
  deeper.addEventListener('click',()=>{
   const p=make('p',extraText('depth'));more.append(p);
  });
  example.addEventListener('click',()=>{
   more.append(make('p',extraText('transfer')));
  });
  topics.addEventListener('change',()=>{
   topicId=topics.value;step=0;renderNarration();renderReport();
  });
  scenarios.addEventListener('change',()=>{
   caseId=scenarios.value;bars=C.fictional(caseId);visible=12;draw();
  });
  overlay.addEventListener('change',()=>{seriesMode=overlay.value;draw()});
  function reveal(){
   if(visible>=bars.length)return;
   if(currentStep()==='Practice'&&!recent().some(x=>x.cutoff===visible)){
    result.textContent='Document your initial practice observation before viewing another fictional candle.';
    response.focus();return;
   }
   reveals.push({topic:topicId,at:new Date().toISOString(),cutoff:visible});
   visible+=1;draw();renderReport();
  }
  nextCandle.addEventListener('click',reveal);
  restart.addEventListener('click',()=>{visible=12;draw()});
  previous.addEventListener('click',()=>{if(step>0){step--;renderNarration()}});
  next.addEventListener('click',()=>{if(step<7){step++;renderNarration()}});
  save.addEventListener('click',()=>{
   const value=response.value.trim();
   if(value.length<25){result.textContent='Please record at least 25 characters. You may describe missing information, WATCH, REJECT or NO TRADE; retries are free.';return}
   const event={topic:topicId,step:currentStep(),dimension:dimension(currentStep()),
    answer:value.slice(0,1400),mistake:mistake.value,symbol:selectedSymbol,cutoff:visible,
    fictionalCase:caseId,at:new Date().toISOString()};
   const prior=recent()[0];
   checkpoints.push(event);
   if(prior)revisions.push({topic:topicId,step:event.step,at:event.at});
   result.textContent='Research practice recorded for this browser session at '+event.at+'. Not an independently graded answer or persistent watchlist save.';
   renderReport();
  });
  retry.addEventListener('click',()=>{
   more.append(make('p',extraText('depth')));
   result.textContent='Try again using clearer evidence, source time, alternative interpretation and invalidation. Additional attempts are free.';
   response.focus();
  });
  function renderReport(){
   metrics.replaceChildren();history.replaceChildren();
   for(const dim of C.DIMS){
    const matching=checkpoints.filter(x=>x.dimension===dim);
    const box=make('div',undefined,'cl-talia-metric');
    box.append(make('strong',dim),make('span',matching.length+' recorded research attempt'+(matching.length===1?'':'s')));
    metrics.append(box);
   }
   const mistakes=new Map();
   for(const entry of checkpoints){
    if(entry.mistake!=='NONE')mistakes.set(entry.mistake,(mistakes.get(entry.mistake)||0)+1);
   }
   const unique=new Set(checkpoints.map(x=>x.topic+'|'+x.step));
   reportText.textContent='Ungraded member-session evidence · '+unique.size+' distinct subject/action checkpoints across '+
    new Set(checkpoints.map(x=>x.topic)).size+' subjects · '+revisions.length+' written revisions · '+
    reveals.length+' fictional bar reveals · '+selectedRecordCount+' member-owned watchlist records available on this page. '+
    'Not Yet Assessed remains the only formal mastery status shown here.';
   if(!checkpoints.length)history.append(make('li','No practice checkpoints yet. Start with Observe.'));
   for(const [key,count] of mistakes){
    history.append(make('li',key.replaceAll('_',' ')+' noted '+count+' time'+(count===1?'':'s')+'. Revisit Talia’s explanations and the related Lab.'));
   }
   for(const x of checkpoints.slice(-10).reverse()){
    history.append(make('li',x.at+' · '+C.byId(x.topic).title+' · '+x.step+' · '+
     'evidence cutoff: fictional bar '+x.cutoff+' · '+(x.mistake==='NONE'?'No misconception selected':x.mistake.replaceAll('_',' '))));
   }
  }
  function reportString(){
   return [
    'Crownlight Talia — Watchlist Research Report (UNGRADED, IN-SESSION)',
    'Generated '+new Date().toISOString(),'Source: member-entered fictional educational exercises, not market data',
    'No official assessment grade, trade outcome or entitlement is implied.',
    'Advanced records seen: '+selectedRecordCount,
    ...C.DIMS.map(d=>d+': '+checkpoints.filter(x=>x.dimension===d).length+' practice checkpoint(s)'),
    ...checkpoints.map(e=>[e.at,e.topic,e.step,e.dimension,e.fictionalCase,
     'symbol '+(e.symbol||'NONE'),'cutoff '+e.cutoff,'misconception '+e.mistake,'reasoning '+e.answer].join(' | '))
   ].join('\n');
  }
  copy.addEventListener('click',async()=>{
   try{
    if(!root.navigator?.clipboard?.writeText)throw Error('Copy unavailable');
    await root.navigator.clipboard.writeText(reportString());
    reportStatus.textContent='Copied the research report to your clipboard. It is not a persistent server-saved assessment.';
   }catch{
    reportStatus.textContent='Clipboard unavailable in this browser. Checkpoint history remains visible above; do not assume it was saved.';
   }
  });
  function draw(){
   if(disposed)return;
   const set=bars.slice(0,visible),closes=set.map(x=>x.close),names=set.map((_,i)=>'Bar '+(i+1));
   const latest=set[set.length-1];
   readout.textContent='Observed fictional candles '+visible+' / '+bars.length+' · Latest O $'+latest.open.toFixed(2)+
    ' · H $'+latest.high.toFixed(2)+' · L $'+latest.low.toFixed(2)+' · C $'+latest.close.toFixed(2)+
    ' · Volume '+latest.volume.toLocaleString()+' shares · Not market data.';
   priceTable.replaceChildren();
   const tr=make('tr');for(const txt of ['Open','High','Low','Close','Volume'])tr.append(make('th',txt));
   const val=make('tr');for(const n of [latest.open,latest.high,latest.low,latest.close])val.append(make('td','$'+n.toFixed(2)));
   val.append(make('td',latest.volume.toLocaleString()));priceTable.append(tr,val);
   nextCandle.disabled=visible===bars.length;
   if(!chart)return;
   const indicators=[],palette={up:'#31c6a2',down:'#e77b91',blue:'#8ec6ed',gold:'#f1c778'};
   const guides=[['H',latest.high,'#f1ca87'],['O',latest.open,'#83c9f4'],
    ['C',latest.close,'#daeefc'],['L',latest.low,'#eaa883']].map(([k,p,c])=>({
    yAxis:p,label:{show:true,formatter:k+' $'+p.toFixed(2),position:'end',color:c},
    lineStyle:{color:c,type:'dashed',width:1}}));
   const price={name:'Fictional OHLC',type:'candlestick',xAxisIndex:0,yAxisIndex:0,
    data:set.map(x=>[x.open,x.close,x.low,x.high]),barMaxWidth:16,
    itemStyle:{color:palette.up,color0:palette.down,borderColor:palette.up,borderColor0:palette.down},
    markLine:{silent:true,symbol:['none','none'],animation:false,data:guides}};
   indicators.push(price);
   const volume={name:'Fictional volume',type:'bar',xAxisIndex:1,yAxisIndex:1,
    data:set.map(x=>({value:x.volume,itemStyle:{color:x.close>=x.open?palette.up:palette.down}}))};
   indicators.push(volume);
   let modeText='OHLCV only · no indicator is independently predictive.';
   if(seriesMode==='ema'){
    for(const n of [9,20]){
     indicators.push({name:'EMA '+n,type:'line',data:C.ema(closes,n),xAxisIndex:0,yAxisIndex:0,
      showSymbol:false,connectNulls:false,lineStyle:{width:2,color:n===9?palette.gold:palette.blue}});
    }
    modeText='EMA 9/20: seed after 9/20 completed closes. Lagging context, not an entry trigger.';
   }else if(seriesMode==='vwap'){
    indicators.push({name:'Bar-based session VWAP',type:'line',data:C.vwap(set),xAxisIndex:0,yAxisIndex:0,
     showSymbol:false,lineStyle:{width:2,color:palette.gold}});
    modeText='Approximate bar-typical-price VWAP; not trade-by-trade execution VWAP.';
   }else if(seriesMode==='bollinger'){
    const bands=C.bollinger(closes);
    for(const [key,label,color] of [['upper','Upper band',palette.blue],['middle','SMA 20',palette.gold],['lower','Lower band',palette.blue]]){
     indicators.push({name:label,type:'line',data:bands.map(x=>x?x[key]:null),xAxisIndex:0,yAxisIndex:0,
      showSymbol:false,lineStyle:{width:key==='middle'?2:1.4,type:key==='middle'?'solid':'dashed',color}});
    }
    modeText='Bollinger 20 ± 2 population SD; not a mechanical buy/sell signal.';
   }else if(seriesMode==='rsi'){
    const data=C.rsi(closes,14);
    indicators.push({name:'RSI 14',type:'line',data,xAxisIndex:2,yAxisIndex:2,
     showSymbol:false,connectNulls:false,lineStyle:{color:palette.gold,width:2}});
    modeText='Wilder RSI 14 (0–100); no plotted value before 14 changes.';
   }else if(seriesMode==='macd'){
    const m=C.macd(closes);
    for(const [key,label,color] of [['line','MACD',palette.gold],['signal','Signal 9',palette.blue]]){
     indicators.push({name:label,type:'line',data:m[key],xAxisIndex:2,yAxisIndex:2,
      showSymbol:false,connectNulls:false,lineStyle:{color,width:2}});
    }
    indicators.push({name:'Histogram',type:'bar',data:m.hist,xAxisIndex:2,yAxisIndex:2,
     itemStyle:{color:palette.up}});
    modeText='MACD 12/26/9 uses completed closes; signal line needs 9 valid MACD observations.';
   }
   const hasLower=['rsi','macd'].includes(seriesMode);
   chart.setOption({animation:false,backgroundColor:'transparent',
    textStyle:{color:'#d6e7f1'},legend:{top:0,textStyle:{color:'#bad4e2'},type:'scroll'},
    tooltip:{trigger:'axis',confine:true,axisPointer:{type:'cross'}},
    grid:hasLower?
     [{left:62,right:103,top:44,height:'46%'},{left:62,right:103,top:'60%',height:'12%'},
      {left:62,right:103,top:'77%',height:'14%'}]:
     [{left:62,right:103,top:44,height:'66%'},{left:62,right:103,top:'78%',height:'15%'},
      {left:62,right:103,top:'77%',height:'14%'}],
    xAxis:[0,1,2].map(i=>({type:'category',data:names,gridIndex:i,show:i!==0&&((i===2&&hasLower)||(i===1&&!hasLower)),axisLabel:{color:'#b7cddd',hideOverlap:true}})),
    yAxis:[0,1,2].map(i=>({type:'value',gridIndex:i,scale:i!==1,min:i===1?0:undefined,
     axisLabel:{color:'#b7cddd'},splitLine:{lineStyle:{color:'#244154'}}})),
    series:indicators},{notMerge:true,lazyUpdate:false});
   const n=chartDiv.nextElementSibling;
   if(n?.classList.contains('cl-talia-indicator-caption'))n.textContent=modeText;
   else chartDiv.insertAdjacentElement('afterend',make('p',modeText,'cl-talia-indicator-caption'));
  }
  function reset(){stopTyping();checkpoints.length=0;revisions.length=0;reveals.length=0;selectedRecordCount=0;selectedSymbol='';activeSymbol.textContent='Current member-entered symbol: none selected.';topicId='building';step=0;caseId='trend';visible=12;seriesMode='none';
   topics.value=topicId;scenarios.value=caseId;overlay.value=seriesMode;bars=C.fictional('trend');
   response.value='';renderNarration();renderReport();draw();
  }
  function setRecords(records){if(disposed)return;selectedRecordCount=Array.isArray(records)?records.length:0;renderReport()}
  function focusRecord({symbol}={}){
   const value=String(symbol||'').trim().toUpperCase();
   if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(value))return false;
   selectedSymbol=value;
   activeSymbol.textContent='Current member-entered symbol: '+value+'. This is your research context only; fictional examples are NOT prices for '+value+'.';
   rootEl.scrollIntoView?.({block:'start',behavior:'smooth'});
   return true;
  }
  function dispose(){disposed=true;++epoch;stopTyping();resize?.disconnect();chart?.dispose();chart=null;checkpoints.length=0;revisions.length=0;reveals.length=0;rootEl.remove()}
  renderNarration();renderReport();draw();
  Promise.resolve().then(async()=>{
   try{
    if(disposed||!rootEl.isConnected)return;
    const engine=await root.CrownlightECharts?.load?.();
    if(disposed||!rootEl.isConnected||!engine)return;
    chart=engine.init(chartDiv,null,{renderer:'canvas'});
    if(typeof ResizeObserver!=='undefined'){
     resize=new ResizeObserver(()=>chart?.resize());resize.observe(chartDiv);
    }
    draw();
   }catch{chartDiv.textContent='Chart could not load. The OHLCV table and Talia’s written instruction remain available.'}
  });
  return Object.freeze({element:rootEl,reset,setRecords,focusRecord,dispose,reportString});
 }
 function mount({host,source='free',records=[]}={}){
  if(!host)return null;
  const prior=host._groundUpTaliaV4;
  if(prior)return prior;
  const instance=create({source,records});
  host.append(instance.element);
  host._groundUpTaliaV4=instance;
  return instance;
 }
 function mountFree(){
  const host=document.getElementById('free-watchlist-talia-v4-host');
  if(host)mount({host,source:'free'});
 }
 const API=Object.freeze({mount,mountFree,create,version:'4.0'});
 root.GroundUpTaliaWorkstationV4=API;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountFree,{once:true});
 else mountFree();
})(globalThis);
+x.riskPerShare.toFixed(2)+' · Whole modeled shares '+x.shares+
    ' · Modeled loss 
  const question=make('section',undefined,'cl-talia-prompt');
  question.append(make('h3','Talia’s decision checkpoint'));
  const cue=make('p');
  const response=make('textarea');response.rows=4;response.maxLength=1400;
  response.placeholder='Distinguish observed facts, uncertainties and what would change your conclusion.';
  response.setAttribute('aria-label','Your research reasoning and evidence');
  const mistakeLabel=make('label','Which misconception or research gap are you checking?');
  const mistake=select(['NONE','MISSING_SOURCE','FUTURE_KNOWLEDGE','INDICATOR_CERTAINTY','LIQUIDITY_RISK','NO_INVALIDATION','OTHER'],
   ['No specific problem identified','Unverified issuer / source','Using information from the future',
    'Treating an indicator as certain','Ignoring spread, borrow or liquidity',
    'Missing invalidation / risk plan','Other misconception']);
  mistakeLabel.append(mistake);
  const save=make('button','Record ungraded research checkpoint','btn');
  const retry=make('button','Retry with more instruction · Free','btn secondary');
  const result=make('p',undefined,'cl-talia-result');result.setAttribute('role','status');
  result.setAttribute('aria-live','polite');
  question.append(cue,response,mistakeLabel,save,retry,result);
  rootEl.append(question);
  const report=make('section',undefined,'cl-talia-report');
  report.append(make('h3','Your Talia Watchlist Research Report'));
  const reportText=make('p','This member-session report covers research practice, not official assessment mastery.');
  const metrics=make('div',undefined,'cl-talia-metrics');
  const history=make('ol',undefined,'cl-talia-history');
  const copy=make('button','Copy research report','btn secondary');
  const reportStatus=make('p',undefined,'cl-talia-result');
  report.append(reportText,metrics,make('h4','Research checkpoints and recurring errors'),history,copy,reportStatus);
  rootEl.append(report);
  const nav=make('div',undefined,'cl-talia-nav');
  const previous=make('button','Previous research action','btn secondary');
  const next=make('button','Next research action','btn');
  const lab=make('a','Open the canonical nine-stage Learning Labs','btn secondary');
  lab.href='labs.html';nav.append(previous,next,lab);rootEl.append(nav);
  const footer=make('p','All guidance and ordinary retries are included for every member who can access this learning screen. The original Free watchlist still has 20 stored symbols. Advanced persistence, alerts and trade plans require separate entitlement. No Lumens are spent.','cl-talia-disclosure');
  rootEl.append(footer);
  let bars=C.fictional(caseId);
  function stopTyping(){if(typing!==null){root.clearInterval(typing);typing=null}}
  function showFull(){stopTyping();typingAt=transcript.textContent.length;narration.textContent=transcript.textContent;play.textContent='Replay written explanation'}
  const reduced=()=>root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  function runTyping(reset=false){
   stopTyping();if(reset){typingAt=0;narration.textContent=''}
   if(reduced()){showFull();return}
   play.textContent='Pause written explanation';
   typing=root.setInterval(()=>{
    if(!rootEl.isConnected){stopTyping();return}
    typingAt=Math.min(transcript.textContent.length,typingAt+4);
    narration.textContent=transcript.textContent.slice(0,typingAt);
    if(typingAt===transcript.textContent.length)showFull();
   },36);
  }
  play.addEventListener('click',()=>{
   if(typing!==null){stopTyping();play.textContent='Resume written explanation';return}
   runTyping(typingAt>=transcript.textContent.length);
  });
  full.addEventListener('click',showFull);
  function currentStep(){return C.STEPS[step]}
  const recent=()=>checkpoints.filter(x=>x.topic===topicId&&x.step===currentStep()&&x.fictionalCase===caseId);
  function renderNarration(){
   const current=C.byId(topicId),stage=currentStep();
   indicator.textContent='Research action '+(step+1)+' of 8 · '+stage+
    ' · Primary skill dimension: '+dimension(stage);
   heading.textContent=current.title;
   transcript.textContent=C.stageText(current,stage);
   runTyping(true);
   cue.textContent=C.prompt(current,stage)+' Record at least 25 characters of reasoning; an unresolved question is a valid response.';
   previous.disabled=step===0;next.disabled=step===7;
   const saved=recent();
   response.value=saved.length?saved[saved.length-1].answer:'';
   mistake.value=saved.length?saved[saved.length-1].mistake:'NONE';
   result.textContent=saved.length?'Prior in-session checkpoint preserved. Edits create another chronological revision.':'Not yet recorded for this action.';
   more.replaceChildren();
  }
  function extraText(kind){
   const t=C.byId(topicId);
   return kind==='depth'?
    'More depth — '+t.definition+' Worked case: '+t.worked+
    ' Verify source and mathematical assumptions: '+t.investigate+
    ' Common wrong approach: '+t.contradiction+
    ' Why it matters: a visual pattern or indicator is not an order, a verified source, or a known future outcome.':
    'Independent transfer — '+t.transfer+
    ' Use a fresh fictional chart or a separately time-stamped issuer source. Explain what is known, absent and contrary before deciding.';
  }
  deeper.addEventListener('click',()=>{
   const p=make('p',extraText('depth'));more.append(p);
  });
  example.addEventListener('click',()=>{
   more.append(make('p',extraText('transfer')));
  });
  topics.addEventListener('change',()=>{
   topicId=topics.value;step=0;renderNarration();renderReport();
  });
  scenarios.addEventListener('change',()=>{
   caseId=scenarios.value;bars=C.fictional(caseId);visible=12;draw();
  });
  overlay.addEventListener('change',()=>{seriesMode=overlay.value;draw()});
  function reveal(){
   if(visible>=bars.length)return;
   if(currentStep()==='Practice'&&!recent().some(x=>x.cutoff===visible)){
    result.textContent='Document your initial practice observation before viewing another fictional candle.';
    response.focus();return;
   }
   reveals.push({topic:topicId,at:new Date().toISOString(),cutoff:visible});
   visible+=1;draw();renderReport();
  }
  nextCandle.addEventListener('click',reveal);
  restart.addEventListener('click',()=>{visible=12;draw()});
  previous.addEventListener('click',()=>{if(step>0){step--;renderNarration()}});
  next.addEventListener('click',()=>{if(step<7){step++;renderNarration()}});
  save.addEventListener('click',()=>{
   const value=response.value.trim();
   if(value.length<25){result.textContent='Please record at least 25 characters. You may describe missing information, WATCH, REJECT or NO TRADE; retries are free.';return}
   const event={topic:topicId,step:currentStep(),dimension:dimension(currentStep()),
    answer:value.slice(0,1400),mistake:mistake.value,symbol:selectedSymbol,cutoff:visible,
    fictionalCase:caseId,at:new Date().toISOString()};
   const prior=recent()[0];
   checkpoints.push(event);
   if(prior)revisions.push({topic:topicId,step:event.step,at:event.at});
   result.textContent='Research practice recorded for this browser session at '+event.at+'. Not an independently graded answer or persistent watchlist save.';
   renderReport();
  });
  retry.addEventListener('click',()=>{
   more.append(make('p',extraText('depth')));
   result.textContent='Try again using clearer evidence, source time, alternative interpretation and invalidation. Additional attempts are free.';
   response.focus();
  });
  function renderReport(){
   metrics.replaceChildren();history.replaceChildren();
   for(const dim of C.DIMS){
    const matching=checkpoints.filter(x=>x.dimension===dim);
    const box=make('div',undefined,'cl-talia-metric');
    box.append(make('strong',dim),make('span',matching.length+' recorded research attempt'+(matching.length===1?'':'s')));
    metrics.append(box);
   }
   const mistakes=new Map();
   for(const entry of checkpoints){
    if(entry.mistake!=='NONE')mistakes.set(entry.mistake,(mistakes.get(entry.mistake)||0)+1);
   }
   const unique=new Set(checkpoints.map(x=>x.topic+'|'+x.step));
   reportText.textContent='Ungraded member-session evidence · '+unique.size+' distinct subject/action checkpoints across '+
    new Set(checkpoints.map(x=>x.topic)).size+' subjects · '+revisions.length+' written revisions · '+
    reveals.length+' fictional bar reveals · '+selectedRecordCount+' member-owned watchlist records available on this page. '+
    'Not Yet Assessed remains the only formal mastery status shown here.';
   if(!checkpoints.length)history.append(make('li','No practice checkpoints yet. Start with Observe.'));
   for(const [key,count] of mistakes){
    history.append(make('li',key.replaceAll('_',' ')+' noted '+count+' time'+(count===1?'':'s')+'. Revisit Talia’s explanations and the related Lab.'));
   }
   for(const x of checkpoints.slice(-10).reverse()){
    history.append(make('li',x.at+' · '+C.byId(x.topic).title+' · '+x.step+' · '+
     'evidence cutoff: fictional bar '+x.cutoff+' · '+(x.mistake==='NONE'?'No misconception selected':x.mistake.replaceAll('_',' '))));
   }
  }
  function reportString(){
   return [
    'Crownlight Talia — Watchlist Research Report (UNGRADED, IN-SESSION)',
    'Generated '+new Date().toISOString(),'Source: member-entered fictional educational exercises, not market data',
    'No official assessment grade, trade outcome or entitlement is implied.',
    'Advanced records seen: '+selectedRecordCount,
    ...C.DIMS.map(d=>d+': '+checkpoints.filter(x=>x.dimension===d).length+' practice checkpoint(s)'),
    ...checkpoints.map(e=>[e.at,e.topic,e.step,e.dimension,e.fictionalCase,
     'symbol '+(e.symbol||'NONE'),'cutoff '+e.cutoff,'misconception '+e.mistake,'reasoning '+e.answer].join(' | '))
   ].join('\n');
  }
  copy.addEventListener('click',async()=>{
   try{
    if(!root.navigator?.clipboard?.writeText)throw Error('Copy unavailable');
    await root.navigator.clipboard.writeText(reportString());
    reportStatus.textContent='Copied the research report to your clipboard. It is not a persistent server-saved assessment.';
   }catch{
    reportStatus.textContent='Clipboard unavailable in this browser. Checkpoint history remains visible above; do not assume it was saved.';
   }
  });
  function draw(){
   if(disposed)return;
   const set=bars.slice(0,visible),closes=set.map(x=>x.close),names=set.map((_,i)=>'Bar '+(i+1));
   const latest=set[set.length-1];
   readout.textContent='Observed fictional candles '+visible+' / '+bars.length+' · Latest O $'+latest.open.toFixed(2)+
    ' · H $'+latest.high.toFixed(2)+' · L $'+latest.low.toFixed(2)+' · C $'+latest.close.toFixed(2)+
    ' · Volume '+latest.volume.toLocaleString()+' shares · Not market data.';
   priceTable.replaceChildren();
   const tr=make('tr');for(const txt of ['Open','High','Low','Close','Volume'])tr.append(make('th',txt));
   const val=make('tr');for(const n of [latest.open,latest.high,latest.low,latest.close])val.append(make('td','$'+n.toFixed(2)));
   val.append(make('td',latest.volume.toLocaleString()));priceTable.append(tr,val);
   nextCandle.disabled=visible===bars.length;
   if(!chart)return;
   const indicators=[],palette={up:'#31c6a2',down:'#e77b91',blue:'#8ec6ed',gold:'#f1c778'};
   const guides=[['H',latest.high,'#f1ca87'],['O',latest.open,'#83c9f4'],
    ['C',latest.close,'#daeefc'],['L',latest.low,'#eaa883']].map(([k,p,c])=>({
    yAxis:p,label:{show:true,formatter:k+' $'+p.toFixed(2),position:'end',color:c},
    lineStyle:{color:c,type:'dashed',width:1}}));
   const price={name:'Fictional OHLC',type:'candlestick',xAxisIndex:0,yAxisIndex:0,
    data:set.map(x=>[x.open,x.close,x.low,x.high]),barMaxWidth:16,
    itemStyle:{color:palette.up,color0:palette.down,borderColor:palette.up,borderColor0:palette.down},
    markLine:{silent:true,symbol:['none','none'],animation:false,data:guides}};
   indicators.push(price);
   const volume={name:'Fictional volume',type:'bar',xAxisIndex:1,yAxisIndex:1,
    data:set.map(x=>({value:x.volume,itemStyle:{color:x.close>=x.open?palette.up:palette.down}}))};
   indicators.push(volume);
   let modeText='OHLCV only · no indicator is independently predictive.';
   if(seriesMode==='ema'){
    for(const n of [9,20]){
     indicators.push({name:'EMA '+n,type:'line',data:C.ema(closes,n),xAxisIndex:0,yAxisIndex:0,
      showSymbol:false,connectNulls:false,lineStyle:{width:2,color:n===9?palette.gold:palette.blue}});
    }
    modeText='EMA 9/20: seed after 9/20 completed closes. Lagging context, not an entry trigger.';
   }else if(seriesMode==='vwap'){
    indicators.push({name:'Bar-based session VWAP',type:'line',data:C.vwap(set),xAxisIndex:0,yAxisIndex:0,
     showSymbol:false,lineStyle:{width:2,color:palette.gold}});
    modeText='Approximate bar-typical-price VWAP; not trade-by-trade execution VWAP.';
   }else if(seriesMode==='bollinger'){
    const bands=C.bollinger(closes);
    for(const [key,label,color] of [['upper','Upper band',palette.blue],['middle','SMA 20',palette.gold],['lower','Lower band',palette.blue]]){
     indicators.push({name:label,type:'line',data:bands.map(x=>x?x[key]:null),xAxisIndex:0,yAxisIndex:0,
      showSymbol:false,lineStyle:{width:key==='middle'?2:1.4,type:key==='middle'?'solid':'dashed',color}});
    }
    modeText='Bollinger 20 ± 2 population SD; not a mechanical buy/sell signal.';
   }else if(seriesMode==='rsi'){
    const data=C.rsi(closes,14);
    indicators.push({name:'RSI 14',type:'line',data,xAxisIndex:2,yAxisIndex:2,
     showSymbol:false,connectNulls:false,lineStyle:{color:palette.gold,width:2}});
    modeText='Wilder RSI 14 (0–100); no plotted value before 14 changes.';
   }else if(seriesMode==='macd'){
    const m=C.macd(closes);
    for(const [key,label,color] of [['line','MACD',palette.gold],['signal','Signal 9',palette.blue]]){
     indicators.push({name:label,type:'line',data:m[key],xAxisIndex:2,yAxisIndex:2,
      showSymbol:false,connectNulls:false,lineStyle:{color,width:2}});
    }
    indicators.push({name:'Histogram',type:'bar',data:m.hist,xAxisIndex:2,yAxisIndex:2,
     itemStyle:{color:palette.up}});
    modeText='MACD 12/26/9 uses completed closes; signal line needs 9 valid MACD observations.';
   }
   const hasLower=['rsi','macd'].includes(seriesMode);
   chart.setOption({animation:false,backgroundColor:'transparent',
    textStyle:{color:'#d6e7f1'},legend:{top:0,textStyle:{color:'#bad4e2'},type:'scroll'},
    tooltip:{trigger:'axis',confine:true,axisPointer:{type:'cross'}},
    grid:hasLower?
     [{left:62,right:103,top:44,height:'46%'},{left:62,right:103,top:'60%',height:'12%'},
      {left:62,right:103,top:'77%',height:'14%'}]:
     [{left:62,right:103,top:44,height:'66%'},{left:62,right:103,top:'78%',height:'15%'},
      {left:62,right:103,top:'77%',height:'14%'}],
    xAxis:[0,1,2].map(i=>({type:'category',data:names,gridIndex:i,show:i!==0&&((i===2&&hasLower)||(i===1&&!hasLower)),axisLabel:{color:'#b7cddd',hideOverlap:true}})),
    yAxis:[0,1,2].map(i=>({type:'value',gridIndex:i,scale:i!==1,min:i===1?0:undefined,
     axisLabel:{color:'#b7cddd'},splitLine:{lineStyle:{color:'#244154'}}})),
    series:indicators},{notMerge:true,lazyUpdate:false});
   const n=chartDiv.nextElementSibling;
   if(n?.classList.contains('cl-talia-indicator-caption'))n.textContent=modeText;
   else chartDiv.insertAdjacentElement('afterend',make('p',modeText,'cl-talia-indicator-caption'));
  }
  function reset(){stopTyping();checkpoints.length=0;revisions.length=0;reveals.length=0;selectedRecordCount=0;selectedSymbol='';activeSymbol.textContent='Current member-entered symbol: none selected.';topicId='building';step=0;caseId='trend';visible=12;seriesMode='none';
   topics.value=topicId;scenarios.value=caseId;overlay.value=seriesMode;bars=C.fictional('trend');
   response.value='';renderNarration();renderReport();draw();
  }
  function setRecords(records){if(disposed)return;selectedRecordCount=Array.isArray(records)?records.length:0;renderReport()}
  function focusRecord({symbol}={}){
   const value=String(symbol||'').trim().toUpperCase();
   if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(value))return false;
   selectedSymbol=value;
   activeSymbol.textContent='Current member-entered symbol: '+value+'. This is your research context only; fictional examples are NOT prices for '+value+'.';
   rootEl.scrollIntoView?.({block:'start',behavior:'smooth'});
   return true;
  }
  function dispose(){disposed=true;++epoch;stopTyping();resize?.disconnect();chart?.dispose();chart=null;checkpoints.length=0;revisions.length=0;reveals.length=0;rootEl.remove()}
  renderNarration();renderReport();draw();
  Promise.resolve().then(async()=>{
   try{
    if(disposed||!rootEl.isConnected)return;
    const engine=await root.CrownlightECharts?.load?.();
    if(disposed||!rootEl.isConnected||!engine)return;
    chart=engine.init(chartDiv,null,{renderer:'canvas'});
    if(typeof ResizeObserver!=='undefined'){
     resize=new ResizeObserver(()=>chart?.resize());resize.observe(chartDiv);
    }
    draw();
   }catch{chartDiv.textContent='Chart could not load. The OHLCV table and Talia’s written instruction remain available.'}
  });
  return Object.freeze({element:rootEl,reset,setRecords,focusRecord,dispose,reportString});
 }
 function mount({host,source='free',records=[]}={}){
  if(!host)return null;
  const prior=host._groundUpTaliaV4;
  if(prior)return prior;
  const instance=create({source,records});
  host.append(instance.element);
  host._groundUpTaliaV4=instance;
  return instance;
 }
 function mountFree(){
  const host=document.getElementById('free-watchlist-talia-v4-host');
  if(host)mount({host,source:'free'});
 }
 const API=Object.freeze({mount,mountFree,create,version:'4.0'});
 root.GroundUpTaliaWorkstationV4=API;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountFree,{once:true});
 else mountFree();
})(globalThis);
+x.modeledLoss.toFixed(2)+'. Educational estimate, not a guaranteed stop fill.':
    'Invalid inputs: a long entry must exceed its stop reference and risk values must be positive.';
  }
  rf.addEventListener('input',calcRisk);riskLab.append(rf,riskOut);calcRisk();
  rvolLab.append(make('h3','Relative Volume and Dated Float'),
   make('p','RVOL compares like-for-like time-of-day intervals. A float ratio does not establish actual rotation among distinct owners.'));
  const vf=make('div',undefined,'cl-talia-number-fields');
  const today=numeric(vf,'Current cumulative volume',180000),baseline=numeric(vf,'Comparable cumulative baseline',60000),
   float=numeric(vf,'Reported float shares',10000000);
  const rvolOut=make('p',undefined,'cl-talia-calc-output');rvolOut.setAttribute('role','status');
  function calcRvol(){
   const [a,b,c]=[+today.value,+baseline.value,+float.value];
   rvolOut.textContent=a>=0&&b>0&&c>0&&[a,b,c].every(Number.isFinite)?
    'Illustrative RVOL '+(a/b).toFixed(2)+'×; volume / dated float '+(a/c*100).toFixed(2)+
    '%. Neither is a unique-holder count, borrow confirmation or real-time liquidity measurement.':
    'Enter a positive comparable baseline and float.';
  }
  vf.addEventListener('input',calcRvol);rvolLab.append(vf,rvolOut);calcRvol();
  calculators.append(riskLab,rvolLab);rootEl.append(calculators);
  const question=make('section',undefined,'cl-talia-prompt');
  question.append(make('h3','Talia’s decision checkpoint'));
  const cue=make('p');
  const response=make('textarea');response.rows=4;response.maxLength=1400;
  response.placeholder='Distinguish observed facts, uncertainties and what would change your conclusion.';
  response.setAttribute('aria-label','Your research reasoning and evidence');
  const mistakeLabel=make('label','Which misconception or research gap are you checking?');
  const mistake=select(['NONE','MISSING_SOURCE','FUTURE_KNOWLEDGE','INDICATOR_CERTAINTY','LIQUIDITY_RISK','NO_INVALIDATION','OTHER'],
   ['No specific problem identified','Unverified issuer / source','Using information from the future',
    'Treating an indicator as certain','Ignoring spread, borrow or liquidity',
    'Missing invalidation / risk plan','Other misconception']);
  mistakeLabel.append(mistake);
  const save=make('button','Record ungraded research checkpoint','btn');
  const retry=make('button','Retry with more instruction · Free','btn secondary');
  const result=make('p',undefined,'cl-talia-result');result.setAttribute('role','status');
  result.setAttribute('aria-live','polite');
  question.append(cue,response,mistakeLabel,save,retry,result);
  rootEl.append(question);
  const report=make('section',undefined,'cl-talia-report');
  report.append(make('h3','Your Talia Watchlist Research Report'));
  const reportText=make('p','This member-session report covers research practice, not official assessment mastery.');
  const metrics=make('div',undefined,'cl-talia-metrics');
  const history=make('ol',undefined,'cl-talia-history');
  const copy=make('button','Copy research report','btn secondary');
  const reportStatus=make('p',undefined,'cl-talia-result');
  report.append(reportText,metrics,make('h4','Research checkpoints and recurring errors'),history,copy,reportStatus);
  rootEl.append(report);
  const nav=make('div',undefined,'cl-talia-nav');
  const previous=make('button','Previous research action','btn secondary');
  const next=make('button','Next research action','btn');
  const lab=make('a','Open the canonical nine-stage Learning Labs','btn secondary');
  lab.href='labs.html';nav.append(previous,next,lab);rootEl.append(nav);
  const footer=make('p','All guidance and ordinary retries are included for every member who can access this learning screen. The original Free watchlist still has 20 stored symbols. Advanced persistence, alerts and trade plans require separate entitlement. No Lumens are spent.','cl-talia-disclosure');
  rootEl.append(footer);
  let bars=C.fictional(caseId);
  function stopTyping(){if(typing!==null){root.clearInterval(typing);typing=null}}
  function showFull(){stopTyping();typingAt=transcript.textContent.length;narration.textContent=transcript.textContent;play.textContent='Replay written explanation'}
  const reduced=()=>root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  function runTyping(reset=false){
   stopTyping();if(reset){typingAt=0;narration.textContent=''}
   if(reduced()){showFull();return}
   play.textContent='Pause written explanation';
   typing=root.setInterval(()=>{
    if(!rootEl.isConnected){stopTyping();return}
    typingAt=Math.min(transcript.textContent.length,typingAt+4);
    narration.textContent=transcript.textContent.slice(0,typingAt);
    if(typingAt===transcript.textContent.length)showFull();
   },36);
  }
  play.addEventListener('click',()=>{
   if(typing!==null){stopTyping();play.textContent='Resume written explanation';return}
   runTyping(typingAt>=transcript.textContent.length);
  });
  full.addEventListener('click',showFull);
  function currentStep(){return C.STEPS[step]}
  const recent=()=>checkpoints.filter(x=>x.topic===topicId&&x.step===currentStep()&&x.fictionalCase===caseId);
  function renderNarration(){
   const current=C.byId(topicId),stage=currentStep();
   indicator.textContent='Research action '+(step+1)+' of 8 · '+stage+
    ' · Primary skill dimension: '+dimension(stage);
   heading.textContent=current.title;
   transcript.textContent=C.stageText(current,stage);
   runTyping(true);
   cue.textContent=C.prompt(current,stage)+' Record at least 25 characters of reasoning; an unresolved question is a valid response.';
   previous.disabled=step===0;next.disabled=step===7;
   const saved=recent();
   response.value=saved.length?saved[saved.length-1].answer:'';
   mistake.value=saved.length?saved[saved.length-1].mistake:'NONE';
   result.textContent=saved.length?'Prior in-session checkpoint preserved. Edits create another chronological revision.':'Not yet recorded for this action.';
   more.replaceChildren();
  }
  function extraText(kind){
   const t=C.byId(topicId);
   return kind==='depth'?
    'More depth — '+t.definition+' Worked case: '+t.worked+
    ' Verify source and mathematical assumptions: '+t.investigate+
    ' Common wrong approach: '+t.contradiction+
    ' Why it matters: a visual pattern or indicator is not an order, a verified source, or a known future outcome.':
    'Independent transfer — '+t.transfer+
    ' Use a fresh fictional chart or a separately time-stamped issuer source. Explain what is known, absent and contrary before deciding.';
  }
  deeper.addEventListener('click',()=>{
   const p=make('p',extraText('depth'));more.append(p);
  });
  example.addEventListener('click',()=>{
   more.append(make('p',extraText('transfer')));
  });
  topics.addEventListener('change',()=>{
   topicId=topics.value;step=0;renderNarration();renderReport();
  });
  scenarios.addEventListener('change',()=>{
   caseId=scenarios.value;bars=C.fictional(caseId);visible=12;draw();
  });
  overlay.addEventListener('change',()=>{seriesMode=overlay.value;draw()});
  function reveal(){
   if(visible>=bars.length)return;
   if(currentStep()==='Practice'&&!recent().some(x=>x.cutoff===visible)){
    result.textContent='Document your initial practice observation before viewing another fictional candle.';
    response.focus();return;
   }
   reveals.push({topic:topicId,at:new Date().toISOString(),cutoff:visible});
   visible+=1;draw();renderReport();
  }
  nextCandle.addEventListener('click',reveal);
  restart.addEventListener('click',()=>{visible=12;draw()});
  previous.addEventListener('click',()=>{if(step>0){step--;renderNarration()}});
  next.addEventListener('click',()=>{if(step<7){step++;renderNarration()}});
  save.addEventListener('click',()=>{
   const value=response.value.trim();
   if(value.length<25){result.textContent='Please record at least 25 characters. You may describe missing information, WATCH, REJECT or NO TRADE; retries are free.';return}
   const event={topic:topicId,step:currentStep(),dimension:dimension(currentStep()),
    answer:value.slice(0,1400),mistake:mistake.value,symbol:selectedSymbol,cutoff:visible,
    fictionalCase:caseId,at:new Date().toISOString()};
   const prior=recent()[0];
   checkpoints.push(event);
   if(prior)revisions.push({topic:topicId,step:event.step,at:event.at});
   result.textContent='Research practice recorded for this browser session at '+event.at+'. Not an independently graded answer or persistent watchlist save.';
   renderReport();
  });
  retry.addEventListener('click',()=>{
   more.append(make('p',extraText('depth')));
   result.textContent='Try again using clearer evidence, source time, alternative interpretation and invalidation. Additional attempts are free.';
   response.focus();
  });
  function renderReport(){
   metrics.replaceChildren();history.replaceChildren();
   for(const dim of C.DIMS){
    const matching=checkpoints.filter(x=>x.dimension===dim);
    const box=make('div',undefined,'cl-talia-metric');
    box.append(make('strong',dim),make('span',matching.length+' recorded research attempt'+(matching.length===1?'':'s')));
    metrics.append(box);
   }
   const mistakes=new Map();
   for(const entry of checkpoints){
    if(entry.mistake!=='NONE')mistakes.set(entry.mistake,(mistakes.get(entry.mistake)||0)+1);
   }
   const unique=new Set(checkpoints.map(x=>x.topic+'|'+x.step));
   reportText.textContent='Ungraded member-session evidence · '+unique.size+' distinct subject/action checkpoints across '+
    new Set(checkpoints.map(x=>x.topic)).size+' subjects · '+revisions.length+' written revisions · '+
    reveals.length+' fictional bar reveals · '+selectedRecordCount+' member-owned watchlist records available on this page. '+
    'Not Yet Assessed remains the only formal mastery status shown here.';
   if(!checkpoints.length)history.append(make('li','No practice checkpoints yet. Start with Observe.'));
   for(const [key,count] of mistakes){
    history.append(make('li',key.replaceAll('_',' ')+' noted '+count+' time'+(count===1?'':'s')+'. Revisit Talia’s explanations and the related Lab.'));
   }
   for(const x of checkpoints.slice(-10).reverse()){
    history.append(make('li',x.at+' · '+C.byId(x.topic).title+' · '+x.step+' · '+
     'evidence cutoff: fictional bar '+x.cutoff+' · '+(x.mistake==='NONE'?'No misconception selected':x.mistake.replaceAll('_',' '))));
   }
  }
  function reportString(){
   return [
    'Crownlight Talia — Watchlist Research Report (UNGRADED, IN-SESSION)',
    'Generated '+new Date().toISOString(),'Source: member-entered fictional educational exercises, not market data',
    'No official assessment grade, trade outcome or entitlement is implied.',
    'Advanced records seen: '+selectedRecordCount,
    ...C.DIMS.map(d=>d+': '+checkpoints.filter(x=>x.dimension===d).length+' practice checkpoint(s)'),
    ...checkpoints.map(e=>[e.at,e.topic,e.step,e.dimension,e.fictionalCase,
     'symbol '+(e.symbol||'NONE'),'cutoff '+e.cutoff,'misconception '+e.mistake,'reasoning '+e.answer].join(' | '))
   ].join('\n');
  }
  copy.addEventListener('click',async()=>{
   try{
    if(!root.navigator?.clipboard?.writeText)throw Error('Copy unavailable');
    await root.navigator.clipboard.writeText(reportString());
    reportStatus.textContent='Copied the research report to your clipboard. It is not a persistent server-saved assessment.';
   }catch{
    reportStatus.textContent='Clipboard unavailable in this browser. Checkpoint history remains visible above; do not assume it was saved.';
   }
  });
  function draw(){
   if(disposed)return;
   const set=bars.slice(0,visible),closes=set.map(x=>x.close),names=set.map((_,i)=>'Bar '+(i+1));
   const latest=set[set.length-1];
   readout.textContent='Observed fictional candles '+visible+' / '+bars.length+' · Latest O $'+latest.open.toFixed(2)+
    ' · H $'+latest.high.toFixed(2)+' · L $'+latest.low.toFixed(2)+' · C $'+latest.close.toFixed(2)+
    ' · Volume '+latest.volume.toLocaleString()+' shares · Not market data.';
   priceTable.replaceChildren();
   const tr=make('tr');for(const txt of ['Open','High','Low','Close','Volume'])tr.append(make('th',txt));
   const val=make('tr');for(const n of [latest.open,latest.high,latest.low,latest.close])val.append(make('td','$'+n.toFixed(2)));
   val.append(make('td',latest.volume.toLocaleString()));priceTable.append(tr,val);
   nextCandle.disabled=visible===bars.length;
   if(!chart)return;
   const indicators=[],palette={up:'#31c6a2',down:'#e77b91',blue:'#8ec6ed',gold:'#f1c778'};
   const guides=[['H',latest.high,'#f1ca87'],['O',latest.open,'#83c9f4'],
    ['C',latest.close,'#daeefc'],['L',latest.low,'#eaa883']].map(([k,p,c])=>({
    yAxis:p,label:{show:true,formatter:k+' $'+p.toFixed(2),position:'end',color:c},
    lineStyle:{color:c,type:'dashed',width:1}}));
   const price={name:'Fictional OHLC',type:'candlestick',xAxisIndex:0,yAxisIndex:0,
    data:set.map(x=>[x.open,x.close,x.low,x.high]),barMaxWidth:16,
    itemStyle:{color:palette.up,color0:palette.down,borderColor:palette.up,borderColor0:palette.down},
    markLine:{silent:true,symbol:['none','none'],animation:false,data:guides}};
   indicators.push(price);
   const volume={name:'Fictional volume',type:'bar',xAxisIndex:1,yAxisIndex:1,
    data:set.map(x=>({value:x.volume,itemStyle:{color:x.close>=x.open?palette.up:palette.down}}))};
   indicators.push(volume);
   let modeText='OHLCV only · no indicator is independently predictive.';
   if(seriesMode==='ema'){
    for(const n of [9,20]){
     indicators.push({name:'EMA '+n,type:'line',data:C.ema(closes,n),xAxisIndex:0,yAxisIndex:0,
      showSymbol:false,connectNulls:false,lineStyle:{width:2,color:n===9?palette.gold:palette.blue}});
    }
    modeText='EMA 9/20: seed after 9/20 completed closes. Lagging context, not an entry trigger.';
   }else if(seriesMode==='vwap'){
    indicators.push({name:'Bar-based session VWAP',type:'line',data:C.vwap(set),xAxisIndex:0,yAxisIndex:0,
     showSymbol:false,lineStyle:{width:2,color:palette.gold}});
    modeText='Approximate bar-typical-price VWAP; not trade-by-trade execution VWAP.';
   }else if(seriesMode==='bollinger'){
    const bands=C.bollinger(closes);
    for(const [key,label,color] of [['upper','Upper band',palette.blue],['middle','SMA 20',palette.gold],['lower','Lower band',palette.blue]]){
     indicators.push({name:label,type:'line',data:bands.map(x=>x?x[key]:null),xAxisIndex:0,yAxisIndex:0,
      showSymbol:false,lineStyle:{width:key==='middle'?2:1.4,type:key==='middle'?'solid':'dashed',color}});
    }
    modeText='Bollinger 20 ± 2 population SD; not a mechanical buy/sell signal.';
   }else if(seriesMode==='rsi'){
    const data=C.rsi(closes,14);
    indicators.push({name:'RSI 14',type:'line',data,xAxisIndex:2,yAxisIndex:2,
     showSymbol:false,connectNulls:false,lineStyle:{color:palette.gold,width:2}});
    modeText='Wilder RSI 14 (0–100); no plotted value before 14 changes.';
   }else if(seriesMode==='macd'){
    const m=C.macd(closes);
    for(const [key,label,color] of [['line','MACD',palette.gold],['signal','Signal 9',palette.blue]]){
     indicators.push({name:label,type:'line',data:m[key],xAxisIndex:2,yAxisIndex:2,
      showSymbol:false,connectNulls:false,lineStyle:{color,width:2}});
    }
    indicators.push({name:'Histogram',type:'bar',data:m.hist,xAxisIndex:2,yAxisIndex:2,
     itemStyle:{color:palette.up}});
    modeText='MACD 12/26/9 uses completed closes; signal line needs 9 valid MACD observations.';
   }
   const hasLower=['rsi','macd'].includes(seriesMode);
   chart.setOption({animation:false,backgroundColor:'transparent',
    textStyle:{color:'#d6e7f1'},legend:{top:0,textStyle:{color:'#bad4e2'},type:'scroll'},
    tooltip:{trigger:'axis',confine:true,axisPointer:{type:'cross'}},
    grid:hasLower?
     [{left:62,right:103,top:44,height:'46%'},{left:62,right:103,top:'60%',height:'12%'},
      {left:62,right:103,top:'77%',height:'14%'}]:
     [{left:62,right:103,top:44,height:'66%'},{left:62,right:103,top:'78%',height:'15%'},
      {left:62,right:103,top:'77%',height:'14%'}],
    xAxis:[0,1,2].map(i=>({type:'category',data:names,gridIndex:i,show:i!==0&&((i===2&&hasLower)||(i===1&&!hasLower)),axisLabel:{color:'#b7cddd',hideOverlap:true}})),
    yAxis:[0,1,2].map(i=>({type:'value',gridIndex:i,scale:i!==1,min:i===1?0:undefined,
     axisLabel:{color:'#b7cddd'},splitLine:{lineStyle:{color:'#244154'}}})),
    series:indicators},{notMerge:true,lazyUpdate:false});
   const n=chartDiv.nextElementSibling;
   if(n?.classList.contains('cl-talia-indicator-caption'))n.textContent=modeText;
   else chartDiv.insertAdjacentElement('afterend',make('p',modeText,'cl-talia-indicator-caption'));
  }
  function reset(){stopTyping();checkpoints.length=0;revisions.length=0;reveals.length=0;selectedRecordCount=0;selectedSymbol='';activeSymbol.textContent='Current member-entered symbol: none selected.';topicId='building';step=0;caseId='trend';visible=12;seriesMode='none';
   topics.value=topicId;scenarios.value=caseId;overlay.value=seriesMode;bars=C.fictional('trend');
   response.value='';renderNarration();renderReport();draw();
  }
  function setRecords(records){if(disposed)return;selectedRecordCount=Array.isArray(records)?records.length:0;renderReport()}
  function focusRecord({symbol}={}){
   const value=String(symbol||'').trim().toUpperCase();
   if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(value))return false;
   selectedSymbol=value;
   activeSymbol.textContent='Current member-entered symbol: '+value+'. This is your research context only; fictional examples are NOT prices for '+value+'.';
   rootEl.scrollIntoView?.({block:'start',behavior:'smooth'});
   return true;
  }
  function dispose(){disposed=true;++epoch;stopTyping();resize?.disconnect();chart?.dispose();chart=null;checkpoints.length=0;revisions.length=0;reveals.length=0;rootEl.remove()}
  renderNarration();renderReport();draw();
  Promise.resolve().then(async()=>{
   try{
    if(disposed||!rootEl.isConnected)return;
    const engine=await root.CrownlightECharts?.load?.();
    if(disposed||!rootEl.isConnected||!engine)return;
    chart=engine.init(chartDiv,null,{renderer:'canvas'});
    if(typeof ResizeObserver!=='undefined'){
     resize=new ResizeObserver(()=>chart?.resize());resize.observe(chartDiv);
    }
    draw();
   }catch{chartDiv.textContent='Chart could not load. The OHLCV table and Talia’s written instruction remain available.'}
  });
  return Object.freeze({element:rootEl,reset,setRecords,focusRecord,dispose,reportString});
 }
 function mount({host,source='free',records=[]}={}){
  if(!host)return null;
  const prior=host._groundUpTaliaV4;
  if(prior)return prior;
  const instance=create({source,records});
  host.append(instance.element);
  host._groundUpTaliaV4=instance;
  return instance;
 }
 function mountFree(){
  const host=document.getElementById('free-watchlist-talia-v4-host');
  if(host)mount({host,source:'free'});
 }
 const API=Object.freeze({mount,mountFree,create,version:'4.0'});
 root.GroundUpTaliaWorkstationV4=API;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountFree,{once:true});
 else mountFree();
})(globalThis);
