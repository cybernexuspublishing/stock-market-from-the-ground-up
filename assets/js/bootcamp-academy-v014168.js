/* Seven Academy programs, one instructor engine. Progress server-owned.
 * No client-side credentials, assessment keys, grades, unverified replay or
 * member entitlements. Thirty-day course uses its existing canonical route.
 */
(()=>{'use strict';
 const get=id=>document.getElementById(id);
 if(!get('academy-programs'))return;
 const VERSION='0.14.0.168';
 const expected=new Map([['truth5',5],['watchlist7',7],['scanners10',10],
  ['foundations30',30],['charts45',45],['risk60',60],['practicum90',90]]);
 let client=null,userId='',activeCode='',program=null,days=[],dayIndex=1,enrolled=false,
  progress=new Map(),progressAvailable=false,busy=false,sessionSerial=0,renderSerial=0,authListenerAttached=false;
 const status=message=>{get('academy-status').textContent=message};
 function node(tag,value){
  const element=document.createElement(tag);
  if(value!==undefined)element.textContent=String(value);
  return element;
 }
 function clean(){
  program=null;days=[];enrolled=false;progress.clear();progressAvailable=false;dayIndex=1;
  ++renderSerial;busy=false;get('academy-workspace').hidden=true;
  get('academy-lab-slot').replaceChildren();get('academy-reflection').value='';
  get('academy-save-status').textContent='';
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
   const note=node('p','Explore lessons, worked examples, and guided practice');note.className='small';
   const action=node('a',p.code==='foundations30'?'Open original 30-day Boot Camp':'Open this Boot Camp');
   action.className='btn secondary';
   action.href=p.code==='foundations30'?'bootcamp.html':'bootcamp-academy.html?program='+encodeURIComponent(p.code);
   card.append(duration,heading,description,note,action);root.append(card);
  }
 }
 function updateDays(){
  const container=get('academy-days');container.replaceChildren();
  for(const d of days){
   const button=node('button');button.type='button';button.className='gu-bc-day';
   button.setAttribute('aria-current',d.day===dayIndex?'step':'false');
   const state=progress.get(d.day)?.status==='reflection_saved'?'Reflection saved':
    progress.get(d.day)?.status==='in_progress'?'Started':'Not recorded';
   button.append(node('span','Day '+String(d.day).padStart(2,'0')+' · '+(progressAvailable?state:'Saving unavailable')),
    node('strong',d.title));
   button.addEventListener('click',()=>{dayIndex=d.day;renderDay()});
   container.append(button);
  }
 }
 function showRelated(d){
  const mount=get('academy-related');mount.replaceChildren();
  for(const row of d.relatedLabs||[]){
   if(!/^(?:F[123]|DT|TAPE)-C\d+-L\d+|^SITE-\d+$/.test(row.id))continue;
   const item=node('a','Lab '+row.id);item.href='labs.html?open='+encodeURIComponent(row.id);
   mount.append(item);
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
  mount.replaceChildren();mount.hidden=!d.lesson;
  if(!d.lesson)return;
  const lesson=d.lesson;
  mount.append(node('h4','Learn the concept'),node('p',lesson.explanation),
   node('h4','Worked source-check example'),node('p',lesson.workedExample),
   node('h4','Apply the method'));
  const steps=node('ol');
  for(const step of lesson.sourceProcedure||[])steps.append(node('li',step));
  mount.append(steps);
  if(typeof lesson.investigation==='string'&&lesson.investigation.length>100){
   mount.append(node('h4','Independent evidence investigation'),node('p',lesson.investigation));
  }
  mount.append(node('h4','Common research error'),node('p',lesson.error),
   node('h4','Transfer to a new case'),node('p',lesson.transfer),
   node('h4','Check your understanding — ungraded'),node('p',lesson.selfCheck));
  const label=node('label','Write your independent reasoning before comparing it with a model explanation.');
  label.htmlFor='academy-self-check-answer';
  const answer=node('textarea');answer.id='academy-self-check-answer';
  answer.rows=3;answer.minLength=40;answer.maxLength=1200;
  answer.setAttribute('autocomplete','off');
  const compare=node('button','Compare my reasoning');compare.type='button';
  compare.className='btn secondary';compare.disabled=true;
  const result=node('div');result.setAttribute('role','status');
  result.setAttribute('aria-live','polite');
  const use=node('button','Add reasoning to my private reflection');
  use.type='button';use.className='btn secondary';use.disabled=true;
  answer.addEventListener('input',()=>{
   const short=answer.value.trim().length<40;
   compare.disabled=short;use.disabled=short;result.replaceChildren();
  });
  use.addEventListener('click',()=>{
   const written=answer.value.trim();
   if(written.length<40)return;
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
   result.replaceChildren(node('p','Reasoning added to your private reflection draft. It is NOT saved yet: enroll if needed, then select Save Reflection. This is ungraded study evidence, not mastery.'));
   reflection.focus();
  });
  compare.addEventListener('click',()=>{
   if(answer.value.trim().length<40)return;
   result.replaceChildren(node('p','Model reasoning (formative; not a score):'),node('p',lesson.reviewGuide),
    node('p','Compare your evidence, source timestamps, limits and no-trade decision. No mastery was awarded.'));
  });
  mount.append(label,answer,compare,use,result);
 }

 function renderDay(){
  const d=days[dayIndex-1];if(!d)return;
  ++renderSerial;const renderEpoch=renderSerial;
  get('academy-stage-label').textContent='Day '+dayIndex+' of '+days.length+' · '+(d.phaseLabel||'Guided learning');
  get('academy-day-title').textContent=d.title;
  get('academy-objective').textContent=d.objective;
  get('academy-observe').textContent=d.observe;
  get('academy-practice').textContent=d.practice;
  get('academy-limits').textContent=d.limitation||d.caution;
  showOriginalInstruction(d);
  get('academy-reflection').value=progress.get(dayIndex)?.reflection||'';
  get('academy-save-status').textContent='';
  get('academy-prev').disabled=dayIndex===1;
  get('academy-next').disabled=dayIndex===days.length;
  get('academy-start').disabled=!enrolled||!progressAvailable||busy;
  get('academy-save').disabled=!enrolled||!progressAvailable||busy;
  showRelated(d);updateDays();
  const slot=get('academy-lab-slot');
  slot.replaceChildren();
  const target=node('div');slot.append(target);
  const labId=d.relatedLabs?.[0]?.id;
  if(!labId){target.append(node('p','No authorized canonical Lab is linked to this day.'));return;}
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
  if(busy||!program||!progressAvailable||!enrolled&&action!=='enroll')return;
  const actor=userId,serial=sessionSerial,which=dayIndex;
  const note=get('academy-reflection').value.trim();
  if(action==='save_reflection'&&(note.length<80||note.length>2000)){
   get('academy-save-status').textContent='Write 80–2,000 characters about evidence, uncertainty and a next study action.';
   get('academy-reflection').focus();return;
  }
  busy=true;updateProgress();
  get('academy-save-status').textContent='Saving your learning notes…';
  try{
   const payload={version:VERSION,program:activeCode,action,day:action==='enroll'?0:which,
    ...(action==='save_reflection'?{reflection:note,expectedRevision:progress.get(which)?.revision||0}:{})};
   const result=await request('write',activeCode,payload);
   if(actor!==userId||serial!==sessionSerial||payload.program!==activeCode)return;
   if(action==='enroll'){
    enrolled=true;get('academy-save-status').textContent='You’re enrolled. Your learning notes are saved to your account.';
   }else{
    progress.set(which,result.progress);
    get('academy-save-status').textContent='Your learning notes are saved.';
   }
  }catch(e){if(actor===userId&&serial===sessionSerial)
   get('academy-save-status').textContent=String(e.message||'Progress was not recorded.')}
  finally{if(actor===userId&&serial===sessionSerial){busy=false;updateProgress();updateDays()}}
 }
 async function open(code){
  if(!expected.has(code))return;
  if(code==='foundations30'){window.location.assign('bootcamp.html');return}
  const epoch=++sessionSerial;activeCode=code;clean();
  status('Checking your authorized member training access…');
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
      !Array.isArray(x.relatedLabs)||x.relatedLabs.length===0))
    throw Error('This program’s complete learning sequence could not be verified.');
   program=data.program;days=loaded;
   progressAvailable=data.progressAvailable===true;enrolled=data.enrolled===true;
   progress.clear();for(const x of data.progress||[])progress.set(x.day,x);
   get('academy-course-title').textContent=program.title;
   get('academy-length').textContent=program.days+'-day Boot Camp · '+program.level;
   get('academy-course-summary').textContent=program.summary;
   get('academy-workspace').hidden=false;
   updateProgress();renderDay();
   status(progressAvailable?'Choose a day and begin learning with Talia.':
    'You can read the lessons, but we cannot save your notes right now. Please try again later.');
  }catch(error){if(epoch!==sessionSerial)return;clean();status(error.message||'Unable to open this Academy program.')}
 }
 async function init(){
  const url=new URL(location.href),code=url.searchParams.get('program')||'';
  activeCode=expected.has(code)?code:'';
  try{
   const programs=(await request('catalog')).programs;
   catalog(programs);
   status('Explore the seven Boot Camps. Sign in with eligible training access to save your progress.');
  }catch(error){status(error.message||'The Academy catalog cannot be verified.');return}
  if(activeCode)void open(activeCode);
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
   enrolled=true;get('academy-save-status').textContent='You’re enrolled. Choose a day to begin.';
  }catch(error){
   if(actor===userId&&serial===sessionSerial&&code===activeCode)
    get('academy-save-status').textContent=String(error.message||'Enrollment unavailable.');
  }finally{
   if(actor===userId&&serial===sessionSerial&&code===activeCode){
    busy=false;get('academy-enroll').disabled=false;updateProgress();
   }
  }
 })());
 get('academy-start').addEventListener('click',()=>void write('start'));
 get('academy-save').addEventListener('click',()=>void write('save_reflection'));
 get('academy-prev').addEventListener('click',()=>{if(dayIndex>1){dayIndex--;renderDay()}});
 get('academy-next').addEventListener('click',()=>{if(dayIndex<days.length){dayIndex++;renderDay()}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else void init();
})();
