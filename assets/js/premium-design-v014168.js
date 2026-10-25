/* v0.14.0.168 — local preview and Owner-authenticated global activation. */
(()=>{'use strict';
 const allowed=new Set(['premium-dark','premium-light']);
 const KEY='gu-design-preview-v014168';
 const isAdmin=/^\/admin(?:\.html)?$/i.test(location.pathname);
 function preview(theme){
  const choice=allowed.has(theme)?theme:'premium-dark';
  document.documentElement.dataset.guDesign=choice;
  try{sessionStorage.setItem(KEY,choice)}catch(_){}
 }
 try{const saved=sessionStorage.getItem(KEY);if(allowed.has(saved))preview(saved)}catch(_){}
 async function live(){try{const r=await fetch('/api/website-design',{cache:'no-store'});const data=await r.json();if(r.ok&&data.ok&&allowed.has(data.design?.theme)){window.__guActiveDesign=data.design;if(!isAdmin || !sessionStorage.getItem(KEY))document.documentElement.dataset.guDesign=data.design.theme}}catch(e){console.warn('Website design setting unavailable',e)}}
 async function activate(chosen,button,status){button.disabled=true;try{if(!window.__guActiveDesign||!Number.isInteger(window.__guActiveDesign.revision))throw Error('Theme settings are still loading. Refresh to retry.');const sb=await window.getSupabaseClient?.();const token=(await sb?.auth?.getSession?.())?.data?.session?.access_token;if(!token)throw Error('Owner login required');const r=await fetch('/api/website-design',{method:'POST',cache:'no-store',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({theme:chosen,expectedRevision:window.__guActiveDesign?.revision||1})});const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||'Activation unsuccessful');window.__guActiveDesign=data.design;try{sessionStorage.removeItem(KEY)}catch(_){}document.documentElement.dataset.guDesign=data.design.theme;status.textContent='Activated '+data.design.theme+' — revision '+data.design.revision;}catch(e){status.textContent='Not activated: '+e.message}finally{button.disabled=false}}
 function mount(){
  if(!isAdmin)return;
  const app=document.querySelector('#admin-app');if(!app)return;
  const box=document.createElement('section');box.className='gu-design-picker admin-card';
  box.setAttribute('aria-label','Website Design preview');
  const heading=document.createElement('h2');heading.textContent='Website Design — Preview';
  const explain=document.createElement('p');explain.textContent='Preview both themes here without changing the published website. Activation is Owner-only and changes the public setting.';
  const fieldset=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent='Preview theme';fieldset.append(legend);
  for(const [key,title] of [['premium-dark','Professional Dark'],['premium-light','Clean Light']]){
   const label=document.createElement('label');const input=document.createElement('input');input.type='radio';input.name='gu-site-design-preview';input.value=key;input.checked=(document.documentElement.dataset.guDesign||'premium-dark')===key;
   input.addEventListener('change',()=>{if(input.checked)preview(key)});label.append(input,document.createTextNode(title));fieldset.append(label);
  }
  const note=document.createElement('p');note.className='gu-design-state';note.textContent='Preview is local until the Owner selects Activate Selected Theme.';
  const activateButton=document.createElement('button');activateButton.type='button';activateButton.textContent='Activate Selected Theme';activateButton.className='btn';activateButton.addEventListener('click',()=>activate(fieldset.querySelector('input:checked')?.value||'premium-dark',activateButton,note));
  const rollbackButton=document.createElement('button');rollbackButton.type='button';rollbackButton.className='btn secondary';rollbackButton.textContent='Select Previous Theme';rollbackButton.addEventListener('click',()=>{const prev=window.__guActiveDesign?.previousTheme;if(!allowed.has(prev)){note.textContent='No previous theme to restore';return}fieldset.querySelectorAll('input').forEach(i=>i.checked=i.value===prev);preview(prev);note.textContent='Previous theme previewed. Select Activate to restore for all members.'});
  box.append(heading,explain,fieldset,activateButton,rollbackButton,note);
  const settings=app.querySelector('[data-admin-panel="settings"]');const dashboard=app.querySelector('[data-admin-panel="dashboard"]');if(settings)settings.prepend(box);else if(dashboard)dashboard.prepend(box);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{live();mount()},{once:true});else{live();mount();}
})();
