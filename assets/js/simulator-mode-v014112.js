/* v0.14.0.112: one Market Simulator destination, two honest execution tiers.
 * Server mode is default, and no member-owned entire candle series is ever
 * copied into the server replay UI. Browser CSV is ungraded/unverified.
 */
(()=>{
 'use strict';
 const byId=id=>document.getElementById(id);
 let startedLegacy=false;
 function selectMode(mode,{focus=false}={}){
  const server=mode!=='csv';
  const s=byId('sim-server-mode'),l=byId('sim-legacy-mode');
  const a=byId('sim-mode-server'),b=byId('sim-mode-csv'),note=byId('sim-mode-notice');
  if(!s||!l||!a||!b)return;
  s.hidden=!server;l.hidden=server;
  a.setAttribute('aria-pressed',String(server));b.setAttribute('aria-pressed',String(!server));
  a.classList.toggle('secondary',!server);b.classList.toggle('secondary',server);
  note.textContent=server?
   'Server replay reveals only previously authorized candles. A published, license-cleared source or clearly marked original fictional series is required.':
   'Browser CSV practice loads the whole user-supplied price sequence locally; do not treat this as independently verified history, broker fills or server-graded no-lookahead work.';
  if(!server&&!startedLegacy){
   startedLegacy=true;
   window.dispatchEvent(new Event('groundup:activate-legacy-simulator'));
  }
  if(server&&typeof window.GroundUpLegacySimulatorPause==='function')window.GroundUpLegacySimulatorPause();
  if(focus)(server?s:l).querySelector('h2')?.focus?.();
 }
 function init(){
  if(!byId('sim-mode-server'))return;
  byId('sim-mode-server').addEventListener('click',()=>selectMode('server'));
  byId('sim-mode-csv').addEventListener('click',()=>selectMode('csv'));
  const params=new URLSearchParams(location.search);
  const mode=params.get('mode');
  // Existing Trade Review and Lab deep links intentionally target the
  // browser CSV workflow; keep their original member Journey intact.
  // An explicit mode=server always overrides a legacy link.
  const legacyLink=['journal_id','lab','topic'].some(k=>params.has(k));
  selectMode(mode==='csv'||(mode!=='server'&&legacyLink)?'csv':'server');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
