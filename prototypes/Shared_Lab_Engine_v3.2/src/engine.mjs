/** Pure, auditable functions for the reusable learning-engine reference. */
export const STEPS = ['Start','Learn','Experiment','Predict','Practice','Assess','Review','Transfer','Results'];
export const MODES = ['Guided','Practice','Blind Decision','Assessment'];
export const money = n => `$${Number(n).toFixed(2)}`;
export const round = (n,p=2) => Number(n.toFixed(p));
export const numberEquals = (value, expected, tolerance=.011) =>
  value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value)) && Math.abs(Number(value)-expected)<=tolerance;
export function candleMetrics({o,h,l,c}) {
  if (![o,h,l,c].every(Number.isFinite) || h<l || h<Math.max(o,c) || l>Math.min(o,c)) throw new Error('Invalid OHLC geometry');
  const body=Math.abs(c-o), range=h-l;
  return {body,range,percent:range===0?null:body/range*100,direction:c>o?'Bullish':c<o?'Bearish':'Doji'};
}
export function weightedAverage(groups) {
  if (!Array.isArray(groups)||!groups.length||groups.some(g=>!Number.isFinite(g.price)||!Number.isFinite(g.volume)||g.volume<=0)) throw new Error('Invalid price/volume input');
  const dollars=groups.reduce((n,g)=>n+g.price*g.volume,0);
  const shares=groups.reduce((n,g)=>n+g.volume,0);
  return {dollars,shares,price:dollars/shares};
}
export function runningVWAP(bars) {
  if (!Array.isArray(bars)) throw new Error('Bars must be an array');
  let shares=0,dollars=0;
  return bars.map((b,i)=>{
    candleMetrics(b);
    if (!Number.isFinite(b.v)||b.v<=0) throw new Error('Invalid volume at bar '+i);
    shares+=b.v;dollars+=b.c*b.v;
    return {shares,dollars,vwap:dollars/shares};
  });
}
/** This OHLC-only rule is a descriptive classification, not an intrabar sequence claim. */
export function classifyVWAP(previousBar,previousVWAP,currentBar,currentVWAP) {
  const wasAbove=previousBar.c>previousVWAP, nowAbove=currentBar.c>currentVWAP;
  if(wasAbove&&nowAbove)return 'hold';
  if(wasAbove&&!nowAbove)return 'loss';
  if(!wasAbove&&nowAbove)return 'reclaim';
  if(currentBar.h>currentVWAP&&currentBar.c<currentVWAP)return 'failed';
  return 'below';
}
export const VWAP_LABELS = {hold:'Holding above VWAP',loss:'Losing VWAP',reclaim:'Reclaiming VWAP',failed:'Possible failed reclaim attempt',below:'Remaining below VWAP'};
export function addCalendarDays(date,days) { const d=new Date(date);if(Number.isNaN(d.getTime()))throw new Error('Invalid date');d.setUTCDate(d.getUTCDate()+days);return d.toISOString(); }
export function includedCreditAllocation(count,periodEnd,issueId='included') {
  if(!Number.isInteger(count)||count<0)throw new Error('Invalid count');
  return {source:'included',id:issueId,remaining:count,expiresAt:addCalendarDays(periodEnd,60)};
}
export function purchasedCreditAllocation(count,id='purchased') {
  if(!Number.isInteger(count)||count<0)throw new Error('Invalid count');
  return {source:'purchased',id,remaining:count,expiresAt:null};
}
export function balance(buckets,now=new Date()) {const t=new Date(now).getTime();return buckets.reduce((n,b)=>n+(!b.expiresAt||new Date(b.expiresAt).getTime()>t?b.remaining:0),0);}
export function useOneCredit(buckets,now=new Date()) {
  const next=buckets.map(b=>({...b})),t=new Date(now).getTime();
  const allowed=next.filter(b=>b.remaining>0&&(!b.expiresAt||new Date(b.expiresAt).getTime()>t));
  allowed.sort((a,b)=>Number(Boolean(b.expiresAt))-Number(Boolean(a.expiresAt)) || (a.expiresAt||'').localeCompare(b.expiresAt||''));
  if(!allowed.length)return {ok:false,buckets:next,charged:null};
  const selected=next.find(b=>b.id===allowed[0].id);
  selected.remaining--;return {ok:true,buckets:next,charged:{source:selected.source,id:selected.id}};
}
export function verifyConfig(config) {
  if(!config||!config.id||!config.title||!['candlestick','vwap'].includes(config.kind)||!Array.isArray(config.questions)||config.questions.length<2)throw new Error('Incomplete Lab configuration');
  config.questions.forEach(q=>{if(!q.id||!q.prompt||!q.answer||!q.lesson||!q.lesson.steps?.length||!q.lesson.mistakes||!q.lesson.limits||!q.lesson.newExample)throw new Error('Incomplete deep instruction for '+q.id)});
  return true;
}
export function explainClassification(prev,prevVWAP,current,currentVWAP,label) {
  return {
    label:VWAP_LABELS[label],
    prior:`Previous candle: close ${money(prev.c)} versus VWAP ${money(prevVWAP)} (${prev.c>prevVWAP?'above':'below or equal'}).`,
    current:`Latest candle: close ${money(current.c)} versus VWAP ${money(currentVWAP)} (${current.c>currentVWAP?'above':'below or equal'}).`,
    interpretation:({hold:'Both completed closes are above their respective VWAP levels.',loss:'Price went from closing above to closing below its updated VWAP.',reclaim:'Price went from closing below to closing above its updated VWAP.',failed:'The high exceeded the final end-of-bar VWAP, but the candle finished below it. OHLC cannot confirm the order of intrabar movements.',below:'Both closes remain below their respective VWAP levels without a completed reclaim.'})[label],
    limitations:'One VWAP observation does not establish a valid long entry. Check structure, volume, spread, liquidity, invalidation and risk. This bar-close approximation is not trade-level VWAP.'
  };
}
