/* v0.14.0.247 — one Owner-only, read-only acceptance section in the existing Admin shell. */
(()=>{'use strict';
 const gate=()=>document.getElementById('admin-gate');
 const app=()=>document.getElementById('admin-app');
 const nav=()=>document.getElementById('admin-tabs');
 let mounted=false,loading=false;
 async function token(){
  const sb=await window.getSupabaseClient();
  const {data,error}=await sb.auth.getSession();
  if(error||!data?.session?.access_token)throw Error('Owner session expired. Sign in again.');
  return data.session.access_token;
 }
 async function read(url){
  const bearer=await token();
  const r=await fetch(url,{method:'GET',headers:{authorization:'Bearer '+bearer,accept:'application/json'},cache:'no-store'});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.ok!==true)throw Error(j.error||'Readiness service unavailable.');
  return j;
 }
 const E=(type,className,text)=>{
  const el=document.createElement(type);
  if(className)el.className=className;
  if(text!==undefined)el.textContent=String(text);
  return el;
 };
 function open(section,button){
  document.querySelectorAll('.admin-panel').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('#admin-tabs button').forEach(x=>x.classList.remove('active'));
  section.classList.add('active');button.classList.add('active');
  history.replaceState(null,'','#admin-prelive');
  refresh(section);
 }
 function draw(section,data){
  const stats=section.querySelector('[data-prelive-counts]'),list=section.querySelector('[data-prelive-checks]');
  stats.replaceChildren();list.replaceChildren();
  const labels={members:'Member profiles',orders:'Site orders',subscriptions:'Subscriptions',auditEntries:'Admin audit records',founderReservations:'Founder LIVE reservations',founderMembers:'Founder LIVE members',founderQaIntents:'Founder TEST intents',founderQaEvents:'Founder TEST events',founderQaCycles:'Founder TEST paid cycles',registeredLabs:'Registered Labs',reviewedLabs:'Reviewed assessment sets',draftLabs:'Draft assessment sets',competencies:'Competencies',adSandboxOrders:'Ad QA orders',adSandboxEvents:'Ad QA events'};
  for(const [key,label] of Object.entries(labels)){
   const card=E('article','admin-prelive-stat'),value=data.counts?.[key];
   card.append(E('strong','',value==null?'Unavailable':Number(value).toLocaleString()),E('span','',label));
   stats.append(card);
  }
  const statusNames={verified:'Verified configuration',action_required:'Action required',review:'Review',pending:'Acceptance pending'};
  for(const item of data.checks||[]){
   const state=Object.hasOwn(statusNames,item.state)?item.state:'pending';
   const row=E('article','admin-prelive-check admin-prelive-'+state);
   const heading=E('div','admin-prelive-check-title');
   heading.append(E('strong','',item.label),E('span','admin-prelive-state',statusNames[state]));
   row.append(heading,E('p','',item.detail));list.append(row);
  }
  section.querySelector('[data-prelive-observed]').textContent='Observed '+new Date(data.observedAt).toLocaleString()+' · Read-only, actual Owner session.';
  section.querySelector('[data-prelive-note]').textContent=data.note||'';
 }
 async function refresh(section){
  if(loading)return;loading=true;
  const state=section.querySelector('[data-prelive-status]'),btn=section.querySelector('[data-prelive-refresh]');
  state.textContent='Checking authorized configuration…';btn.disabled=true;
  try{const data=await read('/api/admin-prelive-v014247');draw(section,data);state.textContent='Configuration check complete. Pending acceptance remains open.';}
  catch(err){state.textContent=err.message||'Unable to load acceptance status.';state.setAttribute('role','alert');}
  finally{loading=false;btn.disabled=false;}
 }
 async function mount(){
  if(mounted||!app()||app().hidden||!gate()?.hidden||!nav())return;
  let context;
  try{context=await read('/api/admin?action=context')}catch{return}
  if(!context.roles?.includes('OWNER')||context.roles.includes('SHOWCASE_VIEWER'))return;
  mounted=true;
  const growthLink=E('a','admin-back','Member Growth Funnel');
  growthLink.href='/owner-growth-funnel.html';
  growthLink.setAttribute('aria-label','Owner verified member growth and Free Foundations funnel');
  nav().append(growthLink);
  const tab=E('button','','Release & QA');tab.type='button';tab.dataset.adminPrelive='true';
  const section=E('section','admin-panel admin-prelive-panel');section.dataset.prelivePanel='true';
  section.innerHTML='<div class="admin-heading"><div><div class="eyebrow">Owner release operations</div><h1>Pre-LIVE Acceptance Center</h1><p>Verified administrative configuration, provider-facing QA evidence and open acceptance gates. No actions here charge customers or enable checkout.</p></div><button class="btn secondary" type="button" data-prelive-refresh>Refresh evidence</button></div><p class="admin-prelive-status" data-prelive-status role="status" aria-live="polite">Read-only checks have not run.</p><div class="admin-prelive-stats" data-prelive-counts></div><h2>Release control gates</h2><div class="admin-prelive-checks" data-prelive-checks></div><p class="admin-muted" data-prelive-observed></p><p class="admin-muted" data-prelive-note></p><a class="btn secondary" href="/admin-advertising.html">Open Advertising QA</a>';
  nav().append(tab);app().append(section);
  tab.addEventListener('click',()=>open(section,tab));
  section.querySelector('[data-prelive-refresh]').addEventListener('click',()=>refresh(section));
 }
 function initialize(){
  const g=gate(),a=app();if(!g||!a)return;
  const observer=new MutationObserver(()=>{if(g.hidden&&a.hidden===false){observer.disconnect();mount()}});
  observer.observe(g,{attributes:true,attributeFilter:['hidden']});
  observer.observe(a,{attributes:true,attributeFilter:['hidden']});
  if(g.hidden&&a.hidden===false){observer.disconnect();mount()}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
 else initialize();
})();
