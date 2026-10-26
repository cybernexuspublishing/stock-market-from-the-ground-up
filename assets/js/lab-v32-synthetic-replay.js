/* Companion v3.2 controlled-reveal teaching demonstration, NOT a
   production market-data feed or graded replay. Original visual renderer
   preserved from owner-uploaded exact v3.2 reference. Only fictional data.
   Official chronological market observations require server-authorized API. */
(function(root){
'use strict';
const A=[
{t:'9:30',o:9.8,h:10.1,l:9.7,c:10,v:200},
{t:'9:35',o:10,h:10.35,l:9.95,c:10.25,v:300},
{t:'9:40',o:10.25,h:10.55,l:10.15,c:10.45,v:250},
{t:'9:45',o:10.45,h:10.5,l:9.65,c:9.75,v:400},
{t:'9:50',o:9.75,h:10.28,l:9.7,c:9.95,v:220},
{t:'9:55',o:9.95,h:10.45,l:9.9,c:10.3,v:250},
{t:'10:00',o:10.3,h:10.65,l:10.22,c:10.52,v:180},
{t:'10:05',o:10.52,h:10.56,l:9.92,c:10.04,v:350}
],BARS_B=[
{t:'9:30',o:7.1,h:7.3,l:7,c:7.2,v:250},
{t:'9:35',o:7.2,h:7.55,l:7.16,c:7.45,v:300},
{t:'9:40',o:7.45,h:7.5,l:6.9,c:7,v:350},
{t:'9:45',o:7,h:7.36,l:6.98,c:7.12,v:250},
{t:'9:50',o:7.12,h:7.52,l:7.07,c:7.48,v:300},
{t:'9:55',o:7.48,h:7.55,l:7.22,c:7.3,v:200},
{t:'10:00',o:7.3,h:7.68,l:7.26,c:7.6,v:250},
{t:'10:05',o:7.6,h:7.61,l:7.12,c:7.2,v:300}
];
const labels={hold:'Holding above VWAP',loss:'Losing VWAP',reclaim:'Reclaiming VWAP',failed:'Possible failed reclaim attempt',below:'Remaining below VWAP'};
const money=n=>'$'+Number(n).toFixed(2);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function runningVWAP(bars){let shares=0,dollars=0;return bars.map(b=>{shares+=b.v;dollars+=b.c*b.v;return {shares,dollars,vwap:dollars/shares}});}
function classify(p,pv,c,cv){const was=p.c>pv,now=c.c>cv;if(was&&now)return 'hold';if(was&&!now)return 'loss';if(!was&&now)return 'reclaim';if(c.h>cv&&c.c<cv)return 'failed';return 'below';}
function B(text,action,cl='secondary',disabled=false,extra=''){return '<button type="button" class="'+cl+'" data-action="'+action+'" '+(disabled?'disabled':'')+' '+extra+'>'+text+'</button>';}
const panel=(body,cls='instruction')=>'<section class="'+cls+'">'+body+'</section>';
function choices(name,opts,value,disabled=false){return opts.map(([code,label])=>'<label class="choice"><input type="radio" name="'+name+'" value="'+code+'" '+(code===value?'checked':'')+' '+(disabled?'disabled':'')+'><span>'+label+'</span></label>').join('')}
function create(target,{onFinish,scenario='A'}={}){
 if(!target||typeof target.replaceChildren!=='function')return null;
 const S={scenario,barIndex:2,display:'both',showTable:true,replayChoice:'',replayDecision:'',replayForecast:'',replayReason:'',replayLocked:false,replayAttempts:0,replayAssisted:false,replayLog:[]};
 const L=()=>({sessions:{A,B:BARS_B}});
 const wrap=document.createElement('section');wrap.className='gu-v32-synthetic-replay';target.replaceChildren(wrap);
 function replayChart(){const b=L().sessions[S.scenario], visible=b.slice(0,S.barIndex+1), vals=runningVWAP(visible);const last=visible.at(-1);const lo=Math.min(...visible.map(x=>x.l))-.2,hi=Math.max(...visible.map(x=>x.h))+.2;
const X=i=>75+i*83,Y=v=>248-(v-lo)/(hi-lo)*190;
const line=vals.map((v,i)=>`${X(i)},${Y(v.vwap)}`).join(' ');
const labels=[{name:'H',v:last.h},{name:'C',v:last.c},{name:'O',v:last.o},{name:'L',v:last.l}];
return `<div class="chart-shell"><div class="chart-head"><strong>Controlled VWAP Replay · 5-minute candles</strong><span class="badge">${S.barIndex+1}/8 revealed</span></div><div class="controls" style="padding:0 15px">${[['price','Price'],['both','Price + VWAP'],['volume','Volume']].map(([v,label])=>B(label,'setChart','secondary',S.display===v,`data-value="${v}"`)).join('')}</div><div class="chart-layout"><div class="chart-area"><svg viewBox="0 0 770 350" role="img" aria-label="VWAP replay. Exactly ${visible.length} completed candles revealed; future candles are not drawn."><rect width="770" height="350" fill="#08131f"/>${Array.from({length:5},(_,i)=>lo+(hi-lo)*i/4).map(p=>`<line x1="39" x2="765" y1="${Y(p)}" y2="${Y(p)}" stroke="#203244" stroke-width="0.7"/><text x="35" y="${Y(p)+4}" fill="#a6bdce" font-size="13" text-anchor="end">${money(p)}</text>`).join('')}${visible.map((bar,i)=>{const up=bar.c>=bar.o;return `<rect x="${X(i)-12}" y="${319-bar.v/500*45}" width="24" height="${bar.v/500*45}" fill="#367b9e"/><text x="${X(i)}" y="345" fill="#dceef9" font-size="14" text-anchor="middle">${bar.t}</text>${S.display!=='volume'?`<line x1="${X(i)}" x2="${X(i)}" y1="${Y(bar.h)}" y2="${Y(bar.l)}" stroke="${up?'#53e2b0':'#ff8394'}" stroke-width="3"/><rect x="${X(i)-17}" y="${Math.min(Y(bar.o),Y(bar.c))}" width="34" height="${Math.max(3,Math.abs(Y(bar.o)-Y(bar.c)))}" fill="${up?'#159b79':'#bf4f69'}" stroke="${i===S.barIndex?'#ffda91':up?'#70e2b4':'#ff8394'}" stroke-width="${i===S.barIndex?3:1.4}"/>`:''}`}).join('')}${S.display==='both'?`<polyline fill="none" points="${line}" stroke="#e5c27e" stroke-width="4"/>${vals.map((v,i)=>`<circle cx="${X(i)}" cy="${Y(v.vwap)}" r="${i===S.barIndex?6:3}" fill="#e5c27e"/>`).join('')}`:''}${S.display!=='volume'?labels.map(d=>`<line x1="${X(S.barIndex)+22}" y1="${Y(d.v)}" x2="${(d.name==='H'||d.name==='L')?508:648}" y2="${Y(d.v)}" stroke="#98c5b8" stroke-dasharray="3 5"/><text x="${(d.name==='H'||d.name==='L')?513:653}" y="${Y(d.v)+5}" fill="#e5f1fc" font-size="17" font-weight="600">${d.name} ${money(d.v)}</text>`).join(''):''}<text x="16" y="20" fill="#afc6d9" font-size="15">VWAP preview · fictional close × volume bars only</text></svg><div class="chart-legend"><span><i class="legend-dot" style="background:#6ddfb7"></i>Green candle</span><span><i class="legend-dot" style="background:#bf4f69"></i>Red candle</span><span><i class="legend-dot" style="background:#e5c27e"></i>VWAP</span><span><i class="legend-dot" style="background:#367b9e"></i>Volume</span></div></div><aside class="chart-data"><h3>Current Candle</h3><label class="small"><input type="checkbox" data-input="showTable" ${S.showTable?'checked':''}> Show OHLC reference</label>${S.showTable?labels.map(l=>`<div class="ohlc-row"><span>${l.name}</span><strong>${money(l.v)}</strong></div>`).join(''):''}<div class="ohlc-row"><span>Volume</span><strong>${last.v} shares</strong></div><div class="ohlc-row"><span>Running VWAP</span><strong>${money(vals.at(-1).vwap)}</strong></div><div class="ohlc-row"><span>Cumulative shares</span><strong>${vals.at(-1).shares}</strong></div><p class="live-note">VWAP = cumulative (bar close × volume) ÷ cumulative share volume. Not trade-level VWAP.</p></aside></div></div>`}
 function show(){
  const bars=L().sessions[S.scenario],visible=bars.slice(0,S.barIndex+1),values=runningVWAP(visible),
   prev=visible.at(-2),curr=visible.at(-1),pv=values.at(-2).vwap,cv=values.at(-1).vwap,correct=classify(prev,pv,curr,cv);
  const review='<div class="step-card"><strong>Previous candle:</strong> close '+money(prev.c)+' versus VWAP '+money(pv)+'.</div>'+
  '<div class="step-card"><strong>Current candle:</strong> close '+money(curr.c)+' versus VWAP '+money(cv)+'.</div>'+
  '<div class="step-card"><strong>Correct classification:</strong> '+labels[correct]+'.</div>'+
  '<div class="step-card">Volume '+curr.v+' shares; cumulative close × volume '+money(values.at(-1).dollars)+' ÷ '+values.at(-1).shares+' shares = '+money(cv)+'.</div>'+
  '<p>Interpretation does not determine future prices or exact intrabar ordering. One observation never guarantees a trade entry.</p>';
  wrap.innerHTML='<div class="title-actions"><span class="badge">Fictional scenario '+S.scenario+' · Revealed '+visible.length+'/8</span><span class="badge">Future candles visually concealed · Study Only</span></div>'+
   panel('<strong>How this replay works</strong><p>Only invented completed candles through '+curr.t+' are shown. Classify behavior, choose an educational hypothetical action and forecast before revealing another candle. This standalone illustration is not a secure historical replay.</p><a class="link" href="verified-replay.html">Open the server-controlled historical replay workbench</a>')+
   replayChart()+
   (S.barIndex>2?panel('<h3>Check the previous forecast</h3><p>The newly revealed close is '+(curr.c>cv?'above':'below')+' its new running VWAP. A forecast is not evidence of guaranteed movement.</p>','feedback'):'')+
   panel('<h3>Analyze the latest completed candle</h3><p><strong>1. Select its VWAP behavior</strong></p>'+
   choices('classification',Object.entries(labels),S.replayChoice,S.replayLocked)+
   '<div class="line"></div><strong>2. Choose a hypothetical action</strong>'+
   choices('decision',[['wait','Observe / no trade while evaluating more evidence'],['conditional','Consider a hypothetical long only with a complete entry and risk plan'],['impulsive','Immediately buy solely because of this VWAP event']],S.replayDecision,S.replayLocked)+
   '<div class="line"></div><strong>3. Forecast the next candle</strong>'+
   choices('forecast',[['above','Next completed candle closes above its updated VWAP'],['below','Next completed candle closes below its updated VWAP'],['uncertain','Not enough evidence to predict confidently']],S.replayForecast,S.replayLocked)+
   '<label>Your reasoning (optional)<textarea data-replay-reason '+(S.replayLocked?'disabled':'')+' placeholder="What evidence justifies your answer?">'+esc(S.replayReason)+'</textarea></label>'+
   (S.replayAttempts?' <div class="feedback"><p class="warning">Check both completed closes against their respective VWAP values. Incorrect attempts: '+S.replayAttempts+'.</p></div>':'')+
   (S.replayLocked?panel('<h3>Analysis recorded</h3><p>Classification: '+labels[S.replayChoice]+'. Recorded as '+(S.replayAssisted?'assisted':'independent')+' synthetic practice.</p>'+review,'feedback')+B(S.barIndex===7?'Finish Synthetic Replay':'Reveal Next Candle','advance','primary'):
   B('Explain This VWAP Pattern — Free','help')+
   B('Lock My Analysis','lock','primary',!S.replayChoice||!S.replayDecision||!S.replayForecast)+
   (S.replayAttempts>=3?B('Record as Assisted and Continue','assist'):'')+
   (S.replayAssisted?panel('<h3>Free focused teaching</h3>'+review):'')),'question');
 }
 target.addEventListener('change',e=>{
  const n=e.target.name,v=e.target.value;if(n==='classification')S.replayChoice=v;else if(n==='decision')S.replayDecision=v;else if(n==='forecast')S.replayForecast=v;
  if(['classification','decision','forecast'].includes(n))show();
 });
 target.addEventListener('input',e=>{if(e.target.matches('[data-replay-reason]'))S.replayReason=e.target.value});
 target.addEventListener('click',e=>{
  const b=e.target.closest('button[data-action]');if(!b||b.disabled)return;
  const action=b.dataset.action;
  if(action==='setChart')S.display=b.dataset.value;
  if(action==='help')S.replayAssisted=!S.replayAssisted;
  if(action==='lock'||action==='assist'){
   if(!S.replayChoice||!S.replayDecision||!S.replayForecast)return;
   const bars=L().sessions[S.scenario],v=runningVWAP(bars.slice(0,S.barIndex+1)),correct=classify(bars[S.barIndex-1],v.at(-2).vwap,bars[S.barIndex],v.at(-1).vwap);
   if(action==='lock'&&S.replayChoice!==correct){S.replayAttempts++;show();return}
   if(action==='assist'&&S.replayAttempts<3)return;
   S.replayLog.push({barIndex:S.barIndex,choice:S.replayChoice,correct,assisted:action==='assist'||S.replayAssisted,forecast:S.replayForecast,decision:S.replayDecision});S.replayLocked=true;
  }
  if(action==='advance'&&S.replayLocked){
   if(S.barIndex===7){wrap.innerHTML='<div class="instruction"><h3>Synthetic replay completed</h3><p>'+S.replayLog.length+' decisions recorded for this Study Only sequence. No official Lab grade or account entitlement is created.</p>'+B('Continue to Learning Results','finish','primary')+'</div>';return}
   S.barIndex++;S.replayChoice='';S.replayDecision='';S.replayForecast='';S.replayReason='';S.replayAttempts=0;S.replayAssisted=false;S.replayLocked=false;
  }
  if(action==='finish'){onFinish?.({studyOnly:true,observations:S.replayLog.length});return}
  show();
 });
 show();return {wrap,kind:'fictional-reference',getObservations:()=>S.replayLog.length};
}
root.GroundUpLabV32SyntheticReplay=Object.freeze({create,version:'3.2.0-reference-study-only'});
})(globalThis);
