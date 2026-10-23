/* D14 staged original Day 05 beginner candlestick instruction.
 * Conceptual hypothetical geometry only. Not a historical chart, not graded,
 * not stored as competency evidence or an assessed question-bank attempt.
 */
(function(root){
 'use strict';
 const NS='http://www.w3.org/2000/svg';
 const make=(tag,text,cls)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=String(text);if(cls)x.className=cls;return x;};
 const svgNode=(tag,attrs={},text)=>{const x=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))x.setAttribute(k,String(v));if(text!==undefined)x.textContent=text;return x;};
 function mount(host){
  if(!host)return;
  host.replaceChildren();host.hidden=false;
  const title=make('h3','Day 05 · Understanding the shape of a candlestick');
  const lead=make('p','A candlestick summarizes four observations from a selected period. Open is the first recorded price, high is the highest, low is the lowest, and close is the last. Candle direction is NOT a prediction: volume, previous price action and liquidity are separate evidence.');
  const explanation=make('p','A real body is the distance between open and close. The full range is the distance between high and low. Dividing the body by the range tells you what portion of the candle is body. Multiplying by 100 converts that portion into a percentage.');
  const grid=make('div',undefined,'gu-bc-day05-grid');
  const figure=make('figure',undefined,'gu-bc-day05-figure');
  const svg=svgNode('svg',{viewBox:'0 0 280 260',role:'img','aria-labelledby':'bc05-svg-title bc05-svg-desc'});
  svg.append(svgNode('title',{id:'bc05-svg-title'},'Constructed hypothetical bullish candlestick'));
  svg.append(svgNode('desc',{id:'bc05-svg-desc'},'The full range is 1.90 to 2.10. The open is 2.00 and close is 2.06. Green candle body covers 0.06 of a full 0.20 range, or 30 percent.'));
  svg.append(svgNode('line',{x1:80,y1:22,x2:80,y2:230,stroke:'#edcd88','stroke-width':4}));
  svg.append(svgNode('rect',{x:59,y:65,width:42,height:63,rx:2,fill:'#38b786',stroke:'#f1f1f1','stroke-width':1}));
  for(const [name,price,y] of [['High','2.10',24],['Close','2.06',67],['Open','2.00',127],['Low','1.90',229]]){
   svg.append(svgNode('text',{x:125,y,fill:'currentColor','font-size':15},name+' $'+price));
  }
  figure.append(svg,make('figcaption','Constructed educational example — NOT an authentic historical candle or trading signal.'));
  const work=make('section',undefined,'gu-bc-day05-questions');
  work.append(make('h4','Follow the calculation from zero'));
  for(const line of [
   'Step 1. Body size = |close − open| = |$2.06 − $2.00| = $0.06.',
   'Step 2. Full candle range = high − low = $2.10 − $1.90 = $0.20.',
   'Step 3. Divide body by full range: $0.06 ÷ $0.20 = 0.30.',
   'Step 4. Convert decimal to percent: 0.30 × 100 = 30%.'
  ])work.append(make('p',line));
  const formula=make('p','Body ÷ Full Range × 100 = $0.06 ÷ $0.20 × 100 = ? %','gu-bc-day05-equation');
  work.append(formula);
  const label=make('label','Enter the missing percentage (number only):');
  const input=make('input');input.type='number';input.step='0.01';input.min='0';input.max='100';input.inputMode='decimal';input.autocomplete='off';
  label.append(input);work.append(label);
  const button=make('button','Check my practice answer','btn secondary');button.type='button';
  const state=make('p','Enter a percentage and check your work. This is not a graded assessment.');
  state.setAttribute('role','status');state.setAttribute('aria-live','polite');
  const options=make('div',undefined,'gu-bc-day05-choices');options.hidden=true;
  options.append(make('p','Two attempts were incorrect. Use the steps above and choose an option:'));
  let misses=0;
  function check(value){
   if(!Number.isFinite(value)||value<0||value>100){state.textContent='Enter a number between 0 and 100; percentages here are not dollar amounts.';return}
   if(Math.abs(value-30)<=.1){
    state.textContent='Correct practice result: 30%. You divided the $0.06 body by the $0.20 full range, then multiplied by 100. This is ungraded and does not award mastery.';
    options.hidden=true;return;
   }
   misses++;
   state.textContent=misses===1?'Not quite. Use body $0.06 and full range $0.20. Divide first, then multiply by 100.':
    'Try a guided choice. Do not divide the full range by the body or confuse dollars with percentages.';
   if(misses>=2)options.hidden=false;
  }
  button.addEventListener('click',()=>{const raw=input.value.trim();if(!raw){state.textContent='Type a number before checking.';return}check(Number(raw))});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();button.click()}});
  for(const percent of [20,30,60]){
   const choice=make('button',percent+'%','btn secondary');choice.type='button';
   choice.addEventListener('click',()=>{input.value=String(percent);check(percent)});
   options.append(choice);
  }
  work.append(button,state,options);
  grid.append(figure,work);
  host.append(title,lead,explanation,grid,make('p','Important limits: the body percentage alone does not show which price came first within the bar, who bought or sold, whether a breakout is valid, or whether the next bar rises. A doji can have a body of 0%; a zero-range bar has an undefined percentage and must not be divided by zero.'));
 }
 root.GroundUpBootcampDay05=Object.freeze({mount});
})(typeof globalThis!=='undefined'?globalThis:window);
