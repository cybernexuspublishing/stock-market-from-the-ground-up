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
  fetch('/data/labs.json',{cache:'force-cache'}).then(r=>r.ok?r.json():[]).catch(()=>[]),
  fetch('/data/lab-teaching-bridges-v014168.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('419 individual teaching bridges unavailable');return r.json()})
 ]).then(([paths,study,authored,bridgeData])=>{
  const guides=study.guides||[];
  if(paths.totalCanonicalLabs!==419||Object.keys(paths.byLab||{}).length!==419||guides.length!==30||
   new Set(guides.map(x=>x.code)).size!==30||bridgeData.version!=='0.14.0.168'||
   bridgeData.canonicalLabCount!==419||bridgeData.officialCompetencyCount!==30||
   Object.keys(bridgeData.entries||{}).length!==419||
   Object.keys(paths.byLab||{}).some(id=>bridgeData.entries[id]?.labId!==id))
    throw Error('Curriculum or individual teaching bridge register mismatch');
  const knownTopics=new Map((Array.isArray(authored)?authored:[]).filter(x=>x&&typeof x.id==='string'&&typeof x.concept==='string').map(x=>[x.id,x.concept]));
  return {byLab:paths.byLab,guides:new Map(guides.map(x=>[x.code,x])),knownTopics,
   bridges:new Map(Object.entries(bridgeData.entries))};
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
 description:'An illustrative candle opens at $31.00, has a high of $32.50 and low of $30.50 in an unknown order, and closes at $32.00. Calculate how much of its full range is body.',
 steps:['Body (bullish):\nClose − Open = Body\n$32.00 (Close) − $31.00 (Open) = $1.00 (Body).','Full range:\nHigh − Low = Full Range\n$32.50 (High) − $30.50 (Low) = $2.00 (Range).','Body-to-range ratio:\nBody ÷ Full Range = Ratio\n$1.00 (Body) ÷ $2.00 (Range) = 0.50.','Convert to a percentage:\nRatio × 100 = Body Percentage\n0.50 × 100 = 50%.'],
 transfer:{prompt:'New illustrative candle: Open $12.40, High $12.70, Low $11.90, Close $12.10. What percentage of its full range is the real body?',answer:37.5}},
 vwap:{answer:2600/300,units:'USD/share',title:'Trade-price volume-weighted average',
 description:'Two illustrative trade groups: 200 shares at $8 and 100 shares at $10. Calculate VWAP (dollars per share) to two decimal places.',
 steps:['First traded value: 200 shares × $8 = $1,600.','Second traded value: 100 shares × $10 = $1,000.','Combined traded value = $1,600 + $1,000 = $2,600.','Combined volume = 200 + 100 = 300 shares.','VWAP = $2,600 ÷ 300 shares ≈ $8.67/share.'],
 transfer:{prompt:'New illustrative trades: 150 shares at $12 and 50 shares at $16. What is their VWAP?',answer:13}}
});
function validNumber(input,n){return input.trim()!==''&&Number.isFinite(Number(input))&&Math.abs(Number(input)-n)<.016}
// Curated prerequisites reference existing canonical competency guides only.
// No client-side grade inference: a missing assessment remains Not Yet Assessed.
const LAB_PREREQUISITES=Object.freeze({
 VWAP_CONTEXT:['CANDLE_READING','VOLUME_ANALYSIS'],
 EMA_CONTEXT:['CANDLE_READING'],
 VOLUME_ANALYSIS:['CANDLE_READING'],
 CHART_STRUCTURE:['CANDLE_READING'],
 MULTI_TIMEFRAME:['CANDLE_READING','CHART_STRUCTURE'],
 BREAKOUT_RECOGNITION:['CHART_STRUCTURE','VOLUME_ANALYSIS'],
 FAILED_BREAKOUT:['BREAKOUT_RECOGNITION'],
 PULLBACK_RECOGNITION:['CHART_STRUCTURE'],
 RISK_REWARD:['RISK_PER_SHARE','POSITION_SIZING'],
 POSITION_SIZING:['RISK_PER_SHARE'],
 ORDER_SELECTION:['SLIPPAGE_SPREAD'],
 TAPE_READING:['VOLUME_ANALYSIS'],
 LEVEL2_READING:['SLIPPAGE_SPREAD','ORDER_SELECTION'],
 INVALIDATION_DISCIPLINE:['RISK_PER_SHARE'],
 INDEPENDENT_PLAN:['ORDER_SELECTION','INVALIDATION_DISCIPLINE'],
 MFE_MAE_REVIEW:['RISK_REWARD'],
 SEC_FILINGS:['CATALYST_ANALYSIS'],
 FLOAT_SUPPLY:['CATALYST_ANALYSIS']
});
function labPrerequisiteCodes(codes,guides){
 const result=[];
 for(const code of codes)for(const required of LAB_PREREQUISITES[code]||[]){
  if(required!==code&&guides.has(required)&&!result.includes(required))result.push(required);
 }
 return result.slice(0,4);
}
function paintLabPrerequisites(host,codes,guides,evidence){
 host.replaceChildren();
 host.append(el('h3','Foundation skills for this lesson'));
 host.append(el('p','Suggested preparation—not a gate or diagnosis. Missing assessment records mean Not Yet Assessed.'));
 if(!codes.length){host.append(el('p','No additional prerequisite competency is assigned to this Lab. Begin with Talia’s introduction.'));return}
 const list=el('ul');
 for(const code of codes){
  const guide=guides.get(code);
  if(!guide)continue;
  const item=el('li'),link=el('a',guide.title||code);
  link.href='skills.html#guide-'+encodeURIComponent(code);
  const verified=evidence?.ok===true&&Array.isArray(evidence.skills);
  const skill=verified?evidence.skills.find(s=>s.code===code):null;
  const state=!verified?'Status unavailable — cannot verify your account evidence':
   skill?.completeAssessments>0?(skill.status||'Not Yet Assessed'):'Not Yet Assessed';
  item.append(link,el('span',' · '+state));
  if(state==='Not Yet Assessed')item.append(el('span',' · learn or revisit; this is not a failed assessment'));
  list.append(item);
 }
 host.append(list);
 host.append(el('p','Your Learning Development report uses only actual verified assessments. Guided explanations and optional practice do not create mastery credit.'));
}
async function mount({labId,mode,target,lab,focusId,tutorTopic,tutorRequest,creditRequest,skillEvidenceRequest,recallScheduler,memberFirstName='',allowTutorAI=true,progressStore=null}={}){
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
 const neededPrerequisites=labPrerequisiteCodes(codes,map.guides);
 let skillEvidence=null,updatePrerequisitePanel=null;
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
 disclosure.append(el('summary','Where these chart examples come from'),
  el('p','Some lessons use simulated chart prices so you can practice calculations without risking money. A historical chart must match the named ticker, date, time, source and verified prices. Practice examples are not live quotes or guaranteed trade outcomes.'));
 const journey=el('ol'),progress=el('p'),meter=el('div'),meterFill=el('span'),body=el('section'),status=el('p'),nav=el('div');
 journey.className='gu-v33-journey';journey.setAttribute('aria-label','Learning stages');
 progress.className='gu-v32-progress';meter.className='gu-v33-progress';meter.setAttribute('role','progressbar');meter.setAttribute('aria-label','Learning journey progress');meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax','100');meter.append(meterFill);body.className='gu-v32-body';nav.className='actions';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const previous=button('Previous stage',()=>{if(stage>0&&!creditBusy){stage--;render()}}),
 next=button('Next learning stage',()=>nextStage());
 const checkpointNote=el('p','', 'gu-v33-checkpoint-status');
 checkpointNote.setAttribute('role','status');
 checkpointNote.setAttribute('aria-live','polite');
 const saveCheckpointControl=button('Save my learning checkpoint',()=>void saveCheckpointNow());
 saveCheckpointControl.className='btn secondary';saveCheckpointControl.hidden=!progressStore;
 nav.append(previous,next,saveCheckpointControl);
 shell.append(heading,disclosure,progress,meter,journey,body,status,nav,checkpointNote);
 target.replaceChildren(shell);
 let stage=0,observations='',prediction='',predictionLocked=false,practice='',practiceCount=0,
     practiceResolved=false,practiceAssisted=false,transfer='',transferCount=0,transferResolved=false,
     selfReview=false,experimentValue=kind==='candle'?32:100,reflection='';
 let instructorInstance=null,creditBusy=false;
 const passAttemptId=typeof root.crypto?.randomUUID==='function'?root.crypto.randomUUID():null;
 const passRequests=new Map();
 let checkpointReady=false,checkpointTimer=null,checkpointChangeSerial=0;
 token.dispose=()=>{
  if(checkpointTimer!==null)clearTimeout(checkpointTimer);
  checkpointTimer=null;checkpointReady=false;
  instructorInstance?.dispose?.();instructorInstance=null;
 };
 const narratedStages=new Set();
 const learnerReplies=new Map(); // stage => accepted answers in question order
 function checkpointSnapshot(){
  return{
   version:1,mode,stage,observations,prediction,predictionLocked,
   practice,practiceCount,practiceResolved,practiceAssisted,
   transfer,transferCount,transferResolved,selfReview,reflection,
   learnerReplies:[...learnerReplies.entries()]
  };
 }
 async function saveCheckpointNow(){
  if(!progressStore||!checkpointReady||sessions.get(target)!==token)return;
  if(checkpointTimer!==null)clearTimeout(checkpointTimer);
  checkpointTimer=null;
  const checkpoint=checkpointSnapshot(),savingSerial=checkpointChangeSerial;
  saveCheckpointControl.disabled=true;
  checkpointNote.textContent='Saving private, ungraded learning progress…';
  try{
   await progressStore.save(checkpoint);
   if(sessions.get(target)===token)checkpointNote.textContent=
    savingSerial===checkpointChangeSerial
     ?'Saved through '+STEPS[checkpoint.stage]+'. This records study only; assessment credit is separate.'
     :'An earlier learning draft was saved; newer changes are still awaiting confirmation. No grade was awarded.';
  }catch(error){
   if(sessions.get(target)===token){
    const conflict=/Another device or tab saved a newer draft/.test(String(error?.message||''));
    if(conflict){
     // A later tab/device already advanced the authoritative revision.
     // Further retries from this stale view would repeat the same failure;
     // never silently merge or replace another saved learning decision.
     checkpointReady=false;
     checkpointNote.textContent='A newer learning draft exists on another device or tab. Reload this Lab before making more saved changes. Your previous study is not overwritten; no grade was awarded.';
    }else checkpointNote.textContent=
     'Progress was not confirmed saved. Select Save my learning checkpoint to retry; no grade was awarded.';
   }
  }finally{
   if(sessions.get(target)===token)saveCheckpointControl.disabled=!checkpointReady;
  }
 }
 function scheduleCheckpoint(){
  if(!checkpointReady||!progressStore||sessions.get(target)!==token)return;
  checkpointChangeSerial++;
  if(checkpointTimer!==null)clearTimeout(checkpointTimer);
  checkpointTimer=setTimeout(()=>{checkpointTimer=null;void saveCheckpointNow()},420);
 }
 function instructorQuestions(current){
  const reference=String(topic).slice(0,100);
  // Start is orientation only; Learn teaches before Check My Understanding.
  // Neither stage asks about VWAP Reclaim, real-body mathematics or
  // invisible chart evidence before the concept is demonstrated.
  if(current===0||current===1)return [];
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
  scheduleCheckpoint();
  return{accepted:true};
 }
 async function handleQuestionPass({action,index}={}){
  if(typeof creditRequest!=='function')throw Error('Crownlight Sparks has not been connected.');
  if(action==='balance')return creditRequest({action:'balance'});
  if(stage!==4||!['guided','practice'].includes(mode)||!passAttemptId)
   throw Error('Crownlight Sparks is unavailable for this exercise.');
  const steps=root.GroundUpLabV34InteractiveLessons?.practiceFor?.(kind)||[];
  if(steps.length!==3||!Number.isInteger(index)||index<0||index>=steps.length)
   throw Error('Only reviewed illustrative practice steps support Crownlight Sparks.');
  const step=steps[index];
  const id=String(index)+'/'+step.id;
  let requestId=passRequests.get(id);
  if(!requestId){
   requestId=typeof root.crypto?.randomUUID==='function'?root.crypto.randomUUID():null;
   if(!requestId)throw Error('Credit confirmation cannot be completed in this browser.');
   passRequests.set(id,requestId);
  }
  const saved=await creditRequest({action,questionId:step.id,attemptId:passAttemptId,requestId});
  if(saved?.ok!==true)throw Error('The pass could not be confirmed.');
  practiceAssisted=true;
  // The normal answer validator requires sequential indexes. Record the
  // debit-confirmed Study Only marker so a later typed answer remains valid.
  const list=learnerReplies.get(4)||[];
  while(list.length<index)list.push('Study Only — Crownlight Sparks');
  list[index]='Study Only — '+action;
  learnerReplies.set(4,list);
  if(index===steps.length-1){practiceResolved=true;practice='Study Only: '+action;}
  return {...saved,
   answerText:action==='reveal'?step.help+' This is Study Only, not a graded result.':
    'Question skipped. This step is marked Study Only and will not count as an independent correct answer.'};
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
  const plan=lessonPlan(1);
  const defined=(plan?.blocks||[]).filter(line=>
   !/^Current concept: |^For this specific Lab: /i.test(String(line)));
  const symbols=visualType==='vwap'
   ?'VWAP = Σ(price × shares) ÷ Σ(shares). Σ (sigma) means sum: add all the values in the specified set. Price is dollars per share; volume is shares.'
   :visualType==='candle'
    ?'Open is the first recorded price; High the highest; Low the lowest; Close the last. Real body = |Close − Open|; full range = High − Low.'
    :subject?.symbols||'Identify the exact observation, units and timeframe.';
  detail(body,'Explain This Concept',[
   ...(defined.length?defined:[authorizedTeaching.what||subject?.definition||guide.concept,
     authorizedTeaching.why||subject?.why||guide.procedure]),
   'Terms and symbols: '+symbols,
   'Common error: '+(plan?.misconception||subject?.error||guide.commonError),
   'What this example cannot prove: '+(plan?.limitation||guide.limit)
  ]);
 }
 function stepList(steps){const ol=el('ol');for(const s of steps)ol.append(el('li',s));body.append(ol)}
 function showVisual(step,variant='default'){
  // The illustrated source is always illustrative. The competency-based
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
  const plan=lessonPlan(1);
  detail(body,'Show a Guided Example',plan?.worked?.length?[
   ...plan.worked,
   'Why this is not a prediction: '+plan.limitation
  ]:special?special.steps:[
   'Start with the definition: '+guide.concept,
   'Follow the observation method: '+guide.procedure,
   'State a limitation: '+guide.limit
  ]);
  const newCase=visualType==='vwap'?[
   'New illustrative case, separate from the assessed exercise: 200 shares trade at $4.00 and 100 shares at $7.00.',
   'Traded dollars: (200 × $4.00) + (100 × $7.00) = $1,500. Total shares: 300.',
   'VWAP = $1,500 ÷ 300 shares = $5.00 per share. This is a worked example, not a predicted future price.'
  ]:visualType==='candle'?[
   'New illustrative candle: Open $9.00, High $10.00, Low $8.50 and Close $9.50.',
   'Real body = |$9.50 − $9.00| = $0.50. Full range = $10.00 − $8.50 = $1.50.',
   'Body percentage = ($0.50 ÷ $1.50) × 100 ≈ 33.3%. The result cannot predict the next candle.'
  ]:[
   'Apply the demonstrated method to another fully observed example.',
   'Define the timeframe, data source, and observable facts before interpreting them.',
   'Explain what the evidence establishes and what remains uncertain.'
  ];
  detail(body,'Try Another Example',newCase);
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
 function attachWallet(){
   const wallet=el('section');wallet.className='wallet';wallet.append(el('h3','Crownlight Sparks Wallet'));
   const metrics=el('div');metrics.className='grid2';
   const fields={};
   for(const [key,name,note] of [['included','Included','Included Sparks never expire'],['purchased','Purchased','Purchased Sparks do not expire'],['manual','Owner-adjusted','Account adjustments recorded by the Owner']]){
    const unit=el('div');unit.className='metric';unit.append(el('span',name));
    const count=el('strong','—');count.dataset.passCount=key;unit.append(count,el('span',note));metrics.append(unit);fields[key]=count;
   }
   wallet.append(metrics);
   const balanceState=el('p','Sign in to check your Crownlight Sparks balance.','gu-v33-pass-wallet-status');wallet.append(balanceState);
   appendParagraph(wallet,'Reveal or Skip uses four Crownlight Sparks per practice question after you confirm. Free explanations, hints and retries never cost a credit. A revealed or skipped step counts as Study Only, not a grade.');
   if(typeof creditRequest==='function'){
    balanceState.textContent='Checking your credit balance…';
    void creditRequest({action:'balance'}).then(data=>{
     if(!wallet.isConnected)return;
     const info=data?.balance;
     if(!info||!Number.isInteger(info.included)||!Number.isInteger(info.purchased))throw Error('No verified Crownlight Sparks balance.');
     fields.included.textContent=String(info.included);
     fields.purchased.textContent=String(info.purchased);
     fields.manual.textContent=String(Number.isInteger(info.manual)?info.manual:0);
     balanceState.textContent=String(info.available)+' available'+
      '';
    }).catch(error=>{
     if(wallet.isConnected)balanceState.textContent=String(error?.message||'Balance unavailable. No credit is charged.');
    });
   }
   if(instructorInstance?.setWalletContent)instructorInstance.setWalletContent(wallet);
   else{const walletDisclosure=el('details');walletDisclosure.className='gu-v33-wallet-disclosure';walletDisclosure.append(el('summary','Crownlight Sparks Wallet'),wallet);body.append(walletDisclosure);}
 }
 function render(){
  // Start places its help tabs next to the primary action outside the
  // replaceable body. Remove those old nodes when the stage changes,
  // or they persist underneath every later lesson as duplicate controls.
  shell.querySelectorAll?.(':scope > .gu-v33-support-tabs').forEach(node=>node.remove());
  shell.querySelector?.(':scope > .gu-v33-setup')?.remove?.();
  instructorInstance?.dispose?.();instructorInstance=null;
  body.replaceChildren();updatePrerequisitePanel=null;mark('');showJourney();
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
    lessonContext:{visualType,guide,subject,teaching:authorizedTeaching,topicSource,
      labId,bridge:map.bridges.get(labId)},
    memberFirstName,allowTutorAI,requestTutor:tutorRequest,seen:narratedStages.has(stage),
    questions:instructorQuestions(stage),initialAnswers:learnerReplies.get(stage)||[],
    onAnswer:receiveInstructorAnswer,
    onCreditPending:busy=>{creditBusy=busy===true;previous.disabled=creditBusy||stage===0;next.disabled=creditBusy||stage===8},
    onCreditAction:stage===4&&special&&['F2-C07-L01','F2-C07-L02','F3-C06-L01'].includes(labId)?handleQuestionPass:undefined,
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
    // Place the actual setup in the instructor header, not above her
    // introduction or in a second independent content panel.
    if(instructorInstance?.setStartSetup)instructorInstance.setStartSetup(setup);
    else body.append(setup);
   }
   if(neededPrerequisites.length){
    const prep=el('section');prep.className='gu-v38-prerequisite-guidance';
    prep.setAttribute('aria-label','Prerequisite learning guidance');
    updatePrerequisitePanel=()=>paintLabPrerequisites(prep,neededPrerequisites,map.guides,skillEvidence);
    updatePrerequisitePanel();
    body.append(prep);
   }
   // Learning objectives are now delivered directly by Talia in the
   // typed instructor panel. No second competing 'What you will learn' card.
   attachWallet();
   if(kind==='candle'&&instructorInstance?.element){
    // An engaging, NON-historical schematic on Start. No formula, grades,
    // quiz or numerical worked answer appears before the Learn stage.
    const hero=el('section');hero.className='gu-v40-start-hero';
    hero.setAttribute('aria-label','Your personal lesson introduction');
    const preview=el('section');preview.className='gu-v40-start-preview';
    const figure=el('figure');figure.className='gu-v40-start-candle';
    figure.setAttribute('role','img');
    figure.setAttribute('aria-label','Diagram preview: a green candle body and upper and lower wicks, with the four price locations marked. Not market data.');
    const candle=el('div');candle.className='gu-v40-preview-shape';
    const wick=el('span');wick.className='gu-v40-preview-wick';
    const realBody=el('span');realBody.className='gu-v40-preview-body';
    candle.append(wick,realBody);
    const marks=el('div');marks.className='gu-v40-preview-labels';
    for(const label of ['High','Close','Open','Low'])marks.append(el('span',label));
    const caption=el('figcaption','A candlestick, at a glance');
    figure.append(candle,marks,caption);
    const outcomes=el('div');outcomes.className='gu-v40-preview-outcomes';
    outcomes.append(el('h3','Your next three discoveries'));
    const goals=[
     ['01','Find the four prices','See where a candle starts, ends, reaches its highest and lowest prices.'],
     ['02','Measure its parts','Explore its body, wicks and full height using the interactive chart.'],
     ['03','Read with confidence','Describe what happened in this period without guessing what comes next.']
    ];
    for(const [number,title,description] of goals){
     const item=el('div');item.className='gu-v40-preview-goal';
     item.append(el('span',number,'gu-v40-preview-number'));
     const copy=el('div');copy.append(el('h4',title),el('p',description));item.append(copy);
     outcomes.append(item);
    }
    preview.append(figure,outcomes);
    hero.append(instructorInstance.element,preview);
    body.insertBefore(hero,body.firstChild);
   }

  }else if(stage===1){
   // The instructor and chart are the lesson; do not repeat the same
   // content underneath as an isolated wall of generic competency text.
   showVisual(1,topic==='Bearish Candle'?'bearish':visualType==='candle'?'worked':'default');
   // Always prepare the four source-backed teaching explanations. With Talia
   // mounted, render() converts the disclosures into chart-contained controls;
   // without Talia, the disclosures remain available as accessible fallbacks.
   // Preparing them only when Talia was absent left the chart controls empty.
   freeExplanation();guidedHelp();
   attachWallet();
   const deeper=lessonPlan(1);
   detail(body,'Teach This in More Depth',[
    ...(deeper?.blocks||[guide.concept,guide.procedure]),
    ...(deeper?.worked||[]),
    'Common error and its correction: '+(deeper?.misconception||guide.commonError),
    'Limit of the interpretation: '+(deeper?.limitation||guide.limit)
   ]);
  }else if(stage===2){
   if(kind==='candle'){
    appendParagraph(body,'Change only the closing price in this illustrative example. Open $31.00, High $32.50, Low $30.50. Observe how the body, direction and body percentage change.');
   }else if(kind==='vwap'){
    appendParagraph(body,'Change the number of illustrative shares traded at $10. The other group has 200 shares at $8. The relative volumes determine how much each price influences the average.');
   }else{
    appendParagraph(body,'Describe permitted price, volume, levels, and timeframe for the actual book task. Do not fill gaps with invented historical bars.');
   }
   if(kind==='candle'&&special){
    // The v3.2 interaction now lives in the SAME shared candle component:
    // slider, OHLC side panel and derived measures all update together.
    showVisual(2,topic==='Bearish Candle'?'bearish':'default');
   }else if(special){
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
   body.append(button('Record my observation',()=>{observations=input.value.trim();scheduleCheckpoint();mark(observations?'Observation recorded as a private learning draft.':'Add an observation if helpful.')}));freeExplanation();
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
    const guided=detail(body,'Teach This in More Depth',special.steps.concat(['Frequent misconception: '+(subject?.error||guide.commonError),'The answer describes the illustrative example; it does not predict the next bar.']));
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
     transferResolved=true;transfer='Illustrative Study Only VWAP replay: '+observations+' completed observations';stage=8;render();
    }});
   }else if(special){
    appendParagraph(body,special.transfer.prompt);
    const f=field(body,'Answer ('+special.units+')',transfer,'input');f.disabled=transferResolved;
    if(!transferResolved)body.append(button('Check my answer',()=>{
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
  // The approved reference keeps worked demonstrations INSIDE the
  // illustration. The four explanation actions now trigger Talia's voice,
  // rather than opening four disconnected text windows.
  let stageOneGuides=[];
  if(stage===1&&instructorInstance){
   const names=new Set(['Explain This Concept','Show a Guided Example','Try Another Example','Teach This in More Depth']);
   stageOneGuides=Array.from(body.querySelectorAll('details'))
    .filter(node=>names.has(node.querySelector('summary')?.textContent.trim()))
    .map(node=>({
      name:node.querySelector('summary').textContent.trim(),
      paragraphs:Array.from(node.querySelectorAll('p,li')).map(p=>p.textContent.trim()).filter(Boolean),
      node
    }));
   for(const guideAction of stageOneGuides)guideAction.node.remove();
   // Normally Talia owns the four coaching actions and there are no
   // legacy <details> nodes to relocate. Build the SAME non-grading actions
   // from the current topic's instructional plan rather than silently
   // omitting them whenever the Instructor is available.
   // Prefer the exact source-backed worked explanations already prepared
   // by this Lab. Only synthesize a complete accessible four-action fallback
   // for older lessons that genuinely lack one or more authored actions.
   if(instructorInstance&&stageOneGuides.length!==4){
    const learn=lessonPlan(1)||{},review=lessonPlan(6)||{};
    const blocks=(Array.isArray(learn.blocks)?learn.blocks:[])
     .map(v=>String(v||'').trim()).filter(Boolean);
    const worked=(Array.isArray(learn.worked)?learn.worked:[])
     .map(v=>String(v||'').trim()).filter(Boolean);
    const symbols=visualType==='candle'
     ?'Open is the first price, Close the last, High the highest and Low the lowest. Real body = |Close − Open|. Full range = High − Low.'
     :visualType==='vwap'
      ?'VWAP = Σ(price × shares) ÷ Σ(shares). Verify price, shares and the timeframe.'
      :String(subject?.symbols||'Name the observable values, the source and their units.');
    const misconception=String(learn.misconception||review.misconception||guide.commonError||'Separate observations from assumptions.');
    const limitation=String(learn.limitation||guide.limit||'One completed example cannot determine future price.');
    const alternate=visualType==='candle'?[
     'Try a separate illustrative candle: Open $9.00, High $10.00, Low $8.50 and Close $9.50.',
     'Real body = |$9.50 − $9.00| = $0.50. Full range = $10.00 − $8.50 = $1.50.',
     'Body share = ($0.50 ÷ $1.50) × 100 ≈ 33.3%. This does not predict the next candle.'
    ]:visualType==='vwap'?[
     'Try a separate illustrative set: 200 shares at $4.00 and 100 shares at $7.00.',
     'Traded dollars = $1,500; total shares = 300; VWAP = $5.00 per share.',
     'This is a worked average, not a predicted future quote.'
    ]:[
     'Apply the explained observation method to a different completed example.',
     'Identify the evidence, timeframe and source before drawing a conclusion.',
     'Distinguish what the example demonstrates from what is still uncertain.'
    ];
    stageOneGuides=[
     {name:'Explain This Concept',paragraphs:[...blocks,symbols,
       'Common error: '+misconception,'Limitation: '+limitation]},
     {name:'Show a Guided Example',paragraphs:[...worked,
       'Why this is not a prediction: '+limitation]},
     {name:'Try Another Example',paragraphs:alternate},
     {name:'Teach This in More Depth',paragraphs:[...blocks,...worked,
       'Correct the misconception: '+misconception,'Limitation: '+limitation]}
    ];
   }
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
    // Keep all four instructional actions inside the same illustrated
    // candlestick/chart teaching area, immediately after the focus controls.
    // Other Labs without a graphic retain the original accessible fallback.
    const chartHost=body.querySelector('.gu-l33-graphic, .gu-v33-exact-visual');
    const highlights=chartHost?.querySelector('.gu-l33-interactive-tools');
    if(highlights)highlights.insertAdjacentElement('afterend',tabs);
    else if(chartHost)chartHost.append(tabs);
    else body.append(tabs);
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
    if(chart.classList.contains('gu-v34-competency-visual'))hero.classList.add('gu-v34-concept-lesson');
    hero.setAttribute('aria-label','Interactive demonstration followed by Talia');
    // Preserve the v3.2 visual sequence: topic/feature controls, illustrated
    // chart with measured values, THEN Talia teaching and the typed answer.
    // They share one workstation rather than two competing side panels.
    hero.append(chart,coach);body.insertBefore(hero,body.firstChild);
    // Member learning support belongs below BOTH illustration and instructor,
    // not squeezed inside Talia's teaching column.
    if(stage===1){
     const support=coach.querySelector('.gu-v33-support-tabs');
     if(support)hero.insertAdjacentElement('afterend',support);
    }
    if(stage===1){
     const worked=lessonPlan(1)?.worked||[];
     if(worked.length&&(visualType==='candle'||visualType==='vwap')){
      const work=el('section');work.className='gu-v35-chart-worked';
      work.setAttribute('aria-label','Interactive worked example on the chart');
      const label=el('h4','Worked example — different illustrative case');work.append(label);
      const counter=el('p');counter.className='gu-v35-worked-counter';
      const script=el('p');script.className='gu-v35-worked-script';
      const actions=el('div');actions.className='gu-v35-worked-controls';
      let current=0;
      const prevWork=button('Previous worked step',()=>select(current-1));
      const nextWork=button('Next worked step',()=>select(current+1));
      const showWork=button(visualType==='vwap'?'Show and explain this example':'Show and explain on chart',()=>select(current,true));
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
       counter.textContent='Step '+(index+1)+' of '+worked.length+' · Illustrative case';
       script.textContent=worked[index];
       const currentCase=stepFor(index);
       // Only a candle lesson may replace the candle's OHLC picture.
       // VWAP's worked trade groups use the integrated weighted-bars diagram.
       if(visualType==='candle'&&chart.setTeachingCandle?.(currentCase.values)){
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
      work.append(counter,script);
      if(visualType==='vwap'){
       // This trade-group illustration belongs to the $10/$12 worked case,
       // which is distinct from the $9–$10.85 illustrative market chart below.
       // Showing only the unrelated chart would misrepresent the example.
       const diagram=el('div');diagram.className='gu-v35-vwap-share-illustration';
       diagram.setAttribute('aria-label','Illustrative VWAP trade-group comparison');
       diagram.append(el('h5','How the VWAP weights work'));
       for(const [price,shares] of [['$10.00',100],['$12.00',300]]){
        const group=el('div');group.className='gu-v35-vwap-share-group';
        const label=el('span',price+' · '+shares+' shares');
        const track=el('div');track.className='gu-v35-vwap-share-track';
        const fill=el('div');fill.className='gu-v35-vwap-share-fill';
        fill.style.width=(shares/400*100)+'%';
        fill.setAttribute('aria-label',String(shares/400*100)+'% of total shares');
        track.append(fill);group.append(label,track);diagram.append(group);
       }
       diagram.append(el('p',
        '400 total shares · Weighted price = ($1,000 + $3,600) ÷ 400 = $11.50 per share.'));
       diagram.append(el('p',
        'Separate illustrative trade-group example. It does not use the individual candles in the market chart below.'));
       work.append(diagram);
      }
      work.append(actions);
      const visualButtons=chart.querySelector('.gu-l33-interactive-tools');
      if(visualButtons)visualButtons.insertAdjacentElement('afterend',work);
      else chart.append(work);
      counter.textContent='Different illustrative case · Step 1 of '+worked.length;
      script.textContent='Select “Show and explain on chart” to switch from the introductory $31.00 candle to this separate worked example.';
      prevWork.disabled=true;
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
    hero.addEventListener('gu-v36-show-check-evidence',event=>{
     if(!coach.contains(event.target)||visualType!=='vwap')return;
     chart.querySelector('.gu-l33-interactive-tools [data-view="both"]')?.click();
    });
    hero.addEventListener('gu-v34-visual-focus',event=>{
     if(!chart.contains(event.target))return;
     // Keep the member's current slider/worked case visible; narrate the
     // actual prices instead of silently replacing the selected candle.
     if(event.detail?.type==='general'){
      const match=/^case-(\d+)$/.exec(String(event.detail.feature||''));
      const selected=match?Number(match[1]):-1;
      const steps=root.GroundUpLabV34CompetencyExamples?.get?.(guide.code,topic)?.steps||[];
      if(selected>=0&&selected<steps.length)
       instructorInstance?.teachSupplement?.('Worked example · Step '+(selected+1)+' of '+steps.length,[
        steps[selected],
        'This fictional example describes only the stated observation. It is not a brokerage order or verified market history.'
       ]);
      return; // Never read raw case-0 identifiers aloud as instruction.
     }
     const values=chart.getTeachingCandle?.();
     instructorInstance?.teachFeature?.({...event.detail,values});
    });
    hero.addEventListener('gu-v36-candle-adjusted',event=>{
     if(!chart.contains(event.target))return;
     instructorInstance?.teachSupplement?.('Explore the closing price',[
      event.detail?.message||'Observe how the selected candle changed.',
      'The body is the absolute difference between Close and Open. The full range remains High minus Low.'
     ]);
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
     // VWAP requires a visible weighted line before any concept check.
     // Selecting Price alone concealed the very evidence being taught.
     const first=visualType==='vwap'
      ?chart.querySelector('.gu-l33-interactive-tools [data-view="both"]')
      :chart.querySelector('.gu-l33-interactive-tools [data-teaching-feature], .gu-l33-interactive-tools [data-view]');
     first?.click();
    }
   }else if(chart)body.insertBefore(chart,body.firstChild);
  }else if(stage===3){
   const chart=body.querySelector('.gu-l33-graphic');
   if(chart)body.insertBefore(chart,body.firstChild);
  }
  // Coach the member through one protected evidence field at a time. This
  // shortcut never grades or submits anything and preserves the form's IDs.
  if([3,4,6,7,8].includes(stage)){
   const prompt=button('Record your observation',()=>{
    document.dispatchEvent?.(new CustomEvent('gu-v33-open-evidence',
     {detail:{stage}}));
   });
   prompt.className='btn secondary gu-v33-evidence-shortcut';
   body.append(prompt);
  }
  if(stage===8&&typeof recallScheduler==='function'){
   const recall=el('section');recall.className='gu-v38-delayed-recall';
   recall.append(el('h3','Remember this lesson after today'));
   recall.append(el('p','Schedule ungraded concept recall in 1, 7 and 30 days. Different reflection prompts help you remember the method without seeing the original answers.'));
   const result=el('p');result.setAttribute('role','status');
   const schedule=button('Schedule my three recall reviews',async()=>{
    schedule.disabled=true;result.textContent='Saving your private review schedule…';
    try{
     const outcome=await recallScheduler(labId);
     result.textContent=outcome?.newReviews>0?
      'Your 1-day, 7-day and 30-day reviews are scheduled. Existing reviews were preserved.' :
      'Your three recall reviews are already scheduled. No duplicate records were added.';
    }catch{result.textContent='The recall schedule could not be verified. No learning credit was awarded.';}
    finally{schedule.disabled=false;}
   });
   schedule.className='btn secondary';
   const reviews=el('a','Open my concept reviews');reviews.href='skills.html#lab-concept-review';
   recall.append(schedule,result,reviews);body.append(recall);
  }
  previous.disabled=stage===0;next.disabled=stage===8;
  scheduleCheckpoint();
 }
 function nextStage(fromInstructor=false){
  if(creditBusy){mark('Finish confirming your Crownlight Sparks first.');return}
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
 if(progressStore){
  checkpointNote.textContent='Checking your private, ungraded learning checkpoint…';
  try{
   const saved=await progressStore.load();
   if(sessions.get(target)!==token)return false;
   if(saved){
    stage=saved.stage;observations=saved.observations;
    prediction=saved.prediction;predictionLocked=saved.predictionLocked;
    practice=saved.practice;practiceCount=saved.practiceCount;
    practiceResolved=saved.practiceResolved;practiceAssisted=saved.practiceAssisted;
    transfer=saved.transfer;transferCount=saved.transferCount;
    transferResolved=saved.transferResolved;selfReview=saved.selfReview;
    reflection=saved.reflection;
    for(const [key,values] of saved.learnerReplies)learnerReplies.set(key,values);
    checkpointNote.textContent='Resumed your ungraded learning draft at '+STEPS[stage]+
     '. No grade, mastered competency or historical outcome was restored.';
   }else checkpointNote.textContent='No saved draft yet. This ungraded learning journey can save to your private account.';
  }catch{
   if(sessions.get(target)!==token)return false;
   checkpointNote.textContent='Private progress could not be loaded. You may study locally; no saved checkpoint is claimed.';
  }
 }else checkpointNote.textContent='This learning journey is local to this page until an eligible member session is available.';
 if(sessions.get(target)!==token)return false;
 render();checkpointReady=true;
 // Ask the existing authenticated competency service, only during non-blind
 // modes. Account changes and rerenders cannot replay stale personalized state.
 if(typeof skillEvidenceRequest==='function'&&neededPrerequisites.length){
  Promise.resolve().then(()=>skillEvidenceRequest()).then(result=>{
   if(sessions.get(target)!==token)return;
   skillEvidence=result?.ok===true?result:null;
   updatePrerequisitePanel?.();
  }).catch(()=>{if(sessions.get(target)===token){skillEvidence=null;updatePrerequisitePanel?.();}});
 }
 return true;
}
root.GroundUpLabEngineV32Universal=Object.freeze({
 mount,version:'3.3.0',canonicalTarget:419,steps:STEPS,mathDiagnostic,validNumber
});
})(globalThis);
