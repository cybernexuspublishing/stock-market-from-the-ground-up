/* v3.3 shared instructional journey for the existing 419 canonical Lab IDs.
 * Builds on v3.2 reference teaching and 30 original competency guides.
 * NO private rubric, answer key, future market bar, member credit or entitlement
 * is shipped by this module. Authenticated grading and replay remain server-only.
 */
(function(root){
'use strict';
const STEPS=Object.freeze(['Start','Learn','Experiment','Predict','Practice','Assess','Review','Transfer','Results']);
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
async function mount({labId,mode,target,lab,focusId}={}){
 if(!target||typeof target.replaceChildren!=='function')return false;
 const token={labId,mode};sessions.set(target,token);
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
 const shell=el('section');shell.className='card gu-v32 gu-v33';
 shell.setAttribute('aria-label','Advanced learning journey');
 const heading=el('h2','Learning Journey — '+(subject?.name||guide.title));
 const disclosure=el('p','Curriculum-linked, ungraded instructional guidance. Reviewed assessments, actual market history, future bars, account progress and member access remain under their existing protected services.');
 const journey=el('ol'),progress=el('p'),body=el('section'),status=el('p'),nav=el('div');
 journey.className='gu-v33-journey';journey.setAttribute('aria-label','Learning stages');
 progress.className='gu-v32-progress';body.className='gu-v32-body';nav.className='actions';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const previous=button('Previous stage',()=>{if(stage>0){stage--;render()}}),
 next=button('Next learning stage',()=>nextStage());
 nav.append(previous,next);shell.append(heading,disclosure,progress,journey,body,status,nav);target.replaceChildren(shell);
 let stage=0,observations='',prediction='',predictionLocked=false,practice='',practiceCount=0,
     practiceResolved=false,practiceAssisted=false,transfer='',transferCount=0,transferResolved=false,
     selfReview=false,experimentValue=kind==='candle'?32:100,reflection='';
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
  progress.textContent='Stage '+(stage+1)+' of 9 · '+STEPS[stage];
  shell.dataset.v32Progress=String(stage/9);
  if(typeof CustomEvent==='function'&&typeof document.dispatchEvent==='function')
   document.dispatchEvent(new CustomEvent('gu-v33-stage-change',{detail:{step:stage,progress:stage/9}}));
 }
 function freeExplanation(){
  detail(body,'Explain This Concept — Always Free',[
   'What it means: '+(subject?.definition||guide.concept),
   'Why and how it works: '+(subject?.why||guide.procedure),
   'Relevant symbols or terminology: '+(subject?.symbols||'Identify the source, units, timeframe and referenced market conditions.'),
   'Common mistake: '+(subject?.error||guide.commonError),
   'Limits: '+(subject?.limit||guide.limit)
  ]);
 }
 function stepList(steps){const ol=el('ol');for(const s of steps)ol.append(el('li',s));body.append(ol)}
 function answerStatus(label,good){
  const p=el('p',label);p.className=good?'gu-v33-good':'gu-v33-review';body.append(p);
 }
 function render(){
  body.replaceChildren();mark('');showJourney();body.append(el('h3',STEPS[stage]));
  if(stage===0){
   appendParagraph(body,'Learning objective: '+(lab?.goal||topic));
   appendParagraph(body,'Prerequisite: be able to identify the observations and units required for this subject. If an unfamiliar word appears, open the free explanation in the next stage.');
   appendParagraph(body,'Related official competencies: '+codes.map(x=>map.guides.get(x).title).join('; ')+'. Not Yet Assessed is the default until reviewed evidence exists.');
   appendParagraph(body,'This stage shows conceptual instruction, not independently verified market history or a trading recommendation.');
  }else if(stage===1){
   appendParagraph(body,subject?.definition||guide.concept);
   appendParagraph(body,subject?.why||guide.procedure);
   if(subject){appendParagraph(body,'Define every component: '+subject.symbols);stepList(subject.steps)}
   else{
    stepList(['Define the key terms and the market evidence you can actually observe.',
     'Identify the source, date, session and timeframe for any historical claim.',
     'Explain the conditions and procedure: '+guide.procedure,
     'Find a competing interpretation or invalidating observation: '+guide.invalidation,
     'State the limitation: '+guide.limit]);
   }
   freeExplanation();
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
   const input=field(body,'Record what changed and why (optional)',observations);
   body.append(button('Record my observation',()=>{observations=input.value.trim();mark(observations?'Observation retained within this page.':'Add an observation if helpful.')}));freeExplanation();
  }else if(stage===3){
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
   appendParagraph(body,special?special.description:guide.selfCheck);
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
     if(practiceCount>0)answerStatus('Incorrect attempts: '+practiceCount+'. '+mathDiagnostic(kind,practice),false);
    }else{
     answerStatus('Calculation completed · '+(practiceAssisted||practiceCount>0?'Assisted or corrected learning':'Unassisted practice')+'. This is not a private graded assessment.',true);
     stepList(special.steps);
    }
    detail(body,'Teach This in More Depth — Always Free',special.steps.concat(['Frequent misconception: '+(subject?.error||guide.commonError),'The answer describes the fictional example; it does not predict the next bar.']));
   }else{
    const t=field(body,'Your independent observation and reasoning',practice);
    t.disabled=practiceResolved;
    if(!practiceResolved)body.append(button('Record ungraded practice',()=>{
     practice=t.value.trim();if(practice.length<20){mark('Explain your reasoning in at least 20 characters.');return}
     practiceResolved=true;render();
    }));
    else answerStatus('Practice recorded for self-study. Reviewed grading is separate.',true);
    freeExplanation();
    detail(body,'Misconception diagnosis — free',[guide.commonError,guide.procedure,guide.limit]);
   }
  }else if(stage===5){
   appendParagraph(body,'Official assessment uses only the existing authenticated, server-graded question bank after editorial acceptance. Answer keys are never embedded in this study aid.');
   appendParagraph(body,'An unreviewed Lab or missing rubric must remain Not Yet Assessed, regardless of study-step completion.');
   body.append(button('Go to protected assessment decision',()=>document.getElementById(focusId||'ev-decision')?.focus()));
  }else if(stage===6){
   appendParagraph(body,'Your learning review should explain what the result means, its limitations and at least one common wrong interpretation.');
   appendParagraph(body,'Concept: '+guide.concept);
   appendParagraph(body,'Reasoning: '+(subject?.why||guide.procedure));
   appendParagraph(body,'What could invalidate it: '+guide.invalidation);
   appendParagraph(body,'Common mistake: '+guide.commonError);
   appendParagraph(body,'Limitations: '+(subject?.limit||guide.limit));
   if(special)stepList(special.steps);
   const f=field(body,'Reflect: what did you misunderstand or learn?',reflection);
   if(!selfReview)body.append(button('Record review and continue',()=>{
    reflection=f.value.trim();if(reflection.length<15){mark('Write at least 15 characters to explain what you learned.');return}
    selfReview=true;render();
   }));else answerStatus('Review recorded locally. It is not a competency grade.',true);
  }else if(stage===7){
   appendParagraph(body,'Apply the concept to an unfamiliar case. A study solution here never awards mastery or replaces the existing private assessment.');
   if(special){
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
