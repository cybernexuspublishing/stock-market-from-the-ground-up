/* Journal V2 guided workspace. Existing Journal forms/RLS and snapshot rules remain authoritative. */
(function(){
'use strict';
const $=id=>document.getElementById(id), make=(tag,value,klass)=>{
 const n=document.createElement(tag);if(klass)n.className=klass;
 if(value!==undefined)n.textContent=value;return n;
};
const advice={
 'Entered before confirmation':'Practice identifying the trigger before considering entry.',
 'Chased extension':'Review entry location and extension against the original plan.',
 'Misread VWAP / EMA relationship':'Review VWAP reclaim/rejection and EMA context.',
 'Ignored spread / liquidity':'Review execution uncertainty, spread and volume.',
 'Oversized position':'Practice risk-per-share and position-size calculations.',
 'Moved stop outside plan':'Compare the original invalidation against the actual exit.',
 'Held past invalidation':'Practice responding to documented invalidation.',
 'Failed to select NO TRADE':'Practice recognizing when a setup lacks enough evidence.',
 'Revenge traded':'Review your pre-decision criteria after a loss.',
 'Relied on unverified catalyst':'Return to the primary issuer or filing source and preserve the first-publication time.',
 'Confused red-to-green with candle color':'Red-to-green compares price to the previous closing price; one candle color compares its own open and close.',
 'Assumed volume guaranteed a fill':'Separate interval share volume from current bid/ask spread, depth, and changing counterparties.',
 'Reconstructed the plan after the outcome':'Preserve the original plan timestamp and evaluate the decision using only information available before the result.'
};
function boot(){
 const form=$('entry-form'),root=$('entry-content');
 if(!form||!root||$('gu-journal-v2-controls'))return;
 const parts=[...form.children].filter(x=>x.tagName==='SECTION');
 const findHead=prefix=>parts.find(x=>x.querySelector('h2')?.textContent?.startsWith(prefix));
 const ctx=findHead('1. Context'),plan=findHead('2. Pre-Trade'),actual=findHead('3. Actual'),
       metric=findHead('4. Automatic'),locked=$('locked-plan-panel'),compare=$('plan-vs-actual'),
       evidence=$('gu-evidence-panel'),history=$('gu-actual-history');
 if(!ctx||!plan||!actual||!metric)return;
 const steps=[
  {id:'context',label:'Context',els:[ctx],help:'Talia: Record the ticker, session, dated source, catalyst wording, price levels, volume and contemporaneous liquidity. Separate observed facts from a sector or squeeze hypothesis; NO TRADE is valid.'},
  {id:'plan',label:'Pre-trade plan',els:[plan,locked],help:'Talia: Record the WHY, completed-bar or price trigger, previous-close/HOD/VWAP reference, invalidation, target, stop mechanism, size and spread assumption before learning the outcome. Stop prices are not guaranteed. Lock the plan.'},
  {id:'execution',label:'Execution or pass',els:[actual],help:'Talia: Preserve the actual event sequence, observed price and fill uncertainty, partial executions, slippage or a reason to WAIT/NO TRADE. Do not infer order chronology from an OHLC bar or evaluate process by profit alone.'},
  {id:'review',label:'Results and review',els:[metric,compare],help:'Talia: Compare original evidence, plan and actual decision; report source changes, failed setups, risk variance and what was unknowable. MFE/MAE are price excursions rather than guaranteed realizable fills.'},
  {id:'evidence',label:'Chart evidence',els:[evidence],help:'Talia: Distinguish an original annotated fictional chart, approved historical chart and a member-uploaded screenshot. Keep source rights, timeframe and publication chronology explicit; self-reported capture times prove neither timing nor execution.'},
  {id:'history',label:'Corrections',els:[history],help:'Talia: Never rewrite an original trade thesis to match hindsight. Record what changed, when it became known, why the plan failed or held, and one transferable skill to rehearse with Talia.'}
 ].map(x=>({...x,els:x.els.filter(Boolean)}));
 const all=Array.from(new Set(steps.flatMap(x=>x.els)));
 const head=make('section',undefined,'gu-v2-head journal-card');
 head.id='gu-journal-v2-controls';head.setAttribute('aria-label','Trading Journal workflow');
 const top=make('div',undefined,'gu-v2-top');
 const label=make('label','Journal view');label.htmlFor='gu-v2-mode';
 const mode=make('select');mode.id='gu-v2-mode';
 [['guided','Guided learning'],['full','Full professional form']].forEach(([v,t])=>{
  const option=make('option',t);option.value=v;mode.append(option);
 });
 const version=make('span','Journal 3.0','gu-v2-version');
 top.append(label,mode,version);
 const progress=make('nav',undefined,'gu-v2-progress');progress.id='gu-v2-progress';progress.setAttribute('aria-label','Journal learning stages');
 const description=make('p','','gu-v2-help');description.id='gu-v2-help';
 const actions=make('div',undefined,'gu-v2-actions');
 const prev=make('button','Previous section','btn secondary'),next=make('button','Next section','btn secondary');
 prev.type=next.type='button';
 const save=make('button','Save draft','btn secondary');save.type='button';
 const saveStatus=make('span','', 'journal-small');saveStatus.setAttribute('role','status');
 save.addEventListener('click',()=>{
  const button=$('save-plan');
  if(button&&!button.disabled)button.click();
  else saveStatus.textContent='The original plan is locked. Use Save Actuals to change the post-decision record.';
 });
 actions.append(prev,next,save,saveStatus);
 head.append(top,progress,description,actions);
 form.parentNode.insertBefore(head,form);
 const risk=make('aside',undefined,'gu-v2-risk journal-card');
 risk.id='gu-journal-risk-v2';risk.setAttribute('aria-live','polite');
 const nextElement=plan.querySelector('.journal-actions');
 if(nextElement)nextElement.before(risk);else plan.append(risk);
 const reflection=make('aside',undefined,'gu-v2-reflection journal-card');
 reflection.id='gu-v2-reflection';
 actual.querySelector('.journal-actions')?.before(reflection);
 let selected='context';
 const enabled=()=>steps.filter(s=>s.els.some(el=>!el.hidden));
 function redraw(){
  const present=enabled();
  if(!present.some(s=>s.id===selected))selected=present[0]?.id||'context';
  const full=mode.value==='full';
  for(const element of all){
   const belongs=steps.some(s=>s.id===selected&&s.els.includes(element));
   element.classList.toggle('gu-v2-concealed',!full&&!belongs);
  }
  progress.replaceChildren();
  if(!full){
   for(const s of present){
    const b=make('button',s.label,'gu-v2-step'+(s.id===selected?' active':''));
    b.type='button';if(s.id===selected)b.setAttribute('aria-current','step');
    b.addEventListener('click',()=>{selected=s.id;redraw()});
    progress.append(b);
   }
  }
  const stage=steps.find(s=>s.id===selected);
  description.textContent=full?
   'All sections are visible. Locked plans, review history, and member-access rules are unchanged.':
   stage?.help||'Select a Journal section.';
  actions.hidden=full;
  const ix=present.findIndex(s=>s.id===selected);
  prev.disabled=ix<=0;next.disabled=ix>=present.length-1;
  save.hidden=full||selected!=='context'&&selected!=='plan';
  updatePanels();
 }
 function move(inc){
  const e=enabled(),i=e.findIndex(s=>s.id===selected);
  if(e[i+inc]){selected=e[i+inc].id;redraw();head.scrollIntoView({block:'start',behavior:'smooth'})}
 }
 prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
 mode.addEventListener('change',redraw);
 function updatePanels(){
  const jv=window.JournalV2,fmt=x=>x==null?'Not measured':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(x);
  const current=$('j-shares'),entry=$('j-planned-entry'),stop=$('j-planned-stop');
  if(!jv||!current||!entry||!stop)return;
  if(!$('gu-v2-budget')){
   const title=make('h3','Position risk and sizing worksheet');
   const budgetLabel=make('label','Optional maximum planned risk ($)');budgetLabel.htmlFor='gu-v2-budget';
   const budget=make('input');budget.id='gu-v2-budget';budget.type='number';budget.min='0';budget.step='0.01';budget.placeholder='For example: 50.00';
   budget.addEventListener('input',()=>updatePanels());
   const summary=make('div');summary.id='gu-v2-risk-values';
   const apply=make('button','Use suggested whole-share quantity','btn secondary');apply.id='gu-v2-apply';apply.type='button';
   const applied=make('p','', 'journal-small');
   applied.id='gu-v2-apply-feedback';applied.setAttribute('role','status');
   apply.addEventListener('click',()=>{
    const feedback=$('gu-v2-apply-feedback'),value=Number(apply.dataset.shares);
    if(current.disabled){
     feedback.textContent='The pre-trade plan is locked. Position size cannot be changed.';return;
    }
    if(!Number.isSafeInteger(value)||value<=0){
     feedback.textContent='To calculate a share suggestion, choose LONG or SHORT, enter a positive planned entry and a stop on the risk side, then enter your maximum dollar risk above zero. The budget must cover at least one whole share.';
     return;
    }
    current.value=String(value);
    current.dispatchEvent(new Event('input',{bubbles:true}));
    feedback.textContent='Applied '+value+' planned shares. Save Draft or lock the plan when ready. No order was placed.';
   });
   const foot=make('p','Educational planning arithmetic only. No order is placed. Fees, slippage, halts, short-sale requirements, partial fills and gap risk can increase real exposure.','journal-small');
   risk.append(title,budgetLabel,budget,summary,apply,applied,foot);
  }
  const calculated=jv.planRisk({
   direction:$('j-direction')?.value,entry:entry.value,stop:stop.value,
   target:$('j-planned-target')?.value,quantity:current.value,riskBudget:$('gu-v2-budget')?.value
  });
  const dest=$('gu-v2-risk-values');dest.replaceChildren();
  if(!calculated.valid){
   dest.append(make('p',calculated.reason,'journal-small'));
  }else{
   const items=[
    ['Stop distance / share',fmt(calculated.riskPerShare)],
    ['Planned total risk',fmt(calculated.plannedRisk)],
    ['Reward / risk at target',calculated.rewardRisk==null?'Not measured':calculated.rewardRisk.toFixed(2)+':1'],
    ['Max. whole shares at budget',calculated.maxWholeShares==null?'Enter a risk budget':String(calculated.maxWholeShares)]
   ];
   const grid=make('div',undefined,'gu-v2-risk-grid');
   for(const [key,value] of items){
    const cell=make('div',undefined,'gu-v2-risk-item');cell.append(make('span',key),make('strong',value));grid.append(cell);
   }dest.append(grid);
   if(calculated.withinBudget===false)dest.append(make('p','The planned share quantity exceeds the entered dollar-risk budget.','gu-v2-warning'));
  }
  const apply=$('gu-v2-apply');apply.dataset.shares=calculated.maxWholeShares??'';
  // Keep the button actionable while the plan is editable so members can
  // learn exactly which prerequisite is missing; locked plans stay immutable.
  apply.disabled=!!current.disabled;
  apply.title=current.disabled?'Locked pre-trade plan cannot be edited.':
   (Number.isSafeInteger(calculated.maxWholeShares)&&calculated.maxWholeShares>0?
    'Apply suggested whole shares to the editable plan.':'Enter a valid risk budget, entry and stop to calculate whole shares.');
  reflection.replaceChildren(make('h3','Talia — focused next practice'));
  const tagged=[...form.querySelectorAll('input[name="journal-mistake"]:checked')].map(x=>x.value);
  if(!tagged.length)reflection.append(make('p','Describe what you observed and tag any process mistakes. A well-followed plan can still lose money.','journal-small'));
  else {
   const ul=make('ul');
   for(const tag of tagged.slice(0,4))ul.append(make('li',tag+': '+(advice[tag]||'Review the original evidence and practice a specific correction.')));
   reflection.append(ul);
  }
  const links=make('p',undefined,'journal-small');
  const lesson=make('a','Open guided lessons');lesson.href='learn.html';
  const labs=make('a','Review practice Labs');labs.href='labs.html';
  links.append(lesson,document.createTextNode(' · '),labs);reflection.append(links);
  reflection.append(make('p','These suggestions are ungraded and do not award competencies.','journal-small'));
 }
 form.addEventListener('input',updatePanels);form.addEventListener('change',updatePanels);
 window.addEventListener('gu-journal-record-loaded',()=>{redraw()});
 const observer=new MutationObserver(()=>redraw());
 for(const e of [locked,compare,metric,actual,evidence,history].filter(Boolean))
  observer.observe(e,{attributes:true,attributeFilter:['hidden']});
 const authScrub=new MutationObserver(()=>{if(root.hidden)head.hidden=true;else head.hidden=false});
 authScrub.observe(root,{attributes:true,attributeFilter:['hidden']});
 redraw();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
