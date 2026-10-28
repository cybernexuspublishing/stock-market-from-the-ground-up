/* Owner Roadmap v0.14.0.91. Browser-only renderer; all data/mutations require
 * Cloudflare server verification of OWNER, account status, and real session.
 * Never store signed-in auth tokens or project status in localStorage. */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const choices=[["not_started","Not started / not reviewed"],["research_required","Research required"],["research_complete","Research verified · implementation not implied"],["planned","Planned / approved scope"],["in_progress","In development"],["partially_complete","Partially complete"],["implemented","Implemented · verification pending"],["testing_required","Testing required"],["blocked","Blocked — dependency"],["owner_review_required","Owner review required"],["deferred","Deferred / future release"],["owner_complete","Owner marked complete · not independently verified"],["verified","Evidence verified"]];
const complete=new Set(['owner_complete','verified']);
const nearCritical=new Set(['CORE-0030','CORE-0042','CORE-0054','CORE-0072','CORE-0074','CORE-0077','CORE-0078','CORE-0079','CORE-0080','CORE-0081','CORE-0082','CORE-0141','CORE-0142','CORE-0147','CORE-0166','EXEC-66','EXEC-67','EXEC-70','EXEC-77']);
let releasePlan=null;
let all=[],stored={},delegated={},delegation={},metadata={},engineering={},scope='core',page=0,size=30,loaded=false,token='',busy=new Set();
const sortedModes=new Set(['priority','original','area','status','updated']);
function message(text,error=false){const box=$('#or-access');box.hidden=false;box.textContent=text;box.classList.toggle('or-error',error)}
async function client(){if(typeof window.getSupabaseClient!=='function')throw Error('Authentication client is unavailable.');return await window.getSupabaseClient()}
async function bearer(){
 const sb=await client(),r=await sb.auth.getSession();
 const ses=r?.data?.session;if(!ses?.access_token)throw Error('SIGN_IN');
 token=ses.access_token;return ses;
}
async function api(method='GET',body=null){
 await bearer();
 const init={method,headers:{authorization:'Bearer '+token,'accept':'application/json'},cache:'no-store',credentials:'same-origin'};
 if(body!==null){init.headers['content-type']='application/json';init.body=JSON.stringify(body)}
 let r;
 try{r=await fetch('/api/owner-roadmap',init)}catch{throw Error('Cannot connect to Owner roadmap service.')}
 let j={};try{j=await r.json()}catch{}
 if(!r.ok){
   if(r.status===401||r.status===403){document.querySelector('#or-app').hidden=true;location.replace(r.status===401?'/signin.html?next=%2Fowner-roadmap.html':'/dashboard.html?error=owner_roadmap_access_denied');throw Error('AUTH_REDIRECT')}
   throw Error(j.error||'Unable to update website progress.');
 }
 if(!j.ok)throw Error(j.error||'Roadmap request failed.');
 return j;
}
function hasStoredState(item){return Object.prototype.hasOwnProperty.call(stored,item.id)}
function state(item){return hasStoredState(item)?stored[item.id]:(delegated[item.id]||{status:'not_started',note:''})}
function isDelegated(item){return !hasStoredState(item)&&Boolean(delegated[item.id])}
function evidenceOf(item){return item.engineeringReview||null}
function reviewStage(item){return evidenceOf(item)?.stage||'needs_review'}
function statusOf(item){return state(item).status||'not_started'}
function isReference(item){return item.kind==='reference'}
function visible(){return all.filter(item=>scope==='reference'?isReference(item):item.scope===scope&&!isReference(item))}
function filtered(){
 const query=$('#or-search').value.trim().toLowerCase();
 const area=$('#or-area').value,st=$('#or-status').value,assessment=$('#or-review').value,origin=$('#or-origin').value;
 return visible().filter(item=>{
  if(area&&item.area!==area)return false;
  if(st&&statusOf(item)!==st)return false;
  if(assessment&&reviewStage(item)!==assessment)return false;
  if(origin==='owner'&&!hasStoredState(item))return false;
  if(origin==='delegated'&&!isDelegated(item))return false;
  if(origin==='unreviewed'&&(hasStoredState(item)||isDelegated(item)))return false;
  if(!query)return true;
  const p=state(item);
  return [item.id,item.title,item.area,item.section,item.detail,item.evidence,item.nextCheck,item.source,p.note,evidenceOf(item)?.summary,reviewStage(item)].some(s=>String(s||'').toLowerCase().includes(query));
 });
}
function metrics(){
 const tasks=all.filter(x=>x.scope==='core'&&!isReference(x));
 const count=stage=>tasks.filter(x=>statusOf(x)===stage).length;
 const approved=tasks.filter(x=>complete.has(statusOf(x))).length;
 const ownerApproved=tasks.filter(x=>hasStoredState(x)&&complete.has(statusOf(x))).length;
 const delegatedApproved=approved-ownerApproved;
 const traced=all.filter(x=>x.scope==='trace'&&!isReference(x)).length;
 const sourceCount=tasks.filter(x=>!hasStoredState(x)&&isDelegated(x)).length;
 const stats=[
  [count('verified')+' / '+tasks.length,'Evidence-verified primary requirements; not a launch-wide certification'],
  [count('owner_complete'),'Owner-marked complete; separate from independent verification'],
  [count('implemented'),'Implemented in source; production acceptance pending'],
  [String(count('in_progress')+count('partially_complete')+count('testing_required')),'Development, partial work or tests outstanding'],
  [String(count('research_required')+count('owner_review_required')+count('blocked')),'Research, Owner decision or blocking dependency'],
  [String(count('planned')+count('research_complete')+count('deferred')+count('not_started')),'Planned, verified research, deferred or not yet reviewed'],
  [String(traced),'Preserved source-reference lines; not standalone task completions']
 ];
 $('#or-metrics').innerHTML=stats.map(([number,label])=>
   '<article class="or-stat"><strong>'+esc(number)+'</strong><span>'+esc(label)+'</span></article>').join('')+
  '<p class="or-metric-explainer"><strong>How these numbers work:</strong> Counts follow authenticated Owner decisions and dated, evidence-scoped engineering reviews—not the number of GitHub commits or pages edited. '+esc(sourceCount)+' tasks currently inherit a delegated assessment. “Blocked” describes only primary tasks; '+esc(traced)+' historical source lines are retained for traceability and are not assumed undone. Last separately reviewed source milestone: October 19, 2026. Cloudflare may show older figures until the latest repository build is deployed.</p>';
}

