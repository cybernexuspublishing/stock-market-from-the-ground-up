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
  {title:'Welcome — What Day Trading Demands',text:
   'I’m Talia. Welcome to your guided learning workstation. We will first review what a completed candle represents, then learn the arithmetic that lets you describe a candle accurately. After that, we will practice deciding whether to ENTER, WATCH or choose NO TRADE. Day trading means opening and closing a position on the same trading day. Careful preparation, risk boundaries and patience are more important than clicking quickly. Nothing on this screen is verified market history or a trading recommendation.',
   question:'What is a sound response when the evidence is insufficient?',
   choices:['Enter quickly to avoid missing a move.','WATCH or NO TRADE while gathering evidence.','Assume a green candle predicts a gain.'],best:1,
   why:'Correct process: WAITING and NO TRADE are valid outcomes. An incomplete setup does not require entry.',
   retry:'The first job is to identify evidence and uncertainty; speed is not proof that a trade is justified.'},
  {title:'What Is a Percentage? — I Do',text:
   'A percentage describes a part of a whole using one hundred equal parts. If the part is one quarter of the whole, that is 25 percent because 0.25 × 100 = 25. To calculate a percentage, we first identify the part and the whole; then divide the part by the whole and multiply by 100. We will use this on one fictional candle, with the real body as the part and full High-to-Low range as the whole. Do not calculate until these definitions make sense.',
   question:'What must you identify before calculating a percentage?',
   choices:['Only whether a candle is green.','The part and the whole being compared.','The next candle price.'],best:1,
   why:'A percentage is meaningful only when the part and its reference whole are clearly defined.',
   retry:'Ask: a percentage of what? First find the measured part and the total against which it is compared.'},
  {title:'Candle Experiment — We Do',text:
   'Watch the chart. The High and Low are the price extremes in this completed candle. Open is its first price and Close is its last price. The body is the distance between Open and Close, while the wicks extend toward the High and Low. Change the Close slider and notice the body and color respond while the full price range remains fixed. All four labels remain beside their actual levels with horizontal guides; the OHLC table gives an accessible second reference.',
   question:'What changes when you move Close but keep High and Low fixed?',
   choices:['The real-body size may change, while the full range stays fixed.','The next candle is guaranteed to rise.','The original High-to-Low range must change.'],best:0,
   why:'Body size depends on Open and Close; full range depends on High and Low.',
   retry:'Recheck the formulas: body is |Close − Open|, while range is High − Low.'},
  {title:'Calculate the Real Body — I Do',text:
   'Real body = absolute value of Close minus Open. Absolute value means measure the size of the difference without a negative sign. For the original worked example, Open is $20.00 and Close is $21.20. Subtract $21.20 − $20.00 = $1.20. If the candle closed below its open, the body would still be a positive length. The real body is not the entire candle range. Use the separate Check My Calculation question and retry freely.',
   question:'Which prices define the candle body?',
   choices:['High and Low.','Open and Close.','Volume and Close.'],best:1,
   why:'The real body spans the opening and closing prices, regardless of direction.',
   retry:'Focus on the filled rectangle: its ends are the Open and Close, not the entire wick range.'},
  {title:'Calculate the Full Range — I Do',text:
   'Full range = High minus Low. For the worked example, High is $22.00 and Low is $19.00, so $22.00 − $19.00 = $3.00. This measures the full distance from the highest to the lowest fictional price in the candle, including both body and wicks. It does not establish whether a profitable trade was available. Answer the range question separately, with unlimited free instructional retries.',
   question:'Which prices define the full candle range?',
   choices:['Open and Close.','High and Low.','The first and second candle closes.'],best:1,
   why:'Full range measures the distance between High and Low.',
   retry:'The full range includes every price level spanned by the candle, not only the body.'},
  {title:'Calculate the Percentage — We Do',text:
   'Now combine what we already learned. First, calculate the real body: $1.20. Second, calculate the full range: $3.00. Third, divide the body by the range: $1.20 ÷ $3.00 = 0.40. Fourth, multiply by 100 to get 40.0 percent. We now know the real body occupies 40 percent of the candle’s full vertical range. That is a description of the completed candle, not a forecast. Try the percentage calculation yourself and request more instruction whenever needed.',
   question:'Why do we divide real body by full range?',
   choices:['To compare the body with the candle’s total measured height.','To guarantee the next price direction.','To calculate the number of shares traded.'],best:0,
   why:'The division expresses the body as a proportion of the entire candle range.',
   retry:'A percentage is part ÷ whole × 100; here the part is body and the whole is full range.'},
  {title:'Independent Assessment — Protected Boundary',text:
   'In a formal assessment you must work independently. The first graded response must be recorded by the authenticated protected assessment service; an instructional screen cannot issue a grade. The separate fictional self-check below is ungraded, and it records your first response for learning review only. Reveal and Skip are not permitted on a formal graded question. You can continue learning with a different candle, but a new formally scored attempt must come from the official assessment system.',
   question:'Which system can assign an official mastery score?',
   choices:['A local illustrative chart.','The authenticated protected assessment service after editorial approval.','A simulated Question Pass wallet.'],best:1,
   why:'Official grading uses the reviewed question bank and protected attempt records.',
   retry:'Neither an illustrative chart nor a simulated credit balance is an assessment authority.'},
  {title:'Review & Retry — We Do',text:
   'Review your original reasoning without rewriting the first answer. You can always ask for an explanation and try a new illustrated candle. For a real formal assessment, the prior graded attempt must remain intact and a new protected attempt uses distinct questions according to the approved assessment policy. The current demonstration tracks ungraded observations only. Be especially careful not to confuse a completed-candle statistic with evidence of a future price move.',
   question:'What should happen to the first official graded submission when you retry?',
   choices:['Overwrite it with the new answer.','Preserve it and open a separately recorded, independently graded new attempt.','Convert a revealed answer into mastery.'],best:1,
   why:'Preserving the first formal attempt prevents retrospective alteration and supports an auditable progress record.',
   retry:'An additional assessment should be independently recorded; a past submitted result must not be silently replaced.'},
  {title:'Transfer Challenge — You Do',text:
   'You now have another authored fictional candle. Calculate its real body, full range and body percentage without copying the worked-case numbers. Then explain what those measurements tell you about the completed interval, and what they cannot tell you about the next one. Finally, ask whether the observed evidence, trigger and invalidation are sufficient to support ENTER, WATCH or NO TRADE.',
   question:'What makes this a genuine transfer exercise?',
   choices:['Using a new example and applying the same method.','Repeating the earlier answer without looking.','Assuming the next bar moves in the same direction.'],best:0,
   why:'Applying the method to different inputs shows broader understanding without predicting market behavior.',
   retry:'The purpose is to transfer the procedure to unfamiliar observations, not memorize one answer.'},
  {title:'Learning Report — Review Your Progress',text:
   'You have practiced naming Open, High, Low and Close, measuring the real body and full range, and interpreting the body as a percentage of the range. You have also practiced careful intraday decisions, including the option not to trade. Review your recorded practice attempts and assistance use below. A guided lesson or simulated Question Pass never certifies independent mastery; the official protected assessment result remains authoritative.',
   question:'What does completing this guided demonstration prove?',
   choices:['A guaranteed future profitable trade.','Completion of guided learning; independent mastery still requires protected assessment.','An automatically approved certificate.'],best:1,
   why:'Guided teaching and repeated practice support learning but do not substitute for independent protected grading.',
   retry:'Learning activity and independently verified competency results have different evidentiary standards.'}
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
  // The full ten-step calculator is a subordinate instructional sequence,
  // not a replacement official grade or the protected replay.
  const measurements=root.CrownlightCandleV28?.create?.({controlled:true})||null;
  if(measurements)coach.append(measurements.element);
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
   const narrative=item.text+(stepIndex===2?'\n\n'+firstBarCopy():'');
   full.textContent=narrative;transcript.textContent='';typingAt=0;
   prior.disabled=stepIndex===0;next.disabled=stepIndex===chapters.length-1;
   measurements?.setStep(stepIndex);
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
   measurements?.reset();
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
   if(stepIndex===2)showLesson();
   if(playing&&observed.length>1&&(observed.length-1)%3===0&&observed.length!==checkpointAt){
    checkpointAt=observed.length;checkpoint=true;
    stop('Talia checkpoint: pause to compare what was actually observed with your recorded reasoning.');
    stepIndex=7;showLesson();
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
