/* v0.14.0.112: one Market Simulator destination, two honest execution tiers.
 * Server mode is default, and no member-owned entire candle series is ever
 * copied into the server replay UI. Browser CSV is ungraded/unverified.
 */
(()=>{
 'use strict';
 const byId=id=>document.getElementById(id);
 let startedLegacy=false,startedServer=false;
 function selectMode(mode,{focus=false}={}){
  const server=mode!=='csv';
  const s=byId('sim-server-mode'),l=byId('sim-legacy-mode');
  const a=byId('sim-mode-server'),b=byId('sim-mode-csv'),note=byId('sim-mode-notice');
  if(!s||!l||!a||!b)return;
  s.hidden=!server;l.hidden=server;
  a.setAttribute('aria-pressed',String(server));b.setAttribute('aria-pressed',String(!server));
  a.classList.toggle('secondary',!server);b.classList.toggle('secondary',server);
  note.textContent=server?
   'Server-controlled original fictional scenarios are included for eligible signed-in Free members. Select the preloaded scenario below and choose Start Replay. Authentic historical replay remains separate and requires verified licensed data.':
   'Browser CSV practice loads the whole user-supplied price sequence locally; do not treat this as independently verified history, broker fills or server-graded no-lookahead work.';
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
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
