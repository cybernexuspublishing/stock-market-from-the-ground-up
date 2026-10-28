/* Crownlight trade-to-candle math. No market data is fabricated or backfilled.
 * Each active bar represents eligible observations received since connection.
 * This is NOT official consolidated bar OHLCV and does not certify replay.
 */
(function(root){
 'use strict';
 const validTrade=(t,symbol)=>{
  const epoch=Date.parse(String(t?.t||''));
  return t&&t.T==='t'&&t.S===symbol&&Number.isFinite(epoch)&&Number.isFinite(t.p)&&t.p>0&&
    Number.isSafeInteger(t.s)&&t.s>0&&t.s<=10000000;
 };
 function create(symbol,{limit=320}={}){
  if(typeof symbol!=='string'||!/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol))throw Error('Invalid live symbol');
  let active=null,previous=[],lastTrade=-Infinity,seen=new Set(),seenQueue=[];
  function ingest(t){
   if(!validTrade(t,symbol))return {accepted:false,reason:'invalid'};
   const ms=Date.parse(t.t),minute=Math.floor(ms/60000)*60000;
   if(ms<lastTrade||active&&minute<active.ms)return {accepted:false,reason:'late'};
   const id=Number.isSafeInteger(t.i)?String(t.i):null;
   if(id&&seen.has(id))return {accepted:false,reason:'duplicate'};
   if(id){seen.add(id);seenQueue.push(id);if(seenQueue.length>3000)seen.delete(seenQueue.shift())}
   lastTrade=ms;
   const price=t.p,volume=t.s;
   let finalized=null;
   if(active&&minute>active.ms){finalized={...active,forming:false};previous.push(finalized);previous=previous.slice(-limit);active=null}
   if(!active)active={ms:minute,time:new Date(minute).toISOString(),open:price,high:price,low:price,close:price,
     volume:0,tradeCount:0,notional:0,lastTrade:t.t,forming:true};
   active.high=Math.max(active.high,price);active.low=Math.min(active.low,price);active.close=price;
   active.volume+=volume;active.tradeCount+=1;active.notional+=price*volume;active.lastTrade=t.t;
   return {accepted:true,bar:snapshotBar(active),finalized:finalized?snapshotBar(finalized):null,newBar:active.tradeCount===1};
  }
  function snapshotBar(b){return b?{time:b.time,open:b.open,high:b.high,low:b.low,close:b.close,
   volume:b.volume,tradeCount:b.tradeCount,providerVwap:b.volume?b.notional/b.volume:null,forming:b.forming,
   lastTrade:b.lastTrade}:null}
  function finalizeAt(now){
   const ms=Number(now);
   if(!active||!Number.isFinite(ms)||ms<active.ms+60000)return null;
   const final={...active,forming:false};
   previous.push(final);previous=previous.slice(-limit);active=null;
   return snapshotBar(final);
  }
  function snapshot(){return [...previous.map(snapshotBar),...(active?[snapshotBar(active)]:[])].slice(-limit)}
  function reset(){active=null;previous=[];lastTrade=-Infinity;seen.clear();seenQueue=[]}
  return {ingest,finalizeAt,snapshot,reset,get active(){return snapshotBar(active)}};
 }
 const exports={create,validTrade};
 if(typeof module!=='undefined'&&module.exports)module.exports=exports;
 root.CrownlightLiveAggregator=exports;
})(typeof window==='undefined'?globalThis:window);
