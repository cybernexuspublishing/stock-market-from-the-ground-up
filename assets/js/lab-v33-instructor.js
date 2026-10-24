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
function create({stage=0,subject='market evidence',concept='',requestTutor,seen=false,lessonContext={},memberFirstName='',allowTutorAI=true,initialReflection='',onReflection,questions=[],initialAnswers=[],onAnswer,onComplete}={}){
 if(!SAFE_STAGES.has(stage))return null;
 const rootEl=el('section',undefined,'gu-v33-instructor');
 rootEl.setAttribute('aria-label','Talia, learning instructor and Market Tutor');
 const title=el('h3','Talia');
 const head=el('div',undefined,'gu-v33-instructor-head');
 const avatar=el('span','T','gu-v33-instructor-avatar');
 avatar.setAttribute('aria-hidden','true');
 const identity=el('div',undefined,'gu-v33-instructor-identity');
 identity.append(title);
 head.append(avatar,identity);rootEl.append(head);
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
   ?((firstName?firstName+', let’s':'Let’s')+' work through this concept together. I’ll define the terms, show you a worked example, and explain what the evidence actually establishes.')
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
 const full=introduction+'\n\n'+(openingBlocks?.join('\n\n')||(
  String(lessonContext?.teaching?.what||lessonContext?.guide?.concept||
  lessonContext?.subject?.definition||'').trim()||
  'This concept needs an individually reviewed teaching explanation before it can be presented as complete.'
 ));
 // Full lesson narration remains immediately available to assistive technology.
 // The animated copy is visual-only to avoid dozens of screen reader updates.
 const accessible=el('p',full,'gu-v33-instructor-accessible');
 const transcript=el('div',undefined,'gu-v33-instructor-narration');
 const reserve=el('p',full,'gu-v33-instructor-reserve');reserve.setAttribute('aria-hidden','true');
 const visual=el('p',undefined,'gu-v33-instructor-typing');visual.setAttribute('aria-hidden','true');
 transcript.append(reserve,visual);
 const controls=el('div',undefined,'gu-v33-instructor-controls');
 const skip=el('button','Show full text');skip.type='button';skip.className='btn secondary gu-v33-instructor-skip';
 controls.append(skip);
 rootEl.append(accessible,transcript,controls);
 // Talia speaks each question IN her narration box. The member's answer
 // is collected there, not in a disconnected form below the lesson.
 // Every accepted response advances to the next question; a completed
 // set asks the universal engine to advance the appropriate study stage.
 // Reviewed grades and locked independent decisions remain server-owned.
 const fallbackQuestion=stage===0
  ?'What does '+String(concept||subject).slice(0,90)+' mean in your own words?'
  :'What evidence supports your interpretation, and what remains uncertain?';
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
 const submitReflection=el('button','Submit answer','btn secondary gu-v33-instructor-submit');
 submitReflection.type='button';
 function paintQuestion(){
  counter.textContent='Question '+(questionIndex+1)+' of '+prompts.length;
  prompt.textContent=prompts[questionIndex];
  reflection.value=String(saved[questionIndex]||(!saved.length&&questionIndex===0?initialReflection:''));
  reply.textContent='';
  submitReflection.disabled=false;
 }
 let submitting=false,finished=false,featureLesson=null,featurePhase=0;
 const submit=async()=>{
  if(submitting||finished)return;
  const value=reflection.value.trim(),index=questionIndex,isFinal=index===prompts.length-1;
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
 paintQuestion();
 interaction.append(counter,prompt,reflection,submitReflection,reply);
 transcript.append(interaction);
 let stopTyping=animate(visual,full,seen,skip);
 function resumeTeaching(){
  featureLesson=null;featurePhase=0;
  reserve.textContent=full;accessible.textContent=full;
  stopTyping?.();stopTyping=animate(visual,full,true,skip);
  paintQuestion();
 }
 function teachFeature({type,feature}={}){
  if(!root.GroundUpLabV34InteractiveLessons?.get)return false;
  const plan=root.GroundUpLabV34InteractiveLessons.get({
   type,feature,concept,guide:lessonContext.guide
  });
  featureLesson=plan;featurePhase=0;
  const short=plan.title+'.\\n\\n'+plan.definition+
   '\\n\\nWhy: '+plan.why+'\\n\\nHow: '+plan.method;
  reserve.textContent=short;
  accessible.textContent=short;
  stopTyping?.();stopTyping=animate(visual,short,false,skip);
  counter.textContent='Interactive lesson · '+plan.title;
  prompt.textContent=plan.question;
  reflection.value='';
  reflection.disabled=false;submitReflection.hidden=false;submitReflection.disabled=false;
  reply.textContent='Observe the highlighted chart evidence, then answer in your own words.';
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
 if(plan?.worked?.length){
  const worked=el('section',undefined,'gu-v33-instructor-worked');
  worked.append(el('h4',plan.category==='general'?'Guided method demonstration':'Worked example — different fictional case'));
  const steps=el('ol');
  for(const [index,explanation] of plan.worked.entries()){
   const line=el('li',explanation);
   if(stage===1&&plan.category==='candle'){
    const features=['all','body','percent'];
    const labels=['Show the four prices on the candle','Highlight the real body','Show body-to-range calculation'];
    const control=el('button',labels[index]||'Point to this on the chart','gu-v33-instructor-chart-link');
    control.type='button';
    control.setAttribute('data-linked-feature',features[index]||'all');
    listen(control,'click',()=>{
     const chart=rootEl.closest?.('.gu-v33-stage-hero')?.querySelector?.('.gu-l33-graphic');
     const button=chart?.querySelector?.('[data-teaching-feature="'+(features[index]||'all')+'"]');
     if(button)button.click();
    });
    line.append(control);
   }
   steps.append(line);
  }
  worked.append(steps);
  rootEl.append(worked);
 }
 if(plan?.check){
  const check=el('section',undefined,'gu-v33-instructor-check');
  check.append(el('h4','Check your understanding'));
  const stem=el('p',plan.check.question);check.append(stem);
  const answers=el('div',undefined,'gu-v33-instructor-choices');
  const correct=plan.check.correct;
  const inputName='gu-instructor-'+String(Math.round(Math.random()*1e9));
  const radios=[];
  for(const [i,choice] of plan.check.choices.entries()){
   const label=el('label',undefined,'gu-v33-instructor-choice');
   const radio=el('input');radio.type='radio';radio.name=inputName;radio.value=String(i);
   radios.push(radio);
   label.append(radio,document.createTextNode(choice));answers.append(label);
  }
  const feedback=el('p','', 'gu-v33-instructor-check-feedback');feedback.setAttribute('role','status');
  const submit=el('button','Check my understanding');submit.className='btn secondary';submit.type='button';
  listen(submit,'click',()=>{
   const n=radios.findIndex(x=>x.checked);
   if(n===-1){feedback.textContent='Choose an answer to check your understanding.';return;}
   feedback.textContent=(n===correct?'Correct. ':'Not quite. ')+plan.check.feedback+
    ' This is practice feedback, not an independent assessment.';
  });
  check.append(answers,submit,feedback);rootEl.append(check);
 }
 if(plan?.misconception&&stage===1){
  const other=el('details',undefined,'gu-v33-instructor-alternative');
  other.append(el('summary','Talia, explain the common mistake'));
  other.append(el('p',plan.misconception));
  if(plan.limitation)other.append(el('p','What you cannot conclude: '+plan.limitation));
  rootEl.append(other);
 }
 // Example provenance remains in the Lab source-information area, not the instructor dialogue.
 let pending=null,disposed=false;
 const tutor=el('section',undefined,'gu-v33-tutor');
 tutor.append(el('h4','Ask Market Tutor about this concept'));
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
   const data=await requestTutor({question:outbound,allowModel:allowTutorAI===true,signal:controller.signal});
   if(disposed||controller.signal.aborted)return;
   const response=String(data?.answer||'').trim();
   if(!response)throw Error('Market Tutor did not return an explanation.');
   const ai=data.generation==='grounded-model-draft';
   answer.hidden=false;cancelAnswer?.();
   answerAccessible.textContent=response;
   const replay=el('button','Show full answer');replay.type='button';replay.className='btn secondary gu-v33-instructor-skip';
   answer.append(replay);
   cancelAnswer=animate(answerVisual,response,seen,replay);
   respond((ai?'AI-generated educational draft':'Source-grounded Market Tutor response')+
    '. Not official grading or investment advice. '+(data.aiReason&&allowTutorAI&&!ai?'AI draft not available; source-grounded explanation shown.':''));
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
 const walletTab=stage===0?el('button','Question Pass Wallet','gu-v33-support-tab'):null;
 const walletPane=stage===0?el('section',undefined,'gu-v33-wallet-panel'):null;
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
 return {element:rootEl,openTutor,teachFeature,resumeTeaching,
  setWalletContent(wallet){
   if(!walletPane||!wallet)return;
   walletPane.replaceChildren(wallet);
  },
  dispose(){
  disposed=true;stopTyping();cancelAnswer?.();pending?.abort();pending=null;
 }};
}
root.GroundUpLabV33Instructor=Object.freeze({create,version:'LAB-UX-STD-001-tutor-v1'});
})(globalThis);
