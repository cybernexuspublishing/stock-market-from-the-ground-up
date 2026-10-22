/* D09 original, deterministic, hypothetical long-only position-sizing lesson.
 * No price feed, broker fill, account retrieval, trading recommendation or LLM math.
 * One intentionally narrow input contract avoids inventing values from prose.
 */
const PATTERN=/^calculate (?:hypothetical )?position size:\s*risk\s*\$([0-9]+(?:\.[0-9]{1,2})?),\s*entry\s*\$([0-9]+(?:\.[0-9]{1,2})?),\s*stop\s*\$([0-9]+(?:\.[0-9]{1,2})?)(?:,\s*target\s*\$([0-9]+(?:\.[0-9]{1,2})?))?\s*\.?$/i;
const cents=x=>{
 const [d,f='']=x.split('.');
 return Number(d)*100+Number((f+'00').slice(0,2));
};
const cash=c=>(c/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
export function hypotheticalPositionSize(question){
 const q=String(question||'').trim(),m=PATTERN.exec(q);
 if(!m)return null;
 const [risk,entry,stop,target]=m.slice(1).map(x=>x===undefined?null:cents(x));
 if(![risk,entry,stop].every(x=>Number.isSafeInteger(x)&&x>0&&x<=10000000) ||
   stop>=entry || target!==null&&(!Number.isSafeInteger(target)||target<=0||target>10000000)){
  return {ok:false,reason:'invalid_example',
   answer:'For this long-only hypothetical example, risk and prices must be positive, entry must exceed the stop, and amounts must be at most $100,000. No position was calculated.'};
 }
 const distance=entry-stop,shares=Math.floor(risk/distance);
 if(shares<=0||shares>1000000)return {ok:false,reason:'out_of_range',
  answer:'The hypothetical risk amount allows no whole shares, or exceeds the one-million-share instructional limit. Change the example instead of treating an unbounded result as executable.'};
 const modeledRisk=distance*shares,remaining=risk-modeledRisk;
 let answer='Hypothetical long-only position sizing (not a trade recommendation):\n'+
  'Maximum planned price-only loss: $'+cash(risk)+'.\n'+
  'Entry: $'+cash(entry)+'; stop: $'+cash(stop)+'; price risk per share: $'+cash(distance)+'.\n'+
  'Whole shares = floor('+risk+' cents / '+distance+' cents) = '+shares.toLocaleString('en-US')+'.\n'+
  'Modeled loss if all shares enter at the entry and exit at the stop: $'+cash(modeledRisk)+'.\n'+
  'Unused planned price-only risk allowance: $'+cash(remaining)+'.';
 if(target!==null){
  const reward=target-entry;
  answer+='\nHypothetical target: $'+cash(target)+'. ';
  answer+=reward>0?'Potential gain per share $'+cash(reward)+'; modeled reward-to-risk ratio '+(reward/distance).toFixed(2)+':1.':
   'A target at or below entry has no positive long-side modeled reward.';
 }
 answer+='\nThese are arithmetic assumptions, NOT broker fills or reliable maximum actual loss. Spread, fees, slippage, gaps, halts and inability to exit can increase losses. Check buying power separately; do not use this as personal investment advice.';
 return {ok:true,reason:'calculated',answer,graded:false,masteryAwarded:false,
  assumptions:{hypothetical:true,side:'long',priceOnly:true,shares,riskCents:risk,distanceCents:distance}};
}
