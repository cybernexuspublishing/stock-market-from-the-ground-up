/* Public Candlestick Learning Journey V3.1 — ten-stage original teaching.
 * Fictional examples; no market feed, account writes, Lumens, or public mastery grades.
 * Protected/official assessments remain in authenticated Labs.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const root=$('gu-practice-classroom'),form=$('gu-practice-form'),chart=$('gu-practice-chart');
if(!root||!form||!chart)return;
const names=['Start','Learn','Calculate','Experiment','Predict','Replay','Assess','Review','Transfer','Results'];
const make=(tag,content,cls)=>{const n=document.createElement(tag);if(content!==undefined)n.textContent=content;if(cls)n.className=cls;return n};
const fx=(o,h,l,c,v)=>[o,h,l,c,v];
const base=[fx(30.9,31.3,30.5,31.1,100),fx(31.1,31.65,30.9,31.4,130),fx(31.4,31.9,31.1,31.5,115),fx(31.5,32.25,31.0,31.1,170),fx(31,32.5,30.5,32,210)];
const assess=[fx(24.1,24.6,23.9,24.4,85),fx(24.4,24.8,24.2,24.65,96),fx(24.65,24.85,24.1,24.3,104),fx(24.3,24.7,23.95,24.45,99),fx(24.3,25.2,24,24.6,140)];
const transfer=[fx(12.75,12.9,12.3,12.6,110),fx(12.6,12.8,12.05,12.25,135),fx(12.25,12.55,12,12.45,120),fx(12.45,12.65,12.1,12.4,100),fx(12.4,12.7,11.9,12.1,160)];
const replayBars=[fx(10,10.2,9.9,10.12,100),fx(10.12,10.33,10.02,10.27,125),fx(10.27,10.38,10.08,10.2,120),fx(10.2,10.27,9.91,9.96,190),fx(9.96,10.15,9.82,10.11,215),fx(10.11,10.18,9.95,10.03,140)];
const lessons=[
{title:'Welcome to candlestick evidence',teach:[
 'A candlestick summarizes prices recorded during one defined interval. Each candle has an open (first price), high (greatest price), low (smallest price), and close (last price).',
 'This course uses fictional five-minute candles. They are useful for learning calculations but do not provide a real quotation or forecast.',
 'By the end of this experience you should be able to measure a real body and full range, recognize unsupported claims, replay unseen candles, and transfer the method to new numbers.'
],question:{title:'Which four prices does one candle summarize?',options:['Open, high, low and close','Bid, ask, fee and profit','Yesterday, tomorrow, volume and target'],correct:0,
hint:'OHLC is the first price, greatest price, smallest price and last price of a completed interval.'}},
{title:'Read the chart before calculating',teach:[
 'Inspect the candle on the left. Its high is $32.50 and its low is $30.50. The candle opened at $31.00 and closed at $32.00.',
 'Price guides must align to the actual vertical values. The accessible table contains the same observations. The body runs between open and close; the wicks mark extensions toward high and low.',
 'Because the close is above the open, this candle is bullish in that interval. That description does not establish why it moved or what the next candle will do.'
],question:{title:'What is the real-body boundary on this candle?',options:['High to low','Open to close','Volume to the prior close'],correct:1,
hint:'The body is the span between Open $31.00 and Close $32.00; the full high-to-low span is called range.'}},
{title:'Calculate body, range and percentage',teach:[
 'Step 1 — Real body. Use the absolute difference between the closing price and the opening price: |$32.00 − $31.00| = $1.00. Absolute means the result is a nonnegative size.',
 'Step 2 — Full range. Subtract the lowest price from the highest price: $32.50 − $30.50 = $2.00. The range contains the wicks as well as the body.',
 'Step 3 — A percentage measures a part out of the whole. Here the part is the $1.00 body and the whole is the $2.00 range. Divide 1.00 by 2.00 to get 0.5, then multiply by 100 to get 50%.',
 'The result means the body occupies half of this candle’s entire high-to-low price span. It does not mean a 50% chance of a price increase.'
],question:{title:'Complete all three measurements',inputs:[['body','Real body (USD)',1],['range','Full range (USD)',2],['percent','Body / range (%)',50]],hint:'Body = |Close − Open|. Range = High − Low. Percentage = Body ÷ Range × 100.'}},
{title:'Experiment by moving the close',teach:[
 'The high ($32.50), low ($30.50) and opening price ($31.00) remain fixed. Drag the closing-price slider on the chart to change the body size.',
 'As you change Close, the body becomes taller, shorter, bullish or bearish. A $31.00 close makes the body zero because the first and last prices are equal.',
 'The full range remains $2.00 because its high and low have not moved. The calculated body percentage changes even while the full range remains constant.'
],question:{title:'Which measurement stays fixed when only the close moves?',options:['Full high-to-low range','Real body','Body percentage'],correct:0,hint:'Full range is High − Low; neither High nor Low changes during this experiment.'}},
{title:'Predict cautiously, do not guess',teach:[
 'Recognizing a historical candle is different from predicting a future one. The high tells you a price reached that level during the completed interval.',
 'A completed candle alone does not reveal whether its high occurred before or after its low. Neither a large body nor high volume guarantees continuation.',
 'Before claiming an outcome, distinguish what the chart actually recorded from what requires additional evidence. “Wait for more evidence” is a valid research decision.'
],question:{title:'Which conclusion is justified by a candle high of $32.50?',options:['The next candle must close above $32.50','At least one recorded price reached $32.50 in that interval','The candle must have closed at its high'],correct:1,hint:'High is a past observation, not a guaranteed next price or necessarily the closing price.'}},
{title:'Replay completed candles without future bars',teach:[],question:null},
{title:'Independent assessment — first submission',teach:[
 'Use the unfamiliar fictional candle on the left. Calculate the body, range and body percentage without looking at a worked solution.',
 'This public exercise preserves your FIRST submitted answers for the Review stage. It does not award official mastery: authenticated Labs use protected server-side grading.'
],question:{title:'Calculate from a new candle (unassisted first submission)',inputs:[['body','Real body (USD)',.3],['range','Full range (USD)',1.2],['percent','Body / range (%)',25]],assessment:true}},
{title:'Review your independent assessment',teach:[],question:{title:'What does a body percentage describe?',options:['The probability of tomorrow’s rally','How much of the candle range lies between open and close','A brokerage profit estimate'],correct:1,hint:'The body percentage is the real body divided by the high-to-low range, multiplied by 100.'}},
{title:'Transfer the method to an unfamiliar bearish candle',teach:[
 'An unfamiliar candle opens at $12.40, reaches $12.70, falls to $11.90, and closes at $12.10. Use the same mathematical method as before.',
 'A bearish body still has a positive size: take the absolute difference between close and open. The full range always uses high minus low.',
 'The transfer exercise is ungraded practice. Different input values show whether you can apply the method rather than recognize a memorized answer.'
],question:{title:'Calculate and classify the new candle',inputs:[['body','Real body (USD)',.3],['range','Full range (USD)',.8],['percent','Body / range (%)',37.5]],direction:true,
hint:'|12.10 − 12.40| = 0.30; 12.70 − 11.90 = 0.80; 0.30 ÷ 0.80 × 100 = 37.5%. It is bearish because the close is below the open.'}},
{title:'Learning report',teach:[],question:null}
];
let stage=0,part=0,auto=true,timer=null,chartMode='Price + Volume',experimentClose=32,replayCount=3;
let chartObject=null,renderToken=0,corrected=0,assisted=0,completed=new Set(),firstAssessment=null,reviewVisible=false;
const el=(id)=>$(id),status=(v)=>{el('gu-practice-tutor-status').textContent=v};
const cancel=()=>{if(timer!==null){clearTimeout(timer);timer=null}};
const body=(b)=>Math.abs(b[3]-b[0]),range=(b)=>b[1]-b[2],pct=(b)=>range(b)?100*body(b)/range(b):0;
const money=n=>'$'+n.toFixed(2);
function values(){
 if(stage===6)return assess;
 if(stage===8)return transfer;
 if(stage===5)return replayBars.slice(0,replayCount);
 if(stage===3){const list=base.map(b=>b.slice());list[list.length-1][3]=experimentClose;return list}
 return base;
}
function nav(){
 const n=el('gu-practice-journey');n.replaceChildren();
 names.forEach((name,i)=>{
  const item=make('div',undefined,'gu-journey-item'+(i===stage?' is-current':completed.has(i)?' is-done':''));
  item.setAttribute('aria-current',i===stage?'step':'false');
  item.append(make('span',completed.has(i)?'✓':String(i+1),'gu-journey-number'),make('span',name));
  n.append(item);
 });
 el('gu-practice-step').textContent='Stage '+(stage+1)+' of 10 · '+names[stage];
 el('gu-practice-progressbar').value=completed.size;el('gu-practice-progressbar').max=10;
}
function chartDraw(){
 const raw=values(),token=++renderToken,host=chart;
 if(chartObject){chartObject.dispose();chartObject=null}
 host.replaceChildren();
 if(!window.CrownlightECharts?.load){host.textContent='Chart unavailable. The accessible OHLC table remains available.';return}
 window.CrownlightECharts.load().then(e=>{
  if(token!==renderToken||!host.isConnected)return;
  const display=raw.map(b=>[b[0],b[3],b[2],b[1]]);
  const price=chartMode!=='Volume Only',volume=chartMode!=='Price Only',latest=raw[raw.length-1];
  chartObject=e.init(host,null,{renderer:'svg'});
  const series=[];
  if(price)series.push({type:'candlestick',name:'Fictional OHLC',data:display,
   itemStyle:{color:'#51d5b0',color0:'#e57f95',borderColor:'#51d5b0',borderColor0:'#e57f95'},
   barMaxWidth:38,
   markLine:{silent:true,symbol:'none',lineStyle:{color:'#9bbed0',type:'dashed',width:1},
    label:{position:'end',color:'#f1f8fc',fontSize:11},
    data:[{yAxis:latest[1],label:{formatter:'H '+money(latest[1])}},
          {yAxis:latest[3],label:{formatter:'C '+money(latest[3]),color:'#7ceecb'}},
          {yAxis:latest[0],label:{formatter:'O '+money(latest[0])}},
          {yAxis:latest[2],label:{formatter:'L '+money(latest[2])}}]}});
  if(volume)series.push({type:'bar',name:'Fictional volume',xAxisIndex:1,yAxisIndex:1,
   data:raw.map(b=>({value:b[4],itemStyle:{color:b[3]>=b[0]?'#4bb9aa':'#bf6886'}})),barMaxWidth:32});
  const labels=raw.map((_,i)=>'Bar '+(i+1));
  chartObject.setOption({animation:false,backgroundColor:'#081e2e',
   legend:{top:3,textStyle:{color:'#c9dae7'}},
   tooltip:{trigger:'axis',backgroundColor:'#143346',borderColor:'#45687b',textStyle:{color:'#fff'},formatter:params=>{
    const i=params[0]?.dataIndex||0,b=raw[i];return 'Fictional '+labels[i]+'<br>O '+money(b[0])+' · H '+money(b[1])+'<br>L '+money(b[2])+' · C '+money(b[3])+'<br>Volume '+b[4];
   }},
   grid:[{left:60,right:112,top:42,height:volume&&price?'58%':'68%'},{left:60,right:112,top:'79%',height:'13%'}],
   xAxis:[{type:'category',gridIndex:0,data:labels,axisLabel:{color:'#c8d9e6'},axisLine:{lineStyle:{color:'#486479'}}},
          {type:'category',gridIndex:1,data:labels,axisLabel:{color:'#bad4e4'},axisLine:{lineStyle:{color:'#486479'}}}],
   yAxis:[{type:'value',gridIndex:0,scale:true,axisLabel:{color:'#c8d9e6',formatter:v=>'$'+Number(v).toFixed(2)},splitLine:{lineStyle:{color:'#294658'}}},
          {type:'value',gridIndex:1,min:0,axisLabel:{color:'#9eb9ca'},splitLine:{show:false}}],
   series},true);
  chartObject.resize();
 }).catch(()=>{if(token===renderToken)host.textContent='ECharts unavailable. Use the accessible OHLC data table.'});
}
function tableDraw(){
 const b=values(),tbl=el('gu-practice-ohlc');tbl.replaceChildren();
 b.forEach((bar,i)=>{const tr=make('tr');[i+1,...bar.slice(0,4).map(money),bar[4]].forEach(v=>tr.append(make('td',String(v))));tbl.append(tr)});
 const latest=b[b.length-1],facts=el('gu-practice-facts');facts.replaceChildren();
 [['High',money(latest[1])],['Close',money(latest[3])],['Open',money(latest[0])],['Low',money(latest[2])],['Volume',latest[4]+' shares']].forEach(([label,num])=>{
  const f=make('div',undefined,'gu-public-fact');f.append(make('small',label),make('strong',num));facts.append(f);
 });
}
function experiment(){
 const box=el('gu-practice-experiment');box.hidden=stage!==3;
 if(stage!==3)return;
 const slider=el('gu-practice-close');slider.value=experimentClose.toFixed(2);
 el('gu-practice-close-label').textContent=money(experimentClose);
 el('gu-practice-experiment-math').textContent='Body '+money(Math.abs(experimentClose-31))+' · Range $2.00 · Body percentage '+(50*Math.abs(experimentClose-31)).toFixed(1)+'%';
}
function replay(){
 const panel=el('gu-practice-replay');panel.hidden=stage!==5;
 if(stage!==5)return;
 el('gu-practice-replay-status').textContent='Revealed '+replayCount+' of '+replayBars.length+' fictional candles. Future bars remain concealed.';
}
function learningLines(){
 if(stage===5){
  const b=values(),last=b[b.length-1],prev=b[b.length-2],above=last[3]>prev[3];
  return [
   'Market replay means seeing only the candles already completed. You have '+replayCount+' of '+replayBars.length+' fictional candles; later candles must stay hidden until you submit a decision.',
   'The previous completed close was '+money(prev[3])+'. The latest completed close is '+money(last[3])+'. Use these known numbers to classify the change. Volume on the latest candle was '+last[4]+' shares.',
   'An observed close '+(above?'above':'below')+' the prior close is not a promise of continuation. Record only the evidence available now; after a correct checkpoint you can reveal one additional candle.'
  ];
 }
 if(stage===7){
  const a=firstAssessment;
  if(!a)return ['The independent assessment must be submitted before review.'];
  const targets={body:.3,range:1.2,percent:25};
  const result=Object.entries(targets).map(([k,v])=>k+' '+(Math.abs((a[k]||0)-v)<=.011?'correct':'needs revision')).join('; ');
  return [
   'Review your first assessment. The submitted values are preserved locally for this run: body '+(a.body||'blank')+', range '+(a.range||'blank')+', percentage '+(a.percent||'blank')+'. '+result+'.',
   'The new candle opened $24.30 and closed $24.60, so the real body is |24.60 − 24.30| = $0.30. The high is $25.20 and low $24.00, giving a range of $1.20.',
   'Divide the part by the whole: $0.30 ÷ $1.20 = 0.25. Multiply by 100 for 25%. This measures only the proportion of the candle range occupied by its body.',
   'Your initial response was not changed by this review. The original response is study evidence, not an official grade. For official assessment, enter an authenticated Lab where grading is server-controlled.'
  ];
 }
 return lessons[stage].teach;
}
function question(){
 if(stage===5){
  const arr=values(),last=arr[arr.length-1],prev=arr[arr.length-2],above=last[3]>prev[3];
  return {title:'Classify the latest completed close using only visible bars',options:[
   'The latest close is above the previous close.',
   'The latest close is below the previous close.',
   'This candle guarantees the next candle will rise.'
  ],correct:above?0:1,hint:'Compare the observed closes: prior '+money(prev[3])+' versus latest '+money(last[3])+'. A direction classification is not a forecast.'};
 }
 return lessons[stage].question;
}
function questionDraw(){
 const block=el('gu-practice-questionbox'),fields=el('gu-practice-fields'),submit=el('gu-practice-submit');
 block.hidden=stage===9;fields.replaceChildren();
 if(stage===9)return;
 const q=question();if(!q){block.hidden=true;return}
 el('gu-practice-question').textContent=q.title;
 if(q.options){
  const fs=make('fieldset');fs.append(make('legend','Select the supported answer.'));
  q.options.forEach((option,i)=>{
   const label=make('label',undefined,'gu-learning-answer');const radio=document.createElement('input');radio.type='radio';radio.name='gu-journey-choice';radio.value=String(i);radio.required=true;
   label.append(radio,make('span',option));fs.append(label);
  });fields.append(fs);
 }else if(q.inputs){
  const grid=make('div',undefined,'gu-learning-inputs');q.inputs.forEach(([key,label])=>{
   const wrap=make('label',undefined,'gu-learning-numeric');wrap.append(make('span',label));
   const input=document.createElement('input');input.type='number';input.step='any';input.required=true;input.inputMode='decimal';input.name=key;input.setAttribute('aria-label',label);
   wrap.append(input);grid.append(wrap);
  });fields.append(grid);
  if(q.direction){const label=make('label',undefined,'gu-learning-numeric');label.append(make('span','Candle direction'));
   const select=make('select');select.name='direction';[['','Choose direction'],['bullish','Bullish'],['bearish','Bearish'],['doji','Doji']].forEach(([value,text])=>{const op=make('option',text);op.value=value;select.append(op)});select.required=true;label.append(select);fields.append(label)}
 }
 submit.textContent=stage===6?'Lock first submission — Continue to Review':stage===5?'Close & Next — Submit observation':'Close & Next — Submit answer';
 const f=el('gu-practice-feedback');f.hidden=true;f.textContent='';
 block.hidden=true;
}
function showResults(){
 if(stage!==9)return;
 const elr=el('gu-practice-results');elr.hidden=false;elr.replaceChildren();
 const intro=make('p','You completed the ten-stage public learning journey. This was fictional study and practice, not a protected grade or trading recommendation.');
 const row=make('div',undefined,'gu-learning-report');
 const metrics=[
  ['Stages completed',completed.size+' of 10'],
  ['Corrective retries',String(corrected)],
  ['Guided explanations',String(assisted)],
  ['First assessment submitted',firstAssessment?'Yes (locally)':'No'],
  ['Official mastery','Not assessed']
 ];
 metrics.forEach(([label,v])=>{const box=make('div');box.append(make('small',label),make('strong',v));row.append(box)});
 const note=make('p','To earn officially recorded competency evidence, use the signed-in Lab system. This public session does not transmit or persist answers.');
 const link=make('a','Open authenticated Interactive Learning Labs','btn secondary');link.href='lab-v32-member.html';
 const restart=make('button','Restart all ten stages','btn');restart.type='button';restart.addEventListener('click',()=>{
  stage=0;part=0;auto=true;experimentClose=32;replayCount=3;corrected=0;assisted=0;firstAssessment=null;completed.clear();reviewVisible=false;render();
 });
 elr.append(intro,row,note,link,restart);
}
function questionReady(){
 el('gu-practice-questionbox').hidden=false;
 status(stage===6?'Independent first submission: do not request hints.':stage===5?'Replay paused. Analyze the latest completed candle.':'Talia has paused for your answer.');
 el('gu-practice-next-teaching').disabled=true;
}
function teachNext(){
 cancel();const parts=learningLines(),n=el('gu-practice-narration');
 if(part<parts.length){n.append(make('p',parts[part++]));assisted++;
  if(part<parts.length){status('Teaching '+part+' of '+parts.length);if(auto)timer=setTimeout(teachNext,1050)}
  else questionReady();
 }
}
function render(){
 cancel();renderToken++;part=0;el('gu-practice-narration').replaceChildren();el('gu-practice-results').hidden=true;
 if(stage===9)completed.add(stage);
 nav();el('gu-practice-title').textContent=lessons[stage].title;
 el('gu-practice-auto').setAttribute('aria-pressed',String(auto));el('gu-practice-auto').textContent=auto?'Pause automatic teaching':'Play automatic teaching';
 el('gu-practice-next-teaching').disabled=false;
 el('gu-practice-full').hidden=stage===6||stage===8||stage===9;
 el('gu-practice-next-teaching').hidden=stage===6||stage===8||stage===9;
 el('gu-practice-auto').hidden=stage===6||stage===8||stage===9;
 experiment();replay();tableDraw();chartDraw();questionDraw();
 el('gu-practice-progress').textContent='10-stage learning journey · Public practice · No account data or official grades stored.';
 if(stage===9){status('Journey complete. Review the learning report.');showResults();return}
 if(stage===6||stage===8){status('Independent exercise: submit before viewing the solution.');questionReady();return}
 teachNext();
}
function compare(q){
 if(q.options){const chosen=form.querySelector('input[name="gu-journey-choice"]:checked');if(!chosen)return{valid:false,message:'Choose an answer before submitting.'};return{valid:true,correct:Number(chosen.value)===q.correct}}
 const out={};for(const [key] of q.inputs){const input=form.elements.namedItem(key);if(!input||input.value.trim()==='')return{valid:false,message:'Complete all calculation fields.'};out[key]=Number(input.value);if(!Number.isFinite(out[key]))return{valid:false,message:'Enter numeric values.'}}
 if(q.direction){const select=form.elements.namedItem('direction');if(!select.value)return{valid:false,message:'Choose the candle direction.'};out.direction=select.value}
 return{valid:true,values:out,correct:q.inputs.every(([key,,value])=>Math.abs(out[key]-value)<=.011)&&(!q.direction||out.direction==='bearish')};
}
form.addEventListener('submit',event=>{
 event.preventDefault();const q=question();if(!q)return;
 const outcome=compare(q),fb=el('gu-practice-feedback');fb.hidden=false;
 if(!outcome.valid){fb.textContent=outcome.message;fb.dataset.state='missing';return}
 if(stage===6){
  if(firstAssessment!==null)return;
  firstAssessment=Object.freeze({...outcome.values});completed.add(stage);stage=7;render();return;
 }
 if(!outcome.correct){
  corrected++;fb.dataset.state='try-again';
  fb.textContent='Not quite. '+(q.hint||'Review the current candle evidence and try a fresh calculation.')+' You can retry at no charge.';
  status('Instructional retry available — no Lumens required.');return;
 }
 fb.dataset.state='correct';fb.textContent='Correct. '+(q.hint||'Your answer matches the recorded evidence.');
 completed.add(stage);
 if(stage===5&&replayCount<replayBars.length){replayCount++;render();return}
 stage=Math.min(stage+1,9);render();
});
el('gu-practice-auto').addEventListener('click',()=>{
 auto=!auto;el('gu-practice-auto').setAttribute('aria-pressed',String(auto));
 el('gu-practice-auto').textContent=auto?'Pause automatic teaching':'Play automatic teaching';
 cancel();if(auto&&part<learningLines().length)timer=setTimeout(teachNext,250);
});
el('gu-practice-next-teaching').addEventListener('click',()=>{if(part<learningLines().length)teachNext()});
el('gu-practice-full').addEventListener('click',()=>{cancel();while(part<learningLines().length)teachNext()});
el('gu-practice-chart-mode').addEventListener('click',e=>{
 const button=e.target.closest('[data-chart-mode]');if(!button)return;chartMode=button.dataset.chartMode;
 el('gu-practice-chart-mode').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));chartDraw();
});
el('gu-practice-close').addEventListener('input',e=>{
 if(stage!==3)return;experimentClose=Number(e.target.value);experiment();tableDraw();chartDraw();
});
window.addEventListener('resize',()=>chartObject?.resize());
render();
})();