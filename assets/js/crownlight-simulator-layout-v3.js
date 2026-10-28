/* Crownlight Simulator Workbench 3.0 — progressive disclosure without removing original controls.
 * Never alters replay permission, execution state, hidden future data, or Lab entitlements.
 */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id);
 const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text)node.textContent=text;return node};
 const state={initialized:false,active:'plan',userId:null};
 function setupImport(){
  const parent=$('sim-content'),section=[...parent.querySelectorAll(':scope > section')].find(x=>x.querySelector(':scope > h2')?.textContent?.includes('Load replay data'));
  if(!section||section.querySelector('details.cl-workbench-import'))return;
  const details=el('details','cl-workbench-import');details.open=true;
  const summary=el('summary','','1. Data source and historical replay setup');
  const info=el('span','cl-import-hint','Choose a provider, historical date or teaching dataset. Click to expand or collapse.');
  const inner=el('div','cl-import-interior');
  for(const child of [...section.childNodes])inner.appendChild(child);
  details.append(summary,info,inner);section.append(details);section.classList.add('cl-import-shell');
  const load=$('sim-load-msg');
  if(load){const observer=new MutationObserver(()=>{
   if(/Loaded \d+ provider bars|Loaded \d+ candles|Original fictional starter/i.test(load.textContent||''))details.open=false;
  });observer.observe(load,{childList:true,subtree:true,characterData:true})}
 }
 function setupChart(){
  const area=document.querySelector('#sim-content .sim-layout'),chart=area?.querySelector('.sim-chart-panel');
  if(!area||!chart)return;
  const toolbar=el('div','cl-chart-visibility');
  const label=el('strong','','2. Interactive chart and replay');
  const button=el('button','cl-collapse-btn','Hide chart');
  button.type='button';button.setAttribute('aria-expanded','true');
  button.onclick=()=>{
   chart.hidden=!chart.hidden;button.textContent=chart.hidden?'Show chart':'Hide chart';
   button.setAttribute('aria-expanded',String(!chart.hidden));
   if(!chart.hidden)requestAnimationFrame(()=>root.dispatchEvent(new Event('resize')));
  };
  toolbar.append(label,button);area.before(toolbar);
 }
 function setupTabs(){
  const parent=$('sim-content'),layout=parent?.querySelector('.sim-layout');
  const aside=layout?.querySelector(':scope > aside.sim-side');
  const metrics=[...parent.querySelectorAll(':scope > section')].find(x=>x.querySelector(':scope > h2')?.textContent?.includes('Simulation metrics'));
  if(!aside||!metrics)return;
  const wrapper=el('section','cl-workbench-tabs');
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
  const tabs=[['plan','Plan the trade',plan],['execute','Replay execution',execution],['metrics','Results & Journal',metricsPanel],['paper','Alpaca Paper',paper]];
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
  const note=el('p','cl-lab-help','All 419 canonical Labs are listed. Locked or unreleased Labs cannot be opened using this selector.');
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
    if(option.disabled){b.disabled=true;b.classList.add('cl-lab-option-locked');b.title='This Lab is unavailable under the current membership or release status';}
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
    const [c,r,a]=await Promise.all([
     fetch('data/competency-lab-paths-v01499.json',{cache:'force-cache'}).then(x=>x.ok?x.json():null),
     fetch('/api/lab-release-availability',{cache:'no-store'}).then(x=>x.ok?x.json():null),
     getToken?.().then(async token=>{
      if(!token)return null;
      const response=await fetch('/api/member-tool-access?tool=INTERACTIVE_LEARNING',{headers:{authorization:'Bearer '+token},cache:'no-store'});
      return response.ok?response.json():null;
     }).catch(()=>null)
    ]);
    if(c?.totalCanonicalLabs!==419||Object.keys(c.byLab||{}).length!==419)throw Error('Canonical Lab list unavailable.');
    catalog=c;
    const published=new Set(r?.publishedIds||[]),guided=new Set(r?.guidedBetaIds||[]);
    const premium=a?.authorized===true;
    const section=(name)=>{const group=el('optgroup');group.label=name;picker.append(group);return group};
    const beginner=section('Free Foundations — all five days unlocked');
    for(let day=1;day<=5;day++){
     const opt=new Option('Day '+day+' — Free beginner learning','academy:free5:'+day);beginner.append(opt);
    }
    const free=section('Released public sample Labs'),paid=section('Available with Interactive Learning entitlement'),locked=section('Locked or unreleased Labs');
    let available=0;
    for(const [id,entry]of Object.entries(c.byLab).sort(([a],[b])=>a.localeCompare(b))){
     const isPublished=published.has(id),isGuided=guided.has(id),isFree=entry.publicSample===true;
     const canOpen=isFree||(premium&&(isPublished||isGuided));
     const holder=canOpen?(isFree?free:paid):locked;
     const status=canOpen?'':'🔒 ';
     const title=String(entry.title||id).slice(0,95);
     const option=new Option(status+title+' · '+id+(isPublished?'':' · unreviewed'),'lab:'+id);
     option.disabled=!canOpen;holder.append(option);if(canOpen)available++;
    }
    if(old.value&&[...picker.options].some(o=>o.value==='lab:'+old.value&&!o.disabled))picker.value='lab:'+old.value;
    note.textContent='';renderOptions();
   }catch{note.textContent='Lab list unavailable. Open Free Foundations from the Academy.';}
  };
  picker.addEventListener('change',()=>{
   const selected=picker.selectedOptions[0];
   if(selected?.disabled){picker.value='';return}
   if(picker.value.startsWith('academy:free5:')){
    const day=Number(picker.value.split(':')[2]);location.assign('bootcamp-academy.html?program=free5&day='+day+'#academy-workspace');return
   }
   if(picker.value.startsWith('lab:')){old.value=picker.value.slice(4);const href=el('a','cl-selected-lab-link','Open selected Lab');
    href.href='lab-player.html?lab='+encodeURIComponent(old.value);
    note.replaceChildren(document.createTextNode('Related Lab selected: '+old.value+'. '),href);}
   else old.value='';
  });
  load();
 }
 function init(opts={}){
  if(state.initialized)return;const rootContent=$('sim-content');
  if(!rootContent)return;state.initialized=true;
  setupImport();setupChart();setupTabs();setupLabPicker(opts);
 }
 root.CrownlightWorkbenchLayout={init};
})(window);
