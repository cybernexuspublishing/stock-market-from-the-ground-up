/* Conservative next-bar trailing-stop educational scenario.
 * Bars are already revealed authorized member-supplied OHLCV, never unseen.
 * No same-bar high/low sequencing or guaranteed stop-market execution.
 */
(function(root){'use strict';
 const round=x=>Number(x.toFixed(6));
 function model({direction,entry,initialStop,trailDistance,bars,maxBars}){
  if(!['LONG','SHORT'].includes(direction)||![entry,initialStop,trailDistance].every(x=>Number.isFinite(x)&&x>0)||
   !(direction==='LONG'?initialStop<entry:initialStop>entry))
   return {ok:false,error:'Valid direction, entry, loss-side initial stop and trailing distance required.'};
  if(!Array.isArray(bars)||!Number.isSafeInteger(maxBars)||maxBars<1||maxBars>bars.length||maxBars>20000)
   return {ok:false,error:'Only explicitly revealed bars may be modeled.'};
  let activeStop=initialStop,reference=entry,filled=false,result=null;
  const events=[];
  for(let i=0;i<maxBars;i++){
   const b=bars[i],o=Number(b.open),h=Number(b.high),l=Number(b.low),c=Number(b.close);
   if(![o,h,l,c].every(x=>Number.isFinite(x)&&x>0)||h<Math.max(o,c,l)||l>Math.min(o,c,h))
    return {ok:false,error:'Invalid OHLC values in revealed bar '+(i+1)+'.'};
   const stopBefore=round(activeStop);
   const hit=direction==='LONG'?l<=activeStop:h>=activeStop;
   if(hit){
    // Conservative gap example. This is NOT a brokerage fill estimate.
    const hypothetical=direction==='LONG'?Math.min(o,activeStop):Math.max(o,activeStop);
    result={bar:i+1,stopBefore,modeledTrigger:true,
      hypotheticalGapAwareReference:round(hypothetical)};
    events.push({bar:i+1,stopBefore,after:null,triggered:true});
    filled=true;break;
   }
   // Only after this bar completes do its high/low influence NEXT bar's stop.
   reference=direction==='LONG'?Math.max(reference,h):Math.min(reference,l);
   activeStop=direction==='LONG'?Math.max(activeStop,reference-trailDistance):
    Math.min(activeStop,reference+trailDistance);
   events.push({bar:i+1,stopBefore,after:round(activeStop),triggered:false});
  }
  return {ok:true,direction,entry,initialStop,trailDistance,barsRevealed:maxBars,
   triggered:filled,trigger:result,events,activeStop:round(activeStop),
   assumptions:'Stop moves only after completed/revealed bars. OHLC cannot establish within-bar order. The gap-aware price is an illustration, not an assured trade fill. Stop-limit orders may not fill; halts, spread, latency and fees are excluded.'};
 }
 root.GroundUpTrailingStopModelV1=Object.freeze({model,version:'1.0'});
})(window);
