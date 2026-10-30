/* Authenticated, temporary saved-plan levels for Crownlight Chart Studio. */
(()=>{'use strict';
 const id=new URL(location.href).searchParams.get('trade_plan');
 if(!/^[1-9][0-9]{0,15}$/.test(id||'')||!Number.isSafeInteger(Number(id)))return;
 const el=(tag,t)=>{const v=document.createElement(tag);if(t!==undefined)v.textContent=String(t);return v};
 const gate=document.getElementById('sim-gate')||document.getElementById('sim-content');
 if(!gate)return;
 const panel=el('section');panel.id='cl-trade-plan-handoff';panel.className='journal-card journal-section';
 panel.setAttribute('aria-label','Authorized saved trade plan');
 const title=el('h2','Saved trade-plan price levels');
 const status=el('p','Verifying private Workbench entitlement…');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const details=el('p'),levels=el('ul'),back=el('a','Back to Advanced Workbench');
 back.href='advanced-tool.html?tool=WATCHLIST_WORKBENCH';back.className='btn secondary';
 panel.append(title,status,details,levels,back);
 gate.parentNode?.insertBefore(panel,gate);
 let live=true,userId=null,plan=null,applied=false,applying=false;
 const clear=()=>{
  live=false;plan=null;userId=null;
  try{window.CrownlightStudio?.clearTemporaryPlanLevels?.()}catch{}
  panel.replaceChildren();panel.hidden=true;
 };
 function apply(){
  if(!live||!plan||!userId||applied||applying)return;
  applying=true;applied=true;
  const ok=window.CrownlightStudio?.setTemporaryPlanLevels?.({...plan,userId})===true;
  if(!ok)applied=false;
  applying=false;
  if(ok)status.textContent='Authorized. Chart lines appear only on the matching ticker after the source plan observation time. No trade or candles were imported.';
 }
 window.addEventListener('crownlight:revealed-bars',apply);
 window.addEventListener('pagehide',clear,{once:true});
 async function load(){
  try{
   const sb=await window.getSupabaseClient?.();
   const prior=(await sb?.auth?.getSession?.())?.data?.session;
   if(!prior?.user?.id||!prior.access_token)throw Error('Sign in to load private plan levels.');
   userId=prior.user.id;
   sb.auth.onAuthStateChange?.((event,s)=>{if(event==='SIGNED_OUT'||s?.user?.id!==userId)clear()});
   const r=await fetch('/api/chart-plan-levels-v1?planId='+encodeURIComponent(id),{
    headers:{authorization:'Bearer '+prior.access_token},cache:'no-store',credentials:'same-origin'});
   const data=await r.json().catch(()=>null);
   const later=(await sb.auth.getSession()).data?.session;
   if(!live||later?.user?.id!==userId)return clear();
   if(!r.ok||data?.ok!==true||data.planId!==Number(id))throw Error(data?.error||'Plan access denied.');
   if(!Array.isArray(data.levels)||!/^[A-Z][A-Z0-9.-]{0,11}$/.test(data.symbol||''))
    throw Error('Saved plan levels unavailable.');
   plan={symbol:data.symbol,asOf:data.asOf,levels:data.levels};
   details.textContent='Member-entered '+data.direction+' plan for '+data.symbol+
    ' · originally observed '+data.asOf+'. Source values are not verified exchange levels.';
   for(const v of data.levels)levels.append(el('li',v.kind+' · $'+Number(v.price).toFixed(4)));
   status.textContent='Private levels authorized. Load a chart whose ticker matches exactly; levels cannot appear before the recorded observation.';
   apply();
  }catch(e){if(live)status.textContent=e?.message||'Unable to load this private saved plan.'}
 }
 void load();
})();
