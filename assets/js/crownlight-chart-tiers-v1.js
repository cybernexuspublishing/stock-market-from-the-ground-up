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
const state={allowed:['STANDARD'],tier:'STANDARD',selected:'STANDARD',bars:[],autoStarted:false,authUserId:null,symbol:'REPLAY',
 timeframe:'1-minute',source:'',charts:[],version:0,verified:false,view:null,notice:null,loading:null,
 accessExpiry:null,accessKind:null,accessTier:null,expireRechecked:false,sparksAvailable:false,sparkOffers:[],sparkBalance:null,sparkLoadError:'',sparkLoading:false};
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
  if(!session?.access_token){state.authUserId=null;state.accessExpiry=null;state.accessKind=null;state.accessTier=null;state.verified=false;state.tier='STANDARD';state.allowed=['STANDARD'];state.selected='STANDARD';stopCharts();renderChoices();status('Sign in to use Crownlight charts.');
   window.dispatchEvent(new CustomEvent('crownlight:tier-permission',{detail:{verified:false,tier:'STANDARD'}}));return}
  const r=await fetch('/api/chart-tier-access',{headers:{authorization:'Bearer '+session.access_token},cache:'no-store'});
  if(!r.ok)throw Error('Chart entitlement unavailable');
  const j=await r.json();
  if(authEpoch!==state.authEpoch)return;
  if(j?.ok!==true||j.eligible!==true||!Array.isArray(j.allowed))throw Error('Chart access not confirmed');
  state.allowed=['STANDARD',...['ADVANCED','PROFESSIONAL'].filter(t=>j.allowed.includes(t))];
  state.tier=state.allowed.at(-1);state.verified=true;state.authUserId=session.user?.id||null;
  const access=j.temporaryAccess;
  const expiry=access&&['QA','SPARKS'].includes(access.kind)&&
   ['ADVANCED','PROFESSIONAL'].includes(access.tier)&&
   Number.isFinite(Date.parse(access.expiresAt||''))&&Date.parse(access.expiresAt)>Date.now()
   ?String(access.expiresAt):null;
  if(expiry!==state.accessExpiry)state.expireRechecked=false;
  state.accessExpiry=expiry;state.accessKind=expiry?access.kind:null;
  state.accessTier=expiry?access.tier:null;
  state.sparksAvailable=j.sparksChartPasses?.enabled===true;
  if(!state.allowed.includes(state.selected)){state.selected='STANDARD';stopCharts()}
  status('Your membership includes Crownlight '+state.tier+'. Advanced chart tools use the same revealed replay data.');
 }catch{if(authEpoch!==state.authEpoch)return;state.allowed=['STANDARD'];state.tier='STANDARD';state.verified=false;state.selected='STANDARD';stopCharts();
  state.accessExpiry=null;state.accessKind=null;state.accessTier=null;
  status('Advanced chart permissions could not be verified. Standard chart remains available to eligible signed-in members.');}
 renderChoices();
 window.dispatchEvent(new CustomEvent('crownlight:tier-permission',{detail:{verified:state.verified,tier:state.tier}}));
 autoStartRequestedStudio();
}
function autoStartRequestedStudio(){
 const requested=String(window.GroundUpStudioRequestedTier||'').toUpperCase();
 if(state.autoStarted||!['STANDARD','ADVANCED','PROFESSIONAL'].includes(requested))return;
 if(!state.verified||!state.view||state.bars.length===0)return;
 if(!state.allowed.includes(requested)){
  status(requested+' Studio is not available to this account. Select Standard or request matching chart access.');
  return;
 }
 state.autoStarted=true;
 void choose(requested);
}
function stopCharts(){
 for(const entry of state.charts){try{window.klinecharts?.dispose(entry.id)}catch{}}
 state.charts=[];state.view?.querySelector('[data-cl-tier-panels]')?.replaceChildren();document.body.classList.remove('cl-tier-enhanced');
}
const requirements={
 ADVANCED:'Requires an eligible intermediate membership (such as an active Founding 30-Day plan), or an eligible temporary Crownlight Sparks Studio pass when available.',
 PROFESSIONAL:'Requires an eligible premium membership (such as an active Founding 60-Day, Full, or Lifetime plan), or an eligible temporary Crownlight Sparks Studio pass when available.'
};
function remainingText(ms){
 const total=Math.max(0,Math.ceil(ms/1000));
 const days=Math.floor(total/86400),hours=Math.floor(total%86400/3600);
 const mins=Math.floor(total%3600/60),secs=total%60;
 return (days?days+'d ':'')+[hours,mins,secs].map(n=>String(n).padStart(2,'0')).join(':');
}
function updateCountdown(){
 const output=state.view?.querySelector('[data-cl-tier-countdown]');
 if(!output)return;
 if(!state.verified||!state.accessExpiry){output.hidden=true;output.textContent='';return}
 const expiry=Date.parse(state.accessExpiry);
 if(!Number.isFinite(expiry)){output.hidden=true;return}
 const remaining=expiry-Date.now();
 output.hidden=false;
 output.textContent=remaining<=0
  ?'Temporary '+state.accessTier+' Studio access expired. Rechecking authorization…'
  :'Temporary '+state.accessTier+' '+(state.accessKind==='SPARKS'?'Sparks pass':'QA access')+
   ' · Remaining '+remainingText(remaining)+' · Ends '+new Date(expiry).toLocaleString();
 if(remaining<=0&&!state.expireRechecked){
  state.expireRechecked=true;
  void permission();
 }
}