function renderReviewBoard(){
 const base=all.filter(x=>x.scope==='core'&&!isReference(x));
 const groups=[['deployed_verified','Verified delivered controls'],['source_implemented','Implementation present; acceptance pending'],['in_progress','Currently being worked on'],['blocked','Blocked / missing external evidence'],['backlog','Recorded backlog'],['needs_review','Individual review pending']];
 const summary=groups.map(([stage,label])=>{const n=base.filter(x=>reviewStage(x)===stage).length;return '<button class="or-review-metric" type="button" data-review-stage="'+esc(stage)+'" aria-label="Filter engineering review: '+esc(label)+'"><strong>'+n+'</strong><span>'+esc(label)+'</span></button>'}).join('');
 const checked=base.filter(x=>complete.has(statusOf(x))).length;
 const delegatedCount=base.filter(x=>isDelegated(x)&&complete.has(statusOf(x))).length;
 const archived=all.filter(x=>x.scope==='trace').length;
 const context='<p class="or-muted">Assessment snapshot: '+esc(engineering.asOf||'date unknown')+' · Repository baseline '+esc((engineering.baseline||'').slice(0,12))+' · <strong>'+checked+' accepted delivered controls ('+delegatedCount+' delegated source approvals, '+(checked-delegatedCount)+' saved Owner confirmations)</strong>. '+archived+' archived source lines are not independently classified. Tap a card to filter.</p>';
 $('#or-review-board').innerHTML='<h2>Engineering review — delivered controls, active work, blockers and backlog</h2>'+context+'<div class="or-review-grid">'+summary+'</div><p class="or-review-disclaimer">Source present is not equivalent to live payment, correct access, working editor, accepted teaching content, or an Owner-approved production release. This assessment does not change your saved checkboxes or statuses.</p>';
 $('#or-review-board').hidden=false;
}
function priority(item){
 const area=(item.area||'').toLowerCase();
 let level=4;
 if(nearCritical.has(item.id))level=0;
 else if(/stripe|payment|security|identity|membership|database|release/.test(area))level=1;
 else if(/publishing|books|admin|learning|commons/.test(area))level=2;
 else if(item.scope==='trace')level=5;
 if(reviewStage(item)==='blocked')level+=.3;
 if(reviewStage(item)==='backlog')level+=2;
 return level;
}
function sorted(items){
 const selected=$('#or-sort')?.value||'priority';
 if(!sortedModes.has(selected)||selected==='original')return items;
 return [...items].sort((a,b)=>{
  if(selected==='priority')return priority(a)-priority(b)||a.id.localeCompare(b.id);
  if(selected==='area')return (a.area||'').localeCompare(b.area||'')||a.id.localeCompare(b.id);
  if(selected==='status')return statusOf(a).localeCompare(statusOf(b))||a.id.localeCompare(b.id);
  if(selected==='updated')return (Date.parse(state(b).updatedAt||0)||0)-(Date.parse(state(a).updatedAt||0)||0)||a.id.localeCompare(b.id);
  return 0;
 });
}
function actionBoard(){
 if(!loaded)return;
 const core=all.filter(x=>x.scope==='core'&&!isReference(x));
 const steps=[
  {key:'in_progress',label:'CURRENT WORK',hint:'Active implementation and integration'},
  {key:'source_implemented',label:'READY FOR ACCEPTANCE',hint:'Source exists; independently verify the behavior'},
  {key:'blocked',label:'RELEASE BLOCKERS',hint:'Provider, database, rights, security or Owner-dependent'},
  {key:'backlog',label:'NEXT / FUTURE',hint:'Approved scope not yet active'}
 ];
 const groups=steps.map(step=>{
  const rows=sorted(core.filter(item=>reviewStage(item)===step.key));
  const top=rows.slice(0,5).map(item=>{
   const why=evidenceOf(item)?.summary||item.nextCheck||item.detail||'Acceptance is outstanding.';
   return '<li><button type="button" class="or-queue-link" data-open-task="'+esc(item.id)+'"><strong>'+esc(item.id)+'</strong><span>'+esc(item.title)+'</span></button><small>'+esc(String(why).slice(0,195))+'</small></li>';
  }).join('');
  return '<article class="or-queue-lane"><header><span>'+step.label+'</span><strong>'+rows.length+'</strong></header><p>'+esc(step.hint)+'</p><ol>'+top+'</ol><button type="button" class="or-queue-more" data-stage="'+step.key+'">Show '+rows.length+' assessed tasks</button></article>';
 });
 $('#or-action-grid').innerHTML=groups.join('');
 $('#or-action-board').hidden=false;
}

