/* LAB-UX-STD-001 — in-workstation instructional narration and Market Tutor.
 * Presentation-only typing is NOT live model streaming. The optional, explicitly
 * requested Tutor response is returned by the existing authenticated service.
 * Never send user answers, rubrics, grades, future bars or historical replay
 * evidence. All responses are ungraded; this module grants no access.
 */
(function(root){
'use strict';
const STEPS=['Start','Learn','Experiment','Predict','Practice','Assess','Review','Transfer','Results'];
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
  at=Math.min(text.length,Math.floor((t-last)*0.20)+1);
  node.textContent=text.slice(0,at);
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
function create({stage=0,subject='market evidence',concept='',requestTutor,seen=false,lessonContext={}}={}){
 if(!SAFE_STAGES.has(stage))return null;
 const rootEl=el('section',undefined,'gu-v33-instructor');
 rootEl.setAttribute('aria-label','Avery, your virtual learning instructor, and Market Tutor');
 const title=el('h3','Avery — Your Learning Instructor');
 const tag=el('span','Virtual course guide · One-to-one teaching','gu-v33-instructor-tag');
 const head=el('div',undefined,'gu-v33-instructor-head');
 const avatar=el('span','A','gu-v33-instructor-avatar');
 avatar.setAttribute('aria-hidden','true');
 const identity=el('div',undefined,'gu-v33-instructor-identity');
 identity.append(title,tag);
 head.append(avatar,identity);rootEl.append(head);
 const plan=root.GroundUpLabV33InstructionContent?.lesson?.({
  ...lessonContext,stage,concept
 })||null;
 const introduction=stage===0
  ?'Hello. I’m Avery, your virtual learning instructor. We’ll work through this lesson together, one idea at a time. I’ll demonstrate each skill before you practice it.'
  :stage===1
   ?'Let’s work through this concept together. I’ll define the terms, show you a worked example, and explain what the evidence actually establishes.'
   :stage===2
    ?'Now you can change one variable and see how the example responds. I’ll help you distinguish what changes from what remains unknown.'
    :stage===4
     ?'Let’s practice with an unfamiliar case. I’ll remind you of the method, then you make the calculation or decision.'
     :stage===6
      ?'Let’s examine the reasoning, including where an interpretation can go wrong and how to correct it.'
      :stage===7
       ?'Now apply the same method to a different case. Use only evidence available at the current pause.'
       :'You’ve reached the lesson review. Here are the essential ideas to carry into your next exercise.';
 const full=introduction+'\n\n'+(plan?.blocks?.join('\n\n')||(
  String(lessonContext?.teaching?.what||lessonContext?.guide?.concept||
  lessonContext?.subject?.definition||'').trim()||
  'This concept needs an individually reviewed teaching explanation before it can be presented as complete.'
 ));
 // Full lesson narration remains immediately available to assistive technology.
 // The animated copy is visual-only to avoid dozens of screen reader updates.
 const accessible=el('p',full,'gu-v33-instructor-accessible');
 const visual=el('p',undefined,'gu-v33-instructor-typing');visual.setAttribute('aria-hidden','true');
 const controls=el('div',undefined,'gu-v33-instructor-controls');
 const skip=el('button','Show full text');skip.type='button';skip.className='btn secondary gu-v33-instructor-skip';
 controls.append(skip);
 rootEl.append(accessible,visual,controls);
 const stopTyping=animate(visual,full,seen,skip);
 if(stage===0&&plan?.objectives?.length){
  const optional=el('details',undefined,'gu-v33-instructor-objectives');
  optional.append(el('summary','Review your learning objectives'));
  const objectives=el('ol');
  for(const objective of plan.objectives)objectives.append(el('li',objective));
  optional.append(objectives);
  rootEl.append(optional);
 }
 if(plan?.worked?.length){
  const worked=el('section',undefined,'gu-v33-instructor-worked');
  worked.append(el('h4',plan.category==='general'?'Guided method demonstration':'Worked example — different fictional case'));
  const steps=el('ol');
  for(const explanation of plan.worked)steps.append(el('li',explanation));
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
  other.append(el('summary','Avery, explain the common mistake'));
  other.append(el('p',plan.misconception));
  if(plan.limitation)other.append(el('p','What you cannot conclude: '+plan.limitation));
  rootEl.append(other);
 }
 if(plan?.sourceNote)rootEl.append(el('p',plan.sourceNote,'gu-v33-instructor-provenance'));
 let pending=null,disposed=false;
 const tutor=el('details',undefined,'gu-v33-tutor');
 const summary=el('summary','Ask Market Tutor about this concept');
 tutor.append(summary);
 tutor.append(el('p','Market Tutor uses your existing membership, server quotas and protected educational service. Only the general subject and question you choose are submitted. Do not enter personal information, private assessment questions or trading-account details.','gu-v33-tutor-note'));
 const questionLabel=el('label','Your general learning question');
 const question=el('textarea');question.rows=2;question.maxLength=240;question.placeholder='What does this concept mean, and how can I recognize it?';questionLabel.append(question);
 const consentRow=el('label',undefined,'gu-v33-tutor-consent');
 const consent=el('input');consent.type='checkbox';consent.checked=false;
 consentRow.append(consent,document.createTextNode('Allow an AI-generated explanation if my Market Tutor entitlement and daily quota permit it'));
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
   const data=await requestTutor({question:outbound,allowModel:consent.checked===true,signal:controller.signal});
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
    '. Not official grading or investment advice. '+(data.aiReason&&consent.checked&&!ai?'AI draft not available; source-grounded explanation shown.':''));
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
 tutor.append(questionLabel,consentRow,actionRow,message,answer,link);
 rootEl.append(tutor);
 return {element:rootEl,dispose(){
  disposed=true;stopTyping();cancelAnswer?.();pending?.abort();pending=null;
 }};
}
root.GroundUpLabV33Instructor=Object.freeze({create,version:'LAB-UX-STD-001-tutor-v1'});
})(globalThis);
