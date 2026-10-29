let SIM={sb:null,user:null,candles:[],index:0,startIndex:0,maxIndexSeen:0,timer:null,position:null,journalId:null,linkedJournalId:null,planLocked:false,ambiguous:null,sourceName:null,sourceProvider:'csv_upload',originalFictional:false,contextEnvelope:null};
const $=id=>document.getElementById(id);
const JT=()=>window.JournalTools;
function simulatorQuotaMessage(text){const s=String(text||'');if(s.includes('FREE_WEEKLY_SIMULATOR_LIMIT_REACHED'))return 'Your weekly free browser simulator save allowance is used. It resets Monday 00:00 UTC; paid Simulator access provides additional eligible saves.';if(s.includes('FREE_WEEKLY_JOURNAL_LIMIT_REACHED'))return 'Your weekly free Journal allowance is used. Saved browser simulations also use Journal slots. Resets Monday 00:00 UTC.';return s;}
function smsg(id,text,type=''){const e=$(id);if(!e)return;e.textContent=text||'';e.className=`status-message ${type}`}
function n(v){const x=Number(v);return Number.isFinite(x)?x:null}
function fmt(v,d=4){return Number.isFinite(Number(v))?Number(v).toFixed(d):'—'}
function money(v){return Number.isFinite(Number(v))?Number(v).toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:2}):'—'}
// CSV timestamps must carry a timezone when intraday. Browser-local parsing
// changes across member devices and is not acceptable as historical evidence.
function parseTimestamp(row){
 const raw=String(row.timestamp||row.datetime||row.date_time||row.time_stamp||
  (row.date&&row.time?`${row.date}T${row.time}`:row.date)||'').trim();
 const valid=/^\d{4}-\d{2}-\d{2}(?:[T ][0-2]\d:[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d))?$/i;
 if(!valid.test(raw))return null;
 const year=Number(raw.slice(0,4)),month=Number(raw.slice(5,7)),day=Number(raw.slice(8,10));
 const cal=new Date(Date.UTC(year,month-1,day));
 if(cal.getUTCFullYear()!==year||cal.getUTCMonth()+1!==month||cal.getUTCDate()!==day)
  return null; // Date.parse may normalize impossible dates such as Feb 30.
 const d=new Date(raw);return Number.isFinite(d.getTime())?d:null;
}
const SIM_CSV_MAX_BYTES=4*1024*1024,SIM_CSV_MAX_BARS=20000;
function parseCSV(text){
 if(typeof text!=='string'||text.length>SIM_CSV_MAX_BYTES)
  throw Error('CSV exceeds the 4 MiB browser practice limit.');
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());
 if(lines.length<3)throw Error('CSV needs a header and at least two OHLCV candles.');
 if(lines.length>SIM_CSV_MAX_BARS+1)throw Error('CSV has over 20,000 candles; narrow the practice window.');
 const headers=splitCSVLine(lines[0]).map(x=>x.trim().toLowerCase());
 const required=['open','high','low','close','volume'];
 const timeHeaders=['timestamp','datetime','date_time','time_stamp','date'];
 if(required.some(k=>headers.filter(h=>h===k).length!==1)||
  !timeHeaders.some(k=>headers.includes(k))||
  new Set(headers).size!==headers.length)
  throw Error('CSV requires unique timestamp,open,high,low,close,volume columns.');
 const rows=[],seen=new Set();
 for(let i=1;i<lines.length;i++){
  const parts=splitCSVLine(lines[i]);
  if(parts.length!==headers.length)
   throw Error('CSV row '+(i+1)+' has '+parts.length+' cells; expected '+headers.length+'.');
  const row={};headers.forEach((h,j)=>row[h]=parts[j].trim());
  const ts=parseTimestamp(row);
  if(!ts)throw Error('CSV row '+(i+1)+' needs a valid ISO date or timezone-qualified timestamp.');
  const num=key=>/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(row[key])?
   Number(row[key]):NaN;
  const open=num('open'),high=num('high'),low=num('low'),close=num('close'),volume=num('volume');
  if(![open,high,low,close,volume].every(Number.isFinite)||
    Math.min(open,high,low,close)<=0||volume<0||
    high<Math.max(open,close)||low>Math.min(open,close)||high<low)
   throw Error('CSV row '+(i+1)+' has an invalid OHLCV value, zero/negative price, or impossible range.');
  const at=ts.getTime();
  if(seen.has(at))throw Error('CSV row '+(i+1)+' repeats an existing timestamp. Resolve duplicate bars before replay.');
  seen.add(at);
  rows.push({time:ts,open,high,low,close,volume});
 }
 rows.sort((a,b)=>a.time-b.time);
 return rows;
}
function splitCSVLine(line){const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++}else q=!q}else if(c===','&&!q){out.push(cur);cur=''}else cur+=c}out.push(cur);return out}
function current(){return SIM.candles[SIM.index]||null}
function etParts(d){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);const o=Object.fromEntries(parts.map(p=>[p.type,p.value]));return {date:`${o.year}-${o.month}-${o.day}`,time:`${o.hour}:${o.minute}:00`,label:`${o.month}/${o.day}/${o.year} ${o.hour}:${o.minute} ET`}}
function setEnabled(){const loaded=SIM.candles.length>0,locked=SIM.planLocked,open=!!SIM.position?.open,closed=!!SIM.position?.closed,advanced=SIM.maxIndexSeen>SIM.startIndex;$('sim-reset').disabled=!loaded||open||locked||advanced;$('sim-prev').disabled=!loaded||!closed||SIM.index<=0;$('sim-next').disabled=!loaded||SIM.index>=SIM.candles.length-1||!!SIM.ambiguous||closed;$('sim-play').disabled=!loaded||SIM.index>=SIM.candles.length-1||!!SIM.ambiguous||closed;$('sim-lock-plan').disabled=!loaded||locked||closed;$('sim-enter').disabled=!loaded||!locked||open||closed;$('sim-exit').disabled=!open||!!SIM.ambiguous;$('load-csv').disabled=(locked&&loaded)||open||closed;if($('load-provider'))$('load-provider').disabled=(locked&&loaded)||open||closed;if($('sim-load-fictional'))$('sim-load-fictional').disabled=(locked&&loaded)||open||closed;$('sim-csv').disabled=(locked&&loaded)||open||closed;['sim-source','sim-start-date','sim-end-date','sim-resample'].forEach(id=>{const e=$(id);if(e)e.disabled=(locked&&loaded)||open||closed});['sim-direction','sim-shares','sim-stop','sim-target','sim-thesis','sim-entry-reason','sim-trigger','sim-invalidation'].forEach(id=>{const e=$(id);if(e)e.disabled=locked})}
function resetReplay(){if(SIM.planLocked||SIM.maxIndexSeen>SIM.startIndex){smsg('sim-replay-msg','Reset is disabled after future bars have been revealed or the plan is locked. This preserves no-look-ahead integrity.','error');return}pause();SIM.ambiguous=null;$('sim-ambiguous').hidden=true;SIM.index=SIM.startIndex;SIM.maxIndexSeen=SIM.startIndex;SIM.position=null;renderAll();smsg('sim-replay-msg',`Replay reset to bar ${SIM.index+1} of ${SIM.candles.length}.`,'success')}
function renderAll(){
 const chartPanel=document.querySelector('.sim-chart-panel');
 const waiting=SIM.candles.length===0;
 if(chartPanel)chartPanel.classList.toggle('sim-awaiting-data',waiting);
 if($('sim-awaiting-data'))$('sim-awaiting-data').hidden=!waiting;
 renderChart();renderState();renderAccessibleBars();setEnabled();
}
function renderAccessibleBars(){
 const summary=$('sim-candle-accessible'),body=$('sim-visible-bars'),caption=$('sim-candle-table-caption');
 if(!summary||!body||!caption)return;
 const bar=current();body.replaceChildren();
 if(!bar){summary.textContent='No candles loaded. Choose Free fictional starter or import your own CSV.';caption.textContent='No revealed OHLCV observations yet';return}
 const classification=SIM.originalFictional===true?'ORIGINAL FICTIONAL (not market history)':
  ['tiingo_byo','alpaca_byo'].includes(SIM.sourceProvider)?'USER-CONNECTED provider observations (not independently verified)':
  'USER-SUPPLIED CSV (not independently verified)';
 const visible=SIM.index+1;
 const time=etParts(bar.time).label;
 summary.textContent=classification+' · Revealed candle '+visible+' of '+SIM.candles.length+
  ' · '+time+' · Open '+fmt(bar.open,4)+', High '+fmt(bar.high,4)+
  ', Low '+fmt(bar.low,4)+', Close '+fmt(bar.close,4)+
  ', Volume '+Math.round(bar.volume).toLocaleString('en-US')+
  '. The next candle remains undisclosed in the interface.';
 // Bounded table avoids adding thousands of DOM nodes on large member CSVs.
 // Deliberately never render SIM.candles beyond the member's revealed cursor.
 const start=Math.max(0,SIM.index-24);
 for(let i=start;i<=SIM.index;i++){
  const c=SIM.candles[i],tr=document.createElement('tr');
  const items=[etParts(c.time).label,fmt(c.open,4),fmt(c.high,4),
   fmt(c.low,4),fmt(c.close,4),Math.round(c.volume).toLocaleString('en-US')];
  for(let j=0;j<items.length;j++){
   const cell=document.createElement(j===0?'th':'td');
   if(j===0)cell.scope='row';
   cell.textContent=items[j];tr.append(cell);
  }
  body.append(tr);
 }
 caption.textContent='Last '+(SIM.index-start+1)+' of '+visible+' revealed OHLCV candles · '+classification;
}
function renderState(){const badge=$('cl-chart-timeframe');if(badge){const label=String($('sim-timeframe')?.value||'').trim();badge.textContent=label?label+' · display label':'Timeframe —';window.CrownlightWorkbenchLayout?.syncDisplayTimeframe?.();}const c=current();if(!c){$('sim-symbol-line').textContent='No dataset loaded';$('sim-bar-time').textContent='—';$('sim-last-price').textContent='—';return}const ep=etParts(c.time);$('sim-symbol-line').textContent=`${$('sim-ticker').value.trim().toUpperCase()||'SYMBOL'} · Bar ${SIM.index+1}/${SIM.candles.length} · future hidden`;$('sim-bar-time').textContent=ep.label;$('sim-last-price').textContent=money(c.close);const pos=SIM.position;$('sim-position-status').textContent=pos?.open?'OPEN':pos?.closed?'CLOSED':'FLAT';$('sim-entry-price').textContent=pos?.entry!=null?money(pos.entry):'—';let upnl=null,mfe=null,mae=null;if(pos?.open){upnl=(pos.direction==='LONG'?(c.close-pos.entry):(pos.entry-c.close))*pos.shares;const hi=pos.highest,lo=pos.lowest;mfe=Math.max(0,pos.direction==='LONG'?hi-pos.entry:pos.entry-lo);mae=Math.max(0,pos.direction==='LONG'?pos.entry-lo:hi-pos.entry)}$('sim-unrealized').textContent=upnl==null?'—':money(upnl);$('sim-unrealized').className=upnl>0?'sim-positive':upnl<0?'sim-negative':'sim-neutral';$('sim-excursion').textContent=mfe==null?'—':`MFE ${fmt(mfe)} / MAE ${fmt(mae)}`;renderMetrics()}
function renderMetrics(){const box=$('sim-metrics');const p=SIM.position;if(!p){box.innerHTML=[['Status','No trade'],['Journal','—'],['MFE','—'],['MAE','—']].map(([a,b])=>`<div class="metric-box"><span>${a}</span><strong>${b}</strong></div>`).join('');return}const row={direction:p.direction,share_quantity:p.shares,actual_entry:p.entry,actual_exit:p.exit,planned_stop:p.stop,highest_while_open:p.highest,lowest_while_open:p.lowest,fees:0,trade_date:p.entryDate,exit_date:p.exitDate,entry_time_et:p.entryTime,exit_time_et:p.exitTime,status:p.closed?'closed':'open'};const m=JT().compute(row);const vals=[['Status',p.closed?'Closed':'Open'],['Gross P&L',m.gross_pnl==null?'—':money(m.gross_pnl)],['Result in R',m.r_multiple==null?'—':`${fmt(m.r_multiple,2)}R`],['MFE',m.mfe_r==null?`${fmt(m.mfe_per_share)} / sh`:`${fmt(m.mfe_r,2)}R`],['MAE',m.mae_r==null?`${fmt(m.mae_per_share)} / sh`:`${fmt(m.mae_r,2)}R`],['MFE captured',m.mfe_capture_pct==null?'—':`${fmt(m.mfe_capture_pct,1)}%`],['Exit',p.exit==null?'—':money(p.exit)],['Journal ID',SIM.journalId||'—']];box.innerHTML=vals.map(([a,b])=>`<div class="metric-box"><span>${a}</span><strong>${b}</strong></div>`).join('')}
function sessionInfo(d){const ep=etParts(d),[h,m]=ep.time.split(':').map(Number),mins=h*60+m;if(mins<240)return {name:'Overnight',fill:'rgba(83,61,135,.18)'};if(mins<570)return {name:'Premarket',fill:'rgba(43,62,93,.22)'};if(mins<960)return {name:'Regular',fill:'rgba(46,91,65,.18)'};if(mins<1200)return {name:'After-hours',fill:'rgba(91,56,56,.20)'};return {name:'Overnight',fill:'rgba(83,61,135,.18)'}}
function renderChart(){if(window.CrownlightStudio?.render(SIM)===true)return;const canvas=$('sim-chart'),ctx=canvas.getContext('2d');const cssW=Math.max(320,canvas.clientWidth||1000),cssH=Math.min(620,Math.max(380,Math.round(cssW*.58))),dpr=window.devicePixelRatio||1;canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssW,cssH);ctx.fillStyle='#071522';ctx.fillRect(0,0,cssW,cssH);if(!SIM.candles.length)return;const end=SIM.index,start=Math.max(0,end-119),bars=SIM.candles.slice(start,end+1);const pad={l:58,r:18,t:20,b:82},priceH=cssH-pad.t-pad.b,volH=58,mainH=priceH-volH-12;const min=Math.min(...bars.map(b=>b.low)),max=Math.max(...bars.map(b=>b.high));const range=Math.max(0.000001,max-min);const y=v=>pad.t+(max-v)/range*mainH;const w=(cssW-pad.l-pad.r)/Math.max(1,bars.length),body=Math.max(2,Math.min(9,w*.58));
  // Session shading and day separators.
  let lastDate=null;bars.forEach((b,i)=>{const x=pad.l+i*w,info=sessionInfo(b.time),ep=etParts(b.time);ctx.fillStyle=info.fill;ctx.fillRect(x,pad.t,w,mainH+volH+12);if(lastDate!==null&&ep.date!==lastDate){ctx.strokeStyle='rgba(239,192,79,.7)';ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(x,pad.t);ctx.lineTo(x,pad.t+mainH+volH+12);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#efc04f';ctx.font='10px system-ui';ctx.fillText(ep.date.slice(5),x+3,pad.t+11)}lastDate=ep.date});
  ctx.strokeStyle='#17334d';ctx.lineWidth=1;ctx.fillStyle='#8aa1b4';ctx.font='11px system-ui';for(let i=0;i<=4;i++){const yy=pad.t+i*mainH/4;ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(cssW-pad.r,yy);ctx.stroke();const val=max-range*i/4;ctx.fillText(val.toFixed(val<1?4:2),4,yy+4)}const vmax=Math.max(1,...bars.map(b=>b.volume));bars.forEach((b,i)=>{const x=pad.l+i*w+w/2,up=b.close>=b.open,color=up?'#46b989':'#e27366';ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(x,y(b.high));ctx.lineTo(x,y(b.low));ctx.stroke();ctx.fillStyle=color;const yo=y(b.open),yc=y(b.close),top=Math.min(yo,yc),h=Math.max(1,Math.abs(yc-yo));ctx.fillRect(x-body/2,top,body,h);const vh=(b.volume/vmax)*volH;ctx.globalAlpha=.42;ctx.fillRect(x-body/2,pad.t+mainH+12+(volH-vh),body,vh);ctx.globalAlpha=1});if(SIM.position?.open){const levels=[[SIM.position.entry,'#d7c27c','Entry'],[SIM.position.stop,'#e27366','Stop'],[SIM.position.target,'#46b989','Target']].filter(x=>Number.isFinite(x[0])&&x[0]>=min&&x[0]<=max);ctx.setLineDash([6,4]);levels.forEach(([v,c,label])=>{ctx.strokeStyle=c;ctx.beginPath();ctx.moveTo(pad.l,y(v));ctx.lineTo(cssW-pad.r,y(v));ctx.stroke();ctx.fillStyle=c;ctx.fillText(label,cssW-52,y(v)-3)});ctx.setLineDash([])}ctx.fillStyle='#8aa1b4';ctx.font='10px system-ui';const first=bars[0],last=bars[bars.length-1];ctx.fillText(etParts(first.time).time.slice(0,5),pad.l,cssH-9);ctx.fillText(etParts(last.time).time.slice(0,5),Math.max(pad.l,cssW-pad.r-42),cssH-9);ctx.fillStyle='#9fb5c6';ctx.fillText('Pre 04:00–09:30  •  Regular 09:30–16:00  •  After 16:00–20:00 ET  •  Otherwise overnight',pad.l,cssH-27)}
function pause(){if(SIM.timer){clearInterval(SIM.timer);SIM.timer=null}$('sim-play').textContent='Play'}
function play(){if(SIM.timer){pause();return}if(!SIM.candles.length)return;$('sim-play').textContent='Pause';SIM.timer=setInterval(()=>{if(!step(1)||SIM.ambiguous)pause()},Number($('sim-speed').value)||1500)}
function step(delta){if(!SIM.candles.length)return false;const next=SIM.index+delta;if(next<0||next>=SIM.candles.length)return false;if(delta<0&&!SIM.position?.closed)return false;SIM.index=next;if(delta>0)SIM.maxIndexSeen=Math.max(SIM.maxIndexSeen,SIM.index);if(SIM.position?.open)processOpenBar(current());renderAll();return true}
function processOpenBar(c){const p=SIM.position;const stopHit=Number.isFinite(p.stop)&&(p.direction==='LONG'?c.low<=p.stop:c.high>=p.stop);const targetHit=Number.isFinite(p.target)&&(p.direction==='LONG'?c.high>=p.target:c.low<=p.target);if(stopHit&&targetHit){SIM.ambiguous={bar:c};$('sim-ambiguous').hidden=false;smsg('sim-trade-msg','Replay paused: this candle touched both stop and target. OHLC does not reveal which happened first, so this bar is not added to MFE/MAE until you resolve it.','error');return}if(stopHit){if(p.direction==='LONG')p.lowest=Math.min(p.lowest,p.stop);else p.highest=Math.max(p.highest,p.stop);finishTrade(p.stop,'Stop / risk exit');return}if(targetHit){if(p.direction==='LONG')p.highest=Math.max(p.highest,p.target);else p.lowest=Math.min(p.lowest,p.target);finishTrade(p.target,'Planned target');return}p.highest=Math.max(p.highest,c.high);p.lowest=Math.min(p.lowest,c.low)}
function loadFictionalPractice(){
 const starter=window.GroundUpFictionalSimulatorStarterV1;
 if(typeof starter?.generate!=='function'){smsg('sim-load-msg','The fictional starter module did not load. Refresh the page and try again.','error');return}
 if(SIM.journalId||SIM.linkedJournalId||SIM.planLocked||SIM.position){
  smsg('sim-load-msg','Your existing journal-backed practice must be preserved. Open a new Simulator session to load the fictional starter.','error');return;
 }
 pause();
 SIM.candles=starter.generate();SIM.sourceName=starter.source;SIM.originalFictional=true;
 // Existing private Journal schema recognizes csv_upload as local browser replay.
 // The visible source label explicitly marks this scenario as ORIGINAL FICTIONAL.
 SIM.sourceProvider='csv_upload';SIM.startIndex=Math.min(4,SIM.candles.length-1);
 SIM.index=SIM.startIndex;SIM.maxIndexSeen=SIM.startIndex;
 SIM.ambiguous=null;SIM.position=null;SIM.contextEnvelope=null;
 SIM.journalId=null;SIM.planLocked=false;
 $('sim-ambiguous').hidden=true;$('sim-ticker').value=starter.symbol;
 $('sim-timeframe').value='5-minute fictional practice';
 if($('sim-source'))$('sim-source').value='csv';
 const indicator=$('sim-context-note');
 if(indicator){indicator.hidden=false;indicator.textContent=starter.note}
 window.GroundUpFreePracticeRequested=false;
 smsg('sim-load-msg','Loaded '+SIM.candles.length+' ORIGINAL FICTIONAL candles. Use Next Bar to reveal one at a time, or write and lock an educational plan to save a paper Journal entry. No official grade or real fill.','success');
 renderAll();
}
async function loadCSV(){const file=$('sim-csv').files?.[0];if(!file){smsg('sim-load-msg','Choose a CSV file first.','error');return}try{if(file.size>SIM_CSV_MAX_BYTES)throw Error('CSV file exceeds 4 MiB. Select a smaller teaching window.');const text=await file.text();SIM.candles=parseCSV(text);SIM.sourceName=file.name;SIM.sourceProvider='csv_upload';SIM.sourceNote='User-uploaded CSV for ungraded browser practice. Not source-certified or licensed for redistribution.';SIM.originalFictional=false;const warm=Math.min(Number($('sim-start-context').value)||0,SIM.candles.length-1);SIM.index=warm;SIM.startIndex=warm;SIM.maxIndexSeen=warm;SIM.position=null;SIM.ambiguous=null;$('sim-ambiguous').hidden=true;if(!SIM.linkedJournalId&&!SIM.planLocked)SIM.journalId=null;smsg('sim-load-msg',`Loaded ${SIM.candles.length} candles from ${file.name}. Future candles are hidden from the replay.`, 'success');renderAll()}catch(e){smsg('sim-load-msg',e.message,'error')}}
async function loadProvider(){if(!SIM.hasPremium){smsg('sim-load-msg','Connected Tiingo/Alpaca history requires separate Market Simulator data access. An Advanced or Professional Chart Studio pass does not include licensed provider history. Your saved connection is not removed. For chart-only testing, select the teaching dataset or upload your own licensed CSV.','error');$('sim-load-msg')?.scrollIntoView?.({block:'nearest'});return}const ticker=$('sim-ticker').value.trim().toUpperCase(),start=$('sim-start-date')?.value,end=$('sim-end-date')?.value,freq=$('sim-resample')?.value||'1min';if(!ticker||!start||!end){smsg('sim-load-msg','Ticker, context start date, and context end date are required.','error');return}try{const {data}=await SIM.sb.auth.getSession(),token=data.session?.access_token;if(!token)throw new Error('Sign in required.');smsg('sim-load-msg','Loading connected market data…');const provider=$('sim-source').value==='alpaca'?'ALPACA_BYO':'TIINGO_BYO';const q=new URLSearchParams({action:'bars',provider,ticker,start,end,freq});const r=await fetch(`/api/marketdata?${q}`,{headers:{authorization:`Bearer ${token}`},cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);SIM.candles=(j.bars||[]).map(x=>({time:new Date(x.timestamp),open:n(x.open),high:n(x.high),low:n(x.low),close:n(x.close),volume:n(x.volume)||0,tradeCount:Number.isSafeInteger(x.tradeCount)?x.tradeCount:null,providerVwap:typeof x.providerVwap==='number'&&Number.isFinite(x.providerVwap)?x.providerVwap:null})).filter(x=>!Number.isNaN(x.time.getTime())&&[x.open,x.high,x.low,x.close].every(Number.isFinite)).sort((a,b)=>a.time-b.time);if(SIM.candles.length<2)throw new Error('The provider returned too few valid bars for this date range.');SIM.sourceName=`${provider==='ALPACA_BYO'?'Alpaca IEX':'Tiingo'} ${ticker} ${start} to ${end}`;SIM.sourceProvider=provider.toLowerCase();SIM.sourceNote=j.sourceNote||'';SIM.sourceFeed=j.integrity?.feed||'unspecified';SIM.originalFictional=false;const warm=Math.min(Number($('sim-start-context').value)||0,SIM.candles.length-1);SIM.index=warm;SIM.startIndex=warm;SIM.maxIndexSeen=warm;SIM.position=null;SIM.ambiguous=null;$('sim-ambiguous').hidden=true;if(!SIM.linkedJournalId&&!SIM.planLocked)SIM.journalId=null;smsg('sim-load-msg',`Loaded ${SIM.candles.length} provider bars. Future candles remain hidden. ${j.sourceNote||''}`,'success');renderAll()}catch(e){smsg('sim-load-msg',e.message,'error')}}
async function loadContextEnvelope(lab){if(!lab)return;try{const {data}=await SIM.sb.from('historical_context_envelopes').select('*').eq('lab_id',lab).in('status',['verified','published']).order('updated_at',{ascending:false}).limit(1);const e=data?.[0];if(!e)return;SIM.contextEnvelope=e;const d=x=>x?new Date(x).toISOString().slice(0,10):'';$('sim-ticker').value=e.ticker||$('sim-ticker').value;if($('sim-start-date'))$('sim-start-date').value=d(e.context_start_at);if($('sim-end-date'))$('sim-end-date').value=d(e.context_end_at);
 const et=x=>x?new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(x)):'';
 if($('cl-lab-start-time'))$('cl-lab-start-time').value=et(e.context_start_at);
 if($('cl-lab-end-time'))$('cl-lab-end-time').value=et(e.context_end_at);
 const note=$('sim-context-note');if(note){note.hidden=false;note.innerHTML=`<strong>Historical Context Envelope:</strong> ${e.multi_day_runner?'Multi-day runner':'Single teaching move'} · Context ${d(e.context_start_at)} → ${d(e.context_end_at)} · teaching boundary preserved. Morning/Day/Night sessions are shown across the full context window.`}}catch{}}
function validatePlan(){const miss=[];if(!$('sim-ticker').value.trim())miss.push('ticker');if(!n($('sim-shares').value)||n($('sim-shares').value)<=0)miss.push('shares');if(!$('sim-thesis').value.trim())miss.push('thesis');if(!$('sim-entry-reason').value.trim())miss.push('reason for entry');if(!$('sim-trigger').value.trim())miss.push('entry trigger');if(!$('sim-invalidation').value.trim())miss.push('invalidation');if(n($('sim-stop').value)===null)miss.push('planned stop');return miss}
async function loadLinkedJournal(id){const {data,error}=await SIM.sb.from('decision_journal').select('*').eq('id',id).eq('user_id',SIM.user.id).single();if(error)throw error;if(data.journal_type!=='paper')throw new Error('Only Paper / Simulator journal records can open in the simulator.');if(!['draft','planned'].includes(data.status))throw new Error('Only draft or planned Paper / Simulator records can open in the simulator. Open/closed simulator sessions cannot be resumed because the uploaded replay dataset is not stored on the server.');SIM.linkedJournalId=id;SIM.journalId=id;$('linked-journal-note').hidden=false;$('linked-journal-note').innerHTML=`Linked to journal record <strong>#${id}</strong>. The simulator will update this paper-trade record.`;$('sim-ticker').value=data.ticker||'';$('sim-timeframe').value=data.timeframe||'';if($('sim-lab-id'))$('sim-lab-id').value=data.historical_lab_id||'';$('sim-direction').value=data.direction||'LONG';$('sim-shares').value=data.share_quantity||100;$('sim-stop').value=data.planned_stop??'';$('sim-target').value=data.planned_target??'';$('sim-thesis').value=data.thesis||'';$('sim-entry-reason').value=data.entry_reason||'';$('sim-trigger').value=data.entry_trigger||'';$('sim-invalidation').value=data.invalidation||'';SIM.planLocked=!!data.plan_locked_at;if(SIM.planLocked)smsg('sim-plan-msg','Linked pre-trade plan is already locked.','success')}
async function lockPlan(){const miss=validatePlan();if(miss.length){smsg('sim-plan-msg',`Complete before locking: ${miss.join(', ')}.`,'error');return}const c=current();if(!c){smsg('sim-plan-msg','Load replay data first.','error');return}try{const ep=etParts(c.time);if(!SIM.journalId){const row={user_id:SIM.user.id,journal_type:'paper',status:'draft',ticker:$('sim-ticker').value.trim().toUpperCase(),trade_date:ep.date,timeframe:$('sim-timeframe').value.trim()||null,setup:'Market Simulator',direction:$('sim-direction').value,decision:'ENTER',evidence:'Simulator no-look-ahead replay',thesis:$('sim-thesis').value.trim(),entry_reason_category:'Other planned reason',entry_reason:$('sim-entry-reason').value.trim(),entry_trigger:$('sim-trigger').value.trim(),invalidation:$('sim-invalidation').value.trim(),planned_entry:c.close,planned_stop:n($('sim-stop').value),planned_target:n($('sim-target').value),share_quantity:n($('sim-shares').value),planned_exit_reason_category:'Other',planned_exit_reason:'Use planned stop/target or documented manual exit.',historical_lab_id:$('sim-lab-id')?.value.trim()||null,simulator_source:SIM.sourceProvider||'csv_upload',simulator_source_label:SIM.sourceName||'Replay data',simulator_fill_policy:'manual_on_ambiguous'};const {data,error}=await SIM.sb.from('decision_journal').insert(row).select('id').single();if(error)throw error;SIM.journalId=data.id}else{const patch={journal_type:'paper',ticker:$('sim-ticker').value.trim().toUpperCase(),trade_date:ep.date,timeframe:$('sim-timeframe').value.trim()||null,direction:$('sim-direction').value,decision:'ENTER',thesis:$('sim-thesis').value.trim(),entry_reason:$('sim-entry-reason').value.trim(),entry_trigger:$('sim-trigger').value.trim(),invalidation:$('sim-invalidation').value.trim(),planned_entry:c.close,planned_stop:n($('sim-stop').value),planned_target:n($('sim-target').value),share_quantity:n($('sim-shares').value),historical_lab_id:$('sim-lab-id')?.value.trim()||null,simulator_source:SIM.sourceProvider||'csv_upload',simulator_source_label:SIM.sourceName||'Replay data',simulator_fill_policy:'manual_on_ambiguous',updated_at:new Date().toISOString()};const {error}=await SIM.sb.from('decision_journal').update(patch).eq('id',SIM.journalId).eq('user_id',SIM.user.id);if(error)throw error}const {error:lockError}=await SIM.sb.rpc('lock_trade_plan',{target_journal_id:SIM.journalId});if(lockError)throw lockError;SIM.planLocked=true;smsg('sim-plan-msg',`Simulator plan locked in journal record #${SIM.journalId}.`,'success');$('sim-open-journal').href=`journal-entry.html?id=${SIM.journalId}`;setEnabled();renderMetrics()}catch(e){smsg('sim-plan-msg',simulatorQuotaMessage(e.message),'error')}}
async function enterTrade(){const c=current();if(!SIM.planLocked||!c||SIM.position?.open)return;const shares=n($('sim-shares').value),stop=n($('sim-stop').value),target=n($('sim-target').value),direction=$('sim-direction').value,ep=etParts(c.time);SIM.position={open:true,closed:false,direction,shares,stop,target,entry:c.close,highest:c.close,lowest:c.close,entryDate:ep.date,entryTime:ep.time,exit:null,exitDate:null,exitTime:null,ambiguousBars:0};const {error}=await SIM.sb.from('decision_journal').update({status:'open',actual_entry:c.close,entry_time_et:ep.time,highest_while_open:c.close,lowest_while_open:c.close,simulator_source:SIM.sourceProvider||'csv_upload',simulator_source_label:SIM.sourceName||'Replay data',updated_at:new Date().toISOString()}).eq('id',SIM.journalId).eq('user_id',SIM.user.id);if(error){SIM.position=null;smsg('sim-trade-msg',simulatorQuotaMessage(error.message),'error');return}smsg('sim-trade-msg',`Entered ${direction} ${shares} shares at ${money(c.close)} on the current candle close.`,'success');renderAll()}
async function finishTrade(price,reason){pause();const c=current(),p=SIM.position;if(!p?.open)return;const ep=etParts(c.time);p.open=false;p.closed=true;p.exit=price;p.exitDate=ep.date;p.exitTime=ep.time;const base={direction:p.direction,share_quantity:p.shares,actual_entry:p.entry,actual_exit:p.exit,planned_stop:p.stop,highest_while_open:p.highest,lowest_while_open:p.lowest,fees:0,trade_date:p.entryDate,exit_date:p.exitDate,entry_time_et:p.entryTime,exit_time_et:p.exitTime};const metrics=JT().compute(base);const patch={status:'closed',actual_exit:price,exit_date:ep.date,exit_time_et:ep.time,highest_while_open:p.highest,lowest_while_open:p.lowest,actual_exit_reason_category:reason,actual_exit_reason:`Simulator exit: ${reason}`,plan_followed:'YES',...metrics,closed_at:new Date().toISOString(),simulator_ambiguous_bar_count:p.ambiguousBars||0,updated_at:new Date().toISOString()};const {error}=await SIM.sb.from('decision_journal').update(patch).eq('id',SIM.journalId).eq('user_id',SIM.user.id);if(error){smsg('sim-trade-msg',error.message,'error');return}smsg('sim-trade-msg',`Simulation closed at ${money(price)} — ${reason}. Metrics saved to the Trading Journal.`,'success');$('sim-open-journal').href=`journal-entry.html?id=${SIM.journalId}`;renderAll()}
async function manualExit(){if(!SIM.position?.open)return;await finishTrade(current().close,$('sim-exit-reason').value||'Other')}
function resolveAmbiguous(which){if(!SIM.ambiguous||!SIM.position?.open)return;SIM.position.ambiguousBars=(SIM.position.ambiguousBars||0)+1;const p=SIM.position;SIM.ambiguous=null;$('sim-ambiguous').hidden=true;if(which==='stop')finishTrade(p.stop,'Stop / risk exit');else if(which==='target')finishTrade(p.target,'Planned target');else{smsg('sim-trade-msg','Ambiguous candle acknowledged. Position remains open.','success');renderAll()}}
function downloadTemplate(){const txt='timestamp,open,high,low,close,volume,data_classification\n2040-01-02T09:30:00-05:00,10.00,10.08,9.96,10.05,125000,fictional_illustrative\n2040-01-02T09:35:00-05:00,10.05,10.12,10.01,10.09,143000,fictional_illustrative\n';const blob=new Blob([txt],{type:'text/csv'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ground-up-simulator-template.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function clearSimulatorOnSessionLoss(){
 // Never retain an old member's client-inspectable provider history on account change.
 pause();
 try{window.CrownlightLive?.stop?.()}catch{}
 try{window.CrownlightStudio?.clearMemberState?.()}catch{}
 SIM.candles=[];SIM.index=0;SIM.startIndex=0;SIM.maxIndexSeen=0;
 SIM.position=null;SIM.ambiguous=null;SIM.journalId=null;SIM.linkedJournalId=null;
 SIM.planLocked=false;SIM.contextEnvelope=null;SIM.sourceName=null;SIM.sourceProvider='csv_upload';
 SIM.sourceNote='';SIM.sourceFeed=null;SIM.originalFictional=false;SIM.hasPremium=false;SIM.user=null;
 const content=$('sim-content');if(content){content.hidden=true;content.replaceChildren()}
 const gate=$('sim-gate');if(gate)gate.textContent='Your session changed. Sign in and reload the Simulator to continue.';
}
async function init(){const gate=$('sim-gate');try{SIM.sb=await window.getSupabaseClient();const {data:{user}}=await SIM.sb.auth.getUser();if(!user){gate.innerHTML='<div class="notice">Sign in to use the Market Simulator.</div>';return}SIM.user=user;
 const {data:{session}}=await SIM.sb.auth.getSession();
 if(!session?.access_token)throw new Error('A verified session is required for the Market Simulator.');
 const acl=await fetch('/api/member-tool-access?tool=MARKET_SIMULATOR',{headers:{authorization:'Bearer '+session.access_token},cache:'no-store'});
 const grant=await acl.json().catch(()=>({}));
 // An ordinary signed-in Free member is eligible for local practice. An
 // account that is restricted, Showcase, invalid or whose policy RPC failed
 // must never inherit free access just because the paid entitlement is false.
 if(!acl.ok||grant.ok!==true)throw new Error('Simulator account authorization could not be verified.');
 const freeEligible=grant.freeEligible===true;
 if(!freeEligible){gate.textContent='This account is not eligible for member market practice. '+String(grant.reason||'Contact support.');return}
 SIM.hasPremium=grant.authorized===true; if(!SIM.hasPremium){gate.textContent='Chart Studio allows the included fictional teaching dataset and your own CSV. Connected Tiingo/Alpaca history requires a separate Market Simulator entitlement even when personal credentials are verified. The chart-only QA permission does not grant provider data or paper brokerage access.';/* Provider choices stay visible so their distinct access requirement can be explained on selection. The server still enforces authorization. */}
 const params=new URLSearchParams(location.search);const linked=Number(params.get('journal_id'));if(linked)await loadLinkedJournal(linked);const lab=params.get('lab');if(lab&&$('sim-lab-id')&&!$('sim-lab-id').value)$('sim-lab-id').value=lab;if(lab)await loadContextEnvelope(lab);const topic=params.get('topic');if(topic&&!$('sim-entry-reason').value)$('sim-entry-reason').value=`Tutor practice topic: ${topic}`;if(SIM.hasPremium)gate.textContent='';$('sim-content').hidden=false;
 try{window.CrownlightWorkbenchLayout?.init({canUsePaper:SIM.hasPremium===true,getToken:async()=>{const {data}=await SIM.sb.auth.getSession();return data?.session?.access_token||null}})}catch(e){console.warn('Optional chart workbench initialization failed',e)}
 if(SIM.hasPremium)try{window.CrownlightPaperTerminal?.initialize?.({getSession:async()=>{const {data}=await SIM.sb.auth.getSession();return data?.session||null}})}catch(e){console.warn('Optional paper terminal initialization failed',e)}
 try{window.CrownlightLive?.initialize({canLive:SIM.hasPremium===true,
  getSymbol:()=>$('sim-ticker')?.value||'AAPL',
  getSession:async()=>{const {data}=await SIM.sb.auth.getSession();return data?.session||null}})}catch(e){console.warn('Optional live candle formation initialization failed',e)}
 try{SIM.sb.auth.onAuthStateChange?.((event,session)=>{
  if(event==='SIGNED_OUT'||(session?.user?.id&&SIM.user&&session.user.id!==SIM.user.id))clearSimulatorOnSessionLoss();
 })}catch(e){console.warn('Optional live-auth monitoring failed',e)}
 $('load-csv').onclick=loadCSV;if($('sim-load-fictional'))$('sim-load-fictional').onclick=loadFictionalPractice;if($('load-provider'))$('load-provider').onclick=loadProvider;$('load-demo-template').onclick=downloadTemplate;if($('sim-source'))$('sim-source').onchange=()=>{
 const connected=['tiingo','alpaca'].includes($('sim-source').value);
 if($('sim-csv-wrap'))$('sim-csv-wrap').hidden=connected;
 $('load-csv').hidden=connected;
 if($('load-provider'))$('load-provider').hidden=!connected;
 const msg=connected
  ?(SIM.hasPremium
    ?'Use Load Connected Data to request personal '+($('sim-source').value==='alpaca'?'Alpaca IEX':'Tiingo')+' bars. Enter a ticker and date range; availability depends on your provider subscription.'
    :'Personal provider connections are separate from Chart Studio access. Select Load Connected Data to view the required access; no request or charge will be made.')
  :'';
 smsg('sim-load-msg',msg);
};
$('sim-source')?.dispatchEvent(new Event('change'));$('sim-reset').onclick=resetReplay;$('sim-prev').onclick=()=>step(-1);$('sim-next').onclick=()=>step(1);$('sim-play').onclick=play;$('sim-speed').onchange=()=>{if(SIM.timer){pause();play()}};$('sim-lock-plan').onclick=lockPlan;$('sim-enter').onclick=enterTrade;$('sim-exit').onclick=manualExit;$('sim-stop-first').onclick=()=>resolveAmbiguous('stop');$('sim-target-first').onclick=()=>resolveAmbiguous('target');$('sim-keep-open').onclick=()=>resolveAmbiguous('keep');window.addEventListener('resize',()=>renderChart());renderAll();if(window.GroundUpFreePracticeRequested)loadFictionalPractice();
 if(window.GroundUpStudioRequestedTier){
  const disclosure=document.querySelector('#cl-replay-import details.cl-workbench-import');
  if(disclosure)disclosure.open=false;
  const chart=document.getElementById('cl-chart-tier-switcher')||document.querySelector('.sim-chart-panel');
  if(chart){
   chart.setAttribute('tabindex','-1');
   window.requestAnimationFrame(()=>{chart.scrollIntoView({block:'start'});chart.focus({preventScroll:true});});
  }
 }
 }catch(e){gate.innerHTML=`<div class="notice">${JT()?.esc?JT().esc(e.message):e.message}</div>`}}
/* The secure replay panel owns the default simulator screen.
 * Legacy browser CSV initialization runs only after the member explicitly
 * selects unverified practice, never while inspecting server-only history.
 */
window.addEventListener('groundup:request-free-practice',()=>{
 window.GroundUpFreePracticeRequested=true;
 if(SIM.user&&$('sim-content')&&!$('sim-content').hidden)loadFictionalPractice();
});
window.GroundUpSimulatorLoadVerifiedLabContext=loadContextEnvelope;
window.GroundUpLegacySimulatorPause=pause;
let legacySimulatorActivated=false;
window.addEventListener('groundup:activate-legacy-simulator',()=>{
 if(legacySimulatorActivated)return;
 legacySimulatorActivated=true;
 void init();
});
