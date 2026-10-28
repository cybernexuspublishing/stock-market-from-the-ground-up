/* Crownlight Chart Studio Tiers V1.
 * Standard = installed Lightweight Charts. Advanced/Pro = lazy KLineChart 10.1.0.
 * Never obtain bars from a full replay array: ONLY crownlight:revealed-bars.
 * Tier choice is a browser preference; entitlement comes from the server.
 */
(()=>{'use strict';
const LIB='https://cdn.jsdelivr.net/npm/klinecharts@10.1.0/dist/umd/klinecharts.min.js';
const levels={STANDARD:0,ADVANCED:1,PROFESSIONAL:2};
const names={STANDARD:'Standard · Lightweight Charts',ADVANCED:'Advanced · KLineChart',
 PROFESSIONAL:'Professional · Multi-chart KLineChart'};
const state={allowed:['STANDARD'],tier:'STANDARD',selected:'STANDARD',bars:[],symbol:'REPLAY',
 timeframe:'1-minute',source:'',charts:[],version:0,verified:false,view:null,notice:null,loading:null};
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n};
const status=t=>{if(state.notice)state.notice.textContent=t};
const price=(n)=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
function safeBars(input){
 const bars=[];let previous=-Infinity;
 for(const b of Array.isArray(input)?input:[]){
  const t=Number(b.timestamp),o=Number(b.open),h=Number(b.high),lo=Number(b.low),c=Number(b.close),v=Number(b.volume||0);
  if(!Number.isSafeInteger(t)||t<=previous||!price(o)||!price(h)||!price(lo)||!price(c)||!price(v)||
   h<Math.max(o,c,lo)||lo>Math.min(o,c,h))continue;
  bars.push({timestamp:t,open:o,high:h,low:lo,close:c,volume:v});previous=t;
 }
 return bars;
}
async function permission(){
 const authEpoch=state.authEpoch=(state.authEpoch||0)+1;
 try{
  const client=await window.getSupabaseClient();
  const session=(await client.auth.getSession()).data?.session;
  if(authEpoch!==state.authEpoch)return;
  if(!session?.access_token){state.verified=false;state.tier='STANDARD';state.allowed=['STANDARD'];state.selected='STANDARD';stopCharts();renderChoices();status('Sign in to use Crownlight charts.');
   window.dispatchEvent(new CustomEvent('crownlight:tier-permission',{detail:{verified:false,tier:'STANDARD'}}));return}
  const r=await fetch('/api/chart-tier-access',{headers:{authorization:'Bearer '+session.access_token},cache:'no-store'});
  if(!r.ok)throw Error('Chart entitlement unavailable');
  const j=await r.json();
  if(authEpoch!==state.authEpoch)return;
  if(j?.ok!==true||j.eligible!==true||!Array.isArray(j.allowed))throw Error('Chart access not confirmed');
  state.allowed=['STANDARD',...['ADVANCED','PROFESSIONAL'].filter(t=>j.allowed.includes(t))];
  state.tier=state.allowed.at(-1);state.verified=true;
  if(!state.allowed.includes(state.selected)){state.selected='STANDARD';stopCharts()}
  status('Your membership includes Crownlight '+state.tier+'. Advanced chart tools use the same revealed replay data.');
 }catch{if(authEpoch!==state.authEpoch)return;state.allowed=['STANDARD'];state.tier='STANDARD';state.verified=false;state.selected='STANDARD';stopCharts();
  status('Advanced chart permissions could not be verified. Standard chart remains available to eligible signed-in members.');}
 renderChoices();
 window.dispatchEvent(new CustomEvent('crownlight:tier-permission',{detail:{verified:state.verified,tier:state.tier}}));
}
function stopCharts(){
 for(const entry of state.charts){try{window.klinecharts?.dispose(entry.id)}catch{}}
 state.charts=[];state.view?.querySelector('[data-cl-tier-panels]')?.replaceChildren();document.body.classList.remove('cl-tier-enhanced');
}
function renderChoices(){
 if(!state.view)return;
 const select=state.view.querySelector('select');
 if(!select)return;
 for(const option of select.options){
  const authorized=state.verified&&state.allowed.includes(option.value);
  option.disabled=!authorized;
  option.textContent=names[option.value]+(authorized?'':' · Locked');
 }
 select.value=state.selected;
 state.view.querySelector('[data-cl-tier-advanced]')?.toggleAttribute('hidden',state.selected==='STANDARD');
}
function period(){
 const x=/(\d+)\s*[- ]?min/i.exec(state.timeframe);
 return {span:x?Math.max(1,Math.min(240,Number(x[1]))):1,type:'minute'};
}
function makeView(id,type){
 const box=el('div','cl-tier-kline-canvas');box.id=id;
 box.setAttribute('role','img');box.setAttribute('aria-label',type+' chart showing revealed candles only');
 state.view.querySelector('[data-cl-tier-panels]').append(box);
 return box;
}
function initOne(id,type){
 const chart=window.klinecharts?.init?.(id,{styles:'dark'});
 if(!chart)throw Error('KLineChart could not initialize');
 chart.setSymbol({ticker:state.symbol||'REPLAY',pricePrecision:4,volumePrecision:0});
 chart.setPeriod(period());
 chart.setDataLoader({getBars:({callback})=>{
  // V10: no append of future bars, no external history requests from this renderer.
  callback(state.bars.map(b=>({...b})),{forward:false,backward:false});
 }});
 try{chart.createIndicator('VOL',true)}catch(e){console.warn('Volume indicator unavailable',e)}
 try{chart.createIndicator('EMA',false)}catch(e){console.warn('EMA indicator unavailable',e)}
 if(type==='analysis')try{chart.createIndicator('MACD',true)}catch(e){console.warn('MACD unavailable',e)}
 return {id,chart};
}
async function loadEngine(){
 if(window.klinecharts?.init)return;
 if(!state.loading){
  state.loading=new Promise((resolve,reject)=>{
   const s=document.createElement('script');s.src=LIB;s.async=true;s.crossOrigin='anonymous';
   s.onload=()=>window.klinecharts?.init?resolve():reject(new Error('Missing chart API'));
   s.onerror=()=>reject(new Error('Charting library unavailable'));
   document.head.append(s);
  });
 }
 return state.loading;
}
async function choose(tier){
 if(!state.verified||!state.allowed.includes(tier)){status('This engine is not included in your verified membership.');renderChoices();return}
 state.selected=tier;stopCharts();renderChoices();
 if(tier==='STANDARD'){status('Standard Crownlight chart is active.');window.dispatchEvent(new CustomEvent('crownlight:tier-mounted',{detail:{tier}}));return}
 const request=++state.version;
 status('Loading '+tier.toLowerCase()+' charts…');
 const enhanced=state.view.querySelector('[data-cl-tier-advanced]');
 enhanced.hidden=false;
 try{
  await loadEngine();
  if(request!==state.version||!state.verified||!state.allowed.includes(tier))return;
  document.body.classList.add('cl-tier-enhanced');
  makeView('cl-tier-primary','Technical analysis');
  if(tier==='PROFESSIONAL')makeView('cl-tier-secondary','Indicator study');
  state.charts.push(initOne('cl-tier-primary','primary'));
  if(tier==='PROFESSIONAL')state.charts.push(initOne('cl-tier-secondary','analysis'));
  window.dispatchEvent(new CustomEvent('crownlight:tier-mounted',{detail:{tier}}));
  status(state.bars.length?
   tier+' chart: '+state.bars.length+' revealed candles. All future candles remain hidden.':
   'Load fictional or authorized history to begin chart analysis.');
 }catch(e){stopCharts();state.selected='STANDARD';renderChoices();
  status('Enhanced chart unavailable; Standard remains active. '+(e?.message||''));
 }
}
function createControls(){
 const host=document.querySelector('.sim-chart-panel');if(!host||state.view)return false;
 const panel=el('section','cl-chart-tier-switcher');panel.id='cl-chart-tier-switcher';
 panel.setAttribute('aria-label','Crownlight Chart Studio tier');
 const header=el('div','cl-chart-tier-bar');
 const label=el('label','', 'Chart Studio experience');
 const select=el('select');select.setAttribute('aria-label','Chart engine available to your membership');
 for(const k of Object.keys(names)){const op=new Option(names[k]+' · Locked',k);op.disabled=true;select.append(op)}
 select.onchange=()=>void choose(select.value);
 label.append(select);
 state.notice=el('p','cl-chart-tier-status','Verifying chart membership…');
 state.notice.setAttribute('role','status');state.notice.setAttribute('aria-live','polite');
 header.append(label,state.notice);panel.append(header);
 const enhanced=el('div','cl-chart-tier-enhanced');enhanced.dataset.clTierAdvanced='';enhanced.hidden=true;
 const tools=el('div','cl-chart-tier-tools');
 tools.append(el('strong','', 'KLineChart technical studies and drawings'));
 const indicator=el('select');
 indicator.setAttribute('aria-label','Add an indicator');
 for(const name of ['RSI','MACD','BOLL','MA'])indicator.add(new Option(name,name));
 const add=el('button','btn secondary','Add indicator');add.type='button';
 add.onclick=()=>{
  try{for(const entry of state.charts)entry.chart.createIndicator(indicator.value,true);
   status('Added '+indicator.value+' indicator to the visible chart workspace.')}
  catch{status('That study is not available in the current KLineChart build.')}
 };
 const drawing=el('select');drawing.setAttribute('aria-label','Select drawing tool');
 for(const [k,v]of [['segment','Trendline'],['horizontalStraightLine','Horizontal level'],['fibonacciLine','Fibonacci levels']])drawing.add(new Option(v,k));
 const draw=el('button','btn secondary','Draw');draw.type='button';draw.onclick=()=>{
  try{state.charts[0]?.chart.createOverlay(drawing.value);status('Click on the chart to place the selected drawing tool.')}
  catch{status('Drawing tool unavailable.')}
 };
 tools.append(indicator,add,drawing,draw);
 const note=el('p','cl-chart-tier-note','The second Professional chart studies the SAME revealed candles; it does not display a future timeframe or undisclosed data.');
 const grid=el('div','cl-chart-tier-panels');grid.dataset.clTierPanels='';
 enhanced.append(tools,note,grid);panel.append(enhanced);
 const chart=document.querySelector('.crownlight-shell');
 if(chart)chart.insertAdjacentElement('afterend',panel);else host.append(panel);
 state.view=panel;renderChoices();
 return true;
}
window.addEventListener('crownlight:revealed-bars',e=>{
 const d=e.detail||{};
 state.bars=safeBars(d.bars);
 state.symbol=String(d.symbol||'REPLAY').slice(0,40);
 state.timeframe=String(d.timeframe||'1-minute').slice(0,48);
 state.source=String(d.source||'').slice(0,60);
 if(state.selected!=='STANDARD'&&state.charts.length){
  for(const entry of state.charts){
   try{entry.chart.setSymbol({ticker:state.symbol,pricePrecision:4,volumePrecision:0});entry.chart.setPeriod(period());entry.chart.resetData()}
   catch{status('An enhanced replay refresh failed. Standard remains available.')}
  }
  status(state.selected+': '+state.bars.length+' revealed candles. No future bars provided.');
 }
});
async function init(){
 if(!createControls())return;
 await permission();
 try{
  const client=await window.getSupabaseClient();
  client.auth.onAuthStateChange(()=>{state.version++;state.bars=[];state.selected='STANDARD';stopCharts();void permission()});
 }catch{}
}
window.CrownlightChartTiers={getInstances:()=>state.verified&&state.selected!=='STANDARD'?state.charts.slice():[],
 getRevealedBars:()=>state.bars.map(b=>({...b})),
 getStatus:()=>({
 tier:state.tier,selected:state.selected,allowed:[...state.allowed],revealed:state.bars.length,
 verified:state.verified,charts:state.charts.length
}),choose:t=>choose(t)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void init());else void init();
})();