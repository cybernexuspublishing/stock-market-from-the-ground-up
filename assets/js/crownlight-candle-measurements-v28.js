/* Advanced Interactive Learning v2.8: optional authored candle measurement lesson.
 * Original fictional worked prices only; never includes GUSIM_DT_C01_L02 data.
 * Preview Question Pass wallet is NON-PERSISTENT and NEVER calls the real Sparks
 * ledger. Formal assessment intentionally delegated to protected Lab service.
 */
(function(root){'use strict';
 const DOLLAR=n=>'$'+Number(n).toFixed(2);
 const WORKED=Object.freeze({open:20,high:22,low:19,close:21.20});
 const ASSESS=Object.freeze([{open:18,high:19.50,low:17,close:18.90},{open:24,high:25.10,low:23.10,close:23.60}]);
 const TRANSFER=Object.freeze({open:50,high:51,low:48,close:49});
 const NAMES=Object.freeze(['Welcome','What Is a Percentage?','Candle Experiment','Calculate the Body','Calculate the Range',
  'Calculate the Percentage','Independent Assessment','Review & Retry','Transfer Challenge','Learning Report']);
 function measures(q){
  if(!q||!Object.values(q).every(n=>typeof n==='number'&&Number.isFinite(n))||
     q.high<=q.low||q.low<0||q.open<q.low||q.open>q.high||q.close<q.low||q.close>q.high)return null;
  const body=Math.abs(q.close-q.open),range=q.high-q.low;
  return {body,range,percentage:100*body/range};
 }
 function make(tag,cls,txt){
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(txt!==undefined)el.textContent=txt;
  return el;
 }
 function create({controlled=false}={}){
  const host=make('section','gu-v28-candle'),chart=make('div','gu-v28-echart');
  host.setAttribute('aria-label','Interactive candlestick measurement prerequisite · Prototype 2.8');
  const intro=make('div','gu-v28-intro');
  intro.append(make('h4','','Foundational candlestick measurement · Prototype 2.8'),
   make('p','','This ungraded module supplements the day-trading decision lesson. All values are originally authored fictional demonstrations, not future server replay candles.'));
  host.append(intro);
  const progress=make('div','gu-v28-progress');
  progress.setAttribute('role','status');host.append(progress);
  const wallet=make('section','gu-v28-wallet');
  wallet.setAttribute('aria-label','Simulated Crownlight Sparks Question Pass preview');
  wallet.append(make('h5','','Question Pass · Demonstration Wallet'));
  const balance=make('p','gu-v28-balance');
  const walletNote=make('p','','SIMULATION ONLY: Test credits, not your Crownlight Sparks balance. No purchases, real debits, entitlements or verified mastery.');
  const add=make('button','btn secondary','Add 1 demo credit');add.type='button';
  wallet.append(balance,walletNote,add);
  host.append(wallet);
  const heading=make('h4','gu-v28-stage-heading');
  const teaching=make('div','gu-v28-explanation');
  host.append(heading,teaching);
  chart.setAttribute('role','img');
  chart.setAttribute('aria-label','Fictional candle with on-chart High, Low, Open and Close horizontal measurement guides');
  const workspace=make('div','gu-v28-workspace');
  const table=make('table','gu-v28-ohlc');
  table.setAttribute('aria-label','Accessible prices on the illustrated candle');
  const thead=make('thead','');
  const headRow=make('tr','');for(const name of ['Price','Value'])headRow.append(make('th','',name));
  thead.append(headRow);table.append(thead);
  const tbody=make('tbody','');table.append(tbody);
  const tableHolder=make('div','gu-v28-reference');
  tableHolder.append(make('h5','','OHLC reference'),table);
  workspace.append(chart,tableHolder);
  host.append(workspace);
  const sliderLabel=make('label','gu-v28-slider-label','Change the fictional Close');
  const slider=make('input','');slider.type='range';slider.min='19';slider.max='22';slider.step='0.05';slider.value='21.20';
  const sliderText=make('output','');sliderLabel.append(slider,sliderText);
  host.append(sliderLabel);
  const question=make('section','gu-v28-question');
  question.append(make('h5','','Check your understanding'));
  const prompt=make('p','gu-v28-prompt');
  const answer=make('input','');answer.type='number';answer.step='any';answer.placeholder='Your calculated value';
  answer.setAttribute('aria-label','Your calculation answer');
  const check=make('button','btn','Check my calculation');check.type='button';
  const reveal=make('button','btn secondary','Reveal Answer · 1 demo credit');reveal.type='button';
  const skip=make('button','btn secondary','Skip Question · 1 demo credit');skip.type='button';
  const confirmBox=make('div','gu-v28-confirm');confirmBox.hidden=true;
  const confirmText=make('p','');
  const yes=make('button','btn','Confirm demo credit');yes.type='button';
  const no=make('button','btn secondary','Cancel');no.type='button';
  confirmBox.append(confirmText,yes,no);
  const feedback=make('p','gu-v28-feedback');
  feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  question.append(prompt,answer,check,reveal,skip,confirmBox,feedback);host.append(question);
  const assessment=make('section','gu-v28-assessment');assessment.hidden=true;
  assessment.append(make('h5','','Assessment boundary'));
  assessment.append(make('p','','Your first formal graded submission must remain in the protected assessment service. It cannot be created, edited, overwritten or scored by this illustration.'));
  const protectedLink=make('a','btn secondary','Return to the protected Lab assessment');
  protectedLink.href='lab-player.html?lab=F2-C07-L01&mode=assessment';
  assessment.append(protectedLink);host.append(assessment);
  const nav=make('div','gu-v28-nav');
  const previous=make('button','btn secondary','Previous teaching step');previous.type='button';
  const next=make('button','btn secondary','Next teaching step');next.type='button';
  nav.append(previous,next);nav.hidden=controlled===true;host.append(nav);
  const state={stage:0,close:WORKED.close,credits:3,attempts:{},revealed:new Set(),
   assisted:new Set(),firstIndependent:null,retryIndependent:null,mastery:'Not Yet Assessed'};
  let plot=null,disposed=false,resize=null,pending='',instance=0;
  const current=()=>{
   if(state.stage===6)return ASSESS[0];
   if(state.stage===7)return ASSESS[1];
   if(state.stage===8)return TRANSFER;
   return {...WORKED,close:state.close};
  };
  function describePrice(q){
   tbody.replaceChildren();
   for(const [key,label] of [['high','High'],['open','Open'],['close','Close'],['low','Low']]){
    const row=make('tr','');row.append(make('th','',label),make('td','',DOLLAR(q[key])));tbody.append(row);
   }
  }
  function draw(){
   const q=current();describePrice(q);
   if(!plot)return;
   const colors={HIGH:'#f1cf81',LOW:'#e6ad80',OPEN:'#93bdeb',CLOSE:'#d4e7f5'};
   const guides=['high','low','open','close'].map(key=>({
    name:key.toUpperCase(),yAxis:q[key],
    lineStyle:{type:'dashed',width:1.4,color:colors[key.toUpperCase()]},
    label:{show:true,formatter:key.toUpperCase()+' '+DOLLAR(q[key]),position:'end',distance:7,
     color:colors[key.toUpperCase()],fontSize:13,fontWeight:'bold'}
   }));
   plot.setOption({
    animation:false,backgroundColor:'#071827',textStyle:{color:'#e8f2f9'},
    grid:{left:65,right:165,top:28,bottom:54,containLabel:false},
    xAxis:{type:'category',data:['Fictional candle'],axisLabel:{color:'#d5e5f0'},axisLine:{lineStyle:{color:'#5b7e97'}}},
    yAxis:{type:'value',min:Number(Math.max(0,q.low-(q.high-q.low)*.14).toFixed(2)),
     max:Number((q.high+(q.high-q.low)*.14).toFixed(2)),axisLabel:{formatter:value=>DOLLAR(value),color:'#b5c9d8'},
     splitLine:{lineStyle:{color:'#294256'}}},
    series:[{name:'Fictional candle',type:'candlestick',
     barWidth:38,barMaxWidth:42,data:[[q.open,q.close,q.low,q.high]],
     itemStyle:{color:'#2ecba3',color0:'#e27591',borderColor:'#2ecba3',borderColor0:'#e27591'},
     markLine:{symbol:['none','none'],silent:true,animation:false,precision:2,data:guides}
    }]
   },{notMerge:true,lazyUpdate:false});
  }
  function inform(text){feedback.textContent=text}
  function setStep(step){
   state.stage=Math.max(0,Math.min(9,Number(step)||0));
   instance++;pending='';confirmBox.hidden=true;answer.value='';feedback.textContent='';
   render();
  }
  function setBalance(){balance.textContent='Simulated available credits: '+state.credits+' · No real Crownlight Sparks affected.'}
  function explain(stage,q){
   const m=measures(q);
   const scripts={
    0:['By the end, you will be able to identify four price levels, explain percent as parts per hundred, calculate a candle body, calculate its full range, and compare the two measurements.',
      'Talia teaches first. Guided calculations can be retried without credits; answer reveals and skips are optional demonstration conveniences.'],
    1:['A percentage means “out of one hundred.” For example, 25% is 25 of 100 equal parts, or 0.25 of a whole.',
      'First divide a part by the total to get a decimal. Next multiply by 100 to express that decimal as a percentage. A percentage requires a clearly defined “whole.”',
      'In a candlestick measurement, the whole is the candle’s full High-to-Low range, not the opening price or the number of candles.'],
    2:['The interactive chart is an authored demonstration. Move the Close slider and observe the body length, candle direction, and relationship between the four prices.',
      'The Open, High and Low remain fixed. Each label and dashed measurement guide is drawn at its actual vertical price level.'],
    3:['Real body = |Close − Open|. Vertical bars | | mean absolute value: take the nonnegative size of the difference.',
      'For the worked candle: |'+DOLLAR(q.close)+' − '+DOLLAR(q.open)+'| = '+DOLLAR(m.body)+'. This measures the opening-to-closing price distance, not the whole candle.'],
    4:['Full range = High − Low. The high is the highest price during this candle; low is the lowest.',
      'For the worked candle: '+DOLLAR(q.high)+' − '+DOLLAR(q.low)+' = '+DOLLAR(m.range)+'. The range includes the real body and the wicks.'],
    5:['Now combine the three ideas in order: identify the real body, identify the entire range, and divide body by range.',
      'Then multiply by 100: ('+DOLLAR(m.body)+' ÷ '+DOLLAR(m.range)+') × 100 = '+m.percentage.toFixed(1)+'%. This compares two measured distances. It does NOT forecast the next candle.'],
    6:['Independent Assessment: a real graded attempt is handled by the authorized assessment service, never by a chart or simulated wallet.',
      'The example below is a separate ungraded self-check. You may record one initial response, but no competency score is awarded in this demonstration.'],
    7:['Review and Retry: inspect what you missed. Use a different illustrative candle rather than rewriting your original response.',
      'The formal first-attempt record remains in the protected grader. A second graded attempt can only be created through that service.'],
    8:['Transfer: apply the same process to a new fictional candle. Name the Open, High, Low, Close, real body, full range and body percentage before interpreting the bar.',
      'A completed candle describes the past interval; it cannot guarantee price direction or actual execution.'],
    9:['Learning report: review the calculation methods, your ungraded practice attempts, and whether an optional answer reveal or skip was used.',
      'A demonstration is not independent mastery. Formal competency remains Not Yet Assessed unless the protected assessment service provides a verified result.']
   };
   return scripts[stage]||scripts[0];
  }
  function target(){
   const q=current(),m=measures(q);
   return state.stage===3?{value:m.body,units:'dollars',prompt:'How large is the real body in dollars?'}:
    state.stage===4?{value:m.range,units:'dollars',prompt:'What is the High-to-Low range in dollars?'}:
    state.stage===5?{value:m.percentage,units:'percent',prompt:'What percentage of the full range is the real body?'}:
    [6,7,8].includes(state.stage)?{value:m.percentage,units:'percent',prompt:'Calculate the real body as a percentage of the full candle range.'}:null;
  }
  function render(){
   progress.textContent='Instructional micro-step '+(state.stage+1)+' of 10 · '+NAMES[state.stage];
   heading.textContent=NAMES[state.stage];teaching.replaceChildren();
   const q=current();for(const p of explain(state.stage,q))teaching.append(make('p','',p));
   workspace.hidden=![2,3,4,5,6,7,8].includes(state.stage);
   sliderLabel.hidden=state.stage!==2;
   sliderText.textContent=DOLLAR(state.close);
   assessment.hidden=state.stage!==6&&state.stage!==7;
   const t=target();question.hidden=!t;
   if(t){
    prompt.textContent=t.prompt+' (enter '+(t.units==='percent'?'a number without the % symbol':'a dollar amount without the $ symbol')+').';
    const locked=state.stage===6&&state.firstIndependent!==null;
    answer.disabled=locked;check.disabled=locked;
    reveal.disabled=state.credits<=0||state.assisted.has(state.stage)||state.stage===6||state.stage===7;
    skip.disabled=reveal.disabled;
    if(locked)inform('Initial ungraded answer preserved. Continue to Review & Retry using the different candle.');
    if(state.assisted.has(state.stage))inform('Study Only · assisted question. No independent mastery credit.');
   }
   const report=state.stage===9;
   if(report){
    const answered=Object.values(state.attempts).reduce((sum,n)=>sum+n,0);
    const p=make('p','gu-v28-report','Ungraded calculation checks: '+answered+
     ' · Assisted/Skipped steps: '+state.assisted.size+
     ' · Initial self-check recorded: '+(state.firstIndependent===null?'No':'Yes')+
     ' · Competency: '+state.mastery+'.');
    teaching.append(p);
   }
   previous.disabled=state.stage===0;next.disabled=state.stage===9;
   next.textContent=state.stage===9?'Lesson completed':'Next teaching step';
   setBalance();if(!workspace.hidden)draw();
  }
  function checkValue(){
   const t=target();if(!t)return;
   const typed=answer.value.trim();
   if(!typed||!Number.isFinite(Number(typed))){inform('Enter a numeric answer. This is free to retry.');return}
   if(state.stage===6&&state.firstIndependent!==null){inform('Your first self-check is already recorded. Continue to Review & Retry.');return}
   const value=Number(typed),okay=Math.abs(value-t.value)<=(t.units==='percent'?.11:.011);
   const count=(state.attempts[state.stage]||0)+1;state.attempts[state.stage]=count;
   if(state.stage===6)state.firstIndependent={value,correct:okay};
   if(state.stage===7)state.retryIndependent={value,correct:okay};
   if(okay){inform('Correct. '+(t.units==='percent'?t.value.toFixed(1)+'%':DOLLAR(t.value))+
    ' describes the fictional candle. '+(state.assisted.has(state.stage)?'Study Only · assisted.':'Ungraded practice only.')+
    ' This does not predict another candle.');}
   else{
    const q=current(),m=measures(q);
    inform('Try again. '+(count===1?'Check which prices belong in this measurement.':
      count===2?'Work one step at a time: body = |Close − Open|, range = High − Low.':
      'Worked guide: body '+DOLLAR(m.body)+', range '+DOLLAR(m.range)+
      '. Percentage is body ÷ range × 100.')+
     (state.stage===6?' Initial ungraded response retained; retry on the next teaching step.':' You can enter another answer for free.'));
   }
  }
  function beginPass(type){
   if(!['reveal','skip'].includes(type)||![3,4,5,8].includes(state.stage)||state.credits<1)return;
   pending=type;confirmBox.hidden=false;
   confirmText.textContent=(type==='reveal'?'Reveal the illustrated worked answer':'Skip this ungraded practice question')+
    ' for 1 SIMULATED credit? This will mark Study Only and does not spend Crownlight Sparks.';
  }
  check.addEventListener('click',checkValue);
  reveal.addEventListener('click',()=>beginPass('reveal'));
  skip.addEventListener('click',()=>beginPass('skip'));
  no.addEventListener('click',()=>{pending='';confirmBox.hidden=true});
  yes.addEventListener('click',()=>{
   if(!pending||state.credits<1||state.assisted.has(state.stage))return;
   const operation=pending;state.credits--;state.assisted.add(state.stage);
   pending='';confirmBox.hidden=true;setBalance();
   const t=target();
   inform(operation==='reveal'?
    'Study Only — '+(t.units==='percent'?t.value.toFixed(1)+'%':DOLLAR(t.value))+
     '. Show your work: body = |Close − Open|; range = High − Low; percentage = body ÷ range × 100.':
    'Study Only — this question was skipped using a simulated credit. Explanation, worked examples and retries remain free.');
   reveal.disabled=skip.disabled=true;
  });
  add.addEventListener('click',()=>{state.credits+=1;setBalance()});
  slider.addEventListener('input',()=>{state.close=Number(slider.value);render()});
  previous.addEventListener('click',()=>setStep(state.stage-1));
  next.addEventListener('click',()=>setStep(state.stage+1));
  render();
  const task=Promise.resolve().then(async()=>{
   try{
    if(!host.isConnected||disposed)return;
    const echarts=await root.CrownlightECharts?.load?.();
    if(!echarts||disposed||!host.isConnected)return;
    plot=echarts.init(chart,null,{renderer:'canvas'});
    if(typeof ResizeObserver!=='undefined'){
     resize=new ResizeObserver(()=>{plot?.resize()});resize.observe(chart);
    }
    if(!workspace.hidden)draw();
   }catch{chart.textContent='Chart engine unavailable. The accessible OHLC reference remains available.';}
  });
  function dispose(){
   disposed=true;resize?.disconnect();plot?.dispose();plot=null;
  }
  return {element:host,setStep,dispose,state,
   snapshot:()=>({stage:state.stage,credits:state.credits,assisted:state.assisted.size,
     grade:'Not Yet Assessed',firstIndependent:state.firstIndependent})};
 }
 root.CrownlightCandleV28=Object.freeze({create,measures,WORKED,ASSESS,TRANSFER,NAMES,version:'2.8'});
})(window);
