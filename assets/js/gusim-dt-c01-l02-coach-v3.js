/* DT-C01-L02 Prototype V2-style Talia instructor + server-gated fictional replay transport.
 * Separate roles: Talia teaches already-revealed evidence; verified-replay-v01492
 * alone authenticates, locks first decisions, and requests next candles.
 * No early OHLCV arrays, hidden responses, grading or paid transactions.
 */
(function(root){'use strict';
 const CODE='GUSIM_DT_C01_L02',TOTAL=24;
 const $=id=>document.getElementById(id);
 const create=(tag,cls,txt)=>{
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(txt!==undefined)n.textContent=txt;
  return n;
 };
 const chapters=[
  {title:'Start — What day trading demands',text:
   'I’m Talia. Before we press Play, I want you to learn how a trader decides whether an opportunity is worth taking. Day trading is opening and closing a position in the same trading day. It requires preparation, attention, a defined risk limit, evidence-based decisions and the discipline to choose NO TRADE. We will inspect one completed fictional candle first. Nothing on this screen promises a gain or tells you what the next candle will do.',
   question:'Which is a responsible day-trading decision when information is insufficient?',
   choices:['Enter immediately so you do not miss the move.','WATCH or NO TRADE until the plan has enough evidence.','Assume the next green candle is guaranteed.'],best:1,
   why:'Correct process: WATCH and NO TRADE are legitimate choices. Your decision should be supported by evidence and a defined risk boundary.',
   retry:'A fast entry is not required. An incomplete setup is a valid reason to wait or avoid the trade.'},
  {title:'I Do — Read what the first candle actually says',text:
   'Look at the single green or red candle currently revealed. Its Open is the first price of this five-minute interval. High and Low are the extremes; Close is its final price. The body runs between Open and Close, and the wicks represent the remaining range. The volume bar describes traded shares in this fictional interval. These observations are real values within our invented scenario, but they cannot tell us the price of the next bar.',
   question:'What can you establish from one completed candle?',
   choices:['Its open, high, low, close and reported volume.','Exactly where the following candle will close.','Whether a market order would definitely fill at the close.'],best:0,
   why:'OHLCV gives bounded, completed observations. It does not certify the future path or real execution.',
   retry:'Read the completed OHLCV values. Do not infer the next candle or a guaranteed fill.'},
  {title:'I Do — Prepare before considering an entry',text:
   'A defensible intraday plan identifies the session and chart interval, the level or structure being evaluated, the evidence required for a trigger, a point of invalidation, and the maximum planned loss. If you cannot identify the trigger and invalidation, do not invent one from a single candle. EMA lines and volume can add context once enough completed data exist, but they are not independent instructions to buy or sell.',
   question:'What must be identified before considering a simulated ENTER?',
   choices:['Only whether the current candle is green.','A trigger, invalidation, risk limit and relevant visible evidence.','A target price based on unrevealed candles.'],best:1,
   why:'A defined trigger, invalidation, risk budget and the observed context support disciplined decision-making.',
   retry:'The current candle color alone does not supply a complete plan or risk budget.'},
  {title:'We Do — Compare choices without predicting',text:
   'Let us walk through a decision together. The current candle is only one observation. Ask what the candle shows about its close relative to its open, whether the volume has meaningful comparison bars, and which levels remain unknown. If a signal or risk estimate is missing, say so. You may select WATCH to gather evidence or NO TRADE because the setup does not qualify. We are practicing reasoning, not rewarding a particular order.',
   question:'A candle closes higher, but you have no defined invalidation. What should you do?',
   choices:['Enter because the candle is green.','Set a stop after the next bar appears.','Continue watching or choose NO TRADE until risk is defined.'],best:2,
   why:'When invalidation is missing, waiting or declining the setup is consistent with the learning objective.',
   retry:'A later stop is not a substitute for a risk plan established before entry.'},
  {title:'We Do — Commit evidence before more information',text:
   'Now use the decision controls below this chart. Choose ENTER, WATCH, NO TRADE or OBSERVE and write what the revealed candle actually shows. Add what would change your view, even if your choice is NO TRADE. The server locks that first decision before allowing later candles. After locking it, the Play Candles button can request each next bar in order. Playback cannot skip the server and will pause for Talia checkpoints.',
   question:'Why must the decision be locked before later candles appear?',
   choices:['To protect the original observation from hindsight.','To earn a verified market profit.','To make the next candle follow the plan.'],best:0,
   why:'The observation boundary prevents later information from silently changing the originally documented decision.',
   retry:'The lock protects the decision timeline; it does not execute a trade or affect fictional prices.'},
  {title:'You Do — Practice, pause and review',text:
   'After the first decision is locked, press Play Candles or Reveal Next Bar. You will see only candles supplied by the protected server. Every few candles I will pause playback and ask you to review the evidence. Compare the new observations with what you originally expected, including any invalidation. Your decision process matters more than the fictional outcome. Never treat an educational OHLCV simulation as a verified fill or an official competency grade.',
   question:'What is the purpose of the teaching checkpoints?',
   choices:['To change the previous locked answer after seeing new bars.','To compare new evidence with the recorded original reasoning.','To discover an automatic profitable entry.'],best:1,
   why:'A checkpoint is a chance to reflect on newly released evidence without rewriting the prior decision.',
   retry:'Review the decision process against evidence known at each point. Do not use hindsight as proof of prior certainty.'}
 ];
 function init(){
  const panel=$('dt-c01-l02-echarts'),session=$('vr-session'),advance=$('vr-advance');
  if(!panel||!session||!advance||panel.dataset.dtV3Coach==='1')return;
  panel.dataset.dtV3Coach='1';
  const header=panel.querySelector('.dt-l02-header');
  const controls=panel.querySelector('.dt-l02-controls');
  if(!header||!controls)return;
  const coach=create('section','dt-l02-coach');
  coach.setAttribute('aria-label','Talia instructor-led lesson');
  const person=create('div','dt-l02-coach-head');
  person.append(create('span','dt-l02-avatar','T'));
  const identity=create('div','');
  identity.append(create('h4','','Talia · Your Learning Instructor'),
   create('p','','I Do → We Do → You Do · step-by-step, ungraded teaching'));
  person.append(identity);coach.append(person);
  const progress=create('p','dt-l02-lesson-progress','Teaching step 1 of 6');
  const lessonTitle=create('h5','','Start — What day trading demands');
  const transcript=create('p','dt-l02-transcript');
  const full=create('p','dt-l02-accessible');full.className='dt-l02-accessible';
  full.setAttribute('aria-label','Full Talia lesson transcript');
  transcript.setAttribute('aria-hidden','true');
  coach.append(progress,lessonTitle,full,transcript);
  const teachActions=create('div','dt-l02-teach-actions');
  const speak=create('button','btn secondary','Play Talia’s explanation');speak.type='button';
  const all=create('button','btn secondary','Show full explanation');all.type='button';
  const prior=create('button','btn secondary','Previous teaching step');prior.type='button';
  const next=create('button','btn secondary','Next teaching step');next.type='button';
  teachActions.append(speak,all,prior,next);coach.append(teachActions);
  const check=create('div','dt-l02-check');
  const checkHeading=create('h5','','Let’s check your understanding');
  const question=create('p','dt-l02-question');
  const choices=create('div','dt-l02-choices');
  const feedback=create('p','dt-l02-feedback');feedback.setAttribute('role','status');
  feedback.setAttribute('aria-live','polite');
  check.append(checkHeading,question,choices,feedback);coach.append(check);
  const reflection=create('label','dt-l02-reflect','What do you notice or still need to verify? (optional)');
  const reflectionText=create('textarea','');reflectionText.rows=2;reflectionText.maxLength=1200;
  reflectionText.placeholder='Record your observation here. Use the server decision box below to lock the official replay rationale.';
  reflection.append(reflectionText);coach.append(reflection);
  header.insertAdjacentElement('afterend',coach);

  const transport=create('div','dt-l02-transport');
  transport.setAttribute('aria-label','Authenticated fictional candle playback');
  const transportTitle=create('strong','','Candle replay');
  const play=create('button','btn','Play Candles');play.type='button';
  const speedLabel=create('label','','Speed');
  const speed=create('select','');speed.setAttribute('aria-label','Seconds between revealed 5-minute candles');
  for(const sec of [2,5,10,20,30,60]){
   const opt=new Option(sec+' seconds / fictional 5-minute bar',String(sec));
   speed.add(opt);
  }
  speed.value='5';speedLabel.append(speed);
  const step=create('button','btn secondary','Reveal Next Bar');step.type='button';
  const transportState=create('p','dt-l02-transport-status','First learn with Talia, then lock a decision to enable playback.');
  transportState.setAttribute('role','status');transportState.setAttribute('aria-live','polite');
  transport.append(transportTitle,play,speedLabel,step,transportState);
  controls.insertAdjacentElement('beforebegin',transport);

  let isCase=false,stepIndex=0,typingTimer=null,typingAt=0,typingPaused=false;
  let playTimer=null,playing=false,observed=[],state={sessionId:'',locked:false,busy:false};
  let lastSession='',answered=new Map(),checkpointAt=0,checkpoint=false;
  const reduceMotion=()=>typeof root.matchMedia==='function'&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function cancelTyping(){if(typingTimer){root.clearInterval(typingTimer);typingTimer=null}}
  function finishTyping(){cancelTyping();transcript.textContent=full.textContent;typingAt=full.textContent.length;typingPaused=false;speak.textContent='Replay Talia’s explanation'}
  function typingLoop(){
   cancelTyping();typingPaused=false;speak.textContent='Pause Talia’s explanation';
   typingTimer=root.setInterval(()=>{
    if(!isCase){cancelTyping();return}
    typingAt=Math.min(full.textContent.length,typingAt+3);
    transcript.textContent=full.textContent.slice(0,typingAt);
    if(typingAt>=full.textContent.length)finishTyping();
   },48);
  }
  function firstBarCopy(){
   const b=observed[0];
   if(!b)return 'The server has not revealed the first candle yet. We cannot use future or hidden price data.';
   const o=Number(b.open),c=Number(b.close);
   return 'The first completed fictional five-minute candle is O $'+o.toFixed(2)+
    ', H $'+Number(b.high).toFixed(2)+', L $'+Number(b.low).toFixed(2)+
    ', C $'+c.toFixed(2)+' with volume '+Number(b.volume).toLocaleString('en-US')+
    '. It closed '+(c>=o?'at or above':'below')+' its open, but its next price remains unknown.';
  }
  function showLesson(){
   const item=chapters[stepIndex];
   progress.textContent='Teaching step '+(stepIndex+1)+' of '+chapters.length;
   lessonTitle.textContent=item.title;
   const narrative=item.text+(stepIndex===1?'\n\n'+firstBarCopy():'');
   full.textContent=narrative;transcript.textContent='';typingAt=0;
   prior.disabled=stepIndex===0;next.disabled=stepIndex===chapters.length-1;
   question.textContent=item.question;choices.replaceChildren();feedback.textContent='';
   const previousAnswer=answered.get(stepIndex);
   item.choices.forEach((choice,index)=>{
    const choiceButton=create('button','btn secondary',choice);choiceButton.type='button';
    choiceButton.setAttribute('aria-pressed',String(previousAnswer===index));
    choiceButton.addEventListener('click',()=>{
     answered.set(stepIndex,index);
     Array.from(choices.children).forEach((node,i)=>node.setAttribute('aria-pressed',String(i===index)));
     feedback.textContent=index===item.best?item.why:item.retry;
    });
    choices.append(choiceButton);
   });
   if(previousAnswer!==undefined)feedback.textContent=previousAnswer===item.best?item.why:item.retry;
   if(reduceMotion())finishTyping();else typingLoop();
  }
  speak.addEventListener('click',()=>{
   if(!isCase)return;
   if(typingTimer){cancelTyping();typingPaused=true;speak.textContent='Resume Talia’s explanation';return}
   if(typingAt>=full.textContent.length){typingAt=0;transcript.textContent=''}
   typingLoop();
  });
  all.addEventListener('click',finishTyping);
  prior.addEventListener('click',()=>{if(stepIndex>0){stepIndex--;showLesson()}});
  next.addEventListener('click',()=>{if(stepIndex<chapters.length-1){stepIndex++;showLesson()}});
  function stop(message){
   playing=false;if(playTimer){root.clearTimeout(playTimer);playTimer=null}
   play.textContent='Play Candles';
   if(message)transportState.textContent=message;
  }
  function reset(){
   stop();cancelTyping();isCase=false;stepIndex=0;observed=[];answered.clear();
   reflectionText.value='';checkpointAt=0;checkpoint=false;
   state={sessionId:'',locked:false,busy:false};lastSession='';
   transportState.textContent='Select the Lesson 2 scenario to open guided playback.';
   coach.hidden=true;transport.hidden=true;
  }
  function renderTransport(){
   if(!isCase)return;
   step.disabled=!state.sessionId||!state.locked||state.busy||observed.length>=TOTAL;
   if(!playing){
    play.textContent='Play Candles';
    if(state.locked&&observed.length>=TOTAL)play.disabled=true;
    else play.disabled=!state.sessionId||state.busy&&!state.locked;
   }else{play.textContent='Pause Candles';play.disabled=false}
   if(!state.locked){
    transportState.textContent='Read Talia’s explanation. Lock your first evidence-based decision in the form below before Play or Reveal Next Bar can advance.';
   }else if(observed.length>=TOTAL){
    transportState.textContent='All '+TOTAL+' fictional candles have been revealed. Review and finish this session; there is no later bar.';
   }else if(checkpoint){
    transportState.textContent='Talia checkpoint after '+observed.length+' candles: compare current evidence with your locked decision. Press Play to continue when ready.';
   }else if(playing){
    transportState.textContent='Playing only server-released candles, one request at a time · '+observed.length+' of '+TOTAL+' observed.';
   }else{
    transportState.textContent='Paused · '+observed.length+' of '+TOTAL+' fictional candles revealed. Play or advance one bar.';
   }
  }
  function schedule(){
   if(!playing||playTimer||!isCase||!state.sessionId||!state.locked||state.busy||checkpoint)return;
   if(observed.length>=TOTAL){stop('All fictional candles revealed; no more observations available.');renderTransport();return}
   playTimer=root.setTimeout(()=>{
    playTimer=null;
    if(!playing||!state.locked||state.busy||checkpoint||!isCase)return;
    if(advance.disabled){stop('Replay controls are not ready. Check your signed-in session.');renderTransport();return}
    advance.click(); // Exact existing authenticated server-owned advance handler.
   },Math.max(2,Number(speed.value)||5)*1000);
  }
  play.addEventListener('click',()=>{
   if(!isCase)return;
   if(playing){stop('Playback paused. Your current observed candles are preserved.');renderTransport();return}
   if(!state.sessionId||!state.locked){
    transportState.textContent='Lock the initial decision and reasoning using the form below. Teaching is available now; future candles remain protected.';
    $('vr-decision')?.focus();return;
   }
   if(observed.length>=TOTAL){renderTransport();return}
   if(checkpoint){checkpoint=false;stepIndex=5;showLesson()}
   playing=true;renderTransport();schedule();
  });
  speed.addEventListener('change',()=>{
   if(playTimer){root.clearTimeout(playTimer);playTimer=null}
   schedule();
  });
  step.addEventListener('click',()=>{
   if(!isCase)return;
   stop('Revealing one additional authorized candle.');
   if(!advance.disabled)advance.click();
  });
  root.addEventListener('groundup:replay-reset',reset);
  root.addEventListener('crownlight:member-changed',reset);
  root.addEventListener('groundup:replay-dataset',event=>{
   reset();
   if(event.detail?.dataset?.code!==CODE||!event.detail?.memberId)return;
   isCase=true;coach.hidden=false;transport.hidden=false;showLesson();renderTransport();
  });
  root.addEventListener('groundup:replay-observation',event=>{
   if(!isCase)return;
   const b=event.detail?.bar;
   if(!b||!Number.isSafeInteger(Number(b.index))||Number(b.index)>=TOTAL)return;
   if(observed.at(-1)?.index===b.index)return;
   observed.push({...b});
   if(stepIndex===1)showLesson();
   if(playing&&observed.length>1&&(observed.length-1)%3===0&&observed.length!==checkpointAt){
    checkpointAt=observed.length;checkpoint=true;
    stop('Talia checkpoint: pause to compare what was actually observed with your recorded reasoning.');
    stepIndex=5;showLesson();
   }
   if(observed.length>=TOTAL)stop('You reached the last fictional bar. Review the result; no additional candle can be released.');
   renderTransport();
  });
  root.addEventListener('groundup:replay-state',event=>{
   if(!isCase)return;
   const next=event.detail||{};
   if(lastSession&&next.sessionId&&next.sessionId!==lastSession){reset();return}
   if(next.sessionId)lastSession=String(next.sessionId);
   if(!next.sessionId){reset();return}
   state={sessionId:String(next.sessionId),locked:next.locked===true,busy:next.busy===true};
   renderTransport();schedule();
  });
  document.addEventListener('visibilitychange',()=>{
   if(document.hidden&&playing){stop('Playback paused because the browser tab is hidden.');renderTransport()}
   if(document.hidden)cancelTyping();
  });
  reset();
  root.CrownlightDT01L02Coach={status:()=>({active:isCase,playing,observed:observed.length,step:stepIndex,locked:state.locked})};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(window);
