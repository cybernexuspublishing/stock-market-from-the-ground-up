/* Boot Camp guided learning: 247 existing study days, 7 course IDs.
 * Formative only. Never unlock a Lab, give a grade, fabricate historical replay,
 * deduct Lumens, or modify the existing authenticated progress APIs.
 */
(function(root){'use strict';
const active=new WeakMap();
const STEPS=['Start','Learn','Calculate / Analyze','Experiment','Predict','Replay / Practice','Assess','Review & Retry','Transfer Challenge','Results'];
const el=(tag,content,cl)=>{const x=document.createElement(tag);if(content!==undefined)x.textContent=String(content);if(cl)x.className=cl;return x};
const clean=s=>String(s||'').slice(0,1400);
function classify(d){
 const s=(d.title+' '+d.objective).toLowerCase();
 return /vwap|volume.weighted/.test(s)?'vwap':/candle|chart|volume|indicator|ema|price action|breakout|level|pattern|pullback|scanner|timeframe/.test(s)?'candle':/risk|sizing|spread|percent|quantity/.test(s)?'risk':'research';
}
function guidance(d,kind){
 const terms={
  vwap:['Price is dollars per share; volume is shares traded.','Weighted price = sum of price × shares divided by total shares.','Fictional: 200 × $8 + 100 × $10 = $2,600; 300 shares; VWAP ≈ $8.67/share.'],
  candle:['OHLC means open, high, low and close for a defined interval.','Real body = |close − open|; full range = high − low.','Fictional: $31 open, $32 close, $32.50 high, $30.50 low: body $1, range $2, body is 50% of range.'],
  risk:['Plan the maximum risk before share quantity.','Planned risk per share = |entry − stop|; whole shares = floor(risk budget ÷ risk per share).','Fictional: $20 entry, $19.60 stop, $40 planned risk → 100 shares, excluding slippage, gaps and fees.'],
  research:['Identify the original publisher, evidence and measured period.','Distinguish the source timestamp from a later interpretation of the event.','Fictional: a viral claim about a contract is unverified until a dated original issuer record supports its actual wording.']
 };
 return terms[kind].concat(['The day-specific objective: '+clean(d.objective),
  'Required observation: '+clean(d.observe),
  'Practice: '+clean(d.practice),
  'Limitations: '+clean(d.limitation||d.caution)]);
}
function plan(d){
 const kind=classify(d),teach=guidance(d,kind),method=clean((Array.isArray(d.method)?d.method[0]:d.method)||d.practice);
 const limitation=clean(d.limitation||d.caution||'An observation cannot guarantee a future market outcome.');
 const stages=[
  ['Start',[d.title,d.objective,'Talia teaches from first principles before requesting independent work.']],
  ['Learn',teach.slice(0,2).concat(['Today: '+clean(d.observe)])],
  ['Calculate / Analyze',teach.slice(1,3).concat(['Apply the method to: '+clean(d.title)])],
  ['Experiment',['Use the fictional ECharts chart when a chart is relevant.','For a research subject, inspect the source-and-evidence checklist.',clean(d.practice)]],
  ['Predict',[clean(d.observe),'Identify one fact you would need before claiming a likely outcome. Later market bars are never revealed by this module.']],
  ['Replay / Practice',[method,clean(d.practice),'Only synthetic illustrative chart data are displayed. No future historical bar is supplied.']],
  ['Assess',['Independent formative question using a different decision situation.','The first selection is held until submission. It is not the official protected Lab assessment.']],
  ['Review & Retry',teach.concat([limitation,'Incorrect answers receive additional teaching and free retries.'])],
  ['Transfer Challenge',[clean(d.lesson?.transfer||d.practice),'Different cases require new evidence and a documented invalidation.']],
  ['Results',['Your saved private Boot Camp reflection is managed by the existing member service.','This ungraded in-browser journey does not itself persist assessment attempts.','Official competency mastery: Not Yet Assessed.']]
 ];
 const checks={
  2:{question:'Which procedure applies to today’s study skill?',correct:method},
  4:{question:'Before later evidence is available, what should you examine?',correct:clean(d.observe)},
  5:{question:'Which action is aligned with the current day’s guided practice?',correct:clean(d.practice)},
  6:{question:'A new unfamiliar case has incomplete evidence. What should you do?',correct:'Apply the method, record what remains unknown and withhold unsupported claims.'},
  8:{question:'How should you transfer the skill to a different case?',correct:'Recheck the new evidence, its limitations and the NO TRADE conditions before deciding.'}
 };
 if(kind==='vwap')checks[2]={numeric:true,question:'Calculate fictional traded dollars, shares and VWAP.',labels:['Total traded dollars ($)','Total shares','VWAP ($/share)'],expected:[2600,300,8.67],hints:['Multiply $8 × 200 and $10 × 100, then add dollar totals.','Add 200 and 100 shares.','Divide $2,600 by 300 shares; round to cents.']};
 if(kind==='candle')checks[2]={numeric:true,question:'Calculate fictional body, range and body percentage.',labels:['Real body ($)','Full range ($)','Body / range (%)'],expected:[1,2,50],hints:['Body = |$32 close − $31 open|.','Range = $32.50 high − $30.50 low.','Divide $1 body by $2 range, then multiply by 100.']};
 if(kind==='risk')checks[2]={numeric:true,question:'Calculate fictional risk per share and share quantity.',labels:['Risk per share ($)','Whole shares for $40 planned risk'],expected:[.4,100],hints:['Use $20 entry − $19.60 planned stop.','Divide $40 by $0.40/share. Actual loss can exceed planned loss.']};
 return {kind,stages,checks,limitation};
}
function mount(host,{day,programCode}={}){
 if(!host||!day||!Number.isSafeInteger(day.day))return null;
 active.get(host)?.dispose();
 const cfg=plan(day);let stage=0,furthest=0,autoplay=false,timer=0,disposed=false,
   answer=-1,misses=0,selectedOptions=[],numericInputs=[],chart=null;const completed=new Set();
 const shell=el('section',undefined,'academy-guided-ten'),head=el('div',undefined,'academy-guided-head'),
   nav=el('ol',undefined,'academy-guided-nav'),meter=el('progress'),play=el('button','Play guided teaching','btn secondary'),
   status=el('p','Optional automatic narration pauses when a question appears.'),
   grid=el('div',undefined,'academy-guided-grid'),evidence=el('section',undefined,'academy-guided-evidence'),
   instructor=el('section',undefined,'academy-guided-talia'),visual=el('div',undefined,'academy-guided-chart'),
   controls=el('div',undefined,'academy-guided-controls'),previous=el('button','Previous','btn secondary'),
   next=el('button','Next','btn'),explain=el('button','Explain This Concept — Free','btn secondary'),
   depth=el('button','Teach This in More Depth — Free','btn secondary'),
   feedback=el('p');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
 meter.max=10;meter.value=0;meter.setAttribute('aria-label','Completed formative steps');
 status.setAttribute('role','status');
 head.append(el('h3','Talia · Ten-stage Boot Camp journey'),meter,play,status,nav);
 evidence.append(el('h4','Illustrative ECharts & evidence'),visual);
 instructor.append(el('h4','Talia Mercer — Guided instructor'));
 controls.append(previous,next,explain,depth);grid.append(evidence,instructor);
 shell.append(head,grid,controls,feedback,el('p','Free explanations and retries. No Lumens charged. Fictional teaching evidence only; protected replay, grading and access remain unchanged.'));
 host.replaceChildren(shell);
 function stop(){if(timer){clearTimeout(timer);timer=0}}
 function narration(){
  stop();if(disposed||!autoplay)return;
  if(cfg.checks[stage]&&!completed.has(stage)){status.textContent='Paused at checkpoint: submit an instructional answer to continue.';return}
  if(stage===9){autoplay=false;play.textContent='Replay guided teaching';status.textContent='Learning report reached.';return}
  status.textContent='Talia is presenting stage '+(stage+1)+'.';
  timer=setTimeout(()=>{timer=0;if(autoplay&&!disposed){completed.add(stage);stage++;furthest=Math.max(furthest,stage);answer=-1;misses=0;render();narration()}},2400);
 }
 function render(){
  if(disposed)return;
  nav.replaceChildren();STEPS.forEach((s,i)=>{
   const li=el('li',undefined,i===stage?'current':completed.has(i)?'complete':'future'),
    b=el('button',(i+1)+'. '+s);b.type='button';b.disabled=i>furthest;
   b.setAttribute('aria-current',stage===i?'step':'false');b.onclick=()=>{stop();stage=i;answer=-1;misses=0;feedback.textContent='';render();narration()};
   li.append(b);nav.append(li);
  });
  meter.value=completed.size;
  evidence.querySelector('h4').textContent='Evidence & ECharts · '+STEPS[stage];
  if(chart){chart.dispose?.();chart=null}
  visual.replaceChildren();
  if(cfg.kind==='candle'||cfg.kind==='vwap'){
   if(stage>0&&stage<9&&root.CrownlightLearningEChartsV1?.mount)
    chart=root.CrownlightLearningEChartsV1.mount(visual,{kind:cfg.kind==='vwap'?'vwap':'candle',interactive:true});
   else visual.append(el('p','Illustrative chart becomes available during the instructional stages.'));
   visual.append(el('p','These synthetic prices are general calculation demonstrations, not an actual replay or proof for this study day.'));
  }else{
   const ul=el('ul');for(const value of [day.objective,day.observe,day.practice,day.limitation||day.caution].filter(Boolean))ul.append(el('li',clean(value)));
   visual.append(el('h5','Evidence checklist'),ul);
  }
  instructor.querySelectorAll('.academy-guided-content').forEach(x=>x.remove());
  const content=el('div',undefined,'academy-guided-content');
  content.append(el('h4',(stage+1)+'. '+cfg.stages[stage][0]));
  for(const text of cfg.stages[stage][1])content.append(el('p',clean(text)));
  const check=cfg.checks[stage];selectedOptions=[];numericInputs=[];
  if(check){
   content.append(el('h5',check.question));
   if(check.numeric){
    const group=el('div',undefined,'academy-guided-numeric');
    check.labels.forEach(label=>{
     const wrap=el('label',label),input=el('input');
     input.type='number';input.step='any';input.inputMode='decimal';
     input.setAttribute('aria-label',label);input.oninput=()=>{feedback.textContent=''};
     wrap.append(input);group.append(wrap);numericInputs.push(input);
    });
    content.append(group,el('p','Calculate each quantity separately. Retries are free.'));
   }else{
   const choices=[{t:check.correct,ok:true},
     {t:'Assume a chart or scanner result proves the outcome without checking evidence.',ok:false},
     {t:'Ignore timestamps, source limitations and the possibility of NO TRADE.',ok:false}];
   const shift=(day.day+stage)%3;selectedOptions=choices.slice(shift).concat(choices.slice(0,shift));
   const fieldset=el('fieldset');fieldset.append(el('legend','Select the most defensible action'));
   selectedOptions.forEach((choice,i)=>{
    const label=el('label',undefined,'academy-guided-choice'),input=el('input');
    input.type='radio';input.name='academy-guided-'+(programCode||day.programCode)+'-'+day.day+'-'+stage;
    input.checked=answer===i;input.onchange=()=>{answer=i;feedback.textContent=''};
    label.append(input,document.createTextNode(choice.t));fieldset.append(label);
   });
   content.append(fieldset);
   }
  }
  if(stage===6)content.append(el('p','First formative selection is preserved until submitted. No official grade, competency or independent mastery is awarded.'));
  if(stage===9)content.append(el('p','Formative stages completed: '+completed.size+' of 9. Save your own notes using the existing course reflection controls. Official competency remains Not Yet Assessed.'));
  instructor.append(content);previous.disabled=stage===0;next.disabled=stage===9;
  next.textContent=check?'Close & Next — Submit answer':'Next lesson step';
 }
 function advance(){completed.add(stage);furthest=Math.max(furthest,stage+1);stage=Math.min(9,stage+1);answer=-1;misses=0;feedback.textContent='';render();narration()}
 next.onclick=()=>{
  const q=cfg.checks[stage];
  if(q&&!completed.has(stage)){
   if(q.numeric){
    const values=numericInputs.map(x=>x.value.trim());
    const empty=values.findIndex(v=>v===''||!Number.isFinite(Number(v)));
    if(empty>=0){feedback.textContent='Enter a valid number for '+q.labels[empty]+'.';return}
    const wrong=values.findIndex((v,i)=>Math.abs(Number(v)-q.expected[i])>(q.labels[i].includes('VWAP')?.0051:.011));
    if(wrong>=0){misses++;feedback.textContent=(misses===1?'Not yet. ':'Work through the intermediate step. ')+q.hints[wrong]+' Correct the entry and retry for free.';return}
   }else{
    if(answer<0){feedback.textContent='Choose an answer before submitting. You can retry for free.';return}
    if(!selectedOptions[answer].ok){
     misses++;feedback.textContent=misses===1?'Not yet. Compare the response with Talia’s evidence and method. Try again.':
      'Additional instruction: '+clean(q.correct)+' Review the evidence and retry without Lumens.';return;
    }
   }
  }
  advance();
 };
 previous.onclick=()=>{if(stage>0){stop();stage--;answer=-1;misses=0;render();narration()}};
 explain.onclick=()=>{feedback.textContent='Talia explains: '+cfg.stages[stage][1].join(' ')+' A worked answer alone does not establish mastery.'};
 depth.onclick=()=>{feedback.textContent='Teach in more depth: '+guidance(day,cfg.kind).join(' ')+' Review the limitation: '+cfg.limitation};
 play.onclick=()=>{if(stage===9){stage=0;furthest=0;completed.clear();render()}
  autoplay=!autoplay;play.textContent=autoplay?'Pause guided teaching':'Play guided teaching';
  if(autoplay)narration();else{stop();status.textContent='Automatic teaching paused.'}};
 render();const session={dispose(){disposed=true;stop();chart?.dispose?.();if(active.get(host)===session)active.delete(host);host.replaceChildren()}};active.set(host,session);return session;
}
root.GroundUpAcademyGuidedV1=Object.freeze({mount,plan,STEPS});
})(typeof window!=='undefined'?window:globalThis);
