/* v0.14.0.92 — server-owned replay client. No local storage, future bars or browser grading. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let sb=null,sessionId='',cursor=0,locked=false,busy=false;
// Only server-revealed observations in the current session are plotted.
const visibleCandles=[];
function notice(msg,err=false){$('vr-notice').textContent=msg;$('vr-notice').className='status-message '+(err?'error':'success');}
async function api(action,payload={}){
 const session=(await sb.auth.getSession()).data?.session;
 if(!session?.access_token)throw Error('Sign in to continue.');
 const endpoint='/api/learning-replay-v01492?action='+encodeURIComponent(action);
 const isRead=['current','catalog','resume','visible'].includes(action);
 const u=['current','visible'].includes(action)?endpoint+'&sessionId='+encodeURIComponent(sessionId):endpoint;
 const res=await fetch(u,{method:isRead?'GET':'POST',cache:'no-store',headers:{
 authorization:'Bearer '+session.access_token,...(!isRead?{'content-type':'application/json'}:{})},
 body:isRead?undefined:JSON.stringify({...payload,sessionId})});
 const data=await res.json().catch(()=>({}));
 if(!res.ok||!data.ok)throw Error(data.error||'Replay service unavailable.');
 return data;
}
function plotVisibleCandles(){
 const svg=$('vr-visible-chart');if(!svg)return;
 const bars=visibleCandles.slice(-40);svg.replaceChildren();if(!bars.length)return;
 const ns='http://www.w3.org/2000/svg';
 const add=(tag,attrs,text)=>{const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));if(text!==undefined)el.textContent=text;svg.appendChild(el);return el;};
 const w=920,h=330,l=70,r=28,top=20,bottom=42;
 const priceValues=bars.flatMap(b=>[Number(b.low),Number(b.high)]);
 if(priceValues.some(v=>!Number.isFinite(v)))return;
 const lo=Math.min(...priceValues),hi=Math.max(...priceValues),pad=Math.max((hi-lo)*0.09,0.025);
 const low=lo-pad,high=hi+pad,scale=(h-top-bottom)/(high-low),y=v=>top+(high-v)*scale;
 const gap=(w-l-r)/bars.length,candleW=Math.min(22,Math.max(4,gap*0.56));
 for(let i=0;i<=4;i++){const price=low+(high-low)*i/4,py=y(price);
  add('line',{x1:l,y1:py,x2:w-r,y2:py,stroke:'#718096','stroke-opacity':0.25});
  add('text',{x:5,y:py+4,'font-size':13,fill:'currentColor'},price.toFixed(2));}
 bars.forEach((b,i)=>{const op=Number(b.open),cl=Number(b.close),min=Number(b.low),max=Number(b.high);
  if(![op,cl,min,max].every(Number.isFinite))return;
  const x=l+(i+0.5)*gap,color=cl>=op?'#17865d':'#ce4256';
  add('line',{x1:x,y1:y(max),x2:x,y2:y(min),stroke:color,'stroke-width':2});
  add('rect',{x:x-candleW/2,y:y(Math.max(op,cl)),width:candleW,
   height:Math.max(2,Math.abs(op-cl)*scale),fill:color,stroke:color,'stroke-width':1});
  if(i===0||i===bars.length-1||i%Math.max(1,Math.ceil(bars.length/6))===0)
   add('text',{x,y:h-13,'text-anchor':'middle','font-size':12,fill:'currentColor'},String(b.timestamp||'').slice(11,16));
 });
 svg.setAttribute('role','img');
 svg.setAttribute('aria-label',bars.length+' server-revealed OHLCV candles. Later unrevealed bars are not included.');
 const note=$('vr-visible-count');if(note)note.textContent=bars.length+' observed candle(s) displayed; no future candles have been sent to this chart.';
}
function addBar(b){
 if(!b)return;
 visibleCandles.push(b);plotVisibleCandles();
 const row=document.createElement('tr');
 row.innerHTML=[b.timestamp,b.open,b.high,b.low,b.close,b.volume].map(v=>'<td>'+esc(v)+'</td>').join('');
 $('vr-bars').append(row);
}
function renderState(){
 $('vr-session').hidden=!sessionId;
 $('vr-id').textContent=sessionId;
 $('vr-index').textContent=String(cursor);
 $('vr-plan').hidden=locked;
 $('vr-advance').disabled=!locked||busy;
 $('vr-finish').disabled=!locked||busy;
}
async function call(fn){
 if(busy)return;
 busy=true;$('vr-start').disabled=true;$('vr-lock').disabled=true;$('vr-advance').disabled=true;
 try{await fn()}catch(e){notice(e.message||'Unexpected replay error.',true)}
 finally{busy=false;$('vr-start').disabled=false;$('vr-lock').disabled=locked;$('vr-refresh').disabled=false;$('vr-resume').disabled=false;renderState()}
}
function orderPlan(){
 const side=$('vr-side').value;if(!side)return null;
 const type=$('vr-type').value;
 const quantity=Number($('vr-quantity').value);
 const priceText=$('vr-limit').value.trim(),price=priceText?Number(priceText):null;
 const readCost=id=>{const value=$(id).value.trim();return value===''?NaN:Number(value)};
 const slippageBps=readCost('vr-slippage'),spreadBps=readCost('vr-spread'),fees=readCost('vr-fees');
 if(!['BUY','SELL'].includes(side)||!['MARKET','LIMIT','STOP'].includes(type)||
   !Number.isSafeInteger(quantity)||quantity<1||quantity>1000000)
  throw Error('Choose a BUY/SELL order type and 1–1,000,000 whole shares.');
 if(![slippageBps,spreadBps,fees].every(Number.isFinite)||
   slippageBps<0||slippageBps>2000||spreadBps<0||spreadBps>2000||fees<0||fees>100000)
  throw Error('Spread and slippage must be 0–2,000 basis points; fees must be between $0 and $100,000.');
 if(type!=='MARKET'&&(!Number.isFinite(price)||price<=0))
  throw Error('Enter a positive limit or stop activation price.');
 const plan={side,type,quantity,slippageBps,spreadBps,fees};
 if(type==='LIMIT')plan.limitPrice=price;
 if(type==='STOP')plan.stopPrice=price;
 return plan;
}
async function catalog(){
 const data=await api('catalog');
 const rows=Array.isArray(data.datasets)?data.datasets:[];
 const requested=new URLSearchParams(location.search).get('dataset')||'';
 const select=$('vr-dataset');select.replaceChildren();
 const first=document.createElement('option');first.value='';first.textContent=rows.length?'Select a published dataset':'No reviewed datasets available';select.append(first);
 for(const d of rows){
  if(!/^[A-Z][A-Z0-9_-]{2,79}$/.test(String(d.code||'')))continue;
  const option=document.createElement('option');option.value=d.code;
  option.textContent=(d.synthetic?'ORIGINAL SIMULATION — ':'HISTORICAL — ')+String(d.title||d.code)+' ('+String(d.ticker||'unlisted ticker')+')';
  select.append(option);
  if(d.code===requested){select.value=d.code;$('vr-code').value=d.code;}
 }
 $('vr-dataset-note').textContent=rows.length
  ?rows.length+' available datasets. ORIGINAL SIMULATIONS are invented lessons, not verified historical prices. Historical cases require separate source verification.'
  :'No authorized original simulations or independently verified historical datasets are published yet.';
}
async function resume(){
 $('vr-journal-link').hidden=true;
 const data=await api('resume');
 const r=data.session;
 if(!r){notice(data.notice||'There is no saved replay session.');return}
 sessionId=r.id;cursor=r.currentIndex;locked=r.decisionLocked===true;
 visibleCandles.length=0;$('vr-bars').replaceChildren();
 // The resume contract sends ONLY its current candle; fetch bounded, already
 // observed history after session ownership and source rights are rechecked.
 let restored=false;
 try{
  const visible=await api('visible');
  if(visible.sessionId!==sessionId||visible.currentIndex!==cursor||
    !Array.isArray(visible.bars)||!visible.bars.length||
    visible.bars.at(-1).index!==cursor)throw Error('Replay history changed');
  for(const b of visible.bars)addBar(b);
  restored=true;
 }catch{addBar(r.bar)}
 $('vr-code').value=r.dataset?.code||'';
 $('vr-source').textContent=[r.dataset?.synthetic?'ORIGINAL FICTIONAL SIMULATION — NOT MARKET HISTORY': 'VERIFIED HISTORICAL SOURCE',r.dataset?.sourceAttribution,r.dataset?.licenseNotice].filter(Boolean).join(' · ');
 $('vr-execution').hidden=true;
 notice('Session restored at bar '+cursor+'. '+(restored?'Previously observed candles were restored from the private server.':'Only the current candle was available; earlier observations were not restored.')+' Future data remain private.');
 renderState();
}
async function start(){
 $('vr-journal-link').hidden=true;
 const code=String($('vr-dataset').value||$('vr-code').value).trim().toUpperCase();
 if(!/^[A-Z][A-Z0-9_-]{2,79}$/.test(code))throw Error('Enter an Owner-published dataset code.');
 const r=await api('start',{datasetCode:code});
 sessionId=r.sessionId;cursor=r.currentIndex;locked=false;
 visibleCandles.length=0;$('vr-bars').replaceChildren();$('vr-execution').hidden=true;addBar(r.bar);
 $('vr-source').textContent=(r.dataset?.synthetic?'ORIGINAL FICTIONAL SIMULATION — NOT MARKET HISTORY · ':'VERIFIED HISTORICAL SOURCE · ')+r.dataset?.sourceAttribution+' · '+r.dataset?.licenseNotice;
 notice(r.notice);renderState();
}
async function lock(){
 if(!sessionId)throw Error('Start with a verified dataset.');
 const r=await api('lock',{decision:$('vr-decision').value,reasoning:$('vr-reason').value,plan:orderPlan()});
 locked=true;notice(r.notice);renderState();
}
async function advance(){
 const r=await api('advance',{expectedIndex:cursor});
 cursor=r.currentIndex;addBar(r.bar);
 if(r.execution){
  $('vr-execution').hidden=false;
  const x=r.execution,filled=x.state==='ESTIMATED';
  $('vr-execution').textContent=filled?
   'Hypothetical next-bar '+String(x.state)+': '+x.quantity+
   ' share(s) at '+Number(x.price).toFixed(4)+
   ', modeled fees 
 }
 notice('Bar '+cursor+' revealed. Future data remain server-side.');renderState();
}
async function finish(){
 const r=await api('finish');
 locked=false;notice(r.notice);
 const link=$('vr-journal-link');
 if(Number.isSafeInteger(r.journalId)&&r.journalId>0){
  link.href='journal-entry.html?id='+encodeURIComponent(String(r.journalId));
  link.textContent='Open linked Trading Journal record #'+r.journalId;
  link.hidden=false;
 }else link.hidden=true;
 visibleCandles.length=0;plotVisibleCandles();
 sessionId='';$('vr-session').hidden=true;
}
async function init(){
 let u=null;
 try{sb=await window.getSupabaseClient();if(!sb)throw Error('Authentication client unavailable.');
  u=(await sb.auth.getUser()).data?.user;
  notice(u?'Enter a published dataset code to start.':'Sign in before using the replay tool.',!u);}
 catch(e){notice(e.message,true)}
 $('vr-start').addEventListener('click',()=>call(start));
 $('vr-refresh').addEventListener('click',()=>call(catalog));
 $('vr-resume').addEventListener('click',()=>call(resume));
 $('vr-dataset').addEventListener('change',()=>{if($('vr-dataset').value)$('vr-code').value=$('vr-dataset').value});
 if(u){await call(catalog);if(!sessionId)await call(resume)}

 $('vr-lock').addEventListener('click',()=>call(lock));
 $('vr-advance').addEventListener('click',()=>call(advance));
 $('vr-finish').addEventListener('click',()=>call(finish));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
+Number(x.fees||0).toFixed(2)+
   ', estimated adverse friction 
 }
 notice('Bar '+cursor+' revealed. Future data remain server-side.');renderState();
}
async function finish(){
 const r=await api('finish');
 locked=false;notice(r.notice);
 const link=$('vr-journal-link');
 if(Number.isSafeInteger(r.journalId)&&r.journalId>0){
  link.href='journal-entry.html?id='+encodeURIComponent(String(r.journalId));
  link.textContent='Open linked Trading Journal record #'+r.journalId;
  link.hidden=false;
 }else link.hidden=true;
 visibleCandles.length=0;plotVisibleCandles();
 sessionId='';$('vr-session').hidden=true;
}
async function init(){
 let u=null;
 try{sb=await window.getSupabaseClient();if(!sb)throw Error('Authentication client unavailable.');
  u=(await sb.auth.getUser()).data?.user;
  notice(u?'Enter a published dataset code to start.':'Sign in before using the replay tool.',!u);}
 catch(e){notice(e.message,true)}
 $('vr-start').addEventListener('click',()=>call(start));
 $('vr-refresh').addEventListener('click',()=>call(catalog));
 $('vr-resume').addEventListener('click',()=>call(resume));
 $('vr-dataset').addEventListener('change',()=>{if($('vr-dataset').value)$('vr-code').value=$('vr-dataset').value});
 if(u){await call(catalog);if(!sessionId)await call(resume)}

 $('vr-lock').addEventListener('click',()=>call(lock));
 $('vr-advance').addEventListener('click',()=>call(advance));
 $('vr-finish').addEventListener('click',()=>call(finish));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
+Number(x.totalEstimatedFriction||0).toFixed(2)+
   '. '+String(x.assumption||'No real order was placed.'):
   'No market fill is asserted ('+String(x.state||'unknown')+'). '+
   String(x.assumption||'The observed bar cannot prove an executable price or volume.');
 }
 notice('Bar '+cursor+' revealed. Future data remain server-side.');renderState();
}
async function finish(){
 const r=await api('finish');
 locked=false;notice(r.notice);
 const link=$('vr-journal-link');
 if(Number.isSafeInteger(r.journalId)&&r.journalId>0){
  link.href='journal-entry.html?id='+encodeURIComponent(String(r.journalId));
  link.textContent='Open linked Trading Journal record #'+r.journalId;
  link.hidden=false;
 }else link.hidden=true;
 visibleCandles.length=0;plotVisibleCandles();
 sessionId='';$('vr-session').hidden=true;
}
async function init(){
 let u=null;
 try{sb=await window.getSupabaseClient();if(!sb)throw Error('Authentication client unavailable.');
  u=(await sb.auth.getUser()).data?.user;
  notice(u?'Enter a published dataset code to start.':'Sign in before using the replay tool.',!u);}
 catch(e){notice(e.message,true)}
 $('vr-start').addEventListener('click',()=>call(start));
 $('vr-refresh').addEventListener('click',()=>call(catalog));
 $('vr-resume').addEventListener('click',()=>call(resume));
 $('vr-dataset').addEventListener('change',()=>{if($('vr-dataset').value)$('vr-code').value=$('vr-dataset').value});
 if(u){await call(catalog);if(!sessionId)await call(resume)}

 $('vr-lock').addEventListener('click',()=>call(lock));
 $('vr-advance').addEventListener('click',()=>call(advance));
 $('vr-finish').addEventListener('click',()=>call(finish));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
