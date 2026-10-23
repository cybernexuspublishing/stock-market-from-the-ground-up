/* Unified Admin Stage B active UI: one navigation root, read-only.
 * Every network request is authenticated and server permission-checked.
 */
import {MODULES,GROUPS,authorized,resolveRoute,createAdminClient,readRows} from '/assets/js/admin-unified-core-v014156.mjs';
import {safeMemberId,listParams,pageControlsInfo,authorizedMemberDetailRows,rolePermissionSummary} from '/assets/js/admin-unified-people-v014156.mjs';
const $=id=>document.getElementById(id);
const state={client:null,context:null,active:null,sequence:0,abort:null,
 pages:{members:{page:1,search:''},audit:{page:1}}};
function el(type,label,cls){
 const item=document.createElement(type);
 if(label!==undefined&&label!==null)item.textContent=String(label);
 if(cls)item.className=cls;
 return item;
}
function button(label,click){
 const b=el('button',label);b.type='button';b.addEventListener('click',click);return b;
}
function notice(s){$('unified-status').textContent=String(s)}
function gate(s){
 $('unified-gate').hidden=false;$('unified-gate').textContent=String(s);
 $('unified-app').hidden=true;
}
function navigation(){
 const root=$('unified-nav');root.replaceChildren();
 for(const group of GROUPS){
  const mods=MODULES.filter(x=>x.group===group&&authorized(x,state.context));
  if(!mods.length)continue;
  const section=el('section',null,'unified-nav-group');
  section.append(el('h2',group));
  for(const mod of mods){
   const action=button(mod.label,()=>{
    if(location.hash==='#'+mod.id)void load(mod,true);
    else location.hash=mod.id;
   });
   action.className='unified-nav-button';
   action.dataset.module=mod.id;
   action.setAttribute('aria-current',state.active?.id===mod.id?'page':'false');
   section.append(action);
  }
  root.append(section);
 }
}
function show(records){
 const root=$('unified-results');root.replaceChildren();
 $('unified-count').textContent=records.length+' visible read-only record(s).';
 for(const item of records){
  const row=el('article',null,'unified-record');
  row.append(el('strong',item.title),el('p',item.detail));
  root.append(row);
 }
 return root;
}
function filter(mod){
 if(mod.id!=='members')return;
 const area=el('div',null,'unified-filter');
 const label=el('label','Search this authentication page only');
 const field=el('input');field.type='search';field.maxLength=120;
 field.value=state.pages.members.search;field.placeholder='Username or email';
 label.append(field);
 const apply=()=>{
  state.pages.members.search=field.value.trim().slice(0,120);
  state.pages.members.page=1;void load(mod,false);
 };
 field.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();apply()}});
 area.append(label,button('Filter page',apply));
 $('unified-actions').append(area);
}
function pager(mod,response){
 const summary=pageControlsInfo(mod,response);
 if(!summary)return;
 const area=el('div',null,'unified-pager');
 const previous=button('Previous page',()=>{
  state.pages[mod.id].page=summary.page-1;void load(mod,false);
 });
 previous.disabled=!summary.hasPrev;
 const next=button('Next page',()=>{
  state.pages[mod.id].page=summary.page+1;void load(mod,false);
 });
 next.disabled=!summary.hasNext;
 area.append(previous,el('span','Page '+summary.page),next);
 $('unified-actions').append(area,el('p',summary.scope,'unified-scope'));
}
async function inspect(id){
 const memberId=safeMemberId(id),mod=MODULES.find(x=>x.id==='members');
 if(!memberId||!mod||!authorized(mod,state.context))return;
 const number=++state.sequence;state.abort?.abort();
 const controller=new AbortController();state.abort=controller;
 $('unified-title').textContent='Member summary (read-only)';
 $('unified-title').focus();
 $('unified-actions').replaceChildren(button('Back to Members',()=>void load(mod,true)));
 $('unified-results').replaceChildren();$('unified-count').textContent='';
 notice('Loading member summary…');
 try{
  const result=await state.client('user_summary',{params:{id:memberId},signal:controller.signal});
  if(number!==state.sequence)return;
  show(authorizedMemberDetailRows(result));
  notice('Read-only minimized member information. Private notes, payments and grants are not included.');
 }catch(error){
  if(number!==state.sequence||error?.name==='AbortError')return;
  notice('Member summary unavailable: '+String(error.message||'Access denied'));
 }
}
async function load(mod,focus=false){
 if(!mod||!authorized(mod,state.context)){gate('Administrative access unavailable.');return}
 const number=++state.sequence;
 state.abort?.abort();state.abort=new AbortController();state.active=mod;
 navigation();$('unified-title').textContent=mod.label;
 if(focus)$('unified-title').focus();
 $('unified-results').replaceChildren();$('unified-actions').replaceChildren();
 $('unified-count').textContent='';
 if(mod.href||mod.legacy){
  const link=el('a','Open established management workflow →','unified-legacy');
  link.href=mod.href||'/admin.html'+mod.legacy;
  $('unified-actions').append(link);
 }
 if(mod.kind==='link'){
  notice('Use the established permission-controlled management workflow. This view cannot mutate accounts or products.');
  return;
 }
 filter(mod);notice('Loading read-only records…');
 try{
  const data=await state.client(mod.action,{params:listParams(mod,state.pages[mod.id]),signal:state.abort.signal});
  if(number!==state.sequence)return;
  const items=mod.id==='roles'?rolePermissionSummary(data):readRows(mod,data);
  const root=show(items);
  if(mod.id==='members'&&Array.isArray(data.users)){
   for(const [i,item] of data.users.slice(0,items.length).entries()){
    const id=safeMemberId(item?.id);
    if(id)root.children[i]?.append(button('Inspect member',()=>void inspect(id)));
   }
  }
  pager(mod,data);
  notice('Records loaded. Changes remain within the established authorized workflow.');
 }catch(error){
  if(number!==state.sequence||error?.name==='AbortError')return;
  notice('Unable to load records: '+String(error.message||'Permission denied'));
 }
}
async function boot(){
 gate('Checking staff access…');
 try{
  if(typeof window.getSupabaseClient!=='function')throw Error('Sign-in service unavailable');
  const supabase=await window.getSupabaseClient();
  state.client=createAdminClient({getToken:async()=>{
   const {data,error}=await supabase.auth.getSession();
   if(error)throw Error('Session unavailable');
   return data?.session?.access_token||'';
  }});
  state.context=await state.client('context');
  if(!Array.isArray(state.context.permissions)||
    !state.context.permissions.includes('control_panel.access'))
   throw Error('Administrator permission required');
  $('unified-gate').hidden=true;$('unified-app').hidden=false;
  await load(resolveRoute(location.hash,state.context),false);
  window.addEventListener('hashchange',()=>void load(resolveRoute(location.hash,state.context),true));
  $('unified-refresh').addEventListener('click',()=>void load(state.active,false));
 }catch(error){gate(String(error?.message||'Administrative access unavailable'))}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else void boot();
