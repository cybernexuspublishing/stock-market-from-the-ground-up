/* v0.14.0.168 — non-destructive, local visual preview.
 * Server-wide activation is intentionally unavailable until protected API,
 * Owner authorization, audit logging, rollback and cache invalidation exist.
 */
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
 function mount(){
  if(!isAdmin)return;
  const app=document.querySelector('#admin-app');if(!app)return;
  const box=document.createElement('section');box.className='gu-design-picker admin-card';
  box.setAttribute('aria-label','Website Design preview');
  const heading=document.createElement('h2');heading.textContent='Website Design — Preview';
  const explain=document.createElement('p');explain.textContent='Review both proposed visual themes in this browser session. This does not change the live website for other members.';
  const fieldset=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent='Preview theme';fieldset.append(legend);
  for(const [key,title] of [['premium-dark','Professional Dark'],['premium-light','Clean Light']]){
   const label=document.createElement('label');const input=document.createElement('input');input.type='radio';input.name='gu-site-design-preview';input.value=key;input.checked=(document.documentElement.dataset.guDesign||'premium-dark')===key;
   input.addEventListener('change',()=>{if(input.checked)preview(key)});label.append(input,document.createTextNode(title));fieldset.append(label);
  }
  const note=document.createElement('p');note.className='gu-design-state';note.textContent='Global activation is not yet enabled: protected backend approval and audit are required.';
  box.append(heading,explain,fieldset,note);
  const dashboard=app.querySelector('[data-admin-panel="dashboard"]');if(dashboard)dashboard.prepend(box);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
