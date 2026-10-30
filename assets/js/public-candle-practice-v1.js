/* Public candlestick practice: original invented training values only.
 * No network requests, accounts, browser storage, grading, or trade placement.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const chart=$('gu-practice-chart'),table=$('gu-practice-ohlc'),form=$('gu-practice-form');
if(!chart||!table||!form)return;
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
let position=0,answered=false,correctCount=0;
const svgNS='http://www.w3.org/2000/svg';
function svg(tag,attrs={},value){
 const el=document.createElementNS(svgNS,tag);
 for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));
 if(value!==undefined)el.textContent=String(value);
 return el;
}
function displayChart(bars){
 chart.replaceChildren(svg('title',{},'Original fictional candlestick and volume sequence'));
 const lows=bars.map(b=>b[2]),highs=bars.map(b=>b[1]);
 const min=Math.min(...lows)-.22,max=Math.max(...highs)+.22;
 const y=p=>18+(max-p)/(max-min)*203;
 chart.append(svg('rect',{x:1,y:1,width:758,height:308,rx:10,fill:'#081826',stroke:'#36556a'}));
 for(let i=0;i<=4;i++){
  const v=min+(max-min)*i/4,yy=y(v);
  chart.append(svg('line',{x1:58,y1:yy,x2:718,y2:yy,stroke:'#2a4559','stroke-width':1}));
  chart.append(svg('text',{x:8,y:yy+4,fill:'#c2d4de','font-size':12},'$'+v.toFixed(2)));
 }
 chart.append(svg('text',{x:12,y:252,fill:'#aac0ce','font-size':12},'VOLUME (fictional units)'));
 const maxVolume=Math.max(...bars.map(b=>b[4]));
 bars.forEach((b,i)=>{
  const x=108+i*124, rising=b[3]>=b[0],color=rising?'#68d7b6':'#ee8798';
  chart.append(svg('line',{x1:x,y1:y(b[1]),x2:x,y2:y(b[2]),stroke:color,'stroke-width':3}));
  chart.append(svg('rect',{x:x-15,y:Math.min(y(b[0]),y(b[3])),width:30,
    height:Math.max(2,Math.abs(y(b[0])-y(b[3]))),fill:color,rx:1}));
  chart.append(svg('rect',{x:x-15,y:286-(b[4]/maxVolume)*29,width:30,
    height:b[4]/maxVolume*29,fill:color,opacity:.52}));
  chart.append(svg('text',{x,y:306,fill:'#c2d4df','text-anchor':'middle','font-size':12},'Bar '+(i+1)));
 });
}
function show(){
 answered=false;
 $('gu-practice-step').textContent='Exercise '+(position+1)+' of '+exercises.length;
 const item=exercises[position];
 $('gu-practice-question').textContent=item.question;
 displayChart(item.bars);
 table.replaceChildren();
 item.bars.forEach((bar,i)=>{
  const tr=document.createElement('tr');
  [String(i+1),...bar.slice(0,4).map(x=>'$'+x.toFixed(2)),String(bar[4])].forEach(value=>{
   const td=document.createElement('td');td.textContent=value;tr.append(td);
  });table.append(tr);
 });
 const box=$('gu-practice-answers');box.replaceChildren();
 item.options.forEach((option,i)=>{
  const label=document.createElement('label');label.className='gu-growth-answer';
  const input=document.createElement('input');input.type='radio';input.name='gu-practice-choice';input.value=String(i);
  input.required=true;
  const words=document.createElement('span');words.textContent=option;
  label.append(input,words);box.append(label);
 });
 $('gu-practice-feedback').hidden=true;
 $('gu-practice-feedback').textContent='';
 $('gu-practice-check').hidden=false;
 $('gu-practice-next').hidden=true;
 $('gu-practice-reset').hidden=true;
 $('gu-practice-progress').textContent='You have reviewed '+position+' of '+exercises.length+' fictional examples. Answers are not stored or graded.';
}
form.addEventListener('submit',event=>{
 event.preventDefault();
 if(answered)return;
 const input=form.querySelector('input[name="gu-practice-choice"]:checked'),feedback=$('gu-practice-feedback');
 if(!input){feedback.textContent='Select an observation before reviewing the explanation.';feedback.dataset.state='missing';feedback.hidden=false;return;}
 const chosen=Number(input.value),item=exercises[position],correct=chosen===item.correct;
 if(correct)correctCount++;
 answered=true;
 feedback.dataset.state=correct?'correct':'try-again';
 feedback.textContent=(correct?'Your observation is supported. ':'That conclusion goes beyond the displayed evidence. ')+item.feedback;
 feedback.hidden=false;
 form.querySelectorAll('input[name="gu-practice-choice"]').forEach(e=>e.disabled=true);
 $('gu-practice-check').hidden=true;
 if(position<exercises.length-1){$('gu-practice-next').hidden=false;}
 else {$('gu-practice-reset').hidden=false;}
 $('gu-practice-progress').textContent=position===exercises.length-1
  ?'Practice complete: '+correctCount+' of '+exercises.length+' observations matched the evidence. This is not an official score or qualification.'
  :'Example reviewed. Continue when you are ready; this training is ungraded.';
});
$('gu-practice-next').addEventListener('click',()=>{if(!answered||position>=exercises.length-1)return;position++;show();});
$('gu-practice-reset').addEventListener('click',()=>{position=0;correctCount=0;show();});
show();
})();
