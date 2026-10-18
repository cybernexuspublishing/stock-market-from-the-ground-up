/* Owner Roadmap v0.14.0.61. Browser-only renderer; all data/mutations require
 * Cloudflare server verification of OWNER, account status, and real session.
 * Never store signed-in auth tokens or project status in localStorage. */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const choices=[
 ['not_started','Not Owner-reviewed'],['in_progress','In progress'],
 ['implemented','Implemented · needs verification'],['blocked','Blocked'],
 ['deferred','Deferred / future release'],['owner_complete','Owner marked complete'],
 ['verified','Evidence verified']
];
const complete=new Set(['owner_complete','verified']);
const nearCritical=new Set(['CORE-0030','CORE-0042','CORE-0054','CORE-0072','CORE-0074','CORE-0077','CORE-0078','CORE-0079','CORE-0080','CORE-0081','CORE-0082','CORE-0141','CORE-0142','CORE-0147','CORE-0166','EXEC-66','EXEC-67','EXEC-70','EXEC-77']);
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
 const done=tasks.filter(x=>complete.has(statusOf(x))).length;
 const savedComplete=tasks.filter(x=>hasStoredState(x)&&complete.has(statusOf(x))).length;
 const delegatedComplete=done-savedComplete;
 const active=count('in_progress')+count('implemented'),block=count('blocked');
 const traced=all.filter(x=>x.scope==='trace'&&!isReference(x)).length;
 $('#or-metrics').innerHTML=[
  [done+' / '+tasks.length,'Recorded approvals: '+delegatedComplete+' delegated; '+savedComplete+' Owner-saved'],
  [String(tasks.length-done),'Still needs final verification or development'],
  [String(active),'Source accepted pending QA / active work'],
  [String(block),'Blocked · '+traced+' source requirements tracked']
 ].map(([number,label])=>'<article class="or-stat"><strong>'+esc(number)+'</strong><span>'+esc(label)+'</span></article>').join('');
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
 }catch(e){if(e.message!=='AUTH_REDIRECT'){announce(e.message,true);render();}}
 finally{busy.delete(item.id);if(element?.isConnected)element.disabled=false}
}
function announce(text,error=false){
 const box=$('#or-evidence');box.textContent=text;box.classList.toggle('or-error',error);
 window.clearTimeout(announce._timeout);
 announce._timeout=setTimeout(()=>{box.classList.remove('or-error');box.innerHTML='Verified delivered work has delegated approval; source-only implementations still need live acceptance. Existing authenticated Owner decisions take precedence.'},6000);
}
function find(id){return all.find(x=>x.id===id)}
function selectTab(next){
 scope=next;page=0;
 document.querySelectorAll('.or-tab-bar button').forEach(b=>{const active=b.dataset.scope===next;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active))});
 $('#or-area').value='';$('#or-status').value='';$('#or-review').value='';$('#or-origin').value='';$('#or-search').value='';
 areas();render();
}
function download(name,data,mime){
 const url=URL.createObjectURL(new Blob([data],{type:mime}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportData(format){
 const rows=all.map(x=>({...x,progress:state(x),statusOrigin:isDelegated(x)?'delegated_GitHub_review':'owner_Supabase_or_unreviewed'}));
 const filename='owner-website-roadmap-'+new Date().toISOString().slice(0,10);
 if(format==='json'){download(filename+'.json',JSON.stringify({metadata,exportedAt:new Date().toISOString(),items:rows},null,2),'application/json');return}
 const cols=['id','scope','area','section','title','detail','source','evidence','engineeringStage','engineeringSummary','statusOrigin','approval','status','note','reviewedOn','updatedAt','updatedBy'];
 const quote=v=>{let text=String(v??'');if(/^[\\s\\u0000-\\u001f]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
 const values=rows.map(x=>cols.map(k=>quote(k==='engineeringStage'?x.engineeringReview?.stage:(k==='engineeringSummary'?x.engineeringReview?.summary:(k in x.progress?x.progress[k]:x[k])))).join(','));
 download(filename+'.csv',cols.join(',')+'\r\n'+values.join('\r\n'),'text/csv;charset=utf-8');
}
async function reload(){
 message('Refreshing privately saved Owner progress…');
 try{
  const data=await api();
  metadata=data.metadata||{};engineering=data.engineeringReview||{};delegation=data.delegatedReview||{};delegated=data.delegatedBaseline||{};all=[...(data.items||[]),...(data.custom||[])];stored=data.progress||{};loaded=true;
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
  else if(target.dataset.status){await save(item,target.value,note,target)}
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
async function init(){bind();try{await bearer()}catch(e){location.replace('/signin.html?next=%2Fowner-roadmap.html');return}await reload()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
