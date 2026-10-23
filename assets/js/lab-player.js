let PLAYER={lab:null,access:null,mode:'guided',locked:false,revealIndex:0};
function pe(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function q(id){return document.getElementById(id)}

/* Normalize the two EXISTING authorized Lab contracts without creating,
 * replacing or granting access to any lesson. Private Foundations content
 * stores "steps/objective"; canonical metadata stores "practiceSteps/goal".
 * Missing arrays must never crash the member player.
 */
function normalizeAuthorizedLab(raw,canonical,id){
 const l=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const m=canonical&&typeof canonical==='object'?canonical:{};
 const strings=(items)=>Array.isArray(items)?items.filter(x=>typeof x==='string'&&x.trim()).slice(0,40):[];
 const first=(...vals)=>vals.find(x=>typeof x==='string'&&x.trim())||'';
 const book=Number(l.book||m.book)||0;
 const chapter=Number(l.chapter||m.chapter)||Number(String(id).match(/-C(\d+)/)?.[1])||0;
 const originalTeaching=l.teaching&&typeof l.teaching==='object'?l.teaching:{};
 const practiceSteps=strings(l.practiceSteps).length?strings(l.practiceSteps):
   strings(l.steps).length?strings(l.steps):strings(originalTeaching.how);
 const beforeAdvance=strings(l.beforeAdvance);
 const teaching={
  ...originalTeaching,
  what:first(originalTeaching.what,l.objective,l.goal),
  why:first(originalTeaching.why,l.why),
  when:first(originalTeaching.when,l.when),
  how:strings(originalTeaching.how).length?strings(originalTeaching.how):practiceSteps,
  questions:strings(originalTeaching.questions).length?strings(originalTeaching.questions):strings(l.questions)
 };
 return {
  ...m,...l,id:first(l.id,id),book,
  chapter,chapterTitle:first(l.chapterTitle,m.chapterTitle,'Chapter '+chapter),
  concept:first(l.concept,m.concept,l.title,id),
  goal:first(l.goal,l.objective,m.goal),
  ticker:first(l.ticker,m.ticker),
  date:first(l.date,m.date),
  timeframe:first(l.timeframe,m.timeframe),
  start:first(l.start,m.start),
  end:first(l.end,m.end),
  skill:first(l.skill,m.skill),
  practiceSteps,beforeAdvance,teaching,
  dataNote:first(l.dataNote,l.historicalEvidence),
  // Never infer a real historical chart from registry metadata.
  portableVisual:l.portableVisual&&typeof l.portableVisual==='object'?l.portableVisual:null
 };
}
async function canonicalPublishedMetadata(id){
 try{
  const r=await fetch('/data/labs.json',{cache:'force-cache'});
  if(!r.ok)return {};
  const rows=await r.json();
  return Array.isArray(rows)?rows.find(l=>l?.id===id)||{}:{};
 }catch{return {}}
}

async function loadJSONLocal(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error(`Unable to load ${path}`);return r.json()}
function modeCopy(mode){return ({guided:'Guided Mode follows the book example step by step. Record your observation before revealing each part of the book-guided sequence.',practice:'Practice Mode gives you the historical setup but withholds the guided sequence until you commit your reasoning.',blind:'Blind Decision Mode visually hides the concept, task, and interpretive guidance until you commit your decision. This browser exercise is not a tamper-resistant assessment: source instructions can be available to the client. Only server-verified private assessed cases can establish graded skill evidence.',assessment:'Assessment Mode records a first attempt and grades only reviewed questions using the secure instructor. The legacy reflection-completion percentage is not a competency score.'})[mode]}
function metadata(lab,blind){
  const rows=[['Ticker',lab.ticker],['Historical date',lab.date],['Start / Pause',lab.start],['End',lab.end],['Timeframe',lab.timeframe],['Setup',lab.setupLevel],['Studies/Indicators',lab.studies]];
  if(!blind&&lab.referenceZone)rows.push(['Reference zone',lab.referenceZone]);
  return `<div class="lab-fact-grid">${rows.filter(x=>x[1]).map(x=>`<div><span>${pe(x[0])}</span><strong>${pe(x[1])}</strong></div>`).join('')}</div>`;
}
function portableVisual(lab){
  const v=lab.portableVisual;
  if(!v?.src)return '';
  const constructed=v.kind==='constructed';
  return `<div class="card portable-visual-card"><div class="eyebrow">Portable teaching visual</div><h2>${constructed?'Constructed in-book teaching visual':'In-book instructional visual'}</h2><figure class="lab-portable-figure"><a href="${pe(v.src)}" target="_blank" rel="noopener"><img src="${pe(v.src)}" alt="${pe(v.alt||v.caption||'Instructional chart')}"></a>${v.caption?`<figcaption>${pe(v.caption)}</figcaption>`:''}</figure><div class="${constructed?'notice':'small'}">${constructed?'<strong>Important:</strong> This figure is a portable teaching aid and is not the historical market chart. Reproduce the historical exercise with the ticker, date, time boundary, timeframe, and studies shown below.':'Use this figure as the portable book companion. The historical exercise remains governed by the exact lab setup and observation boundary.'}</div></div>`;
}
async function attachFoundationsCurriculum(labId){
 const box=q('v01499-original-skills');if(!box)return;
 try{
  const r=await fetch('/data/competency-lab-paths-v01499.json',{cache:'force-cache'});
  if(!r.ok)throw Error('Unavailable');
  const map=await r.json(),skills=map.byLab?.[labId]?.relatedCompetencies||[];
  box.replaceChildren();
  for(const code of skills.slice(0,3)){
   const link=document.createElement('a');link.className='btn secondary';
   link.href='skills.html#guide-'+encodeURIComponent(code);
   link.textContent='Study '+code.replaceAll('_',' ');box.append(link);
  }
 }catch{box.textContent='Curriculum links cannot be loaded currently.';}
}
function originalScenarioLink(lab){
 const id=String(lab?.id||'');
 if(!/^[A-Za-z0-9_-]{3,90}$/.test(id))return '';
 const syntheticCode='GUSIM_'+id.replaceAll('-','_');
 return `<section class="card"><div class="eyebrow">Original author-created practice data</div><h2>Private progressive simulated chart</h2><p>This is a FICTIONAL educational OHLCV example made by this platform, not the real historical chart for the book's ticker/date. The server reveals each invented bar only after you lock your own decision. It does not prove historical market behavior.</p><a class="btn secondary" href="verified-replay.html?dataset=${encodeURIComponent(syntheticCode)}">Practice original simulated replay</a></section>`;
}
function evidenceForm(){return `<div class="card decision-card"><div class="eyebrow">Your evidence chain</div><h2>Record your read before revealing guidance.</h2><label>Structure / price behavior</label><textarea id="ev-structure" rows="3" placeholder="What has price actually done so far?"></textarea><label>Location / levels</label><textarea id="ev-location" rows="3" placeholder="Where is price relative to the level, zone, VWAP, EMA, or other lesson reference?"></textarea><label>Volume / participation</label><textarea id="ev-volume" rows="3" placeholder="What does volume or participation show? If it is not part of this lesson, write N/A."></textarea><label>What would invalidate or change your read?</label><textarea id="ev-invalidation" rows="3" placeholder="State the evidence that would make you revise the interpretation."></textarea><div class="form-grid"><div><label for="ev-decision">Decision</label><select id="ev-decision"><option value="">Choose…</option><option value="ENTER">ENTER</option><option value="WATCH">WATCH</option><option value="NO_TRADE">NO TRADE</option><option value="OBSERVATION_ONLY">OBSERVATION ONLY</option></select></div><div><label for="ev-confidence">Confidence</label><select id="ev-confidence"><option value="">Choose…</option><option value="1">1 — Low</option><option value="2">2</option><option value="3">3 — Moderate</option><option value="4">4</option><option value="5">5 — High</option></select></div></div><label>Reasoning / notes</label><textarea id="ev-notes" rows="4" placeholder="Explain why the evidence supports your choice."></textarea><div class="actions"><button class="btn" type="button" id="lock-decision">Lock Decision</button></div><div id="decision-msg" class="inline-status"></div></div>`}
function mistakePanel(){const tags=['Entered before confirmation','Ignored volume/context','Misread structure','Misread support/resistance','Misread VWAP/EMA relationship','Chased extension','Failed to define invalidation','Changed thesis after seeing outcome','Should have selected NO TRADE','Other'];return `<div class="card"><div class="eyebrow">Reflection</div><h2>What did you miss or handle well?</h2><p class="small">These tags build your personal mistake profile. Select only what actually applies.</p><div class="check-grid">${tags.map((x,i)=>`<label><input type="checkbox" name="mistake" value="${pe(x)}"> ${pe(x)}</label>`).join('')}</div><label>Post-lab reflection</label><textarea id="reflection" rows="4" placeholder="What will you do differently next time?"></textarea><div class="actions"><button class="btn" type="button" id="complete-attempt" disabled>Complete & Save Attempt</button><a class="btn secondary" id="discuss-lab" href="forum.html" hidden>Discuss this Lab</a></div><div id="attempt-msg" class="inline-status"></div></div>`}
function collectDecision(){return {structure:q('ev-structure')?.value.trim()||'',location:q('ev-location')?.value.trim()||'',volume:q('ev-volume')?.value.trim()||'',invalidation:q('ev-invalidation')?.value.trim()||'',decision:q('ev-decision')?.value||'',confidence:Number(q('ev-confidence')?.value||0),notes:q('ev-notes')?.value.trim()||''}}
function processScore(a){const items=[a.structure,a.location,a.volume,a.invalidation,a.decision,a.confidence,a.notes];return Math.round(items.filter(v=>v!==''&&v!==0).length/items.length*100)}
function processBreakdown(a){return {structure:!!a.structure,location:!!a.location,volume_context:!!a.volume,invalidation:!!a.invalidation,decision:!!a.decision,confidence:!!a.confidence,reasoning:!!a.notes}}
function renderGuidance(){const lab=PLAYER.lab;const target=q('guided-sequence');if(!target)return;const max=Math.min(PLAYER.revealIndex,lab.practiceSteps.length);target.innerHTML=lab.practiceSteps.slice(0,max).map((s,i)=>`<div class="guided-step"><span>${i+1}</span><p>${pe(s)}</p></div>`).join('');const b=q('reveal-next');if(b){if(max>=lab.practiceSteps.length){b.textContent='All guidance revealed';b.disabled=true}else b.textContent=`Reveal guided step ${max+1}`}}
function orientationTeaching(lab,blind){
 const t=lab.teaching;if(blind||!t||![t.what,t.why,t.when].some(Boolean))return '';
 const paragraph=(label,value)=>value?`<p><strong>${label}:</strong> ${pe(value)}</p>`:'';
 const questions=Array.isArray(t.questions)?t.questions.slice(0,5):[];
 return `<section class="card" aria-label="Lab-specific conceptual teaching"><div class="eyebrow">Original conceptual study</div><h2>Understand this Lab</h2><p class="small">These are the existing canonical study notes for this Lab. They are not a reviewed answer key or verified historical record. The guided steps remain hidden until you lock your decision.</p>${paragraph('What',t.what)}${paragraph('Why',t.why)}${paragraph('When to use it',t.when)}${questions.length?`<h3>Questions to consider</h3><ol>${questions.map(x=>`<li>${pe(x)}</li>`).join('')}</ol>`:''}</section>`;
}
function lockDecision(){const a=collectDecision();if(!a.decision||!a.confidence){q('decision-msg').textContent='Choose a decision and confidence level before locking your answer.';q('decision-msg').className='inline-status error';return}PLAYER.locked=true;syncPlayerMode();document.querySelectorAll('.decision-card textarea,.decision-card select').forEach(el=>el.disabled=true);q('lock-decision').disabled=true;q('decision-msg').textContent=`Decision locked. Process completeness: ${processScore(a)}%. This score measures whether you documented the process, not whether a trade outcome was profitable.`;q('decision-msg').className='inline-status success';if(PLAYER.mode==='blind'){q('player-title').textContent=PLAYER.lab.concept;const study=orientationTeaching(PLAYER.lab,false);if(study)q('gu-ws-study-source')?.insertAdjacentHTML('beforeend',study);void attachFoundationsCurriculum(PLAYER.lab.id)}q('reveal-panel').hidden=PLAYER.mode!=='guided';if(q('complete-attempt'))q('complete-attempt').disabled=PLAYER.mode==='assessment';PLAYER.revealIndex=PLAYER.mode==='guided'?1:0;renderGuidance();const assessmentBox=q('v014-training-slot');if(assessmentBox){const launchedLab=PLAYER.lab.id,launchedMode=PLAYER.mode,launchedBox=assessmentBox;window.GroundUpInteractiveTraining?.begin(launchedLab,launchedMode,assessmentBox).then(available=>{if(PLAYER.lab?.id!==launchedLab||PLAYER.mode!==launchedMode||q('v014-training-slot')!==launchedBox)return;if(!available&&PLAYER.mode!=='assessment')q('reveal-panel').hidden=false;if(!available&&PLAYER.mode==='assessment'){q('decision-msg').textContent='Assessment scoring is unavailable without a reviewed question bank. You may still practice in Guided Mode; completion is not graded.';}})}
 q('reveal-panel').scrollIntoView({behavior:'smooth',block:'start'})}
function revealNext(){PLAYER.revealIndex=Math.min(PLAYER.lab.practiceSteps.length,PLAYER.revealIndex+1);renderGuidance()}
async function saveAttempt(){const msg=q('attempt-msg');const access=PLAYER.access;if(!access.user){msg.textContent='Sign in to save attempts to your Market Skills Record.';msg.className='inline-status error';return}const a=collectDecision();const mistakes=[...document.querySelectorAll('input[name="mistake"]:checked')].map(x=>x.value);const reflection=q('reflection')?.value.trim()||'';const row={user_id:access.user.id,lab_id:PLAYER.lab.id,skill_code:PLAYER.lab.skill,mode:PLAYER.mode,decision:a.decision||null,confidence:a.confidence||null,evidence:{structure:a.structure,location:a.location,volume:a.volume},invalidation:a.invalidation||null,notes:a.notes||null,process_score:processScore(a),process_breakdown:processBreakdown(a),mistakes,reflection,book_number:Number(PLAYER.lab.book)};const {error}=await access.sb.from('lab_attempts').insert(row);if(error){msg.textContent=error.message;msg.className='inline-status error';return}await access.sb.from('lab_progress').upsert({user_id:access.user.id,lab_id:PLAYER.lab.id,status:'completed',score:null,updated_at:new Date().toISOString(),completed_at:new Date().toISOString()},{onConflict:'user_id,lab_id'});msg.innerHTML=`Attempt saved. <a href="skills.html">View your Market Skills Record</a>. Lab discussion is now unlocked for this attempt.`;msg.className='inline-status success';q('complete-attempt').disabled=true;if(q('discuss-lab'))q('discuss-lab').hidden=false}
/* D09: Link only a whitelisted instructional TOPIC to Market Tutor.
 * Never transmit Lab rubric, answer key, learner reasoning, ticker, historical
 * data or future hidden candles. Guided/practice only; no blind answer leaks.
 */
function tutorSafeSubject(lab){
 const concept=String(lab?.concept||'');
 const topics=[
  [/vwap/i,'VWAP context and its limitations'],
  [/candl|wick|OHLC/i,'candlestick anatomy and candle interpretation'],
  [/\bema|moving average/i,'EMA9 and EMA20 as contextual indicators'],
  [/level ii|level 2|time\s*(?:and|&)\s*sales|tape/i,'bid ask spread and Level II limitations'],
  [/risk|stop|sizing/i,'risk per share and risk management'],
  [/breakout|resistance/i,'breakout confirmation and invalidation'],
  [/support|pullback/i,'support and resistance evidence'],
  [/volume|liquid|float/i,'volume liquidity and execution uncertainty'],
  [/trend|momentum|high|low/i,'higher highs lower lows and trend structure']
 ];
 return topics.find(([pattern])=>pattern.test(concept))?.[1]||'decision uncertainty and observable evidence';
}
/* Optional in-Lab Market Tutor uses the EXISTING authenticated API.
 * An explicit Lab ID selects only approved public competency guidance;
 * an AI opt-in instead uses the whitelisted topic so the existing backend's
 * canonical-ID source-only short-circuit does not silently bypass paid AI.
 * Never attach a rubric, historical candles, assessed answer or learner notes.
 */
async function requestLabTutor({question,allowModel=false,signal}={}){
 if(!['guided','practice'].includes(PLAYER.mode))
  throw Error('Tutor explanations are not available during independent decision modes.');
 const sb=PLAYER.access?.sb;
 let token=null;
 try{token=(await sb?.auth?.getSession?.())?.data?.session?.access_token||null}catch{}
 if(!token)throw Error('Sign in to use Market Tutor. Free Lab explanations remain available without an AI request.');
 const id=String(PLAYER.lab?.id||'');
 const onlyGeneral=String(question||'').trim();
 const clean=/^[A-Za-z0-9_-]{3,90}$/.test(id)&&allowModel!==true
  ?('For canonical Lab '+id+': '+onlyGeneral).slice(0,450):onlyGeneral.slice(0,450);
 if(clean.length<4)throw Error('Enter a general learning question first.');
 const reply=await fetch('/api/market-tutor',{method:'POST',cache:'no-store',signal,
  headers:{authorization:'Bearer '+token,'content-type':'application/json'},
  body:JSON.stringify({question:clean,mode:'explain',requestId:crypto.randomUUID(),
   allowModel:allowModel===true,saveHistory:false})});
 const data=await reply.json().catch(()=>null);
 if(!reply.ok||data?.ok!==true){
  const feedback=reply.status===403?'Market Tutor requires an active Tutor or Full Platform entitlement. Your free instructional panels remain available.'
   :reply.status===401?'Your session expired; sign in again.':reply.status===429?'Market Tutor rate limit reached. Please use the free instructional panels or retry later.'
   :String(data?.error||'Market Tutor is currently unavailable.');
  throw Error(feedback);
 }
 if(typeof data.answer!=='string'||!data.answer.trim())throw Error('Market Tutor did not return an explanation.');
 return {answer:data.answer,generation:data.generation||'reviewed-glossary-logic',
  aiReason:data.aiReason||null};
}
function mountLabTutorLink(lab,mode){
 if(!['guided','practice'].includes(mode))return;
 const target=document.getElementById('v01499-original-skills');if(!target)return;
 const link=document.createElement('a');
 link.className='btn secondary';link.textContent='Ask Market Tutor About This Step';
 link.href='/market-tutor.html?q='+encodeURIComponent('Explain '+tutorSafeSubject(lab)+'. Include what can invalidate an interpretation.');
 link.target='_blank';link.rel='noopener noreferrer';
 link.setAttribute('aria-label','Ask Market Tutor about the current general instructional concept in a new tab');
 target.append(link);
 const notice=document.createElement('p');
 notice.className='small';
 notice.textContent='Only general approved subject context is passed. No private questions, rubric, grades, future candles, or your written answers. Active Tutor access is required.';
 target.append(notice);
}
function syncPlayerMode(){
 const select=q('player-mode-select');if(!select)return;
 const trigger=q('player-mode-trigger');
 const fraction=Number(q('gu-v32-teaching-slot')?.querySelector('[data-v32-progress]')?.dataset.v32Progress||0);
 const restricted=PLAYER.locked||fraction>=1/3;
 select.value=PLAYER.mode;select.disabled=restricted;
 if(trigger){trigger.disabled=restricted;trigger.textContent=({guided:'Guided',practice:'Practice',blind:'Blind Decision',assessment:'Assessment'})[PLAYER.mode]+' ▾';}
 const label=q('player-mode-status');if(label)label.textContent=restricted?'Locked for this attempt':'Unlocked';
 if(restricted){const menu=q('player-mode-menu');if(menu)menu.hidden=true;if(trigger)trigger.setAttribute('aria-expanded','false')}
 const row=q('player-mode-restart-row');if(row)row.hidden=!restricted;
}
function inlineModeConfirmation(nextMode,allowChoice=false){
 const target=q('player-mode-confirm');if(!target)return;
 target.hidden=false;target.replaceChildren();
 const title=document.createElement('strong');title.textContent='Changing mode restarts this attempt';
 const summary=document.createElement('p');
 summary.textContent='Unsaved teaching and answers will reset. Previously submitted server assessments are not deleted.';
 const from=document.createElement('p');from.textContent='Current mode: '+PLAYER.mode;
 const to=document.createElement('p');to.append(document.createTextNode('New mode: '));
 const selected=document.createElement('strong');selected.className='gu-v33-selected-mode';selected.textContent=nextMode;to.append(selected);
 target.append(title,summary,from,to);
 let picker=null;
 if(allowChoice){
  const label=document.createElement('label');label.textContent='Select mode for the new attempt';
  picker=document.createElement('select');picker.setAttribute('aria-label','New learning mode');
  for(const [code,text] of [['guided','Guided'],['practice','Practice'],['blind','Blind Decision'],['assessment','Assessment']]){
   const option=document.createElement('option');option.value=code;option.textContent=text;picker.append(option);
  }
  picker.value=nextMode;
  picker.addEventListener('change',()=>{selected.textContent=picker.value});
  label.append(picker);target.append(label);
 }
 const actions=document.createElement('div');actions.className='actions';
 const cancel=document.createElement('button'),yes=document.createElement('button');
 cancel.type=yes.type='button';cancel.className='btn secondary';yes.className='btn';
 cancel.textContent='Cancel';yes.textContent='Yes, Continue';
 cancel.addEventListener('click',()=>{target.hidden=true;target.replaceChildren();syncPlayerMode()});
 yes.addEventListener('click',()=>{
  const destination=picker?.value||nextMode;
  target.hidden=true;target.replaceChildren();
  PLAYER.mode=destination;PLAYER.locked=false;PLAYER.revealIndex=0;renderPlayer();
 });
 actions.append(cancel,yes);target.append(actions);yes.focus();
}

function renderPlayer(){window.GroundUpInteractiveTraining?.cancel?.();const lab=PLAYER.lab,mode=PLAYER.mode,advanced=['practice','blind','assessment'].includes(mode);const allowed=mode==='guided'?PLAYER.access.serverGuidedAllowed===true:PLAYER.access.serverAdvancedAllowed===true;syncPlayerMode();q('player-mode-description').textContent=modeCopy(mode);if(!allowed){q('player-workspace').innerHTML=`<div class="card paywall-card"><h2>${mode==='guided'?'Guided lab access':'Learning Member feature'}</h2><p>${mode==='guided'?'This guided book lab is available to active Learning Members, readers who redeemed this book, and selected free samples.':'Practice, Blind Decision, and Assessment modes require active Full Learning Access.'}</p><div class="actions"><a class="btn" href="membership.html">View Membership</a><a class="btn secondary" href="settings.html">Redeem a Book Key</a></div></div>`;return}
 const blind=mode==='blind'||mode==='assessment';q('player-title').textContent=blind?(mode==='blind'?'Blind Market Decision':'Independent Lab Assessment'):(lab.id==='F2-C07-L01'||lab.id==='F2-C07-L02'?'Build and Understand a Candlestick':lab.id==='F3-C06-L01'?'Understand VWAP and Replay the Market':lab.concept);const task=blind?'':(lab.goal?`<div class="notice"><strong>Book task:</strong> ${pe(lab.goal)}</div>`:'');const before=(mode==='guided'&&lab.beforeAdvance.length)?`<div class="card"><div class="eyebrow">Before You Advance</div>${lab.beforeAdvance.map(x=>`<p>${pe(x)}</p>`).join('')}</div>`:'';q('player-workspace').innerHTML=`<div class="gu-ws"><section id="gu-v32-teaching-slot" aria-label="Lab Engine v3.2 and Learning v3.3"></section><div class="gu-ws-disclosures"><details class="gu-ws-source"><summary>Historical chart and source status</summary><div class="gu-ws-disclosure-body"><aside class="lab-learning-visual" aria-label="Chart and visual source"><div class="lab-learning-provenance">${blind?'<div class="card"><p>Historical source visuals and interpretive cues are concealed in independent decision modes. Use only server-authorized replay observations; no future bars are loaded by this workstation.</p></div>':(portableVisual(lab)||'<div class="card"><h2>No verified chart attached</h2><p>This Lab has no approved source chart embedded. Use the book setup and observation boundary; do not treat a hypothetical or absent visual as real history. A chart must be approved before this Lab can pass full visual acceptance.</p></div>')}</div></aside></div></details><details class="gu-ws-resources"><summary>Historical setup, replay and curriculum references</summary><div class="gu-ws-disclosure-body">${blind?'':originalScenarioLink(lab)}<section class="card"><h2>Original companion competency guides</h2><p>Suggested study topics are separate from the approved book manuscript and graded answers.</p><div id="v01499-original-skills"></div></section><div class="card"><div class="eyebrow">Historical setup</div>${metadata(lab,blind)}${task}</div>${before}<div id="gu-ws-study-source"></div></div></details></div><details id="gu-ws-member-workbench" class="gu-ws-workbench" ${blind?"open":""}><summary>Member decision, protected assessment and reflection</summary><div class="gu-ws-workbench-body">${evidenceForm()}<div id="reveal-panel" class="card" hidden><div class="eyebrow">Book-guided sequence</div><h2>Reveal only after you committed your read.</h2><div id="guided-sequence"></div><div class="actions"><button class="btn secondary" id="reveal-next" type="button">Reveal next guided step</button></div>${lab.dataNote?`<p class="small"><strong>Data note:</strong> ${pe(lab.dataNote)}</p>`:''}</div><section id="v014-training-slot" class="dashboard-space"></section>${mistakePanel()}</div></details></div>`;
 const study=orientationTeaching(lab,blind);if(study)q('gu-ws-study-source')?.insertAdjacentHTML('beforeend',study);
 // The v3.3 shared journey owns ALL canonical Lab instruction; the 3.2
 // specialist is only a compatibility fallback if the universal script fails to load.
 if(window.GroundUpLabEngineV32Universal){
  void window.GroundUpLabEngineV32Universal.mount({labId:lab.id,mode,target:q("gu-v32-teaching-slot"),lab,focusId:'ev-decision',tutorTopic:tutorSafeSubject(lab),tutorRequest:requestLabTutor});
 }else window.GroundUpLabEngineV32?.mount?.({labId:lab.id,mode,target:q("gu-v32-teaching-slot")});
 if(!blind)void attachFoundationsCurriculum(lab.id);
 mountLabTutorLink(lab,mode);
 syncPlayerMode();
 q('lock-decision').addEventListener('click',lockDecision);q('reveal-next').addEventListener('click',revealNext);q('complete-attempt').addEventListener('click',saveAttempt);q('discuss-lab').href=`forum.html?lab=${encodeURIComponent(lab.id)}`;
 if(PLAYER.access.user&&PLAYER.access.sb?.from){
  PLAYER.access.sb.from('lab_attempts').select('id',{count:'exact',head:true}).eq('user_id',PLAYER.access.user.id).eq('lab_id',lab.id).then(({count})=>{if(count>0&&q('discuss-lab'))q('discuss-lab').hidden=false}).catch(()=>{});
 }
}
async function initPlayer(){try{const id=new URLSearchParams(location.search).get('lab');if(!id){q('lab-player-gate').innerHTML='<div class="notice"><strong>Choose a Lab to begin.</strong> Open the <a href="labs.html">419-Lab Registry</a> and select a published Lab.</div>';return}if(!/^[A-Za-z0-9_-]{3,90}$/.test(id)){q('lab-player-gate').innerHTML='<div class="notice">This Lab link is invalid. <a href="labs.html">Choose a Lab from the Registry</a>.</div>';return}const sb=await window.getSupabaseClient();const session=(await sb?.auth.getSession())?.data?.session;const fetchOptions={cache:'no-store',headers:session?{authorization:'Bearer '+session.access_token}:{}};let response=await fetch('/api/lab-content?id='+encodeURIComponent(id),fetchOptions);
 let payload=await response.json().catch(()=>({}));
 // Canonical book companion route remains authoritative when published.
 // Only missing authored content is eligible for server-authorized, ungraded
 // registry orientation. A 403 entitlement denial is NEVER bypassed.
 if(response.status===404||response.status===503){
  // A private-store failure should not erase independently authorized, safe
  // conceptual instruction. This fallback re-checks auth, account restrictions,
  // published Lab status, and entitlements on the server. 401/403 never retry.

  response=await fetch('/api/lab-player-context?id='+encodeURIComponent(id||''),fetchOptions);
  payload=await response.json().catch(()=>({}));
 }
 if(!response.ok||!payload.ok){
  const failure=new Error(response.status===503?
   'The Lab service is temporarily unavailable. Your lesson and progress have not been changed.':
   payload.error||'Lab not available.');
  failure.qaCode=String(payload.code||'');
  throw failure;
 }const lab=normalizeAuthorizedLab(payload.lab,await canonicalPublishedMetadata(id),id);PLAYER.lab=lab;
 // Server-reported entitlement is authoritative. Optional client-side
 // dashboard access state may fail separately and must not hide a valid Lab.
 // The Lab API has already authorized the entitlement. Do not block the
 // lesson display on optional legacy dashboard queries, which can hang or
 // fail independently of the server-approved Lab and are not authoritative.
 PLAYER.access={user:session?.user||null,sb:sb||null,redeemedBooks:new Set()};
 PLAYER.access.isMember=payload.advancedAllowed===true;PLAYER.access.serverAdvancedAllowed=payload.advancedAllowed===true;PLAYER.access.serverGuidedAllowed=payload.guidedAllowed===true;PLAYER.access.redeemedBooks=payload.guidedAllowed?new Set([Number(lab.book)]):new Set();const requestedMode=new URLSearchParams(location.search).get('mode');if(['guided','practice','blind','assessment'].includes(requestedMode))PLAYER.mode=requestedMode;q('player-lab-id').textContent=lab.id;
  const picker=q('player-reference-select');
  if(picker){
   if(!Array.from(picker.options).some(o=>o.value===lab.id)){
    const choice=document.createElement('option');choice.value=lab.id;choice.textContent=lab.concept+' · '+lab.id;picker.append(choice);
   }
   picker.value=lab.id;
   picker.addEventListener('change',()=>{const id=picker.value;if(/^[A-Za-z0-9_-]{3,90}$/.test(id))location.assign('lab-player.html?lab='+encodeURIComponent(id))});
  }
  q('player-title').textContent=lab.id==='F2-C07-L01'||lab.id==='F2-C07-L02'?'Build and Understand a Candlestick':lab.id==='F3-C06-L01'?'Understand VWAP and Replay the Market':lab.concept;
  const bookTitle=({1:'Foundations I',2:'Foundations II',3:'Foundations III',4:'Day Trading',5:'Reading the Tape'})[Number(lab.book)]||'Interactive Learning';
  q('player-location').textContent=bookTitle+' · Lab Engine v3.2 + Learning v3.3 · '+lab.id;q('lab-player-gate').innerHTML='';q('lab-player-content').hidden=false;document.title=`${lab.id} — ${lab.concept} | Interactive Lab`;if(payload.sourceStatus==='canonical_registry_safe_orientation_only'){
  const note=document.createElement('div');note.className='notice';
  note.textContent='This canonical Lab has member-authorized conceptual orientation, not independently approved historical teaching, licensed charts, or a reviewed assessment. No score or proficiency certification is implied.';
  q('player-access-note').replaceChildren(note);
 }else if(payload.sourceStatus==='private_unreviewed_conceptual_orientation')q('player-access-note').innerHTML='<div class="notice"><strong>Original conceptual draft:</strong> This private lesson is an unreviewed hypothetical orientation. It is not an approved book-authored Lab, verified historical exercise, or reviewed assessment. Use the book and the existing competency study guide for the subject.</div>';else if(PLAYER.access.isMember)q('player-access-note').innerHTML='<div class="oknotice"><strong>Full Learning Access:</strong> Guided, Practice, Blind Decision, and Assessment modes are available.</div>';else if(PLAYER.access.redeemedBooks.has(Number(lab.book)))q('player-access-note').innerHTML='<div class="oknotice"><strong>Book-owner companion access:</strong> Guided mode for this book remains available. Advanced modes require active Full Learning Access.</div>';else if(window.SiteAccess.SAMPLE_LABS.has(lab.id))q('player-access-note').innerHTML='<div class="notice"><strong>Free sample:</strong> This Guided lab is open as a sample. Advanced modes require Full Learning Access.</div>';else q('player-access-note').innerHTML='<div class="notice"><strong>Free Reader:</strong> Redeem this book in Settings or activate membership for Guided access.</div>';q('player-mode-select')?.addEventListener('change',event=>{
  const next=event.target.value;
  if(next===PLAYER.mode)return;
  const fraction=Number(q('gu-v32-teaching-slot')?.querySelector('[data-v32-progress]')?.dataset.v32Progress||0);
  if(PLAYER.locked||fraction>=1/3){syncPlayerMode();return}
  if(fraction>0)inlineModeConfirmation(next,false);
  else{PLAYER.mode=next;PLAYER.locked=false;PLAYER.revealIndex=0;renderPlayer()}
 });
 const modeMenu=q('player-mode-menu'),modeTrigger=q('player-mode-trigger');
  modeTrigger?.addEventListener('click',()=>{
   if(modeTrigger.disabled)return;
   modeMenu.hidden=!modeMenu.hidden;
   modeTrigger.setAttribute('aria-expanded',String(!modeMenu.hidden));
   if(!modeMenu.hidden)modeMenu.querySelector('[data-member-mode]')?.focus();
  });
  modeMenu?.addEventListener('keydown',event=>{
   if(event.key==='Escape'){
    event.preventDefault();modeMenu.hidden=true;
    modeTrigger?.setAttribute('aria-expanded','false');modeTrigger?.focus();
   }
  });
  q('player-mode-close')?.addEventListener('click',()=>{
   modeMenu.hidden=true;modeTrigger?.setAttribute('aria-expanded','false');modeTrigger?.focus();
  });
  modeMenu?.querySelectorAll('[data-member-mode]').forEach(btn=>{
   btn.addEventListener('click',()=>{
    const next=btn.dataset.memberMode;
    modeMenu.hidden=true;modeTrigger?.setAttribute('aria-expanded','false');
    if(next===PLAYER.mode)return;
    const select=q('player-mode-select');if(!select||select.disabled)return;
    select.value=next;select.dispatchEvent(new Event('change',{bubbles:true}));
   });
  });
  q('player-mode-help')?.addEventListener('click',()=>{
  const panel=q('player-mode-description');panel.hidden=!panel.hidden;
  q('player-mode-help').setAttribute('aria-expanded',String(!panel.hidden));
  panel.textContent=modeCopy(PLAYER.mode);
 });
 q('player-restart-mode')?.addEventListener('click',()=>inlineModeConfirmation(PLAYER.mode,true));
 document.addEventListener('gu-v33-stage-change',syncPlayerMode);
 renderPlayer()}catch(e){
 const gate=q('lab-player-gate');
 gate.replaceChildren();
 const notice=document.createElement('div');notice.className='notice';
 const text=document.createElement('p');text.textContent=e.message||'The Lab could not be opened.';notice.append(text);
 if(/^LAB_(?:REQUEST|AUTH|REGISTRY|MEMBER|FLAGS|PREMIUM|BOOK|TEACHING)_UNAVAILABLE$/.test(String(e.qaCode||''))){
  const code=document.createElement('p');code.className='small';
  code.textContent='Support reference: '+e.qaCode;notice.append(code);
 }
 const back=document.createElement('a');back.href='labs.html';back.className='btn secondary';back.textContent='Open Lab Registry';
 const retry=document.createElement('button');retry.type='button';retry.className='btn';retry.textContent='Retry Lab';
 retry.addEventListener('click',()=>{retry.disabled=true;void initPlayer()});
 const actions=document.createElement('div');actions.className='actions';actions.append(retry,back);
 notice.append(actions);gate.append(notice);
}}
window.addEventListener('v014-training-complete',event=>{
 if(event.detail?.labId!==PLAYER.lab?.id)return;
 const reveal=q('reveal-panel');if(reveal){reveal.hidden=false;PLAYER.revealIndex=PLAYER.lab.practiceSteps.length;renderGuidance()}
 if(q('complete-attempt'))q('complete-attempt').disabled=false;
 const note=q('decision-msg');if(note)note.textContent=`Reviewed exercise: ${event.detail.report?.score??'—'}% based on the book-authored answer key. Historical market accuracy is not independently verified.`;
});
document.addEventListener('DOMContentLoaded',initPlayer);
