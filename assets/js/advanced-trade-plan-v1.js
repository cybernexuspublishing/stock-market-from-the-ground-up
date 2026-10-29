/* Advanced Trade-Plan Builder v1 — first-party, member-authenticated UI.
 * Uses the EXISTING advanced-tool-workspace API with append-only scenario_review
 * snapshots. No market data, payment, orders, official grades or local persistence.
 */
(function(root){
 'use strict';
 const q=id=>document.getElementById(id);
 const num=v=>v===''||v===null||v===undefined?null:Number.isFinite(Number(v))?Number(v):null;
 const fixed=x=>Math.round((x+Number.EPSILON)*1e8)/1e8;
 const fmt=x=>Number.isFinite(x)?x.toLocaleString(undefined,{maximumFractionDigits:4}):'—';
 const usd=x=>Number.isFinite(x)?'$'+x.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
 const fields=[
  ['symbol','Ticker or fictional identifier','text',12],
  ['company','Company / instrument identity','text',100],
  ['pattern','Strategy or source-defined pattern','text',120],
  ['direction','Direction','select',['LONG','SHORT']],
  ['decision','Decision','select',['PLAN','WATCH','REJECT','NO TRADE']],
  ['trend','Higher-timeframe trend','text',160],
  ['levels','Important levels and session','textarea',400],
  ['thesis','Research thesis and supporting evidence','textarea',600],
  ['catalyst','Catalyst and its limits','textarea',450],
  ['source','Original source / permitted use','text',180],
  ['sourceUrl','Original primary HTTPS URL (optional)','url',420],
  ['asOf','Observation timestamp with UTC offset','text',45],
  ['sourceAt','Original event publication time with offset (optional)','text',45],
  ['trigger','Planned completed-bar / price entry condition','textarea',350],
  ['invalidation','Initial invalidation and NO TRADE condition','textarea',350],
  ['stopMechanism','Stop mechanism','select',['STOP MARKET (slippage possible)','STOP LIMIT (nonfill possible)','MENTAL / MANUAL (not guaranteed)','TRAILING (trigger changes)','NO ORDER PLANNED']],
  ['holding','Holding period / time-based exit','text',120],
  ['cancel','Reasons to cancel or not take the plan','textarea',350],
  ['alternative','Alternative scenario / contradicting evidence','textarea',350],
  ['entry','Hypothetical entry ($)','number',0],
  ['stop','Invalidation / stop reference ($)','number',0],
  ['target1','Target 1 ($)','number',0],
  ['target2','Target 2 ($, optional)','number',0],
  ['stretch','Stretch target ($, optional)','number',0],
  ['scale1','Target 1 scale-out allocation (%)','number',0],
  ['scale2','Target 2 scale-out allocation (%)','number',0],
  ['scale3','Stretch allocation (%)','number',0],
  ['budget','Planned loss budget ($)','number',0],
  ['capital','Optional account capital ($)','number',0],
  ['requested','Optional desired whole shares','number',0],
  ['spread','Spread stress per share ($)','number',0],
  ['slippage','Additional slippage stress per share ($)','number',0],
  ['gap','Additional gap/halt stress per share ($)','number',0],
  ['partial','Hypothetical filled shares (optional)','number',0],
  ['fill','Hypothetical actual entry price (optional)','number',0]
 ];
 const fieldType=Object.fromEntries(fields.map(([k,,type])=>[k,type]));
 function calculate(p){
  const entry=num(p.entry),stop=num(p.stop),budget=num(p.budget),capital=num(p.capital),
    side=p.direction||'LONG',requested=num(p.requested),partial=num(p.partial),fill=num(p.fill),
    spread=num(p.spread??0),slippage=num(p.slippage??0),gap=num(p.gap??0);
  if(!['LONG','SHORT'].includes(side)||entry===null||stop===null||budget===null||
     ![entry,stop,budget].every(x=>Number.isFinite(x)&&x>0))
    return {ok:false,error:'Enter a positive entry, stop reference and loss budget.'};
  if(side==='LONG'?stop>=entry:stop<=entry)
    return {ok:false,error:'Stop reference must be on the loss side for the selected direction.'};
  if([spread,slippage,gap].some(x=>x===null||x<0||!Number.isFinite(x)))
    return {ok:false,error:'Spread, slippage and gap stresses must be zero or positive.'};
  if(capital!==null&&(!Number.isFinite(capital)||capital<=0))
    return {ok:false,error:'Optional account capital must be positive.'};
  if(requested!==null&&(!Number.isSafeInteger(requested)||requested<=0))
    return {ok:false,error:'Optional requested shares must be a positive whole number.'};
  if(partial!==null&&(!Number.isSafeInteger(partial)||partial<=0))
    return {ok:false,error:'Partial fills must use a positive whole-share quantity.'};
  if(fill!==null&&(!Number.isFinite(fill)||fill<=0))
    return {ok:false,error:'The hypothetical fill price must be positive.'};
  if((partial===null)!==(fill===null))
    return {ok:false,error:'Enter both hypothetical filled shares and fill price, or neither.'};
  const perShare=fixed(Math.abs(entry-stop));
  if(perShare<=0)return {ok:false,error:'Stop distance must be greater than zero.'};
  const theoretical=Math.floor(fixed(budget/perShare)+1e-9);
  const buffer=theoretical>1?1:0; // Visible conservative one-share reserve.
  const riskCap=Math.max(0,theoretical-buffer);
  const capitalCap=capital===null?null:Math.floor(fixed(capital/entry)+1e-9);
  const size=Math.min(riskCap,capitalCap===null?riskCap:capitalCap,
      requested===null?Number.MAX_SAFE_INTEGER:requested);
  if(!Number.isSafeInteger(size)||size<0)
    return {ok:false,error:'Calculated whole-share size is not supported.'};
  if(partial!==null&&partial>size)
    return {ok:false,error:'Hypothetical filled shares cannot exceed planned whole-share quantity.'};
  const validateTarget=(input,label)=>{
   const price=num(input);
   if(price===null)return null;
   if(!Number.isFinite(price)||price<=0||(side==='LONG'?price<=entry:price>=entry))
     throw Error(label+' must be beyond entry on the potential reward side.');
   return price;
  };
  let targets;
  try{targets=[validateTarget(p.target1,'Target 1'),validateTarget(p.target2,'Target 2'),
               validateTarget(p.stretch,'Stretch target')];}catch(e){return {ok:false,error:e.message}}
  const reward=targets.map(x=>x===null?null:fixed(Math.abs(x-entry)));
  const multiplier=side==='LONG'?1:-1;
  const fillVariance=fill===null?null:fixed(multiplier*(fill-entry));
  const partialQty=partial===null?null:Math.min(partial,size);
  const result={ok:true,side,entry,stop,perShare,budget,theoretical,buffer,size,
   capitalCap,capital:capital===null?null:capital,
   cost:fixed(size*entry),modeledLoss:fixed(size*perShare),
   stressPerShare:fixed(perShare+spread+slippage+gap),
   stressedLoss:fixed(size*(perShare+spread+slippage+gap)),
   targetPrices:targets,rewards:reward,rr:reward.map(x=>x===null?null:fixed(x/perShare)),
   exposurePct:capital===null?null:fixed(size*entry/capital*100),
   partialQty,fillVariance,partialFillCost:partialQty===null?null:fixed(partialQty*fill),
   partialFillVariance:partialQty===null?null:fixed(partialQty*fillVariance),
   maxChase:size===0?null:fixed(side==='LONG'?stop+budget/size-spread-slippage:stop-budget/size+spread+slippage),
   note:'Modeled outcomes assume fills at supplied prices; liquidity, borrow, fees, variable spreads and halts can produce different outcomes.'
  };
  return result;
 }
 function scaleOut(r,allocations){
  if(!r?.ok||!Number.isSafeInteger(r.size)||r.size<1)return {ok:false,error:'A valid position is needed before scale-out modeling.'};
  const fractions=[allocations?.scale1??100,allocations?.scale2??0,allocations?.scale3??0].map(Number);
  if(fractions.some(v=>!Number.isInteger(v)||v<0||v>100)||fractions.reduce((a,b)=>a+b,0)!==100)
   return {ok:false,error:'Target allocation must use whole percentages totaling exactly 100%.'};
  const active=[];
  for(let i=0;i<3;i++){
   if(fractions[i]>0&&r.targetPrices[i]===null)
    return {ok:false,error:'Enter a valid target price for each positive allocation.'};
   if(fractions[i]>0)active.push(i);
  }
  const portions=[],sign=r.side==='LONG'?1:-1;
  let assigned=0,gross=0;
  for(let i=0;i<active.length;i++){
   const index=active[i];
   const shares=i===active.length-1?r.size-assigned:Math.floor(r.size*fractions[index]/100);
   const profit=fixed(sign*(r.targetPrices[index]-r.entry)*shares);
   portions.push({target:index+1,percent:fractions[index],price:r.targetPrices[index],shares,grossProfit:profit});
   assigned+=shares;gross+=profit;
  }
  gross=fixed(gross);
  return {ok:true,portions,sharesAssigned:assigned,grossProfit:gross,
   blendedR:r.modeledLoss>0?fixed(gross/r.modeledLoss):null,
   note:'Illustrative whole-share scale-out only; fees, liquidity, gaps, halts and stop changes may produce different outcomes.'};
 }
 function make(tag,txt,cls){const el=document.createElement(tag);if(cls)el.className=cls;
  if(txt!==undefined)el.textContent=String(txt);return el}
 function mount({host,workspaceApi,saveRecord,latestRecords,alive=()=>true}){
  if(!host||!workspaceApi||!saveRecord||!latestRecords)return;
  const main=make('section',undefined,'tp-builder v11-workbench-panel');main.id='tp-builder';
  const header=make('div',undefined,'tp-head');
  header.append(make('div','EDUCATIONAL PLANNING · MEMBER-ENTERED DATA','tp-eyebrow'),
    make('h2','Advanced Trade-Plan Builder'),
    make('p','Independent long/short planning, multi-target objectives, stress assumptions and private plan snapshots. No automatic orders, price feed, protected grades or guaranteed stop fills.'));
  main.append(header);
  const navigation=make('nav',undefined,'tp-nav');navigation.setAttribute('aria-label','Trade-plan builder sections');
  const panes=make('div',undefined,'tp-panes');
  const steps=[
   ['research','1. Research & Evidence'],
   ['risk','2. Risk & Targets'],
   ['review','3. Review & Save'],
   ['timeline','4. Catalyst-to-Chart'],
   ['history','5. Saved Versions']
  ];
  const sections={};
  for(const [id,label] of steps){
   const btn=make('button',label,'btn secondary');btn.type='button';btn.dataset.tpTab=id;
   btn.setAttribute('aria-controls','tp-'+id);
   navigation.append(btn);
   const panel=make('section',undefined,'tp-step');panel.id='tp-'+id;sections[id]=panel;panes.append(panel);
  }
  main.append(navigation,panes);
  let selected='research',chartInstance=null,planResult=null,snapshots=[],loading=false;
  function activate(id){
   if(!sections[id])return;
   selected=id;
   for(const [key] of steps){sections[key].hidden=id!==key;
    const tab=navigation.querySelector('[data-tp-tab="'+key+'"]');
    tab.setAttribute('aria-current',String(key===id));tab.classList.toggle('tp-active',key===id);}
  }
  navigation.addEventListener('click',e=>{const id=e.target.closest('button')?.dataset.tpTab;if(id)activate(id)});
  const groups={research:['symbol','company','pattern','direction','decision','trend','levels','thesis','catalyst','source','sourceUrl','asOf','sourceAt','trigger','invalidation','stopMechanism','holding','cancel','alternative'],
     risk:['entry','stop','target1','target2','stretch','scale1','scale2','scale3','budget','capital','requested','spread','slippage','gap','partial','fill']};
  const talia=make('details',undefined,'tp-talia-method');
  const taliaSummary=make('summary','Talia’s eight-step research and trade-plan method');
  talia.append(taliaSummary);
  const methods=[
   ['Observe','Identify only what a timestamped chart or original source actually shows.'],
   ['Explain','Define price structure, interval volume and every indicator before using them.'],
   ['Investigate','Find issuer filings, catalyst wording, sector evidence and publication chronology.'],
   ['Interpret','State the developing pattern as a hypothesis with a timeframe.'],
   ['Challenge','Identify contradictory evidence, spread/liquidity problems and missing data.'],
   ['Plan','Precommit an observable trigger, invalidation, modeled risk and NO TRADE alternative.'],
   ['Practice','Choose a decision using only the information revealed at that point.'],
   ['Review','Compare the locked plan with later observed outcomes without retrospective rewriting.']
  ];
  const study=make('ol');
  for(const [phase,description] of methods)study.append(make('li',phase+': '+description));
  talia.append(study);
  const tutor=make('a','Open Market Tutor for guided instruction','btn secondary');
  tutor.href='market-tutor.html';talia.append(tutor);
  sections.research.append(talia);
  const form=document.createElement('form');form.id='tp-form';form.noValidate=true;
  for(const [tab,keys] of Object.entries(groups)){
   const grid=make('div',undefined,'tp-grid');
   for(const key of keys){
    const descriptor=fields.find(x=>x[0]===key),wrap=make('div',undefined,'tp-field');
    const label=make('label',descriptor[1]);label.htmlFor='tp-'+key;
    let input;
    if(descriptor[2]==='textarea'){input=make('textarea');input.rows=key==='thesis'?3:2;input.maxLength=descriptor[3]}
    else if(descriptor[2]==='select'){input=make('select');
     for(const option of descriptor[3]){const child=make('option',option);child.value=option;input.append(child)}}
    else {input=make('input');input.type=descriptor[2];if(descriptor[3])input.maxLength=descriptor[3];
     if(descriptor[2]==='number'){input.min='0';input.step='any';input.inputMode='decimal'}}
    input.id='tp-'+key;
    wrap.append(label,input);grid.append(wrap);
   }
   sections[tab].append(grid);
  }
  const defaults={direction:'LONG',decision:'PLAN',budget:'25',entry:'5',stop:'4.8',
   target1:'5.6',scale1:'100',scale2:'0',scale3:'0',capital:'',spread:'0',slippage:'0',gap:'0',
   stopMechanism:'STOP MARKET (slippage possible)'};
  for(const [key,val] of Object.entries(defaults)){const e=q('tp-'+key)||sections.risk.querySelector('#tp-'+key)||sections.research.querySelector('#tp-'+key);if(e)e.value=val}
  // No market data or ticker is populated from an external source.
  const get=id=>main.querySelector('#tp-'+id);
  const read=()=>Object.fromEntries(fields.map(([key])=>[key,get(key)?.value?.trim()||'']));
  const fill=data=>{
   for(const [key] of fields){const element=get(key);if(element&&Object.hasOwn(data,key))element.value=String(data[key]??'')}
   calculatePreview();
  };
  const output=make('div',undefined,'tp-stats');output.id='tp-stats';
  const error=make('p','Enter scenario prices to see the modeled risk.','tp-alert');error.setAttribute('role','status');error.setAttribute('aria-live','polite');
  const calcBtn=make('button','Calculate scenario','btn');calcBtn.type='button';
  const chartBtn=make('button','Visualize modeled risk with ECharts','btn secondary');chartBtn.type='button';
  const chart=make('div',undefined,'tp-chart');chart.hidden=true;chart.setAttribute('role','img');chart.setAttribute('aria-label','User-entered modeled loss versus stress loss and planned risk budget');
  const buttonRow=make('div',undefined,'tp-actions');buttonRow.append(calcBtn,chartBtn);
  const riskFoot=make('p','The one-share conservative reserve is ON by default: a $25 budget, $5.00 entry and $4.80 stop yield 124 shares, $24.80 modeled loss and $620.00 position cost. The mathematical limit without this reserve is 125. This is a classroom convention, not a universal trading rule.','small');
  const riskNote=make('p','Long and short values are illustrative. Spread, slippage and gap stress are per share; modeled stress does not cap actual losses. Short borrow and financing eligibility are not computed. Targets are alternatives, not promised fills.','small');
  const scaleOutput=make('div',undefined,'tp-scaleout');
  sections.risk.append(buttonRow,output,error,make('h3','Multi-target scale-out scenario'),
   make('p','Allocate 100% of modeled whole shares across actual target prices. Gross results exclude fees and execution uncertainty.','small'),scaleOutput,chart,riskFoot,riskNote);
  function calculatePreview(){
   const inputs=read(),r=calculate(inputs);planResult=r;output.replaceChildren();
   if(!r.ok){error.textContent=r.error;return r}
   error.textContent='Illustrative model from the prices you entered; no live feed or trading decision.';
   const items=[['Risk / share',usd(r.perShare)],['Conservative whole shares',fmt(r.size)],
    ['Theoretical share cap',fmt(r.theoretical)],['Modeled loss at stop',usd(r.modeledLoss)],
    ['Position cost / notional',usd(r.cost)],['Spread/slippage/gap stress loss',usd(r.stressedLoss)],
    ['Reward/risk target 1',r.rr[0]===null?'—':fmt(r.rr[0])+':1'],
    ['Reward/risk target 2',r.rr[1]===null?'—':fmt(r.rr[1])+':1'],
    ['Stretch target R:R',r.rr[2]===null?'—':fmt(r.rr[2])+':1'],
    ['Capital concentration',r.exposurePct===null?'Account capital missing':fmt(r.exposurePct)+'%'],
    ['Modeled chase boundary',usd(r.maxChase)],
    ['Hypothetical partial-fill exposure',r.partialQty===null?'Not modeled':fmt(r.partialQty)+' shares'],
    ['Entry-fill variance vs planned',r.partialFillVariance===null?'Not modeled':usd(r.partialFillVariance)]];
   for(const [label,val] of items){
    const box=make('div',undefined,'tp-stat');box.append(make('span',label),make('strong',val));output.append(box);
   }
   const scales=scaleOut(r,inputs);
   scaleOutput.replaceChildren();
   if(!scales.ok)scaleOutput.append(make('p',scales.error,'tp-alert'));
   else{
    const tbl=make('table',undefined,'journal-table');
    const head=make('thead'),tr=make('tr');
    for(const label of ['Target','Allocation','Whole shares','Target price','Gross modeled result'])tr.append(make('th',label));
    head.append(tr);tbl.append(head);const body=make('tbody');
    for(const target of scales.portions){const row=make('tr');
     for(const value of ['Target '+target.target,target.percent+'%',target.shares,usd(target.price),usd(target.grossProfit)])row.append(make('td',value));body.append(row)}
    tbl.append(body);scaleOutput.append(tbl,
     make('p','Gross modeled result: '+usd(scales.grossProfit)+'. Blended R: '+fmt(scales.blendedR)+'R. Actual fills and fees may differ.','small'));
   }
   if(chartInstance)plot(r);
   return r;
  }
  function plot(r){
   chartInstance?.setOption({animation:false,backgroundColor:'transparent',
    grid:{top:12,left:145,right:24,bottom:38},
    textStyle:{color:'#d1e0e9'},tooltip:{trigger:'axis',axisPointer:{type:'shadow'}},
    xAxis:{type:'value',axisLabel:{color:'#abc0ce'}},
    yAxis:{type:'category',data:['Modeled stop loss','Stress scenario','Loss budget'],
     axisLabel:{color:'#d1e0e9'}},
    series:[{type:'bar',data:[r.modeledLoss,r.stressedLoss,r.budget],
     itemStyle:{color:'#59bbca'},barMaxWidth:28}]});
   chartInstance.resize();
  }
  calcBtn.addEventListener('click',calculatePreview);
  chartBtn.addEventListener('click',async()=>{
   const r=calculatePreview();if(!r.ok)return;
   if(chart.hidden)chart.hidden=false;
   try{
    const echarts=await root.CrownlightECharts?.load?.();
    if(!echarts)throw Error('Optional ECharts loader is unavailable');
    if(!alive())return;
    if(!chartInstance)chartInstance=echarts.init(chart,'dark',{renderer:'canvas'});
    plot(r);chartBtn.textContent='Refresh modeled risk chart';
   }catch(e){error.textContent='Chart visualization unavailable: '+e.message+'. Numeric risk results remain available.'}
  });
  root.addEventListener('resize',()=>chartInstance?.resize());
  // A member-controlled chart of ONLY REVEALED rows from an already authorized
  // self-supplied CSV. The file is not uploaded or persisted. We deliberately
  // avoid displaying or labeling an event until its as-entered first-public time.
  const timeline=sections.timeline;
  timeline.append(make('h3','Catalyst-to-Chart Timeline'),
   make('p','Load your own authorized OHLCV CSV (max 2 MB, 20,000 rows). Dates require explicit timezone offsets. The display starts with ONE revealed bar and never draws a later bar until you choose Next. This local exercise is NOT independently verified history, a server-secure blind replay, or a live quote feed.'));
  const sourceLink=make('a','Open the existing primary-source research tool','btn secondary');
  sourceLink.href='advanced-tool.html?tool=CATALYST_RESEARCH';timeline.append(sourceLink);
  const fileLabel=make('label','Authorized OHLCV CSV · timestamp,open,high,low,close,volume');fileLabel.htmlFor='tp-csv';
  const file=make('input');file.id='tp-csv';file.type='file';file.accept='.csv,text/csv';
  const controls=make('div',undefined,'tp-actions');
  const back=make('button','Reset to first bar','btn secondary'),
        next=make('button','Reveal next candle','btn'),
        ten=make('button','Reveal next 10','btn secondary');
  for(const b of [back,next,ten])b.type='button';
  controls.append(back,next,ten);
  const tmStatus=make('p','No local candle file selected. The primary-source time entered in Research will control whether the announcement marker can be displayed.','tp-alert');
  tmStatus.setAttribute('role','status');tmStatus.setAttribute('aria-live','polite');
  const tmHost=make('div',undefined,'tp-chart');tmHost.hidden=true;
  tmHost.setAttribute('role','img');
  tmHost.setAttribute('aria-label','Only revealed member-supplied candlesticks, with publication marker if the supplied event time is already revealed');
  timeline.append(fileLabel,file,controls,tmStatus,tmHost);
  let timelineBars=[],revealed=0,tmInstance=null,tmEpoch=0;
  function visibleRows(){return timelineBars.slice(0,revealed)}
  async function paintTimeline(){
   if(!timelineBars.length){tmStatus.textContent='Load an authorized OHLCV CSV to begin.';return}
   if(!alive())return;
   const observations=visibleRows(),last=observations.at(-1);
   if(!last){tmStatus.textContent='No revealed candle.';return}
   const pub=get('sourceAt')?.value.trim()||'';
   const pubTime=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(pub)&&Number.isFinite(Date.parse(pub))?Date.parse(pub):null;
   const eventVisible=pubTime!==null&&pubTime<=last.time.getTime();
   const eventAt=eventVisible?observations.findIndex(x=>x.time.getTime()>=pubTime):-1;
   tmStatus.textContent='Revealed '+observations.length+' / '+timelineBars.length+
     ' member-provided candles · last '+last.time.toISOString()+
     '. '+(pubTime===null?'No valid primary event-publication time entered.':
       eventVisible?'The member-entered publication time is now within the visible interval.':
       'The announcement is NOT YET revealed on this chart.');
   try{
    const engine=await root.CrownlightECharts?.load?.();
    if(!engine||!alive())throw Error('ECharts unavailable');
    tmHost.hidden=false;
    if(!tmInstance)tmInstance=engine.init(tmHost,'dark',{renderer:'canvas'});
    const times=observations.map(x=>x.time.toISOString());
    const candles=observations.map(x=>[x.open,x.close,x.low,x.high]);
    const marker=eventVisible&&eventAt>=0?[{
     xAxis:times[eventAt],label:{formatter:'Source published (member-entered)'},
     lineStyle:{type:'dashed',color:'#dfb979',width:2}}]:[];
    tmInstance.setOption({animation:false,backgroundColor:'transparent',
     textStyle:{color:'#d2e4f0'},
     legend:{top:0,textStyle:{color:'#c5d7e2'},data:['Revealed candles','Visible volume']},
     tooltip:{trigger:'axis',axisPointer:{type:'cross'}},
     grid:[{left:65,right:20,top:45,height:'48%'},{left:65,right:20,top:'77%',height:'13%'}],
     xAxis:[{type:'category',gridIndex:0,data:times,boundaryGap:true,axisLabel:{color:'#a9bdcc',hideOverlap:true}},
      {type:'category',gridIndex:1,data:times,boundaryGap:true,axisLabel:{show:false}}],
     yAxis:[{type:'value',gridIndex:0,scale:true,axisLabel:{color:'#bdcbd8'}},
      {type:'value',gridIndex:1,min:0,axisLabel:{color:'#bdcbd8'}}],
     dataZoom:[{type:'inside',xAxisIndex:[0,1],filterMode:'none'},
      {type:'slider',xAxisIndex:[0,1],bottom:1,height:16,filterMode:'none'}],
     series:[{name:'Revealed candles',type:'candlestick',data:candles,
       itemStyle:{color:'#40c698',color0:'#e0777c',borderColor:'#40c698',borderColor0:'#e0777c'},
       markLine:{silent:true,symbol:'none',data:marker}},
      {name:'Visible volume',type:'bar',data:observations.map(x=>x.volume),xAxisIndex:1,yAxisIndex:1,
       itemStyle:{color:'#6f9cca'}}]});
    tmInstance.resize();
   }catch(e){tmStatus.textContent+=' Chart rendering unavailable; observation count remains intact.'}
  }
  file.addEventListener('change',async()=>{
   const epoch=++tmEpoch;
   timelineBars=[];revealed=0;tmInstance?.clear();
   const uploaded=file.files?.[0];
   if(!uploaded){tmStatus.textContent='No local candle file selected.';return}
   try{
    if(uploaded.size>2000000)throw Error('CSV exceeds the 2 MB limit.');
    const csv=await uploaded.text();if(epoch!==tmEpoch||!alive())return;
    const rows=root.GroundUpResearchBarsV014150?.csvBars?.(csv);
    if(!Array.isArray(rows)||!rows.length)throw Error('Existing validated market-bar import service is unavailable.');
    timelineBars=rows;revealed=1;
    await paintTimeline();
   }catch(e){timelineBars=[];revealed=0;tmStatus.textContent=e.message||'Invalid local OHLCV CSV.'}
  });
  back.addEventListener('click',()=>{if(!timelineBars.length)return;revealed=1;void paintTimeline()});
  next.addEventListener('click',()=>{if(!timelineBars.length)return;revealed=Math.min(timelineBars.length,revealed+1);void paintTimeline()});
  ten.addEventListener('click',()=>{if(!timelineBars.length)return;revealed=Math.min(timelineBars.length,revealed+10);void paintTimeline()});
  const timelineNote=make('p','Source chronology is a member-entered research claim. A candle timestamp may represent an interval start rather than its close. For same-interval news, conservative interpretation and a separately sourced first-public timestamp are essential. This chart does not infer the cause of price changes.','small');
  timeline.append(timelineNote);
  const reviewIntro=make('p','All research is member-reported. A saved version is a new private snapshot, not an independently verified historical record, broker order, or immutable regulatory audit ledger.');
  const planReview=make('div',undefined,'tp-review');
  const snapButton=make('button','Save new private plan version','btn');snapButton.type='button';
  const handoffButton=make('button','Copy plan summary for Journal','btn secondary');handoffButton.type='button';
  const journal=make('a','Open existing Trading Journal','btn secondary');
  journal.href='journal-entry.html';
  const alert=make('p','', 'tp-alert');alert.setAttribute('role','status');alert.setAttribute('aria-live','polite');
  const revButtons=make('div',undefined,'tp-actions');revButtons.append(snapButton,handoffButton,journal);
  sections.review.append(reviewIntro,planReview,revButtons,alert,
   make('p','Journal handoff is deliberate: copy your summary and enter or verify the facts in your authorized Journal record. Automatic cross-product Journal persistence is not active.','small'));
  function summary(data,r){
   return [data.symbol+' | '+data.decision+' | '+data.direction+' | '+data.pattern,
    'As-of: '+data.asOf+' | Source: '+data.source+' | '+data.sourceUrl,
    'Thesis: '+data.thesis,'Catalyst: '+data.catalyst,'Entry condition: '+data.trigger,
    'Entry '+data.entry+' | Stop '+data.stop+' | Targets '+[data.target1,data.target2,data.stretch].filter(Boolean).join('/'),
    'Modeled shares: '+r.size+' | Risk/share '+usd(r.perShare)+' | Modeled loss '+usd(r.modeledLoss),
    'Invalidation: '+data.invalidation,'Cancellation: '+data.cancel,'Alternative: '+data.alternative,
    'Review: '+data.holding+' | Execution: '+data.stopMechanism,
    'Member-entered research, not verified quotes or fills.'].join('\n');
  }
  function prepare(){
   const data=read(),r=calculatePreview();
   if(!r.ok)throw Error(r.error);
   if(!/^[A-Za-z][A-Za-z0-9.-]{0,11}$/.test(data.symbol))
    throw Error('A valid ticker or fictional symbol is required.');
   if(!data.pattern||!data.thesis||!data.trigger||!data.invalidation||!data.source||!data.asOf)
    throw Error('Complete the source, observed date, setup, thesis, entry condition and invalidation.');
   if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(data.asOf)||
      !Number.isFinite(Date.parse(data.asOf))||Date.parse(data.asOf)>Date.now()+300000)
    throw Error('Observation date must be an ISO timestamp with offset and cannot be in the future.');
   if(data.sourceAt&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(data.sourceAt)||
      !Number.isFinite(Date.parse(data.sourceAt))||Date.parse(data.sourceAt)>Date.now()+300000))
    throw Error('Optional event time must be a historical timestamp with timezone.');
   if(data.sourceAt&&Date.parse(data.sourceAt)>Date.parse(data.asOf))
    throw Error('The catalyst cannot be used as evidence before its stated publication time. Recheck event chronology.');
   if(!alive())throw Error('Your account changed. Open your own authorized Workbench again.');
   if(data.sourceUrl){
    let url;try{url=new URL(data.sourceUrl)}catch{throw Error('Original source URL must be valid HTTPS.')}
    if(url.protocol!=='https:'||url.username||url.password||!url.hostname.includes('.'))
     throw Error('Original source URL must be HTTPS without embedded credentials.');
   }
   if(!['PLAN','WATCH','REJECT','NO TRADE'].includes(data.decision))throw Error('Invalid plan decision');
   const allocation=scaleOut(r,data);
   if(!allocation.ok)throw Error(allocation.error);
   return {data,r};
  }
  function refreshReview(){
   planReview.replaceChildren();
   const data=read(),r=calculatePreview();if(!r.ok){planReview.textContent=r.error;return}
   const pre=make('pre',summary(data,r),'tp-summary');planReview.append(pre);
  }
  navigation.querySelector('[data-tp-tab="review"]').addEventListener('click',refreshReview);
  snapButton.addEventListener('click',async()=>{
   if(loading)return;
   try{
    const {data,r}=prepare();loading=true;snapButton.disabled=true;
    const payload={kind:'ADVANCED_TRADE_PLAN_SNAPSHOT_V1',version:1,asOf:data.asOf,
     sourceStatus:'USER_REPORTED_NOT_INDEPENDENTLY_VERIFIED',data,
     modeled:{scaleOut:scaleOut(r,data),perShare:r.perShare,size:r.size,theoretical:r.theoretical,buffer:r.buffer,
      modeledLoss:r.modeledLoss,stressedLoss:r.stressedLoss,exposurePct:r.exposurePct,rr:r.rr}};
    await saveRecord('scenario_review',data.symbol+' '+data.decision,payload);
    if(!alive())return;
    alert.textContent='Private plan version saved under your current Workbench access. This does not record a trade or a Journal entry.';
    await loadHistory();
   }catch(e){alert.textContent=e.message||'Plan not saved.'}
   finally{loading=false;snapButton.disabled=false}
  });
  handoffButton.addEventListener('click',async()=>{
   try{
    const {data,r}=prepare();const text=summary(data,r);
    if(!navigator.clipboard?.writeText)throw Error('Clipboard access unavailable');
    await navigator.clipboard.writeText(text);alert.textContent='Plan summary copied. Review and paste it into the existing Journal.';
   }catch(e){alert.textContent=e.message||'Unable to copy summary.'}
  });
  const historyStatus=make('p','Saved plan versions load only with current member authorization.','tp-alert');historyStatus.setAttribute('role','status');
  const historyList=make('div',undefined,'tp-history');
  const reload=make('button','Refresh saved versions','btn secondary');reload.type='button';
  sections.history.append(reload,historyStatus,historyList);
  async function loadHistory(){
   historyStatus.textContent='Checking your authorized private snapshots…';
   try{
    const records=await latestRecords('scenario_review');if(!alive())return;
    snapshots=records.filter(x=>x.payload?.kind==='ADVANCED_TRADE_PLAN_SNAPSHOT_V1');
    historyList.replaceChildren();
    if(!snapshots.length)historyList.append(make('p','No saved plan versions yet.'));
    for(const rec of snapshots){
     const row=make('article',undefined,'tp-history-row');
     const d=rec.payload?.data||{};
     row.append(make('strong',d.symbol+' · '+d.decision+' · '+d.pattern),
      make('span','Observed '+(d.asOf||'unknown')+' · Saved '+(rec.created_at||'unknown')));
     const load=make('button','Load as a new plan (does not overwrite)','btn secondary');load.type='button';
     load.addEventListener('click',()=>{fill(d);activate('research');alert.textContent='Loaded a saved version as an editable copy. Original snapshot is unchanged.';});
     const handoff=make('a','Transfer saved version to Trading Journal','btn secondary');
     handoff.href='journal.html?source_plan='+encodeURIComponent(String(rec.id));
     handoff.title='Open your existing Journal to create and review a draft; no trade is recorded automatically.';
     row.append(load,handoff);historyList.append(row);
    }
    historyStatus.textContent=snapshots.length+' of the latest 100 workspace records are trade-plan versions; other research reviews are preserved.';
   }catch(e){historyStatus.textContent='Saved plan versions unavailable: '+(e.message||'Unable to load')}
  }
  reload.addEventListener('click',()=>void loadHistory());
  activate('research');calculatePreview();host.append(main);
  void loadHistory();
  function loadCandidate(rec){
   const p=rec?.payload||{};
   const fields={symbol:rec?.title||'',catalyst:p.catalyst||'',source:p.sourceNote||'',
    asOf:p.asOf||'',levels:p.level||'',trigger:p.entry||'',
    invalidation:p.invalidation||'',thesis:p.why||'',decision:p.status==='NO TRADE'?'NO TRADE':'WATCH'};
   for(const [k,field] of [['entry','entry'],['stop','stop'],['target','target1']]){
    const raw=String(p[k]??'').trim();
    if(/^\d+(?:\.\d+)?$/.test(raw))fields[field]=raw;
   }
   fill(fields);activate('research');
  }
  return Object.freeze({calculate,activate,refresh:loadHistory,loadCandidate});
 }
 root.GroundUpAdvancedTradePlanV1=Object.freeze({calculate,scaleOut,mount,version:'1.0'});
})(window);
