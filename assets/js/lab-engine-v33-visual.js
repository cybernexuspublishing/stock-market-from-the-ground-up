/* Shared v3.3 visual engine. Only fictional data from the approved
 * reference lessons; no private replay candles or historical claims.
 */
(function(root){
'use strict';
const ns='http://www.w3.org/2000/svg';
function create(kind,value){
 const wrap=document.createElement('div'),svg=document.createElementNS(ns,'svg'),facts=document.createElement('dl');
 wrap.className='gu-v33-visual-grid';facts.className='gu-v33-reference-values';
 svg.setAttribute('viewBox','0 0 540 310');svg.setAttribute('role','img');
 svg.setAttribute('aria-label',kind==='candle'?'Fictional OHLC candlestick':'Fictional traded share volumes');
 wrap.append(svg,facts);
 function shape(tag,attrs,text){
  const n=document.createElementNS(ns,tag);
  for(const name of Object.keys(attrs))n.setAttribute(name,attrs[name]);
  if(text!==undefined)n.textContent=text;
  svg.append(n);
 }
 function data(k,v){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;facts.append(dt,dd)}
 function update(value){
  svg.replaceChildren();facts.replaceChildren();
  shape('rect',{x:0,y:0,width:540,height:310,rx:10,fill:'#12283d'});
  if(kind==='candle'){
   const y=p=>28+(32.5-p)*120;
   shape('title',{},'Fictional candle with high, open, close, and low price labels');
   shape('line',{x1:180,x2:180,y1:y(32.5),y2:y(30.5),stroke:'#f3c779','stroke-width':5});
   shape('rect',{x:150,y:Math.min(y(31),y(value)),width:60,height:Math.max(3,Math.abs(y(31)-y(value))),fill:value>=31?'#238669':'#b85664'});
   for(const pair of [['H',32.5],['O',31],['C',value],['L',30.5]]){
    shape('text',{x:244,y:y(pair[1])+5,fill:'#e8f4fa','font-size':16},pair[0]+' $'+pair[1].toFixed(2));
   }
   const body=Math.abs(value-31);
   data('High','$32.50');data('Open','$31.00');data('Close','$'+value.toFixed(2));data('Low','$30.50');
   data('Real body','$'+body.toFixed(2));data('Full range','$2.00');data('Body proportion',(body/2*100).toFixed(1)+'%');
  }else{
   shape('title',{},'Fictional share volume at two different prices');
   for(const item of [{x:100,price:8,shares:200,color:'#527fba'},{x:310,price:10,shares:value,color:'#40a585'}]){
    const height=item.shares/Math.max(200,value)*185;
    shape('rect',{x:item.x,y:230-height,width:90,height,fill:item.color});
    shape('text',{x:item.x,y:257,fill:'#e8f4fa','font-size':15},'$'+item.price+' · '+item.shares+' shares');
   }
   const dollars=1600+10*value,shares=200+value;
   data('First price','$8.00');data('First volume','200 shares');data('Second price','$10.00');data('Second volume',value+' shares');
   data('Total dollars','$'+dollars.toFixed(2));data('Total shares',String(shares));data('VWAP','$'+(dollars/shares).toFixed(2));
  }
 }
 update(value);return {wrap,update};
}
root.GroundUpLabV33Visual=Object.freeze({create});
})(globalThis);