/* Lab Engine v3.2 shared orientation across the 419 canonical IDs.
 * Original competency guides are public and ungraded. Private assessment,
 * historical replay and all member entitlements remain server-controlled.
 */
(function(root){
 'use strict';
 const STEPS=Object.freeze(['Start','Learn','Experiment','Predict','Practice','Assess','Review','Transfer','Results']);
 const ticket=new WeakMap();
 let catalog=null;
 async function data(){
  if(!catalog)catalog=Promise.all([
   fetch('/data/competency-lab-paths-v01499.json',{cache:'force-cache'}).then(x=>{if(!x.ok)throw Error('Lab map unavailable');return x.json()}),
   fetch('/data/competency-study-guides-v01499.json',{cache:'force-cache'}).then(x=>{if(!x.ok)throw Error('Study guides unavailable');return x.json()})
  ]).then(([a,b])=>{
   if(a.totalCanonicalLabs!==419||Object.keys(a.byLab||{}).length!==419||
      b.guides?.length!==30||new Set(b.guides.map(x=>x.code)).size!==30)
    throw Error('Canonical curriculum mismatch');
   return {labs:a.byLab,guides:new Map(b.guides.map(x=>[x.code,x]))};
  }).catch(e=>{catalog=null;throw e});
  return catalog;
 }
 function el(tag,value){const n=document.createElement(tag);if(value!==undefined)n.textContent=String(value);return n}
 function field(label,value=''){const wrap=el('label',label),input=el('textarea');input.rows=3;input.maxLength=1500;input.value=value;wrap.append(input);return {wrap,input}}
 async function mount({labId,mode,target,lab,focusId}){
  if(!target||typeof target.replaceChildren!=='function')return false;
  const epoch={labId,mode};ticket.set(target,epoch);
  if(!['guided','practice'].includes(mode)){target.replaceChildren();return false}
  target.replaceChildren(el('p','Loading original subject instruction…'));
  let map;
  try{map=await data()}catch{
   if(ticket.get(target)===epoch)target.replaceChildren(el('p','Study guide unavailable; no grade or review is inferred.'));
   return false;
  }
  if(ticket.get(target)!==epoch)return false;
  if(!Object.hasOwn(map.labs,labId)){target.replaceChildren(el('p','Lab not in the canonical curriculum.'));return false}
  const record=map.labs[labId],ids=record.relatedCompetencies.filter(x=>map.guides.has(x));
  const guide=map.guides.get(ids[0]);
  if(!guide){target.replaceChildren(el('p','This Lab has no verified competency study bridge.'));return false}
  const topic=String(lab?.concept||record.title||labId);
  const wrapper=el('section'),title=el('h2','Lab Engine v3.2 — '+guide.title),
   intro=el('p','Ungraded conceptual instruction for '+labId+' · '+topic+'. A registry record is not proof of editorial, market-data, assessment or production acceptance.');
  wrapper.className='card gu-v32';wrapper.setAttribute('aria-label','Lab Engine v3.2 shared teaching');
  const progress=el('p'),body=el('section'),status=el('p'),nav=el('div');
  progress.className='gu-v32-progress';body.className='gu-v32-body';nav.className='actions';
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const back=el('button','Previous stage'),next=el('button','Next learning stage');
  back.type=next.type='button';back.className=next.className='btn secondary';
  nav.append(back,next);wrapper.append(title,intro,progress,body,status,nav);target.replaceChildren(wrapper);
  let step=0,observation='',prediction='',practice='',transfer='',review=false;
  function button(label,handler){const b=el('button',label);b.type='button';b.className='btn secondary';b.onclick=handler;return b}
  function definition(label,value){const dl=el('dl');dl.append(el('dt',label),el('dd',value));return dl}
  function details(label,contents){const d=el('details');d.append(el('summary',label));for(const s of contents)d.append(el('p',s));return d}
  function render(){
   body.replaceChildren();status.textContent='';
   progress.textContent='Stage '+(step+1)+' of '+STEPS.length+': '+STEPS[step];body.append(el('h3',STEPS[step]));
   if(step===0){
    body.append(definition('Objective',lab?.goal||topic),definition('Official competency link',guide.title),
     el('p','The chart source and observation boundary must be independently verified. Do not use later bars or treat fictional numbers as market history.'));
   }else if(step===1){
    body.append(definition('What it means',guide.concept),definition('Why and how',guide.procedure),
     details('Teach This in More Depth — free',[
      'Identify which prices, timeframes and observations are actually available.',
      'Apply this procedure step by step: '+guide.procedure,
      'Check competing interpretations and potential invalidation: '+guide.invalidation,
      'Common mistake: '+guide.commonError,
      'Limitation: '+guide.limit]));
    if(ids.length>1)body.append(el('p','Related competencies: '+ids.slice(1,4).map(x=>map.guides.get(x).title).join('; ')));
   }else if(step===2){
    body.append(el('p','Experiment with permitted observations in the actual Lab. Supply the source and units. Missing market data cannot be filled with imaginary historical bars.'));
    const p=field('Describe observable price, volume, levels, timeframe and units',observation);body.append(p.wrap);
    body.append(button('Record ungraded observations',()=>{observation=p.input.value.trim();status.textContent=observation.length>=15?'Recorded in this page only.':'Please identify the observation and its source.'}));
    body.append(details('Explain This Concept — free',[guide.concept,guide.procedure,guide.limit]));
   }else if(step===3){
    body.append(el('p','Before any subsequent market observation, make a prediction and identify what would make it wrong.'));
    const f=field('Prediction, evidence and invalidation',prediction);body.append(f.wrap);
    body.append(button('Lock ungraded prediction',()=>{if(f.input.value.trim().length<15){status.textContent='Provide a prediction and explanation of at least 15 characters.';return}prediction=f.input.value.trim();f.input.disabled=true;status.textContent='Prediction locked locally. No assessed credit or future observation disclosed.'}));
   }else if(step===4){
    body.append(el('p','Independent practice: '+guide.selfCheck));
    const f=field('My answer, evidence and limits',practice);body.append(f.wrap);
    body.append(button('Record independent practice',()=>{practice=f.input.value.trim();status.textContent=practice.length>=15?'Practice recorded locally; formal grade unchanged.':'Describe reasoning in at least 15 characters.'}));
    body.append(details('Guided correction — free',[guide.procedure,'Common mistake: '+guide.commonError,guide.limit]));
   }else if(step===5){
    body.append(el('p','Official Assessment is separate and server-graded only when a reviewed private question bank exists. This screen cannot award mastery.'));
    body.append(button('Go to authenticated Lab decision',()=>document.getElementById(focusId||'ev-decision')?.focus()));
   }else if(step===6){
    body.append(definition('Self-review',guide.reviewExplanation),definition('Limitations',guide.limit),definition('What invalidates the reading',guide.invalidation));
    body.append(button('Acknowledge my self-review',()=>{review=true;status.textContent='Self-review acknowledged, not graded.'}));
   }else if(step===7){
    body.append(el('p','Transfer case: choose a different permitted timeframe or observation. Describe what changes, and do not infer a repeat of the original outcome.'));
    const f=field('New case, relevant differences and independent decision',transfer);body.append(f.wrap);
    body.append(button('Record ungraded transfer',()=>{transfer=f.input.value.trim();status.textContent=transfer.length>=15?'Transfer recorded locally.':'Provide your independent reasoning.'}));
   }else{
    for(const [label,v] of [['Lab',labId],['Subject',topic],['Observed evidence',observation?'Recorded':'Not recorded'],
      ['Pre-observation prediction',prediction?'Locked':'Not recorded'],
      ['Practice response',practice?'Recorded':'Not recorded'],
      ['Self-review',review?'Reviewed locally':'Not reviewed'],
      ['Transfer',transfer?'Recorded':'Not recorded'],['Official grade','Not issued by conceptual guidance']])
     body.append(definition(label,v));
    body.append(el('p','Local study notes do not persist after reload. Use the separately authenticated Lab controls to save an official member record.'));
   }
   back.disabled=step===0;next.disabled=step===STEPS.length-1;
  }
  back.onclick=()=>{if(step>0){step--;render()}};
  next.onclick=()=>{
   if(step===3&&!prediction){status.textContent='Lock a prediction before continuing.';return}
   if(step===4&&!practice){status.textContent='Record your own practice before reviewing.';return}
   if(step<STEPS.length-1){step++;render()}
  };
  render();return true;
 }
 root.GroundUpLabEngineV32Universal=Object.freeze({mount,version:'3.2.0',canonicalTarget:419,steps:STEPS});
})(globalThis);
