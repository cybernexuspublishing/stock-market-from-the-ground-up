/* Crownlight Live Candle Formation V1 — one-symbol, member-owned IEX stream.
 * FICTIONAL formation is isolated and explicitly labeled; it never touches the provider.
 * Only trade packets forwarded by our authenticated edge bridge reach this page.
 */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id);
 const nf=new Intl.NumberFormat('en-US',{maximumFractionDigits:4});
 const fmt=n=>Number.isFinite(n)?nf.format(n):'—';
 const chartLib=()=>root.LightweightCharts;
 const aggLib=()=>root.CrownlightLiveAggregator;
 const state={ws:null,mode:null,agg:null,chart:null,candles:null,volume:null,ema9:null,ema20:null,
   generation:0,renderQueued:false,closedByUser:false,demoTimer:null,demoTick:0,demoSpeed:1,demoPaused:false,canLive:false,
   getSession:null,getSymbol:null,resize:null,clock:null,sourceSymbol:'',ticks:0};
 function setStatus(label,kind='idle'){
  const el=$('cl-live-status');if(el){el.textContent=label;el.dataset.kind=kind}
 }
 function setMeta(text){if($('cl-live-meta'))$('cl-live-meta').textContent=text}
 function controls(){
  const running=!!state.mode;
  if($('cl-live-start'))$('cl-live-start').disabled=running||!state.canLive;
  if($('cl-live-demo'))$('cl-live-demo').disabled=running;
  if($('cl-live-stop'))$('cl-live-stop').disabled=!running;
  if($('cl-live-pause')){$('cl-live-pause').hidden=state.mode!=='demo';$('cl-live-pause').disabled=state.mode!=='demo';$('cl-live-pause').textContent=state.demoPaused?'Resume Fictional Formation':'Pause Fictional Formation';}
  if($('cl-live-speed')){$('cl-live-speed').disabled=state.mode!=='demo';$('cl-live-speed').value=String(state.demoSpeed);}
 }
 function setView(active){
  const stage=$('crownlight-live-stage');
  if(stage)stage.hidden=!active;
  document.querySelector('.crownlight-shell')?.classList.toggle('crownlight-live-suspended',active);
  const legacy=$('sim-chart');if(legacy)legacy.classList.toggle('crownlight-live-suspended',active);
  $('cl-live-playfield')?.toggleAttribute('hidden',!active);
 }
 function newChart(){
  if(!chartLib()?.createChart)throw Error('The chart engine is unavailable. Reload this page.');
  const mount=$('cl-live-plot');if(!mount)throw Error('The live chart panel could not be found.');
  if(state.chart){state.chart.remove();state.chart=null}mount.replaceChildren();
  const lib=chartLib();
  state.chart=lib.createChart(mount,{
   width:Math.max(300,mount.clientWidth),height:Math.max(350,mount.clientHeight),
   layout:{background:{type:'solid',color:'#060d20'},textColor:'#bfd5ec',fontFamily:'Inter,system-ui,sans-serif',fontSize:12},
   grid:{vertLines:{color:'rgba(82,119,158,.11)'},horzLines:{color:'rgba(82,119,158,.16)'}},
   rightPriceScale:{borderColor:'#375476',scaleMargins:{top:.08,bottom:.09}},
   timeScale:{borderColor:'#375476',timeVisible:true,secondsVisible:false,barSpacing:18,rightOffset:3},
   crosshair:{mode:lib.CrosshairMode?.Normal??0},
   handleScale:{mouseWheel:true,pinch:true},handleScroll:{pressedMouseMove:true,mouseWheel:false}
  });
  state.candles=state.chart.addSeries(lib.CandlestickSeries,{
   upColor:'#25f2b0',downColor:'#ff648a',borderUpColor:'#34dfb2',borderDownColor:'#ff7596',
   wickUpColor:'#a0ffe2',wickDownColor:'#ffaabe',lastValueVisible:true
  });
  state.volume=state.chart.addSeries(lib.HistogramSeries,{priceFormat:{type:'volume'},priceLineVisible:false},1);
  state.ema9=state.chart.addSeries(lib.LineSeries,{color:'#be8dff',lineWidth:2,priceLineVisible:false});
  state.ema20=state.chart.addSeries(lib.LineSeries,{color:'#35dfff',lineWidth:2,priceLineVisible:false});
  if(state.resize)state.resize.disconnect();
  state.resize=new ResizeObserver(()=>{if(state.chart)state.chart.resize(Math.max(300,mount.clientWidth),Math.max(350,mount.clientHeight))});
  state.resize.observe(mount);
 }
 function render(){
  state.renderQueued=false;
  if(!state.chart||!state.agg)return;
  const observed=state.agg.snapshot();
  if(!observed.length)return;
  const data=observed.map(b=>({time:Math.floor(Date.parse(b.time)/1000),open:b.open,high:b.high,low:b.low,close:b.close}));
  state.candles.setData(data);
  state.volume.setData(observed.map(b=>({time:Math.floor(Date.parse(b.time)/1000),value:b.volume,color:b.close>=b.open?'rgba(37,242,176,.64)':'rgba(255,100,138,.65)'})));
  const lib=root.CrownlightIndicatorMath;
  const closes=observed.map(b=>b.close);
  for(const [series,period] of [[state.ema9,9],[state.ema20,20]]){
   const values=lib?.ema(closes,period)||[];
   series.setData(values.map((v,i)=>Number.isFinite(v)?{time:data[i].time,value:v}:null).filter(Boolean));
  }
  const current=observed.at(-1);
  const et=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(current.time));
  if($('cl-live-ohlcv'))$('cl-live-ohlcv').textContent='O '+fmt(current.open)+'   H '+fmt(current.high)+'   L '+fmt(current.low)+'   C '+fmt(current.close)+'   Vol '+fmt(current.volume)+'   Trades '+fmt(current.tradeCount);
  if($('cl-live-bar'))$('cl-live-bar').textContent=(current.forming?'FORMING':'CLOSED')+' · '+et+' ET';
  if($('cl-live-last'))$('cl-live-last').textContent='$'+fmt(current.close);
  if($('cl-live-ticks'))$('cl-live-ticks').textContent=String(state.ticks);
  if(observed.length===1)state.chart.timeScale().fitContent();
 }
 function scheduleRender(){
  if(state.renderQueued)return;
  state.renderQueued=true;requestAnimationFrame(render);
 }
 function feedTrade(trade){
  if(!state.agg)return false;
  const result=state.agg.ingest(trade);
  if(!result.accepted)return false;
  state.ticks++;
  scheduleRender();return true;
 }
 function teardown(){
  state.generation++;
  state.closedByUser=true;
  if(state.demoTimer){clearInterval(state.demoTimer);state.demoTimer=null}
  if(state.clock){clearInterval(state.clock);state.clock=null}
  if(state.ws){const ws=state.ws;state.ws=null;try{ws.close(1000,'Member stopped live stream')}catch{}}
  if(state.chart){state.chart.remove();state.chart=null;state.candles=null;state.volume=null}
  if(state.resize){state.resize.disconnect();state.resize=null}
  state.agg=null;state.mode=null;state.demoPaused=false;controls();setView(false);
 }
 function stop(){teardown();setStatus('Stopped · historical replay is unchanged.','idle')}
 function begin(mode,symbol){
  teardown();state.closedByUser=false;state.mode=mode;state.sourceSymbol=symbol;state.agg=aggLib().create(symbol);state.ticks=0;
  setView(true);newChart();controls();
  if($('cl-live-symbol'))$('cl-live-symbol').textContent=symbol+' · 1-minute';
 }
 async function connectLive(){
  if(!state.canLive){setStatus('Your plan does not include connected-provider streaming. Use fictional formation instead.','error');return}
  const symbol=String(state.getSymbol?.()||'').trim().toUpperCase();
  if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol)){setStatus('Enter a valid ticker before connecting.','error');return}
  try{begin('iex',symbol)}catch(e){setStatus(e.message,'error');return}
  state.clock=setInterval(()=>{if(state.mode==='iex'&&state.agg?.finalizeAt(Date.now()-1000))scheduleRender()},1000);
  setStatus('Verifying your private Alpaca IEX connection…','connecting');
  setMeta('Actual IEX trades only · data may be quiet outside market sessions · one active Alpaca stream per key.');
  const gen=state.generation;
  try{
   const token=(await state.getSession?.())?.access_token;
   if(!token)throw Error('Sign in required.');
   const r=await fetch('/api/live-market-ticket',{method:'POST',
    headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({symbol}),cache:'no-store'});
   const payload=await r.json().catch(()=>({}));
   if(!r.ok||!payload.ok)throw Error(payload.error||'The live stream could not be authorized.');
   if(gen!==state.generation)return;
   const protocol=location.protocol==='https:'?'wss:':'ws:';
   const ws=new WebSocket(protocol+'//'+location.host+'/api/live-market-stream',['crownlight-v1','ticket.'+payload.ticket]);
   state.ws=ws;
   ws.onopen=()=>{if(gen===state.generation)setStatus('Connecting to Alpaca IEX — awaiting authentication…','connecting')};
   ws.onmessage=event=>{
    if(gen!==state.generation)return;
    let packet;try{packet=JSON.parse(event.data)}catch{return}
    if(packet.type==='status'){
     if(packet.state==='streaming')setStatus('LIVE IEX · Connected · '+symbol,'live');
     else if(packet.state==='authenticated')setStatus('IEX authenticated · subscribing to '+symbol+'…','connecting');
     else if(packet.state==='disconnected')setStatus('IEX disconnected. Select Start to connect again.','error');
    }else if(packet.type==='error'){
     const message={CONNECTION_LIMIT:'Alpaca allows only one active data stream for this key. Close the other streaming app or tab, then retry.',
       ACCESS_DENIED:'Alpaca denied the keys or your account lacks IEX stream access.',
       PROVIDER_UNAVAILABLE:'Alpaca market streaming is unavailable.'};
     setStatus(message[packet.code]||'The stream was interrupted.','error');
    }else if(packet.type==='trade'){feedTrade(packet.trade)}
   };
   ws.onerror=()=>{if(gen===state.generation)setStatus('Connection interrupted. Check Alpaca stream access and retry.','error')};
   ws.onclose=()=>{if(gen===state.generation){state.ws=null;if(!$('cl-live-status')?.dataset.kind?.includes('error'))setStatus('Stream closed · select Start to reconnect.','idle');
    state.mode=null;if(state.clock){clearInterval(state.clock);state.clock=null}controls()}}
  }catch(e){if(gen!==state.generation)return;setStatus(e.message||'Unable to open the live feed.','error');state.mode=null;controls()}
 }
 function practice(){
  const symbol='DEMO';
  try{begin('demo',symbol)}catch(e){setStatus(e.message,'error');return}
  state.demoPaused=false;
  setStatus('FICTIONAL FORMATION · '+state.demoSpeed+'× teaching speed','demo');
  setMeta('ORIGINAL FICTIONAL PRICES · NOT A MARKET FEED · '+state.demoSpeed+'× teaching speed. Each source candle forms over a simulated minute.');
  const gen=state.generation;
  let price=100,seq=0;
  const start=Date.parse('2026-10-22T13:30:00Z');
  const tick=()=>{
   if(gen!==state.generation||state.mode!=='demo'||state.demoPaused)return;
   const drift=Math.sin(seq*.61)*.19+Math.cos(seq*.27)*.11;
   price=Math.max(1,Math.round((price+drift)*10000)/10000);
   const size=20+((seq*37)%310);
   feedTrade({T:'t',S:'DEMO',t:new Date(start+seq*3000).toISOString(),p:price,s:size,i:seq+1});seq++;
  };
  state.demoTick=tick;tick();scheduleDemoClock();controls();
 }
 function scheduleDemoClock(){
  if(state.demoTimer){clearInterval(state.demoTimer);state.demoTimer=null}
  if(state.mode!=='demo'||state.demoPaused)return;
  state.demoTimer=setInterval(()=>state.demoTick?.(),3000/state.demoSpeed);
 }
 function toggleDemoPause(){
  if(state.mode!=='demo')return;
  state.demoPaused=!state.demoPaused;
  scheduleDemoClock();controls();
  setStatus(state.demoPaused?'FICTIONAL FORMATION PAUSED':'FICTIONAL FORMATION · '+state.demoSpeed+'× teaching speed','demo');
 }
 function setDemoSpeed(){
  const speed=Number($('cl-live-speed')?.value);
  if(![0.1,0.25,0.5,1].includes(speed))return;
  state.demoSpeed=speed;scheduleDemoClock();controls();
  if(state.mode==='demo')setMeta('ORIGINAL FICTIONAL PRICES · NOT A MARKET FEED · '+speed+'× teaching speed. Each source candle forms over a simulated minute.');
 }
 function initialize({canLive=false,getSession,getSymbol}={}){
  if(!$('cl-live-start')||!aggLib())return;
  state.canLive=canLive;state.getSession=getSession;state.getSymbol=getSymbol;
  $('cl-live-start').onclick=connectLive;
  $('cl-live-demo').onclick=practice;
  $('cl-live-stop').onclick=stop;
  if($('cl-live-pause'))$('cl-live-pause').onclick=toggleDemoPause;
  if($('cl-live-speed'))$('cl-live-speed').onchange=setDemoSpeed;
  window.addEventListener('pagehide',teardown,{once:true});
  controls();
 }
 root.CrownlightLive={initialize,stop,getStatus:()=>({mode:state.mode,ticks:state.ticks,connected:state.ws?.readyState===1})};
})(window);