async function sparksToken(){
 const client=await window.getSupabaseClient();
 const session=(await client.auth.getSession()).data?.session;
 if(!session?.access_token)throw Error('Sign in to redeem Crownlight Sparks.');
 return session.access_token;
}
async function loadSparkOffers(){
 if(state.sparkLoading)return;
 state.sparkLoading=true;state.sparkLoadError='';
 try{
  const token=await sparksToken(),headers={authorization:'Bearer '+token};
  const [offersResponse,walletResponse]=await Promise.all([
   fetch('/api/member-sparks-chart',{headers,cache:'no-store',credentials:'same-origin'}),
   fetch('/api/member-sparks-wallet',{headers,cache:'no-store',credentials:'same-origin'})
  ]);
  if(!offersResponse.ok||!walletResponse.ok)throw Error('Offer or wallet verification unavailable.');
  const catalog=await offersResponse.json(),wallet=await walletResponse.json();
  if(catalog.ok!==true||wallet.ok!==true||!Number.isSafeInteger(wallet.wallet?.available))
   throw Error('Price or Spark balance cannot be verified.');
  state.sparkOffers=(catalog.offers||[]).filter(o=>['ADVANCED','PROFESSIONAL'].includes(o.tier)&&
    Number.isSafeInteger(o.costSparks)&&o.costSparks>0&&
    Number.isSafeInteger(o.durationHours)&&o.durationHours>0);
  state.sparkBalance=wallet.wallet.available;
 }catch(error){state.sparkLoadError=String(error.message||error);state.sparkOffers=[];state.sparkBalance=null;}
 finally{state.sparkLoading=false;explainLockedTier()}
}
async function redeemSparkOffer(offer,button,feedback){
 if(!state.verified||state.allowed.includes(offer.tier))return;
 if(!Number.isSafeInteger(state.sparkBalance)||state.sparkBalance<offer.costSparks){
  feedback.textContent='Insufficient Crownlight Sparks. No credits were deducted.';return
 }
 if(!window.confirm('Redeem '+offer.costSparks+' Crownlight Sparks for '+offer.label+
  '? This activates a temporary Chart Studio pass. Existing active pass time is extended.'))return;
 button.disabled=true;feedback.textContent='Verifying wallet and redeeming…';
 try{
  const token=await sparksToken();
  const result=await fetch('/api/member-sparks-chart',{
   method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
   credentials:'same-origin',cache:'no-store',
   body:JSON.stringify({sku:offer.sku,requestId:crypto.randomUUID(),expectedCost:offer.costSparks})
  });
  const data=await result.json().catch(()=>({}));
  if(!result.ok||data.ok!==true)throw Error(data.error||'Redemption not confirmed.');
  feedback.textContent='Pass activated until '+new Date(data.expiresAt).toLocaleString()+'.';
  await permission();
  await loadSparkOffers();
  if(state.allowed.includes(offer.tier))void choose(offer.tier);
 }catch(error){
  feedback.textContent='No confirmed redemption: '+String(error.message||error)+
   '. Check your wallet before retrying.';
  button.disabled=false;
  if(/PRICE_CHANGED/.test(feedback.textContent))void loadSparkOffers();
 }
}

