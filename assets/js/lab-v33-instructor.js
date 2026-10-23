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
function brief(stage,subject,concept){
 const base=String(subject||'market evidence');
 const source=String(concept||'').slice(0,180);
 const suffix=source&&source.toLowerCase()!==base.toLowerCase()?' Your current learning topic is '+source+'.':'';
 return [
  'Welcome to this learning workstation. I will introduce the concept, show the evidence, and help you understand the procedure before you practice.',
  'We will examine '+base+' one component at a time. Read the explanation alongside the illustrated example and identify what the chart can—and cannot—establish.'+suffix,
  'Try changing one permitted input and notice how the displayed example responds. An illustrated result is not a historical market observation.',
  'Record your expectation before the next result is revealed.',
  'Use the evidence in the example and work through the question. You may make mistakes and retry. An incorrect attempt is an opportunity to understand the method, not a trading loss.',
  'This independent assessment remains protected from instructional hints.',
  'Review your reasoning, the applicable method, and the conditions that would change your interpretation. Helped practice is not independent mastery.',
  'Apply what you learned to a different case. In replay activities, the next market observation must remain concealed until your analysis is locked.',
  'Review the learning evidence and identify one concept to practice again. Official competency results come only from the protected assessment service.'
 ][stage]||'';
}
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
function create({stage=0,subject='market evidence',concept='',requestTutor,seen=false}={}){
 if(!SAFE_STAGES.has(stage))return null;
 const rootEl=el('section',undefined,'gu-v33-instructor');
 rootEl.setAttribute('aria-label','Learning instructor and Market Tutor');
 const title=el('h3','Your learning instructor');
 const tag=el('span','Lesson narration · not AI-generated','gu-v33-instructor-tag');
 const head=el('div',undefined,'gu-v33-instructor-head');head.append(title,tag);rootEl.append(head);
 const full=brief(stage,subject,concept);
 // Full lesson narration remains immediately available to assistive technology.
 // The animated copy is visual-only to avoid dozens of screen reader updates.
 const accessible=el('p',full,'gu-v33-instructor-accessible');
 const visual=el('p',undefined,'gu-v33-instructor-typing');visual.setAttribute('aria-hidden','true');
 const controls=el('div',undefined,'gu-v33-instructor-controls');
 const skip=el('button','Show full text');skip.type='button';skip.className='btn secondary gu-v33-instructor-skip';
 controls.append(skip);
 rootEl.append(accessible,visual,controls);
 const stopTyping=animate(visual,full,seen,skip);
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
