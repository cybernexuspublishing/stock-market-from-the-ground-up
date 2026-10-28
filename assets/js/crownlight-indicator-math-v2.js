/* Crownlight Chart Studio v2: original indicator calculations.
 * All calculations operate on the already-revealed bars only.
 * HLC3 VWAP is an approximation, NEVER venue-exact tick VWAP.
 */
(function(root){
 'use strict';
 const finite=Number.isFinite;
 function series(bars,key){return bars.map(b=>Number(b[key]));}
 function sma(vals,period){
  const p=Math.round(Number(period));const out=Array(vals.length).fill(null);
  if(!Number.isInteger(p)||p<2||p>500)return out;
  let sum=0;for(let i=0;i<vals.length;i++){
   if(!finite(vals[i]))continue;sum+=vals[i];
   if(i>=p)sum-=vals[i-p];
   if(i>=p-1)out[i]=sum/p;
  }return out;
 }
 function ema(vals,period){
  const p=Math.round(Number(period));const out=Array(vals.length).fill(null);
  if(!Number.isInteger(p)||p<2||p>500||vals.length<p)return out;
  let seed=0;for(let i=0;i<p;i++){if(!finite(vals[i]))return out;seed+=vals[i]}
  let previous=seed/p;out[p-1]=previous;const alpha=2/(p+1);
  for(let i=p;i<vals.length;i++){if(!finite(vals[i]))continue;previous=alpha*vals[i]+(1-alpha)*previous;out[i]=previous}return out;
 }
 function emaSparse(vals,period){
  const positions=[];const compact=[];
  vals.forEach((v,i)=>{if(finite(v)){positions.push(i);compact.push(v)}});
  const result=ema(compact,period),out=Array(vals.length).fill(null);
  result.forEach((v,i)=>{if(finite(v))out[positions[i]]=v});return out;
 }
 function rsi(bars,period){
  const p=Math.round(Number(period));const out=Array(bars.length).fill(null);
  if(!Number.isInteger(p)||p<2||bars.length<=p)return out;
  let gain=0,loss=0;
  for(let i=1;i<=p;i++){const d=bars[i].close-bars[i-1].close;gain+=Math.max(0,d);loss+=Math.max(0,-d)}
  gain/=p;loss/=p;
  const value=()=>loss===0?(gain===0?50:100):100-100/(1+gain/loss);
  out[p]=value();
  for(let i=p+1;i<bars.length;i++){
   const delta=bars[i].close-bars[i-1].close;
   gain=(gain*(p-1)+Math.max(0,delta))/p;loss=(loss*(p-1)+Math.max(0,-delta))/p;
   out[i]=value();
  }return out;
 }
 function atr(bars,period){
  const p=Math.round(Number(period));const out=Array(bars.length).fill(null);
  if(!Number.isInteger(p)||p<2||bars.length<p)return out;
  const tr=bars.map((bar,i)=>i===0?bar.high-bar.low:
    Math.max(bar.high-bar.low,Math.abs(bar.high-bars[i-1].close),Math.abs(bar.low-bars[i-1].close)));
  let sum=0;for(let i=0;i<p;i++)sum+=tr[i];
  let value=sum/p;out[p-1]=value;
  for(let i=p;i<bars.length;i++){value=(value*(p-1)+tr[i])/p;out[i]=value}return out;
 }
 function bollinger(bars,period,multiplier){
  const p=Math.round(Number(period)),m=Number(multiplier),close=series(bars,'close');
  const middle=sma(close,p),upper=Array(bars.length).fill(null),lower=Array(bars.length).fill(null);
  if(!finite(m)||m<=0||m>10)return {middle,upper,lower};
  for(let i=p-1;i<bars.length;i++){
   if(!finite(middle[i]))continue;let variance=0;
   for(let k=i-p+1;k<=i;k++)variance+=(close[k]-middle[i])**2;
   const sigma=Math.sqrt(variance/p);upper[i]=middle[i]+m*sigma;lower[i]=middle[i]-m*sigma;
  }return {middle,upper,lower};
 }
 function macd(bars,fast=12,slow=26,signal=9){
  const closes=series(bars,'close'),e1=ema(closes,fast),e2=ema(closes,slow);
  const line=closes.map((_,i)=>finite(e1[i])&&finite(e2[i])?e1[i]-e2[i]:null);
  const signalLine=emaSparse(line,signal);
  return {line,signal:signalLine,histogram:line.map((v,i)=>finite(v)&&finite(signalLine[i])?v-signalLine[i]:null)};
 }
 const nyFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 function etParts(date){
  const parts=nyFormatter.formatToParts(date instanceof Date?date:new Date(date));
  const get=key=>parts.find(p=>p.type===key)?.value||'00';
  return {day:get('year')+'-'+get('month')+'-'+get('day'),hour:Number(get('hour')),minute:Number(get('minute'))};
 }
 function session(bar){
  const p=etParts(bar.time);const minute=p.hour*60+p.minute;
  return {day:p.day,kind:minute>=570&&minute<960?'regular':minute>=240&&minute<570?'pre':minute>=960&&minute<1200?'after':'overnight'};
 }
 function vwapProxy(bars){
  // A volume-weighted HLC3 bar approximation, not a true trade VWAP.
  let key=null,sum=0,volume=0;
  return bars.map(b=>{
   const ss=session(b),next=ss.day+'-'+ss.kind;
   if(next!==key){key=next;sum=0;volume=0}
   if(!finite(b.volume)||b.volume<=0)return volume>0?sum/volume:null;
   sum+=((b.high+b.low+b.close)/3)*b.volume;volume+=b.volume;
   return sum/volume;
  });
 }
 function observedLevels(bars){
  let day='',observedHigh=-Infinity,observedLow=Infinity,priorHigh=null,priorLow=null,preHigh=-Infinity,preLow=Infinity;
  const levels={HOD:[],LOD:[],PMH:[],PML:[],PDH:[],PDL:[]};
  bars.forEach((b,i)=>{
   const ss=session(b);
   if(ss.day!==day){
    if(day){priorHigh=finite(observedHigh)?observedHigh:null;priorLow=finite(observedLow)?observedLow:null}
    day=ss.day;observedHigh=-Infinity;observedLow=Infinity;preHigh=-Infinity;preLow=Infinity;
   }
   if(ss.kind==='pre'){preHigh=Math.max(preHigh,b.high);preLow=Math.min(preLow,b.low)}
   if(ss.kind==='regular'){observedHigh=Math.max(observedHigh,b.high);observedLow=Math.min(observedLow,b.low)}
   levels.HOD[i]=finite(observedHigh)?observedHigh:null;
   levels.LOD[i]=finite(observedLow)?observedLow:null;
   levels.PMH[i]=finite(preHigh)?preHigh:null;
   levels.PML[i]=finite(preLow)?preLow:null;
   levels.PDH[i]=priorHigh;levels.PDL[i]=priorLow;
  });
  return levels;
 }
 const api={sma,ema,rsi,atr,bollinger,macd,vwapProxy,observedLevels,session};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.CrownlightIndicatorMath=api;
})(typeof window!=='undefined'?window:globalThis);
