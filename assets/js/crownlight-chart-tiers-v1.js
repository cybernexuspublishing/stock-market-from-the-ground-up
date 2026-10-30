/* Crownlight Chart Studio Tiers V1.
 * Standard = installed Lightweight Charts. Advanced/Pro = lazy KLineChart 10.1.0.
 * Never obtain bars from a full replay array: ONLY crownlight:revealed-bars.
 * Tier choice is a browser preference; entitlement comes from the server.
 */
(()=>{'use strict';
const LIB='https://cdn.jsdelivr.net/npm/klinecharts@10.1.0/dist/umd/klinecharts.min.js';
const levels={STANDARD:0,ADVANCED:1,PROFESSIONAL:2};
const names={STANDARD:'Standard · Lightweight Charts',ADVANCED:'Advanced · KLineChart',
 PROFESSIONAL:'Professional · Multi-chart KLineChart',ECHARTS:'Apache ECharts · Price & Volume Analytics'};
const state={allowed:['STANDARD'],visible:['STANDARD','ADVANCED','PROFESSIONAL','ECHARTS'],tier:'STANDARD',selected:'STANDARD',bars:[],autoStarted:false,authUserId:null,symbol:'REPLAY',
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
async function loadMenuVisibility(){
 try{
  const r=await fetch('/api/chart-studio-menu',{cache:'no-store'});
  if(!r.ok)throw Error('Menu setting unavailable');
  const data=await r.json(),tiers=['STANDARD','ADVANCED','PROFESSIONAL','ECHARTS'];
  if(data.ok!==true||!Array.isArray(data.visible)||data.visible.length<1||
     new Set(data.visible).size!==data.visible.length||
     data.visible.some(t=>!tiers.includes(t)))throw Error('Invalid menu visibility');
  state.visible=tiers.filter(t=>data.visible.includes(t));
 }catch{state.visible=['STANDARD','ADVANCED','PROFESSIONAL','ECHARTS']}
 renderChoices();
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
  if(!isEntitled(state.selected)){state.selected='STANDARD';stopCharts()}
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
 if(state.autoStarted||!state.visible.includes(requested))return;
 if(!state.verified||!state.view||state.bars.length===0)return;
 if(!isEntitled(requested)){
  status(requested+' Studio is not available to this account. Select Standard or request matching chart access.');
  return;
 }
 state.autoStarted=true;
 void choose(requested);
}
function isEntitled(t){return state.verified&&state.allowed.includes(t==='ECHARTS'?'STANDARD':t)}
function stopCharts(){
 window.CrownlightEChartsStudio?.unmount();
 for(const entry of state.charts){try{window.klinecharts?.dispose(entry.id)}catch{}}
 state.charts=[];state.view?.querySelector('[data-cl-tier-panels]')?.replaceChildren();document.body.classList.remove('cl-tier-enhanced');
}
const requirements={
 ADVANCED:'Requires an eligible intermediate membership (such as an active Founding 30-Day plan), or an eligible temporary Crownlight Lumens Studio pass when available.',
 PROFESSIONAL:'Requires an eligible premium membership (such as an active Founding 60-Day, Full, or Lifetime plan), or an eligible temporary Crownlight Lumens Studio pass when available.'
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
  :'Temporary '+state.accessTier+' '+(state.accessKind==='SPARKS'?'Lumens pass':'QA access')+
   ' · Remaining '+remainingText(remaining)+' · Ends '+new Date(expiry).toLocaleString();
 if(remaining<=0&&!state.expireRechecked){
  state.expireRechecked=true;
  void permission();
 }
}

async function sparksToken(){
 const client=await window.getSupabaseClient();
 const session=(await client.auth.getSession()).data?.session;
 if(!session?.access_token)throw Error('Sign in to redeem Crownlight Lumens.');
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
  feedback.textContent='Insufficient Crownlight Lumens. No credits were deducted.';return
 }
 if(button.disabled)return;
 button.disabled=true;feedback.textContent='Verifying wallet and redeeming…';
 let receipt=null,memberId=null,confirmed=false;
 try{
  const client=await window.getSupabaseClient();
  const session=(await client.auth.getSession()).data?.session;
  if(!session?.access_token||!session.user?.id||
     session.user.id!==state.authUserId||!state.verified)
   throw Error('Member session changed; no new redemption requested.');
  memberId=session.user.id;
  const retry=window.CrownlightSparksRetryV1;
  if(!retry?.acquire||!retry?.confirm)throw Error('Secure redemption retry protection unavailable.');
  // Stable across uncertain responses and reloads; server RPC also validates
  // request_id under an atomic per-member lock before any bucket debit.
  receipt=retry.acquire(memberId,offer.sku);
  const result=await fetch('/api/member-sparks-chart',{
   method:'POST',headers:{authorization:'Bearer '+session.access_token,
    'content-type':'application/json'},
   credentials:'same-origin',cache:'no-store',
   body:JSON.stringify({sku:offer.sku,requestId:receipt,expectedCost:offer.costSparks})
  });
  const data=await result.json().catch(()=>({}));
  if(!result.ok||data.ok!==true)throw Error(data.error||'Redemption not confirmed.');
  if(data.tier!==offer.tier||!Number.isFinite(Date.parse(data.expiresAt||''))||
     Date.parse(data.expiresAt)<=Date.now())
   throw Error('Provider receipt requires reconciliation; do not buy again.');
  confirmed=true;
  feedback.textContent='Lumens transaction verified; rechecking chart access…';
  await permission();
  if(state.verified&&state.authUserId===memberId&&state.allowed.includes(offer.tier)){
   retry.confirm(memberId,offer.sku,receipt);
   feedback.textContent='Pass verified until '+new Date(data.expiresAt).toLocaleString()+'.'+
     (data.alreadyRedeemed?' Original purchase receipt reused; no additional Lumens spent.':'');
   await loadSparkOffers();
   void choose(offer.tier);
  }else{
   feedback.textContent='Lumens transaction was confirmed, but chart access verification has not completed. Refresh permissions; do not redeem again.';
  }
 }catch(error){
  feedback.textContent=confirmed?
   'Purchase receipt confirmed but Studio verification is incomplete. Refresh before any other action.':
   'Redemption not confirmed: '+String(error.message||error)+
    '. Retrying this offer reuses the SAME transaction ID to prevent duplicate Lumens charges.';
  if(!confirmed)button.disabled=false;
  if(/PRICE_CHANGED/.test(feedback.textContent))void loadSparkOffers();
 }
}

function explainLockedTier(){
 const host=state.view?.querySelector('[data-cl-tier-access-details]');
 if(!host)return;
 host.replaceChildren();
 let locked=0;
 for(const tier of ['ADVANCED','PROFESSIONAL']){
  if(!state.visible.includes(tier))continue;
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
  state.sparkLoading?'Checking current Lumens prices and member balance…':
  state.sparkLoadError?'Lumens options temporarily unavailable: '+state.sparkLoadError:
  state.sparkBalance!==null?'Verified wallet balance: '+state.sparkBalance+' Lumens.':
  'Open this panel to view current Lumens pass prices and available wallet balance.');
 host.append(spark);
 if(state.sparksAvailable&&state.sparkOffers.length){
  const prices=el('div','cl-chart-sparks-prices');
  for(const offer of state.sparkOffers){
   if(!state.visible.includes(offer.tier)||state.allowed.includes(offer.tier))continue;
   const row=el('div','cl-chart-sparks-pass');
   row.append(el('strong','',offer.label),el('span','',offer.costSparks+' Lumens'));
   const action=el('button','btn secondary','Redeem '+offer.costSparks+' Lumens');
   action.type='button';action.disabled=state.sparkBalance===null||state.sparkBalance<offer.costSparks;
   action.title=action.disabled?'Insufficient Lumens or wallet unavailable.':'Redeem a temporary Chart Studio pass';
   const feedback=el('span','cl-chart-sparks-feedback');feedback.setAttribute('role','status');
   action.onclick=()=>void redeemSparkOffer(offer,action,feedback);
   row.append(action,feedback);prices.append(row);
  }
  host.append(prices);
 }
 const refresh=el('button','btn secondary','Refresh Lumens offers');
 refresh.type='button';refresh.onclick=()=>void loadSparkOffers();
 const shop=el('a','cl-chart-tier-sparks-link','Review Crownlight Lumens');
 shop.href='/store-sparks.html';
 host.append(refresh,shop);
}
async function showLockedTier(tier){
 const dialog=document.getElementById('cl-chart-tier-purchase-dialog');
 if(!dialog||!['ADVANCED','PROFESSIONAL'].includes(tier)||
    !state.visible.includes(tier)||isEntitled(tier))return;
 const fill=content=>{dialog.replaceChildren(...content)};
 const title=el('h2','',names[tier]);
 const close=el('button','btn secondary','Close');close.type='button';
 close.onclick=()=>dialog.close();
 const intro=el('p','','Loading your available Lumens and current pass prices…');
 fill([title,intro,close]);
 if(!dialog.open)dialog.showModal();
 await loadSparkOffers();
 if(!dialog.open)return;
 const verified=state.verified,owned=isEntitled(tier);
 const balance=Number.isSafeInteger(state.sparkBalance)?state.sparkBalance:null;
 const offers=state.sparkOffers.filter(o=>o.tier===tier);
 const details=el('div','cl-tier-price-details');
 details.append(el('p','',requirements[tier]));
 if(owned)details.append(el('p','', 'This Studio is already unlocked. No Lumens purchase is needed.'));
 else if(!verified)details.append(el('p','','Account access could not be verified. No Lumens will be spent.'));
 else if(!state.sparksAvailable||!offers.length){
  details.append(el('p','',state.sparkLoadError||'No authorized Lumens passes are currently offered for this Studio.'));
 }else{
  details.append(el('p','cl-tier-wallet','Available balance: '+(balance===null?'Unavailable':balance)+' Lumens'));
  for(const offer of offers){
   const row=el('div','cl-tier-offer');
   const remaining=balance===null?null:balance-offer.costSparks;
   row.append(el('strong','',offer.label),
    el('span','', 'Cost: '+offer.costSparks+' Lumens'),
    el('span','', 'Remaining after purchase: '+(remaining===null?'Unavailable':Math.max(0,remaining))+' Lumens'));
   const feedback=el('p','cl-chart-sparks-feedback');
   feedback.setAttribute('role','status');
   const action=el('button','btn','Confirm redemption · '+offer.costSparks+' Lumens');
   action.type='button';action.disabled=balance===null||remaining<0||!verified;
   action.onclick=()=>void redeemSparkOffer(offer,action,feedback);
   row.append(action,feedback);details.append(row);
  }
 }
 const compare=el('a','btn secondary','Compare memberships');compare.href='/membership.html';
 const shop=el('a','btn secondary','View Lumens');shop.href='/store-sparks.html';
 fill([title,details,compare,shop,close]);
 close.focus();
}
function renderLockedButtons(){
 const host=state.view?.querySelector('[data-cl-locked-items]');
 if(!host)return;
 host.replaceChildren();
 if(!state.verified)return;
 for(const tier of ['ADVANCED','PROFESSIONAL']){
  if(!state.visible.includes(tier)||isEntitled(tier))continue;
  const button=el('button','cl-locked-studio');
  button.type='button';
  button.setAttribute('aria-label', 'Locked: '+names[tier]+'. View Lumens cost and balance');
  button.append(el('span','cl-locked-icon','🔒'),el('span','',names[tier]));
  button.onclick=()=>void showLockedTier(tier);
  host.append(button);
 }
 host.hidden=host.childElementCount===0;
}
function renderChoices(){
 if(!state.view)return;
 const select=state.view.querySelector('select');
 if(!select)return;
 // Server-administered visibility never grants membership authorization.
 select.replaceChildren();
 for(const tier of ['STANDARD','ADVANCED','PROFESSIONAL','ECHARTS']){
  if(!state.visible.includes(tier))continue;
  const authorized=isEntitled(tier);
  const option=new Option((authorized?'':'🔒 ')+names[tier]+(authorized?'':' · Locked'),tier);
  option.disabled=!authorized;
  option.title=authorized?'Included in your current access':(requirements[tier]||'Sign in to verify your membership.');
  select.append(option);
 }
 if(state.visible.includes(state.selected))select.value=state.selected;
 else{
  const placeholder=new Option('No matching Chart Studio selected','');
  placeholder.disabled=true;select.prepend(placeholder);select.value='';
 }
 if(state.verified&&!state.visible.some(t=>isEntitled(t)))
  status('No displayed Chart Studio is included in this membership. Your account access has not changed.');
 state.view.querySelector('[data-cl-tier-advanced]')?.toggleAttribute('hidden',state.selected==='STANDARD');
 const tools=state.view.querySelector('.cl-chart-tier-tools');if(tools)tools.hidden=state.selected==='ECHARTS';
 const note=state.view.querySelector('.cl-chart-tier-note');
 if(note)note.textContent=state.selected==='ECHARTS'
  ?'Apache ECharts displays already revealed educational OHLCV only. No trading execution or unrevealed future bars.'
  :'The second Professional chart studies the SAME revealed candles; it does not display a future timeframe or undisclosed data.';
 explainLockedTier();renderLockedButtons();updateCountdown();
}
function period(){
 const x=/(\d+)\s*[- ]?min/i.exec(state.timeframe);
 return {span:x?Math.max(1,Math.min(240,Number(x[1]))):1,type:'minute'};
}
function makeView(id,type){
 const frame=el('section','cl-tier-chart-frame');
 frame.setAttribute('aria-label',type+' chart and revealed market evidence');
 const summary=el('div','cl-tier-chart-summary');
 const header=el('div','cl-tier-summary-head');
 const name=el('strong','',type==='analysis'?'Comparison · Indicators':'Price · Technical structure');
 name.dataset.clSummaryTitle='';
 const source=el('span');source.dataset.clSummarySource='';
 header.append(name,source);
 const quote=el('div','cl-tier-ohlcv');quote.dataset.clSummaryOhlcv='';
 quote.setAttribute('aria-label','Latest revealed candle');
 const detail=el('details','cl-tier-study-readout');
 const detailLabel=el('summary','','Study values (expand)');detailLabel.dataset.clSummaryStudies='';
 const detailValue=el('p');detailValue.dataset.clSummaryStudyValues='';
 detail.append(detailLabel,detailValue);
 summary.append(header,quote,detail);
 const box=el('div','cl-tier-kline-canvas');box.id=id;
 box.setAttribute('role','img');box.setAttribute('aria-label',type+' chart showing revealed candles only');
 frame.append(summary,box);
 state.view.querySelector('[data-cl-tier-panels]').append(frame);
 return box;
}
function updateCompactReadout(entry){
 if(!entry?.host?.isConnected)return;
 const frame=entry.host.parentElement,last=state.bars.at(-1);
 const source=frame.querySelector('[data-cl-summary-source]');
 const quote=frame.querySelector('[data-cl-summary-ohlcv]');
 const list=frame.querySelector('[data-cl-summary-studies]');
 const detail=frame.querySelector('[data-cl-summary-study-values]');
 if(source)source.textContent=state.symbol+' · '+state.timeframe+' · '+state.bars.length+' revealed';
 if(quote){
  quote.replaceChildren();
  const fields=last?[['Open',last.open.toFixed(4)],['High',last.high.toFixed(4)],
   ['Low',last.low.toFixed(4)],['Close',last.close.toFixed(4)],
   ['Volume',last.volume.toLocaleString('en-US')]]:[['Data','No revealed candles']];
  for(const [label,value]of fields){
   const part=el('span','cl-tier-quote-item');
   part.append(el('span','',label),el('strong','',value));quote.append(part);
  }
 }
 const indicators=entry.chart.getIndicators?.()||[];
 const unique=[...new Set(indicators.map(i=>i.name).filter(Boolean))];
 if(list)list.textContent='Study values · '+(unique.join(', ')||'none')+' (expand)';
 if(detail)detail.textContent=indicators.map(indicator=>{
  const lastResult=indicator.result?.at(-1)||{};
  const figures=(indicator.figures||[]).slice(0,4);
  const values=figures.map(f=>{
   const value=lastResult?.[f.key];
   return Number.isFinite(value)?String(f.title||f.key).trim()+': '+Number(value).toFixed(3):null;
  }).filter(Boolean);
  return indicator.name+(values.length?' — '+values.join(' · '):' — not enough revealed bars');
 }).join(' | ')||'No active studies';
}
// KLineChart v10: EMA/MA are overlays on candle_pane. A plain
// createIndicator('EMA', false) creates a NEW pane and squeezes the
// price candles out when saved studies are restored (reported by Owner).
const CANDLE_STUDIES=new Set(['BBI','BOLL','EMA','MA','SAR','SMA']);
const VALID_STUDIES=new Set(['RSI','MACD','BOLL','MA','EMA','SMA','ATR','VOL']);
// Align outer heights when Professional charts are displayed side by side.
// Preserve per-chart natural heights when stacked or on small screens.
function balancePanels(){
 const charts=state.charts;
 if(!charts.length)return;
 const together=state.selected==='PROFESSIONAL'&&charts.length===2&&
  state.view?.dataset.clLayout!=='STACKED'&&window.matchMedia('(min-width: 1001px)').matches;
 const equal=together?Math.max(...charts.map(e=>e.naturalHeight||460)):null;
 for(const e of charts){
  const h=(equal||e.naturalHeight||460)+'px';
  if(e.host.style.height!==h){e.host.style.height=h;e.chart.resize?.();}
 }
}
function fitStudyPanes(entry){
 const indicators=entry.chart.getIndicators?.()||[];
 const separate=[...new Set(indicators.filter(i=>i?.paneId!=='candle_pane'&&!CANDLE_STUDIES.has(i?.name))
  .map(i=>i?.paneId||i?.name).filter(Boolean))];
 // Every oscillator gets room below a reserved, readable price chart.
 // Expand its host instead of packing 3-8 studies into a fixed 440px.
 const height=Math.max(460,330+125*separate.length);
 entry.naturalHeight=height;
 if(entry.host)entry.host.style.height=height+'px';
 entry.chart.resize?.();
 entry.chart.setPaneOptions?.({id:'candle_pane',height:270,minHeight:220,dragEnabled:true});
 for(const paneId of separate.filter(id=>!VALID_STUDIES.has(id)))
  entry.chart.setPaneOptions?.({id:paneId,height:110,minHeight:75,dragEnabled:true});
 entry.chart.resize?.();
 balancePanels();
 updateCompactReadout(entry);
}
function addStudyToChart(entry,name){
 if(!VALID_STUDIES.has(name))return false;
 const chart=entry.chart;
 if(chart.getIndicators?.({name})?.length)return false;
 const candleOverlay=CANDLE_STUDIES.has(name);
 // v10 requires the explicit candle pane id for price overlays.
 const id=chart.createIndicator(candleOverlay?{name,paneId:'candle_pane'}:name,candleOverlay);
 if(!id)return false;
 fitStudyPanes(entry);
 return true;
}
function addStudy(name){
 if(!VALID_STUDIES.has(name))return false;
 let added=false;
 for(const entry of state.charts)added=addStudyToChart(entry,name)||added;
 balancePanels();
 return added;
}
function removeStudy(name){
 if(!VALID_STUDIES.has(name))return false;
 let removed=false;
 for(const entry of state.charts){
  removed=entry.chart.removeIndicator({name})||removed;
  fitStudyPanes(entry);
 }
 balancePanels();
 return removed;
}
function initOne(id,type){
 const host=document.getElementById(id);
 const chart=window.klinecharts?.init?.(host,{styles:'dark',layout:{pane:{height:110,minHeight:75,dragEnabled:true}}});
 if(!chart)throw Error('KLineChart could not initialize');
 // KLineChart 10.1 supported incremental styles. Preserve native pixel
 // resolution and real bar values; presentation is consistent with Standard.
 chart.setStyles({
  grid:{
   horizontal:{show:true,color:'#20354a',style:'dashed',dashedValue:[3,5],size:1},
   vertical:{show:true,color:'#172b40',style:'dashed',dashedValue:[3,6],size:1}
  },
  candle:{
   type:'candle_solid',
   bar:{compareRule:'current_open',
    upColor:'#2bf2b1',downColor:'#ff648b',noChangeColor:'#b2c0d2',
    upBorderColor:'#27cba0',downBorderColor:'#f04c77',
    noChangeBorderColor:'#b2c0d2',
    upWickColor:'#9dffe1',downWickColor:'#ffabc0',
    noChangeWickColor:'#b2c0d2'},
   priceMark:{last:{show:true,upColor:'#2bf2b1',downColor:'#ff648b',noChangeColor:'#b2c0d2'}},
   tooltip:{showRule:'follow_cross'}
  },
  indicator:{tooltip:{showRule:'follow_cross'}},
  xAxis:{axisLine:{color:'#36516d'},tickText:{color:'#b1cbe0',size:11}},
  yAxis:{axisLine:{color:'#36516d'},tickText:{color:'#b1cbe0',size:11}},
  crosshair:{
   horizontal:{line:{show:true,color:'#7ea8c9',style:'dashed',dashedValue:[4,4],size:1}},
   vertical:{line:{show:true,color:'#7ea8c9',style:'dashed',dashedValue:[4,4],size:1}}
  }
 });
 const entry={id,chart,host};
 chart.setSymbol({ticker:state.symbol||'REPLAY',pricePrecision:4,volumePrecision:0});
 chart.setPeriod(period());
 chart.setDataLoader({getBars:({callback})=>{
  // v10: never append unrevealed or future candles.
  callback(state.bars.map(b=>({...b})),{forward:false,backward:false});
 }});
 try{addStudyToChart(entry,'VOL')}catch(e){console.warn('Volume indicator unavailable',e)}
 try{addStudyToChart(entry,'EMA')}catch(e){console.warn('EMA indicator unavailable',e)}
 if(type==='analysis')try{addStudyToChart(entry,'MACD')}catch(e){console.warn('MACD unavailable',e)}
 fitStudyPanes(entry);
 return entry;
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
 if(!state.visible.includes(tier)){status('This Studio is hidden from the menu.');renderChoices();return}
 if(!isEntitled(tier)){status('This engine is not included in your verified membership.');renderChoices();return}
 state.selected=tier;stopCharts();renderChoices();
 if(tier==='STANDARD'){status('Standard Crownlight chart is active.');window.dispatchEvent(new CustomEvent('crownlight:tier-mounted',{detail:{tier}}));return}
 const request=++state.version;
 if(tier==='ECHARTS'){
  status('Loading Apache ECharts revealed candlesticks and volume…');
  document.body.classList.add('cl-tier-enhanced');
  const enhanced=state.view.querySelector('[data-cl-tier-advanced]');enhanced.hidden=false;
  try{
   await window.CrownlightEChartsStudio.mount(enhanced.querySelector('[data-cl-tier-panels]'),state.bars,state.symbol,state.timeframe);
   if(request!==state.version||state.selected!=='ECHARTS'||!isEntitled('ECHARTS')){
    window.CrownlightEChartsStudio.unmount();return;
   }
   status('Apache ECharts active · '+state.bars.length+' revealed candles only.');
   window.dispatchEvent(new CustomEvent('crownlight:tier-mounted',{detail:{tier:'ECHARTS'}}));
  }catch(e){if(request===state.version){state.selected='STANDARD';stopCharts();renderChoices();status('ECharts unavailable; Standard remains available. '+(e?.message||''))}}
  return;
 }
 status('Loading '+tier.toLowerCase()+' charts…');
 const enhanced=state.view.querySelector('[data-cl-tier-advanced]');
 enhanced.hidden=false;
 try{
  await loadEngine();
  if(request!==state.version||!state.verified||!state.allowed.includes(tier)||!state.visible.includes(tier))return;
  document.body.classList.add('cl-tier-enhanced');
  makeView('cl-tier-primary','Technical analysis');
  if(tier==='PROFESSIONAL')makeView('cl-tier-secondary','Indicator study');
  state.charts.push(initOne('cl-tier-primary','primary'));
  if(tier==='PROFESSIONAL')state.charts.push(initOne('cl-tier-secondary','analysis'));
  balancePanels();
  state.charts.forEach(updateCompactReadout);
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
 select.title='Choose an included Studio, or click a lock-marked Studio name to review Lumens pricing.';
 for(const k of state.visible){const op=new Option(names[k]+' · Locked',k);op.disabled=true;select.append(op)}
 select.onchange=()=>void choose(select.value);
 label.append(select);
 state.notice=el('p','cl-chart-tier-status','Verifying chart membership…');
 state.notice.setAttribute('role','status');state.notice.setAttribute('aria-live','polite');
 const locked=el('div','cl-locked-items');locked.dataset.clLockedItems='';locked.hidden=true;
 const timer=el('p','cl-chart-tier-countdown');timer.dataset.clTierCountdown='';timer.hidden=true;
 timer.setAttribute('role','status');timer.setAttribute('aria-live','off');
 const dialog=el('dialog','cl-chart-price-dialog');dialog.id='cl-chart-tier-purchase-dialog';
 dialog.setAttribute('aria-label','Review locked Chart Studio Lumens cost');
 document.body.append(dialog);
 header.append(label,locked,state.notice);panel.append(header,timer);

 const enhanced=el('div','cl-chart-tier-enhanced');enhanced.dataset.clTierAdvanced='';enhanced.hidden=true;
 const tools=el('div','cl-chart-tier-tools');
 tools.append(el('strong','', 'KLineChart technical studies and drawings'));
 const indicator=el('select');
 indicator.setAttribute('aria-label','Add an indicator');
 for(const name of ['RSI','MACD','BOLL','MA','EMA','SMA','ATR','VOL'])indicator.add(new Option(name,name));
 const add=el('button','btn secondary','Add indicator');add.type='button';
 add.onclick=()=>{
  try{addStudy(indicator.value);
   const saved=document.querySelector('[data-cl-studies]');
   if(saved){const names=saved.value.split(',').map(x=>x.trim()).filter(Boolean);
    if(!names.includes(indicator.value))saved.value=[...names,indicator.value].join(', ')}
   status('Added '+indicator.value+' indicator. Save workspace to retain the study.')}
  catch{status('That study is not available in the current KLineChart build.')}
 };
 const remove=el('button','btn secondary','Remove indicator');remove.type='button';
 remove.onclick=()=>{
  let removed=false;
  try{removed=removeStudy(indicator.value)}catch{}
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
  if(state.selected==='ECHARTS')window.CrownlightEChartsStudio?.update(state.bars,state.symbol,state.timeframe);
   if(state.selected!=='STANDARD'&&state.charts.length){
  for(const entry of state.charts){
   try{entry.chart.setSymbol({ticker:state.symbol,pricePrecision:4,volumePrecision:0});entry.chart.setPeriod(period());entry.chart.resetData();updateCompactReadout(entry)}
   catch{status('An enhanced replay refresh failed. Standard remains available.')}
  }
  status(state.selected+': '+state.bars.length+' revealed candles. No future bars provided.');
 }
});
window.addEventListener('resize',balancePanels);
async function init(){
 if(!createControls())return;
 window.setInterval(updateCountdown,1000);
 await loadMenuVisibility();
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
     // Clear saved member-private controls before the new account is verified.
     window.dispatchEvent(new CustomEvent('crownlight:member-changed'));
    }
    if(event==='SIGNED_OUT'||event==='SIGNED_IN'||event==='TOKEN_REFRESHED'||differentUser)
     void permission();
   });
 }catch{}
}
window.CrownlightChartTiers={getInstances:()=>state.verified&&state.selected!=='STANDARD'?state.charts.slice():[],
 getRevealedBars:()=>state.bars.map(b=>({...b})),
 getStatus:()=>({
 tier:state.tier,selected:state.selected,allowed:[...state.allowed],visible:[...state.visible],revealed:state.bars.length,
 symbol:state.symbol,source:state.source,
 verified:state.verified,charts:state.charts.length,echartsReady:window.CrownlightEChartsStudio?.getStatus().ready===true,
 accessExpiry:state.accessExpiry,accessKind:state.accessKind,sparksAvailable:state.sparksAvailable
}),choose:t=>choose(t),addStudy,removeStudy,balancePanels};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void init());else void init();
})();