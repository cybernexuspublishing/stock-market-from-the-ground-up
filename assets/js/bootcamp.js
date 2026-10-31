/* v0.14.0.144 — single member training surface; no secrets or grades in DOM.
 * Existing entitlement via unversioned /api/bootcamp; records server-owned.
 */
(()=>{'use strict';
 const q=id=>document.getElementById(id),root=q('gu-bc-shell');
 if(!root)return;
 let sb=null,activeUser='',days=[],selected=1,progress=new Map(),checkpoints=new Map(),sourceCases=new Map(),progressAvailable=false,busy=false,loadSerial=0,guidedSession=null;
 const status=text=>{q('gu-bc-status').textContent=text};
 async function betaEnrollment(enroll=false){
  const note=q('gu-bc-enrollment-status'),button=q('gu-bc-enroll');
  const auth=(await sb.auth.getSession()).data?.session;
  if(!auth||auth.user?.id!==activeUser)return;
  const response=await fetch('/api/bootcamp-academy'+(enroll?'':'?program=foundations30'),{
   method:enroll?'POST':'GET',cache:'no-store',
   headers:{authorization:'Bearer '+auth.access_token,...(enroll?{'content-type':'application/json'}:{})},
   ...(enroll?{body:JSON.stringify({version:'0.14.0.168',program:'foundations30',day:0,action:'enroll'})}:{})
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok||result.ok!==true)throw Error(result.error||'Beta enrollment status unavailable.');
  if(result.enrolled===true){
   button.hidden=true;note.textContent='Enrolled in the 30-day educational beta. Your day notes remain in the original study record.';
  }else{
   button.hidden=false;note.textContent='Your existing training access is confirmed. Enrollment records this course in your beta program list.';
  }
 }

 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);return n};
 const link=(href,title)=>{
   const a=el('a',title);a.href=href;return a;
 };
 function clear(){
  guidedSession?.dispose?.();guidedSession=null;
  progress.clear();checkpoints.clear();sourceCases.clear();progressAvailable=false;days=[];root.hidden=true;
  q('gu-bc-note').value='';q('gu-bc-days').replaceChildren();q('gu-bc-labs').replaceChildren();
 }
 async function api(method='GET',payload){
  const session=(await sb.auth.getSession()).data?.session;
  if(!session||session.user?.id!==activeUser)throw Error('Current member session changed; reload under the new account.');
  const r=await fetch('/api/bootcamp'+(method==='GET'?'?action=curriculum':''),{
   method,cache:'no-store',credentials:'same-origin',
   headers:{authorization:'Bearer '+session.access_token,...(payload?{'content-type':'application/json'}:{})},
   ...(payload?{body:JSON.stringify(payload)}:{})});
  const body=await r.json().catch(()=>({}));
  if(!r.ok||body.ok!==true)throw Error(body.error||'Learning service unavailable.');
  return body;
 }
 function metric(){
  const saved=[...progress.values()].filter(x=>x.status==='reflection_saved').length;
  const started=[...progress.values()].filter(x=>x.status==='in_progress').length;
  const target=q('gu-bc-metric');target.replaceChildren();
  target.append(el('strong',progressAvailable?saved+' / 30':'Not verified'),el('small',progressAvailable?'Private ungraded reflections saved · '+started+' in progress':'Your progress store is not available. Nothing was assumed complete.'));
 }
 function calendar(){
  const mount=q('gu-bc-days');mount.replaceChildren();
  for(const day of days){
   const button=el('button');button.type='button';button.className='gu-bc-day';
   button.setAttribute('aria-current',day.day===selected?'step':'false');
   const label=el('span','Day '+String(day.day).padStart(2,'0')+' · '+(progress.get(day.day)?.status==='reflection_saved'?'Reflection saved':progress.get(day.day)?.status==='in_progress'?'Started':'Not recorded'));
   button.append(label,el('strong',day.title));
   button.onclick=()=>{selected=day.day;render()};
   mount.append(button);
  }
 }
 function render(){
  const d=days.find(x=>x.day===selected);
  guidedSession?.dispose?.();guidedSession=null;
  if(!d)return;
  guidedSession=globalThis.GroundUpAcademyGuidedV1?.mount?.(q('gu-bc-guided'),{day:d,programCode:'foundations30'})||null;
  const checkpoint=checkpoints.get(selected);
  const guideSlot=q('gu-bc-v32-stage')?.querySelector('#gu-v32-teaching-slot')||q('gu-bc-v32-stage');
  if(guideSlot){
   const first=d.relatedLabs?.[0]?.id;
   if(first)void globalThis.GroundUpLabEngineV32Universal?.mount?.({
    labId:first,mode:'guided',target:guideSlot,focusId:'gu-bc-note',
    lab:{
     id:first,concept:d.title,goal:d.objective,
     teaching:{
      // Each day uses its own approved content, not a generic 30-day
      // explanation or an invented 31st official competency.
      what:d.objective,
      why:d.caution||d.observe,
      when:d.observe,
      how:[d.practice].filter(Boolean),
      commonError:checkpoint?.commonMistake||d.caution,
      limitation:d.caution,
      questions:[checkpoint?.question].filter(Boolean)
     }
    }
   });
   else guideSlot.textContent='No canonical Lab learning bridge exists for this day.';
  }
  const source=sourceCases.get(selected),sourceSection=q('gu-bc-source-case');
  if(sourceSection){
   sourceSection.hidden=!source;
   if(source){
    q('gu-bc-source-title').textContent=source.heading;
    q('gu-bc-source-observation').textContent=source.observation;
    q('gu-bc-source-practice').textContent='Try it: '+source.practice;
    q('gu-bc-source-limit').textContent='What this source cannot establish: '+source.limit;
    const sourceLink=q('gu-bc-source-link');
    sourceLink.textContent=source.sourceName+' — original source';
    sourceLink.href=source.sourceUrl;
   }
  }
  q('gu-bc-check-question').textContent=checkpoint?.question||'This topic-specific self-check is unavailable; no grade or credit is inferred.';
  q('gu-bc-check-review').hidden=true;
  q('gu-bc-check-review').textContent='';
  q('gu-bc-check-copy').disabled=!checkpoint;
  q('gu-bc-check-reveal').disabled=!checkpoint;
  q('gu-bc-day-label').textContent='DAY '+String(selected).padStart(2,'0')+' OF 30';
  for(const field of ['title','objective','observe','practice','caution'])q('gu-bc-'+field).textContent=d[field];
  const entries=q('gu-bc-links');entries.replaceChildren();
  entries.append(link(d.toolPath,'Open existing learning tool →'),link('journal.html','Trading Journal'),link('market-tutor.html?q='+encodeURIComponent('Explain the concepts for study day '+selected+': '+d.title+'. Ask me an ungraded self-check. Do not reveal any future historical market observation or private answer key.'),'Ask Market Tutor (ungraded)'));
  const skills=q('gu-bc-skills');skills.replaceChildren();
  for(const skill of d.competencies)skills.append(link('skills.html#guide-'+encodeURIComponent(skill),skill.replaceAll('_',' ')));
  const labs=q('gu-bc-labs');labs.replaceChildren();
  for(const x of d.relatedLabs){
   const li=el('li');const a=link('labs.html?q='+encodeURIComponent(x.id),x.id);li.append(a,document.createTextNode(' · '+x.bookCode.replaceAll('_',' ')+' · proposed, ungraded'));labs.append(li);
  }
  // Mount separate original Day 05 teaching only after the existing
  // authenticated curriculum/entitlement gate has succeeded.
  const candleStage=q('gu-bc-day05-stage');
  if(candleStage){
   candleStage.replaceChildren();candleStage.hidden=selected!==5;
   if(selected===5){
    const lesson=globalThis.GroundUpBootcampDay05;
    if(lesson?.mount)lesson.mount(candleStage);
    else candleStage.textContent='Candlestick percentage practice is temporarily unavailable; no assessment completion is inferred.';
   }
  }
  q('gu-bc-note').value=progress.get(selected)?.reflection||'';
  q('gu-bc-save-status').textContent=!progressAvailable?'Private saving is unavailable until the existing Supabase project is verified. Your earlier records are not treated as zero.':progress.get(selected)?.status==='reflection_saved'?'A reflection is saved for this day. You may revise it; this is not a graded pass.':'No reflection is recorded for this day.';
  q('gu-bc-start').disabled=busy||!progressAvailable;
  q('gu-bc-save').disabled=busy||!progressAvailable;
  q('gu-bc-prev').disabled=selected===1||busy;
  q('gu-bc-next').disabled=selected===30||busy;
  metric();calendar();
 }
 async function write(action){
  if(!progressAvailable||busy)return;
  const day=selected,note=q('gu-bc-note').value.trim(),actor=activeUser,epoch=loadSerial;
  if(action==='save_reflection'&&(note.length<80||note.length>2000)){
   q('gu-bc-save-status').textContent='Write 80–2,000 characters of actual evidence, uncertainty and reflection before saving.';q('gu-bc-note').focus();return;
  }
  busy=true;q('gu-bc-start').disabled=true;q('gu-bc-save').disabled=true;
  q('gu-bc-save-status').textContent='Saving this member’s private ungraded progress…';
  try{
   const result=await api('POST',{day,action,...(action==='save_reflection'?{reflection:note,expectedRevision:progress.get(day)?.revision||0}:{})});
   if(actor!==activeUser||epoch!==loadSerial)return;
   progress.set(day,result.progress);q('gu-bc-save-status').textContent=result.disclaimer;
  }catch(e){if(actor===activeUser&&epoch===loadSerial)q('gu-bc-save-status').textContent=e.message+' No completion was recorded.'}
  finally{busy=false;if(actor===activeUser&&epoch===loadSerial)render();}
 }
 async function init(){
  const id=++loadSerial;
  try{
   sb=await window.getSupabaseClient();
   const u=(await sb.auth.getUser()).data?.user;
   if(!u)throw Error('Sign in to use your existing member training access.');
   activeUser=u.id;
   const data=await api();
   if(id!==loadSerial)return;
   if(!Array.isArray(data.curriculum?.days)||data.curriculum.days.length!==30)
    throw Error('The full thirty-day curriculum could not be verified.');
   days=data.curriculum.days;
   checkpoints.clear();
   try{
    const response=await fetch('/data/bootcamp-formative-v014154.json',{cache:'no-store'});
    if(!response.ok)throw Error('Missing original formative source');
    const source=await response.json();
    if(!Array.isArray(source.days)||source.days.length!==30||source.graded!==false)
     throw Error('Incomplete 30-day formative source');
    const observed=new Set();
    for(const row of source.days){
     if(!Number.isInteger(row.day)||row.day<1||row.day>30||observed.has(row.day)||
        typeof row.question!=='string'||row.question.length<65||
        typeof row.reviewGuide!=='string'||row.reviewGuide.length<90||
        row.graded!==false)throw Error('Invalid original self-check');
     observed.add(row.day);checkpoints.set(row.day,row);
    }
   }catch{checkpoints.clear()}
   sourceCases.clear();
   // Educational links only. This optional static file contains no private
   // course transcript, customer data, historical-bar claim or answer keys.
   try{
    const response=await fetch('/data/bootcamp-source-cases-v014166.json',{cache:'no-store'});
    if(!response.ok)throw Error('Additional primary-source cases unavailable.');
    const source=await response.json();
    if(!Array.isArray(source.cases)||source.version!=='0.14.0.166')throw Error('Unrecognized source-case version.');
    for(const entry of source.cases){
     if(!Number.isInteger(entry.day)||entry.day<1||entry.day>30||
       sourceCases.has(entry.day)||!/^https:\/\//.test(entry.sourceUrl)||
       !['heading','observation','practice','limit','sourceName'].every(k=>
        typeof entry[k]==='string'&&entry[k].trim().length>15))
      throw Error('An additional source-case record is invalid.');
     sourceCases.set(entry.day,entry);
    }
   }catch{sourceCases.clear()}
   progressAvailable=data.progressAvailable===true;
   progress=new Map((data.progress||[]).map(row=>[row.day,row]));
   root.hidden=false;
   void betaEnrollment(false).catch(()=>{q('gu-bc-enrollment-status').textContent=
    'You can continue your existing 30-day lessons; the optional beta enrollment status is unavailable.'});
   status(progressAvailable?'Active member training access confirmed. Your private reflection progress was loaded.':
    'Training curriculum available, but progress storage is not installed or verified. Saving is disabled.');
   render();
  }catch(e){if(id===loadSerial){clear();status(e.message||'Learning service unavailable. No progress was changed.')}}
 }
 q('gu-bc-check-reveal').addEventListener('click',()=>{
  const item=checkpoints.get(selected);if(!item)return;
  q('gu-bc-check-review').textContent='Review guide: '+item.reviewGuide+
    ' Common misconception: '+item.commonMistake+' This is ungraded coaching, not a verified assessment.';
  q('gu-bc-check-review').hidden=false;
 });
 q('gu-bc-check-copy').addEventListener('click',()=>{
  const item=checkpoints.get(selected);if(!item)return;
  const field=q('gu-bc-note'),marker='Day '+selected+' self-check response:';
  if(field.value.includes(marker)){field.focus();return}
  const addition='\n\n'+marker+'\n'+item.question+'\nMy answer: ';
  if(field.value.length+addition.length>2000){
   q('gu-bc-save-status').textContent='Reflection character limit reached; make room before adding a question.';return
  }
  field.value+=addition;field.focus();
  q('gu-bc-save-status').textContent='Question copied into the local reflection; answer it and choose Save private ungraded reflection to retain it.';
 });
 q('gu-bc-enroll')?.addEventListener('click',async event=>{
  const btn=event.currentTarget;if(btn.disabled)return;btn.disabled=true;
  try{await betaEnrollment(true)}catch(e){q('gu-bc-enrollment-status').textContent=e.message||'Enrollment not saved.'}
  finally{btn.disabled=false}
 });
 q('gu-bc-start').addEventListener('click',()=>void write('start'));
 q('gu-bc-save').addEventListener('click',()=>void write('save_reflection'));
 q('gu-bc-prev').addEventListener('click',()=>{selected=Math.max(1,selected-1);render()});
 q('gu-bc-next').addEventListener('click',()=>{selected=Math.min(30,selected+1);render()});
 const ready=()=>{void init();Promise.resolve().then(async()=>{
  try{
   const c=sb||await window.getSupabaseClient();
   c.auth.onAuthStateChange((_event,s)=>{
    const next=s?.user?.id||'';
    if(next===activeUser)return;
    ++loadSerial;activeUser=next;clear();
    status(next?'Account changed. Reload this page for the new member.':'Signed out. Private learning content and progress have been cleared.');
   });
  }catch{}
 })};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
