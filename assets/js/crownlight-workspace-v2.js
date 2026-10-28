/* Professional synced views & member-private workspace V2.
 * Uses documented KLineChart v10 APIs; all bars originate in revealed-only feed.
 * Server verifies membership for every workspace GET/PUT. Manual Save captures drawings.
 */
(()=>{'use strict';
let workspace={version:2,selected:'STANDARD',sync:true,studies:[],drawings:[],layout:'SIDE_BY_SIDE'};
let permissionEpoch=0,loadingWorkspace=false,linked=false,guard=false,syncEnabled=true;
let ui=null,notice=null,permissionReady=false,storeAvailable=false;
const Tier=()=>window.CrownlightChartTiers;
const msg=t=>{if(notice)notice.textContent=t};
function getCharts(){return Tier()?.getInstances?.()||[]}
const VALID_LAYOUTS=new Set(['SIDE_BY_SIDE','STACKED','PRICE_FOCUS']);
function applyLayout(){
 const selected=Tier()?.getStatus?.()?.selected||'STANDARD';
 const eligible=Tier()?.getStatus?.()?.verified===true&&selected==='PROFESSIONAL';
 const layout=VALID_LAYOUTS.has(workspace.layout)?workspace.layout:'SIDE_BY_SIDE';
 const control=ui?.querySelector('[data-cl-layout]');
 if(control){control.value=layout;control.disabled=!eligible}
 const container=document.getElementById('cl-chart-tier-switcher');
 if(container)container.dataset.clLayout=eligible?layout:'SIDE_BY_SIDE';
 window.requestAnimationFrame(()=>Tier()?.balancePanels?.());
}
function sessionToken(){
 return window.getSupabaseClient().then(sb=>sb.auth.getSession()).then(r=>r.data?.session?.access_token||null);
}
async function endpoint(method,data){
 const token=await sessionToken();if(!token)throw Error('Sign in required');
 const r=await fetch('/api/chart-workspace',{method,headers:{authorization:'Bearer '+token,
  ...(data?{'content-type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,cache:'no-store'});
 if(!r.ok)throw Error(r.status===403?'Chart membership is not eligible':'Workspace temporarily unavailable');
 const reply=await r.json();if(reply.ok!==true)throw Error('Workspace not verified');return reply;
}
function activeDrawings(){
 const primary=getCharts()[0]?.chart;
 const overlays=primary?.getOverlays?.()||[];
 const allowed=new Set(['segment','horizontalStraightLine','fibonacciLine']);
 const out=[];
 for(const o of overlays){
  if(!allowed.has(o?.name)||!Array.isArray(o.points)||o.points.length===0)continue;
  const points=o.points.filter(p=>Number.isSafeInteger(p?.timestamp)&&Number.isFinite(p?.value)&&p.value>0)
   .slice(0,6).map(p=>({timestamp:p.timestamp,value:p.value}));
  if(points.length)out.push({name:o.name,points});
  if(out.length>=24)break;
 }
 return out;
}
function applyOverlays(){
 const primary=getCharts()[0]?.chart;if(!primary)return;
 const bars=Tier()?.getRevealedBars?.()||[];
 const last=bars.at(-1)?.timestamp||0,first=bars[0]?.timestamp||0;
 for(const drawing of workspace.drawings||[]){
  const points=(drawing.points||[]).filter(p=>p.timestamp>=first&&p.timestamp<=last);
  if(points.length!==drawing.points?.length||!points.length)continue;
  try{primary.createOverlay({name:drawing.name,points})}catch{}
 }
}
function applyStudies(){
 // Use the shared v10 pane-aware helper: saved EMA/MA belongs on the
 // candlesticks, oscillators belong in distinct panes, names cannot duplicate.
 for(const name of new Set(workspace.studies||[])){
  try{Tier()?.addStudy?.(name)}catch(e){console.warn('Crownlight saved study skipped',e?.message)}
 }
}
function synchronize(source,event,type){
 const charts=getCharts();
 if(!syncEnabled||guard||charts.length!==2||!permissionReady)return;
 const target=charts.find(c=>c!==source);if(!target)return;
 try{
  guard=true;
  if(type==='onCrosshairChange'){
   if(typeof event?.x!=='number')return;
   const info=source.chart.convertFromPixel({x:event.x},{paneId:'candle_pane'});
   if(!Number.isSafeInteger(info?.timestamp))return;
   const translated=target.chart.convertToPixel({timestamp:info.timestamp},{paneId:'candle_pane'});
   if(Number.isFinite(translated?.x))target.chart.executeAction('onCrosshairChange',{x:translated.x,paneId:'candle_pane'});
  }else{
   const range=source.chart.getVisibleRange?.(),data=source.chart.getDataList?.()||[];
   if(!data.length||!range)return;
   // realTo is a BAR INDEX, not a timestamp. Resolve through the actual revealed list.
   const index=Math.min(data.length-1,Math.max(0,Math.ceil(range.realTo)-1));
   const stamp=data[index]?.timestamp;
   if(type==='onZoom'&&typeof source.chart.getBarSpace==='function'&&typeof target.chart.setBarSpace==='function'){
    const space=source.chart.getBarSpace();
    if(Number.isFinite(space))target.chart.setBarSpace(Math.max(1,Math.min(50,space)));
   }
   if(Number.isSafeInteger(stamp))target.chart.scrollToTimestamp(stamp,0);
  }
 }catch(e){console.warn('Crownlight sync skipped',e?.message)}
 finally{queueMicrotask(()=>{guard=false})}
}
function wireSync(){
 const charts=getCharts();
 if(charts.length!==2||!permissionReady)return;
 charts.forEach(chart=>{
  if(chart.syncWired)return;
  chart.syncWired=true;
  for(const event of ['onCrosshairChange','onScroll','onZoom']){
   chart.chart.subscribeAction(event,data=>synchronize(chart,data,event));
  }
 });
 linked=true;
 msg('Professional time, zoom, and crosshair synchronization '+(syncEnabled?'on':'off')+'.');
}
async function persist(){
 if(!permissionReady){msg('Sign in and verify access before saving.');return}
 workspace.selected=Tier().getStatus().selected;
 workspace.sync=syncEnabled;
 workspace.layout=Tier().getStatus().selected==='PROFESSIONAL'&&VALID_LAYOUTS.has(ui?.querySelector('[data-cl-layout]')?.value)?ui.querySelector('[data-cl-layout]').value:'SIDE_BY_SIDE';
 workspace.drawings=activeDrawings();
 const studies=(ui?.querySelector('[data-cl-studies]')?.value||'');
 workspace.studies=[...new Set(studies.split(',').map(s=>s.trim().toUpperCase()).filter(x=>['RSI','MACD','BOLL','MA','EMA','SMA','ATR','VOL'].includes(x)))].slice(0,8);
 try{const r=await endpoint('PUT',workspace);workspace=r.workspace;storeAvailable=true;msg('Workspace saved privately. Changes restore after sign-in.')}
 catch(e){msg('Workspace not saved: '+e.message)}
}
async function restore(){
 const epoch=++permissionEpoch;
 permissionReady=Tier()?.getStatus().verified===true;
 if(!permissionReady){workspace={version:2,selected:'STANDARD',sync:true,studies:[],drawings:[],layout:'SIDE_BY_SIDE'};syncEnabled=true;linked=false;storeAvailable=false;
  const box=ui?.querySelector('[data-cl-studies]');if(box)box.value='';
  const toggle=ui?.querySelector('[data-cl-sync]');if(toggle)toggle.checked=true;
  applyLayout();
  msg('Session changed. Saved workspace controls cleared. Sign in again to restore your settings.');return}
 loadingWorkspace=true;
 try{
  const r=await endpoint('GET');
  if(epoch!==permissionEpoch||!Tier()?.getStatus().verified)return;
  workspace=r.workspace;storeAvailable=true;syncEnabled=workspace.sync!==false;
  if(ui){
   const toggle=ui.querySelector('[data-cl-sync]');if(toggle)toggle.checked=syncEnabled;
   const indicators=ui.querySelector('[data-cl-studies]');if(indicators)indicators.value=(workspace.studies||[]).join(', ');
  }
  applyLayout();
  msg(r.updatedAt?'Private workspace loaded.':'Workspace ready; save to retain changes across sessions.');
  if(workspace.selected!=='STANDARD'&&Tier().getStatus().allowed.includes(workspace.selected))
   await Tier().choose(workspace.selected);
 }catch(e){if(epoch===permissionEpoch){storeAvailable=false;msg('Private workspace not available; current chart continues without saved settings.')}}finally{loadingWorkspace=false}
}
function controls(){
 const parent=document.getElementById('cl-chart-tier-switcher');
 if(!parent||ui)return;
 ui=document.createElement('section');ui.className='cl-workspace-controls';ui.setAttribute('aria-label','Crownlight saved chart workspace');
 const row=document.createElement('div');row.className='cl-workspace-row';
 const label=document.createElement('label');const cb=document.createElement('input');
 cb.type='checkbox';cb.checked=true;cb.dataset.clSync='';cb.onchange=()=>{syncEnabled=cb.checked;workspace.sync=syncEnabled;msg('Multi-chart synchronization '+(syncEnabled?'enabled':'disabled')+'. Save to persist.');};
 label.append(cb,' Sync Professional charts');
 const indicators=document.createElement('label');indicators.textContent='Saved studies ';
 const input=document.createElement('input');input.type='text';input.dataset.clStudies='';
 input.placeholder='EMA, RSI, MACD';input.maxLength=85;input.setAttribute('aria-label','Saved indicators, comma-separated');indicators.append(input);
 const layoutLabel=document.createElement('label');layoutLabel.textContent='Professional layout ';
 const layoutSelect=document.createElement('select');layoutSelect.dataset.clLayout='';
 layoutSelect.setAttribute('aria-label','Professional chart panel layout');
 for(const [name,desc] of [['SIDE_BY_SIDE','Side by side'],['STACKED','Stacked'],['PRICE_FOCUS','Price focus']])
  layoutSelect.add(new Option(desc,name));
 layoutSelect.onchange=()=>{workspace.layout=layoutSelect.value;applyLayout();msg('Chart layout changed. Save workspace to retain this preference.')};
 layoutLabel.append(layoutSelect);
 const save=document.createElement('button');save.type='button';save.textContent='Save workspace';save.dataset.clSave='';save.onclick=()=>void persist();
 const reload=document.createElement('button');reload.type='button';reload.textContent='Restore';reload.dataset.clRestore='';reload.onclick=()=>void restore();
 row.append(label,indicators,layoutLabel,save,reload);
 notice=document.createElement('p');notice.className='cl-workspace-status';notice.role='status';notice.textContent='Member workspace loads after authentication.';
 ui.append(row,notice);parent.append(ui);
}
window.addEventListener('crownlight:tier-permission',()=>{permissionEpoch++;void restore()});
window.addEventListener('crownlight:tier-mounted',e=>{
 applyLayout();
 if(e.detail?.tier==='PROFESSIONAL')wireSync();
 if(e.detail?.tier!=='STANDARD'&&!loadingWorkspace){applyStudies();applyOverlays()}
 if(loadingWorkspace&&e.detail?.tier!=='STANDARD'){applyStudies();applyOverlays()}
});
window.addEventListener('crownlight:revealed-bars',()=>{
 // Never restore drawings that reference bars later than the last revealed bar.
 if(getCharts().length===2)wireSync();
});
function init(){controls();applyLayout()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.CrownlightWorkspaceV2={getStatus:()=>({synced:syncEnabled,linked,available:storeAvailable,memberVerified:permissionReady,layout:workspace.layout}),
 synchronize,restore,persist};
})();