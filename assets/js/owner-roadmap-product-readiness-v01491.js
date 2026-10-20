/* v0.14.0.91 — Owner-only product readiness dashboard. Planning ranges are estimates,
 * NOT verified delivery scores. Source-only, no subscription writes or new database.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let review=null,catalog=null,counts=null,engineering=null,tracked=new Map();
const stageNames={'content-blocked':'Historical content & rubrics incomplete','integration-pending':'End-to-end QA outstanding','data-blocked':'Historical data / provenance missing','major-build':'First-party AI source built; provider activation and independent QA pending',beta:'Functional beta / validation pending',planned:'Future release'};
function openTask(id){
 if(!/^CORE-[0-9]{4}$/.test(id))return;
 if(typeof window.GroundUpOwnerRoadmap?.openTask==='function')window.GroundUpOwnerRoadmap.openTask(id);
 else location.hash='task-'+id;
}
const badge=(stage)=>stageNames[stage]||'Review pending';
const stageLabels={not_started:'Not reviewed',in_progress:'In progress',implemented:'Source implemented — QA pending',
 blocked:'Blocked',deferred:'Deferred',owner_complete:'Scoped completed decision',verified:'Evidence verified'};
function ownerTracking(id){
 const row=tracked.get(id);
 if(!row)return '<p class="or-muted">No matching original checklist record.</p>';
 const status=stageLabels[row.status]||row.status;
 const origin=row.origin==='owner'?'Owner saved':row.origin==='delegated'?'Delegated technical review':'No recorded approval';
 return '<p class="or-task-tracking"><strong>Linked checklist:</strong> '+esc(status)+
  ' · '+esc(origin)+' · engineering '+esc(row.reviewStage||'not reviewed')+'.</p>';
}

function summary(){
 if(!review)return;
 const warnings=[];
 if(counts){
  for(const [label,actual,expected] of [
   ['primary checklist',counts.core,review.sourceChecks.expectedCore],
   ['archived source lines',counts.trace,review.sourceChecks.expectedTrace],
   ['total preserved requirements',counts.total,review.sourceChecks.expectedTotal]
  ])if(actual!==expected)warnings.push(label+': loaded '+actual+', expected '+expected);
 }
 const node=$('or-prod-contract');
 if(node)node.innerHTML=warnings.length
   ?'<div class="or-catalog-warning"><strong>Registry version mismatch:</strong> '+esc(warnings.join(' · '))+'. Refresh and verify the Cloudflare deployment version. Do not alter saved Owner statuses to force these counts.</div>'
   :'<div class="or-product-summary">Registry integrity: '+(counts?esc(String(counts.core)+' core tasks + '+String(counts.trace)+' source trace lines = '+String(counts.total)+' preserved records'):'waiting for existing requirement register')+'. Historical rows are separate from status categories. Owner-added tasks are counted separately in the main checklist. No Owner records were auto-approved.</div>';
}
function card(t,market){
 const db=market?.get(t.code);
 const catalogAvailable=!!catalog?.available;
 const availability=!catalogAvailable?'Live catalog unavailable — not verified':!db?'Not present in current database response':(db.status==='live'?'Catalog: LIVE flag (not end-to-end certified)':'Catalog: '+db.status);
 const normal=t.range.join('–')+'%';
 return '<article class="or-product-card or-readiness-card" data-product-stage="'+esc(t.stage)+'">'+
 '<header><span class="or-tag">'+esc(t.code)+'</span><span class="or-product-stage">'+esc(badge(t.stage))+'</span></header>'+
 '<h3>'+esc(t.name)+'</h3><p class="or-readiness-percent">'+esc(normal)+' <small>planning estimate</small></p>'+
 '<div class="or-readiness-meter" aria-label="Planning estimate '+esc(normal)+'"><span style="width:'+Number(t.range[1])+'%"></span></div>'+
 '<p><strong>Registry:</strong> '+esc(availability)+'</p>'+
 '<p><strong>Next acceptance:</strong> '+esc(t.gate)+'</p>'+ownerTracking(t.roadmapId)+
 '<div class="or-card-actions"><button type="button" class="or-button or-secondary" data-readiness-task="'+esc(t.roadmapId)+'">Open '+esc(t.roadmapId)+'</button></div></article>';
}
function supporting(t){
 return '<article class="or-product-card or-capability"><header><span class="or-tag">'+esc(t.code)+'</span><span class="or-product-stage">Supporting system · not a separate Stripe SKU</span></header>'+
 '<h3>'+esc(t.name)+'</h3><p class="or-readiness-percent">'+esc(t.range.join('–'))+'% <small>planning estimate</small></p>'+
 '<p>'+esc(t.gate)+'</p><div class="or-card-actions"><button type="button" class="or-button or-secondary" data-readiness-task="'+esc(t.roadmapId)+'">Open '+esc(t.roadmapId)+'</button></div></article>';
}
function renderProducts(){
 if(!review)return;
 summary();
 const tools=review.toolDefinitions||[],market=new Map((catalog?.tools||[]).map(t=>[t.tool_code,t]));
 const keyword=String($('or-readiness-search')?.value||'').trim().toLowerCase();
 const phase=String($('or-readiness-stage')?.value||'');
 const rows=tools.filter(t=>(!phase||t.stage===phase)&&(!keyword||[t.code,t.name,t.stage,t.gate].join(' ').toLowerCase().includes(keyword)));
 if($('or-readiness-summary'))$('or-readiness-summary').textContent=
  tools.length+' source-registered tool definitions: 4 principal $29.99/month SKUs and 17 specialist beta/planned modules. '+
  (catalog?.available?catalog.tools.length+' records returned by the existing Supabase catalog.':'Live Supabase product records not verified.')+
  ' Estimates do NOT mean released functionality.';
 if($('or-readiness-tools'))$('or-readiness-tools').innerHTML=rows.length?rows.map(t=>card(t,market)).join(''):'<p class="or-muted">No matching development records.</p>';
 if($('or-readiness-support'))$('or-readiness-support').innerHTML=(review.supportingSystems||[]).map(supporting).join('');
 if($('or-readiness-work')){
  $('or-readiness-work').innerHTML=(review.nextWork||[]).map(x=>
   '<article class="or-readiness-work"><span class="or-tag">'+esc(x.priority)+'</span><div><strong>'+esc(x.title)+'</strong><p>'+esc(x.exitCriterion)+'</p>'+ownerTracking(x.roadmapId)+'</div><button type="button" class="or-button or-secondary" data-readiness-task="'+esc(x.roadmapId)+'">'+esc(x.roadmapId)+'</button></article>').join('');
 }
}
function renderAudit(){
 if(!review)return;
 const n=$('or-audit-counters');
 if(n){
  const original=counts||{core:0,trace:0,total:0};
  const ledger=engineering?.counts||{};
  const statuses=Object.entries(ledger).map(([stage,val])=>esc(stage.replaceAll('_',' '))+': '+Number(val)).join(' · ');
  n.innerHTML='<p><strong>Authoritative loaded register:</strong> '+original.core+' primary commitments; '+original.trace+' historical source requirements; '+original.total+' total. All historical lines are references, not extra blockers.</p>'+
   '<p><strong>Engineering review snapshot:</strong> '+statuses+'. These labels are separate from Owner-saved checkboxes.</p>'+
   '<p><strong>Current source assessment:</strong> '+esc(engineering?.asOf||'not available')+' · baseline '+esc((engineering?.baseline||'unknown').slice(0,12))+
   '. Check the deployed Cloudflare manifest and current GitHub SHA separately; a recent commit does not prove production deployment.</p>';
 }
 const plans=$('or-readiness-plans');
 if(plans)plans.innerHTML=(review.memberships||[]).map(p=>
   '<tr><th scope="row">'+esc(p.name)+'</th><td>'+esc(p.scope)+'</td><td>'+
   (catalog?.available?(catalog.plans.some(x=>x.plan_code===p.code)?'Database catalog record returned; checkout requires separate verification':'Not returned in database catalog'):'Current catalog unavailable')+
   '</td></tr>').join('');
}
let labAudit=null,labLoading=false,labPage=0;
const labStages={DISABLED:'Disabled',MISSING_PRIVATE_LESSON:'Missing private instruction',
 MISSING_REVIEWED_GRADING:'Missing independently reviewed grading',
 MISSING_LICENSED_HISTORICAL_CONTEXT:'Missing licensed, verified historical evidence',
 CONTENT_PRECHECK_ONLY_QA_REQUIRED:'Content present · full Lab acceptance still pending'};
function showLabRows(){
 if(!labAudit?.available)return;
 const term=String($('or-audit-lab-search')?.value||'').trim().toLowerCase(),stage=$('or-audit-lab-stage')?.value||'';
 const filtered=labAudit.rows.filter(x=>(!stage||stage===x.stage)&&(!term||[x.id,x.title,x.ticker,x.historicalDate].join(' ').toLowerCase().includes(term)));
 const size=40,totalPages=Math.max(1,Math.ceil(filtered.length/size));
 labPage=Math.max(0,Math.min(labPage,totalPages-1));
 const chunk=filtered.slice(labPage*size,(labPage+1)*size);
 $('or-audit-lab-rows').innerHTML=chunk.length?chunk.map(x=>'<tr><th scope="row">'+esc(x.id)+'</th><td>'+esc(x.title)+'</td><td>'+esc(labStages[x.stage]||x.stage)+'</td><td>'+
  (x.instructionRecordPresent?'Record':'Missing')+' / '+(x.reviewedRubricPresent?'Reviewed':'Missing')+' / '+(x.verifiedLicensedContextPresent?'Evidence recorded':'Missing')+'</td></tr>').join(''):
  '<tr><td colspan="4">No matching Lab records. Adjust filters or refresh the private database audit.</td></tr>';
 $('or-audit-lab-page-label').textContent=filtered.length+' matching records · Page '+(labPage+1)+' of '+totalPages;
 $('or-audit-lab-prev').disabled=labPage===0;$('or-audit-lab-next').disabled=labPage>=totalPages-1;
}
function csvExport(){
 if(!labAudit?.available)return;
 const quote=x=>{let y=String(x??'');if(/^[=+@-]/.test(y.trimStart()))y="'"+y;return '"'+y.replace(/"/g,'""')+'"'};
 const keys=['id','title','ticker','historicalDate','stage','instructionRecordPresent','reviewedRubricPresent','verifiedLicensedContextPresent','certifiedComplete'];
 const rows=labAudit.rows.map(x=>keys.map(k=>quote(x[k])).join(','));
 const blob=new Blob([keys.join(',')+'\r\n'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='owner-lab-readiness-'+new Date().toISOString().slice(0,10)+'.csv';
 document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function loadLabAudit(force=false){
 if(labLoading||labAudit?.available&&!force)return;
 labLoading=true;const button=$('or-audit-lab-load');if(button)button.disabled=true;
 $('or-audit-lab-summary').textContent='Checking the private 419-Lab evidence against the existing Supabase project…';
 try{
  const client=await window.getSupabaseClient(),session=(await client.auth.getSession()).data?.session;
  if(!session?.access_token)throw Error('Sign in with an Owner account to request Lab evidence.');
  const r=await fetch('/api/owner-roadmap?action=lab-audit',{method:'GET',cache:'no-store',
    headers:{authorization:'Bearer '+session.access_token,accept:'application/json'}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok||!data?.ok)throw Error('Unable to verify private Lab evidence. Confirm Owner rights and Supabase tables.');
  labAudit=data.labAudit;
  if(!labAudit?.available)throw Error(labAudit?.error||'Lab audit unavailable.');
  const text=Object.entries(labAudit.counts||{}).map(([stage,count])=>count+' '+(labStages[stage]||stage)).join(' · ');
  const d=labAudit.breakdown||{};
  const breakdown='Author-created draft rubrics: '+(d.originalDraftRubrics??'unverified')+
   ' · Existing detailed narratives: '+(d.existingDetailedNarratives??'unverified')+
   ' · Private instructional records: '+(d.privateInstructions??'unverified')+
   ' · Original fictional replay datasets: '+(d.originalSimulationReady??'unverified')+
   ' · Reviewed rubrics: '+(d.reviewedRubrics??'unverified')+
   ' · Independently verified historical contexts: '+(d.independentlyVerifiedHistoricalContext??'unverified');
  $('or-audit-lab-summary').textContent=labAudit.registryCount+' Lab IDs (target 419). '+breakdown+
   '. Individually certified production-ready: '+labAudit.certifiedComplete+'. '+text+
   '. A fictional simulation is never counted as verified historical evidence.';
  $('or-audit-lab-export').disabled=false;labPage=0;showLabRows();
 }catch(e){
  labAudit=null;$('or-audit-lab-export').disabled=true;
  $('or-audit-lab-summary').textContent=e?.message||'Lab evidence unavailable; no completion count is certified.';
  $('or-audit-lab-rows').innerHTML='<tr><td colspan="4">No database Lab readiness details could be verified. Existing Owner task progress was not changed.</td></tr>';
  $('or-audit-lab-page-label').textContent='';
 }finally{labLoading=false;if(button)button.disabled=false}
}

async function loadOwnerSiteAcceptance(){
 const btn=$('or-live-acceptance-load'),state=$('or-live-acceptance-state'),host=$('or-live-acceptance-results');
 if(!btn||!state||!host)return;
 btn.disabled=true;host.replaceChildren();state.textContent='Checking existing production database objects with Owner access…';
 try{
  const client=await window.getSupabaseClient();
  const session=(await client.auth.getSession()).data?.session;
  if(!session?.access_token)throw Error('Owner session required.');
  const r=await fetch('/api/owner-roadmap?action=platform-acceptance-v014108',{
   headers:{authorization:'Bearer '+session.access_token},cache:'no-store'});
  const data=await r.json().catch(()=>null);
  if(!r.ok||data?.ok!==true||!data.acceptance)throw Error('Owner production inspection unavailable.');
  const a=data.acceptance,table=document.createElement('table'),tbody=document.createElement('tbody');
  for(const item of a.checks||[]){
   const tr=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td');
   th.scope='row';th.textContent=item.code.replaceAll('_',' ');
   td.textContent=item.state==='readable'?'Owner-only aggregate count: '+item.rowCount:'NOT VERIFIED (missing or inaccessible)';
   tr.append(th,td);tbody.append(tr);
  }
  table.append(tbody);const wrap=document.createElement('div');wrap.className='or-table-scroll';wrap.append(table);
  const note=document.createElement('p');note.className='or-muted';note.textContent=a.explanation;
  host.append(wrap,note);
  state.textContent=a.verified?
   'Owner-read database objects respond. Production workflows, member permissions, paid inference and pedagogy remain UNVERIFIED.':
   'At least one required Owner-read database object could not be verified. Do not treat missing rows or an inaccessible table as a passing test.';
 }catch(e){state.textContent=e.message||'Private schema verification failed.';}
 finally{btn.disabled=false}
}
async function loadAiOwnerAudit(){
 const button=$('or-ai-service-audit-load'),message=$('or-ai-service-audit-status'),host=$('or-ai-service-audit-data');
 if(!message||!host)return;
 if(button)button.disabled=true;
 message.textContent='Checking private first-party AI reservations against the authenticated Owner session…';
 host.replaceChildren();
 try{
  const client=await window.getSupabaseClient(),session=(await client.auth.getSession()).data?.session;
  if(!session?.access_token)throw Error('Owner sign-in required.');
  const response=await fetch('/api/owner-roadmap?action=ai-service-audit',{
   method:'GET',cache:'no-store',headers:{authorization:'Bearer '+session.access_token,accept:'application/json'}});
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.ok)throw Error('Owner AI service inspection is unavailable.');
  const x=data.aiServiceAudit;
  if(!x?.available){
   message.textContent=x?.notice||'Private paid AI request ledger not verified.';
   return;
  }
  message.textContent=x.inferenceConfigured?
   'Private request meter responds. Provider invoice, funded inference and learning quality remain separately unverified.':
   'Private request meter exists; provider inference is NOT active.';
  const rows=[
   ['Server AI configuration',x.inferenceConfigured?'Enabled for metered requests':'Disabled or incomplete'],
   ['Provider configuration present',x.modelProviderConfigured?'Yes; not separately validated':'No'],
   ['Provider requests reserved today (UTC)',x.reservedToday],
   ['Provider requests reserved this UTC month',x.reservedMonth],
   ['Per-member daily request limit',x.memberDailyLimit??'Not configured'],
   ['Global daily request limit',x.globalDailyLimit??'Not configured'],
   ['Global monthly request limit',x.globalMonthlyLimit??'Not configured'],
   ['Site-wide daily request headroom',x.dailyHeadroom??'Not configured'],
   ['Site-wide monthly request headroom',x.monthlyHeadroom??'Not configured'],
   ['Provider dollar spend and invoice reconciled','No — verify independently']
  ];
  const table=document.createElement('table');table.className='or-membership-table';
  const tbody=document.createElement('tbody');
  for(const [name,value] of rows){
   const tr=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td');
   th.scope='row';th.textContent=name;td.textContent=String(value);tr.append(th,td);tbody.append(tr);
  }
  table.append(tbody);
  const scroll=document.createElement('div');scroll.className='or-table-scroll';scroll.append(table);
  const note=document.createElement('p');note.className='or-muted';note.textContent=x.notice||'Reservation count is not a bill.';
  host.append(scroll,note);
 }catch(e){message.textContent=e?.message||'Owner AI audit unavailable; no usage figures certified.';}
 finally{if(button)button.disabled=false}
}
function renderCrossSiteGates(){
 const host=$('or-crosssite-acceptance-table'),note=$('or-crosssite-acceptance-note');
 if(!host)return;host.replaceChildren();
 const gates=Array.isArray(review?.acceptanceGates)?review.acceptanceGates:[];
 if(!gates.length){if(note)note.textContent='Release gate inventory unavailable. No status has been inferred.';return}
 const labels={
  source_implemented:'Source implemented; production acceptance pending',
  owner_reported_sql:'Owner reported SQL success; runtime verification pending',
  needs_installation:'Owner-only additive SQL not yet reported installed',
  blocked_external:'External data, billing, licensing or operational acceptance missing',
  needs_live_qa:'Live and authenticated acceptance pending',
  editorial_review:'Individual curriculum/editorial acceptance pending'
 };
 const table=document.createElement('table');table.className='or-membership-table';
 const header=document.createElement('thead'),tr=document.createElement('tr');
 for(const x of ['Offering / responsibility','Evidence status','Release-blocking verification']){
  const th=document.createElement('th');th.scope='col';th.textContent=x;tr.append(th)
 }header.append(tr);table.append(header);
 const tbody=document.createElement('tbody');
 for(const row of gates){
  const tr=document.createElement('tr');
  for(const value of [row.title,labels[row.state]||'Unverified',row.gate]){
   const cell=document.createElement('td');cell.textContent=String(value);tr.append(cell);
  }tbody.append(tr);
 }table.append(tbody);
 const scroll=document.createElement('div');scroll.className='or-table-scroll';scroll.append(table);
 host.append(scroll);
 if(note)note.textContent=gates.length+' product/platform release gates listed. Owner-reported SQL success is NOT live paid-provider, payment, accessibility, forum or Lab content acceptance.';
}
function render(data){
 review=data?.productReadiness||null;
 catalog=data?.productInventory||null;
 engineering=data?.engineeringReview||null;
 tracked=new Map((data.items||[]).filter(x=>x.scope==='core').map(item=>{
  const p=data.progress?.[item.id],d=data.delegatedBaseline?.[item.id];
  return [item.id,{status:p?.status||d?.status||'not_started',
   origin:p?'owner':d?'delegated':'unreviewed',
   reviewStage:item.engineeringReview?.stage||'needs_review'}];
 }));
 counts={core:(data.items||[]).filter(x=>x.scope==='core').length,
  trace:(data.items||[]).filter(x=>x.scope==='trace').length,
  total:(data.items||[]).length};
 if(!review)return;
 renderProducts();renderAudit();renderCrossSiteGates();
}
function bind(){
 $('or-readiness-search')?.addEventListener('input',renderProducts);
 $('or-readiness-stage')?.addEventListener('change',renderProducts);
 $('or-audit-lab-load')?.addEventListener('click',()=>loadLabAudit(true));
 $('or-ai-service-audit-load')?.addEventListener('click',loadAiOwnerAudit);
 $('or-live-acceptance-load')?.addEventListener('click',loadOwnerSiteAcceptance);
 $('or-audit-lab-export')?.addEventListener('click',csvExport);
 $('or-audit-lab-search')?.addEventListener('input',()=>{labPage=0;showLabRows()});
 $('or-audit-lab-stage')?.addEventListener('change',()=>{labPage=0;showLabRows()});
 $('or-audit-lab-prev')?.addEventListener('click',()=>{labPage--;showLabRows()});
 $('or-audit-lab-next')?.addEventListener('click',()=>{labPage++;showLabRows()});
 for(const id of ['or-catalog-product-readiness','or-catalog-audit']){
  $(id)?.addEventListener('click',e=>{const button=e.target.closest('button[data-readiness-task]');if(button)openTask(button.dataset.readinessTask)});
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
window.OwnerProductReadinessV91={render,loadLabAudit,isCatalog:s=>s==='product-readiness'||s==='verification-audit'};
})();
