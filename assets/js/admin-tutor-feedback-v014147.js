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
   const target=section.querySelector('[data-d07-list]');target.replaceChildren();
   for(const report of info.reports){
    const p=el('article');p.className='admin-card';
    const label=el('strong','Member report — '+(report.reportedAt||'undated'));
    const context=el('p','Source topics: '+(report.sourceTitles?.join(', ')||'not recorded'));
    const note=el('p','Reported issue: '+(report.note||'No detailed explanation provided.'));
    p.append(label,context,note);target.append(p);
   }
   if(!info.reports.length)target.textContent='No reported Tutor issues on this page.';
   section.querySelector('[data-d07-message]').textContent=
    info.total+' member report(s), showing page '+info.page+'. These are unverified, private reports.';
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
