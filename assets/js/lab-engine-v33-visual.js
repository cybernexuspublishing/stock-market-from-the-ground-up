/* Member educational visuals, lifted from owner-approved v3.2 exact
 * candlestick chart source. Fictional inputs only; never represents
 * authenticated historical observations or assessment answers. */
(function(root){
'use strict';
const money=n=>'$'+Number(n).toFixed(2);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function candleMetrics(b){const body=Math.abs(b.c-b.o),range=b.h-b.l;return {body,range,percent:range?body/range*100:null,direction:b.c>b.o?'Bullish':b.c<b.o?'Bearish':'Doji'};}
function candleChart(b,showTable=true){const high= b.h,low=b.l,op=b.o,cl=b.c;const range=Math.max(high-low,.01);const Y=v=>245-((v-low)/range)*183;const ascending=cl>=op;const bw=100,bx=195;const lineColor='#70dfb9';const labels=[{name:'HIGH',v:high},{name:'CLOSE',v:cl},{name:'OPEN',v:op},{name:'LOW',v:low}];return `<div class="chart-shell"><div class="chart-head"><strong>Candlestick Structure · 5-minute interval</strong><span class="badge">Synthetic example</span></div><div class="chart-layout"><div class="chart-area"><svg viewBox="0 0 620 310" role="img" aria-label="${esc(candleMetrics(b).direction)} candle with labeled Open High Low Close price levels"><rect width="620" height="310" fill="#0d2235"/>${[55,100,145,190,245].map(y=>`<line x1="19" y1="${y}" x2="609" y2="${y}" stroke="#345069" stroke-dasharray="4 7"/>`).join('')}<line x1="133" x2="133" y1="62" y2="245" stroke="#efc777" stroke-width="5"/><line x1="120" x2="146" y1="62" y2="62" stroke="#efc777" stroke-width="4"/><line x1="120" x2="146" y1="245" y2="245" stroke="#efc777" stroke-width="4"/><line x1="${bx+bw/2}" x2="${bx+bw/2}" y1="62" y2="245" stroke="${ascending?'#71e4b8':'#f1a3ac'}" stroke-width="5"/><rect x="${bx}" y="${Math.min(Y(op),Y(cl))}" width="${bw}" height="${Math.max(3,Math.abs(Y(op)-Y(cl)))}" stroke="${ascending?'#79f0c4':'#ffaab3'}" stroke-width="3" fill="${ascending?'#258569':'#b95660'}"/>${labels.map((d,i)=>`<line x1="300" x2="${i%2===0?399:480}" y1="${Y(d.v)}" y2="${Y(d.v)}" stroke="${i%3===0?'#bfcede':lineColor}" stroke-width="1.6"/><text x="${i%2===0?406:488}" y="${Y(d.v)+5}" fill="#ecf6fd" font-size="15" font-weight="600">${d.name} ${money(d.v)}</text>`).join('')}<text x="17" y="291" fill="${ascending?'#80eac4':'#f1a3ac'}" font-weight="600" font-size="16">${candleMetrics(b).direction.toUpperCase()} CANDLE</text></svg><div class="chart-legend"><span><i class="legend-dot" style="background:#71e4b8"></i>Real body</span><span><i class="legend-dot" style="background:#efc777"></i>Full range</span></div></div><aside class="chart-data"><h3>Price Measurements</h3><label class="small"><input type="checkbox" data-input="showTable" ${showTable?'checked':''}> Show accessible OHLC table</label>${showTable?labels.map(d=>`<div class="ohlc-row"><span>${d.name}</span><strong>${money(d.v)}</strong></div>`).join(''):'<p class="small">Labels remain visible on the chart.</p>'}<p class="live-note">The price labels also remain directly on the candle display.</p></aside></div></div>`}
function create(kind,value){
 const wrap=document.createElement('div');wrap.className='gu-v33-exact-visual';
 let visibleTable=true,current=Number(value);
 function update(next){
  current=Number(next);
  if(kind==='candle'){
   wrap.innerHTML=candleChart({o:31,h:32.5,l:30.5,c:current,v:100},visibleTable);
   const toggle=wrap.querySelector('[data-input="showTable"]');
   toggle?.addEventListener('change',e=>{visibleTable=e.target.checked;update(current)});
  }else{
   const v=Math.max(50,current),a=200,price=(8*a+10*v)/(a+v);
   wrap.innerHTML='<section class="instruction"><div class="flex-between"><strong>How volume affects weighted price</strong><strong>'+v+' shares at $10</strong></div><div class="ratio-bars"><span style="width:'+(a/(a+v)*100)+'%">$8</span><span style="width:'+(v/(a+v)*100)+'%">$10</span></div><div class="eq"><span class="fraction"><span>$'+(8*a+10*v).toFixed(2)+'</span><span>'+(a+v)+' shares</span></span> = $'+price.toFixed(2)+'</div><p>The price associated with more shares has greater weight. This synthetic demonstration is ungraded.</p></section>';
  }
 }
 update(value);return {wrap,update};
}
root.GroundUpLabV33Visual=Object.freeze({create,version:'3.2-exact-educational-visual'});
})(globalThis);
