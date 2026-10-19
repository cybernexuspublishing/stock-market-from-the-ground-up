/* v0.14.0.92 — Source-independent no-lookahead visibility gate.
 * This is a standalone server utility; integration requires reviewed storage + QA.
 * Never trust client-supplied cursor, grading keys, or "observed" future prices.
 */
const allowed=new Set(['open','high','low','close','volume','timestamp']);
const canonicalTime=value=>{
 const n=typeof value==='number'?value:Date.parse(String(value??''));
 if(!Number.isFinite(n)||n<=0)throw new TypeError('Invalid market timestamp');
 return n;
};
const finite=(v,k)=>{const n=Number(v);if(v===null||v===undefined||v===''||!Number.isFinite(n))throw new TypeError('Invalid '+k);return n};
export function validateReplayBars(bars,{maximum=20000}={}){
 if(!Array.isArray(bars)||!bars.length||bars.length>maximum)throw new RangeError('Dataset size is invalid');
 let prior=-Infinity;
 return bars.map((b,i)=>{
  if(!b||typeof b!=='object'||Array.isArray(b))throw new TypeError('Invalid bar at '+i);
  const timestamp=canonicalTime(b.timestamp??b.time);
  if(timestamp<=prior)throw new RangeError('Bars must be strictly chronological; duplicate bars forbidden');
  prior=timestamp;
  const open=finite(b.open,'open'),high=finite(b.high,'high'),low=finite(b.low,'low'),close=finite(b.close,'close'),volume=finite(b.volume,'volume');
  if(low<0||open<0||high<0||close<0||volume<0||low>high||high<Math.max(open,close)||low>Math.min(open,close))
    throw new RangeError('Invalid OHLCV invariant at '+i);
  return Object.freeze({timestamp,open,high,low,close,volume});
 });
}
export function visibleReplayBars(verifiedBars,serverAuthorizedCursor,{lag=0,maximum=20000}={}){
 if(!Number.isSafeInteger(serverAuthorizedCursor)||serverAuthorizedCursor<0||!Number.isSafeInteger(lag)||lag<0)
  throw new RangeError('Invalid authorized cursor or lag');
 const bars=validateReplayBars(verifiedBars,{maximum});
 if(serverAuthorizedCursor>=bars.length)throw new RangeError('Cursor is outside dataset');
 const visibleUntil=serverAuthorizedCursor-lag;
 return Object.freeze({visibleUntil,barCount:Math.max(0,visibleUntil+1),
  bars:Object.freeze(visibleUntil>=0?bars.slice(0,visibleUntil+1):[])});
}
export function commitmentBoundReplay(verifiedBars,serverAuthorizedCursor,commitment){
 if(!commitment||typeof commitment!=='object'||commitment.locked!==true||
    !Number.isSafeInteger(commitment.authorizedCursor)||commitment.authorizedCursor!==serverAuthorizedCursor)
  throw new Error('Server-locked decision evidence is required before outcome reveal');
 return visibleReplayBars(verifiedBars,serverAuthorizedCursor);
}
