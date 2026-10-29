/* v0.14.0.112: one Market Simulator destination, two honest execution tiers.
 * Server mode is default, and no member-owned entire candle series is ever
 * copied into the server replay UI. Browser CSV is ungraded/unverified.
 */
(()=>{
 'use strict';
 const byId=id=>document.getElementById(id);
 let startedLegacy=false,startedServer=false;
 function setMethodOpen(open){
  const panel=byId('sim-lab-method'),tab=byId('sim-talia-tab');
  if(!panel||!tab)return;
  panel.hidden=!open;
  tab.setAttribute('aria-expanded',String(open));
  tab.classList.toggle('sim-tab-open',open);
  if(open)panel.scrollIntoView?.({block:'nearest'});
 }
 function selectFileLabel(){
  const file=byId('sim-csv')?.files?.[0];
  const name=byId('sim-csv-selected-name');
  if(name)name.textContent=file?file.name:'';
 }
 // Relocate an existing simulator layout panel. Keep the same nodes and listeners.
 function movePresetPanel(){
  const dest=byId('cl-replay-import')?.querySelector('.cl-import-interior');
  if(!dest)return false;
  const heading=[...document.querySelectorAll('main h1,main h2,main h3,main strong')]
   .find(h=>h.textContent?.trim()==='Simulator Layout & Presets');
  if(!heading)return false;
  const card=heading.closest('.journal-card,section,[role="group"]');
  if(!card||card===dest||card.contains(dest)||card.closest('#cl-replay-import'))return false;
  card.classList.add('sim-import-presets');
  heading.textContent='Workspace & Presets';
  dest.prepend(card);
  return true;
 }
 function observePresets(){
  if(movePresetPanel())return;
  const target=document.querySelector('main');
  if(!target||typeof MutationObserver!=='function')return;
  const watcher=new MutationObserver(()=>{if(movePresetPanel())watcher.disconnect()});
  watcher.observe(target,{childList:true,subtree:true});
  window.addEventListener('pagehide',()=>watcher.disconnect(),{once:true});
 }

 function selectMode(mode,{focus=false}={}){
  setMethodOpen(false);
  const server=mode!=='csv';
  const s=byId('sim-server-mode'),l=byId('sim-legacy-mode');
  const a=byId('sim-mode-server'),b=byId('sim-mode-csv'),note=byId('sim-mode-notice');
  if(!s||!l||!a||!b)return;
  s.hidden=!server;l.hidden=server;
  a.setAttribute('aria-pressed',String(server));b.setAttribute('aria-pressed',String(!server));
  a.classList.toggle('secondary',!server);b.classList.toggle('secondary',server);
  note.textContent=server?
   'Server-controlled fictional candles are revealed one at a time. Verified historical replay requires separately licensed data.':
   'Original fictional candles or your own CSV, for ungraded browser practice. Imported sequences are not independently verified.';
  if(server&&!startedServer){
   startedServer=true;
   window.dispatchEvent(new Event('groundup:activate-server-replay'));
  }
  if(!server&&!startedLegacy){
   startedLegacy=true;
   window.dispatchEvent(new Event('groundup:activate-legacy-simulator'));
  }
  if(server&&typeof window.GroundUpLegacySimulatorPause==='function')window.GroundUpLegacySimulatorPause();
  if(focus){
   const target=server?s:l,heading=target.querySelector('h2');
   if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
   target.scrollIntoView?.({block:'start',behavior:'smooth'});
  }
 }
 function init(){
  if(!byId('sim-mode-server'))return;
  byId('sim-mode-server').addEventListener('click',()=>selectMode('server',{focus:true}));
  byId('sim-mode-csv').addEventListener('click',()=>selectMode('csv'));
  byId('sim-talia-tab')?.addEventListener('click',()=>{
   const panel=byId('sim-lab-method');
   setMethodOpen(!!panel?.hidden);
  });
  byId('sim-lab-method')?.addEventListener('keydown',e=>{
   if(e.key==='Escape'){setMethodOpen(false);byId('sim-talia-tab')?.focus();}
  });
  byId('sim-csv')?.addEventListener('change',selectFileLabel);
  selectFileLabel();
  observePresets();
  byId('sim-start-free')?.addEventListener('click',()=>{
   window.GroundUpFreePracticeRequested=true;
   selectMode('csv');
   window.dispatchEvent(new Event('groundup:request-free-practice'));
  });
  const params=new URLSearchParams(location.search);
  const mode=params.get('mode');
  const free=params.get('practice')==='free';
  const studio=String(params.get('studio')||'').toUpperCase();
  const studioRequested=['STANDARD','ADVANCED','PROFESSIONAL'].includes(studio);
  if(studioRequested)window.GroundUpStudioRequestedTier=studio;
  if(free||studioRequested)window.GroundUpFreePracticeRequested=true;
  // Existing Trade Review and Lab deep links intentionally target the
  // browser CSV workflow; keep their original member Journey intact.
  // An explicit mode=server always overrides a legacy link.
  const legacyLink=['journal_id','lab','topic'].some(k=>params.has(k));
  selectMode(free||studioRequested||mode==='csv'||(mode!=='server'&&legacyLink)?'csv':'server');
 }
 // A deferred script runs with readyState='interactive' before later deferred
 // scripts have registered their event handlers. Wait for DOMContentLoaded
 // unless the document is already complete, or the legacy Simulator's
 // activation event is lost and its buttons never receive handlers.
 if(document.readyState!=='complete')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