function explainLockedTier(){
 const host=state.view?.querySelector('[data-cl-tier-access-details]');
 if(!host)return;
 host.replaceChildren();
 let locked=0;
 for(const tier of ['ADVANCED','PROFESSIONAL']){
  if(state.verified&&state.allowed.includes(tier))continue;
  locked++;
  const block=el('section','cl-chart-tier-access-item');
  const heading=el('strong','','🔒 '+tier+' Studio');
  const description=el('p','',requirements[tier]);
  const membership=el('a','btn secondary','Compare memberships');
  membership.href='/membership.html';
  block.append(heading,description,membership);
  host.append(block);
 }
 if(!locked)host.append(el('p','','Your account can use all three Chart Studios. No additional membership is required.'));
 const spark=el('p','cl-chart-tier-sparks-explanation',
  state.sparkLoading?'Checking current Sparks prices and member balance…':
  state.sparkLoadError?'Sparks options temporarily unavailable: '+state.sparkLoadError:
  state.sparkBalance!==null?'Verified wallet balance: '+state.sparkBalance+' Sparks.':
  'Open this panel to view current Sparks pass prices and available wallet balance.');
 host.append(spark);
 if(state.sparksAvailable&&state.sparkOffers.length){
  const prices=el('div','cl-chart-sparks-prices');
  for(const offer of state.sparkOffers){
   if(state.allowed.includes(offer.tier))continue;
   const row=el('div','cl-chart-sparks-pass');
   row.append(el('strong','',offer.label),el('span','',offer.costSparks+' Sparks'));
   const action=el('button','btn secondary','Redeem '+offer.costSparks+' Sparks');
   action.type='button';action.disabled=state.sparkBalance===null||state.sparkBalance<offer.costSparks;
   action.title=action.disabled?'Insufficient Sparks or wallet unavailable.':'Redeem a temporary Chart Studio pass';
   const feedback=el('span','cl-chart-sparks-feedback');feedback.setAttribute('role','status');
   action.onclick=()=>void redeemSparkOffer(offer,action,feedback);
   row.append(action,feedback);prices.append(row);
  }
  host.append(prices);
 }
 const refresh=el('button','btn secondary','Refresh Sparks offers');
 refresh.type='button';refresh.onclick=()=>void loadSparkOffers();
 const shop=el('a','cl-chart-tier-sparks-link','Review Crownlight Sparks');
 shop.href='/store-sparks.html';
 host.append(refresh,shop);
}
function renderChoices(){
 if(!state.view)return;
 const select=state.view.querySelector('select');
 if(!select)return;
 for(const option of select.options){
  const authorized=state.verified&&state.allowed.includes(option.value);
  option.disabled=!authorized;
  option.textContent=(authorized?'':'🔒 ')+names[option.value]+(authorized?'':' · Locked');
  option.title=authorized?'Included in your current access':(requirements[option.value]||'Sign in to verify your membership.');
 }
 select.value=state.selected;
 state.view.querySelector('[data-cl-tier-advanced]')?.toggleAttribute('hidden',state.selected==='STANDARD');
 explainLockedTier();updateCountdown();
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
 const chart=window.klinecharts?.init?.(id,{styles:'dark',layout:{pane:{height:130,minHeight:60,dragEnabled:true}}});
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
  }).catch(error=>{state.loading=null;throw error});
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
 const select=el('select');select.setAttribute('aria-label','Choose a Chart Studio; locked tiers are unavailable');
 select.title='Choose an available Studio. Select Unlock options for locked Studio requirements.';
 for(const k of Object.keys(names)){const op=new Option(names[k]+' · Locked',k);op.disabled=true;select.append(op)}
 select.onchange=()=>void choose(select.value);
 label.append(select);
 state.notice=el('p','cl-chart-tier-status','Verifying chart membership…');
 state.notice.setAttribute('role','status');state.notice.setAttribute('aria-live','polite');
 const detailsButton=el('button','cl-chart-tier-access-trigger','🔒 Unlock options');
 detailsButton.type='button';detailsButton.setAttribute('aria-expanded','false');
 detailsButton.setAttribute('aria-controls','cl-chart-tier-access-details');
 detailsButton.title='View locked Studio requirements and temporary Sparks access information';
 const timer=el('p','cl-chart-tier-countdown');timer.dataset.clTierCountdown='';timer.hidden=true;
 timer.setAttribute('role','status');timer.setAttribute('aria-live','off');
 const popup=el('div','cl-chart-tier-access-popup');popup.id='cl-chart-tier-access-details';
 popup.dataset.clTierAccessDetails='';popup.hidden=true;
 popup.setAttribute('aria-label','Studio membership and Sparks access options');
 detailsButton.onclick=()=>{
  popup.hidden=!popup.hidden;
  detailsButton.setAttribute('aria-expanded',String(!popup.hidden));
  if(!popup.hidden){popup.querySelector('a')?.focus();void loadSparkOffers();}
 };
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!popup.hidden){
  popup.hidden=true;detailsButton.setAttribute('aria-expanded','false');detailsButton.focus();
 }});
 header.append(label,detailsButton,state.notice);panel.append(header,timer,popup);
 const enhanced=el('div','cl-chart-tier-enhanced');enhanced.dataset.clTierAdvanced='';enhanced.hidden=true;
 const tools=el('div','cl-chart-tier-tools');
 tools.append(el('strong','', 'KLineChart technical studies and drawings'));
 const indicator=el('select');
 indicator.setAttribute('aria-label','Add an indicator');
 for(const name of ['RSI','MACD','BOLL','MA','EMA','SMA','ATR','VOL'])indicator.add(new Option(name,name));
 const add=el('button','btn secondary','Add indicator');add.type='button';
 add.onclick=()=>{
  try{for(const entry of state.charts)entry.chart.createIndicator(indicator.value,true);
   const saved=document.querySelector('[data-cl-studies]');
   if(saved){const names=saved.value.split(',').map(x=>x.trim()).filter(Boolean);
    if(!names.includes(indicator.value))saved.value=[...names,indicator.value].join(', ')}
   status('Added '+indicator.value+' indicator. Save workspace to retain the study.')}
  catch{status('That study is not available in the current KLineChart build.')}
 };
 const remove=el('button','btn secondary','Remove indicator');remove.type='button';
 remove.onclick=()=>{
  let removed=false;
  for(const entry of state.charts){try{removed=entry.chart.removeIndicator({name:indicator.value})||removed}catch{}}
  const saved=document.querySelector('[data-cl-studies]');
  if(saved)saved.value=saved.value.split(',').map(x=>x.trim()).filter(x=>x&&x!==indicator.value).join(', ');
  status(removed?'Removed '+indicator.value+'. Save workspace to retain this change.':'No matching indicator in the current chart workspace.');
 };
 const drawing=el('select');drawing.setAttribute('aria-label','Select drawing tool');
 for(const [k,v]of [['segment','Trendline'],['horizontalStraightLine','Horizontal level'],['fibonacciLine','Fibonacci levels']])drawing.add(new Option(v,k));
 const draw=el('button','btn secondary','Draw');draw.type='button';draw.onclick=()=>{
  try{state.charts[0]?.chart.createOverlay(drawing.value);status('Click on the chart to place the selected drawing tool.')}
  catch{status('Drawing tool unavailable.')}
 };
 tools.append(indicator,add,remove,drawing,draw);
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
 autoStartRequestedStudio();
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
 window.setInterval(updateCountdown,1000);
 await permission();
 try{
  const client=await window.getSupabaseClient();
  client.auth.onAuthStateChange((event,session)=>{
    if(event==='INITIAL_SESSION')return;
    const differentUser=!!session?.user?.id&&!!state.authUserId&&session.user.id!==state.authUserId;
    if(event==='SIGNED_OUT'||differentUser){
     state.version++;state.bars=[];state.selected='STANDARD';state.autoStarted=false;
   state.sparkOffers=[];state.sparkBalance=null;state.sparkLoadError='';
   state.accessExpiry=null;state.accessKind=null;state.accessTier=null;
     state.authUserId=null;stopCharts();
    }
    if(event==='SIGNED_OUT'||event==='SIGNED_IN'||event==='TOKEN_REFRESHED'||differentUser)
     void permission();
   });
 }catch{}
}
window.CrownlightChartTiers={getInstances:()=>state.verified&&state.selected!=='STANDARD'?state.charts.slice():[],
 getRevealedBars:()=>state.bars.map(b=>({...b})),
 getStatus:()=>({
 tier:state.tier,selected:state.selected,allowed:[...state.allowed],revealed:state.bars.length,
 verified:state.verified,charts:state.charts.length,
 accessExpiry:state.accessExpiry,accessKind:state.accessKind,sparksAvailable:state.sparksAvailable
}),choose:t=>choose(t)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void init());else void init();
})();