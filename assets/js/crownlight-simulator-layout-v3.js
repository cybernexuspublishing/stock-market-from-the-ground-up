/* Crownlight Simulator Workbench 3.0 — progressive disclosure without removing original controls.
 * Never alters replay permission, execution state, hidden future data, or Lab entitlements.
 */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id);
 const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text)node.textContent=text;return node};
 const state={initialized:false,active:'plan',userId:null};
 function setupImport(){
  const parent=$('sim-content');if(!parent)return;
  const section=[...parent.querySelectorAll(':scope > section')].find(x=>
   x.classList.contains('cl-import-shell')||
   x.querySelector(':scope > h2')?.textContent?.includes('Load replay data'));
  if(!section)return;
  section.id='cl-replay-import';
  // Ensure the data-import section stays ahead of the chart, even when an
  // older browser layout script has moved its DOM node.
  const chartSection=parent.querySelector(':scope > .sim-layout');
  if(chartSection&&[...parent.children].indexOf(section)>[...parent.children].indexOf(chartSection))
   parent.insertBefore(section,chartSection);
  if(section.querySelector('details.cl-workbench-import'))return;
  const details=el('details','cl-workbench-import');details.open=true;
  const summary=el('summary','','1. Data source and historical replay setup');
  const info=el('span','cl-import-hint','Choose a provider, historical date or teaching dataset. Click to expand or collapse.');
  const inner=el('div','cl-import-interior');
  for(const child of [...section.childNodes])inner.appendChild(child);
  details.append(summary,info,inner);section.append(details);section.classList.add('cl-import-shell');
  // Source controls must not disappear when a dataset loads. The member may
  // collapse Step 1 explicitly using its heading; never auto-collapse it.
 }
 function setupChart(){
  const area=document.querySelector('#sim-content .sim-layout'),chart=area?.querySelector('.sim-chart-panel');
  if(!area||!chart)return;
  const toolbar=el('div','cl-chart-visibility');toolbar.id='cl-chart-visibility-toolbar';
  const label=el('strong','','2. Interactive chart and replay');
  const button=el('button','cl-collapse-btn','Hide chart');
  button.type='button';button.setAttribute('aria-expanded','true');
  button.onclick=()=>{
   chart.hidden=!chart.hidden;button.textContent=chart.hidden?'Show chart':'Hide chart';
   button.setAttribute('aria-expanded',String(!chart.hidden));
   if(!chart.hidden)requestAnimationFrame(()=>root.dispatchEvent(new Event('resize')));
  };
  const timeframe=el('label','cl-chart-timeframe-input','Display timeframe label');
  const input=el('input');input.type='text';input.maxLength=48;
  input.placeholder='1-minute';input.value=$('sim-timeframe')?.value||'1-minute';
  input.setAttribute('aria-label','Chart timeframe display label; this does not resample market data');
  input.oninput=()=>{
   const original=$('sim-timeframe');if(original){original.value=input.value;original.dispatchEvent(new Event('input',{bubbles:true}))}
  };
  timeframe.append(input);
  toolbar.append(label,timeframe,button);area.before(toolbar);
 }
 function setupTabs({canUsePaper=false}={}){
  const parent=$('sim-content'),layout=parent?.querySelector('.sim-layout');
  const aside=layout?.querySelector(':scope > aside.sim-side');
  const metrics=[...parent.querySelectorAll(':scope > section')].find(x=>x.querySelector(':scope > h2')?.textContent?.includes('Simulation metrics'));
  if(!aside||!metrics)return;
  const wrapper=el('section','cl-workbench-tabs');wrapper.id='cl-simulator-workbench';
  wrapper.setAttribute('aria-label','Trade planning, execution and learning metrics');
  const nav=el('div','cl-workbench-tabbar');nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Simulator workbench');
  const panels=el('div','cl-workbench-panels');
  const plan=el('section','cl-tab-panel');plan.id='cl-panel-plan';
  const execution=el('section','cl-tab-panel');execution.id='cl-panel-execute';
  const metricsPanel=el('section','cl-tab-panel');metricsPanel.id='cl-panel-metrics';
  const paper=el('section','cl-tab-panel');paper.id='cl-panel-paper';
  let target=plan;
  for(const child of [...aside.children]){
   if(child.classList?.contains('sim-divider')){child.remove();target=execution;continue}
   if(child.tagName==='H2'&&child.textContent.includes('3. Execute'))target=execution;
   target.appendChild(child);
  }
  aside.remove();metricsPanel.append(...[...metrics.childNodes]);metrics.remove();
  paper.innerHTML='<h2>Alpaca Paper Trading</h2><p>Use your own verified Alpaca Paper Trading account. These are simulated brokerage orders executed by Alpaca at current paper-market conditions, not historical replay fills.</p><div id="cl-paper-terminal"></div>';
  const tabs=[['plan','Plan the trade',plan],['execute','Replay execution',execution],['metrics','Results & Journal',metricsPanel]];
  if(canUsePaper)tabs.push(['paper','Alpaca Paper',paper]);
  for(const [id,label,panel] of tabs){
   const b=el('button','cl-workbench-tab',label);b.type='button';b.id='cl-tab-'+id;
   b.setAttribute('role','tab');b.setAttribute('aria-controls',panel.id);b.setAttribute('aria-selected','false');
   b.tabIndex=-1;b.onclick=()=>activate(id);
   b.addEventListener('keydown',e=>{
    const ids=tabs.map(t=>t[0]);let n=ids.indexOf(id);
    if(e.key==='ArrowRight')n=(n+1)%ids.length;
    else if(e.key==='ArrowLeft')n=(n-1+ids.length)%ids.length;
    else if(e.key==='Home')n=0;
    else if(e.key==='End')n=ids.length-1;
    else return;
    e.preventDefault();activate(ids[n]);$('cl-tab-'+ids[n]).focus();
   });
   panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',b.id);
   nav.append(b);panels.append(panel);
  }
  wrapper.append(nav,panels);layout.after(wrapper);
  function activate(id){
   state.active=id;
   for(const [key,_,panel] of tabs){
    panel.hidden=key!==id;
    const btn=$('cl-tab-'+key);btn.setAttribute('aria-selected',String(key===id));btn.tabIndex=key===id?0:-1;
   }
   if(id==='paper')root.CrownlightPaperTerminal?.refresh?.();
  }
  root.CrownlightWorkbench={openTab:activate};
  activate('plan');
 }
 function setupLabPicker({getToken}){
  const old=$('sim-lab-id');if(!old)return;
  const label=old.closest('div')?.querySelector('label');
  if(label)label.textContent='Related Lab (optional)';
  const picker=el('select','cl-lab-selector');picker.id='sim-lab-picker';picker.setAttribute('aria-label','Select a related Lab or Free Foundations lesson');
  const placeholder=new Option('Choose a Lab or Free Foundations lesson','');picker.append(placeholder);
  old.hidden=true;old.setAttribute('aria-hidden','true');old.tabIndex=-1;
  old.after(picker);
  const timeRange=el('div','cl-lab-time-range');
  timeRange.innerHTML='<label>Verified Lab start time (ET)<input id="cl-lab-start-time" type="time" aria-label="Lab context start time Eastern"></label><label>Verified Lab end time (ET)<input id="cl-lab-end-time" type="time" aria-label="Lab context end time Eastern"></label>';
  picker.after(timeRange);
  const note=el('p','cl-lab-help','');
  picker.after(note);
  picker.hidden=true;picker.setAttribute('aria-hidden','true');picker.tabIndex=-1;
  const compact=el('div','cl-lab-combobox');
  compact.innerHTML='<button type="button" class="cl-lab-trigger" aria-expanded="false" aria-controls="cl-lab-results">Select a lesson or Lab <span aria-hidden="true">⌄</span></button><div id="cl-lab-results" class="cl-lab-popover" hidden><label for="cl-lab-search">Search lessons or Labs</label><input id="cl-lab-search" type="search" placeholder="Search title, topic or Lab ID" autocomplete="off"><div class="cl-lab-options" role="listbox" aria-label="Available and locked Labs"></div></div>';
  picker.after(compact);
  const trigger=compact.querySelector('.cl-lab-trigger'),popover=compact.querySelector('.cl-lab-popover'),search=compact.querySelector('#cl-lab-search'),results=compact.querySelector('.cl-lab-options');
  const renderOptions=()=>{const query=search.value.trim().toLowerCase();results.replaceChildren();let displayed=0;
   for(const option of [...picker.options]){
    if(!option.value||!option.textContent.toLowerCase().includes(query))continue;
    if(displayed++>=65)break;
    const b=el('button','cl-lab-option',option.textContent);b.type='button';b.dataset.value=option.value;
    b.setAttribute('role','option');b.setAttribute('aria-selected',String(picker.value===option.value));
    if(option.disabled){b.disabled=true;b.classList.add('cl-lab-option-locked');b.title=option.dataset.reason||'This Lab is not available to your account';}
    b.addEventListener('click',()=>{picker.value=option.value;picker.dispatchEvent(new Event('change',{bubbles:true}));trigger.firstChild.textContent=option.textContent+' ';popover.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus()});results.append(b)
   }
   if(!displayed)results.append(el('p','cl-lab-empty','No matching lessons or Labs.'));
  };
  trigger.addEventListener('click',()=>{popover.hidden=!popover.hidden;trigger.setAttribute('aria-expanded',String(!popover.hidden));if(!popover.hidden){renderOptions();search.focus()}});
  search.addEventListener('input',renderOptions);
  compact.addEventListener('keydown',e=>{if(e.key==='Escape'&&!popover.hidden){popover.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus()}});
  document.addEventListener('click',e=>{if(!compact.contains(e.target)){popover.hidden=true;trigger.setAttribute('aria-expanded','false')}});
  let catalog=null;
  const load=async()=>{
   try{
    const [c,r,access]=await Promise.all([
     fetch('data/competency-lab-paths-v01499.json',{cache:'force-cache'}).then(x=>x.ok?x.json():null),
     fetch('/api/lab-release-availability',{cache:'no-store'}).then(x=>x.ok?x.json():null),
     (async()=>{
      const token=await getToken?.();
      if(!token)return {freeEligible:false,interactive:false,training:false};
      const headers={authorization:'Bearer '+token};
      const checks=await Promise.allSettled(['INTERACTIVE_LEARNING','ONDEMAND_TRAINING'].map(async tool=>{
       const response=await fetch('/api/member-tool-access?tool='+tool,{headers,cache:'no-store'});
       if(!response.ok)throw Error('Entitlement verification unavailable');
       const data=await response.json();
       if(data?.ok!==true)throw Error('Invalid entitlement verification response');
       return data;
      }));
      const verified=checks.filter(x=>x.status==='fulfilled').map(x=>x.value);
      return {
       freeEligible:verified.some(x=>x.freeEligible===true),
       interactive:verified.some(x=>x.tool==='INTERACTIVE_LEARNING'&&x.authorized===true),
       training:verified.some(x=>x.tool==='ONDEMAND_TRAINING'&&x.authorized===true)
      };
     })().catch(()=>({freeEligible:false,interactive:false,training:false}))
    ]);
    if(c?.totalCanonicalLabs!==419||Object.keys(c.byLab||{}).length!==419)throw Error('Canonical Lab list unavailable.');
    if(r?.ok!==true||!Array.isArray(r.publishedIds)||!Array.isArray(r.guidedBetaIds)||!Array.isArray(r.trainingOnlyIds))
     throw Error('Verified Lab release information unavailable.');
    catalog=c;
    const published=new Set(r.publishedIds),guided=new Set(r.guidedBetaIds),trainingOnly=new Set(r.trainingOnlyIds);
    const freeSamples=new Set(['F1-C02-L01','F2-C01-L01','F3-C01-L01']);
    const section=name=>{const group=el('optgroup');group.label=name;picker.append(group);return group};
    const beginner=section('Free Foundations');
    for(let day=1;day<=5;day++){
     const opt=new Option('Day '+day+' — Free beginner learning','academy:free5:'+day);beginner.append(opt);
    }
    const free=section('Available free sample Labs'),availableLabs=section('Available guided Labs');
    const requiresAccess=section('Requires matching access'),unreleased=section('Not released for guided study');
    for(const [id,entry]of Object.entries(c.byLab).sort(([a],[b])=>a.localeCompare(b))){
     const isPublished=published.has(id),isGuided=guided.has(id),isReleased=isPublished||isGuided;
     const isFree=freeSamples.has(id),siteTrainingOnly=trainingOnly.has(id);
     const entitled=isFree?access.freeEligible:
      siteTrainingOnly?access.training:(access.interactive||access.training);
     const canOpen=isReleased&&entitled;
     const holder=canOpen?(isFree?free:availableLabs):isReleased?requiresAccess:unreleased;
     const suffix=!isReleased?'Not released':!entitled?'Access required':isGuided?'Ungraded beta':'Reviewed release';
     const title=String(entry.title||id).slice(0,95);
     const option=new Option((canOpen?'':'🔒 ')+title+' · '+id+' · '+suffix,'lab:'+id);
     option.disabled=!canOpen;
     if(!isReleased)option.dataset.reason='This lesson is not yet released for guided study.';
     else if(!entitled)option.dataset.reason=siteTrainingOnly?
      'Requires authorized Historical Replay Training access.':'Requires matching member access to this Lab.';
     holder.append(option);
    }
    if(old.value&&[...picker.options].some(o=>o.value==='lab:'+old.value&&!o.disabled)){
      picker.value='lab:'+old.value;void applyLabContext(old.value);
    }else note.textContent='';
    renderOptions();
   }catch{note.textContent='Lab list unavailable. Open Free Foundations from the Academy.';}
  };
  async function applyLabContext(id){
   const marker=old.dataset.contextRequest=String(Date.now())+':'+Math.random().toString(36).slice(2);
   const start=$('sim-start-date'),end=$('sim-end-date');
   const t0=$('cl-lab-start-time'),t1=$('cl-lab-end-time');
   for(const field of [start,end,t0,t1])if(field)field.value='';
   const tooltip='Lab reference date and time are loaded only when supplied in the verified catalog.';
   note.textContent='Loading the selected Lab reference date and time…';
   try{
    const token=await getToken?.();
    if(!token)throw Error('Sign in to view Lab reference context.');
    const res=await fetch('/api/simulator-lab-context?lab='+encodeURIComponent(id),{
     headers:{authorization:'Bearer '+token},cache:'no-store'});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||data.ok!==true)throw Error(data.error||'This Lab context is unavailable.');
    if(old.dataset.contextRequest!==marker)return;
    if(data.referenceDate){if(start)start.value=data.referenceDate;if(end)end.value=data.referenceDate}
    if(data.startTimeET&&t0)t0.value=data.startTimeET;
    if(data.endTimeET&&t1)t1.value=data.endTimeET;
    const ticker=$('sim-ticker');
    if(data.ticker&&ticker)ticker.value=data.ticker;
    const source=data.referenceDate?'Lab reference date: '+data.referenceDate+'. ':'No historical reference date recorded. ';
    const times=data.startTimeET&&data.endTimeET?
     'Start '+data.startTimeET+' ET, end '+data.endTimeET+' ET. ':
     'No verified intraday start/end time recorded; select a time manually if needed. ';
    const idlink=el('a','cl-selected-lab-link','Open selected Lab');
    idlink.href='lab-player.html?lab='+encodeURIComponent(id);
    note.replaceChildren(document.createTextNode(source+times),idlink);
   }catch(error){if(old.dataset.contextRequest===marker)
    note.textContent='Lab '+id+': '+String(error.message||'Date and time are unavailable.')+
      ' The original replay date/time has not been changed.';}
  }
  picker.addEventListener('change',()=>{
   const selected=picker.selectedOptions[0];
   if(selected?.disabled){picker.value='';return}
   if(picker.value.startsWith('academy:free5:')){
    const day=Number(picker.value.split(':')[2]);
    if(Number.isInteger(day)&&day>=1&&day<=5)
      location.assign('bootcamp-academy.html?program=free5&day='+day+'#academy-day-title');
    return;
   }
   if(picker.value.startsWith('lab:')){old.value=picker.value.slice(4);
    if($('sim-start-date'))$('sim-start-date').value='';if($('sim-end-date'))$('sim-end-date').value='';
    if($('cl-lab-start-time'))$('cl-lab-start-time').value='';if($('cl-lab-end-time'))$('cl-lab-end-time').value='';
    void applyLabContext(old.value);}
   else old.value='';
  });
  load();
 }
 function restoreStepOrder(){
  const parent=$('sim-content');
  if(!parent)return;
  const source=$('cl-replay-import'),toolbar=$('cl-chart-visibility-toolbar');
  const chart=parent.querySelector(':scope > .sim-layout'),tabs=$('cl-simulator-workbench');
  if(!source||!chart)return;
  // Keep DOM/screen-reader order identical to visual order. Older stored layout
  // positions must never put the source picker after the chart or trade tabs.
  const expected=[source,toolbar,chart,tabs].filter(el=>el&&el.parentElement===parent);
  const current=[...parent.children];
  if(expected.every((el,i)=>current[i]===el))return;
  for(let i=expected.length-1;i>=0;i--)parent.prepend(expected[i]);
 }
 function watchOrder(){
  const host=$('sim-content');if(!host)return;
  let queued=false;
  const observer=new MutationObserver(()=>{
   if(queued)return;queued=true;
   requestAnimationFrame(()=>{queued=false;restoreStepOrder()});
  });
  observer.observe(host,{childList:true});
 }
 function init(opts={}){
  if(state.initialized)return;const rootContent=$('sim-content');
  if(!rootContent)return;state.initialized=true;
  setupImport();setupChart();setupTabs(opts);setupLabPicker(opts);
  restoreStepOrder();watchOrder();
  const timeframe=$('sim-timeframe');
  if(timeframe){timeframe.maxLength=48;timeframe.addEventListener('input',()=>{
   if($('cl-chart-timeframe'))$('cl-chart-timeframe').textContent=(timeframe.value.trim()||'Timeframe —')+' · display label';
   const mirror=$('cl-chart-visibility-toolbar')?.querySelector('input');
   if(mirror&&document.activeElement!==mirror)mirror.value=timeframe.value;
  });}
 }
 root.CrownlightWorkbenchLayout={init};
})(window);
