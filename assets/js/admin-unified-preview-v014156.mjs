/* D16 Stage A: read-only migration preview. No legacy script owns navigation here. */
import {MODULES,GROUPS,authorized,resolveRoute,createAdminClient,readRows} from '/assets/js/admin-unified-core-v014156.mjs';
import {safeMemberId,listParams,pageControlsInfo,authorizedMemberDetailRows,rolePermissionSummary} from '/assets/js/admin-unified-people-v014156.mjs';
const $=id=>document.getElementById(id);
let ctx=null,adminRead=null,active=null,sequence=0,controller=null;
const viewState={members:{page:1,search:''},audit:{page:1}};
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=String(text);return n;}
function gate(message){$('unified-gate').textContent=message;$('unified-gate').hidden=false;$('unified-app').hidden=true;}
function nav(){
 const host=$('unified-nav');host.replaceChildren();
 for(const group of GROUPS){
  const allowed=MODULES.filter(m=>m.group===group&&authorized(m,ctx));if(!allowed.length)continue;
  const section=el('section','unified-nav-group');const heading=el('h2',null,group);section.append(heading);
  for(const m of allowed){
   const button=el('button','unified-nav-button',m.label);button.type='button';button.dataset.module=m.id;
   button.setAttribute('aria-current',active?.id===m.id?'page':'false');
   button.addEventListener('click',()=>{if(location.hash==='#'+m.id)load(m,{focusHeading:true});else location.hash=m.id;});
   section.append(button);
  }
  host.append(section);
 }
}
function addPager(mod,data){
 const pageInfo=pageControlsInfo(mod,data);
 if(!pageInfo)return;
 const actions=$('unified-actions');
 const line=el('div','unified-pager');
 const previous=el('button',null,'Previous page');previous.type='button';previous.disabled=!pageInfo.hasPrev;
 previous.addEventListener('click',()=>{viewState[mod.id].page=pageInfo.page-1;load(mod);});
 const next=el('button',null,'Next page');next.type='button';next.disabled=!pageInfo.hasNext;
 next.addEventListener('click',()=>{viewState[mod.id].page=pageInfo.page+1;load(mod);});
 line.append(previous,el('span',null,'Page '+pageInfo.page),next);
 actions.append(line,el('p','unified-scope',pageInfo.scope));
}
function searchCurrentPage(mod){
 if(mod.id!=='members')return;
 const block=el('div','unified-filter');
 const field=el('label',null,'Filter current Auth page only');
 const input=el('input');input.type='search';input.placeholder='Email or username, within this page';
 input.value=viewState.members.search;input.maxLength=120;input.autocomplete='off';
 field.append(input);
 const button=el('button',null,'Filter this page');button.type='button';
 const apply=()=>{viewState.members.search=input.value.trim().slice(0,120);viewState.members.page=1;load(mod);};
 button.addEventListener('click',apply);input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();apply();}});
 block.append(field,button);
 $('unified-actions').append(block);
}
async function inspectMember(memberId){
 const mod=MODULES.find(m=>m.id==='members');
 if(!mod||!authorized(mod,ctx)||!safeMemberId(memberId))return;
 const generation=++sequence;controller?.abort();controller=new AbortController();
 $('unified-title').textContent='Member details (read-only)';$('unified-title').focus();
 const host=$('unified-results');host.replaceChildren();$('unified-actions').replaceChildren();
 const back=el('button',null,'Back to Members');back.type='button';back.addEventListener('click',()=>load(mod,{focusHeading:true}));
 $('unified-actions').append(back);
 $('unified-count').textContent='';
 $('unified-status').textContent='Loading authenticated member details…';
 try{
  const record=await adminRead('user_summary',{params:{id:memberId},signal:controller.signal});
  if(generation!==sequence)return;
  for(const item of authorizedMemberDetailRows(record)){
   const entry=el('article','unified-record');entry.append(el('strong',null,item.title),el('p',null,item.detail));
  host.append(entry);
  }
  $('unified-status').textContent='Member summary loaded from the existing permission-protected Admin API. Sensitive notes and private financial details are not shown in this view.';
 }catch(error){
  if(generation!==sequence||error.name==='AbortError')return;
  $('unified-status').textContent='Member details unavailable: '+(error.message||'Access denied.');
 }
}
function showRows(mod,data){
 const host=$('unified-results');host.replaceChildren();
 const items=mod.id==='roles'?rolePermissionSummary(data):readRows(mod,data);
 $('unified-count').textContent=items.length?items.length+' visible records (read-only; server may paginate or limit results)':'No records returned for this authorized view.';
 for(const [index,item] of items.entries()){
  const entry=el('article','unified-record');entry.append(el('strong',null,item.title),el('p',null,item.detail));
  if(mod.id==='members'){
   const id=safeMemberId(data.users?.[index]?.id);
   if(id){const inspect=el('button',null,'Inspect member');inspect.type='button';inspect.addEventListener('click',()=>inspectMember(id));entry.append(inspect);}
  }
  host.append(entry);
 }
}
async function load(mod,{focusHeading=false}={}){
 if(!mod||!authorized(mod,ctx)){gate('No authorized administrative modules are available.');return;}
 const generation=++sequence;controller?.abort();controller=new AbortController();active=mod;
 nav();$('unified-title').textContent=mod.label;if(focusHeading)$('unified-title').focus();
 $('unified-count').textContent='';$('unified-results').replaceChildren();
 const host=$('unified-actions');host.replaceChildren();
 if(mod.href||mod.legacy){
  const link=el('a','unified-legacy','Open established management workflow →');
  link.href=mod.href||'/admin.html'+mod.legacy;host.append(link);
 }
 if(mod.kind==='link'){$('unified-status').textContent='This workflow still runs in the established Control Center. Source migration is not yet accepted.';return;}
 searchCurrentPage(mod);
 $('unified-status').textContent='Loading authorized records…';
 try{
  const data=await adminRead(mod.action,{signal:controller.signal,params:listParams(mod,viewState[mod.id])});
  if(generation!==sequence)return;
  showRows(mod,data);addPager(mod,data);$('unified-status').textContent='Read-only records loaded. For changes, use the established authorized workflow.';
 }catch(error){
  if(generation!==sequence||error.name==='AbortError')return;
  $('unified-status').textContent='Could not load '+mod.label+': '+(error.message||'Unknown error');
 }
}
async function boot(){
 gate('Checking authenticated administrative access…');
 try{
  if(typeof window.getSupabaseClient!=='function')throw Error('Authentication client unavailable.');
  const client=await window.getSupabaseClient();
  const getToken=async()=>{const {data,error}=await client.auth.getSession();if(error)throw Error('Session unavailable.');return data?.session?.access_token||'';};
  adminRead=createAdminClient({getToken});
  ctx=await adminRead('context');
  if(!Array.isArray(ctx.permissions)||!ctx.permissions.includes('control_panel.access'))throw Error('Administrative permission required.');
  $('unified-gate').hidden=true;$('unified-app').hidden=false;
  await load(resolveRoute(location.hash,ctx));
  window.addEventListener('hashchange',()=>load(resolveRoute(location.hash,ctx),{focusHeading:true}));
  $('unified-refresh').addEventListener('click',()=>load(active));
 }catch(e){gate(e.message||'Admin access unavailable.');}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
