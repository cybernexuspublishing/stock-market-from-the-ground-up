/* v0.14.0.144 — single member training surface; no secrets or grades in DOM.
 * Existing entitlement via unversioned /api/bootcamp; records server-owned.
 */
(()=>{'use strict';
 const q=id=>document.getElementById(id),root=q('gu-bc-shell');
 if(!root)return;
 let sb=null,activeUser='',days=[],selected=1,progress=new Map(),progressAvailable=false,busy=false,loadSerial=0;
 const status=text=>{q('gu-bc-status').textContent=text};
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);return n};
 const link=(href,title)=>{
   const a=el('a',title);a.href=href;return a;
 };
 function clear(){
  progress.clear();progressAvailable=false;days=[];root.hidden=true;
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
  if(!d)return;
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
  const day=selected,note=q('gu-bc-note').value.trim();
  if(action==='save_reflection'&&(note.length<80||note.length>2000)){
   q('gu-bc-save-status').textContent='Write 80–2,000 characters of actual evidence, uncertainty and reflection before saving.';q('gu-bc-note').focus();return;
  }
  busy=true;q('gu-bc-start').disabled=true;q('gu-bc-save').disabled=true;
  q('gu-bc-save-status').textContent='Saving this member’s private ungraded progress…';
  try{
   const result=await api('POST',{day,action,...(action==='save_reflection'?{reflection:note,expectedRevision:progress.get(day)?.revision||0}:{})});
   progress.set(day,result.progress);q('gu-bc-save-status').textContent=result.disclaimer;
  }catch(e){q('gu-bc-save-status').textContent=e.message+' No completion was recorded.'}
  finally{busy=false;render();}
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
   progressAvailable=data.progressAvailable===true;
   progress=new Map((data.progress||[]).map(row=>[row.day,row]));
   root.hidden=false;status(progressAvailable?'Active member training access confirmed. Your private reflection progress was loaded.':
    'Training curriculum available, but progress storage is not installed or verified. Saving is disabled.');
   render();
  }catch(e){if(id===loadSerial){clear();status(e.message||'Learning service unavailable. No progress was changed.')}}
 }
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
