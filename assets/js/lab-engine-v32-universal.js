/* v3.3 shared instructional journey for the existing 419 canonical Lab IDs.
 * Builds on v3.2 reference teaching and 30 original competency guides.
 * NO private rubric, answer key, future market bar, member credit or entitlement
 * is shipped by this module. Authenticated grading and replay remain server-only.
 */
(function(root){
'use strict';
const STEPS=Object.freeze(['Start','Learn','Experiment','Predict','Practice','Assess','Review','Transfer','Results']);
function paintPrototypeProgress(index,percent=null){
 const lookup=id=>typeof document.getElementById==='function'?document.getElementById(id):null;
 const value=percent??Math.round(index/8*100);
 const grid=lookup('player-stage-grid');
 if(grid){grid.replaceChildren();for(let i=0;i<STEPS.length;i++){
  const item=el('div');item.className='stage-item '+(i<index?'complete':i===index?'current':'');
  item.dataset.playerStage=String(i);
  const bullet=el('span');bullet.className='bullet';bullet.setAttribute('aria-hidden','true');
  item.append(bullet,document.createTextNode?.(STEPS[i])||el('span',STEPS[i]));grid.append(item);
 }}
 const current=lookup('player-current-stage');if(current)current.textContent=STEPS[index];
 const count=lookup('player-stage-count');if(count)count.textContent='Stage '+(index+1)+' of 9';
 const number=lookup('player-progress-value');if(number)number.textContent=value+'%';
 const fill=lookup('player-progress-fill');if(fill)fill.style.width=value+'%';
 const bar=lookup('player-stage-progress');if(bar)bar.setAttribute('aria-valuenow',String(value));
}

const sessions=new WeakMap();
let cache=null;
async function catalog(){
 if(!cache)cache=Promise.all([
  fetch('/data/competency-lab-paths-v01499.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('Curriculum map unavailable');return r.json()}),
  fetch('/data/competency-study-guides-v01499.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('Study guide unavailable');return r.json()})
 ]).then(([paths,study])=>{
  const guides=study.guides||[];
  if(paths.totalCanonicalLabs!==419||Object.keys(paths.byLab||{}).length!==419||guides.length!==30||
   new Set(guides.map(x=>x.code)).size!==30)throw Error('Curriculum or competency register mismatch');
  return {byLab:paths.byLab,guides:new Map(guides.map(x=>[x.code,x]))};
 }).catch(e=>{cache=null;throw e});
 return cache;
}
function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);return n}
function appendParagraph(parent,text){parent.append(el('p',text))}
function button(text,fn){const b=el('button',text);b.type='button';b.className='btn secondary';b.addEventListener('click',fn);return b}
function detail(parent,label,paragraphs){const d=el('details');d.append(el('summary',label));for(const p of paragraphs)appendParagraph(d,p);parent.append(d);return d}
function field(parent,label,value='',type='textarea'){
 const wrap=el('label',label),input=el(type);
 if(type==='textarea'){input.rows=3;input.maxLength=1500}else{input.type='number';input.step='any';input.inputMode='decimal'}
 input.value=value;wrap.append(input);parent.append(wrap);return input;
}
function mathDiagnostic(kind,value){
 const n=Number(value);
 if(kind==='candle'){
  if(Math.abs(n-1)<.01)return 'You entered the real-body size ($1) rather than the percentage. Divide by the $2 full range, then multiply by 100.';
  if(Math.abs(n-.5)<.01)return 'You calculated the decimal ratio (0.5). Multiply the ratio by 100 to express it as a percentage.';
  if(Math.abs(n-2)<.01)return 'You entered the complete price range ($2). The question asks what share of that range is occupied by the body.';
  return 'Use |Close − Open| for the body, High − Low for the range, then (body ÷ range) × 100.';
 }
 if(kind==='vwap'){
  if(Math.abs(n-9)<.01)return 'A simple average of $8 and $10 gives $9, but it ignores that 200 shares traded at $8 and only 100 at $10.';
  if(Math.abs(n-2600)<.01)return '$2,600 is traded dollar value, not VWAP. Divide it by 300 total shares.';
  if(Math.abs(n-300)<.01)return '300 represents total share volume, not price per share.';
  return 'Multiply each price by its share volume, add the dollar values, then divide by the total shares.';
 }
 return 'Check the observation against the stated learning objective and explain which evidence supports it.';
}
const synthetic=Object.freeze({
 candle:{o:31,h:32.5,l:30.5,c:32,answer:50,units:'%',title:'Candlestick real body as a percentage of full range',
 description:'An illustrative candle opens at $31, reaches $32.50, trades as low as $30.50, and closes at $32. Calculate what percentage of the complete price range is its real body.',
 steps:['Real body = |Close − Open| = |$32 − $31| = $1.','Full range = High − Low = $32.50 − $30.50 = $2.','Body ÷ range = $1 ÷ $2 = 0.5.','Convert ratio to percentage: 0.5 × 100 = 50%.'],
 transfer:{prompt:'New fictional candle: Open $12.40, High $12.70, Low $11.90, Close $12.10. What percentage of its full range is the real body?',answer:37.5}},
 vwap:{answer:2600/300,units:'USD/share',title:'Trade-price volume-weighted average',
 description:'Two fictional trade groups: 200 shares at $8 and 100 shares at $10. Calculate VWAP (dollars per share) to two decimal places.',
 steps:['First traded value: 200 shares × $8 = $1,600.','Second traded value: 100 shares × $10 = $1,000.','Combined traded value = $1,600 + $1,000 = $2,600.','Combined volume = 200 + 100 = 300 shares.','VWAP = $2,600 ÷ 300 shares ≈ $8.67/share.'],
 transfer:{prompt:'New fictional trades: 150 shares at $12 and 50 shares at $16. What is their VWAP?',answer:13}}
});
function validNumber(input,n){return input.trim()!==''&&Number.isFinite(Number(input))&&Math.abs(Number(input)-n)<.016}
async function mount({labId,mode,target,lab,focusId,tutorTopic,tutorRequest}={}){
 if(!target||typeof target.replaceChildren!=='function')return false;
 const token={labId,mode};sessions.set(target,token);
 if(['blind','assessment'].includes(mode)){
  paintPrototypeProgress(mode==='blind'?3:5,0);
  // The browser must not preload private answers or hidden instructional cues.
  // This neutral nine-stage shell delegates decisions and grading to the existing
  // member-authorized workbench and authenticated assessment API.
  const shell=el('section');shell.className='card gu-v32 gu-v33';shell.dataset.v32Progress='0';
  shell.setAttribute('aria-label','Learning journey with concealed instruction');
  shell.append(el('h2',mode==='blind'?'Blind Decision — Evidence First':'Assessment — Independent Decision'));
  shell.append(el('p','The nine-stage framework remains available. Teaching cues are withheld here until the applicable decision is locked or reviewed grading is complete.'));
  const progress=el('p','Independent decision · No stage awarded'),meter=el('div'),fill=el('span'),journey=el('ol');
  progress.className='gu-v32-progress';meter.className='gu-v33-progress';meter.setAttribute('role','progressbar');
  meter.setAttribute('aria-label','Completed instructional stages');meter.setAttribute('aria-valuemin','0');
  meter.setAttribute('aria-valuemax','100');meter.setAttribute('aria-valuenow','0');fill.style.width='0%';meter.append(fill);
  journey.className='gu-v33-journey';
  for(const [index,name] of STEPS.entries()){
   const li=el('li');li.className=name===(mode==='blind'?'Predict':'Assess')?'current':'future';
   const mark=el('span',li.className==='current'?'●':'○');mark.setAttribute('aria-hidden','true');
   li.append(mark,el('span',name));journey.append(li);
  }
  const content=el('div');content.className='gu-v32-body';
  content.append(el('h3',mode==='blind'?'Record your independent forecast and decision':'Complete the reviewed assessment independently'));
  appendParagraph(content,'No answer keys, conceptual hints, unrevealed bars or synthetic future prices are supplied by this stage. Record your own evidence and invalidation in the protected member workbench.');
  content.append(button('Open member decision and assessment',()=>{
   const work=document.getElementById('gu-ws-member-workbench');if(work)work.open=true;
   document.getElementById(focusId||'ev-decision')?.focus();
  }));
  shell.append(progress,meter,journey,content);target.replaceChildren(shell);
  return true;
 }
 if(!['guided','practice'].includes(mode)){target.replaceChildren();return false}
 target.replaceChildren(el('p','Loading subject teaching from the existing curriculum…'));
 let map;
 try{map=await catalog()}catch{
  if(sessions.get(target)===token)target.replaceChildren(el('p','Original study guide unavailable. No assessed grade or competency is inferred.'));
  return false;
 }
 if(sessions.get(target)!==token)return false;
 const item=map.byLab[labId];
 if(!item){target.replaceChildren(el('p','This Lab is not part of the canonical curriculum.'));return false}
 const codes=(item.relatedCompetencies||[]).filter(x=>map.guides.has(x));
 const guide=map.guides.get(codes[0]);
 if(!guide){target.replaceChildren(el('p','This Lab lacks an approved competency study bridge.'));return false}
 const kind=root.GroundUpLabEngineV32?.kindFor?.(labId)||'general';
 const special=synthetic[kind]||null;
 const subject=root.GroundUpLabEngineV32?.lessons?.[kind]||null;
 const topic=String(lab?.concept||item.title||labId);
 const visualType=root.GroundUpLabV33Contextual?.select?.({lab,topic,competencies:codes})||'none';
 const authorizedTeaching=lab?.teaching&&typeof lab.teaching==='object'?lab.teaching:{};
 const ownHow=Array.isArray(authorizedTeaching.how)?authorizedTeaching.how.filter(s=>typeof s==='string'&&s.trim()).slice(0,20):[];
 const ownQuestions=Array.isArray(authorizedTeaching.questions)?authorizedTeaching.questions.filter(s=>typeof s==='string'&&s.trim()).slice(0,5):[];
 const shell=el('section');shell.className='card gu-v32 gu-v33';
 shell.setAttribute('aria-label','Advanced learning journey');
 const heading=el('h2','Learning Journey — '+(subject?.name||guide.title));
 const disclosure=el('p','Curriculum-linked, ungraded instructional guidance. Reviewed assessments, actual market history, future bars, account progress and member access remain under their existing protected services.');
 const journey=el('ol'),progress=el('p'),meter=el('div'),meterFill=el('span'),body=el('section'),status=el('p'),nav=el('div');
 journey.className='gu-v33-journey';journey.setAttribute('aria-label','Learning stages');
 progress.className='gu-v32-progress';meter.className='gu-v33-progress';meter.setAttribute('role','progressbar');meter.setAttribute('aria-label','Learning journey progress');meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax','100');meter.append(meterFill);body.className='gu-v32-body';nav.className='actions';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const previous=button('Previous stage',()=>{if(stage>0){stage--;render()}}),
 next=button('Next learning stage',()=>nextStage());
 nav.append(previous,next);shell.append(heading,disclosure,progress,meter,journey,body,status,nav);target.replaceChildren(shell);
 let stage=0,observations='',prediction='',predictionLocked=false,practice='',practiceCount=0,
     practiceResolved=false,practiceAssisted=false,transfer='',transferCount=0,transferResolved=false,
     selfReview=false,experimentValue=kind==='candle'?32:100,reflection='';
 let instructorInstance=null;
 const narratedStages=new Set();
 function mark(message){status.textContent=message}
 function showJourney(){
  journey.replaceChildren();
  for(let i=0;i<STEPS.length;i++){
   const li=el('li'),markEl=el('span',i<stage?'✓':i===stage?'●':'○'),label=el('span',STEPS[i]);
   li.className=i===stage?'current':i<stage?'complete':'future';
   markEl.setAttribute('aria-hidden','true');li.append(markEl,label);
   if(i===stage)li.setAttribute('aria-current','step');
   journey.append(li);
  }
  progress.textContent='Stage '+(stage+1)+' of 9 · '+STEPS[stage];meterFill.style.width=String(Math.round(stage/8*100))+'%';meter.setAttribute('aria-valuenow',String(Math.round(stage/8*100)));paintPrototypeProgress(stage);
  shell.dataset.v32Progress=String(stage/9);
  if(typeof CustomEvent==='function'&&typeof document.dispatchEvent==='function')
   document.dispatchEvent(new CustomEvent('gu-v33-stage-change',{detail:{step:stage,progress:stage/9}}));
 }
 function freeExplanation(){
  detail(body,'Explain This Concept — Always Free',[
   'What it means: '+(authorizedTeaching.what||subject?.definition||guide.concept),
   'Why and how it works: '+(authorizedTeaching.why||subject?.why||guide.procedure),
   'Relevant symbols or terminology: '+(subject?.symbols||'Identify the source, units, timeframe and referenced market conditions.'),
   'When to apply or recognize the idea: '+(authorizedTeaching.when||guide.procedure),
   'Where the observations come from: the authorized Lab setup ('+[lab?.ticker,lab?.date,lab?.timeframe].filter(Boolean).join(' · ')+'). This metadata does not by itself authenticate a historical chart.',
   'Instructional procedure: '+(ownHow.length?ownHow.join(' Then '):subject?.steps?.join(' Then ')||guide.procedure),
   'Common mistake: '+(subject?.error||guide.commonError),
   'Limits: '+(subject?.limit||guide.limit)
  ]);
 }
 function stepList(steps){const ol=el('ol');for(const s of steps)ol.append(el('li',s));body.append(ol)}
 function showVisual(step,variant='default'){
  // The illustrated source is always synthetic. Actual verified market
  // history comes only from the protected, separately reviewed visual feed.
  if(visualType==='none')return;
  const view=root.GroundUpLabV33Contextual?.create?.({type:visualType,stage:step,variant});
  if(view)body.append(view);
 }
 function guidedHelp(){
  detail(body,'Show a Guided Example — Free',special?special.steps:[
   'Identify the exact observation, timeframe and source before drawing a conclusion.',
   'Name the important price level or market fact and distinguish observation from inference.',
   'Describe what would disprove the hypothesis: '+guide.invalidation,
   'Use a different observation boundary and repeat the process without looking ahead.'
  ]);
  detail(body,'Try Another Example — Free',[
   'Choose a new observation or an independently configured fictional example.',
   'Identify two observable facts, one plausible alternative interpretation, and the invalidation condition.',
   'Explain whether the new evidence supports, weakens or leaves the original conclusion uncertain.',
   'This is ungraded instructional practice; it does not consume a Question Pass.'
  ]);
 }
 function mistakeHelp(){
  detail(body,'Explain My Mistake — Free',[
   'Common misconception: '+(subject?.error||guide.commonError),
   'Recheck the data, label and units instead of selecting an answer based on the final outcome.',
   'Correct procedure: '+(ownHow.length?ownHow.join(' Then '):guide.procedure),
   'Limitation: '+(subject?.limit||guide.limit),
   'Apply this correction to a new example rather than memorizing the answer.'
  ]);
 }
 function answerStatus(label,good){
  const p=el('p',label);p.className=good?'gu-v33-good':'gu-v33-review';body.append(p);
 }
 function render(){
  instructorInstance?.dispose?.();instructorInstance=null;
  body.replaceChildren();mark('');showJourney();
  const names={0:'Welcome to your learning workstation',1:'Learn — '+(kind==='candle'?'OHLC candlestick anatomy':kind==='vwap'?'Volume-Weighted Average Price':topic),
  2:'Experiment — '+(kind==='candle'?'Construct your own candlestick':kind==='vwap'?'Change volume yourself':'Investigate the evidence'),
  3:'Predict — Apply the relationship',4:'Practice — Learn, calculate, retry',5:'Assess — Demonstrate understanding independently',
  6:'Review — Learn from each result',7:'Transfer — '+(kind==='vwap'?'Controlled VWAP market replay':'Apply learning to a new case'),8:'Your Learning Development Report'};
  heading.textContent=names[stage];disclosure.hidden=stage===0;if(stage!==0)body.append(el('h3',STEPS[stage]));
  // The narration is independent of answer-checking or actual model
  // inference. Never mount a teaching/Tutor panel in concealed modes; the
  // early mode boundary above already diverts Blind and Assessment modes.
  // In the nine-stage guided journey, Assess and Predict also remain focused
  // on independent decisions, without an inline AI request path.
  if(![3,5].includes(stage)&&root.GroundUpLabV33Instructor?.create){
   const instructor=root.GroundUpLabV33Instructor.create({
    stage,subject:tutorTopic||'observable market evidence',concept:topic,
    requestTutor:tutorRequest,seen:narratedStages.has(stage)
   });
   if(instructor){instructorInstance=instructor;body.append(instructor.element);narratedStages.add(stage)}
  }
  previous.hidden=stage===0;next.textContent=stage===0?'Begin '+(kind==='candle'?'Candlestick':kind==='vwap'?'VWAP':'Learning')+' Lesson →':'Next learning stage';

  if(stage===0){
   appendParagraph(body,lab?.goal||('Understand '+topic+' before assessment.'));
   // The book Lab setup must be visible on arrival, not buried behind
   // collapsed supplementary panels. Never imply a verified chart exists.
   const setupFields=[['Ticker',lab?.ticker],['Historical date',lab?.date],['Start / Pause',lab?.start],['End',lab?.end],['Timeframe',lab?.timeframe]]
    .filter(([,value])=>typeof value==='string'&&value.trim());
   if(setupFields.length){
    const setup=el('section');setup.className='gu-v33-setup';
    setup.append(el('h3','Historical Lab Setup'));
    const facts=el('div');facts.className='lab-fact-grid';
    for(const [name,value] of setupFields){
     const fact=el('div');fact.append(el('span',name),el('strong',value));facts.append(fact);
    }
    setup.append(facts);
    const note=el('p','These fields describe the original Lab setup, not independently verified market history.');
    note.className='small';setup.append(note);body.append(setup);
   }
   const intro=el('section');intro.className='instruction';intro.append(el('h3','What you will learn'));
   appendParagraph(intro,'Every subject begins with an explanation before assessment. The shared platform provides charts, equations, a learning journey, feedback, retries, and evidence of independent understanding. Specialized content changes through a Lab configuration rather than separate hardcoded websites.');
   appendParagraph(intro,'Source of data: Lab-specific teaching is drawn from your authorized curriculum. Any illustrative calculation is fictional and ungraded. No market chart is represented as independently verified without approved source evidence.');
   body.append(intro);
   const wallet=el('section');wallet.className='wallet';wallet.append(el('h3','Question Pass Wallet'));
   const metrics=el('div');metrics.className='grid2';
   for(const [name,note] of [['Included','Subject to server entitlement'],['Purchased','Never expire after purchase']]){
    const unit=el('div');unit.className='metric';unit.append(el('span',name),el('strong','—'),el('span',note));metrics.append(unit);
   }
   wallet.append(metrics);
   appendParagraph(wallet,'Live credit balances are withheld until a protected member ledger confirms eligibility. Essential explanations, worked examples and learning retries remain free. No demo credits will be charged or treated as purchased credits.');
   body.append(wallet);
   const objective=el('p','Related official competencies: '+codes.map(x=>map.guides.get(x).title).join('; ')+'. Independent mastery remains Not Yet Assessed until reviewed evidence is recorded.');
   objective.className='small';body.append(objective);
  }else if(stage===1){
   appendParagraph(body,authorizedTeaching.what||subject?.definition||guide.concept);
   appendParagraph(body,authorizedTeaching.why||subject?.why||guide.procedure);
   if(authorizedTeaching.when)appendParagraph(body,'When it is relevant: '+authorizedTeaching.when);
   if(ownHow.length)stepList(ownHow);
   else if(subject){appendParagraph(body,'Define every component: '+subject.symbols);stepList(subject.steps)}
   else{
    stepList(['Define the key terms and the market evidence you can actually observe.',
     'Identify the source, date, session and timeframe for any historical claim.',
     'Explain the conditions and procedure: '+guide.procedure,
     'Find a competing interpretation or invalidating observation: '+guide.invalidation,
     'State the limitation: '+guide.limit]);
   }
   showVisual(1);freeExplanation();guidedHelp();
   detail(body,'Teach This in More Depth — Always Free',[
    'Understand the objective: '+guide.concept,
    'Recognize the evidence: '+guide.procedure,
    'What can make this reading invalid: '+guide.invalidation,
    'Why learners commonly struggle: '+guide.commonError,
    'Try explaining these relationships in your own words and checking an unfamiliar example.'
   ]);
  }else if(stage===2){
   if(kind==='candle'){
    appendParagraph(body,'Change only the closing price in this fictional example. Open $31.00, High $32.50, Low $30.50. Observe how the body, direction and body percentage change.');
   }else if(kind==='vwap'){
    appendParagraph(body,'Change the number of fictional shares traded at $10. The other group has 200 shares at $8. The relative volumes determine how much each price influences the average.');
   }else{
    appendParagraph(body,'Describe permitted price, volume, levels, and timeframe for the actual book task. Do not fill gaps with invented historical bars.');
   }
   if(special){
    const label=el('label',kind==='candle'?'Closing price (USD)':'Shares at $10');
    const range=el('input');range.type='range';range.min=kind==='candle'?'30.5':'50';range.max=kind==='candle'?'32.5':'500';range.step=kind==='candle'?'0.05':'50';range.value=String(experimentValue);
    label.append(range);body.append(label);const visual=root.GroundUpLabV33Visual?.create(kind,experimentValue);if(visual)body.append(visual.wrap);const output=el('output');output.className='gu-v32-output';body.append(output);
    const paint=()=>{
     experimentValue=Number(range.value);
     if(kind==='candle'){
      const bodySize=Math.abs(experimentValue-31),percentage=100*bodySize/2;
      output.textContent='Open $31.00 · Close $'+experimentValue.toFixed(2)+' · Real body $'+bodySize.toFixed(2)+' · Full range $2.00 · Body '+percentage.toFixed(1)+'% · '+(experimentValue<31?'Bearish':experimentValue>31?'Bullish':'Doji (equal open/close)');
     }else{
      const dollars=1600+10*experimentValue,shares=200+experimentValue;
      output.textContent='Traded dollars $'+dollars.toFixed(2)+' ÷ '+shares+' shares = VWAP $'+(dollars/shares).toFixed(2);
     }
    if(visual)visual.update(experimentValue);
   };range.addEventListener('input',paint);paint();
    appendParagraph(body,'This is hypothetical experimentation, not actual historical market evidence.');
   }
   if(!special)showVisual(2);
   else if(kind==='vwap')showVisual(2);
   const input=field(body,'Record what changed and why (optional)',observations);
   body.append(button('Record my observation',()=>{observations=input.value.trim();mark(observations?'Observation retained within this page.':'Add an observation if helpful.')}));freeExplanation();
  }else if(stage===3){
   showVisual(3);
   appendParagraph(body,'Predict or describe the next relevant observation before seeing any subsequent market evidence. State what would invalidate your interpretation.');
   const t=field(body,'Your prediction, evidence, and invalidation',prediction);
   t.disabled=predictionLocked;
   if(predictionLocked)answerStatus('Prediction locked for this local attempt. It cannot be changed in this step.',true);
   else body.append(button('Lock my prediction',()=>{
    if(t.value.trim().length<15){mark('Explain your reasoning in at least 15 characters.');return}
    prediction=t.value.trim();predictionLocked=true;render();mark('Prediction locked; future data remains unavailable.');
   }));
   if(mode==='guided'||mode==='practice')freeExplanation();
  }else if(stage===4){
   showVisual(4,special?'practice':'default');
   appendParagraph(body,special?special.description:(ownQuestions[0]||guide.selfCheck));
   if(special){
    const input=field(body,'My calculation ('+special.units+')',practice,'input');
    input.disabled=practiceResolved;
    if(practiceCount>=2&&!practiceResolved){
     appendParagraph(body,'Numerical practice was incorrect twice. An optional multiple-choice scaffold is available; you can still retry numerically for free.');
     const pick=el('select');pick.append(el('option','Choose a result…'));
     pick.options[0].value='';
     const options=kind==='candle'?[25,50,75,100]:[9,8.67,10,8];
     for(const x of options){const op=el('option',String(x));op.value=String(x);pick.append(op)}
     body.append(pick,button('Check my assisted choice',()=>{
      if(validNumber(pick.value,special.answer)){practiceResolved=true;practiceAssisted=true;practice=pick.value;render()}
      else{practiceCount++;mark(mathDiagnostic(kind,pick.value))}
     }));
    }
    if(!practiceResolved){
     body.append(button('Check calculation — free retry',()=>{
      if(!input.value.trim()){mark('Enter a numerical answer.');return}
      practice=input.value.trim();
      if(validNumber(practice,special.answer)){practiceResolved=true;render()}
      else{practiceCount++;render();mark(mathDiagnostic(kind,practice))}
     }));
     if(practiceCount>0){answerStatus('Incorrect attempts: '+practiceCount+'. '+mathDiagnostic(kind,practice),false);mistakeHelp()}
    }else{
     answerStatus('Calculation completed · '+(practiceAssisted||practiceCount>0?'Assisted or corrected learning':'Unassisted practice')+'. This is not a private graded assessment.',true);
     stepList(special.steps);
    }
    const guided=detail(body,'Teach This in More Depth — Always Free',special.steps.concat(['Frequent misconception: '+(subject?.error||guide.commonError),'The answer describes the fictional example; it does not predict the next bar.']));
    guided.addEventListener('toggle',()=>{if(guided.open)practiceAssisted=true});
   }else{
    const t=field(body,'Your independent observation and reasoning',practice);
    t.disabled=practiceResolved;
    if(!practiceResolved)body.append(button('Record ungraded practice',()=>{
     practice=t.value.trim();if(practice.length<20){mark('Explain your reasoning in at least 20 characters.');return}
     practiceResolved=true;render();
    }));
    else answerStatus('Practice recorded for self-study. Reviewed grading is separate.',true);
    freeExplanation();guidedHelp();mistakeHelp();
   }
  }else if(stage===5){
   appendParagraph(body,'Official assessment uses only the existing authenticated, server-graded question bank after editorial acceptance. Answer keys are never embedded in this study aid.');
   appendParagraph(body,'An unreviewed Lab or missing rubric must remain Not Yet Assessed, regardless of study-step completion.');
   body.append(button('Open protected decision and assessment',()=>{const work=document.getElementById('gu-ws-member-workbench');if(work)work.open=true;document.getElementById(focusId||'ev-decision')?.focus();}));
  }else if(stage===6){
   showVisual(6);
   appendParagraph(body,'Your learning review should explain what the result means, its limitations and at least one common wrong interpretation.');
   appendParagraph(body,'Concept: '+(authorizedTeaching.what||guide.concept));
   appendParagraph(body,'Reasoning: '+(authorizedTeaching.why||subject?.why||guide.procedure));
   appendParagraph(body,'What could invalidate it: '+guide.invalidation);
   appendParagraph(body,'Common mistake: '+guide.commonError);
   appendParagraph(body,'Limitations: '+(subject?.limit||guide.limit));
   if(special)stepList(special.steps);
   mistakeHelp();
   const f=field(body,'Reflect: what did you misunderstand or learn?',reflection);
   if(!selfReview)body.append(button('Record review and continue',()=>{
    reflection=f.value.trim();if(reflection.length<15){mark('Write at least 15 characters to explain what you learned.');return}
    selfReview=true;render();
   }));else answerStatus('Review recorded locally. It is not a competency grade.',true);
  }else if(stage===7){
   // A controlled replay owns its own chronological chart; avoid an
   // unrelated weighted-groups illustration above the replay question.
   if(!(kind==='vwap'&&root.GroundUpLabV32SyntheticReplay?.create))showVisual(7,special?'transfer':'default');
   appendParagraph(body,'Apply the concept to an unfamiliar case. A study solution here never awards mastery or replaces the existing private assessment.');
   if(kind==='vwap'){
    appendParagraph(body,'For chronological candles, use the authenticated, rights-reviewed replay service. This page does not preload future bars or turn synthetic samples into historical evidence.');
    const link=el('a','Open controlled market replay');link.href='verified-replay.html';link.className='btn secondary';body.append(link);
   }
   if(kind==='vwap'&&root.GroundUpLabV32SyntheticReplay?.create){
    const replay=el('section');body.append(replay);
    root.GroundUpLabV32SyntheticReplay.create(replay,{onFinish:({studyOnly,observations})=>{
     transferResolved=true;transfer='Fictional Study Only VWAP replay: '+observations+' completed observations';stage=8;render();
    }});
   }else if(special){
    appendParagraph(body,special.transfer.prompt);
    const f=field(body,'Answer ('+special.units+')',transfer,'input');f.disabled=transferResolved;
    if(!transferResolved)body.append(button('Check new case — free retry',()=>{
     if(!f.value.trim()){mark('Enter a value.');return}transfer=f.value.trim();
     if(validNumber(transfer,special.transfer.answer)){transferResolved=true;render()}
     else{transferCount++;render();mark('Try again with the same method. '+mathDiagnostic(kind,transfer))}
    }));
    else answerStatus('Independent transfer completed in this ungraded example after '+(transferCount+1)+' attempt(s).',true);
    if(transferCount>0&&!transferResolved)appendParagraph(body,'Previous incorrect attempts: '+transferCount);
    detail(body,'Explain Transfer Concept — Always Free',[subject?.why||guide.procedure,'Use genuinely different prices or evidence so memorizing the previous answer is insufficient.']);
   }else{
    appendParagraph(body,'New case: '+guide.selfCheck);
    const f=field(body,'New evidence, contrasting interpretation and decision',transfer);
    f.disabled=transferResolved;
    if(!transferResolved)body.append(button('Record independent transfer reflection',()=>{
     transfer=f.value.trim();if(transfer.length<25){mark('Include at least 25 characters of evidence and reasoning.');return}
     transferResolved=true;render();
    }));else answerStatus('New-case reflection completed locally, not graded.',true);
    freeExplanation();
   }
  }else{
   const summary=[
    ['Lab',labId],['Official competencies',codes.join(', ')],['Prediction',predictionLocked?'Locked locally':'Not completed'],
    ['Practice',practiceResolved?practiceAssisted?'Completed with scaffold':practiceCount?'Corrected after retry':'Completed':'Not completed'],
    ['Practice errors',practiceCount],['Review',selfReview?'Completed':'Not completed'],
    ['Transfer',transferResolved?'Completed':'Not completed'],['Transfer retries',transferCount],
    ['Independent competency mastery','Not Yet Assessed by this ungraded teaching journey']
   ];
   const dl=el('dl');for(const [k,v] of summary){dl.append(el('dt',k),el('dd',v))}body.append(dl);
   appendParagraph(body,'Resume or save official member progress through the existing authenticated Lab controls; this self-study widget does not write server grades or credit entitlements.');
   body.append(button('Review related competency guide',()=>{location.href='skills.html#guide-'+encodeURIComponent(codes[0]||'')})); 
  }
  previous.disabled=stage===0;next.disabled=stage===8;
 }
 function nextStage(){
  if(stage===3&&!predictionLocked){mark('Lock your prediction before continuing.');return}
  if(stage===4&&!practiceResolved){mark('Complete the guided practice or record your self-study response before continuing.');return}
  if(stage===6&&!selfReview){mark('Complete the reflection before continuing.');return}
  if(stage===7&&!transferResolved){mark('Complete the unfamiliar case before opening results.');return}
  if(stage<8){stage++;render()}
 }
 render();return true;
}
root.GroundUpLabEngineV32Universal=Object.freeze({
 mount,version:'3.3.0',canonicalTarget:419,steps:STEPS,mathDiagnostic,validNumber
});
})(globalThis);
