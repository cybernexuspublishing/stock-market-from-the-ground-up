/* Seven Academy programs, one instructor engine. Progress server-owned.
 * No client-side credentials, assessment keys, grades, unverified replay or
 * member entitlements. Thirty-day course uses its existing canonical route.
 */
(()=>{'use strict';
 const get=id=>document.getElementById(id);
 if(!get('academy-programs'))return;
 const VERSION='0.14.0.168';
 const programIllustration=Object.freeze({"truth5":"sec-filings","watchlist7":"candidate-quality","scanners10":"catalyst-analysis","foundations30":"chart-structure","charts45":"multi-timeframe","risk60":"risk-per-share","practicum90":"independent-plan"});

 const expected=new Map([['free5',5],['truth5',5],['watchlist7',7],['scanners10',10],
  ['foundations30',30],['charts45',45],['risk60',60],['practicum90',90]]);
 let client=null,userId='',activeCode='',program=null,days=[],dayIndex=1,enrolled=false,
  progress=new Map(),drafts=new Map(),selfCheckDrafts=new Map(),progressAvailable=false,busy=false,sessionSerial=0,renderSerial=0,authListenerAttached=false;
 const status=message=>{get('academy-status').textContent=message};
 function node(tag,value){
  const element=document.createElement(tag);
  if(value!==undefined)element.textContent=String(value);
  return element;
 }
 function clean(){
  program=null;days=[];enrolled=false;progress.clear();drafts.clear();selfCheckDrafts.clear();progressAvailable=false;dayIndex=1;
  ++renderSerial;busy=false;get('academy-workspace').hidden=true;
  get('academy-lab-slot').replaceChildren();get('academy-reflection').value='';
  get('academy-save-status').textContent='';
  // Hidden DOM still belongs to the previous member. Remove its content rather
  // than relying on [hidden] or CSS to prevent cross-account data exposure.
  for(const id of ['academy-days','academy-related'])get(id)?.replaceChildren();
  for(const id of ['academy-course-title','academy-course-summary','academy-length',
   'academy-member-progress','academy-stage-label','academy-day-title',
   'academy-objective','academy-observe','academy-practice','academy-limits']){
   const element=get(id);if(element)element.textContent='';
  }
  const selfCheck=get('academy-original-instruction');
  if(selfCheck){selfCheck.replaceChildren();selfCheck.hidden=true}
 }
 async function request(action,code='',payload=null){
  const options={method:payload?'POST':'GET',cache:'no-store',credentials:'same-origin'};
  if(payload){
   if(!userId)throw Error('Sign in before writing member study progress.');
   const auth=await client.auth.getSession();
   const session=auth.data?.session;
   if(!session||session.user?.id!==userId)throw Error('The member account changed. Please sign in again.');
   options.headers={authorization:'Bearer '+session.access_token,'content-type':'application/json'};
   options.body=JSON.stringify(payload);
  }else if(action!=='catalog'){
   const auth=await client.auth.getSession();
   const session=auth.data?.session;
   if(!session||session.user?.id!==userId)throw Error('The member account changed. Please sign in again.');
   options.headers={authorization:'Bearer '+session.access_token};
  }
  const endpoint=payload?'/api/bootcamp-academy':
   '/api/bootcamp-academy?'+new URLSearchParams(action==='catalog'?{action:'catalog'}:{program:code}).toString();
  const response=await fetch(endpoint,options);
  const value=await response.json().catch(()=>({}));
  if(!response.ok||value.ok!==true)throw Error(String(value.error||'Academy member service is unavailable.'));
  return value;
 }
 function catalog(programs){
  const root=get('academy-programs');root.replaceChildren();
  if(!Array.isArray(programs)||programs.length!==7||
   programs.some(p=>!expected.has(p.code)||expected.get(p.code)!==p.days)||
   new Set(programs.map(p=>p.code)).size!==7)throw Error('Academy catalog or durations could not be verified.');
  for(const p of programs){
   const card=node('article');card.className='academy-program'+(p.code===activeCode?' academy-program--active':'');
   const duration=node('span',p.days+'-day Boot Camp · '+p.level);duration.className='academy-duration';
   const heading=node('h3',p.title),description=node('p',p.summary);
   const image=node('img');image.className='academy-program-image';image.src='/assets/images/skill-illustrations/'+programIllustration[p.code]+'.svg';image.alt='Conceptual illustration for '+p.title+'; not historical market data';image.loading='lazy';image.width=144;image.height=132;
   const note=node('p',p.status==='original_30_day_controlling'?
    'Original 30-day curriculum · Beta enrollment available':
    'Educational beta curriculum · Lessons and reflections available to authorized testers');note.className='small';
   const action=node('a',p.code==='foundations30'?'Enroll / open 30-day Boot Camp':'Explore and enroll in beta');
   action.className='btn secondary';
   action.href=p.code==='foundations30'?'bootcamp.html':'bootcamp-academy.html?program='+encodeURIComponent(p.code);
   card.append(image,duration,heading,description,note,action);root.append(card);
  }
 }
 function updateDays(){
  const container=get('academy-days');container.replaceChildren();
  for(const d of days){
   const button=node('button');button.type='button';button.className='gu-bc-day';
   button.setAttribute('aria-current',d.day===dayIndex?'step':'false');
   const hasDraft=drafts.has(d.day)||selfCheckDrafts.has(d.day);
   const stored=progress.get(d.day)?.status==='reflection_saved'?'Reflection saved':
    progress.get(d.day)?.status==='in_progress'?'Started':'Not recorded';
   const state=hasDraft?stored+' · unsaved local work':stored;
   button.append(node('span',(activeCode==='free5'?'Lesson ':'Day ')+String(d.day).padStart(2,'0')+' · '+(progressAvailable?state:'Saving unavailable')),
    node('strong',d.title));
   button.addEventListener('click',()=>{dayIndex=d.day;renderDay()});
   container.append(button);
  }
 }
 function showRelated(d){
  const mount=get('academy-related');mount.replaceChildren();
  if((d.relatedLabs||[]).length)
   mount.append(node('p','Optional related book Labs can require an independent matching book entitlement. These links are not required to complete this Boot Camp lesson and do not grant book access or grading credit.'));
  for(const row of d.relatedLabs||[]){
   if(!/^(?:F[123]|DT|TAPE)-C\d+-L\d+|^SITE-\d+$/.test(row.id))continue;
   const item=node('a','Optional Lab '+row.id);item.href='labs.html?open='+encodeURIComponent(row.id);
   mount.append(item);
  }
  if(d.programCode==='free5'){
   const practice=node('a',d.lesson?.practiceLink?'Open the free manual watchlist':'Practice on original fictional candles');
   practice.href=d.lesson?.practiceLink||'simulator.html?practice=free';
   mount.append(practice);
  }
  const link=node('a','Your Market Skills Record');link.href='skills.html';mount.append(link);
 }

 function showOriginalInstruction(d){
  // New day-specific teaching is purely formative. It cannot update an official
  // grade or touch the protected answer-key service.
  let mount=get('academy-original-instruction');
  if(!mount){
   mount=node('section');mount.id='academy-original-instruction';
   mount.setAttribute('aria-label','Original Boot Camp teaching and self-check');
   get('academy-engine').before(mount);
  }
  mount.replaceChildren();mount.hidden=false;
  if(!d.lesson){
   // The 7/10/45/60/90-day beta courses reuse Owner-approved market topics
   // but did not previously render direct teaching when the Lab bridge failed.
   // This creates a complete *ungraded* daily coaching path, not new verified
   // history or a protected assessment.
   const phase=d.phaseLabel||'Guided study';
   const section=node('section');section.className='academy-beta-daily-coach';
   section.append(node('p','BETA LEARNING SESSION · '+phase),
    node('h4','Talia explains today’s learning objective'),
    node('p',d.objective),
    node('h4','First, identify the evidence'),
    node('p',d.observe),
    node('h4','Follow the guided method'));
   const steps=node('ol');
   for(const method of (Array.isArray(d.method)?d.method:[d.practice]).filter(Boolean))
    steps.append(node('li',method));
   section.append(steps,node('h4','Apply the method in a different case'),node('p',d.practice),
    node('h4','Recognize invalid or missing evidence'),
    node('p',d.limitation||'If an observation is not supported by a dated, verified source, withhold the claim and record uncertainty.'),
    node('h4','Unassisted self-check — educational beta'));
   const prompt=node('p','What evidence is observable for '+d.title+'? Give an alternative explanation, identify one missing fact, and state the condition that would invalidate your conclusion.');
   const response=node('textarea');response.className='academy-beta-answer';
   response.rows=4;response.maxLength=1200;response.setAttribute('aria-label','Your own ungraded reasoning for this study day');
   const key=d.programCode+':'+d.day;response.value=selfCheckDrafts.get(key)||'';
   response.addEventListener('input',()=>selfCheckDrafts.set(key,response.value));
   const help=node('details');help.append(node('summary','Compare with Talia’s review criteria (after attempting)'),
    node('p','A sound response separates observations from assumptions, cites the source and timeframe, considers an alternative, states uncertainty and names an invalidation condition. An unsupported or incomplete case may justify no trade.'));
   const copy=node('button','Add my self-check to the private reflection');
   copy.type='button';copy.className='btn secondary';
   const notice=node('p');notice.setAttribute('role','status');
   copy.addEventListener('click',()=>{
    const answer=response.value.trim();
    if(answer.length<40){notice.textContent='Write at least 40 characters of your own reasoning first.';return}
    const field=get('academy-reflection'),addition='Day '+d.day+' beta self-check: '+answer;
    const composed=(field.value.trim()?field.value.trim()+'\n\n':'')+addition;
    if(composed.length>2000){notice.textContent='Your private reflection would exceed 2,000 characters. Shorten it before copying.';return}
    field.value=composed;field.dispatchEvent(new Event('input',{bubbles:true}));
    notice.textContent='Self-check copied to the reflection. Select Save private reflection to preserve it.';
   });
   const feedback=node('a','Report a lesson issue to member Support');
   feedback.href='dashboard.html?tab=support&context='+encodeURIComponent('Boot Camp '+d.programCode+' Day '+d.day);
   feedback.className='text-link';
   section.append(prompt,response,help,copy,notice,feedback);
   mount.append(section);return;
  }
  const lesson=d.lesson;
  // A readable, full-width illustrative OHLC diagram is provided before
  // instruction. It is NOT a sourced market candle or blind history.
  if(d.programCode==='free5'&&d.day===2){
   const fig=node('figure');fig.className='academy-free-figure';
   const caption=node('figcaption','ORIGINAL FICTIONAL 5-MINUTE CANDLE · Open $20.00 · High $21.50 · Low $19.50 · Close $21.00');
   const ns='http://www.w3.org/2000/svg';
   const svg=document.createElementNS(ns,'svg');
   svg.setAttribute('viewBox','0 0 720 290');svg.setAttribute('role','img');
   svg.setAttribute('aria-label','Fictional bullish five-minute candlestick. High 21 dollars 50 cents, close 21 dollars, open 20 dollars, low 19 dollars 50 cents. Body 1 dollar; full range 2 dollars.');
   const line=(tag,attrs,text)=>{
    const el=document.createElementNS(ns,tag);
    for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));
    if(text!==undefined)el.textContent=String(text);
    svg.append(el);return el;
   };
   line('rect',{x:1,y:1,width:718,height:288,rx:12,fill:'#0a2030',stroke:'#386070'});
   line('line',{x1:185,y1:36,x2:185,y2:252,stroke:'#ade3c0','stroke-width':9,'stroke-linecap':'round'});
   line('rect',{x:146,y:97,width:78,height:106,rx:4,fill:'#5ecca0',stroke:'#c9f6d7','stroke-width':2});
   for(const [y,name,value] of [[36,'HIGH','$21.50'],[97,'CLOSE','$21.00'],[203,'OPEN','$20.00'],[252,'LOW','$19.50']]){
    line('line',{x1:244,y1:y,x2:283,y2:y,stroke:'#74a2b5','stroke-width':1.5});
    line('text',{x:294,y:y+5,fill:'#e3f1f6','font-size':17,'font-family':'system-ui,sans-serif'},name+'  '+value);
   }
   line('text',{x:29,y:270,fill:'#a5bdcb','font-size':13},'Hypothetical prices · chart for visual learning only');
   fig.append(svg,caption);
   mount.append(fig);
  }
  mount.append(node('h4',d.programCode==='free5'?'Talia explains — start from zero knowledge':'Learn the concept'),node('p',lesson.explanation));
  if(lesson.why)mount.append(node('h4','Why this matters'),node('p',lesson.why));
  mount.append(node('h4',d.programCode==='free5'?'Worked FICTIONAL demonstration':'Worked source-check example'),
   node('p',lesson.workedExample),node('h4','Guided practice — your turn'));
  const steps=node('ol');
  for(const step of lesson.sourceProcedure||[])steps.append(node('li',step));
  mount.append(steps);
  if(d.programCode==='free5'&&lesson.phaseA){
   // Instructional support, not a grade or another learning engine.
   const subject=lesson.phaseA,area=node('section');
   area.className='academy-free-phase-a';
   area.setAttribute('aria-label','Talia teaches beginner terms and corrects common mistakes');
   area.append(node('h4','Talia explains the important words'));
   const glossary=node('dl');glossary.className='academy-free-phase-a-glossary';
   for(const term of subject.terms)glossary.append(node('dt',term[0]),node('dd',term[1]));
   area.append(glossary,node('h4','Follow the demonstration step by step'));
   const walk=node('ol');for(const part of subject.steps)walk.append(node('li',part));
   area.append(walk,node('h4','Where did your reasoning become confusing?'),
    node('p','Choose a common mistake, study a different explanation, then try a new fictional case before opening its worked review. No grade or mastery is awarded.'));
   for(const item of subject.corrections){
    const help=node('details');help.className='academy-free-phase-a-error';
    help.append(node('summary',item.name),node('h5','Why this interpretation is incorrect'),node('p',item.why),
     node('h5','Talia teaches it another way'),node('p',item.how),
     node('h5','Try another fictional case'),node('p',item.case));
    const reveal=node('details');reveal.className='academy-free-phase-a-reveal';
    reveal.append(node('summary','Compare with a worked review — ungraded'),node('p',item.review));
    help.append(reveal);area.append(help);
   }
   area.append(node('p','The worked review and private reflections are learning aids, not protected assessment scores. Return to the main self-check to explain the concept in your own words.'));
   mount.append(area);
  }
  if(typeof lesson.investigation==='string'&&lesson.investigation.length>100){
   mount.append(node('h4','Independent evidence investigation'),node('p',lesson.investigation));
  }
  // Original research-linked analysis. These fields are not independent trade
  // evidence, a historical OHLCV feed, broker fills, or grading materials.
  const claim=lesson.sourceClaimCase;
  if(claim&&/^SOURCE_REPORTED_[A-Z_]+$/.test(String(claim.evidenceType||''))){
   const source=new URL(String(claim.sourceUrl||''));
   if(source.protocol==='https:'&&source.hostname==='stockstotrade.com'){
    const caseBox=node('section');caseBox.className='academy-source-claim-case';
    caseBox.setAttribute('aria-label','Source-reported market claim — verification exercise');
    caseBox.append(node('h4',claim.title));
    const citation=node('a','Read original public source: '+claim.sourceLabel);
    citation.href=source.href;citation.target='_blank';citation.rel='noopener noreferrer';
    caseBox.append(citation,node('p','Evidence status: SOURCE REPORTED · market data and fills not independently verified.'),
     node('h5','What the source reports'),node('p',claim.observation),
     node('h5','What remains unverified or conditional'),node('p',claim.limits),
     node('h5','Your independent evidence decision'),node('p',claim.question));
    mount.append(caseBox);
   }
  }
  if(lesson.whenNot)mount.append(node('h4','When NOT to act'),node('p',lesson.whenNot));
  mount.append(node('h4','Common research error'),node('p',lesson.error),
   node('h4','Transfer to a new case'),node('p',lesson.transfer),
   node('h4','Check your understanding — ungraded'),node('p',lesson.selfCheck));
  const label=node('label','Write your independent reasoning before comparing it with a model explanation.');
  label.htmlFor='academy-self-check-answer';
  const answer=node('textarea');answer.id='academy-self-check-answer';
  answer.rows=3;answer.minLength=40;answer.maxLength=1200;
  answer.setAttribute('autocomplete','off');
  // Draft answers stay only in memory, scoped by member/session and day.
  // Server-side progress remains the existing explicit Save Reflection action.
  answer.value=selfCheckDrafts.get(dayIndex)||'';
  const compare=node('button','Compare my reasoning');compare.type='button';
  compare.className='btn secondary';compare.disabled=answer.value.trim().length<40;
  const result=node('div');result.setAttribute('role','status');
  result.setAttribute('aria-live','polite');
  const use=node('button','Add reasoning to my private reflection');
  use.type='button';use.className='btn secondary';use.disabled=answer.value.trim().length<80;
  answer.addEventListener('input',()=>{
   const value=answer.value;
   if(value.trim())selfCheckDrafts.set(dayIndex,value);
   else selfCheckDrafts.delete(dayIndex);
   const short=value.trim().length<40;
   compare.disabled=short;use.disabled=value.trim().length<80;result.replaceChildren();
   updateDays();
  });
  use.addEventListener('click',()=>{
   const written=answer.value.trim();
   if(written.length<80){result.replaceChildren(node('p','Write at least 80 characters of original reasoning before adding it to your private reflection.'));return}
   const reflection=get('academy-reflection');
   if(!reflection)return;
   const existing=reflection.value.trim();
   const addition='Independent self-check (ungraded): '+written;
   if(existing.includes(addition)){
    result.replaceChildren(node('p','This reasoning is already in your private reflection draft.'));return;
   }
   const combined=existing?existing+'\n\n'+addition:addition;
   if(combined.length>2000){
    result.replaceChildren(node('p','Your reflection draft is at its 2,000-character limit. Review and shorten it before adding your reasoning.'));return;
   }
   reflection.value=combined;
   reflection.dispatchEvent(new Event('input',{bubbles:true}));
   result.replaceChildren(node('p','Reasoning added to your private reflection draft. It is NOT saved yet: enroll if needed, then select Save Reflection. This is ungraded study evidence, not mastery.'));
   reflection.focus();
  });
  compare.addEventListener('click',()=>{
   if(answer.value.trim().length<40)return;
   const coaching=node('section');coaching.className='academy-formative-criteria';
   coaching.setAttribute('aria-label','Talia lesson-specific formative review');
   coaching.append(node('h5','Talia’s reasoning review — check your own evidence'));
   const prompts=node('ol');
   for(const prompt of lesson.reviewPrompts||[])prompts.append(node('li',prompt));
   if(prompts.children.length)coaching.append(prompts);
   if(d.programCode==='free5'&&lesson.phaseA){
    // This does not diagnose free text or establish correctness: it prompts review.
    const aid=globalThis.GroundUpFreeFormativeV1?.review?.(d.day,answer.value);
    if(aid){
     const panel=node('section');panel.className='academy-free-formative-note';
     panel.setAttribute('aria-label','Talia ungraded follow-up questions');
     panel.append(node('h5','Focused follow-up — not a grade'),node('p',aid.limitation));
     if(aid.noted.length){
      panel.append(node('p','Words noticed in your explanation (not proof of understanding):'));
      const list=node('ul');for(const x of aid.noted)list.append(node('li',x));panel.append(list);
     }
     if(aid.ambiguous.length){
      panel.append(node('p','Check the meaning of this potentially misleading phrase:'));
      const list=node('ul');for(const x of aid.ambiguous)list.append(node('li',x));panel.append(list);
     }
     panel.append(node('p','Explain the following independently, then compare with the lesson:'));
     const list=node('ol');
     for(const q of (aid.followUps.length?aid.followUps:(lesson.reviewPrompts||[])).slice(0,3))list.append(node('li',q));
     panel.append(list);coaching.append(panel);
    }
   }
   coaching.append(node('h5','Compare with the worked explanation'),node('p',lesson.reviewGuide),
    node('p','If part of your answer is missing, revise and compare again. These teaching prompts are NOT a protected grading rubric, automated score or proof of mastery.'));
   result.replaceChildren(coaching);
  });
  mount.append(label,answer,compare,use,node('p','At least 40 characters to compare coaching; 80 characters to copy reasoning into a private reflection draft. Unsaved answers survive changing lessons in this tab only and are erased on account switch or reload. Save Reflection preserves study notes; this is not graded mastery.'),result);
  if(d.programCode==='free5')mountFreeLessonStages(mount,d);
 }


 function mountFreeLessonStages(mount,d){
  // Use the shared nine-stage teaching sequence without inventing assessment
  // grades. Existing private reflections and authorized Lab engines are unchanged.
  const names=['Start','Learn','Experiment','Predict','Practice','Assess','Review','Transfer','Results'];
  const headings={
   'Talia explains — start from zero knowledge':1,'Why this matters':1,
   'Worked FICTIONAL demonstration':2,'Guided practice — your turn':4,
   'Independent evidence investigation':7,'When NOT to act':7,
   'Common research error':7,'Transfer to a new case':7,
   'Check your understanding — ungraded':5
  };
  const frame=node('section');frame.className='academy-free-journey';
  const intro=node('p','Talia · Guided Learning — learn at your own pace. Study the example, try the method, correct mistakes, then check your understanding. No official grade is awarded.');
  intro.className='academy-free-intro';
  const nav=node('div');nav.className='academy-free-stage-nav';nav.setAttribute('role','group');
  nav.setAttribute('aria-label','Guided lesson steps');
  const panels=names.map((name,i)=>{
   const panel=node('section');panel.id='academy-free-stage-'+i;panel.className='academy-free-stage';
   panel.setAttribute('aria-label',name);return panel;
  });
  let stage=1;
  for(const item of [...mount.childNodes]){
   if(item.nodeType===1&&item.tagName==='H4'&&Object.prototype.hasOwnProperty.call(headings,item.textContent.trim()))
    stage=headings[item.textContent.trim()];
   else if(item.nodeType===1&&item.classList.contains('academy-free-phase-a'))stage=6;
   else if(item.nodeType===1&&item.classList.contains('academy-source-claim-case'))stage=7;
   panels[stage].append(item);
  }
  // One practical observation response before showing the full review.
  const field=node('textarea');field.rows=3;field.maxLength=800;
  const key='free5-guided:'+d.day;field.value=selfCheckDrafts.get(key)||'';
  field.setAttribute('aria-label','Your guided practice observation');
  const ask=node('button','Ask Talia for a hint');ask.type='button';ask.className='btn secondary';
  const feedback=node('p');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  field.addEventListener('input',()=>{selfCheckDrafts.set(key,field.value);feedback.textContent=''});
  ask.addEventListener('click',()=>{
   if(field.value.trim().length<25){feedback.textContent='Write the observed facts in your own words before asking for guidance.';return}
   feedback.textContent=(d.lesson?.reviewPrompts?.[0]||
    'Which facts support your answer, and what remains unknown?')+
    ' This is an instructional hint, not an automated correctness grade.';
  });
  panels[4].append(node('label','Your turn — explain what you observed and what is still unknown'),field,ask,feedback);
  // Full Lab-inspired teaching sequence, with original fictional Free-only
  // exercises. This preview never overrides book/assessment authorization.
  const studio=globalThis.GroundUpFreeStudioV3;
  if(studio?.mount?.(d.day,panels[2],panels[4])!==true){
   panels[2].append(node('p','Interactive practice is unavailable. The written demonstration remains available.'));
  }
  const premium=node('section');premium.className='academy-studio-preview';
  premium.append(node('h4','What comes after Free Foundations?'),
   node('p','This lesson demonstrates our full Lab approach: Talia teaches, you experiment with evidence, make a decision, then review your reasoning. Labs such as Basic Historical Replay Setup offer additional guided scenarios, learning modes and practice, where authorized. Free study does not unlock restricted book content or official assessments.'));
  const catalog=node('a','Explore full Labs and access requirements');
  catalog.href='labs.html';catalog.className='btn secondary';
  premium.append(catalog);panels[8].append(premium);
  // Same explicit evidence-then-decision pattern as a full Lab, but fictional,
  // ungraded, and without granting restricted membership/book entitlements.
  globalThis.GroundUpFreeLabExperienceV1?.mount?.(d.day,panels[3],panels[8]);
  panels[0].append(node('h4','Your learning goal'),node('p',d.objective),
   node('p','Talia will teach the concepts and worked examples before you practice. You may complete these lessons at your own pace.'));
  panels[3].append(node('h4','Identify the unknown, not the future outcome'),
   node('p',d.limitation||d.caution||'Do not predict the next candle from incomplete evidence.'),
   node('p','Before you act, identify one missing fact and one observation that would change your interpretation.'));
  const finish=node('button','Go to my private reflection');finish.type='button';finish.className='btn secondary';
  finish.addEventListener('click',()=>get('academy-reflection')?.focus());
  panels[8].append(node('h4','Record what you understand'),
   node('p','Return to any stage to correct your reasoning. Explain your observations, what remains uncertain, and what you would do next. Save your private study reflection below. This is not a grade, pass, or mastery award.'),finish);
  const controls=node('nav');controls.className='academy-free-stage-controls';
  controls.setAttribute('aria-label','Guided lesson navigation');
  const previous=node('button','Previous step');previous.type='button';previous.className='btn secondary';
  const next=node('button','Next step');next.type='button';next.className='btn';
  const progressText=node('span');progressText.setAttribute('role','status');
  controls.append(previous,progressText,next);
  let active=0;
  const buttons=names.map((name,i)=>{
   const button=node('button',(i+1)+'. '+name);button.type='button';button.className='academy-free-stage-button';
   button.setAttribute('aria-controls',panels[i].id);button.onclick=()=>activate(i);nav.append(button);return button;
  });
  function activate(n){
   active=Math.min(names.length-1,Math.max(0,n));
   panels.forEach((p,i)=>p.hidden=i!==active);
   buttons.forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===active));b.classList.toggle('active',i===active)});
   previous.disabled=active===0;next.disabled=active===names.length-1;
   next.textContent=active===names.length-1?'Review complete':'Next: '+names[active+1];
   progressText.textContent='Step '+(active+1)+' of '+names.length;
  }
  previous.onclick=()=>activate(active-1);next.onclick=()=>activate(active+1);
  frame.append(intro,nav,...panels,controls);mount.append(frame);
  activate(0);
 }

 function renderDay(){
  const d=days[dayIndex-1];if(!d)return;
  ++renderSerial;const renderEpoch=renderSerial;
  get('academy-stage-label').textContent=(d.programCode==='free5'?'Lesson ':'Day ')+dayIndex+' of '+days.length+' · '+(d.phaseLabel||'Guided learning');
  get('academy-day-title').textContent=d.title;
  get('academy-objective').textContent=d.objective;
  get('academy-observe').textContent=d.observe;
  get('academy-practice').textContent=d.practice;
  get('academy-limits').textContent=d.limitation||d.caution;
  showOriginalInstruction(d);
  const free=d.programCode==='free5';
  get('academy-index-title').textContent=free?'Your five lessons':'Study days';
  get('academy-days').setAttribute('aria-label',free?'Select a Free Foundations lesson':'Select a Boot Camp study day');
  get('academy-start').textContent=free?'Mark this lesson started':'Mark this day started';
  get('academy-prev').textContent=free?'Previous lesson':'Previous day';
  get('academy-next').textContent=free?'Next lesson':'Next day';
  get('academy-workspace').classList.toggle('academy-free-lesson-mode',free);
  get('academy-reflection').value=drafts.has(dayIndex)?drafts.get(dayIndex):(progress.get(dayIndex)?.reflection||'');
  get('academy-save-status').textContent=drafts.has(dayIndex)?'Unsaved reflection draft on this page. Select Save Reflection to store it privately.':'';
  get('academy-prev').disabled=dayIndex===1;
  get('academy-next').disabled=dayIndex===days.length;
  get('academy-start').disabled=!enrolled||!progressAvailable||busy;
  get('academy-save').disabled=!enrolled||!progressAvailable||busy;
  showRelated(d);updateDays();
  const slot=get('academy-lab-slot');
  slot.replaceChildren();
  const target=node('div');slot.append(target);
  const labId=d.relatedLabs?.[0]?.id;
  if(!labId){target.append(node('p',d.programCode==='free5'?'Talia’s worked examples and self-check appear above. You can also practice on fictional candles or make a private research watchlist.':'No authorized canonical Lab is linked to this day.'));return;}
  const study={
   id:labId,concept:d.title,goal:d.objective,
   teaching:{what:d.objective,why:d.observe,when:d.observe,how:d.method||[d.practice],
    commonError:d.remediation||'Check the source and time before interpreting.',
    limitation:d.limitation||d.caution}
  };
  const engine=globalThis.GroundUpLabEngineV32Universal;
  if(typeof engine?.mount!=='function'){target.textContent='Guided instructor is unavailable. Your original study directions remain above.';return;}
  void Promise.resolve(engine.mount({labId,mode:'guided',target,lab:study,focusId:'academy-reflection'}))
   .then(()=>{if(renderEpoch!==renderSerial)target.remove()})
   .catch(()=>{if(renderEpoch===renderSerial)target.textContent='The guided instructor is unavailable; no grade or completion was recorded.'});
 }
 function updateProgress(){
  const finished=[...progress.values()].filter(p=>p.status==='reflection_saved').length;
  get('academy-member-progress').textContent=!progressAvailable?'We cannot check saved notes right now':
   enrolled?finished+' of '+days.length+' learning notes saved':
   'Enroll to save your learning notes';
  get('academy-enroll').hidden=enrolled||!progressAvailable;
  get('academy-start').disabled=!enrolled||!progressAvailable||busy;
  get('academy-save').disabled=!enrolled||!progressAvailable||busy;
 }
 async function write(action){
  // Enrollment has one dedicated, identity-safe handler below. This function
  // handles only started days and explicitly saved private reflections.
  if(!['start','save_reflection'].includes(action)||busy||!program||!progressAvailable||!enrolled)return;
  const actor=userId,serial=sessionSerial,which=dayIndex,code=activeCode;
  const note=get('academy-reflection').value.trim();
  if(action==='save_reflection'&&(note.length<80||note.length>2000)){
   get('academy-save-status').textContent='Write 80–2,000 characters about evidence, uncertainty and a next study action.';
   get('academy-reflection').focus();return;
  }
  busy=true;updateProgress();
  get('academy-save-status').textContent=action==='save_reflection'?'Saving your learning notes…':(code==='free5'?'Starting your lesson…':'Starting your study day…');
  try{
   const payload={version:VERSION,program:code,action,day:which,
    ...(action==='save_reflection'?{reflection:note,expectedRevision:progress.get(which)?.revision||0}:{})};
   const result=await request('write',code,payload);
   if(actor!==userId||serial!==sessionSerial||code!==activeCode)return;
   progress.set(which,result.progress);
   if(action==='save_reflection'){
    if(drafts.get(which)===note)drafts.delete(which);
    if(which===dayIndex)get('academy-save-status').textContent=drafts.has(which)?
     'Your earlier reflection was saved, but newer edits are still unsaved. Select Save Reflection again.':
     'Your learning notes are saved.';
   }else if(which===dayIndex)get('academy-save-status').textContent=result.progress?.status==='reflection_saved'?
     'Your previously saved reflection remains recorded.':
     (code==='free5'?'Lesson started. No reflection has been saved yet.':'Day started. No reflection has been saved yet.');
  }catch(e){
   if(actor===userId&&serial===sessionSerial&&code===activeCode&&which===dayIndex)
    get('academy-save-status').textContent=String(e.message||'Progress was not recorded.');
  }finally{
   if(actor===userId&&serial===sessionSerial&&code===activeCode){busy=false;updateProgress();updateDays()}
  }
 }
 async function open(code){
  if(!expected.has(code))return;
  if(code==='foundations30'){window.location.assign('bootcamp.html');return}
  const epoch=++sessionSerial;activeCode=code;clean();
  status(code==='free5'?'Checking your Free member access and private learning record…':'Checking your authorized member training access…');
  try{
   client=await globalThis.getSupabaseClient();
   if(!authListenerAttached&&typeof client.auth.onAuthStateChange==='function'){
    authListenerAttached=true;
    client.auth.onAuthStateChange((_event,session)=>{
     const nextUser=session?.user?.id||'';
     if(userId&&nextUser!==userId){
      ++sessionSerial;userId='';activeCode='';clean();
      get('academy-member-progress').textContent='';
      status('The member account changed. Private study data was cleared; open a program after signing in again.');
     }
    });
   }
   const response=await client.auth.getUser();
   const member=response.data?.user;
   if(!member)throw Error('Sign in to open your Boot Camp.');
   userId=member.id;
   const data=await request('program',code);
   if(epoch!==sessionSerial)return;
   const loaded=data.curriculum;
   if(data.version!==VERSION||!Array.isArray(loaded)||loaded.length!==expected.get(code)||
    loaded.some((x,i)=>x.day!==i+1||x.programCode!==code||
      !Array.isArray(x.relatedLabs)))
    throw Error('This program’s complete learning sequence could not be verified.');
   program=data.program;days=loaded;
   progressAvailable=data.progressAvailable===true;enrolled=data.enrolled===true;
   progress.clear();for(const x of data.progress||[])progress.set(x.day,x);
   if(code==='free5'){
    const desired=Number(new URL(location.href).searchParams.get('day'));
    const firstUnsaved=days.find(d=>progress.get(d.day)?.status!=='reflection_saved')?.day||5;
    dayIndex=Number.isSafeInteger(desired)&&desired>=1&&desired<=5?desired:firstUnsaved;
   }
   get('academy-course-title').textContent=program.title;
   get('academy-length').textContent=program.days+(code==='free5'?' free beginner lessons · ':'-day Boot Camp · ')+program.level;
   get('academy-enroll').textContent=code==='free5'?'Start my free learning journey':'Enroll in this Boot Camp';
   get('academy-course-summary').textContent=program.summary;
   get('academy-workspace').hidden=false;
   document.body.classList.add('academy-classroom-active');
   // Free's 12-topic knowledge reference belongs inside the selected classroom,
   // not above the lesson as a separate catalog section.
   const library=get('academy-free-knowledge');
   const classroom=get('academy-workspace')?.querySelector('.academy-classroom-lesson');
   if(library&&classroom){
    if(code==='free5'){
     library.hidden=false;
     library.classList.add('academy-classroom-library');
     classroom.append(library);
    }else library.hidden=true;
   }
   updateProgress();renderDay();
   // Deep links should enter the selected lesson, not leave members looking
   // at the Academy storefront while their workspace appears far below.
   if(document.body.classList.contains('academy-direct-route')){
    const headline=document.querySelector('main.gu-redesign-academy h1');
    if(headline)headline.textContent=code==='free5'?
     'Free Foundations — Learn, Understand, Practice':'Boot Camp — '+program.title;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
     if(epoch!==sessionSerial||get('academy-workspace').hidden)return;
     const target=code==='free5'&&new URL(location.href).searchParams.has('day')?
      get('academy-day-title'):get('academy-course-title');
     target.setAttribute('tabindex','-1');
     target.scrollIntoView({behavior:'auto',block:'start'});
     target.focus({preventScroll:true});
    }));
   }
   status(progressAvailable?(code==='free5'?'Choose a lesson and learn with Talia at your own pace.':'Choose a study day and begin learning with Talia.'):
    'You can read the lessons, but we cannot save your notes right now. Please try again later.');
  }catch(error){
   if(epoch!==sessionSerial)return;clean();
   const message=String(error.message||'Unable to open this Academy program.');
   status(message);
   if(/sign in|invalid session|member account changed/i.test(message)){
    const link=node('a','Sign in to open this learning program');
    link.className='btn secondary';
    link.href='signin.html?next='+encodeURIComponent(location.pathname+location.search);
    get('academy-status').append(node('p','Your course was not opened because a valid member session is required.'),link);
   }
   if(/active plan|matching individual tool entitlement|authorized member training access/i.test(message)){
    const hint=node('p','Beta access requires a verified training entitlement, an eligible Founding Member plan, or Owner-approved temporary training QA access. A course listing alone is not a subscription.');
    const link=node('a','Review membership and training access');link.href='dashboard.html?tab=access';link.className='btn secondary';
    get('academy-status').append(hint,link);
   }
  }
 }
 function enterDirectRoute(code){
  document.body.classList.add('academy-direct-route');
  // Selected lessons form their own workspace; do not show the storefront
  // first. Server-side authentication, entitlements and progress are unchanged.
  for(const selector of ['.academy-free-entry','#academy-free-knowledge',
   '#academy-program-list','main.gu-redesign-academy .gu-release-actions',
   'main.gu-redesign-academy .section-intro']){
   const element=document.querySelector(selector);
   if(element)element.hidden=true;
  }
  const heading=document.querySelector('main.gu-redesign-academy h1');
  if(heading)heading.textContent=code==='free5'?
   'Opening Free Foundations':'Opening your Boot Camp';
  const nav=node('nav');nav.className='academy-return-bar';
  nav.setAttribute('aria-label','Academy program navigation');
  const back=node('a','Back to Academy programs');
  back.href='bootcamp-academy.html';
  back.className='btn secondary';
  nav.append(back,node('span',code==='free5'?
   'Free membership · guided beginner lessons':'Selected Boot Camp · private learning workspace'));
  get('academy-status').before(nav);
 }
 async function init(){
  const url=new URL(location.href),code=url.searchParams.get('program')||'';
  activeCode=expected.has(code)?code:'';
  if(activeCode){
   if(activeCode!=='foundations30')enterDirectRoute(activeCode);
   // A deep-linked course must not depend on the separate catalog request.
   void open(activeCode);
   return;
  }
  try{
   const programs=(await request('catalog')).programs;
   catalog(programs);
   status('Explore the seven Boot Camps. Sign in with eligible training access to save your progress.');
  }catch(error){status(error.message||'The Academy catalog cannot be verified.')}
 }
 get('academy-enroll').addEventListener('click',()=>void (async()=>{
  if(!program||busy||enrolled||!progressAvailable)return;
  const actor=userId,serial=sessionSerial,code=activeCode;
  busy=true;get('academy-enroll').disabled=true;
  try{
   const payload={version:VERSION,program:code,day:0,action:'enroll'};
   const result=await request('write',code,payload);
   // Protect private member state from delayed responses after a sign-out,
   // account switch or a different program opening during enrollment.
   if(actor!==userId||serial!==sessionSerial||code!==activeCode)return;
   if(result.enrolled!==true||result.program!==code)throw Error('Enrollment was not confirmed.');
   enrolled=true;get('academy-save-status').textContent=code==='free5'?'Your free learning journey is ready. Choose any lesson and use Save Reflection when ready.':'You’re enrolled. No study reflection has been saved yet; select a day and use Save Reflection when ready.';
  }catch(error){
   if(actor===userId&&serial===sessionSerial&&code===activeCode)
    get('academy-save-status').textContent=String(error.message||'Enrollment unavailable.');
  }finally{
   if(actor===userId&&serial===sessionSerial&&code===activeCode){
    busy=false;get('academy-enroll').disabled=false;updateProgress();
   }
  }
 })());
 get('academy-reflection').addEventListener('input',()=>{
  if(!program||!userId)return;
  const value=get('academy-reflection').value;
  if(value===(progress.get(dayIndex)?.reflection||''))drafts.delete(dayIndex);
  else drafts.set(dayIndex,value);
  get('academy-save-status').textContent=drafts.has(dayIndex)?
   'Unsaved reflection draft on this page. Select Save Reflection to store it privately.':'';
 });
 get('academy-start').addEventListener('click',()=>void write('start'));
 get('academy-save').addEventListener('click',()=>void write('save_reflection'));
 get('academy-prev').addEventListener('click',()=>{if(dayIndex>1){dayIndex--;renderDay()}});
 get('academy-next').addEventListener('click',()=>{if(dayIndex<days.length){dayIndex++;renderDay()}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else void init();
})();
