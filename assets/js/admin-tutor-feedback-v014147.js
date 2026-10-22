/* D07: existing Admin > Content & Tutor, Owner-only reported-answer triage.
 * Endpoint is authoritative. On denied roles it never mounts a privileged panel.
 * No writes or implicit report-resolution workflow.
 */
(function(){
 'use strict';
 const panel=document.querySelector('section[data-admin-panel="content"]');
 if(!panel)return;
 let mounted=false,loaded=false,page=1;
 const el=(tag,value)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=String(value);return n};
 async function inspect(){
  const client=await window.getSupabaseClient();
  const session=(await client.auth.getSession()).data?.session;
  if(!session?.access_token)return null;
  const response=await fetch('/api/owner-tutor-feedback?page='+page,{
   cache:'no-store',headers:{authorization:'Bearer '+session.access_token}});
  if(response.status===401||response.status===403)return null;
  const json=await response.json().catch(()=>null);
  if(!response.ok||json?.ok!==true)throw Error('Private Tutor reports are not currently available.');
  if(!Array.isArray(json.reports)||!Number.isSafeInteger(json.total))throw Error('Invalid private Tutor report result.');
  return json;
 }
 async function ownerApi(path,method='GET',body){
  const client=await window.getSupabaseClient();
  const token=(await client.auth.getSession()).data?.session?.access_token;
  if(!token)throw Error('Owner session unavailable.');
  const options={method,cache:'no-store',headers:{authorization:'Bearer '+token}};
  if(body!==undefined){options.headers['content-type']='application/json';options.body=JSON.stringify(body)}
  const response=await fetch(path,options);
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.ok!==true)throw Error(data?.error||'Owner Tutor editorial service unavailable.');
  return data;
 }
 async function loadCases(reports){
  const ids=reports.map(x=>x.id).filter(x=>typeof x==='string'&&x.length===36);
  if(!ids.length)return new Map();
  const data=await ownerApi('/api/owner-tutor-case?ids='+ids.join(','));
  return new Map(data.cases.map(x=>[x.reportId,x]));
 }
 async function loadGaps(){
  const data=await ownerApi('/api/owner-tutor-topic-gaps');
  return Array.isArray(data.totals)?data.totals:[];
 }
 function reviewControls(report,caseInfo,active){
  const holder=el('div');holder.className='actions';
  const statusLabel=el('label','Editorial status');
  const status=el('select');
  for(const code of ['open','investigating','resolved','dismissed']){
   const opt=el('option',code.replace('_',' '));opt.value=code;status.append(opt);
  }
  status.value=caseInfo?.status||'open';
  const resolutionLabel=el('label','Resolution');
  const resolution=el('select');
  for(const [code,title] of [['','Not applicable'],['source_corrected','Source corrected'],
   ['instruction_clarified','Instruction clarified'],
   ['not_reproducible','Not reproducible'],['out_of_scope','Out of scope']]){
   const opt=el('option',title);opt.value=code;resolution.append(opt);
  }
  resolution.value=caseInfo?.resolution||'';
  function adjust(){
   const finalized=status.value==='resolved'||status.value==='dismissed';
   resolution.disabled=!finalized;
   if(!finalized)resolution.value='';
  }
  status.addEventListener('change',adjust);adjust();
  const save=el('button','Record editorial decision');save.type='button';save.className='btn secondary';
  save.disabled=!active;status.disabled=!active;resolution.disabled=!active||resolution.disabled;
  const result=el('p',active?
   'Every changed decision creates a database audit event.':'Install the new D09 editorial SQL to enable review decisions.');
  result.setAttribute('role','status');result.setAttribute('aria-live','polite');
  save.addEventListener('click',async()=>{
   if(['resolved','dismissed'].includes(status.value)&&!resolution.value){
    result.textContent='Choose a resolution before closing this report.';return;
   }
   save.disabled=true;result.textContent='Recording an Owner-only audit event…';
   try{
    const x=await ownerApi('/api/owner-tutor-case','POST',{
     reportId:report.id,status:status.value,resolution:resolution.value||null
    });
    result.textContent=x.unchanged?'No status change; existing audit retained.':
     'Decision saved to the private editorial audit.';
   }catch(e){result.textContent=e.message}
   finally{save.disabled=false}
  });
  statusLabel.append(status);resolutionLabel.append(resolution);
  holder.append(statusLabel,resolutionLabel,save,result);return holder;
 }
 async function update(){
  let section=panel.querySelector('#d07-tutor-feedback');
  const message=section?.querySelector('[data-d07-message]');
  if(message)message.textContent='Loading member-reported Tutor issues…';
  try{
   const info=await inspect();
   if(!info){if(section)section.remove();mounted=false;return}
   if(!mounted){
    section=el('section');section.id='d07-tutor-feedback';
    section.className='admin-card';
    const h=el('h2','Market Tutor — member-reported answers');
    const help=el('p','Owner review only. Reports are private member allegations, not verified pedagogical or safety defects; report resolution requires a separate audited workflow.');
    const status=el('p');status.dataset.d07Message='1';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const list=el('div');list.dataset.d07List='1';
    const actions=el('div');actions.className='actions';
    const refresh=el('button','Refresh reports');refresh.type='button';refresh.className='btn secondary';
    refresh.addEventListener('click',()=>void update());
    const next=el('button','Next page');next.type='button';next.className='btn secondary';
    next.dataset.d07Next='1';next.addEventListener('click',()=>{page++;void update()});
    const prev=el('button','Previous page');prev.type='button';prev.className='btn secondary';
    prev.dataset.d07Prev='1';prev.addEventListener('click',()=>{page=Math.max(1,page-1);void update()});
    actions.append(refresh,prev,next);section.append(h,help,status,list,actions);
    panel.append(section);mounted=true;
   }
   // Existing private report inbox remains usable when the optional D09
   // audited editorial migration has not been installed.
   let cases=new Map(),available=true,gaps=[],gapAvailable=true;
   try{cases=await loadCases(info.reports)}catch{available=false}
   try{gaps=await loadGaps()}catch{gapAvailable=false}
   const target=section.querySelector('[data-d07-list]');target.replaceChildren();
   for(const report of info.reports){
    const p=el('article');p.className='admin-card';
    const label=el('strong','Member report — '+(report.reportedAt||'undated'));
    const context=el('p','Source topics: '+(report.sourceTitles?.join(', ')||'not recorded'));
    const note=el('p','Reported issue: '+(report.note||'No detailed explanation provided.'));
    p.append(label,context,note,reviewControls(report,cases.get(report.id),available));target.append(p);
   }
   if(!info.reports.length)target.textContent='No reported Tutor issues on this page.';
   section.querySelector('[data-d07-message]').textContent=
    info.total+' member report(s), showing page '+info.page+'. These are unverified, private reports.';
   let coverage=section.querySelector('[data-d09-coverage]');
   if(!coverage){coverage=el('section');coverage.dataset.d09Coverage='1';section.append(coverage)}
   coverage.replaceChildren();
   coverage.append(el('h3','Unanswered Market Tutor topics — last 30 days'));
   coverage.append(el('p',gapAvailable?
    'Anonymous fixed-category counts only; member questions are never stored in this report.':
    'Coverage tally is unavailable until the D09 supplemental SQL is installed.'));
   if(gapAvailable){
    if(!gaps.length)coverage.append(el('p','No unmatched topic categories recorded.'));
    for(const x of gaps.slice(0,14))
     coverage.append(el('p',String(x.topic)+': '+String(x.count)+' unmatched question(s)'));
   }
   section.querySelector('[data-d07-next]').disabled=info.page*info.pageSize>=info.total;
   section.querySelector('[data-d07-prev]').disabled=info.page<=1;
  }catch(e){if(section)section.querySelector('[data-d07-message]').textContent=e.message}
 }
 document.addEventListener('click',event=>{
  if(event.target.closest('[data-panel="content"]')){
   if(!loaded){loaded=true;void update()}else if(mounted)void update();
  }
 });
})();
