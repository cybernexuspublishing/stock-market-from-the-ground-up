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
 const bar=lookup('player-stage-progress');if(bar){bar.setAttribute('aria-valuenow',String(value));bar.setAttribute('aria-valuetext',STEPS[index]+' · stage '+(index+1)+' of 9');}
}

const sessions=new WeakMap();
let cache=null;
async function catalog(){
 if(!cache)cache=Promise.all([
  fetch('/data/competency-lab-paths-v01499.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('Curriculum map unavailable');return r.json()}),
  fetch('/data/competency-study-guides-v01499.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('Study guide unavailable');return r.json()}),
  fetch('/data/labs.json',{cache:'force-cache'}).then(r=>r.ok?r.json():[]).catch(()=>[])
 ]).then(([paths,study,authored])=>{
  const guides=study.guides||[];
  if(paths.totalCanonicalLabs!==419||Object.keys(paths.byLab||{}).length!==419||guides.length!==30||
   new Set(guides.map(x=>x.code)).size!==30)throw Error('Curriculum or competency register mismatch');
  const knownTopics=new Map((Array.isArray(authored)?authored:[]).filter(x=>x&&typeof x.id==='string'&&typeof x.concept==='string').map(x=>[x.id,x.concept]));
  return {byLab:paths.byLab,guides:new Map(guides.map(x=>[x.code,x])),knownTopics};
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
async function mount({labId,mode,target,lab,focusId,tutorTopic,tutorRequest,memberFirstName='',allowTutorAI=true}={}){
 if(!target||typeof target.replaceChildren!=='function')return false;
 const previousSession=sessions.get(target);
 previousSession?.dispose?.();
 const token={labId,mode,dispose:()=>{}};sessions.set(target,token);
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
 // Some unreviewed curriculum paths use the Lab ID as a placeholder title.
 // IDs remain valid cross-references but must not become lesson narration.
 const meaningfulTitle=value=>{
  const candidate=typeof value==='string'?value.trim():'';
  return candidate&&candidate!==labId&&!/^(?:F[1-3]|DT|TAPE|SITE)-C\d+-L\d+$/i.test(candidate)&&
   !/^(?:concept title pending|untitled|unknown|lab id only)/i.test(candidate)?candidate:'';
 };
 const authorTopic=meaningfulTitle(map.knownTopics.get(labId));
 const rawTopic=meaningfulTitle(lab?.concept)||authorTopic||meaningfulTitle(item.title)||
  (meaningfulTitle(guide.title)?'Competency study — '+meaningfulTitle(guide.title):'')||
  meaningfulTitle(lab?.chapterTitle)||'Market evidence and decision-making';
 const topic=/construct (?:an? )?(?:up\s*\/\s*)?bullish candle/i.test(rawTopic)?'Bullish Candle'
  :/construct (?:an? )?(?:down\s*\/\s*)?bearish candle/i.test(rawTopic)?'Bearish Candle'
  :rawTopic;
 const topicSource=meaningfulTitle(lab?.concept)||authorTopic||meaningfulTitle(item.title)?'authored':'competency';

 const visualType=root.GroundUpLabV33Contextual?.select?.({lab,topic,competencies:codes})||'none';
 const authorizedTeaching=lab?.teaching&&typeof lab.teaching==='object'?lab.teaching:{};
 const ownHow=Array.isArray(authorizedTeaching.how)?authorizedTeaching.how.filter(s=>typeof s==='string'&&s.trim()).slice(0,20):[];
 const ownQuestions=Array.isArray(authorizedTeaching.questions)?authorizedTeaching.questions.filter(s=>typeof s==='string'&&s.trim()).slice(0,5):[];
 const shell=el('section');shell.className='card gu-v32 gu-v33';
 shell.setAttribute('aria-label','Advanced learning journey');
 const heading=el('h2','Learning Journey — '+topic);
 const disclosure=el('details');disclosure.className='gu-v33-source-note';
 disclosure.append(el('summary','About lesson data and assessment integrity'),
  el('p','Examples may use clearly labeled fictional market data. Historical evidence requires an approved source. Independent assessments and account progress are handled by the authorized member services.'));
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
 token.dispose=()=>{instructorInstance?.dispose?.();instructorInstance=null};
 const narratedStages=new Set();
 const learnerReplies=new Map(); // stage => accepted answers in question order
 function instructorQuestions(current){
  const reference=String(topic).slice(0,100);
  if(current===0)return [
   'In your own words, what is '+reference+' and why is it useful to a trader?',
   'Which information must be observable before you can apply this concept without guessing?'
  ];
  if(current===1)return [
   ownQuestions[0]||'Identify the completed candle, price, volume or market relationship that demonstrates '+reference+'. What specifically supports it?',
   'What evidence could contradict this interpretation, and why would it matter?'
  ];
  if(current===2)return [
   'After using the example controls, what changed in the observed price, volume or calculation?',
   'Why did that input change the conclusion, and which information remains unavailable?'
  ];
  if(current===4){
   const reference=root.GroundUpLabV34InteractiveLessons?.practiceFor?.(kind)||[];
   if(reference.length===3)return reference.map(step=>
    'Enter the numerical result for '+step.id+'. '+step.prompt);
   return [
    'Before solving the current practice case, explain the observations, method and units you will use.',
    special?'Enter the numerical result for this practice case ('+special.units+'). '+special.description:
     'State your practice conclusion and explain the visible evidence that supports it.'
   ];
  }
  if(current===6)return [
   'What was the most important mistake or limitation you identified in your earlier reasoning?',
   'Explain how you corrected the reasoning and how you would recognize that mistake in another case.'
  ];
  if(current===7)return [
   'Identify what is different in the new case and which evidence you can use without seeing future results.',
   kind==='vwap'&&root.GroundUpLabV32SyntheticReplay?.create
    ?'What did you observe in the completed replay? Finish the controlled replay before moving to Results.'
    :special?'Enter the numerical result for this new case ('+special.units+'). '+special.transfer.prompt:
     'Provide your new-case conclusion, a contrasting explanation and what would invalidate the conclusion.'
  ];
  return ['What is one practical lesson you can transfer to your next independent exercise, and what remains uncertain?'];
 }
 function receiveInstructorAnswer({stage:answerStage,index,answer,isFinal}){
  if(answerStage!==stage||![0,1,2,4,6,7,8].includes(stage))return{accepted:false,message:'This question belongs to an earlier lesson stage.'};
  const list=learnerReplies.get(stage)||[];
  if(index>list.length)return{accepted:false,message:'Please answer the questions in sequence.'};
  if(stage===4){
   const reference=root.GroundUpLabV34InteractiveLessons?.practiceFor?.(kind)||[];
   const question=reference[index];
   if(question){
    if(!validNumber(answer,question.answer)){
     practiceCount++;practiceAssisted=true;
     return{accepted:false,message:'Let’s correct '+question.id+'. '+question.help+
      ' New guided example: '+question.newExample+' Retry the original question.'};
    }
    if(isFinal){practice=answer;practiceResolved=true}
   }else if(isFinal){
    if(special){
     practice=answer;
     if(!validNumber(practice,special.answer)){
      practiceCount++;
      return{accepted:false,message:'Review the calculation and try again. '+mathDiagnostic(kind,practice)};
     }
     practiceResolved=true;
    }else{practice=answer;practiceResolved=true}
   }
  }
  if(stage===6&&isFinal){reflection=answer;selfReview=true}
  if(stage===7&&isFinal){
   if(kind==='vwap'&&root.GroundUpLabV32SyntheticReplay?.create&&!transferResolved)
    return{accepted:false,message:'Complete the chronological replay before proceeding. A written explanation alone cannot replace the protected replay sequence.'};
   if(special){
    transfer=answer;
    if(!validNumber(transfer,special.transfer.answer)){
     transferCount++;
     return{accepted:false,message:'Recheck your new-case calculation. '+mathDiagnostic(kind,transfer)};
    }
    transferResolved=true;
   }else{transfer=answer;transferResolved=true}
  }
  list[index]=answer;
  learnerReplies.set(stage,list);
  return{accepted:true};
 }
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
  detail(body,'Explain This Concept',[
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
  // The illustrated source is always fictional. The competency-based
  // worked-case viewer covers the Labs without an appropriate OHLC chart.
  // No future private bars, graded questions or unverified history is shown.
  const specific=visualType==='none'?null:
   root.GroundUpLabV33Contextual?.create?.({type:visualType,stage:step,variant});
  const view=specific||root.GroundUpLabV34CompetencyExamples?.create?.({
   code:guide.code,title:topic,stage:step
  });
  if(view)body.append(view);
 }
 function lessonPlan(section=1){
  return root.GroundUpLabV33InstructionContent?.lesson?.({
   stage:section,visualType,concept:topic,teaching:authorizedTeaching,subject,guide
  })||null;
 }
 function guidedHelp(){
  const plan=lessonPlan(1),application=lessonPlan(7);
  detail(body,'Show a Guided Example',plan?.worked?.length?[
   ...plan.worked,
   'Why the worked result is not a prediction: '+plan.limitation
  ]:special?special.steps:[
   'Start with the concept: '+guide.concept,
   'Apply the procedure: '+guide.procedure,
   'Test the interpretation against: '+guide.invalidation,
   'Observe the limitation: '+guide.limit
  ]);
  detail(body,'Try Another Example',[
   application?.blocks?.[0]||guide.procedure,
   application?.blocks?.[1]||guide.invalidation,
   'Use a fresh, fully observed example. Record both the evidence and what you cannot determine.',
   'This is ungraded instructional practice and does not consume a Question Pass.'
  ]);
 }
 function mistakeHelp(){
  const plan=lessonPlan(6);
  detail(body,'Explain My Mistake',[
   'Why this approach is incorrect: '+(plan?.misconception||subject?.error||guide.commonError),
   'What the method can establish: '+(plan?.blocks?.[0]||guide.procedure),
   'Correct method: '+(ownHow.length?ownHow.join(' Then '):subject?.steps?.join(' Then ')||guide.procedure),
   'What remains unknown: '+(plan?.limitation||guide.limit),
   'Work through a different example rather than memorizing an answer.'
  ]);
 }
 function answerStatus(label,good){
  const p=el('p',label);p.className=good?'gu-v33-good':'gu-v33-review';body.append(p);
 }
 function render(){
  shell.querySelector?.(':scope > .gu-v33-setup')?.remove?.();
  instructorInstance?.dispose?.();instructorInstance=null;
  body.replaceChildren();mark('');showJourney();
  const names={0:'',1:'Learn — '+(kind==='candle'?'OHLC candlestick anatomy':kind==='vwap'?'Volume-Weighted Average Price':topic),
  2:'Experiment — '+(kind==='candle'?'Construct your own candlestick':kind==='vwap'?'Change volume yourself':'Investigate the evidence'),
  3:'Predict — Apply the relationship',4:'Practice — Learn, calculate, retry',5:'Assess — Demonstrate understanding independently',
  6:'Review — Learn from each result',7:'Transfer — '+(kind==='vwap'?'Controlled VWAP market replay':'Apply learning to a new case'),8:'Your Learning Development Report'};
  heading.textContent=names[stage];heading.hidden=stage===0;disclosure.hidden=stage===0;if(stage!==0)body.append(el('h3',STEPS[stage]));
  // The narration is independent of answer-checking or actual model
  // inference. Never mount a teaching/Tutor panel in concealed modes; the
  // early mode boundary above already diverts Blind and Assessment modes.
  // In the nine-stage guided journey, Assess and Predict also remain focused
  // on independent decisions, without an inline AI request path.
  if(![3,5].includes(stage)&&root.GroundUpLabV33Instructor?.create){
   const instructor=root.GroundUpLabV33Instructor.create({
    stage,subject:topic,concept:topic,
    lessonContext:{visualType,guide,subject,teaching:authorizedTeaching,topicSource},
    memberFirstName,allowTutorAI,requestTutor:tutorRequest,seen:narratedStages.has(stage),
    questions:instructorQuestions(stage),initialAnswers:learnerReplies.get(stage)||[],
    onAnswer:receiveInstructorAnswer,
    onComplete:()=>{if(stage<8)nextStage(true)},
    onUnderstandingPassed:()=>{if(stage===1)nextStage(true)}
   });
   if(instructor){instructorInstance=instructor;body.append(instructor.element);narratedStages.add(stage)}
  }
  previous.hidden=stage===0;
  next.textContent=stage===0?'Start Guided Learning →':'Next learning stage';
  next.className=stage===0?'btn gu-v33-start-primary':'btn secondary';
  nav.querySelector?.('.gu-v33-start-tutor')?.remove?.();
  if(stage===0&&instructorInstance?.openTutor){
   const tutorAction=button('Ask Market Tutor',()=>instructorInstance?.openTutor?.());
   tutorAction.className='btn secondary gu-v33-start-tutor';
   nav.append(tutorAction);
  }

  if(stage===0){
   // Talia's accessible type-on-screen introduction owns the outcomes,
   // first explanation and the one-to-one learning invitation. Do not
   // duplicate generic "Recognize and explain: Explain X" bullets here.
   // The book Lab setup must be visible on arrival, not buried behind
   // collapsed supplementary panels. Never imply a verified chart exists.
   const setupTimeframe=String(lab?.timeframe||'').trim()||(
    String(lab?.setup||'').match(/\b(1|2|3|5|10|15|30|60)[ -]minute\b/i)?.[1]||''
   ).replace(/^(\d+)$/,'$1-minute');
   const setupFields=[['Ticker',lab?.ticker],['Historical date',lab?.date],['Start / Pause',lab?.start],['End',lab?.end],['Timeframe',setupTimeframe]]
    .filter(([,value])=>typeof value==='string'&&value.trim());
   if(setupFields.length){
    const setup=el('section');setup.className='gu-v33-setup';
    setup.append(el('h3','Historical Lab Setup'));
    const facts=el('dl');facts.className='gu-v33-setup-fields';
    for(const [name,value] of setupFields){
     const fact=el('div');fact.className='gu-v33-setup-field';
     const term=el('dt',name+':');const description=el('dd',value);
     fact.append(term,description);facts.append(fact);
    }
    setup.append(facts);
    const note=el('p','Exercise setup from the Lab registry. Historical candle prices must be validated against an approved intraday data source.');
    note.className='gu-v33-setup-note';setup.append(note);body.append(setup);
   }
   // Learning objectives are now delivered directly by Talia in the
   // typed instructor panel. No second competing 'What you will learn' card.
   const wallet=el('section');wallet.className='wallet';wallet.append(el('h3','Question Pass Wallet'));
   const metrics=el('div');metrics.className='grid2';
   for(const [name,note] of [['Included','Subject to server entitlement'],['Purchased','Never expire after purchase']]){
    const unit=el('div');unit.className='metric';unit.append(el('span',name),el('strong','—'),el('span',note));metrics.append(unit);
   }
   wallet.append(metrics);
   appendParagraph(wallet,'Live credit balances are withheld until a protected member ledger confirms eligibility. Essential explanations, worked examples and learning retries remain included in accessible Labs. No demo credits will be charged or treated as purchased credits.');
   if(instructorInstance?.setWalletContent)instructorInstance.setWalletContent(wallet);
   else{const walletDisclosure=el('details');walletDisclosure.className='gu-v33-wallet-disclosure';walletDisclosure.append(el('summary','Question Pass Wallet'),wallet);body.append(walletDisclosure);}

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
   showVisual(1,visualType==='candle'?'worked':'default');freeExplanation();guidedHelp();
   const deeper=lessonPlan(1);
   detail(body,'Teach This in More Depth',[
    ...(deeper?.blocks||[guide.concept,guide.procedure]),
    ...(deeper?.worked||[]),
    'Common error and its correction: '+(deeper?.misconception||guide.commonError),
    'Limit of the interpretation: '+(deeper?.limitation||guide.limit)
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
     appendParagraph(body,'Numerical practice was incorrect twice. An optional multiple-choice scaffold is available; you can still retry numerically.');
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
     body.append(button('Check calculation',()=>{
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
    const guided=detail(body,'Teach This in More Depth',special.steps.concat(['Frequent misconception: '+(subject?.error||guide.commonError),'The answer describes the fictional example; it does not predict the next bar.']));
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
   // Original research cases add optional real-world reasoning without
   // replacing the relevant Lab's own assessed question or competency.
   const workshop=root.GroundUpLabV33DecisionWorkshop?.create?.({topic,labId});
   if(workshop)body.append(workshop);
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
    detail(body,'Explain Transfer Concept',[subject?.why||guide.procedure,'Use genuinely different prices or evidence so memorizing the previous answer is insufficient.']);
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
   const skillBox=el('section');skillBox.className='gu-v33-skill-summary';
   skillBox.append(el('h3','Member Skill Development'));
   const dimensions=el('div');dimensions.className='gu-v33-skill-grid';
   for(const [key,label] of [['knowledge','Knowledge'],['recognition','Recognition'],
      ['decision','Decision-making'],['process','Process']]){
    const metric=el('div');metric.className='gu-v33-skill-metric';
    metric.append(el('strong',label),el('span','Not Yet Assessed'));
    metric.setAttribute('data-skill-dimension',key);
    dimensions.append(metric);
   }
   skillBox.append(dimensions);
   appendParagraph(skillBox,'These four dimensions use the existing 30-competency framework. This ungraded lesson does not invent mastery percentages. Reviewed assessments and your authorized Skill Development profile provide the official evidence.');
   skillBox.append(button('View Skill Development',()=>{location.href='skills.html'}));
   body.append(skillBox);
   const recorded=el('section');recorded.className='gu-v33-grade-outlet';
   recorded.setAttribute('aria-label','Your graded assessment history');
   body.append(recorded);
   root.GroundUpLabV33GradeDisplay?.mount?.({labId,target:recorded});
   appendParagraph(body,'Resume or save official member progress through the existing authenticated Lab controls; this self-study widget does not write server grades or credit entitlements.');
   body.append(button('Review related competency guide',()=>{location.href='skills.html#guide-'+encodeURIComponent(codes[0]||'')})); 
  }
  // Setups appear BEFORE the Start title, not buried below the instructor.
  if(stage===0){
   const setup=body.querySelector?.('.gu-v33-setup');
   if(setup)shell.insertBefore(setup,heading);
  }
  // The approved reference keeps worked demonstrations INSIDE the
  // illustration. The four explanation actions now trigger Talia's voice,
  // rather than opening four disconnected text windows.
  let stageOneGuides=[];
  if(stage===1){
   const names=new Set(['Explain This Concept','Show a Guided Example','Try Another Example','Teach This in More Depth']);
   stageOneGuides=Array.from(body.querySelectorAll('details'))
    .filter(node=>names.has(node.querySelector('summary')?.textContent.trim()))
    .map(node=>({
      name:node.querySelector('summary').textContent.trim(),
      paragraphs:Array.from(node.querySelectorAll('p,li')).map(p=>p.textContent.trim()).filter(Boolean),
      node
    }));
   for(const guideAction of stageOneGuides)guideAction.node.remove();
   if(stageOneGuides.length){
    const tabs=el('div');tabs.className='gu-v33-help-tablist gu-v35-teaching-actions';
    tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Ask Talia to teach');
    for(const action of stageOneGuides){
     const control=button(action.name,()=>{
      for(const other of tabs.querySelectorAll('button'))other.setAttribute('aria-pressed',String(other===control));
      instructorInstance?.teachSupplement?.(action.name,action.paragraphs);
     });
     control.setAttribute('aria-pressed','false');tabs.append(control);
    }
    body.append(tabs);
   }
  }
  if(stage===0){
   const support=body.querySelector?.('.gu-v33-support-tabs');
   if(support)shell.insertBefore(support,nav.nextSibling);
  }
  // One owner-approved reference experience: chart title and controls,
  // Talia's typing-game instruction, the responsive chart/measurements,
  // and the learner's practice are a SINGLE unified teaching surface.
  // Predict and Assess stay independently protected.
  if([1,2,4,6].includes(stage)){
   const chart=body.querySelector('.gu-l33-graphic, .gu-v33-exact-visual');
   const coach=body.querySelector('.gu-v33-instructor');
   if(chart&&coach){
    const hero=el('section');hero.className='gu-v33-stage-hero gu-v34-unified-lesson';
    hero.setAttribute('aria-label','Interactive demonstration followed by Talia');
    // Preserve the v3.2 visual sequence: topic/feature controls, illustrated
    // chart with measured values, THEN Talia teaching and the typed answer.
    // They share one workstation rather than two competing side panels.
    hero.append(chart,coach);body.insertBefore(hero,body.firstChild);
    if(stage===1){
     const worked=lessonPlan(1)?.worked||[];
     if(worked.length){
      const work=el('section');work.className='gu-v35-chart-worked';
      work.setAttribute('aria-label','Interactive worked example on the chart');
      const label=el('h4','Worked example — follow the candle');work.append(label);
      const counter=el('p');counter.className='gu-v35-worked-counter';
      const script=el('p');script.className='gu-v35-worked-script';
      const actions=el('div');actions.className='gu-v35-worked-controls';
      let current=0;
      const prevWork=button('Previous worked step',()=>select(current-1));
      const nextWork=button('Next worked step',()=>select(current+1));
      const showWork=button('Show and explain on chart',()=>select(current,true));
      const stepFor=index=>{
       // The first three source-derived steps use a DIFFERENT $20 candle.
       // The approved additional example uses the $31 reference candle.
       // The final independent illustration is a $12.40 bearish candle.
       const values=index<3?{o:20,hv:22,l:19,c:21.2}
        :index===worked.length-1?{o:12.4,hv:12.7,l:11.9,c:12.1}
        :{o:31,hv:32.5,l:30.5,c:32};
       const focus=index===1?'body':index===2||index===4?'percent'
        :index===5?'high':'all';
       return{values,focus};
      };
      function select(index,narrate=true){
       if(index<0||index>=worked.length)return;
       current=index;
       counter.textContent='Step '+(index+1)+' of '+worked.length+' · Fictional case';
       script.textContent=worked[index];
       const currentCase=stepFor(index);
       if(chart.setTeachingCandle?.(currentCase.values)){
        if(typeof CustomEvent==='function')chart.dispatchEvent(new CustomEvent('gu-v35-highlight',{
         detail:{feature:currentCase.focus}
        }));
       }
       prevWork.disabled=index===0;nextWork.disabled=index===worked.length-1;
       if(narrate)instructorInstance?.teachWorkedStep?.({
        index,total:worked.length,text:worked[index],feature:currentCase.focus
       });
      }
      actions.append(prevWork,showWork,nextWork);
      work.append(counter,script,actions);
      chart.append(work);
      select(0,false);
     }
    }
    const visualHeader=chart.querySelector('.gu-l33-head');
    if(visualHeader){
     const zoom=button('Expand visual',()=>{
      const expanded=chart.classList.toggle('gu-v34-expanded-visual');
      zoom.textContent=expanded?'Compact visual':'Expand visual';
      zoom.setAttribute('aria-pressed',String(expanded));
      zoom.setAttribute('aria-label',expanded?'Return to compact chart':'Expand chart and price labels');
     });
     zoom.className='gu-v34-view-size';
     zoom.setAttribute('aria-pressed','false');
     zoom.setAttribute('aria-label','Expand chart and price labels');
     visualHeader.append(zoom);
    }
    hero.addEventListener('gu-v34-visual-focus',event=>{
     if(!chart.contains(event.target))return;
     instructorInstance?.teachFeature?.(event.detail||{});
    });
    hero.addEventListener('gu-v34-focus-answered',event=>{
     if(!coach.contains(event.target))return;
     const feature=String(event.detail?.feature||'');
     const focusButtons=Array.from(chart.querySelectorAll(
      '.gu-l33-interactive-tools [data-teaching-feature], .gu-l33-interactive-tools [data-view]'));
     const index=focusButtons.findIndex(control=>
      (control.dataset.teachingFeature||control.dataset.view)===feature);
     if(index>=0&&index<focusButtons.length-1)focusButtons[index+1].click();
    });
    // Start actual teaching immediately after the Learn/Experiment chart is
    // shown: selecting the first focus synchronizes the illustration and
    // instructor. Never do this for independent Predict/Assess.
    if(stage===1){
     const first=chart.querySelector('.gu-l33-interactive-tools [data-teaching-feature], .gu-l33-interactive-tools [data-view]');
     first?.click();
    }
   }else if(chart)body.insertBefore(chart,body.firstChild);
  }else if(stage===3){
   const chart=body.querySelector('.gu-l33-graphic');
   if(chart)body.insertBefore(chart,body.firstChild);
  }
  if(stage===1){
   // Keep optional tutor teaching controls directly below the visual/Talia
   // pair without restoring the old static answer panels.
   const actions=body.querySelector('.gu-v35-teaching-actions');
   if(actions){
    const hero=body.querySelector('.gu-v34-unified-lesson');
    if(hero)body.insertBefore(actions,hero.nextSibling);
   }
  }
  // Coach the member through one protected evidence field at a time. This
  // shortcut never grades or submits anything and preserves the form's IDs.
  if([2,3,4,6,7,8].includes(stage)){
   const prompt=button('Record your observation',()=>{
    document.dispatchEvent?.(new CustomEvent('gu-v33-open-evidence',
     {detail:{stage}}));
   });
   prompt.className='btn secondary gu-v33-evidence-shortcut';
   body.append(prompt);
  }
  previous.disabled=stage===0;next.disabled=stage===8;
 }
 function nextStage(fromInstructor=false){
  if(stage===3&&!predictionLocked){mark('Lock your prediction before continuing.');return}
  if(stage===4&&!practiceResolved){mark('Complete the guided practice or record your self-study response before continuing.');return}
  if(stage===6&&!selfReview){mark('Complete the reflection before continuing.');return}
  if(stage===7&&!transferResolved){mark('Complete the unfamiliar case before opening results.');return}
  if(stage<8){
   stage++;render();
   // Keep the incoming teaching stage visible following a submitted answer.
   // Independent Predict/Assess use their existing protected controls.
   if(fromInstructor){
    const nextView=instructorInstance?.element||body.querySelector?.('h3');
    nextView?.scrollIntoView?.({behavior:'smooth',block:'start'});
   }
  }
 }
 render();return true;
}
root.GroundUpLabEngineV32Universal=Object.freeze({
 mount,version:'3.3.0',canonicalTarget:419,steps:STEPS,mathDiagnostic,validNumber
});
})(globalThis);
