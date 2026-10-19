/* v0.14.0.92 — deterministic, testable OHLCV execution domain engine.
 * No API route exports datasets. The engine is NOT a replacement for secure,
 * server-owned replay sessions or tick-by-tick execution. Inputs must come
 * from Owner-verified/redistribution-authorized private historical sources.
 */
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const assert=(ok,message)=>{if(!ok)throw new Error(message)};
function normalizeBars(input){
 assert(Array.isArray(input)&&input.length>=2&&input.length<=100000,'Expected 2..100000 OHLCV bars');
 let prev=-Infinity;
 return input.map((b,i)=>{
  const t=Date.parse(b?.timestamp);
  assert(Number.isFinite(t)&&t>prev,'Bars must contain strictly increasing ISO timestamps; index '+i);prev=t;
  const {open,high,low,close,volume}=b;
  assert([open,high,low,close,volume].every(finite),'Invalid OHLCV numeric types at bar '+i);
  assert(low>0&&high>=Math.max(open,close)&&low<=Math.min(open,close)&&volume>=0,'Inconsistent OHLCV at bar '+i);
  return Object.freeze({timestamp:new Date(t).toISOString(),open,high,low,close,volume});
 });
}
function visibleThrough(bars,nowIndex){
 assert(Number.isSafeInteger(nowIndex)&&nowIndex>=0&&nowIndex<bars.length,'Out of range replay boundary');
 // NO future bar or future-derived indicators appear in the returned slice.
 return bars.slice(0,nowIndex+1);
}
function sourceReady(meta){
 return meta?.status==='published'&&meta?.evidenceVerified===true&&
  typeof meta.sourceAttribution==='string'&&meta.sourceAttribution.trim().length>=8&&
  meta.licensedForMemberDisplay===true&&
  typeof meta.corporateActionPolicy==='string'&&meta.corporateActionPolicy.trim().length>4;
}
function fillEstimate({side,type,quantity,limitPrice,stopPrice,slippageBps=0,spreadBps=0,fees=0},bar){
 assert(['BUY','SELL'].includes(side),'Unsupported execution side');
 assert(['MARKET','LIMIT','STOP'].includes(type),'Unsupported order type');
 assert(Number.isSafeInteger(quantity)&&quantity>0&&quantity<=10000000,'Invalid quantity');
 assert(finite(slippageBps)&&slippageBps>=0&&slippageBps<=2000&&finite(spreadBps)&&spreadBps>=0&&spreadBps<=2000,'Invalid friction');
 assert(finite(fees)&&fees>=0&&fees<=100000,'Invalid fees');
 if(type!=='MARKET')assert(finite(type==='LIMIT'?limitPrice:stopPrice)&&(type==='LIMIT'?limitPrice:stopPrice)>0,'Invalid order threshold');
 const conservative=price=>Number((price*(1+(side==='BUY'?1:-1)*(slippageBps+spreadBps/2)/10000)).toFixed(6));
 let price=null,assumption='';
 if(type==='MARKET'){price=conservative(bar.open);assumption='Assumed NEXT BAR OPEN with configurable adverse spread/slippage; not an actual fill';}
 if(type==='LIMIT'){
  const p=limitPrice,reached=side==='BUY'?bar.low<=p:bar.high>=p;
  if(reached){
   const candidate=conservative(side==='BUY'?Math.min(bar.open,p):Math.max(bar.open,p));
   // Limit orders can receive price improvement, but never a price WORSE than
   // the specified limit. Adverse spread/slippage may reduce fill probability,
   // which cannot be inferred from OHLC data.
   price=side==='BUY'?Math.min(candidate,p):Math.max(candidate,p);
   assumption='OHLC crossing implies POSSIBLE limit execution only; modeled price cannot violate limit. Fill probability, queue and partial fills remain unknown';
  }
 }
 if(type==='STOP'){
  const p=stopPrice,reached=side==='BUY'?bar.high>=p:bar.low<=p;
  if(reached){
   // Gaps beyond stop execute no better than the opening price.
   const base=side==='BUY'?Math.max(p,bar.open):Math.min(p,bar.open);
   price=conservative(base);assumption='Stop trigger inferred from OHLC; modeled adverse gap/slippage, not guaranteed price';
  }
 }
 if(price===null)return {state:'NOT_TRIGGERED',quantity:0,price:null,fees:0,assumption:'No intrabar price sequence or queue data'};
 const reference=type==='MARKET'?bar.open:(type==='STOP'?stopPrice:limitPrice);
 const adversePerShare=side==='BUY'?Math.max(0,price-reference):Math.max(0,reference-price);
 return {state:'ESTIMATED',quantity,price,fees,totalEstimatedFriction:adversePerShare*quantity+fees,assumption};
}
function bracketOutcome({side,stop,target},bar){
 assert(['LONG','SHORT'].includes(side)&&finite(stop)&&finite(target)&&stop>0&&target>0,'Invalid bracket');
 const stopHit=side==='LONG'?bar.low<=stop:bar.high>=stop;
 const targetHit=side==='LONG'?bar.high>=target:bar.low<=target;
 if(stopHit&&targetHit)return {result:'AMBIGUOUS',requiresResolution:true,notice:'Stop and target touched the same OHLC bar. Without tick order, neither sequence can be proven. Do not award a win or infer a specific fill.'};
 if(stopHit)return{result:'STOP_POSSIBLE',requiresResolution:false};
 if(targetHit)return{result:'TARGET_POSSIBLE',requiresResolution:false};
 return{result:'NEITHER',requiresResolution:false};
}
export {normalizeBars,visibleThrough,sourceReady,fillEstimate,bracketOutcome};
