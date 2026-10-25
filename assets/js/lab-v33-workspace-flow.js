/* Learning v3.3 — same-page tab organization and incremental evidence.
 * Maintains preexisting IDs, server authorization, original decision locking,
 * independent assessment and the saved-attempt schema unchanged.
 */
(function(root){
'use strict';
let bound=false;
let activeMode='guided',activeStage=0;
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
   button.setAttribute('tabindex',active||(current===-1&&index===0)?'0':'-1');
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
 workbench.querySelector(':scope > summary').textContent='Your decision — Open when you are ready to make a prediction';
 const fields=[
  {id:'ev-structure',title:'1. What did price do before your decision?',tip:'Look at the chart. Is price rising, falling, moving sideways, or is there not enough information? Explain which prices and times helped you decide.'},
  {id:'ev-location',title:'2. Where is price on the chart?',tip:'Compare the current price with any level or indicator you have already learned. If the chart does not show it, say so.'},
  {id:'ev-volume',title:'3. What does the trading volume show?',tip:'If volume is available, explain whether trading is relatively active or quiet. If you cannot see it, you can say that.'},
  {id:'ev-invalidation',title:'4. What would make you change your mind?',tip:'Describe the price movement or new information that would make you reconsider your idea.'},
  {id:'ev-decision',title:'5. What would you do next?',tip:'Choose whether you would enter, watch, or stay out, and tell us how confident you feel.'},
  {id:'ev-notes',title:'6. Why did you choose that?',tip:'Explain the reasons behind your choice. You can review them after the exercise.'}
 ];
 const panels=[];
 const intro=make('p','You have reached the decision exercise. Work through the chart at your own pace, then lock your choice when you are ready.','gu-v33-evidence-intro');
 card.append(intro);
 const wizard=make('div',undefined,'gu-v33-evidence-wizard');
 wizard.setAttribute('aria-label','Step-by-step member evidence record');
 for(const entry of fields){
  const field=document.getElementById(entry.id);
  if(!field)continue;
  const step=make('section',undefined,'gu-v33-evidence-step');
  step.dataset.field=entry.id;step.hidden=true;
  step.append(make('p','Your decision exercise','gu-v33-evidence-instructor'));
  step.append(make('h3',entry.title));
  if(mode!=='blind'&&mode!=='assessment'){
   step.append(make('p',entry.tip,'gu-v33-evidence-tip'));

  }
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
  progress.textContent='Decision step '+(selected+1)+' of '+panels.length;
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
/* Unified stage/visibility controller (v4 stabilization).
 * The shared journey alone determines stage, while a server-authorized player
 * determines mode. This layer only presents already-authorized controls.
 */
function presentationState(mode,stage,decisionIsLocked=false){
 const normalized=['guided','practice','blind','assessment'].includes(mode)?mode:'guided';
 const position=Number.isInteger(Number(stage))?Math.max(0,Math.min(8,Number(stage))):0;
 const independent=normalized==='blind'||normalized==='assessment';
 return Object.freeze({
  mode:normalized,stage:position,
  workbenchVisible:independent||position>=3,
  reflectionVisible:independent?decisionIsLocked:position>=6
 });
}
function stageVisibility(stage=0){
 activeStage=Number.isInteger(Number(stage))?Number(stage):0;
 const reflection=document.getElementById('gu-ws-reflection');
 const state=presentationState(activeMode,activeStage,reflection?.dataset.decisionLocked==='true');
 const work=document.getElementById('gu-ws-member-workbench');
 if(work){
  work.hidden=!state.workbenchVisible;
  if(!state.workbenchVisible)work.open=false;
  work.dataset.learningStage=String(state.stage);
 }
 if(reflection){
  reflection.hidden=!state.reflectionVisible;
  if(!state.reflectionVisible)reflection.open=false;
 }
 const player=document.getElementById('player-workspace');
 if(player)player.dataset.learningStage=String(state.stage);
}
function decisionLocked(){
 const reflection=document.getElementById('gu-ws-reflection');
 if(reflection)reflection.dataset.decisionLocked='true';
 stageVisibility(activeStage);
}
function openEvidence(stage){
 const state=presentationState(activeMode,activeStage,
  document.getElementById('gu-ws-reflection')?.dataset.decisionLocked==='true');
 if(!state.workbenchVisible)return;
 const wb=document.getElementById('gu-ws-member-workbench');
 if(!wb)return;
 if(stage>=6){
  const reflect=document.getElementById('gu-ws-reflection');
  if(reflect&&!reflect.hidden){reflect.open=true;reflect.scrollIntoView?.({behavior:'smooth',block:'start'});return}
 }
 wb.open=true;
 const map={2:0,3:3,4:4,6:5,7:0,8:5};
 wb._v33GoToEvidence?.(map[stage]??0,true);
 wb.scrollIntoView?.({behavior:'smooth',block:'start'});
}
function mount({mode='guided'}={}){
 const area=document.querySelector('.gu-ws-disclosures');
 tabs(area);
 const work=document.getElementById('gu-ws-member-workbench');
 activeMode=mode;activeStage=0;
 evidence(work,mode);
 if(work&&['guided','practice'].includes(mode))work.open=false;
 stageVisibility(['blind','assessment'].includes(mode)?5:0);
 if(!bound){
  document.addEventListener('gu-v33-open-evidence',event=>openEvidence(event.detail?.stage));
  document.addEventListener('gu-v33-stage-change',event=>stageVisibility(event.detail?.step));
  document.addEventListener('gu-v33-decision-locked',decisionLocked);
  bound=true;
 }
}
root.GroundUpLabV33WorkspaceFlow=Object.freeze({mount,openEvidence,stageVisibility,presentationState,version:'LAB-UX-STD-001-v4.0.0'});
})(globalThis);
