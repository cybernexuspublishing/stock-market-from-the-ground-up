/* LAB-UX-STD-001 v1.0 — shared subject-aware learning visuals.
 * All data in this module is deliberately illustrative, fixed and UNGRADED.
 * Never substitute these images for verified historical chart evidence,
 * member-authorized replay, grade records, or private question material.
 */
(function(root){
'use strict';
const TYPE_SET=new Set(['candle','structure','vwap','ema','volume','tape','depth','routing','none']);
const RULES=[
 ['candle',/\bcandlestick\b|\bcandle\b|\bohlc\b|\bwick\b|\bdoji\b|\bbody.to.range\b|\breal body\b|\bengulf/i],
 ['tape',/time\s*(?:and|&)\s*sales|\btape\b|trade\s*prints|order.flow|prints and|trade intensity/i],
 ['depth',/level\s*(?:ii|2)\b|order.book|market.depth|bid[,\s\/&-]*ask|quote\s*width|\bspread\b|\bliquidity\b|\bslippage\b/i],
 ['vwap',/\bvwap\b|volume.weighted.average/i],
 ['ema',/\bema\b|moving.average|multi(?:ple)?.timeframe/i],
 ['volume',/\bvolume\b|participation|relative.volume|trade.frequency|trade.count/i],
 ['structure',/\bchart\b|higher highs|higher lows|lower highs|lower lows|\bhh.hl\b|\blh.ll\b|\btrend\b|support|resistance|\bbreakout\b|\bpullback\b|\bcontinuation\b|\bprice action\b|\breversal\b|\bmomentum\b|\bHOD\b|\bPMH\b|\bPDH\b|\breplay\b|\bprice discovery\b|\bprice behavior\b|\brange\b|\bMFE\b|\bMAE\b|\bgap\b|\bsqueeze\b|\bretest\b|\bfailed\s+reclaim\b|\bDay\s*[123]\b/i],
 ['routing',/order.routing|order.selection|order.types|primary.market|secondary.market|share.issuance|\bsettlement\b|\bexchange\b|participants?\s+relationship|auction\s+mechanic/i]
];
function select({lab,topic,competencies}={}){
 const requested=lab?.teaching?.visualType||lab?.visual?.type;
 if(typeof requested==='string'&&TYPE_SET.has(requested))return requested;
 const candidate=String(topic||lab?.concept||'');
 if(/multiple.timeframe analysis|timeframes and aggregation/i.test(String(lab?.chapterTitle||'')))return 'structure';
 // Relationship across multiple bars takes precedence over a generic
 // "body" or "candle" noun when the activity is about sequential behavior.
 if(/follow.through|opposite expansion|overlapping sequence|aggregation|compression|disagreement across scale|internal sequence|upward path|downward path|swing comparisons?|intraday bars|regular.market (?:open|close)|after.hours transition|pre.?market|extended.hours|halting|\bhalt\b/i.test(candidate))return 'structure';
 if(/\bSMA\b|\bMACD\b|\bRSI\b|crossover|oversold|indicator lag/i.test(candidate))return 'ema';
 if(/large up body|large down body|small body with/i.test(candidate))return 'candle';
 for(const [type,pattern] of RULES)if(pattern.test(candidate))return type;
 // Some historical Foundation Book II/III Lab titles omit a chart term.
 // Their *authorized chapter title* (not an invented historic price series)
 // supplies the missing subject context for instructional visual selection.
 const chapter=String(lab?.chapterTitle||'');
 if(/reading candle bodies and wicks/i.test(chapter))return 'candle';
 if(/candles tell stories in sequence|timeframes and aggregation|multiple.timeframe analysis|higher highs|higher lows|support and resistance|patterns are evidence|breakouts|trend$|why time of day matters|modern trading day|outside regular market hours|momentum indicators/i.test(chapter))return 'structure';
 if(/moving averages|indicators: what they are/i.test(chapter))return 'ema';
 if(/volume, liquidity, and slippage/i.test(chapter))return 'volume';
 // A competency name alone is not sufficient evidence that an unrelated
 // book lesson requires that visual. Only a small safe, explicit fallback
 // applies when an otherwise nontitled Lab is exclusively that exercise.
 const skills=Array.isArray(competencies)?competencies:[];
 if(/^(?:untitled|historical simulator exercise)$/i.test(candidate)&&skills.length===1){
  if(skills[0]==='TAPE_READING')return 'tape';
  if(skills[0]==='VOLUME_ANALYSIS')return 'volume';
 }
 return 'none';
}
const CANDLES=Object.freeze([
 [9.8,10.15,9.7,10.02,220],[10.02,10.39,9.98,10.28,300],
 [10.28,10.49,10.09,10.42,280],[10.42,10.52,9.78,9.91,440],
 [9.91,10.22,9.75,10.15,330],[10.15,10.45,10.06,10.32,290],
 [10.32,10.66,10.24,10.54,365],[10.54,10.62,10.13,10.21,310],
 [10.21,10.49,10.05,10.39,275],[10.39,10.7,10.35,10.62,395]
]);
function h(name,cls){const x=document.createElement(name);if(cls)x.className=cls;return x}
function text(tag,content,cls){const x=h(tag,cls);x.textContent=content;return x}
const usd=v=>'$'+Number(v).toFixed(2);
function cardTitle(type){return ({
 candle:'Construct and read one candlestick',structure:'Read sequential price action',
 vwap:'Price, volume, and illustrative weighted reference',ema:'Price and moving-average context',
 volume:'Candlesticks with corresponding volume',tape:'Read time-and-sales prints',
 depth:'Interpret bid, ask, spread and available size',routing:'Follow an order through a market',
 none:''
 })[type]||'Visual concept study'}
function meta(root,type,note){
 const head=h('div','gu-l33-head');head.append(text('strong',cardTitle(type)),text('span','SIMULATED • STUDY ONLY','gu-l33-badge'));root.append(head);
 root.append(text('p',note||'This is invented educational data, not the actual chart or market tape for the historical Lab. No official assessment result is produced.','gu-l33-source'));
}
function candleSVG({o=31,hv=32.5,l=30.5,c=32}={}){
 const high=Math.max(hv,o,c),low=Math.min(l,o,c),scale=v=>238-(v-low)/Math.max(.01,high-low)*167;
 const direction=c>o?'bullish':c<o?'bearish':'doji';
 const col=direction==='bullish'?'#57d5a5':direction==='bearish'?'#f38b96':'#bed1de';
 const bodyFill=direction==='bullish'?'#1f896b':direction==='bearish'?'#a3465a':'#668093';
 const bodyTop=Math.min(scale(o),scale(c)),bodyHeight=Math.max(3,Math.abs(scale(o)-scale(c)));
 const key=[['HIGH',high],['OPEN',o],['CLOSE',c],['LOW',low]];
 return '<svg viewBox="0 0 670 295" role="img" aria-label="Illustrative '+direction+' candlestick with labeled open high low close, body and full range">'+
 '<rect width="670" height="295" rx="12" fill="#10283c"/>'+
 [60,103,146,189,232].map(y=>'<line x1="24" x2="642" y1="'+y+'" y2="'+y+'" stroke="#284964" stroke-dasharray="4 7"/>').join('')+
 '<line data-candle-feature="range" x1="115" x2="115" y1="71" y2="238" stroke="#e7ba68" stroke-width="5"/>'+
 '<line x1="101" x2="129" y1="71" y2="71" stroke="#e7ba68" stroke-width="4"/>'+
 '<line x1="101" x2="129" y1="238" y2="238" stroke="#e7ba68" stroke-width="4"/>'+
 '<line x1="219" x2="219" y1="'+scale(high)+'" y2="'+scale(low)+'" stroke="'+col+'" stroke-width="5"/>'+
 '<rect data-candle-feature="body" x="177" y="'+bodyTop+'" width="84" height="'+bodyHeight+'" fill="'+bodyFill+'" stroke="'+col+'" stroke-width="3"/>'+
 key.map((p,i)=>'<line data-candle-feature="'+p[0].toLowerCase()+'" x1="270" x2="372" y1="'+scale(p[1])+'" y2="'+scale(p[1])+'" stroke="#8ab4d1" stroke-dasharray="3 4"/><text data-candle-feature="'+p[0].toLowerCase()+'" x="384" y="'+(scale(p[1])+5)+'" font-family="system-ui" fill="#edf5ff" font-size="15" font-weight="600">'+p[0]+' '+usd(p[1])+'</text>').join('')+
 '<text x="27" y="277" fill="'+col+'" font-family="system-ui" font-size="14" font-weight="700">'+direction.toUpperCase()+' CANDLE</text><text x="260" y="277" fill="'+col+'" font-family="system-ui" font-size="13">Real body</text><text x="384" y="277" fill="#f1ca86" font-family="system-ui" font-size="13">Full range</text></svg>';
}
function candle(options,showResult=true,interactive=false){
 // The SAME SVG, side measurement panel and slider are used in Learn and
 // Experiment. Selecting a different illustrative worked case updates every
 // value together, without introducing real historical prices or grade data.
 const root=h('section','gu-l33-graphic');
 meta(root,'candle','A illustrative five-minute candle demonstrates Open, High, Low, Close, the real body and the full range.');
 const layout=h('div','gu-v36-candle-layout');
 const main=h('div','gu-l33-single');
 main.innerHTML=candleSVG(options);
 const side=h('aside','gu-v36-price-reference');
 side.setAttribute('aria-label','Price measurements for the displayed candle');
 side.append(text('h4','Price Measurements'));
 const label=h('label','gu-v36-table-toggle');
 const check=h('input');check.type='checkbox';check.checked=true;
 label.append(check,document.createTextNode(' Show accessible OHLC table'));
 side.append(label);
 const reference=h('dl','gu-v36-reference-rows');
 const refValues={};
 for(const [name,key] of [['HIGH','hv'],['CLOSE','c'],['OPEN','o'],['LOW','l']]){
  const row=h('div','gu-v36-reference-row');
  row.append(text('dt',name));
  const result=text('dd','—');result.setAttribute('data-price-measure',key);
  row.append(result);reference.append(row);
  refValues[key]=result;
 }
 side.append(reference);
 side.append(text('p','Price labels also appear directly on the candle.','gu-v36-price-note'));
 check.addEventListener('change',()=>{
  reference.hidden=!check.checked;
 });
 layout.append(main,side);root.append(layout);

 // The original reference has three calculated measurements below the chart.
 const data=h('div','gu-l33-metrics gu-v36-derived-measures');
 const metricValues={};
 for(const [name,key] of [['Real body','body'],['Full range','range'],['Body percentage','percent']]){
  const row=h('div');
  row.append(text('span',name));
  const result=text('strong','—');result.setAttribute('data-candle-result',key);
  row.append(result);data.append(row);metricValues[key]=result;
 }
 const experiment=interactive?h('section','gu-v36-candle-experiment'):null;
 let slider=null,readout=null,output=null;
 if(experiment){
  const top=h('div','gu-v36-experiment-heading');
  const controlLabel=text('label','Closing price','gu-v36-experiment-label');
  slider=h('input');slider.type='range';slider.step='0.05';
  slider.setAttribute('aria-label','Adjust the illustrative candle closing price');
  readout=text('output','', 'gu-v36-experiment-value');
  top.append(controlLabel,readout);
  controlLabel.append(slider);
  experiment.append(top,slider);
  experiment.append(data);
  output=text('output','', 'gu-v32-output gu-v36-candle-summary');
  output.setAttribute('aria-live','off');
  experiment.append(output);
  root.append(experiment);
 }else root.append(data);

 root.append(text('p',
  'Real body = |Close − Open|. Full range = High − Low. Body percentage = (real body ÷ full range) × 100. These completed values cannot predict the next candle.',
  'gu-l33-takeaway'));
 let current={o:31,hv:32.5,l:30.5,c:32};
 let lastHighlight='all';
 function redraw(values,{preserveSlider=false}={}){
  const o=Number(values?.o),hv=Number(values?.hv),l=Number(values?.l),c=Number(values?.c);
  if(![o,hv,l,c].every(Number.isFinite)||
   hv<Math.max(o,c)||l>Math.min(o,c)||hv<=l)return false;
  const updated=document.createElement('div');
  updated.innerHTML=candleSVG({o,hv,l,c});
  const existingSvg=main.querySelector('svg'),updatedSvg=updated.querySelector('svg');
  if(!existingSvg||!updatedSvg)return false;
  existingSvg.innerHTML=updatedSvg.innerHTML;
  existingSvg.setAttribute('aria-label',updatedSvg.getAttribute('aria-label'));
  current={o,hv,l,c};
  for(const [key,field] of Object.entries(refValues))field.textContent=usd(current[key]);
  const body=Math.abs(c-o),range=hv-l;
  metricValues.body.textContent=usd(body);
  metricValues.range.textContent=usd(range);
  metricValues.percent.textContent=showResult?(100*body/range).toFixed(1)+'%':'Calculate';
  if(slider){
   if(!preserveSlider){
    slider.min=l.toFixed(2);slider.max=hv.toFixed(2);
    slider.value=c.toFixed(2);
   }
   readout.textContent=usd(c);
   slider.setAttribute('aria-valuetext',usd(c)+' closing price');
   output.textContent='Open '+usd(o)+' · Close '+usd(c)+' · Body '+usd(body)+
    ' · Range '+usd(range)+' · '+(100*body/range).toFixed(1)+'% · '+
    (c>o?'Bullish Candle':c<o?'Bearish Candle':'Doji');
  }
  // Retain the prior teaching highlight as the candle geometry changes.
  const selected={all:['open','close','high','low','body','range'],
   body:['body','open','close'],range:['range','high','low'],
   percent:['body','range','open','close','high','low'],
   open:['open'],close:['close'],high:['high'],low:['low']}[lastHighlight];
  if(selected){
   for(const element of existingSvg.querySelectorAll('[data-candle-feature]')){
    const part=element.getAttribute('data-candle-feature');
    element.style.opacity=selected.includes(part)?'1':'0.22';
   }
  }
  return true;
 }
 root.setTeachingCandle=values=>redraw(values);
 root.getTeachingCandle=()=>({...current});
 root.addEventListener('gu-v35-highlight',event=>{
  lastHighlight=String(event.detail?.feature||'all');
 });
 if(slider){
  slider.addEventListener('input',()=>{
   const c=Number(slider.value);
   if(!Number.isFinite(c))return;
   redraw({...current,c},{preserveSlider:true});
  });
  slider.addEventListener('change',()=>{
   const {o,hv,l,c}=current;
   if(typeof CustomEvent==='function'){
    root.dispatchEvent(new CustomEvent('gu-v36-candle-adjusted',{
     bubbles:true,detail:{type:'candle',feature:'percent',
      message:'You changed Close to '+usd(c)+'. Open '+usd(o)+
       ', High '+usd(hv)+' and Low '+usd(l)+' remain fixed. Body '+usd(Math.abs(c-o))+
       ', full range '+usd(hv-l)+', and body percentage '+
       (100*Math.abs(c-o)/(hv-l)).toFixed(1)+'%.'}
    }));
   }
  });
 }
 redraw(options||{o:31,hv:32.5,l:30.5,c:32});
 return root;
}
function path(points){return points.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ')}
function chart(type,stage,variant){
 const root=h('section','gu-l33-graphic');const context={
  structure:'Price structure is visible only in relation to earlier candles, not from a single bar.',
  vwap:'Illustrative running bar-close × volume weighting. This is NOT actual trade-level VWAP.',
  ema:'Illustrative moving averages constructed from these illustrative closing prices, not live EMA9/EMA20 history.',
  volume:'Each blue volume column aligns to the same interval as its candle.'
 }[type]||'Contextual illustrative OHLCV illustration.';
 meta(root,type,context+' Later candles are not presented as verified historical evidence.');
 const n=(stage===3?5:stage===7?7:8),bars=CANDLES.slice(0,n),low=9.5,high=10.85;
 const x=i=>77+i*83,yy=v=>252-(v-low)/(high-low)*192,points=[],weighted=[],ema9=[],ema20=[];let dollars=0,shares=0,e9=bars[0][3],e20=bars[0][3];
 bars.forEach((b,i)=>{const [op,h,l,c,v]=b;dollars+=c*v;shares+=v;e9=i?e9+(2/10)*(c-e9):c;e20=i?e20+(2/21)*(c-e20):c;weighted.push([x(i),yy(dollars/shares)]);ema9.push([x(i),yy(e9)]);ema20.push([x(i),yy(e20)]);points.push([x(i),yy(c)]);});
 const draw=bars.map((b,i)=>{const [op,h,l,c,v]=b,asc=c>=op,col=asc?'#53cba2':'#f18c99',q=x(i);return '<g data-candle-index="'+i+'" data-candle-time="'+(('0'+Math.floor((570+5*i)/60)).slice(-2)+':'+('0'+((570+5*i)%60)).slice(-2))+'" tabindex="0" role="button" aria-label="Inspect candle at '+(('0'+Math.floor((570+5*i)/60)).slice(-2)+':'+('0'+((570+5*i)%60)).slice(-2))+'"><rect class="gu-l33-selected-candle" x="'+(q-23)+'" y="33" width="46" height="313" rx="5" fill="#edc45a" fill-opacity=".17" stroke="#edc45a" stroke-width="2" visibility="hidden"/><line x1="'+q+'" x2="'+q+'" y1="'+yy(h)+'" y2="'+yy(l)+'" stroke="'+col+'" stroke-width="3"/><rect x="'+(q-13)+'" y="'+Math.min(yy(op),yy(c))+'" width="26" height="'+Math.max(3,Math.abs(yy(op)-yy(c)))+'" fill="'+(asc?'#238967':'#b45261')+'" stroke="'+col+'" stroke-width="2"/></g>';}).join('');
 const vol=bars.map((b,i)=>'<rect data-volume-index="'+i+'" x="'+(x(i)-13)+'" y="'+(343-b[4]/500*70)+'" width="26" height="'+(b[4]/500*70)+'" fill="#527dad"/>').join('');
 let overlays='';
 if(type==='vwap')overlays='<path d="'+path(weighted)+'" fill="none" stroke="#f0bd67" stroke-width="3.5"/>';
 if(type==='ema')overlays='<path d="'+path(ema9)+'" fill="none" stroke="#f0bd67" stroke-width="3"/><path d="'+path(ema20)+'" fill="none" stroke="#80bcef" stroke-width="3"/>';
 if(type==='structure')overlays='<line x1="45" x2="756" y1="'+yy(10.49)+'" y2="'+yy(10.49)+'" stroke="#e0ba76" stroke-dasharray="8 6" stroke-width="2"/><text x="470" y="'+(yy(10.49)-8)+'" fill="#eed5a1" font-size="15">Illustrative reference level</text>';
 const labels=bars.map((b,i)=>'<text data-time-index="'+i+'" x="'+x(i)+'" y="370" text-anchor="middle" fill="#bed2e1" font-size="13">'+('0'+Math.floor((570+5*i)/60)).slice(-2)+':'+('0'+((570+5*i)%60)).slice(-2)+'</text>').join('');
 const svg='<svg viewBox="0 0 820 395" role="img" aria-label="Illustrative sequential '+type+' illustration with '+bars.length+' completed candles and corresponding blue volume bars">'+
 '<rect width="820" height="395" rx="10" fill="#10283c"/>'+
 [9.6,10,10.4,10.8].map(y=>'<line x1="38" x2="780" y1="'+yy(y)+'" y2="'+yy(y)+'" stroke="#29445d" stroke-dasharray="4 6"/><text x="4" y="'+(yy(y)+5)+'" fill="#bdcedd" font-size="13">'+usd(y)+'</text>').join('')+
 '<line x1="38" x2="780" y1="260" y2="260" stroke="#35536c"/>'+draw+overlays+vol+labels+
 '<text x="38" y="390" fill="#b5cddd" font-size="13">5-minute illustrative intervals · volume shown below candles</text></svg>';
 const graphic=h('div','gu-l33-chart');graphic.innerHTML=svg;
 // Preserve the owner-approved reference's chart and aligned OHLCV side panel.
 // This is a illustrative educational sequence, never historical ticker data.
 const layout=h('div','gu-l33-chart-reference-layout');
 const side=h('aside','gu-l33-chart-reference');side.setAttribute('aria-label','Selected completed candle details');
 side.append(text('h3','Selected completed candle'));
 const sideStamp=text('p','','gu-l33-reference-time');sideStamp.dataset.referenceTime='1';side.append(sideStamp);
 const grid=h('dl','gu-l33-reference-values');
 for(const [name,key] of [['Open','open'],['High','high'],['Low','low'],['Close','close'],['Volume','volume']]){
  const row=h('div','gu-l33-reference-row');row.append(text('dt',name));
  const value=text('dd','—');value.setAttribute('data-reference-field',key);row.append(value);grid.append(row);
 }
 if(type==='vwap'){
  const row=h('div','gu-l33-reference-row');row.append(text('dt','Running VWAP (approx.)'));
  const value=text('dd','—');value.setAttribute('data-reference-field','vwap');row.append(value);grid.append(row);
 }
 side.append(grid);
 side.append(text('p',type==='vwap'?
  'Illustrative running VWAP uses completed bar close × share volume; it is not trade-level VWAP.':
  'All values belong to a illustrative completed candle, not the book’s historical ticker.', 'gu-l33-reference-note'));
 layout.append(graphic,side);root.append(layout);
 const legend=h('div','gu-l33-legend');const entries=[['#53cba2','Rising candle'],['#f18c99','Falling candle'],['#527dad','Volume']];if(type==='vwap')entries.push(['#f0bd67','Weighted illustration']);if(type==='ema')entries.push(['#f0bd67','EMA9'],['#80bcef','EMA20']);if(type==='structure')entries.push(['#e0ba76','Reference level']);
 for(const [col,lbl] of entries){const e=h('span');const dot=h('i');dot.style.background=col;e.append(dot,document.createTextNode(lbl));legend.append(e)}root.append(legend);
 const table=h('details','gu-l33-detail');table.append(text('summary','View completed-candle OHLCV values'));
 const tab=h('table');tab.innerHTML='<caption>Illustrative completed intervals only</caption><thead><tr><th>Time</th><th>Open</th><th>High</th><th>Low</th><th>Close</th><th>Shares</th></tr></thead>';
 const tbody=h('tbody');bars.forEach((b,i)=>{const tr=h('tr');for(const val of [(('0'+Math.floor((570+5*i)/60)).slice(-2)+':'+('0'+((570+5*i)%60)).slice(-2)),...b.slice(0,4).map(usd),String(b[4])])tr.append(text('td',val));tbody.append(tr)});tab.append(tbody);table.append(tab);root.append(table);
 if(stage===3)root.append(text('p','Prediction boundary: only the displayed illustrative observations are shown. Do not assume the next bar must continue the current movement.','gu-l33-takeaway'));
 return root;
}
function weightedGroups(variant){
 const transfer=variant==='transfer';
 const groups=transfer?[[12,150],[16,50]]:[[8,200],[10,100]];
 const root=h('section','gu-l33-graphic');
 meta(root,'vwap','A comparison of illustrative trade groups. The number of shares gives each execution price its weight. The practice answer is deliberately not shown here.');
 const panel=h('div','gu-l33-depth');
 for(const [i,[price,shares]] of groups.entries()){
  const col=h('div');col.append(text('h4','Trade group '+(i+1)));
  const display=h('div');display.append(text('strong',usd(price)+' per share'),text('span',shares+' shares'));col.append(display);
  const bar=h('div');bar.className='gu-l33-weight-bar';
  bar.setAttribute('role','img');bar.setAttribute('aria-label',shares+' shares at '+usd(price));
  const fill=h('span');fill.style.width=(shares/Math.max(...groups.map(g=>g[1]))*100)+'%';fill.style.background=i?'#80bcef':'#51c7a0';bar.append(fill);col.append(bar);panel.append(col);
 }
 root.append(panel);
 root.append(text('p','Multiply each price by its number of shares; add those traded dollar values; divide by the combined share count. Do not use a simple unweighted average.','gu-l33-takeaway'));
 return root;
}
function tape(){
 const root=h('section','gu-l33-graphic');meta(root,'tape','Illustrative completed transaction prints. Trade color alone does not identify the true buyer or seller or prove their intention.');
 const table=h('table','gu-l33-tape');table.innerHTML='<caption>Illustrative Time & Sales</caption><thead><tr><th>Time</th><th>Price</th><th>Shares</th><th>Display</th></tr></thead>';
 const tbody=h('tbody');[['09:30:01','$10.01','150','At ask'],['09:30:02','$10.00','90','At bid'],['09:30:04','$10.02','250','At ask'],['09:30:05','$10.01','100','Between']].forEach((a,i)=>{let row=h('tr');a.forEach(val=>row.append(text('td',val)));row.className=i%2?'gu-l33-sell':'gu-l33-buy';tbody.append(row)});table.append(tbody);root.append(table);
 root.append(text('p','Read the timestamp, transaction price and size together. A displayed execution does not reveal participant motives or guarantee the next trade.','gu-l33-takeaway'));return root;
}
function depth(){
 const root=h('section','gu-l33-graphic');meta(root,'depth','Invented quote and displayed size. Quotes can change or disappear before an order executes.');
 const bids=[['$10.00','350'],['$9.99','210'],['$9.98','450']],asks=[['$10.03','280'],['$10.04','500'],['$10.05','190']];
 const grid=h('div','gu-l33-depth');for(const [side,rows] of [['Bid',bids],['Ask',asks]]){let wrap=h('div');wrap.append(text('h4',side));for(let i=0;i<rows.length;i++){const row=h('div');row.append(text('strong',rows[i][0]),text('span',rows[i][1]+' displayed shares'));wrap.append(row)}grid.append(wrap)}root.append(grid);
 root.append(text('p','Best bid $10.00; best ask $10.03; quoted spread = $0.03 per share (about 0.30% of midpoint $10.015). Displayed liquidity is not a fill guarantee.','gu-l33-takeaway'));return root;
}
function routing(){
 const root=h('section','gu-l33-graphic');meta(root,'routing','Conceptual order-flow diagram. It illustrates possible relationships; actual routing and settlement depend on the order and venue.');
 const flow=h('div','gu-l33-routing');for(const label of ['Investor decision','Broker order handling','Selected execution venue','Execution confirmation','Clearing / settlement'])flow.append(text('div',label));root.append(flow);
 root.append(text('p','An order request is not itself an execution. Price, queue position, routing, liquidity, and regulatory requirements affect the actual result.','gu-l33-takeaway'));return root;
}
function create({type,stage=1,variant='default'}={}){
 if(!TYPE_SET.has(type)||type==='none')return null;
 if(type==='candle')return candle(
  variant==='worked'?{o:20,hv:22,l:19,c:21.2}
   :variant==='bearish'?{o:32,hv:32.5,l:30.5,c:31}
   :variant==='transfer'?{o:12.4,hv:12.7,l:11.9,c:12.1}:undefined,
  !(variant==='practice'||variant==='transfer'),stage===1||stage===2
 );
 if(type==='vwap'&&(variant==='practice'||variant==='transfer'))return weightedGroups(variant);
 if(['structure','ema','vwap','volume'].includes(type))return chart(type,stage,variant);
 if(type==='tape')return tape();
 if(type==='depth')return depth();
 if(type==='routing')return routing();
 return null;
}
root.GroundUpLabV33Contextual=Object.freeze({select,create,version:'LAB-UX-STD-001-v1.0'});
})(globalThis);
