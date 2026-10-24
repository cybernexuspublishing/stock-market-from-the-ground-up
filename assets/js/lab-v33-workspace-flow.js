/* Learning v3.3 — same-page tab organization and incremental evidence.
 * Maintains preexisting IDs, server authorization, original decision locking,
 * independent assessment and the saved-attempt schema unchanged.
 */
(function(root){
'use strict';
let bound=false;
const make=(tag,text,cls)=>{
 const el=document.createElement(tag);
 if(text!==undefined)el.textContent=text;
 if(cls)el.className=cls;
 return el;
};
function tabs(host){
 if(!host||host.dataset.v33Tabs==='1')return;
 const items=[
  {node:host.querySelector('.gu-ws-source'),label:'Historical chart and source status'},
  {node:host.querySelector('.gu-ws-resources'),label:'Historical setup, replay and curriculum references'}
 ].filter(x=>x.node);
 if(items.length!==2)return;
 host.dataset.v33Tabs='1';host.classList.add('gu-v33-reference-tabs');
 const navigation=make('div',undefined,'gu-v33-reference-tablist');
 navigation.setAttribute('role','tablist');
 navigation.setAttribute('aria-label','Historical material and references');
 let current=-1;
 const select=i=>{
  current=current===i?-1:i;
  items.forEach(({node,button},index)=>{
   const active=index===current;
   node.hidden=!active;node.open=true;
   button.setAttribute('aria-selected',String(active));
   button.setAttribute('tabindex',active?'0':'-1');
  });
 };
 items.forEach((entry,i)=>{
  const button=make('button',entry.label,'gu-v33-reference-tab');
  button.type='button';
  button.setAttribute('role','tab');
  button.id='gu-v33-reference-tab-'+i;
  button.setAttribute('aria-controls','gu-v33-reference-panel-'+i);
  button.setAttribute('aria-selected','false');
  entry.button=button;
  entry.node.id='gu-v33-reference-panel-'+i;
  entry.node.setAttribute('role','tabpanel');
  entry.node.setAttribute('aria-labelledby',button.id);
  entry.node.open=true;entry.node.hidden=true;
  button.addEventListener('click',()=>select(i));
  button.addEventListener('keydown',e=>{
   if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;
   e.preventDefault();
   const next=e.key==='Home'?0:e.key==='End'?items.length-1:
    (i+(e.key==='ArrowRight'?1:-1)+items.length)%items.length;
   current=-1;select(next);items[next].button.focus();
  });
  navigation.append(button);
 });
 host.prepend(navigation);
}
function evidence(workbench,mode){
 if(!workbench||workbench.dataset.v33Wizard==='1')return;
 const card=workbench.querySelector('.decision-card');
 if(!card)return;
 workbench.dataset.v33Wizard='1';
 workbench.classList.add('gu-v33-evidence-workbench');
 workbench.querySelector(':scope > summary').textContent='Your decision and reflection · One question at a time';
 const fields=[
  {id:'ev-structure',title:'1. What has price actually done?',tip:'Record the visible structure or price behavior. Do not infer an unseen candle.'},
  {id:'ev-location',title:'2. Where is price relative to the reference?',tip:'Identify the relevant level, support/resistance zone, VWAP, or EMA if applicable.'},
  {id:'ev-volume',title:'3. What can the volume establish?',tip:'Describe the completed volume evidence. Write N/A when it is not part of this exercise.'},
  {id:'ev-invalidation',title:'4. What would change your interpretation?',tip:'State a specific invalidation condition using evidence that would become observable.'},
  {id:'ev-decision',title:'5. What is your hypothetical decision?',tip:'Choose your decision and confidence. Uncertainty and no-trade are valid choices.'},
  {id:'ev-notes',title:'6. Why does the evidence support your decision?',tip:'Record your reasoning before you lock it. Your response is not a guarantee of market outcomes.'}
 ];
 const panels=[];
 const wizard=make('div',undefined,'gu-v33-evidence-wizard');
 wizard.setAttribute('aria-label','Step-by-step member evidence record');
 for(const entry of fields){
  const field=document.getElementById(entry.id);
  if(!field)continue;
  const step=make('section',undefined,'gu-v33-evidence-step');
  step.dataset.field=entry.id;step.hidden=true;
  step.append(make('h3',entry.title));
  if(mode!=='blind'&&mode!=='assessment')step.append(make('p',entry.tip,'gu-v33-evidence-tip'));
  if(entry.id==='ev-decision'){
   const grid=field.closest('.form-grid');if(grid)step.append(grid);
  }else{
   const label=field.previousElementSibling;
   if(label?.tagName==='LABEL')step.append(label);
   step.append(field);
  }
  if(entry.id==='ev-notes'){
   const submit=document.getElementById('lock-decision');
   const actions=submit?.closest('.actions');
   if(actions)step.append(actions);
   const msg=document.getElementById('decision-msg');
   if(msg)step.append(msg);
  }
  wizard.append(step);panels.push(step);
 }
 if(!panels.length)return;
 const progress=make('p','','gu-v33-evidence-progress');progress.setAttribute('role','status');
 const controls=make('div',undefined,'gu-v33-evidence-navigation');
 const back=make('button','Previous question','gu-v33-evidence-nav');
 const next=make('button','Next question','gu-v33-evidence-nav');
 back.type=next.type='button';controls.append(back,next);
 let selected=0;
 function go(index,focus=false){
  selected=Math.max(0,Math.min(index,panels.length-1));
  panels.forEach((step,i)=>step.hidden=i!==selected);
  progress.textContent='Question '+(selected+1)+' of '+panels.length;
  back.disabled=selected===0;next.disabled=selected===panels.length-1;
  if(focus)panels[selected].querySelector('textarea,select,input')?.focus();
 }
 back.addEventListener('click',()=>go(selected-1,true));
 next.addEventListener('click',()=>go(selected+1,true));
 card.append(progress,wizard,controls);
 workbench._v33GoToEvidence=go;
 go(0);
 // The original reflection and protected assessment stay at the end.
 // No selections are graded or sent to any service by this wizard.
}
function openEvidence(stage){
 const wb=document.getElementById('gu-ws-member-workbench');
 if(!wb)return;
 wb.open=true;
 const map={2:0,3:3,4:4,6:5,7:0,8:5};
 wb._v33GoToEvidence?.(map[stage]??0,true);
 wb.scrollIntoView?.({behavior:'smooth',block:'start'});
}
function mount({mode='guided'}={}){
 const area=document.querySelector('.gu-ws-disclosures');
 tabs(area);
 const work=document.getElementById('gu-ws-member-workbench');
 evidence(work,mode);
 if(work&&['guided','practice'].includes(mode))work.open=false;
 if(!bound){
  document.addEventListener('gu-v33-open-evidence',event=>openEvidence(event.detail?.stage));
  bound=true;
 }
}
root.GroundUpLabV33WorkspaceFlow=Object.freeze({mount,openEvidence,version:'LAB-UX-STD-001-v3.3.1'});
})(globalThis);