function renderReleasePlan(){
 const mount=$('#or-release-packages');
 if(!mount)return;
 const list=Array.isArray(releasePlan?.packages)?releasePlan.packages:[];
 mount.replaceChildren();
 if(list.length!==8){mount.textContent='The deployment plan is unavailable. No release status has been inferred.';return;}
 const grid=document.createElement('div');grid.className='or-release-grid';
 for(const item of list){
  const card=document.createElement('article');card.className='or-release-card';
  const no=document.createElement('span');no.className='or-release-number';no.textContent='Deployment '+item.number+' of 08';
  const heading=document.createElement('h3');heading.textContent=item.title;
  const state=document.createElement('span');state.className='or-release-pending';state.textContent=(item.sourceDelivery==='merged'?'Source merged in GitHub':item.sourceDelivery==='source_implemented'?'Source implemented · QA ongoing':'Not started')+' · production '+(item.productionAcceptance||'unverified');
  const body=document.createElement('p');body.textContent=item.scope;
  const link=document.createElement('a');link.href='#task-'+encodeURIComponent(item.roadmapId);link.textContent='Open related roadmap requirement →';
  link.addEventListener('click',e=>{e.preventDefault();openTask(item.roadmapId)});
  card.append(no,heading,state,body,link);grid.append(card);
 }
 const note=document.createElement('p');note.className='or-muted';
 note.textContent='Release packages are planning scope, not new products or automatic completion approvals. Individual source tasks, authenticated Owner decisions and verified acceptance remain authoritative. The displayed package status does not imply a production deployment.';
 mount.append(grid,note);
}

