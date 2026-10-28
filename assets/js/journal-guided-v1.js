/* SMFGU Trading Journal guided workflow v1.
 * Progressive presentation only. Uses the existing database, member session,
 * immutable plan snapshot and permission checks from journal-entry.js.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const stages=[
 {label:'Context',help:'Talia: Begin with what was visible at the time. Record the ticker, session, setup and market conditions. A sound observation can end in NO TRADE.'},
 {label:'Pre-trade plan',help:'Talia: Describe your evidence, trigger, invalidation and planned risk before you know the result. Saving a draft is not the same as locking the plan.'},
 {label:'Execution or pass',help:'Talia: Record what happened, including rule deviations, fees and a specific lesson. For a pass, explain why taking no trade was appropriate.'},
 {label:'Risk and outcome',help:'Talia: A profitable outcome does not prove good process. Missing data stays unmeasured. MFE is an excursion, not a fill you could have guaranteed.'},
 {label:'Plan versus actual',help:'Talia: Compare your locked decision against what happened later. Use differences to choose a focused practice task.'}
];
const reminders={
 'Entered before confirmation':'Practice identifying a confirmed trigger before entry.',
 'Chased extension':'Review entry location, extension and invalidation before acting.',
 'Ignored volume / participation':'Review volume expansion, relative participation and liquidity.',
 'Misread market structure':'Review swing highs, swing lows and trend versus range.',
 'Misread support / resistance':'Practice identifying and invalidating relevant price levels.',
 'Misread VWAP / EMA relationship':'Review VWAP, EMA9 and EMA20 context without treating a crossover as proof.',
 'Ignored spread / liquidity':'Review spreads, available liquidity and hypothetical fill limitations.',
 'Ignored catalyst / context':'Practice verifying catalyst sources and timestamps.',
 'Failed to define invalidation':'Define a falsifiable invalidation condition before a trade.',
 'Moved stop outside plan':'Review planned dollar risk and stop discipline.',
 'Averaged down outside plan':'Review sizing, exposure and the original risk budget.',
 'Exited early from fear':'Compare the planned exit rule against the actual exit reason.',
 'Held past invalidation':'Practice responding to invalidation evidence.',
 'Overtraded':'Review session selection and decision filters.',
 'Revenge traded':'Review the decision checklist after a loss.',
 'Oversized position':'Practice position sizing using risk per share.',
 'Failed to select NO TRADE':'Practice identifying when a setup is not qualified.',
 'Execution / platform error':'Review order lifecycle and execution uncertainty.'
};
function number(id){const v=$(id)?.value;if(v==null||!v.trim())return null;const n=Number(v);return Number.isFinite(n)?n:null}
function fmt(n){return n===null?'Not measured':new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n)}
function textNode(tag,text,cls){const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=text;return n}
function riskCard(){
 const target=$('gu-journal-risk');if(!target)return;
 const direction=$('j-direction')?.value,entry=number('j-planned-entry'),stop=number('j-planned-stop'),
   goal=number('j-planned-target'),shares=number('j-shares');
 target.replaceChildren();
 target.append(textNode('h3','Before-entry risk check'));
 if(!direction||entry===null||stop===null||shares===null){
   target.append(textNode('p','Enter a direction, planned entry, stop and positive share quantity to calculate risk. A missing value is not zero.','journal-small'));return;
 }
 const per=direction==='LONG'?entry-stop:direction==='SHORT'?stop-entry:null;
 if(per===null||entry<=0||stop<=0||shares<=0||per<=0){
   target.append(textNode('p','Check the plan: entry, stop and size must be positive, and the stop must be on the risk side of the planned entry.','status-message error'));return;
 }
 const risk=per*shares;
 const reward=goal===null?null:(direction==='LONG'?goal-entry:entry-goal)*shares;
 const grid=document.createElement('div');grid.className='gu-risk-cells';
 for(const [label,value] of [['Stop distance / share',fmt(per)],['Planned dollar risk',fmt(risk)],
   ['Target reward',reward!==null&&reward>0?fmt(reward):'Not measured'],
   ['Planned reward / risk',reward!==null&&reward>0?(reward/risk).toFixed(2)+':1':'Not measured']]){
   const cell=document.createElement('div');cell.className='gu-risk-cell';cell.append(textNode('span',label),textNode('strong',value));grid.append(cell);
 }
 target.append(grid);
 target.append(textNode('p','Educational estimate using planned values and constant share quantity. Excludes slippage, fees, stop gaps, partial fills and changing position size; actual loss may exceed this estimate.','journal-small'));
 if(reward!==null&&reward<=0)target.append(textNode('p','Target is not on the reward side of the planned entry. Review the target before locking.','status-message error'));
}
function feedback(){
 const host=$('gu-journal-coach');if(!host)return;
 const mistakes=[...document.querySelectorAll('input[name="journal-mistake"]:checked')].map(i=>i.value);
 host.replaceChildren(textNode('h3','Talia — next learning focus'));
 if(!mistakes.length){
   host.append(textNode('p','Choose any mistake or review tag above to receive a focused lesson suggestion. A clean process can also result in a loss.','journal-small'));return;
 }
 const ul=document.createElement('ul');
 for(const label of mistakes.slice(0,4)){const li=document.createElement('li');li.append(textNode('strong',label+': '),document.createTextNode(reminders[label]||'Write down the evidence you missed and one corrective action.'));ul.append(li)}
 host.append(ul);
 const links=document.createElement('p');links.className='journal-small';
 const a=document.createElement('a');a.href='learn.html';a.textContent='Open the Learning System';
 const b=document.createElement('a');b.href='labs.html';b.textContent='Browse practice Labs';
 links.append(a,document.createTextNode(' · '),b);
 host.append(links,textNode('p','Suggestions are educational and ungraded. Only approved assessments contribute to official competencies.','journal-small'));
}
function boot(){
 const form=$('entry-form'),main=$('entry-content');
 if(!form||!main||$('gu-journal-controls'))return;
 const sections=[...form.querySelectorAll(':scope > section')].filter(s=>s.classList.contains('journal-section'));
 if(sections.length<5)return;
 const toolbar=document.createElement('div');toolbar.id='gu-journal-controls';toolbar.className='gu-workflow journal-card';
 const modeLabel=textNode('label','Journal view');modeLabel.htmlFor='gu-journal-mode';
 const select=document.createElement('select');select.id='gu-journal-mode';
 for(const [value,label] of [['guided','Guided (recommended)'],['advanced','Advanced full form']]){
   const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);
 }
 const top=document.createElement('div');top.className='gu-workflow-top';top.append(modeLabel,select);
 const progress=document.createElement('div');progress.className='gu-workflow-progress';progress.id='gu-workflow-progress';progress.setAttribute('role','status');progress.setAttribute('aria-live','polite');
 const help=textNode('p','', 'gu-workflow-help');help.id='gu-workflow-help';
 const actions=document.createElement('div');actions.className='gu-workflow-actions';
 const back=document.createElement('button');back.type='button';back.className='btn secondary';back.id='gu-workflow-back';back.textContent='Previous';
 const next=document.createElement('button');next.type='button';next.className='btn secondary';next.id='gu-workflow-next';next.textContent='Next';
 actions.append(back,next);
 toolbar.append(top,progress,help,actions);
 form.parentElement.insertBefore(toolbar,form);
 const risk=document.createElement('aside');risk.className='gu-risk-panel journal-card';risk.id='gu-journal-risk';risk.setAttribute('aria-live','polite');
 sections[1].querySelector('.journal-actions')?.before(risk);
 const coach=document.createElement('aside');coach.className='gu-coach-panel journal-card';coach.id='gu-journal-coach';coach.setAttribute('aria-live','polite');
 sections[2].querySelector('.journal-actions')?.before(coach);
 let index=0,mode='guided';
 function available(){return sections.map((s,i)=>({s,i})).filter(({s})=>!s.hidden)}
 function show(){
   const eligible=available().map(x=>x.i);
   if(!eligible.includes(index))index=eligible[0]??0;
   for(let i=0;i<sections.length;i++)sections[i].classList.toggle('gu-guided-concealed',mode==='guided'&&i!==index);
   progress.replaceChildren();
   if(mode==='guided'){
     stages.forEach((stage,i)=>{
       if(!eligible.includes(i))return;
       const chip=document.createElement('button');chip.type='button';chip.className='gu-stage'+(i===index?' current':'');
       chip.textContent=(i+1)+'. '+stage.label;chip.setAttribute('aria-current',i===index?'step':'false');
       chip.addEventListener('click',()=>{index=i;show()});
       progress.append(chip);
     });
   }
   help.textContent=mode==='guided'?stages[index].help:'All Journal sections are displayed. The original plan and outcome controls retain their existing rules.';
   actions.hidden=mode!=='guided';
   back.disabled=eligible.indexOf(index)<=0;
   next.disabled=eligible.indexOf(index)>=eligible.length-1;
   riskCard();feedback();
 }
 const move=step=>{const list=available().map(x=>x.i),at=list.indexOf(index),target=list[at+step];if(target!==undefined){index=target;show();toolbar.scrollIntoView({block:'start',behavior:'smooth'})}};
 back.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
 select.addEventListener('change',()=>{mode=select.value;show()});
 form.addEventListener('input',()=>{riskCard();feedback()});
 form.addEventListener('change',()=>{riskCard();feedback()});
 // Existing async Journal actions can reveal the locked-plan comparison.
 const observer=new MutationObserver(()=>{if(mode==='guided'&&sections[index]?.hidden)show()});
 observer.observe(sections[4],{attributes:true,attributeFilter:['hidden']});
 show();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
