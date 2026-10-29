/* Historical Replay Classroom V1.
 * Presentation only. Consumes server-revealed observations, never future bars.
 * First decision, user permissions, storage and advancement stay server-owned.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const speeds=[120,90,60,45,30,20,15,10,5,2,1];
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const time=ms=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ms));
let bars=[],focus=0,frame=1,seconds=60,playing=false,timer=null,checkpoint=false,dataset=null,memberId=null;
let state={sessionId:'',locked:false,busy:false};
function stop(message){playing=false;if(timer)clearTimeout(timer);timer=null;if($('hr-play'))$('hr-play').textContent='Play';if(message&&$('hr-status'))$('hr-status').textContent=message}
function parse(b){
 const ms=Date.parse(b?.timestamp),o=Number(b?.open),h=Number(b?.high),l=Number(b?.low),c=Number(b?.close),v=Number(b?.volume);
 if(!Number.isFinite(ms)||![o,h,l,c,v].every(Number.isFinite)||o<=0||l<=0||h<Math.max(o,c,l)||l>Math.min(o,c,h)||v<0)return null;
 return {ms,o,h,l,c,v};
}
function aggregate(source,k){
 if(k===1)return source.map(b=>({...b,end:b.ms+60000}));
 let grouped=[];
 for(let i=0;i+k<=source.length;i++){
  const a=source.slice(i,i+k);
  if(a[0].ms%(k*60000)!==0||!a.every((b,j)=>j===0||b.ms-a[j-1].ms===60000))continue;
  grouped.push({ms:a[0].ms,end:a[k-1].ms+60000,o:a[0].o,h:Math.max(...a.map(b=>b.h)),
    l:Math.min(...a.map(b=>b.l)),c:a[k-1].c,v:a.reduce((sum,b)=>sum+b.v,0)});
 }return grouped;
}
function draw(){
 const svg=$('hr-chart');if(!svg)return;
 const visible=bars.slice(0,focus),grouped=aggregate(visible,frame),windowBars=grouped.slice(-36);
 const last=grouped.at(-1);
 $('hr-clock').textContent=last?time(last.end)+' ET · completed '+frame+'m':'Awaiting completed '+frame+'m bar';
 $('hr-count').textContent=bars.length+' revealed source bars · '+grouped.length+' completed '+frame+'m bars';
 $('hr-review').disabled=bars.length<2;$('hr-review').max=String(Math.max(1,bars.length));$('hr-review').value=String(Math.max(1,focus));
 $('hr-review-state').textContent=focus<bars.length?'Reviewing previously revealed bars; server cursor unchanged':'At latest revealed bar';
 $('hr-ohlcv').textContent=last?'O $'+last.o.toFixed(3)+' · H $'+last.h.toFixed(3)+' · L $'+last.l.toFixed(3)+' · C $'+last.c.toFixed(3)+' · Volume '+last.v.toLocaleString('en-US'):'No completed bar at this interval; partial higher-timeframe candles stay hidden.';
 svg.replaceChildren();
 if(windowBars.length){
  const ns='http://www.w3.org/2000/svg',priceLow=Math.min(...windowBars.map(b=>b.l)),priceHigh=Math.max(...windowBars.map(b=>b.h)),pad=Math.max((priceHigh-priceLow)*.1,.025);
  const low=priceLow-pad,high=priceHigh+pad,y=p=>18+(high-p)*184/(high-low),gap=540/Math.max(windowBars.length,7),cw=Math.min(21,gap*.55),maxV=Math.max(...windowBars.map(b=>b.v),1);
  const add=(tag,attrs,text)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;svg.append(n)};
  for(let i=0;i<5;i++){let p=low+(high-low)*i/4;add('line',{x1:67,y1:y(p),x2:615,y2:y(p),stroke:'#67839c','stroke-opacity':.3});add('text',{x:3,y:y(p)+4,fill:'#c5d4df','font-size':12},p.toFixed(2))}
  windowBars.forEach((b,i)=>{const x=70+(i+.5)*gap,color=b.c>=b.o?'#23cba0':'#e87592';
   add('line',{x1:x,y1:y(b.h),x2:x,y2:y(b.l),stroke:color,'stroke-width':2});
   add('rect',{x:x-cw/2,y:y(Math.max(b.o,b.c)),width:cw,height:Math.max(2,Math.abs(y(b.o)-y(b.c))),fill:color});
   add('rect',{x:x-cw/2,y:272-47*b.v/maxV,width:cw,height:47*b.v/maxV,fill:color,opacity:.7});
   if(i===0||i===windowBars.length-1||i%Math.max(1,Math.ceil(windowBars.length/6))===0)add('text',{x,y:296,fill:'#bbcddb','font-size':11,'text-anchor':'middle'},time(b.end));
  });
 }
 svg.setAttribute('aria-label',grouped.length+' completed '+frame+' minute candles from server-revealed history only');
 const current=grouped.at(-1),before=grouped.at(-2);
 let heading='Start with observable evidence',copy='Select a published, authorized historical dataset and start the replay.';
 if(current){
  heading=grouped.length<=2?'Read the opening range':grouped.length<=5?'Confirm price structure':grouped.length<=10?'Compare price and volume':'Evaluate the evidence';
  copy='The most recently completed '+frame+'-minute candle closed at $'+current.c.toFixed(3)+'. Its high was $'+current.h.toFixed(3)+', low $'+current.l.toFixed(3)+', and source volume '+current.v.toLocaleString('en-US')+' shares. '+
    (before?('Its close was '+(current.c>=before.c?'at or above':'below')+' the preceding close. '):'This is the first completed observation. ')+
    'Explain the evidence, uncertainty, invalidation and possible NO TRADE decision before revealing later observations.';
 }
 $('hr-talia-topic').textContent=heading;$('hr-talia-copy').textContent=copy;
 const selector=$('sim-timeframe');if(selector)selector.value=frame+'-minute';
 const studio=window.CrownlightStudio;
 const candles=grouped.map(b=>({time:new Date(b.ms),open:b.o,high:b.h,low:b.l,close:b.c,volume:b.v}));
 if(candles.length&&studio?.render){
  try{const mounted=studio.render({candles,index:candles.length-1,sourceProvider:'Verified server historical replay',sourceName:String(dataset?.ticker||'HISTORICAL'),sourceNote:String(dataset?.sourceAttribution||'Published rights-approved observations'),isServerReplay:true,position:null,user:{id:memberId}});
   document.body.classList.toggle('hr-studio-mounted',mounted===true);
   const shell=document.querySelector('.crownlight-shell');if(shell)shell.hidden=mounted!==true;
  }catch{document.body.classList.remove('hr-studio-mounted')}
 }else{document.body.classList.remove('hr-studio-mounted');const shell=document.querySelector('.crownlight-shell');if(shell)shell.hidden=true;}
}
function schedule(){
 if(!playing||timer||!state.sessionId||!state.locked||state.busy||focus!==bars.length)return;
 timer=setTimeout(()=>{timer=null;const btn=$('vr-advance');
  if(!playing||!state.locked||state.busy||!btn||btn.disabled||focus!==bars.length){stop('Replay paused or unable to advance.');return}
  btn.click();
 },seconds*1000);
}
function reset(){
 stop('Select a reviewed dataset to begin.');bars=[];focus=0;checkpoint=false;dataset=null;memberId=null;state={sessionId:'',locked:false,busy:false};
 window.CrownlightStudio?.clearMemberState?.();document.body.classList.remove('hr-studio-mounted');draw();
}
function observation(e){
 const b=parse(e.detail?.bar);if(!b)return;
 if(bars.some(x=>x.ms===b.ms))return;
 if(bars.length&&b.ms<=bars.at(-1).ms){stop('Non-chronological observation; refresh the replay.');return}
 const end=focus===bars.length;bars.push(b);if(end)focus=bars.length;
 draw();
 if($('hr-autopause').checked&&bars.length>1&&bars.length%5===0){checkpoint=true;stop('Talia checkpoint: review these completed candles before resuming.')}
 else if(!checkpoint)schedule();
}
function stateChange(e){
 state=e.detail||state;
 if(!state.sessionId){reset();return}
 if(!state.locked)stop('Lock your first evidence-based decision before playback.');
 else if(!state.busy&&!checkpoint)schedule();
}
function catalog(e){
 const q=new URLSearchParams(location.search),ticker=String(q.get('ticker')||'').toUpperCase(),date=q.get('date');
 if(!/^[A-Z][A-Z0-9.]{0,11}$/.test(ticker)||!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return;
 const matches=(e.detail?.datasets||[]).filter(x=>x.ticker===ticker&&x.date===date);
 $('hr-case').textContent=ticker+' · '+date;
 $('hr-case-status').textContent=matches.length?
 'An authorized dataset is available. Select the matching dataset and Start Replay.':
 'No rights-approved historical dataset is published for this case. Use the independent Lab instructions instead; no fictional bars will be shown as DIS.';
}
function init(){
 const section=$('vr-session');if(!section||$('hr-classroom'))return;
 const source=$('vr-source'),fig=$('vr-visible-chart').closest('figure'),table=$('vr-bars').closest('.v11-matrix'),plan=$('vr-plan'),actions=$('vr-advance').closest('.journal-actions');
 const wrap=el('div','hr-classroom');wrap.id='hr-classroom';
 const left=el('section','hr-chart-col'),right=el('aside','hr-talia-col');
 left.setAttribute('aria-label','Historical candle chart and playback');
 right.setAttribute('aria-label','Talia synchronized instruction');
 const head=el('div','hr-chart-head');head.append(el('strong','', 'Historical candles · verified data'),el('span','', ''));head.lastChild.id='hr-clock';
 const q=new URLSearchParams(location.search),caseName=el('p','hr-case');caseName.id='hr-case';caseName.textContent=q.get('ticker')&&q.get('date')?q.get('ticker')+' · '+q.get('date'):'Select an authorized historical case';
 const caseStatus=el('p','hr-case-status','Only published, rights-approved datasets are displayed.');caseStatus.id='hr-case-status';
 const frameLabel=el('label','', 'Candle interval'),frameChoice=el('select');frameChoice.id='hr-timeframe';frameChoice.setAttribute('aria-label','Completed chart candle interval');
 for(const n of [1,3,5,15])frameChoice.add(new Option(n+' minute'+(n===1?'':'s'),String(n)));
 const requested=Number(q.get('timeframe'));frame=[1,3,5,15].includes(requested)?requested:1;frameChoice.value=String(frame);
 frameChoice.onchange=()=>{frame=Number(frameChoice.value);draw()};frameLabel.append(frameChoice);
 const chartPanel=el('div','sim-chart-panel');chartPanel.setAttribute('aria-label','Crownlight Chart Studio historical candles');
 const backing=el('canvas','hr-canvas');backing.id='sim-chart';chartPanel.append(backing);
 const frameSync=el('select');frameSync.id='sim-timeframe';frameSync.hidden=true;[1,3,5,15].forEach(n=>frameSync.add(new Option(n+' minute',n+'-minute')));
 const svg=el('svg','hr-chart');svg.id='hr-chart';svg.setAttribute('viewBox','0 0 630 315');svg.setAttribute('role','img');svg.setAttribute('aria-label','No historical observations loaded yet.');
 const ohlcv=el('p','hr-ohlcv');ohlcv.id='hr-ohlcv';
 const count=el('p','hr-meta');count.id='hr-count';
 const toolbar=el('div','hr-toolbar'),play=el('button','btn secondary','Play');play.type='button';play.id='hr-play';
 play.onclick=()=>{if(playing){stop();return}if(!state.locked){$('hr-status').textContent='Lock the first decision before starting playback.';return}
  if(focus!==bars.length){$('hr-status').textContent='Select Latest revealed before playback.';return}
  checkpoint=false;playing=true;play.textContent='Pause';$('hr-status').textContent='Playing server-revealed source candles';schedule();
 };
 const speedLabel=el('label','', 'Playback speed'),speed=el('select');speed.setAttribute('aria-label','Seconds per one-minute source observation');
 for(const x of speeds)speed.add(new Option(x+' sec / 1m source candle',String(x)));
 speed.value='60';speed.onchange=()=>{seconds=Number(speed.value);if(timer)clearTimeout(timer);timer=null;schedule()};speedLabel.append(speed);
 const prev=el('button','btn secondary','Review previous');prev.type='button';prev.onclick=()=>{stop();focus=Math.max(1,focus-1);draw()};
 const next=el('button','btn secondary','Review next');next.type='button';next.onclick=()=>{focus=Math.min(bars.length,focus+1);draw()};
 const latestBtn=el('button','btn secondary','Latest revealed');latestBtn.type='button';latestBtn.onclick=()=>{focus=bars.length;draw()};
 toolbar.append(play,speedLabel,prev,next,latestBtn);
 const reviewLabel=el('label','hr-review-label','Review earlier revealed candles'),review=el('input');
 review.id='hr-review';review.type='range';review.min='1';review.max='1';review.step='1';review.disabled=true;
 review.oninput=()=>{stop();focus=Number(review.value);draw()};reviewLabel.append(review);
 const reviewState=el('p','hr-meta');reviewState.id='hr-review-state';
 const pauseLabel=el('label','hr-checkpoint'),pause=el('input');pause.id='hr-autopause';pause.type='checkbox';pause.checked=true;
 pauseLabel.append(pause,document.createTextNode(' Pause for Talia every five source candles.'));
 const status=el('p','hr-meta','Lock the first decision before playing.');status.id='hr-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const original=el('details','hr-original');original.append(el('summary','', 'Original OHLCV table and chart'),fig,table);
 left.append(head,caseName,caseStatus,frameLabel,frameSync,chartPanel,svg,ohlcv,count,toolbar,reviewLabel,reviewState,pauseLabel,status,actions,original);
 right.append(el('h3','hr-talia-title','Talia · Historical Replay Instructor'));
 const topic=el('h4','', 'Start with observable evidence');topic.id='hr-talia-topic';
 const copy=el('p','', 'Instructor feedback will follow the revealed candles.');copy.id='hr-talia-copy';
 right.append(topic,copy,el('p','hr-meta','Record evidence, invalidation and NO TRADE criteria before viewing later bars. Review is not a new blind assessment.'),plan);
 wrap.append(left,right);source.after(wrap);document.body.classList.add('historical-classroom');
 window.addEventListener('groundup:replay-reset',reset);
 window.addEventListener('groundup:replay-observation',observation);
 window.addEventListener('groundup:replay-state',stateChange);
 window.addEventListener('groundup:replay-catalog',catalog);
 window.addEventListener('groundup:replay-dataset',e=>{dataset=e.detail?.dataset||null;memberId=e.detail?.memberId||null;draw()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop('Paused because the tab is hidden.')});
 draw();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();