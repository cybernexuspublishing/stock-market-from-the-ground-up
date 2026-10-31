/* Public no-login ECharts and Talia v2. Fictional authored examples; no entitlement,
 * server writes, market feeds, paid credits or independently graded mastery.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const form=$('gu-practice-form'),chart=$('gu-practice-chart'),table=$('gu-practice-ohlc');
if(!form||!chart||!table)return;
const exercises=[
 {question:'The final fictional candle reached a high of $21.00. What does that tell you?',
 bars:[[19.65,19.92,19.45,19.80,90],[19.80,20.13,19.60,19.98,110],[19.98,20.20,19.84,20.04,120],[20.04,20.32,19.89,20.00,98],[20.00,21.00,19.75,20.50,150]],
 options:['The final candle closed at $21.00.','At least one recorded price in that interval reached $21.00.','The next candle must trade above $21.00.'],correct:1,
 feedback:'The high is an observed extreme within an interval. The close is $20.50. The OHLC values alone do not show when the high occurred or where the next trade will be.'},
 {question:'In the final fictional candle, how did the close compare with the open?',
 bars:[[20.10,20.42,19.93,20.28,80],[20.28,20.62,20.18,20.41,96],[20.41,20.74,20.20,20.54,110],[20.54,20.80,20.29,20.40,95],[20.40,20.85,19.72,19.90,170]],
 options:['The close was $0.50 below the open; this alone does not predict the next interval.','The lower wick proves the next candle will recover.','The candle closed above its opening price.'],correct:0,
 feedback:'The open is $20.40 and the close is $19.90, making the close $0.50 lower. The low and wick record observed prices, not a guaranteed bounce or future return.'},
 {question:'The final fictional high exceeds the prior candle high, but the final close is below its own open. What is supported?',
 bars:[[20.10,20.85,19.90,20.63,95],[20.63,21.20,20.40,21.00,115],[21.00,21.54,20.74,21.30,135],[21.30,21.80,20.92,21.10,130],[21.10,22.20,20.60,20.90,210]],
 options:['This confirms a successful breakout and a profitable trade.','The new high was reached after the interval closed.','A higher observed high occurred, but one candle cannot prove breakout acceptance or a profitable trade.'],correct:2,
 feedback:'A high of $22.20 exceeds the preceding high of $21.80, yet the close was $20.90. A higher high is observable. Its timing, fills, cause, and future acceptance are not established.'}
];
const explanations=[
 ['A candle summarizes prices during a defined time interval. Open is the first recorded price, close is the last, and high and low are the extremes. A candle alone cannot tell us what happens next.',
  'Read the final fictional candle on the left: Open $20.00, High $21.00, Low $19.75 and Close $20.50. The vertical wick touches the high and low; the body runs from open to close.',
  'The high means at least one recorded price reached $21.00 during this interval. It does not mean the candle closed there or that the next candle must go higher.'],
 ['A bullish candle closes above its open; a bearish candle closes below its open. The real body measures the absolute distance between those two prices.',
  'Look at the fifth fictional candle: the open is $20.40 and the close is $19.90. Subtract: $20.40 − $19.90 = $0.50. That is a bearish $0.50 real body.',
  'The wick indicates prices beyond the real body. It does not reveal the order of intrabar movements or guarantee a reversal.'],
 ['A higher high means the latest candle’s high exceeded a preceding high. A breakout is more than a single observed price level; context and follow-through are required.',
  'The prior candle reached $21.80 while the newest reached $22.20: the observed high increased by $0.40. But the newest candle opened at $21.10 and closed at $20.90.',
  'A higher observed high is not proof of a profitable trade or future acceptance above resistance. Distinguish measured evidence from an unsupported prediction.']
];
let position=0,part=0,autoplay=false,autoTimer=null,passed=0,mistakes=0,chartMode='Price + Volume',chartInstance=null,disposed=false;
const stop=()=>{if(autoTimer!==null){clearTimeout(autoTimer);autoTimer=null}};
function create(name,text,className){const el=document.createElement(name);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el}
function mark(text){$('gu-practice-tutor-status').textContent=text}
function updateAuto(){const button=$('gu-practice-auto');button.textContent=autoplay?'Pause guided teaching':'Start guided teaching';button.setAttribute('aria-pressed',String(autoplay))}
function chartDraw(){
 const item=exercises[position],bars=item.bars;
 if(chartInstance){chartInstance.dispose();chartInstance=null}
 chart.replaceChildren();
 const fallback=()=>{chart.append(create('p','ECharts unavailable. Use the full accessible OHLC and volume table directly beneath this chart.','gu-public-chart-fallback'))};
 if(!window.CrownlightECharts?.load){fallback();return}
 window.CrownlightECharts.load().then(e=>{
  if(disposed||position!==item.index&&item!==exercises[position])return;
  chartInstance=e.init(chart,null,{renderer:'svg'});
  const showCandle=chartMode!=='Volume Only',showVolume=chartMode!=='Price Only';
  const labels=bars.map((_,i)=>'Bar '+(i+1)),volumeMax=Math.max(...bars.map(b=>b[4]));
  const series=[];
  if(showCandle)series.push({name:'Fictional OHLC',type:'candlestick',data:bars.map(b=>[b[0],b[3],b[2],b[1]]),itemStyle:{color:'#51d5b0',color0:'#e57f95',borderColor:'#51d5b0',borderColor0:'#e57f95'},barMaxWidth:34,markLine:{silent:true,symbol:'none',precision:2,label:{position:'end',fontSize:11,fontWeight:'bold',color:'#edf6fc'},lineStyle:{type:'dashed',width:1,color:'#bdd1de'},data:[{name:'H',yAxis:bars.at(-1)[1],label:{formatter:'H $'+bars.at(-1)[1].toFixed(2)}},{name:'C',yAxis:bars.at(-1)[3],label:{formatter:'C $'+bars.at(-1)[3].toFixed(2),color:'#69dfb9'}},{name:'O',yAxis:bars.at(-1)[0],label:{formatter:'O $'+bars.at(-1)[0].toFixed(2),color:'#8acfe2'}},{name:'L',yAxis:bars.at(-1)[2],label:{formatter:'L $'+bars.at(-1)[2].toFixed(2)}}]}});
  if(showVolume)series.push({name:'Fictional volume',type:'bar',xAxisIndex:1,yAxisIndex:1,data:bars.map(b=>({value:b[4],itemStyle:{color:b[3]>=b[0]?'#4cbb9e':'#cc7087'}})),barMaxWidth:32});
  chartInstance.setOption({animation:false,backgroundColor:'#081e2e',
   tooltip:{trigger:'axis',axisPointer:{type:'cross'},backgroundColor:'#153449',borderColor:'#42677b',textStyle:{color:'#fff'},formatter:params=>{
    const i=params?.[0]?.dataIndex??0,b=bars[i];return 'Fictional bar '+(i+1)+'<br>Open $'+b[0].toFixed(2)+' · High $'+b[1].toFixed(2)+'<br>Low $'+b[2].toFixed(2)+' · Close $'+b[3].toFixed(2)+'<br>Volume '+b[4];
   }},
   legend:{top:4,textStyle:{color:'#c5daea'}},
   grid:[{left:58,right:110,top:40,height:chartMode==='Volume Only'?'42%':'56%'},{left:58,right:110,top:'77%',height:'14%'}],
   xAxis:[{type:'category',gridIndex:0,data:labels,axisLabel:{color:'#c5d6e3'},axisLine:{lineStyle:{color:'#405b70'}}},{type:'category',gridIndex:1,data:labels,axisLabel:{color:'#bcd0de'},axisLine:{lineStyle:{color:'#405b70'}}}],
   yAxis:[{type:'value',scale:true,gridIndex:0,axisLabel:{color:'#c4d6e6',formatter:v=>'$'+Number(v).toFixed(2)},splitLine:{lineStyle:{color:'#294457'}}},{type:'value',gridIndex:1,min:0,max:volumeMax*1.2,axisLabel:{color:'#9fbacc'},splitLine:{show:false}}],
   series},true);
  chartInstance.resize();
 }).catch(fallback);
}
function showTable(){
 const bars=exercises[position].bars;table.replaceChildren();
 bars.forEach((bar,i)=>{const tr=create('tr');[String(i+1),...bar.slice(0,4).map(n=>'$'+n.toFixed(2)),String(bar[4])].forEach(x=>tr.append(create('td',x)));table.append(tr)});
 const last=bars.at(-1),facts=$('gu-practice-facts');facts.replaceChildren();
 [['Open','$'+last[0].toFixed(2)],['High','$'+last[1].toFixed(2)],['Low','$'+last[2].toFixed(2)],['Close','$'+last[3].toFixed(2)],['Volume',last[4]+' shares']].forEach(([k,v])=>{const x=create('div',undefined,'gu-public-fact');x.append(create('small',k),create('strong',v));facts.append(x)});
}
function renderPart(){
 stop();
 const lines=explanations[position],n=$('gu-practice-narration');
 if(part<lines.length){
  n.append(create('p',lines[part++]));
  if(part<lines.length){mark('Teaching part '+part+' of '+lines.length+'.');if(autoplay)autoTimer=setTimeout(renderPart,1300)}
  else{mark('Instruction complete. Talia has loaded the question.');$('gu-practice-questionbox').hidden=false;$('gu-practice-next-teaching').disabled=true;}
 }
}
function show(){
 stop();part=0;
 $('gu-practice-narration').replaceChildren();
 $('gu-practice-step').textContent='Exercise '+(position+1)+' of '+exercises.length;
 $('gu-practice-question').textContent=exercises[position].question;
 $('gu-practice-questionbox').hidden=true;
 $('gu-practice-next-teaching').disabled=false;
 const box=$('gu-practice-answers');box.replaceChildren();
 exercises[position].options.forEach((opt,i)=>{const label=create('label',undefined,'gu-growth-answer');const input=create('input');input.type='radio';input.name='gu-practice-choice';input.value=String(i);const words=create('span',opt);label.append(input,words);box.append(label)});
 const feedback=$('gu-practice-feedback');feedback.textContent='';feedback.hidden=true;
 $('gu-practice-next').hidden=true;$('gu-practice-reset').hidden=true;$('gu-practice-check').hidden=false;
 $('gu-practice-progress').textContent='Completed '+passed+' of 3 fictional exercises. Incorrect attempts: '+mistakes+'. No grades or account data are saved.';
 showTable();chartDraw();renderPart();
}
function stepForward(){
 if(position<exercises.length-1){position++;show()}
 else{$('gu-practice-reset').hidden=false;$('gu-practice-progress').textContent='All three exercises completed. These are ungraded fictional examples; independent mastery was not assessed.';mark('You completed all public sample questions. Repeat them or continue into the Free Foundations lessons.')}
}
function answer(event){
 event.preventDefault();
 const f=$('gu-practice-feedback'),chosen=form.querySelector('input[name="gu-practice-choice"]:checked');
 if(!chosen){f.hidden=false;f.dataset.state='missing';f.textContent='Select an answer first.';return}
 const item=exercises[position],correct=Number(chosen.value)===item.correct;
 f.hidden=false;f.dataset.state=correct?'correct':'try-again';
 if(!correct){mistakes++;f.textContent='Not quite. '+item.feedback+' Compare the chart to the OHLC table, then choose again. Free retries are available.';mark('The question remains open. Review Talia’s explanation and try again.');return}
 passed++;f.textContent='Correct. '+item.feedback;
 $('gu-practice-check').hidden=true;
 form.querySelectorAll('input[name="gu-practice-choice"]').forEach(x=>x.disabled=true);
 if(position<exercises.length-1)$('gu-practice-next').hidden=false;else $('gu-practice-reset').hidden=false;
 $('gu-practice-progress').textContent='Completed '+passed+' of 3 fictional exercises. No saved grades or mastery.';
 mark('Correct answer confirmed. Continue to the next fictional example when ready.');
}
form.addEventListener('submit',answer);
$('gu-practice-auto').addEventListener('click',()=>{autoplay=!autoplay;updateAuto();stop();if(autoplay&&part<explanations[position].length)autoTimer=setTimeout(renderPart,400);else mark(autoplay?'Question ready: submit your answer to advance.':'Automatic teaching paused.')});
$('gu-practice-next-teaching').addEventListener('click',renderPart);
$('gu-practice-full').addEventListener('click',()=>{stop();while(part<explanations[position].length)renderPart()});
$('gu-practice-next').addEventListener('click',stepForward);
$('gu-practice-reset').addEventListener('click',()=>{position=0;passed=0;mistakes=0;show()});
$('gu-practice-chart-mode').addEventListener('click',e=>{const button=e.target.closest('button[data-chart-mode]');if(!button)return;chartMode=button.dataset.chartMode;$('gu-practice-chart-mode').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===button)));chartDraw()});
window.addEventListener('resize',()=>chartInstance?.resize());
updateAuto();show();
})();