function renderCurrentAudit(audit){
 const host=$('#or-current-audit');if(!host)return;
 if(!audit||!Array.isArray(audit.items)){host.textContent='Current integration audit is unavailable; saved Owner roadmap tasks remain unchanged.';return;}
 const stamp=String(audit.date||'');
 host.innerHTML='<p class="or-muted"><strong>Evidence date:</strong> '+esc(stamp)+
  '. '+esc(audit.scope||'')+'</p>'+
  '<p>'+esc(audit.ownerProgressRule||'')+'</p>'+
  '<div class="or-phase-grid">'+audit.items.map(item=>'<article class="or-phase-card">'+
   '<strong>'+esc(String(item.status||'unreviewed').replace(/_/g,' '))+'</strong>'+
   '<h3>'+esc(item.id)+' · '+esc(item.title)+'</h3>'+
   '<p><strong>Area:</strong> '+esc(item.area)+'</p>'+
   '<p>'+esc(item.evidence)+'</p>'+
   '<p><strong>Next acceptance:</strong> '+esc(item.nextCheck)+'</p></article>').join('')+'</div>';
}
function renderPrivateBrief(brief){
 const mount=$('#or-private-brief'),policy=$('#or-private-governance');
 if(!mount||!policy)return;
 const b=brief||{};
 const phases=Array.isArray(b.phases)?b.phases:[],priorities=Array.isArray(b.priorities)?b.priorities:[];
 mount.innerHTML='<p><strong>Deployed release:</strong> <code id="or-deploy-version">Checking…</code><span id="or-deploy-sha"></span>. '+esc(b.intro||'Private Owner evidence is currently unavailable.')+'</p>'+
 '<div class="or-phase-grid">'+phases.map(p=>'<article class="or-phase-card"><strong>'+esc(p.status||'Recorded work')+'</strong><h3>'+esc(p.title||'Task')+'</h3><p>'+esc(p.text||'')+'</p></article>').join('')+'</div>'+
 '<details class="or-priority-details"><summary>Coordinated priorities and dependencies</summary><ol>'+priorities.map(p=>'<li><strong>'+esc(p.title||'Requirement')+':</strong> '+esc(p.description||'')+'</li>').join('')+'</ol></details>'+
 '<p class="or-muted">'+esc(b.scopeNote||'Authenticated Owner access is required.')+'</p>';
 policy.innerHTML='<p><strong>Owner decisions:</strong> Delegated source assessment is separate from authenticated Owner progress. Previously saved Owner decisions are preserved. A source checkbox never enables payments, grants access, or certifies live compliance.</p>'+
 '<p><strong>Concurrent edits:</strong> Roadmap updates carry a revision; another Owner\'s newer decision blocks stale writes and requires a refresh. The Evidence verified status requires documented acceptance.</p>'+
 '<p><strong>Audit:</strong> '+esc(b.auditStatus||'Check administrative audit logs before release.')+'</p>'+
 '<p><strong>Scope:</strong> '+esc(metadata.originalCount??2096)+' original records + '+esc(metadata.supplementalAdded??0)+' reviewed recent entries = '+esc(metadata.totalCount??all.length)+' task and reference records, including '+esc(all.filter(x=>x.scope==='core').length)+' primary commitments. Archived source requirements remain preserved.</p>';
}
async function deployedVersion(){
 const v=$('#or-deploy-version'),sha=$('#or-deploy-sha');
 if(!v)return;
 try{
  const response=await fetch('/release-manifest.json?owner-roadmap='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw new Error('Manifest unavailable');
  const data=await response.json();
  const version=String(data.version||''),commit=String(data.gitCommit||'');
  if(!/^0[.]14[.]0[.][0-9]+$/.test(version)||!/^[a-f0-9]{40}$/i.test(commit))throw new Error('Deployment SHA is not verified');
  v.textContent='v'+version;
  sha.textContent=' · deployment '+commit.slice(0,12)+' (release manifest only; not payment acceptance)';
 }catch{
  v.textContent='Cloudflare deployment evidence unavailable';
  if(sha)sha.textContent=' — do not assume release parity.';
 }
}
function openTask(id){
 const item=find(id);if(!item)return;
 const targetScope=isReference(item)?'reference':item.scope==='trace'?'trace':'core';
 selectTab(targetScope);
 $('#or-review').value='';
 $('#or-origin').value='';
 $('#or-area').value='';
 $('#or-status').value='';
 $('#or-search').value=item.id;
 page=0;render();
 $('#or-results').scrollIntoView({block:'start',behavior:'auto'});
 const details=$('#or-list details');
 if(details)details.open=true;
}
function clearFilters(){
 for(const id of ['#or-search','#or-area','#or-status','#or-review','#or-origin'])$(id).value='';
 $('#or-sort').value='priority';page=0;render();
}
function areas(){
 const values=[...new Set(visible().map(x=>x.area))].sort((a,b)=>a.localeCompare(b));
 const element=$('#or-area'),current=element.value;
 element.innerHTML='<option value="">All areas</option>'+values.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
 if(values.includes(current))element.value=current;
}
function formatDate(d){if(!d)return'No Owner change logged';try{return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(d))}catch{return 'Date unavailable'}}
function row(item){
 const p=state(item),status=statusOf(item),done=complete.has(status),reference=isReference(item),review=evidenceOf(item),delegatedReview=isDelegated(item);
 const reviewLabel=engineering.labels?.[review?.stage]?.label||'Not individually assessed';
 const qid=esc(item.id),title=esc(item.title),source=esc(item.source),area=esc(item.area),section=esc(item.section||'');
 const detail=esc(item.detail||'No additional acceptance notes recorded.');
 const evidence=esc(item.evidence||'Unverified source statement'),next=item.nextCheck?'<p><b>Next acceptance:</b> '+esc(item.nextCheck)+'</p>':'';
 if(reference)return '<article class="or-task or-reference" data-id="'+qid+'"><div class="or-task-main"><span class="or-id">'+qid+'</span><h3>'+title+'</h3><p class="or-muted">'+area+' · '+section+'</p><cite>'+source+'</cite></div></article>';
 const label='<label class="or-check" title="'+esc(delegatedReview&&done?'Delegated evidence-limited technical approval (not Owner-signed release certification)':'Save an authenticated Owner completion decision')+'"><input aria-label="'+esc(delegatedReview&&done?'Delegated scope approval: ':'Owner completion: ')+title+'" type="checkbox" data-check="'+qid+'" '+(done?'checked ':'')+(busy.has(item.id)?'disabled':'')+'></label>';
 const statusSelect='<label class="or-stage-wrap">Progress status<select class="or-stage" data-status="'+qid+'" aria-label="Progress status for '+title+'" '+(busy.has(item.id)?'disabled':'')+'>'+choices.map(([v,n])=>'<option value="'+v+'" '+(status===v?'selected':'')+'>'+esc(delegatedReview&&v==='owner_complete'?'Delegated approval — limited delivery scope':n)+'</option>').join('')+'</select><span class="or-updated">'+esc(delegatedReview?'Delegated source review · '+(p.reviewedOn||'')+' · not a Supabase audit entry':formatDate(p.updatedAt))+'</span></label>';
 const note='<label class="or-stage-wrap">Owner notes / acceptance evidence<textarea class="or-note" data-note="'+qid+'" maxlength="2400" rows="3" placeholder="Release, tested behavior, independent acceptance evidence, or blocking dependency">'+esc(p.note||'')+'</textarea></label>';
 return '<article class="or-task" data-id="'+qid+'" data-state="'+esc(status)+'">'+label+
 '<div class="or-task-main"><span class="or-id">'+qid+'</span><h3>'+title+'</h3><div class="or-task-meta"><span class="or-tag">'+area+'</span>'+(delegatedReview?'<span class="or-tag or-delegated" title="Project review stored in GitHub, not Supabase">Delegated project review</span>':'<span class="or-tag or-stored">Owner-saved progress</span>')+'<span class="or-review-pill" data-review="'+esc(review?.stage||'needs_review')+'">'+esc(reviewLabel)+'</span>'+(section?'<span class="or-tag">'+section+'</span>':'')+'</div>'+
 '<details><summary>Requirement, engineering evidence and verification details</summary><p>'+detail+'</p><p><b>Delegated approval decision:</b> '+esc(p.approval||'No delegated baseline; existing Owner status applies')+' · '+esc(delegatedReview?'Dated GitHub technical decision; not an Owner-signed database entry.':'Privately saved Owner state overrides the source review.')+'</p><p><b>Engineering review:</b> '+esc(review?.summary||'No individual assessment supplied for this archived or newly added item.')+'</p><p><b>Historical source status (before current review):</b> '+evidence+'</p>'+next+
 '<p><b>Origin:</b> <cite>'+source+'</cite></p>'+note+'<div class="or-task-actions"><button type="button" class="or-button or-secondary" data-save="'+qid+'">Save note &amp; status</button>'+
 (item.id.startsWith('OWN-')?'<button type="button" class="or-button or-secondary" data-archive="'+qid+'">Archive custom task</button>':'')+'</div></details></div>'+statusSelect+'</article>';
}
function render(){
 if(!loaded)return;
 const result=sorted(filtered()),pages=Math.max(1,Math.ceil(result.length/size));page=Math.max(0,Math.min(page,pages-1));
 const first=page*size,slice=result.slice(first,first+size);
 $('#or-list').innerHTML=slice.length?slice.map(row).join(''):'<div class="or-empty">No matching records. Adjust search, filters, or tracking stage.</div>';
 $('#or-results').textContent=String(result.length)+' results · showing '+(result.length?first+1:0)+'–'+Math.min(result.length,first+size);
 $('#or-page-text').textContent='Page '+(page+1)+' of '+pages;
 $('#or-prev').disabled=page<=0;$('#or-next').disabled=page>=pages-1;
 metrics();
 if(engineering.labels)renderReviewBoard();
 actionBoard();
}
async function save(item,status,note,element){
 if(busy.has(item.id))return;
 busy.add(item.id);if(element)element.disabled=true;
 try{
  const changed=await api('POST',{action:'save',id:item.id,status,note,expectedRevision:hasStoredState(item)?(stored[item.id].revision||null):null});
  stored[item.id]=changed.progress;
  render();
  if(!changed.auditLogged)announce('Saved, but the audit logging service did not confirm this action. Review administrative logs.',true);
  else announce('Saved: '+item.id);
 }catch(e){
  if(e.message!=='AUTH_REDIRECT'){
    announce(e.message,true);
    // Preserve an unsaved evidence note on failure (especially HTTP 409).
    // Revert only the controls whose optimistic display may have changed.
    const panel=document.querySelector('.or-task[data-id="'+item.id+'"]');
    if(panel){
      const check=panel.querySelector('input[data-check]');
      const stage=panel.querySelector('select[data-status]');
      if(check)check.checked=complete.has(statusOf(item));
      if(stage)stage.value=statusOf(item);
    }
  }
 }
 finally{busy.delete(item.id);if(element?.isConnected)element.disabled=false}
}
function announce(text,error=false){
 const box=$('#or-evidence');box.textContent=text;box.classList.toggle('or-error',error);
 window.clearTimeout(announce._timeout);
 announce._timeout=setTimeout(()=>{box.classList.remove('or-error');box.innerHTML='Verified delivered work has delegated approval; source-only implementations still need live acceptance. Existing authenticated Owner decisions take precedence.'},6000);
}
function find(id){return all.find(x=>x.id===id)}
function selectTab(next){
 const product=window.OwnerRoadmapProductsV88?.isCatalog(next)===true||window.OwnerProductReadinessV91?.isCatalog(next)===true;
 if(!product&&!['core','trace','reference'].includes(next))next='core';
 scope=next;page=0;
 document.querySelectorAll('.or-tab-bar button').forEach(b=>{
  const active=b.dataset.scope===next;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1
 });
 const reference=!(window.OwnerRoadmapProductsV88?.isCatalog(next)||window.OwnerProductReadinessV91?.isCatalog(next));
 const workspace=$('#or-requirements-workspace'),creator=$('#or-owner-create');
 if(workspace)workspace.hidden=!reference;
 if(creator)creator.hidden=!reference;
 for(const name of ['tool-inventory','membership-coverage','product-readiness','verification-audit']){
  const panel=$('#or-catalog-'+({ 'tool-inventory':'tools','membership-coverage':'memberships','product-readiness':'product-readiness','verification-audit':'audit'}[name]));
  if(panel)panel.hidden=next!==name;
 }
 if(next==='product-readiness')void window.OwnerProductReadinessV91?.loadLabAudit();
 if(!reference)return;
 $('#or-area').value='';$('#or-status').value='';$('#or-review').value='';$('#or-origin').value='';$('#or-search').value='';
 areas();render();
}
function download(name,data,mime){
 const url=URL.createObjectURL(new Blob([data],{type:mime}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportData(format){
 const rows=all.map(x=>({...x,progress:state(x),statusOrigin:isDelegated(x)?'delegated_GitHub_review':hasStoredState(x)?'owner_Supabase':'unreviewed'}));
 const filename='owner-website-roadmap-'+new Date().toISOString().slice(0,10);
 if(format==='json'){download(filename+'.json',JSON.stringify({metadata,exportedAt:new Date().toISOString(),items:rows},null,2),'application/json');return}
 const cols=['id','scope','area','section','title','detail','source','evidence','engineeringStage','engineeringSummary','statusOrigin','approval','status','note','reviewedOn','updatedAt','updatedBy'];
 const quote=v=>{let text=String(v??'');if(/^[=+@-]/.test(text.trimStart()))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
 const values=rows.map(x=>cols.map(k=>quote(k==='engineeringStage'?x.engineeringReview?.stage:(k==='engineeringSummary'?x.engineeringReview?.summary:(k in x.progress?x.progress[k]:x[k])))).join(','));
 download(filename+'.csv',cols.join(',')+'\r\n'+values.join('\r\n'),'text/csv;charset=utf-8');
}
async function reload(){
 message('Refreshing privately saved Owner progress…');
 try{
  const data=await api();
  releasePlan=data.releasePlan||null;metadata=data.metadata||{};engineering=data.engineeringReview||{};delegation=data.delegatedReview||{};delegated=data.delegatedBaseline||{};all=[...(data.items||[]),...(data.custom||[])];stored=data.progress||{};loaded=true;
  renderPrivateBrief(data.operationalBrief);
  renderCurrentAudit(data.currentAudit);
  renderReleasePlan();
  window.OwnerRoadmapProductsV88?.render(data);
  window.OwnerProductReadinessV91?.render(data);
  await deployedVersion();
  $('#or-version').textContent='Catalog '+(metadata.version||'')+' · Delegated review '+(delegation.version||'unavailable')+' · authenticated Owner edits save privately in Supabase and take precedence over delegated code approvals.';
  $('#or-app').hidden=false;$('#or-access').hidden=true;areas();render();renderReviewBoard();
 }catch(e){
  if(e.message!=='AUTH_REDIRECT')message(e.message+' Check Owner sign-in and storage availability.',true);
 }
}
function bind(){
 document.querySelectorAll('.or-tab-bar button').forEach(x=>x.addEventListener('click',()=>selectTab(x.dataset.scope)));
 for(const selector of ['#or-search','#or-area','#or-status','#or-review','#or-size','#or-origin','#or-sort']){
  const el=$(selector);el.addEventListener(selector==='#or-search'?'input':'change',()=>{
   if(selector==='#or-size')size=Number(el.value)||30;page=0;render();
  });
 }
 $('#or-prev').addEventListener('click',()=>{page--;render();$('#or-results').scrollIntoView({block:'start'})});
 $('#or-next').addEventListener('click',()=>{page++;render();$('#or-results').scrollIntoView({block:'start'})});
 $('#or-export-csv').addEventListener('click',()=>exportData('csv'));
 $('#or-export-json').addEventListener('click',()=>exportData('json'));
 $('#or-refresh').addEventListener('click',reload);
 $('#or-clear-filters').addEventListener('click',clearFilters);
 $('#or-open-current').addEventListener('click',()=>{selectTab('core');$('#or-review').value='in_progress';page=0;render();$('#or-results').scrollIntoView({block:'start'});});
 $('#or-action-board').addEventListener('click',e=>{const open=e.target.closest('[data-open-task]'),group=e.target.closest('[data-stage]');if(open){openTask(open.dataset.openTask);return;}if(group){selectTab('core');$('#or-review').value=group.dataset.stage;page=0;render();$('#or-results').scrollIntoView({block:'start'});}});
 document.querySelector('.or-tab-bar').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const tabs=[...document.querySelectorAll('.or-tab-bar button')];const i=tabs.indexOf(document.activeElement);if(i<0)return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].focus();selectTab(tabs[next].dataset.scope);});
 $('#or-review-board').addEventListener('click',event=>{
  const target=event.target.closest('button[data-review-stage]');if(!target)return;
  selectTab('core');$('#or-review').value=target.dataset.reviewStage;page=0;render();$('#or-results').scrollIntoView({block:'start'});
 });
 $('#or-list').addEventListener('change',async e=>{
  const target=e.target,id=target.dataset.check||target.dataset.status;if(!id)return;
  const item=find(id);if(!item)return;
  const p=state(item),container=target.closest('.or-task');
  const note=container?.querySelector('textarea[data-note]')?.value??p.note??'';
  if(target.dataset.check){await save(item,target.checked?'owner_complete':'not_started',note,target)}
  else if(target.dataset.status){
   if(['verified','research_complete'].includes(target.value)&&note.trim().length<20){
    const details=container?.querySelector('details'),noteBox=container?.querySelector('textarea[data-note]');
    if(details)details.open=true;
    announce('Verified research and accepted delivery require an evidence note (20+ characters). Enter the source or test result and save.',true);
    noteBox?.focus();return;
   }
   await save(item,target.value,note,target);
  }
 });
 $('#or-list').addEventListener('click',async e=>{
  const target=e.target.closest('button');if(!target)return;
  const id=target.dataset.save||target.dataset.archive;if(!id)return;
  const item=find(id);if(!item)return;
  if(target.dataset.archive){
   if(!confirm('Archive this custom task? Prior audit history is preserved.'))return;
   target.disabled=true;
   try{await api('POST',{action:'archive',id,expectedRevision:hasStoredState(item)?(stored[id].revision||null):null});all=all.filter(x=>x.id!==id);delete stored[id];render();announce('Custom task archived: '+id)}
   catch(err){if(err.message!=='AUTH_REDIRECT')announce(err.message,true)}finally{target.disabled=false}
   return;
  }
  const container=target.closest('.or-task');
  const note=container?.querySelector('textarea[data-note]')?.value||'';
  const status=container?.querySelector('select[data-status]')?.value||statusOf(item);
  await save(item,status,note,target);
 });
 $('#or-new-task').addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget,submit=form.querySelector('button[type=submit]');
  const v=Object.fromEntries(new FormData(form));
  submit.disabled=true;
  try{
   const response=await api('POST',{action:'add',title:v.title,area:v.area,detail:v.detail});
   all.unshift(response.item);stored[response.item.id]=response.progress;
   form.reset();selectTab('core');render();announce('Added Owner task '+response.item.id);
   if(!response.auditLogged)announce('Saved; audit log confirmation is outstanding.',true);
  }catch(err){if(err.message!=='AUTH_REDIRECT')announce(err.message,true)}
  finally{submit.disabled=false}
 });
}
async function init(){bind();try{await bearer()}catch(e){location.replace('/signin.html?next=%2Fowner-roadmap.html');return}await reload();let hash='';try{hash=decodeURIComponent(location.hash.slice(1))}catch{}if(/^task-(CORE-[0-9]{4}|EXEC-[0-9]{2}|PROM-[0-9]{2}|OWN-[a-f0-9-]{36})$/i.test(hash))openTask(hash.slice(5));else if(['tool-inventory','membership-coverage','product-readiness','verification-audit'].includes(hash))selectTab(hash)}
window.GroundUpOwnerRoadmap={openTask};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
