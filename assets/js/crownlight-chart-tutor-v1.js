/* Crownlight chart tutor: deterministic, educational indicator interpretation.
 * Never sees bars beyond the selected/revealed candle. No order signals/advice.
 */
(function(root){
 'use strict';
 const near=(a,b)=>Math.abs(a-b)<=Math.max(.005,Math.abs(b)*.0005);
 function analyze(history){
  const m=root.CrownlightIndicatorMath;
  if(!m||!Array.isArray(history)||!history.length)return null;
  const b=history.at(-1),c=history.map(x=>x.close),n=c.length,i=n-1;
  const e9=m.ema(c,9)[i],e20=m.ema(c,20)[i],vwap=m.vwapProxy(history)[i];
  const prev=history.slice(Math.max(0,n-21),-1);
  const avg=prev.length>=5?prev.reduce((z,x)=>z+x.volume,0)/prev.length:null;
  const rel=avg>0?b.volume/avg:null;
  const high=prev.length?Math.max(...prev.map(x=>x.high)):null;
  const low=prev.length?Math.min(...prev.map(x=>x.low)):null;
  const above=(p,val)=>Number.isFinite(val)?(near(p,val)?'at':p>val?'above':'below'):'unknown';
  const facts=[
   {name:'EMA 9',value:Number.isFinite(e9)?e9:null,reading:Number.isFinite(e9)?'Close '+above(b.close,e9)+' EMA 9. The average follows recent closes; it does not prove support.':'Not ready: nine valid closes required.'},
   {name:'EMA 20',value:Number.isFinite(e20)?e20:null,reading:Number.isFinite(e20)?'Close '+above(b.close,e20)+' EMA 20. Compare slope and price acceptance across several candles.':'Not ready: twenty valid closes required.'},
   {name:'Session VWAP estimate',value:Number.isFinite(vwap)?vwap:null,reading:Number.isFinite(vwap)?'Close '+above(b.close,vwap)+' HLC3-volume VWAP estimate. This is not a tick-exact VWAP or consolidated feed.':'Unavailable: no sufficient volume observations.'},
   {name:'Relative volume',value:rel,reading:rel===null?'Unavailable until five prior observed candles with volume.':rel>=1.5?'Volume is at least 1.5× the preceding observed '+prev.length+'-candle mean; verify venue and session.':rel<.8?'Volume is below 0.8× the preceding observed '+prev.length+'-candle mean; weak participation alone is not a trade signal.':'Volume is near its recent observed average; no breakout confirmation follows from this alone.'}
  ];
  const cues=[];
  if(Number.isFinite(e9)&&Number.isFinite(e20)){
   cues.push(e9>e20?'EMA 9 is above EMA 20, indicating recent closes are stronger than the slower average.':
    e9<e20?'EMA 9 is below EMA 20, indicating recent closes are weaker than the slower average.':
    'EMA 9 and EMA 20 are approximately equal.');
  }
  if(Number.isFinite(high))cues.push(
   b.close>high?'The close is above the PRIOR observed 20-bar high. Ask whether the new level holds and how volume compares.':
   'Price has not closed above the prior observed 20-bar high. Do not call this a confirmed upside breakout.');
  if(Number.isFinite(low)&&b.close<low)cues.push('The close is below the prior observed 20-bar low; consider whether the prior structure has failed.');
  const questions=[
   'What exact price level and observed candle behavior would justify considering an entry, rather than anticipating it?',
   'Where would the trade idea be invalidated, and does the stop distance produce acceptable simulated risk?',
   'What price, volume, VWAP and EMA evidence would require reducing risk or planning an exit?',
   'If the chart is mixed, thinly traded, or not yet confirmed, what supports choosing NO TRADE?'
  ];
  return {sampleSize:n,facts,cues,questions,
   sourceNote:'Teaching scenario only. No recommendation, guaranteed fills, trade alerts, or future observations. Market orders, price movement and actual fills cannot be predicted by indicators.'};
 }
 const api={analyze};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.CrownlightChartTutor=api;
})(typeof window==='undefined'?globalThis:window);
