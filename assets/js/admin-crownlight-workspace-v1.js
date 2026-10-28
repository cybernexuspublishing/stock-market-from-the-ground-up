/* Crownlight Page Style Manager — OWNER-only authoring, preview and reset.
 * Existing audited setting_save remains authoritative; the page never grants access.
 */
(()=>{'use strict';
 const root=document.getElementById('admin-crownlight-workspace-control');if(!root)return;
 const $=sel=>root.querySelector(sel),KEY='feature.crownlight_continuous_workspace_v1';
 const labels={"simulator.html":"Chart Studio / Simulator","dashboard.html":"Member Dashboard","labs.html":"Labs","learn.html":"Learning System","market-tutor.html":"Market Tutor","journal.html":"Journal","bootcamp-academy.html":"Boot Camp Academy","my-library.html":"My Library","account.html":"Account","market-commons.html":"Market Commons","forum.html":"Forum","skills.html":"Skills","membership.html":"Membership","store.html":"Store","index.html":"Home"};
 const PRESETS=[
  {id:'classic',name:'Original',detail:'No placement override. Restore the page exactly as its own design defines it.'},
  {id:'continuous',name:'Continuous Desk',detail:'Wide chart or content area with a connected side workspace where supported.'},
  {id:'focus',name:'Focused',detail:'Prioritizes one main task or chart, with supporting controls below.'},
  {id:'compact',name:'Compact',detail:'High-density dashboard with tighter spacing and efficient side panels.'},
  {id:'spacious',name:'Spacious',detail:'Larger margins, comfortable breathing room, and clearly separated sections.'}
 ];
 const notice=$('[data-cl-admin-message]'),enabled=$('[data-cl-admin-enabled]');
 const pageList=$('[data-cl-admin-pages]'),pageChoice=$('[data-cl-admin-preview-page]');
 const gallery=$('[data-cl-admin-style-gallery]'),description=$('[data-cl-admin-style-description]');
 const previewLink=$('[data-cl-admin-preview]'),classicLink=$('[data-cl-admin-classic]');
 const controls=new Map();
 let dirty=false;
 const chosen=()=>[...controls].filter(([,d])=>d.check.checked).map(([p])=>p);
 const chosenStyles=()=>Object.fromEntries(chosen().map(p=>[p,controls.get(p).select.value]));
 function updateLinks(){
  const page=pageChoice.value||'simulator.html';
  const style=controls.get(page)?.select.value||'classic';
  previewLink.href='/'+page+'?workspace='+encodeURIComponent(style);
  classicLink.href='/'+page+'?workspace=classic';
  gallery.querySelectorAll('[data-cl-style]').forEach(b=>{
   const active=b.dataset.clStyle===style;b.classList.toggle('is-selected',active);
   b.setAttribute('aria-pressed',String(active));
  });
  description.textContent=(PRESETS.find(x=>x.id===style)||PRESETS[0]).detail+
   (controls.get(page)?.check.checked?' · Selected for '+labels[page]+'.':' · Not enabled on '+labels[page]+'.');
 }
 function markChanged(){
  dirty=true;
  notice.textContent='Unsaved changes. Use “Save page styles” to apply your choices.';
  updateLinks();
 }
 for(const [page,label] of Object.entries(labels)){
  const wrapper=document.createElement('div');wrapper.className='cl-page-style-row';
  const check=document.createElement('input');check.type='checkbox';check.value=page;
  check.dataset.clPage='';check.id='cl-page-style-'+page.replace(/[^a-z0-9]/gi,'-');
  const text=document.createElement('label');text.htmlFor=check.id;text.textContent=label;
  const select=document.createElement('select');select.setAttribute('aria-label','Style for '+label);
  select.dataset.clPageStyle='';select.dataset.page=page;
  for(const preset of PRESETS){const opt=document.createElement('option');opt.value=preset.id;opt.textContent=preset.name;select.append(opt)}
  check.addEventListener('change',()=>{
   if(check.checked&&select.value==='classic')select.value='continuous';
   pageChoice.value=page;markChanged();
  });
  select.addEventListener('change',()=>{
   check.checked=select.value!=='classic';pageChoice.value=page;markChanged();
  });
  wrapper.append(check,text,select);pageList.append(wrapper);
  controls.set(page,{check,select});
  const choice=document.createElement('option');choice.value=page;choice.textContent=label;pageChoice.append(choice);
 }
 for(const preset of PRESETS){
  const button=document.createElement('button');button.type='button';button.className='cl-page-style-option';
  button.dataset.clStyle=preset.id;button.setAttribute('aria-pressed','false');
  const mini=document.createElement('span');mini.className='cl-page-style-mini cl-mini-'+preset.id;
  mini.setAttribute('aria-hidden','true');
  for(const part of ['top','main','side','bottom']){
   const piece=document.createElement('span');piece.className='cl-mini-'+part;mini.append(piece);
  }
  const name=document.createElement('strong');name.textContent=preset.name;
  const detail=document.createElement('small');detail.textContent=preset.detail;
  button.append(mini,name,detail);button.addEventListener('click',()=>{
   const page=pageChoice.value||'simulator.html',control=controls.get(page);
   control.select.value=preset.id;control.check.checked=preset.id!=='classic';markChanged();
  });
  gallery.append(button);
 }
 pageChoice.value='simulator.html';pageChoice.addEventListener('change',updateLinks);
 enabled.addEventListener('change',markChanged);
 $('[data-cl-admin-page-reset]').addEventListener('click',()=>{
  const page=pageChoice.value||'simulator.html',c=controls.get(page);
  c.select.value='classic';c.check.checked=false;markChanged();
 });
 $('[data-cl-admin-reset-all]').addEventListener('click',()=>{
  enabled.checked=false;
  for(const c of controls.values()){c.check.checked=false;c.select.value='classic'}
  markChanged();
 });
 async function call(action,method='GET',body){
  const sb=await window.getSupabaseClient(),token=(await sb.auth.getSession()).data?.session?.access_token;
  if(!token)throw Error('Owner sign-in is required.');
  const r=await fetch('/api/admin?action='+action,{
   method,headers:{authorization:'Bearer '+token,'content-type':'application/json'},
   body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.ok!==true)throw Error(j.error||'Admin request unavailable');
  return j;
 }
 async function refresh(){
  const actor=await call('context');
  if(!actor.roles?.includes('OWNER'))return;
  root.hidden=false;
  const data=await call('settings');
  const setting=data.settings?.find(x=>x.setting_key===KEY)?.value||{};
  enabled.checked=setting.enabled===true;
  const pages=new Set(Array.isArray(setting.pages)?setting.pages:['simulator.html']);
  for(const [page,c] of controls){
   c.check.checked=pages.has(page);
   const style=setting.styles?.[page]||'continuous';
   c.select.value=PRESETS.some(p=>p.id===style)?style:'continuous';
   if(!c.check.checked)c.select.value='classic';
  }
  dirty=false;notice.textContent=enabled.checked?
   'Published · '+pages.size+' page(s) selected.':'Not published · Styles are available for Owner preview.';
  updateLinks();
 }
 async function save(){
  const button=$('[data-cl-admin-save]');button.disabled=true;
  try{
   await call('setting_save','POST',{
    setting_key:KEY,category:'design',
    value:{enabled:enabled.checked,pages:chosen(),styles:chosenStyles()},
    public_read:false,description:'Owner-controlled per-page visual style presets; Classic removes overrides'
   });
   dirty=false;notice.textContent=enabled.checked?
    'Saved. Selected page styles are published.':'Saved. All visitor pages remain on their original layouts.';
  }catch(e){notice.textContent='Could not save: '+e.message}
  finally{button.disabled=false;updateLinks()}
 }
 $('[data-cl-admin-save]').addEventListener('click',save);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh().catch(e=>{
  notice.textContent='Could not load page settings: '+e.message;
 }),{once:true});
 else refresh().catch(e=>notice.textContent='Could not load page settings: '+e.message);
})();
