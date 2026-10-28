/* Free Foundations Teaching Studio v3.
 * Five distinct, original, fictional and ungraded guided demonstrations.
 * No member data, grades, privileged Lab calls or simulated brokerage fills.
 * Shared stage host: the existing nine-stage Free Foundations Academy engine.
 */
(function(root){'use strict';
const specs=Object.freeze({
 1:Object.freeze({title:'What a quote can—and cannot—promise',label:'Shares, last trade and current quote',
  summary:'A completed trade is history. A new order requires current executable liquidity, which a displayed quote does not guarantee.',
  instructions:'Change the hypothetical displayed ask size. Compare it with the proposed 100-share order. No actual order is sent.',
  input:'Displayed ask size',unit:'shares',min:10,max:150,step:10,start:30,
  columns:['Last completed trade','Later displayed ask','Proposed order'],
  prompt:'Would the last trade or this displayed ask guarantee execution of 100 shares?',
  choices:['Yes, the last trade guarantees my price','Yes, if the ask shows at least 100 shares','No, neither guarantees a fill'],
  correct:2,
  feedback:'Correct reasoning: an earlier last trade is already completed. A displayed quote can change or disappear and does not prove an order was accepted or filled.',
  nudge:'Ask: is this a completed execution record, a live offer, or only a planned order?',
  next:'Full Labs add more guided chart and decision scenarios, subject to your membership and book access.'}),
 2:Object.freeze({title:'Explore a candle without predicting the next one',label:'Completed five-minute OHLC candle',
  summary:'The high and low define the full range. The open and close define the real body. Direction describes the completed interval only.',
  instructions:'Move the fictional close while keeping open, high and low fixed. Watch the body, direction, and wicks update.',
  input:'Fictional close',unit:'USD',min:19.5,max:21.5,step:.25,start:21,
  columns:['Open $20.00','High $21.50','Low $19.50'],
  prompt:'Which observation is supported by one completed candle?',
  choices:['The next candle must rise','The body is the absolute open–close difference','This candle guarantees a new order fill'],
  correct:1,
  feedback:'Correct: the real body is |close − open|. The full range is high − low, and neither measures the next candle or guarantees a trade.',
  nudge:'Label open and close first; then calculate the nonnegative real body. The future bar is not yet visible.',
  next:'Full Labs offer additional chart interpretation, modes and protected assessments when authorized.'}),
 3:Object.freeze({title:'Freeze the decision before future evidence appears',label:'Fictional evidence chronology (ET)',
  summary:'At a decision pause you can use only evidence that was actually publicly available by then. An item’s timestamp still needs source verification.',
  instructions:'Move the fictional decision time. Notice which documents become eligible to inspect and which remain in the future.',
  input:'Decision pause (ET)',unit:'minute',min:480,max:505,step:1,start:490,
  columns:['08:00 issuer notice','08:17 social repost','08:21 screenshot'],
  prompt:'Can an 08:21 screenshot justify a decision made at 08:10?',
  choices:['Yes, if the screenshot looks official','No, that screenshot did not exist at the pause','Yes, if the price later rises'],
  correct:1,
  feedback:'Correct: later evidence cannot justify an earlier decision. Independently verify the issuer notice, its actual public availability, and the reported period.',
  nudge:'Compare the document’s independently established publication time with the chosen decision pause.',
  next:'Paid Labs deepen source verification and chronology exercises under a separate entitlement.'}),
 4:Object.freeze({title:'Research candidates without treating them as orders',label:'Original fictional watchlist case',
  summary:'A watchlist records what to research, not what to buy. Missing issuer evidence or quote quality can justify waiting.',
  instructions:'Move the source-confidence control. This is a teaching classification, not actual market screening or proof of a catalyst.',
  input:'Hypothetical source evidence level',unit:'level',min:0,max:2,step:1,start:0,
  columns:['Issuer identity','Dated source','Current liquidity'],
  prompt:'With incomplete catalyst verification, what should a beginner choose?',
  choices:['Buy because the scanner lists it','Verify the source or record NO TRADE','Assume volume guarantees a fill'],
  correct:1,
  feedback:'Correct: place research evidence, its timestamp, its limitations and a review criterion in your list. A watchlist does not submit an order.',
  nudge:'Which original document, timestamp, spread and source classification are still missing?',
  next:'Full Labs provide more candidate-quality decisions and exercises when the relevant plan permits them.'}),
 5:Object.freeze({title:'Adjust risk assumptions before any decision',label:'Fictional position-size planning',
  summary:'Planned risk is a price difference, not a guaranteed loss. Notional exposure and execution uncertainty must be considered separately.',
  instructions:'Adjust the hypothetical stop reference for a $10.00 entry and $20 planned-risk budget. No order is placed.',
  input:'Illustrative stop reference',unit:'USD',min:9.5,max:9.95,step:.05,start:9.8,
  columns:['Assumed entry $10.00','Risk budget $20.00','Order status: NONE'],
  prompt:'What if spread, liquidity, or the likely fill price cannot be verified?',
  choices:['Treat the risk estimate as a guaranteed loss cap','Choose NO TRADE or investigate further','Double the position because the candle is green'],
  correct:1,
  feedback:'Correct: no trade is a valid decision. A stop can fill worse than its reference; the calculation is a learning example, not personalized sizing advice.',
  nudge:'Separate entry-to-stop difference, planned quantity, notional exposure and uncertainty about actual fills.',
  next:'Full Labs can provide more structured decision practice; access to graded assessments is separately controlled.'})
});
const elem=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=String(text);if(cls)e.className=cls;return e};
const usd=value=>'$'+Number(value).toFixed(2);
function compute(day,value){
 const n=Number(value);
 if(!Number.isFinite(n)||!specs[day]||n<specs[day].min||n>specs[day].max)
  throw Error('Unsupported fictional study input');
 if(day===1)return {main:'Displayed ask: $10.12 for '+n+' shares',
  detail:n<100?'Only '+n+' of the hypothetical 100 requested shares are currently displayed at the ask.':'At least 100 shares are displayed at the ask, but that still cannot guarantee a complete execution.',
  sub:'Last trade $10.00 (earlier) · hypothetical planned order: BUY 100 · no fill recorded'};
 if(day===2){
  const body=Math.abs(n-20),range=2,upper=21.5-Math.max(20,n),lower=Math.min(20,n)-19.5;
  return {main:'Close '+usd(n)+' · '+(n>20?'Bullish':n<20?'Bearish':'Doji')+' completed candle',
   detail:'Body '+usd(body)+' · Range '+usd(range)+' · Upper wick '+usd(upper)+' · Lower wick '+usd(lower),
   sub:'Body ÷ range = '+(100*body/range).toFixed(1)+'% · No future bar or execution is shown.',
   body,range,upper,lower};
 }
 if(day===3){
  const events=[['08:00 issuer item',480],['08:17 repost',497],['08:21 screenshot',501]];
  const stamp=String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')+' ET';
  return {main:'Decision paused at '+stamp,
   detail:events.map(([name,time])=>name+': '+(time<=n?'timestamp at/before pause; public availability still needs verification':'FUTURE—exclude')).join(' • '),
   sub:'Time eligibility does not itself authenticate the item or prove a quote was executable.'};
 }
 if(day===4){
  const descriptions=['Anonymous repost; original issuer record missing.','Dated article identified; original claim still unconfirmed.','Dated original issuer record located; quote and liquidity still unknown.'];
  return {main:['UNVERIFIED — do not act','VERIFY MORE — research only','PRIMARY SOURCE FOUND — still research only'][n],
   detail:descriptions[n],sub:'Record source type, observation time, missing execution evidence and an objective removal rule.'};
 }
 const gap=10-n,shares=Math.floor((20+1e-7)/gap),exposure=shares*10;
 return {main:'Planned gap '+usd(gap)+' per share · '+shares+' illustrative whole shares',
  detail:'Planned price risk '+usd(shares*gap)+' · hypothetical notional exposure '+usd(exposure),
  sub:'A stop is not a guaranteed execution; real losses can exceed this estimate. No order was placed.'};
}
function drawCandle(svg,close){
 const ns='http://www.w3.org/2000/svg';
 const add=(tag,attrs,txt)=>{const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));if(txt!==undefined)el.textContent=txt;svg.append(el)};
 svg.replaceChildren();svg.setAttribute('viewBox','0 0 550 220');
 svg.setAttribute('role','img');svg.setAttribute('aria-label','Fictional completed candle with open 20 dollars, high 21 dollars 50 cents, low 19 dollars 50 cents, and close '+usd(close)+'. Not a historical market record.');
 const y=p=>190-(p-19.5)*70,color=close>=20?'#72d9a9':'#ff9c9c';
 add('rect',{x:1,y:1,width:548,height:218,rx:12,fill:'#0a2030',stroke:'#466b85'});
 for(const [p,name] of [[21.5,'High $21.50'],[20,'Open $20.00'],[19.5,'Low $19.50']]){
  add('line',{x1:45,y1:y(p),x2:520,y2:y(p),stroke:'#496780','stroke-dasharray':'5 7'});
  add('text',{x:290,y:y(p)-6,fill:'#e9f2ff','font-size':14},name);
 }
 add('line',{x1:170,y1:y(21.5),x2:170,y2:y(19.5),stroke:color,'stroke-width':7,'stroke-linecap':'round'});
 const top=y(Math.max(20,close)),bottom=y(Math.min(20,close));
 add('rect',{x:135,y:top,width:70,height:Math.max(2,bottom-top),rx:3,fill:color,stroke:'#d4f9ff'});
 add('text',{x:290,y:25,fill:color,'font-size':16},'Close '+usd(close));
 add('text',{x:290,y:208,fill:'#e9f2ff','font-size':13},'FICTIONAL · 5-MINUTE INTERVAL');
}
function mount(day,experiment,practice){
 const spec=specs[day];if(!spec||!experiment||!practice)return false;
 const frame=elem('section',null,'academy-free-studio');frame.setAttribute('aria-label','Interactive fictional teaching example for lesson '+day);
 frame.append(elem('p','TALIA · SEE IT, CHANGE IT, EXPLAIN IT','academy-studio-eyebrow'),
  elem('h4',spec.title),elem('p',spec.summary));
 const note=elem('p','FICTIONAL TEACHING DATA · No live quote, historical OHLCV, order, outcome or official mastery.','academy-studio-notice');frame.append(note);
 const layout=elem('div',null,'academy-studio-layout'),surface=elem('section',null,'academy-studio-evidence'),
  controller=elem('section',null,'academy-studio-control');
 surface.append(elem('h5',spec.label));
 const visual=day===2?document.createElementNS('http://www.w3.org/2000/svg','svg'):null;
 if(visual){visual.classList.add('academy-studio-candle');surface.append(visual)}
 const main=elem('p',null,'academy-studio-main'),detail=elem('p',null,'academy-studio-detail'),sub=elem('p',null,'academy-studio-sub');
 main.setAttribute('aria-live','polite');main.setAttribute('aria-atomic','true');
 surface.append(main,detail,sub);
 const label=elem('label',spec.input+' (fictional)');const range=elem('input');
 range.type='range';range.min=String(spec.min);range.max=String(spec.max);range.step=String(spec.step);
 range.value=String(spec.start);range.id='academy-studio-control-'+day;label.htmlFor=range.id;
 const output=elem('output',null,'academy-studio-value');output.htmlFor=range.id;
 controller.append(elem('h5','Experiment: change one variable'),elem('p',spec.instructions),label,range,output);
 const facts=elem('ul',null,'academy-studio-facts');for(const f of spec.columns)facts.append(elem('li',f));controller.append(facts);
 layout.append(surface,controller);frame.append(layout);
 const render=()=>{const x=compute(day,Number(range.value));main.textContent=x.main;detail.textContent=x.detail;sub.textContent=x.sub;
  output.textContent=day===3?String(Math.floor(+range.value/60)).padStart(2,'0')+':'+String(+range.value%60).padStart(2,'0')+' ET':
   (day===2||day===5?usd(range.value):range.value+' '+spec.unit);
  if(visual)drawCandle(visual,+range.value);
 };
 range.addEventListener('input',render);render();
 experiment.append(frame);
 const challenge=elem('section',null,'academy-studio-challenge');
 challenge.setAttribute('aria-label','Practice this lesson decision without a grade');
 challenge.append(elem('h4','Your turn: make an evidence-based decision'),elem('p',spec.prompt));
 const group=elem('fieldset');const legend=elem('legend','Choose the most defensible explanation');
 group.append(legend);
 let selected=-1;
 const controls=spec.choices.map((choice,i)=>{
  const wrapper=elem('label',null,'academy-studio-choice'),input=elem('input');
  input.type='radio';input.name='academy-studio-'+day;input.value=String(i);
  input.addEventListener('change',()=>{selected=i;check.disabled=false;reply.textContent='Your choice is recorded locally. Compare to receive a teaching explanation.'});
  wrapper.append(input,elem('span',choice));group.append(wrapper);return input;
 });
 challenge.append(group);
 const actions=elem('div',null,'academy-studio-actions'),check=elem('button','Check my reasoning (ungraded)','btn secondary');
 check.type='button';check.disabled=true;
 const hint=elem('button','Teach this another way','btn secondary');hint.type='button';
 const retry=elem('button','Try another example','btn secondary');retry.type='button';
 const reply=elem('p',null,'academy-studio-feedback');reply.setAttribute('role','status');reply.setAttribute('aria-live','polite');
 check.addEventListener('click',()=>{
  if(selected<0)return;
  reply.textContent=(selected===spec.correct?'That matches the evidence. ':'Review the distinction and try again. ')+spec.feedback+
  ' This ungraded practice does not award mastery.';
 });
 hint.addEventListener('click',()=>{reply.textContent='Talia: '+spec.nudge+' Now inspect the demonstration above, then choose again.'});
 retry.addEventListener('click',()=>{
  controls.forEach(x=>{x.checked=false});selected=-1;check.disabled=true;
  range.value=String(spec.min===spec.start?spec.max:spec.min);range.dispatchEvent(new Event('input'));
  reply.textContent='A different fictional input is displayed in Experiment. Observe what changed, then try the reasoning question again.';
 });
 actions.append(check,hint,retry);challenge.append(actions,reply);
 practice.prepend(challenge);return true;
}
root.GroundUpFreeStudioV3=Object.freeze({mount,compute,scenarios:Object.freeze(Object.keys(specs).map(Number))});
})(typeof window==='undefined'?globalThis:window);
