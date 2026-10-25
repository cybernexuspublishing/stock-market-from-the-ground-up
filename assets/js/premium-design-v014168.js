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
 if(isAdmin){try{const saved=sessionStorage.getItem(KEY);if(allowed.has(saved))preview(saved)}catch(_){}}
 const unavailable='Published theme settings are unavailable. Local preview remains available; activation requires the service to recover.';
 let loadState='loading';
 function syncState(){const box=document.querySelector('.gu-design-picker');if(!box)return;box.querySelector('[data-design-activate]').disabled=loadState!=='ready';box.querySelector('[data-design-retry]').disabled=loadState==='loading';const note=box.querySelector('.gu-design-state');if(loadState==='unavailable')note.textContent=unavailable;else if(loadState==='loading')note.textContent='Loading published theme settings…';else note.textContent='Preview is local until the Owner selects Activate Selected Theme.';}
 async function responseData(r){if(!(r.headers.get('content-type')||'').toLowerCase().includes('application/json'))throw Error('Website design service is unavailable. No change confirmed.');return r.json();}
 async function live(){
  loadState='loading';syncState();
  try{
   const r=await fetch('/api/website-design',{cache:'no-store'}),data=await responseData(r);
   if(!r.ok||!data.ok||!allowed.has(data.design?.theme)||!Number.isInteger(data.design?.revision))throw Error('Invalid published theme response');
   window.__guActiveDesign=data.design;
   let localPreview=false;try{localPreview=isAdmin&&!!sessionStorage.getItem(KEY)}catch(_){}
   if(!localPreview)document.documentElement.dataset.guDesign=data.design.theme;
   loadState='ready';
  }catch{loadState='unavailable';window.__guActiveDesign=null;}
  finally{syncState();}
 }
 async function activate(chosen,button,status){button.disabled=true;try{if(!window.__guActiveDesign||!Number.isInteger(window.__guActiveDesign.revision))throw Error(unavailable);const sb=await window.getSupabaseClient?.();const token=(await sb?.auth?.getSession?.())?.data?.session?.access_token;if(!token)throw Error('Owner login required');const r=await fetch('/api/website-design',{method:'POST',cache:'no-store',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({theme:chosen,expectedRevision:window.__guActiveDesign?.revision||1})});const data=await responseData(r);if(!r.ok||!data.ok||!allowed.has(data.design?.theme)||!Number.isInteger(data.design?.revision))throw Error(data.error||'Activation was not confirmed. Reload published settings before retrying.');window.__guActiveDesign=data.design;try{sessionStorage.removeItem(KEY)}catch(_){}document.documentElement.dataset.guDesign=data.design.theme;status.textContent='Activated '+data.design.theme+' — revision '+data.design.revision;}catch(e){status.textContent='Not activated: '+e.message}finally{button.disabled=false}}
 function mount(){
  if(!isAdmin)return;
  const app=document.querySelector('#admin-app');if(!app||app.querySelector('.gu-design-picker'))return;
  const box=document.createElement('section');box.className='gu-design-picker admin-card';
  box.setAttribute('aria-label','Website Design preview');
  const heading=document.createElement('h2');heading.textContent='Website Design — Preview';
  const explain=document.createElement('p');explain.textContent='Preview both themes here without changing the published website. Activation is Owner-only and changes the public setting.';
  const fieldset=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent='Preview theme';fieldset.append(legend);
  for(const [key,title] of [['premium-dark','Professional Dark'],['premium-light','Clean Light']]){
   const label=document.createElement('label');const input=document.createElement('input');input.type='radio';input.name='gu-site-design-preview';input.value=key;input.checked=(document.documentElement.dataset.guDesign||'premium-dark')===key;
   input.addEventListener('change',()=>{if(input.checked)preview(key)});label.append(input,document.createTextNode(title));fieldset.append(label);
  }
  const note=document.createElement('p');note.className='gu-design-state';note.setAttribute('role','status');note.setAttribute('aria-live','polite');note.textContent='Preview is local until the Owner selects Activate Selected Theme.';
  const activateButton=document.createElement('button');activateButton.type='button';activateButton.setAttribute('data-design-activate','');activateButton.textContent='Activate Selected Theme';activateButton.className='btn';activateButton.addEventListener('click',()=>activate(fieldset.querySelector('input:checked')?.value||'premium-dark',activateButton,note));
  const rollbackButton=document.createElement('button');rollbackButton.type='button';rollbackButton.className='btn secondary';rollbackButton.textContent='Select Previous Theme';rollbackButton.addEventListener('click',()=>{const prev=window.__guActiveDesign?.previousTheme;if(!allowed.has(prev)){note.textContent='No previous theme to restore';return}fieldset.querySelectorAll('input').forEach(i=>i.checked=i.value===prev);preview(prev);note.textContent='Previous theme previewed. Select Activate to restore for all members.'});
  const retryButton=document.createElement('button');retryButton.type='button';retryButton.setAttribute('data-design-retry','');retryButton.className='btn secondary';retryButton.textContent='Retry Published Settings';retryButton.addEventListener('click',()=>{void live()});
  box.append(heading,explain,fieldset,activateButton,rollbackButton,retryButton,note);
  const settings=app.querySelector('[data-admin-panel="settings"]');const dashboard=app.querySelector('[data-admin-panel="dashboard"]');if(settings)settings.prepend(box);else if(dashboard)dashboard.prepend(box);else return;
  box.dataset.guDesignMounted='1';syncState();
 }
 function boot(){void live();mount();if(isAdmin){const app=document.querySelector('#admin-app');if(app&&!app.querySelector('.gu-design-picker')){const observer=new MutationObserver(()=>{mount();if(app.querySelector('.gu-design-picker'))observer.disconnect()});observer.observe(app,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),15000);}}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
