/* LAB-UX-STD-001 — in-workstation instructional narration and Market Tutor.
 * Presentation-only typing is NOT live model streaming. The optional, explicitly
 * requested Tutor response is returned by the existing authenticated service.
 * Never send user answers, rubrics, grades, future bars or historical replay
 * evidence. All responses are ungraded; this module grants no access.
 */
(function(root){
'use strict';
const STEPS=['Start','Learn','Experiment','Predict','Practice','Assess','Review','Transfer','Results'];
let tabSequence=0;
const SAFE_STAGES=new Set([0,1,2,4,6,7,8]);
function el(tag,content,className){
 const node=document.createElement(tag);
 if(content!==undefined)node.textContent=String(content);
 if(className)node.className=className;
 return node;
}
function listen(elm,type,fn){elm.addEventListener(type,fn);return elm}
function animate(node,text,showAll,replay){
 let raf=0,disposed=false,complete=false,last=0,at=0;
 const supports=typeof root.matchMedia==='function'&&!root.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const immediate=!supports||showAll;
 function finish(){
  if(raf)root.cancelAnimationFrame?.(raf);
  raf=0;node.textContent=text;complete=true;at=text.length;replay.textContent='Replay typing';
 }
 function tick(t){
  if(disposed)return;
  if(!last)last=t;
  // Short and readable animation; never withhold teaching for minutes.
  at=Math.min(text.length,Math.floor((t-last)*0.038)+1);
  node.textContent=text.slice(0,at);
  if(node.scrollHeight>node.clientHeight)node.scrollTop=node.scrollHeight;
  if(at>=text.length)finish();
  else raf=root.requestAnimationFrame(tick);
 }
 if(immediate||typeof root.requestAnimationFrame!=='function')finish();
 else{node.textContent='';replay.textContent='Show full text';raf=root.requestAnimationFrame(tick)}
 listen(replay,'click',()=>{
  if(disposed)return;
  if(!complete){finish();return}
  if(!supports)return;
  complete=false;last=0;at=0;node.textContent='';
  replay.textContent='Show full text';raf=root.requestAnimationFrame(tick);
 });
 return ()=>{disposed=true;if(raf)root.cancelAnimationFrame?.(raf);raf=0};
}
function create({stage=0,subject='market evidence',concept='',requestTutor,conversation=[],onTutorExchange,seen=false,lessonContext={},memberFirstName='',allowTutorAI=true,initialReflection='',onReflection,questions=[],initialAnswers=[],onAnswer,onComplete,onUnderstandingPassed,onCreditAction,onCreditPending}={}){
 if(!SAFE_STAGES.has(stage))return null;
 const rootEl=el('section',undefined,'gu-v33-instructor');
 rootEl.setAttribute('aria-label','Talia, learning instructor and Market Tutor');
 const title=el('h3','Talia');
 const head=el('div',undefined,'gu-v33-instructor-head');
 const avatar=el('span','T','gu-v33-instructor-avatar');
 avatar.setAttribute('aria-hidden','true');
 const identity=el('div',undefined,'gu-v33-instructor-identity');
 identity.append(title);
 if(stage!==0)head.append(avatar,identity);
 else head.hidden=true; // Historical Lab Setup will occupy this header instead.
 rootEl.append(head);
 // Accept only explicitly provided first-name fields. Never derive the form of
 // address from a username, display name, email, or the member's login handle.
 const firstName=typeof memberFirstName==='string'&&memberFirstName.trim().length<=80&&
  /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u.test(memberFirstName.trim())
   ?memberFirstName.trim():'';
 const plan=root.GroundUpLabV33InstructionContent?.lesson?.({
  ...lessonContext,stage,concept
 })||null;
 const introduction=stage===0
  ?('Hello'+(firstName?', '+firstName:'')+'. I’m Talia, your instructor. We’ll work through this lesson together, one idea at a time. I’ll demonstrate each skill before you practice it.')
  :stage===1
   ?(lessonContext.visualType==='candle'?'Now let’s build one candle together. I’ll point to each price as we go, and I’ll show you why every calculation works before using the numbers. You can ask me for another example whenever you need one.':(firstName?firstName+', let’s':'Let’s')+' explore this idea together. I’ll explain it first, then show you what to look for.')
   :stage===2
    ?'Now you can change one variable and see how the example responds. I’ll help you distinguish what changes from what remains unknown.'
    :stage===4
     ?'Let’s practice with an unfamiliar case. I’ll remind you of the method, then you make the calculation or decision.'
     :stage===6
      ?'Let’s examine the reasoning, including where an interpretation can go wrong and how to correct it.'
      :stage===7
       ?'Now apply the same method to a different case. Use only evidence available at the current pause.'
       :'You’ve reached the lesson review. Here are the essential ideas to carry into your next exercise.';
 // Keep first narration concise like the owner-approved interactive
 // typing reference. Long worked content remains in free guided panels and
 // chart-button micro lessons instead of appearing as a static wall of text.
 const openingBlocks=stage===1||stage===2
  ?plan?.blocks?.slice(0,2):plan?.blocks;
 const prototype=root.GroundUpLabV34InteractiveLessons?.referenceIntro?.(lessonContext.visualType);
 // The uploaded v3.2 reference teaches through a CONCRETE worked case
 // immediately after defining the term. Preserve that order, and give
 // learners the corresponding visual before asking a question.
 const shownExample=stage===1&&prototype
  ?[
    prototype.term+': '+prototype.definition,
    'Why it matters: '+prototype.why,
    'Follow the illustrative example on the chart: '+prototype.example,
    ...prototype.steps.slice(0,2).map((value,i)=>'Step '+(i+1)+': '+value),
    'What this does NOT show: '+prototype.caution
   ].join('\n\n')
  :null;
 const full=introduction+'\n\n'+(shownExample||(openingBlocks?.join('\n\n')||(
  String(lessonContext?.teaching?.what||lessonContext?.guide?.concept||
  lessonContext?.subject?.definition||'').trim()||
  'This concept needs an individually reviewed teaching explanation before it can be presented as complete.'
 )));
 // Full lesson narration remains immediately available to assistive technology.
 // The animated copy is visual-only to avoid dozens of screen reader updates.
 const accessible=el('p',full,'gu-v33-instructor-accessible');
 const transcript=el('div',undefined,'gu-v33-instructor-narration');
 const initialLessonTitle=stage===1&&lessonContext.visualType==='candle'?'The completed candlestick':'';
 const transcriptTitle=el('h3',initialLessonTitle,'gu-v33-instructor-lesson-title');
 transcriptTitle.hidden=!initialLessonTitle;
 const reserve=el('p',full,'gu-v33-instructor-reserve');reserve.setAttribute('aria-hidden','true');
 const visual=el('p',undefined,'gu-v33-instructor-typing');visual.setAttribute('aria-hidden','true');
 transcript.append(transcriptTitle,reserve,visual);
 const controls=el('div',undefined,'gu-v33-instructor-controls');
 const skip=el('button','Show full text');skip.type='button';skip.className='btn secondary gu-v33-instructor-skip';
 controls.append(skip);
 const stepToolbar=el('div',undefined,'gu-v40-instructor-steps');
 stepToolbar.hidden=true;
 stepToolbar.setAttribute('role','group');
 stepToolbar.setAttribute('aria-label','Explore each teaching step');
 const stepBack=el('button','Previous teaching step','btn secondary');
 const stepState=el('span','','gu-v40-instructor-step-count');
 stepState.setAttribute('aria-live','polite');
 const stepNext=el('button','Next teaching step','btn secondary');
 stepBack.type=stepNext.type='button';
 stepToolbar.append(stepBack,stepState,stepNext);
 controls.append(stepToolbar);
 rootEl.append(accessible,transcript,controls);
 // Talia speaks each question IN her narration box. The member's answer
 // is collected there, not in a disconnected form below the lesson.
 // Every accepted response advances to the next question; a completed
 // set asks the universal engine to advance the appropriate study stage.
 // Reviewed grades and locked independent decisions remain server-owned.
 const fallbackQuestion='After the demonstration, use Check My Understanding to review the concept.';
 const prompts=(Array.isArray(questions)?questions:[]).filter(q=>typeof q==='string'&&q.trim())
  .map(q=>q.trim()).slice(0,8);
 if(!prompts.length)prompts.push(fallbackQuestion);
 const saved=Array.isArray(initialAnswers)?initialAnswers.slice(0,prompts.length):[];
 let questionIndex=Math.min(saved.length,prompts.length-1);
 const interaction=el('section',undefined,'gu-v33-instructor-dialogue');
 interaction.setAttribute('aria-label','Answer Talia’s learning question');
 const counter=el('p',undefined,'gu-v33-instructor-question-counter');
 const prompt=el('label',undefined,'gu-v33-instructor-prompt');
 const reflection=el('textarea');reflection.rows=3;reflection.maxLength=1500;
 const inputId='gu-v33-instructor-answer-'+String(++tabSequence);
 reflection.id=inputId;prompt.setAttribute('for',inputId);
 reflection.placeholder='Explain your evidence and reasoning in your own words.';
 const reply=el('div',undefined,'gu-v33-instructor-reply');
 reply.setAttribute('role','status');reply.setAttribute('aria-live','polite');
 // A selected suggested question appears as a member chat turn before
 // Talia's source-grounded, credit-free teaching response.
 const memberQuestion=el('p',undefined,'gu-v33-instructor-member-question');
 memberQuestion.setAttribute('aria-live','polite');
 const submitReflection=el('button','Submit answer','btn secondary gu-v33-instructor-submit');
 submitReflection.type='button';
 function paintQuestion(){
  counter.textContent='Question '+(questionIndex+1)+' of '+prompts.length;
  prompt.textContent=prompts[questionIndex];
  reflection.value=String(saved[questionIndex]||(!saved.length&&questionIndex===0?initialReflection:''));
  reply.textContent='';memberQuestion.textContent='';
  submitReflection.disabled=false;
 }
 let submitting=false,finished=false,featureLesson=null,featurePhase=0,understandingMode=false;
 const submit=async()=>{
  // No answer is permitted during orientation or before Learn instruction.
  // Hidden UI controls must not become a backdoor stage-completion route.
  if(stage===0||(stage===1&&!understandingMode))return;
  if(submitting||finished)return;
  const value=reflection.value.trim(),index=questionIndex,isFinal=index===prompts.length-1;
  if(understandingMode){
   if(value.length<6){reply.textContent='Explain the answer in your own words so we can check your understanding.';return;}
   const expected=String(plan?.check?.choices?.[plan?.check?.correct]||'').toLowerCase();
   const text=value.toLowerCase();
   // Only ungraded formative concept recognition. This never awards an
   // official grade and it cannot unlock independent assessment data.
   const taught=plan?.category==='candle'?/open/i.test(value)&&/close/i.test(value)
    :plan?.category==='vwap'?/(shares|volume)/i.test(value)&&/(weight|influence|more|greater)/i.test(value)
    :plan?.category==='ema'?/(ema\s*9|nine.period|shorter)/i.test(value)
    :expected.split(/[^a-z0-9]+/).filter(w=>w.length>=5)
       .filter(w=>text.includes(w)).length>=2;
   if(!taught){
    reply.textContent='Not yet. '+String(plan?.check?.feedback||'Review the visible example and try again.')+
     ' Explain the key relationship, then submit another answer.';
    return;
   }
   understandingMode=false;
   reply.textContent='That explains the central relationship. We can move to the next learning stage.';
   onUnderstandingPassed?.();
   return;
  }
  if(featureLesson){
   // Formative instructional responses NEVER substitute for graded Assess,
   // private rubrics, independent predictions or server-controlled replay.
   if(value.length<8&&!['yes','no','3','ema9','ema20'].includes(value.toLowerCase())){
    reply.textContent='Please explain the observation in your own words before continuing.';
    return;
   }
   if(featurePhase===0){
    featurePhase=1;
    const detail=featureLesson;
    const correction='Worked example: '+detail.example+'\n\nCommon mistake: '+detail.mistake+
     '\n\nLimitation: '+detail.limit;
    reserve.textContent=correction;
    accessible.textContent=correction;
    stopTyping?.();stopTyping=animate(visual,correction,false,skip);
    counter.textContent='Practice the correction · '+detail.title;
    prompt.textContent='What mistake should you avoid with '+detail.title.toLowerCase()+
     ', and how would you correct it?';
    reflection.value='';reply.textContent='Compare your answer with the worked explanation above.';
    return;
   }
   const complete=featureLesson;
   featureLesson=null;featurePhase=0;
   // The chart progresses its OWN feature sequence without changing any
   // independently protected stage. The final chart focus restores questions.
   if(typeof CustomEvent==='function')rootEl.dispatchEvent?.(new CustomEvent('gu-v34-focus-answered',{
    bubbles:true,detail:{type:complete.type,feature:complete.feature}
   }));
   if(!featureLesson)resumeTeaching();
   return;
  }
  const numerical=/^Enter the numerical/i.test(prompts[index]);
  if((numerical&&(!value||!Number.isFinite(Number(value))))||(!numerical&&value.length<20)){
   reply.textContent=numerical?'Enter a valid numerical result.':'Explain your reasoning using at least 20 characters.';
   return;
  }
  submitting=true;submitReflection.disabled=true;
  try{
   const verdict=typeof onAnswer==='function'
    ?await onAnswer({stage,index,answer:value,isFinal})
    :{accepted:true};
   if(verdict?.accepted===false){
    reply.textContent=String(verdict.message||'Review the evidence and revise your answer.');
    return;
   }
   saved[index]=value;
   onReflection?.(value);
   if(!isFinal){
    questionIndex=index+1;
    paintQuestion();
    reflection.focus?.();
   }else{
    finished=true;reflection.disabled=true;
    submitReflection.hidden=true;
    counter.textContent='All '+prompts.length+' questions answered';
    prompt.textContent='Your answers have been recorded for this learning session.';
    reply.textContent=String(verdict?.message||'Lesson questions completed.');
    onComplete?.({stage,answers:[...saved]});
   }
  }catch{
   reply.textContent='The answer could not be recorded. Please try again.';
  }finally{
   submitting=false;
   if(!finished)submitReflection.disabled=false;
  }
 };
 listen(submitReflection,'click',submit);
 // Enter submits a single-line response; Shift+Enter still creates a new line.
 listen(reflection,'keydown',event=>{
  if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){
   event.preventDefault();void submit();
  }
 });
 // Contextual questions are real buttons, not static disclosure text or
 // additional graded/reflection prompts. Clicking submits the suggested
 // message to the local instructional dialogue and Talia explains it.
 const suggestions=el('div',undefined,'gu-v33-instructor-suggestions');
 suggestions.setAttribute('role','group');
 suggestions.setAttribute('aria-label','Suggested questions for Talia');
 if([1,2,4,6].includes(stage)){
  const items=[
   ['Talia, explain the common mistake',[
    'The common mistake: '+String(plan?.misconception||lessonContext.guide?.commonError||'Assuming the example establishes an outcome it cannot prove.'),
    'How to correct it: '+String(plan?.worked?.[0]||plan?.blocks?.[0]||lessonContext.guide?.procedure||'Use the definitions and the evidence actually displayed.'),
    'What remains uncertain: '+String(plan?.limitation||lessonContext.guide?.limit||'The next observation has not occurred yet.')
   ]],
   ['Talia, explain the limitation',[
    String(plan?.limitation||lessonContext.guide?.limit||'The available observations cannot establish an unseen future event.'),
    'Describe only what the completed, visible evidence supports.'
   ]]
  ];
  if(lessonContext.visualType==='candle')items.push([
   'Talia, explain the candle calculations',[
    'Real body = |Close − Open|. The absolute value means the distance is never negative.',
    'Full range = High − Low. This includes the real body and both wicks.',
    'Body percentage = (real body ÷ full range) × 100, provided full range is greater than zero.',
    'For the separate illustrative example Open $20.00, Close $21.20, High $22.00, and Low $19.00: body $1.20, range $3.00, body percentage 40%.',
    'These completed values cannot predict the next candle.'
   ]
  ]);
  for(const [label,lines] of items){
   const askButton=el('button',label,'btn secondary gu-v33-instructor-suggestion');
   askButton.type='button';
   askButton.setAttribute('aria-label','Ask Talia: '+label.replace(/^Talia, /,''));
   listen(askButton,'click',()=>teachDirect('Talia’s explanation',lines,label));
   suggestions.append(askButton);
  }
 }
 paintQuestion();
 // The original v3.2 Crownlight Sparks workflow is restored here for
 // *illustrative, ungraded* practice questions only. A real member ledger
 // confirms the balance and spends one credit atomically, never JavaScript.
 const creditControls=el('section',undefined,'gu-v33-pass-controls');
 creditControls.setAttribute('aria-label','Crownlight Sparks: optional reveal or skip');
 const passHeading=el('h4','Crownlight Sparks · Reveal or Skip');
 const passBalance=el('p','Checking available credits…','gu-v33-pass-balance');
 const passNote=el('p','Both options use one Crownlight Spark. Free teaching, corrections and retries never use a credit. Revealed or skipped steps are Study Only, not independent assessment.','gu-v33-pass-note');
 const passConfirmation=el('div',undefined,'gu-v33-pass-confirm');passConfirmation.hidden=true;
 const passQuestion=el('p','');
 const passConfirm=el('button','Confirm 1-credit use','btn gu-v33-pass-confirm-btn');
 const passCancel=el('button','Cancel','btn secondary');
 passConfirm.type=passCancel.type='button';
 passConfirmation.append(passQuestion,passConfirm,passCancel);
 const passChoices=el('div',undefined,'gu-v33-pass-choice-row');
 const passReveal=el('button','Reveal answer · 1 credit','btn secondary');
 const passSkip=el('button','Skip question · 1 credit','btn secondary');
 passReveal.type=passSkip.type='button';passReveal.disabled=passSkip.disabled=true;
 passChoices.append(passReveal,passSkip);
 const passFeedback=el('p','','gu-v33-pass-feedback');passFeedback.setAttribute('role','status');
 const passContinue=el('button','Continue','btn secondary');passContinue.type='button';passContinue.hidden=true;
 creditControls.append(passHeading,passBalance,passNote,passConfirmation,passChoices,passFeedback,passContinue);
 let passAvailable=0,passPending='',passBusy=false,passUsed=false,passDisposed=false;
 function showPassBalance(balance){
  if(!balance||!Number.isInteger(balance.available)||balance.available<0)
   throw Error('Credit balance could not be verified.');
  passAvailable=balance.available;
  passBalance.textContent='Available: '+balance.available+' · Included: '+balance.included+
   ' · Purchased: '+balance.purchased;
  passReveal.disabled=passSkip.disabled=passAvailable<1||passBusy||passUsed;
 }
 function resetPassQuestion(){
  passUsed=false;passPending='';passConfirmation.hidden=true;passContinue.hidden=true;
  passFeedback.textContent='';
  passReveal.disabled=passSkip.disabled=passAvailable<1;
 }
 if(stage===4&&typeof onCreditAction==='function'){
  void onCreditAction({action:'balance'}).then(response=>{
   if(passDisposed)return;
   showPassBalance(response.balance);
   if(response.balance.available<1)passFeedback.textContent='No Crownlight Sparks are available. You can still learn and retry for free.';
  }).catch(error=>{
   if(passDisposed)return;
   passBalance.textContent='Balance unavailable';
   passFeedback.textContent=String(error?.message||'No verified balance is available.');
  });
  const choose=action=>{
   if(passBusy||passUsed||passAvailable<1)return;
   passPending=action;
   passQuestion.textContent=(action==='reveal'?'Reveal the study answer':'Skip this practice question')+
    ' for one Crownlight Spark? It will not count as an independently correct answer.';
   passConfirmation.hidden=false;passConfirm.focus?.();
  };
  listen(passReveal,'click',()=>choose('reveal'));
  listen(passSkip,'click',()=>choose('skip'));
  listen(passCancel,'click',()=>{passPending='';passConfirmation.hidden=true;passFeedback.textContent='No credit used.'});
  listen(passConfirm,'click',async()=>{
   if(passBusy||passUsed||!passPending||passAvailable<1)return;
   passBusy=true;onCreditPending?.(true);passConfirm.disabled=true;passReveal.disabled=passSkip.disabled=true;
   submitReflection.disabled=true;
   const chosen=passPending,idx=questionIndex;
   passFeedback.textContent='Confirming your Crownlight Sparks…';
   try{
    const result=await onCreditAction({action:chosen,index:idx});
    if(passDisposed)return;
    if(result?.ok!==true)throw Error('Credit use could not be confirmed.');
    passUsed=true;passPending='';passConfirmation.hidden=true;
    showPassBalance(result.balance);
    const answerText=String(result.answerText||'This question is recorded as Study Only.');
    passFeedback.textContent=answerText+' One credit was used'+(result.alreadyUsed?' previously':'')+'.';
    reply.textContent='This step is marked Study Only. It is not graded.';
    reflection.disabled=true;submitReflection.disabled=true;
    passContinue.hidden=false;
    passContinue.textContent=idx===prompts.length-1?'Continue to next learning stage':'Continue to next practice question';
   }catch(error){
    if(!passDisposed)passFeedback.textContent=String(error?.message||'Credit service unavailable. No new credit was confirmed.');
    passReveal.disabled=passSkip.disabled=passAvailable<1;
    submitReflection.disabled=false;
   }finally{
    passBusy=false;onCreditPending?.(false);passConfirm.disabled=false;
   }
  });
  listen(passContinue,'click',()=>{
   if(!passUsed||finished)return;
   const final=questionIndex===prompts.length-1;
   saved[questionIndex]='Study Only — Crownlight Sparks';
   if(final){
    finished=true;passContinue.hidden=true;
    counter.textContent='Practice completed with assistance';
    onComplete?.({stage,answers:[...saved],assisted:true});
   }else{
    questionIndex++;
    reflection.disabled=false;submitReflection.disabled=false;
    paintQuestion();resetPassQuestion();
    reflection.focus?.();
   }
  });
 }
 // Keep the suggested conversational questions available OUTSIDE the
 // concealed assessment-response form, so learners can always ask Talia
 // for an explanation without opening Check My Understanding.
 interaction.append(counter,prompt,reflection,submitReflection);
 if(stage===4&&typeof onCreditAction==='function')interaction.append(creditControls);
 interaction.hidden=stage===0||stage===1;
 transcript.append(memberQuestion,interaction,suggestions,reply);
 let stopTyping=animate(visual,full,seen,skip);
 function resumeTeaching(){
  stepToolbar.hidden=true;
  featureLesson=null;featurePhase=0;understandingMode=false;
  transcriptTitle.textContent=initialLessonTitle;
  transcriptTitle.hidden=!initialLessonTitle;
  reserve.textContent=full;accessible.textContent=full;
  stopTyping?.();stopTyping=animate(visual,full,true,skip);
  paintQuestion();
 }
 // Supplementary teaching must never insert a generic reflective question
 // or require two typed responses just to hear the explanation.
 function teachDirect(label,paragraphs=[],requested=''){
  const lines=(Array.isArray(paragraphs)?paragraphs:[]).map(line=>String(line||'').trim()).filter(Boolean);
  if(!lines.length)return false;
  const wasFocus=Boolean(featureLesson||understandingMode);
  featureLesson=null;featurePhase=0;understandingMode=false;
  if(wasFocus)paintQuestion();
  stepToolbar.hidden=true;
  transcriptTitle.textContent=label;
  transcriptTitle.hidden=false;
  const narration=lines.join('\n\n');
  reserve.textContent=narration;accessible.textContent=label+'\n\n'+narration;
  stopTyping?.();stopTyping=animate(visual,narration,false,skip);
  memberQuestion.textContent=requested?'You asked: '+requested:'';
  reply.textContent=requested?'Talia has answered your question. Continue with the lesson when ready.':'';
  // A lesson explanation is not a request for a new assessment answer.
  if(stage===1&&!understandingMode)interaction.hidden=true;
  return true;
 }
 let referenceSteps=[],referenceIndex=0,referenceTitle='';
 function displayReferenceStep(nextIndex){
  if(!referenceSteps.length)return false;
  referenceIndex=Math.max(0,Math.min(referenceSteps.length-1,nextIndex));
  const opening=referenceIndex===0
   ?'We will take this together, one part at a time. Look at the candle as I explain.'
   :'Let us work through the next part before moving on.';
  const heading=referenceTitle+' · Step '+(referenceIndex+1)+' of '+referenceSteps.length;
  const result=teachDirect(heading,[opening,referenceSteps[referenceIndex]]);
  stepToolbar.hidden=false;
  stepState.textContent='Step '+(referenceIndex+1)+' of '+referenceSteps.length;
  stepBack.disabled=referenceIndex===0;
  stepNext.disabled=referenceIndex>=referenceSteps.length-1;
  stepNext.textContent=stepNext.disabled?'All teaching steps shown':'Next teaching step';
  return result;
 }
 listen(stepBack,'click',()=>displayReferenceStep(referenceIndex-1));
 listen(stepNext,'click',()=>displayReferenceStep(referenceIndex+1));
 function teachFeature({type,feature,custom,values}={}){
  if(!custom&&!root.GroundUpLabV34InteractiveLessons?.get)return false;
  const base=custom||root.GroundUpLabV34InteractiveLessons.get({
   type,feature,concept,guide:lessonContext.guide,
   labId:lessonContext.labId,bridge:lessonContext.bridge,teaching:lessonContext.teaching
  });
  // Keep the teaching example consistent with the actual illustrated
  // downward candle when the learner is studying Bearish Candle.
  const bearish=/\bbearish candle\b/i.test(concept)&&type==='candle'&&!custom;
  const bearishCases={
   all:'For this illustrative five-minute BEARISH candle, Open=$32.00, High=$32.50, Low=$30.50, Close=$31.00. The close is $1.00 below the open. The body is $1.00 and the $2.00 full range makes its body share 50%.',
   open:'The candle first recorded $32.00. It later closed at $31.00, so it is a bearish candle.',
   close:'The final observed price for this five-minute interval was $31.00, below the $32.00 open.',
   high:'The highest observed price in this illustrative candle is $32.50.',
   low:'The lowest observed price in this illustrative candle is $30.50.',
   body:'Real body=|$31.00−$32.00|=$1.00, measured between Open and Close.',
   range:'Full range=$32.50−$30.50=$2.00, measured from High to Low.',
   percent:'Body share of full range=$1.00÷$2.00×100=50%. The negative price direction does not make the body percentage negative.'
  };
  const numeric=values&&['o','hv','l','c'].every(key=>Number.isFinite(Number(values[key])))
   &&Number(values.hv)>Number(values.l);
  let plan=bearish?{...base,example:bearishCases[feature]||bearishCases.all}:base;
  if(type==='candle'&&numeric&&!custom){
   const {o,hv,l,c}=values;
   const money=n=>String.fromCharCode(36)+Number(n).toFixed(2);
   const body=Math.abs(c-o),range=hv-l,percent=(100*body/range).toFixed(1);
   const example='The selected illustrative candle currently displays Open '+money(o)+
    ', High '+money(hv)+', Low '+money(l)+', Close '+money(c)+
    '. Body = '+money(body)+'; full range = '+money(range)+
    '; body percentage = '+percent+'%. It is '+(c>o?'bullish':c<o?'bearish':'a doji')+
    '. These observations do not predict the next candle.';
   plan={...plan,example};
  }
  featureLesson={...plan,type:type||lessonContext.visualType,feature:feature||'supplement'};
  featurePhase=0;understandingMode=false;
  const exact=root.GroundUpLabV34InteractiveLessons?.referenceIntro?.(type);
  const startsReference=stage===1&&exact&&!bearish&&(!numeric||
   (Number(values.o)===31&&Number(values.hv)===32.5&&Number(values.l)===30.5&&Number(values.c)===32))&&(
   (type==='candle'&&feature==='all')||
   (type==='vwap'&&feature==='price')
  );
  if(startsReference&&type==='candle'){
   referenceTitle='The completed candlestick';
   referenceSteps=[...exact.steps];
   return displayReferenceStep(0);
  }
  referenceSteps=[];
  stepToolbar.hidden=true;
  const short=custom?.narration||plan.script|| (startsReference?[
   exact.title+'. Here is what you will learn.',
   exact.term+': '+exact.definition,
   'Why it matters: '+exact.why,
   'Follow this separate illustrative demonstration: '+exact.example,
   ...exact.steps.map((value,i)=>'Step '+(i+1)+': '+value),
   'Remember this limitation: '+exact.caution
  ].join('\n\n'):[
   plan.title+'.',
   'What it means: '+plan.definition,
   'Why it matters: '+plan.why,
   'Look at the highlighted illustration: '+plan.method,
   // Each clicked feature shows its worked example BEFORE the question.
   'Worked example: '+plan.example
  ].join('\n\n'));
  const candleFormula=type==='candle'
   ?'Real body = |Close − Open|. Full range = High − Low. Body percentage = (real body ÷ full range) × 100. These completed values cannot predict the next candle. If High equals Low, the percentage is undefined because division by zero is not permitted.'
   :'';
  const narration=candleFormula&&!plan.script?short+'\n\n'+candleFormula:short;
  if(stage===1||stage===2){
   return teachDirect(plan.title,[narration]);
  }
  reserve.textContent=narration;
  accessible.textContent=narration;
  stopTyping?.();stopTyping=animate(visual,narration,false,skip);
  counter.textContent='Interactive lesson · '+plan.title;
  prompt.textContent=custom?.question||plan.question;
  reflection.value='';
  reflection.disabled=false;submitReflection.hidden=false;submitReflection.disabled=false;
  reply.textContent='Observe the highlighted chart evidence, then answer in your own words.';
  return true;
 }
 function teachWorkedStep({index=0,total=1,text='',feature='all'}={}){
  const explanation=String(text||'').trim();
  if(!explanation)return false;
  return teachDirect('Worked example · step '+(index+1)+' of '+total,[
   explanation,
   'Common mistake: '+String(plan?.misconception||'Use the prices shown; never assume an unseen candle.'),
   'Limitation: '+String(plan?.limitation||'This illustrative completed example cannot predict the next candle.')
  ],'Show and explain worked step '+(index+1));
 }
 function teachSupplement(label,paragraphs=[]){
  const content=(Array.isArray(paragraphs)?paragraphs:[]).map(x=>String(x||'').trim()).filter(Boolean);
  if(!content.length)return false;
  const formula=lessonContext.visualType==='candle'?[
   'Real body = |Close − Open|. Full range = High − Low. Body percentage = (real body ÷ full range) × 100. These completed values cannot predict the next candle. If High equals Low, the percentage is undefined because division by zero is not permitted.'
  ]:[];
  return teachDirect(label,[...content,...formula],label);
 }
 function askUnderstanding(){
  if(!plan?.check)return false;
  understandingMode=true;featureLesson=null;featurePhase=0;
  interaction.hidden=false;
  const message='Now that you have studied the visual demonstration, check your understanding:\n\n'+plan.check.question;
  reserve.textContent=message;accessible.textContent=message;
  stopTyping?.();stopTyping=animate(visual,message,false,skip);
  counter.textContent='Check your understanding · ungraded';
  prompt.textContent=plan.check.question;
  reflection.value='';reflection.disabled=false;
  submitReflection.hidden=false;submitReflection.disabled=false;
  reply.textContent='Use the illustrated example to support your answer. You can retry.';
  reflection.focus?.();
  return true;
 }
  // Every authored or competency-led lesson gets the same interactive
 // understanding/recognition/application/mistake/transfer teaching affordance.
 // This does not assert that each of the 419 cases has accepted editorial data.
 const topicTools=el('div',undefined,'gu-v34-topic-tools');
 topicTools.setAttribute('role','group');topicTools.setAttribute('aria-label','Choose a teaching focus');
 for(const [focus,label] of [
  ['understand','Understand'],['recognize','Recognize'],
  ['apply','Apply'],['mistake','Common mistake'],['limits','Limitations']
 ]){
  const control=el('button',label,'btn secondary gu-v34-topic-button');
  control.type='button';
  listen(control,'click',()=>teachFeature({type:lessonContext.visualType||'general',feature:focus}));
  topicTools.append(control);
 }
 if(stage===1||stage===2||stage===4||stage===6)rootEl.insertBefore?.(topicTools,transcript);
 const objectivesPanel=el('section',undefined,'gu-v33-instructor-objectives');
 objectivesPanel.append(el('h4','Your learning objectives'));
 const objectives=el('ol');
 for(const objective of plan?.objectives||[])objectives.append(el('li',objective));
 objectivesPanel.append(objectives);
 // Worked cases are now selected directly in the chart/visual area and
 // narrated by Talia one step at a time; never duplicate a static list here.
 if(stage===1&&plan?.check){
  const startCheck=el('button','Check my understanding','btn secondary gu-v35-understanding');
  startCheck.type='button';
  listen(startCheck,'click',()=>{
   // Restore the supporting VWAP overlay before asking the learner to
   // interpret the weighted reference, even if Price-only was selected.
   if(lessonContext.visualType==='vwap'&&typeof CustomEvent==='function')
    rootEl.dispatchEvent?.(new CustomEvent('gu-v36-show-check-evidence',{
     bubbles:true,detail:{type:'vwap'}
    }));
   askUnderstanding();
  });
  rootEl.append(startCheck);
 }
 // The common-mistake request is a clickable instructor-chat suggestion
 // in the dialogue above, not another disclosure panel.
 // Example provenance remains in the Lab source-information area, not the instructor dialogue.
 let pending=null,disposed=false;
 const tutor=el('section',undefined,'gu-v33-tutor');
 tutor.append(el('h4','Ask Market Tutor about this concept'));
 const history=el('ol',undefined,'gu-v33-tutor-history');
 history.setAttribute('aria-label','Current Lab Tutor conversation');
 for(const turn of (Array.isArray(conversation)?conversation:[]).slice(-8)){
  if(!turn||typeof turn.question!=='string'||typeof turn.answer!=='string')continue;
  const item=el('li',undefined,'gu-v33-tutor-turn');
  item.append(el('strong','You · '+String(STEPS[turn.stage]||'Lab')),
   el('p',turn.question),el('strong',turn.generation==='grounded-model-draft'?'Talia · AI draft':'Talia · source-guided'),el('p',turn.answer));
  history.append(item);
 }
 if(history.children.length)tutor.append(history);
 tutor.append(el('p','Ask a question about this lesson. Responses are educational and subject to your membership access and usage limits. Please omit personal financial information.','gu-v33-tutor-note'));
 const questionLabel=el('label','Your general learning question');
 const question=el('textarea');question.rows=2;question.maxLength=240;question.placeholder='What does this concept mean, and how can I recognize it?';questionLabel.append(question);
 const actionRow=el('div',undefined,'gu-v33-tutor-actions');
 const ask=el('button','Ask Market Tutor');ask.type='button';ask.className='btn secondary';
 const dismiss=el('button','Cancel request');dismiss.type='button';dismiss.className='btn secondary';dismiss.hidden=true;
 actionRow.append(ask,dismiss);
 const message=el('p','', 'gu-v33-tutor-status');message.setAttribute('role','status');
 const answer=el('div',undefined,'gu-v33-tutor-answer');answer.hidden=true;
 const answerText=el('p');const answerAccessible=el('p',undefined,'gu-v33-instructor-accessible');
 const answerVisual=el('p',undefined,'gu-v33-instructor-typing');answerVisual.setAttribute('aria-hidden','true');
 answer.append(answerAccessible,answerVisual);
 let cancelAnswer=null;
 const respond=(messageText,isError=false)=>{message.textContent=messageText;message.className='gu-v33-tutor-status'+(isError?' error':'')};
 const askTutor=async()=>{
  if(disposed||typeof requestTutor!=='function'||pending)return;
  let typed=question.value.trim().replace(/[\u0000-\u001f\u007f]/g,' ');
  if(!typed)typed='Explain this concept in beginner-first terms with an example and one limitation.';
  if(typed.length>240){respond('Limit your question to 240 characters.',true);return}
  const safeTopic=String(subject||'market learning').slice(0,100);
  // Topic is whitelisted upstream by lab-player; the user's text is only
  // their explicitly submitted new question, never saved learner form data.
  const outbound=('For the general topic "'+safeTopic+'": '+typed).slice(0,450);
  const controller=new AbortController();pending=controller;ask.disabled=true;dismiss.hidden=false;
  answer.hidden=true;respond('Requesting an educational response from Market Tutor…');
  try{
   const data=await requestTutor({question:outbound,stage,allowModel:allowTutorAI===true,signal:controller.signal});
   if(disposed||controller.signal.aborted)return;
   const response=String(data?.answer||'').trim();
   if(!response)throw Error('Market Tutor did not return an explanation.');
   const ai=data.generation==='grounded-model-draft';
   answer.hidden=false;cancelAnswer?.();
   answerAccessible.textContent=response;
   onTutorExchange?.({question:typed,answer:response,generation:data.generation,stage});
   const replay=el('button','Show full answer');replay.type='button';replay.className='btn secondary gu-v33-instructor-skip';
   answer.append(replay);
   cancelAnswer=animate(answerVisual,response,seen,replay);
   respond((ai?'AI-generated educational draft':'Source-grounded Market Tutor response')+
    '. Not official grading or investment advice. '+(data.aiReason&&data.aiReason!=='source_only'&&allowTutorAI&&!ai?'AI draft not available; source-grounded explanation shown.':''));
  }catch(error){
   if(error?.name!=='AbortError'&&!disposed)respond(error?.message||'Tutor unavailable; the concept lessons remain accessible.',true);
  }finally{
   if(pending===controller)pending=null;
   if(!disposed){ask.disabled=false;dismiss.hidden=true}
  }
 };
 listen(ask,'click',askTutor);
 listen(dismiss,'click',()=>{pending?.abort();pending=null;ask.disabled=false;dismiss.hidden=true;respond('Request cancelled.')});
 const link=el('a','Open full Market Tutor');link.href='/market-tutor.html';link.target='_blank';link.rel='noopener noreferrer';
 tutor.append(questionLabel,actionRow,message,answer,link);
 // One shared content area switches between objectives and Tutor; each
 // item is a real accessible tab, never a disclosure stacked on the other.
 const support=el('section',undefined,'gu-v33-support-tabs');
 support.setAttribute('aria-label','Learning support');
 const tablist=el('div',undefined,'gu-v33-support-tablist');
 tablist.setAttribute('role','tablist');tablist.setAttribute('aria-label','Learning support');
 const objectiveTab=el('button','Review your learning objectives','gu-v33-support-tab');
 const tutorTab=el('button','Ask Market Tutor about this concept','gu-v33-support-tab');
 const panel=el('div',undefined,'gu-v33-support-content');
 const unique='gu-v33-tab-'+String(++tabSequence);
 const walletTab=[0,1].includes(stage)?el('button','Crownlight Sparks Wallet','gu-v33-support-tab'):null;
  if(walletTab)walletTab.classList.add('gu-v33-wallet-tab');
 const walletPane=[0,1].includes(stage)?el('section',undefined,'gu-v33-wallet-panel'):null;
 const items=[{button:objectiveTab,pane:objectivesPanel,key:'objectives'},
  {button:tutorTab,pane:tutor,key:'tutor'}];
 if(walletTab&&walletPane)items.push({button:walletTab,pane:walletPane,key:'wallet'});
 for(const item of items){
  item.button.type='button';item.button.setAttribute('role','tab');
  item.button.id=unique+'-'+item.key;
  item.pane.id=unique+'-'+item.key+'-panel';
  item.pane.setAttribute('role','tabpanel');
  item.pane.setAttribute('aria-labelledby',item.button.id);
  item.button.setAttribute('aria-controls',item.pane.id);
  item.button.setAttribute('aria-selected','false');
  item.pane.hidden=true;
  tablist.append(item.button);panel.append(item.pane);
 }
 let current=null;
 const activate=key=>{
  current=current===key?null:key;
  for(const item of items){
   const active=item.key===current;
   item.button.setAttribute('aria-selected',String(active));
   item.button.setAttribute('tabindex',active||(current===null&&item.key==='objectives')?'0':'-1');
   item.pane.hidden=!active;
  }
 };
 for(const item of items){
  listen(item.button,'click',()=>activate(item.key));
  listen(item.button,'keydown',event=>{
   if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
   event.preventDefault();
   const index=items.indexOf(item);
   const next=event.key==='Home'?0:event.key==='End'?items.length-1:
    (index+(event.key==='ArrowRight'?1:-1)+items.length)%items.length;
   current=null;activate(items[next].key);items[next].button.focus();
  });
 }
 support.append(tablist,panel);rootEl.append(support);
 const openTutor=()=>{
  if(current!=='tutor')activate('tutor');
  tutorTab.focus?.();support.scrollIntoView?.({behavior:'smooth',block:'nearest'});
  question.focus?.();
 };
 return {element:rootEl,openTutor,teachFeature,teachWorkedStep,teachSupplement,askUnderstanding,resumeTeaching,
  setStartSetup(setup){
   if(stage!==0||!setup)return;
   head.replaceChildren(setup);head.className+=' gu-v33-start-setup-head';head.hidden=false;
  },
  setWalletContent(wallet){
   if(!walletPane||!wallet)return;
   walletPane.replaceChildren(wallet);
  },
  dispose(){
  disposed=true;passDisposed=true;stopTyping();cancelAnswer?.();pending?.abort();pending=null;
 }};
}
root.GroundUpLabV33Instructor=Object.freeze({create,version:'LAB-UX-STD-001-tutor-v1'});
})(globalThis);
