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

/* Additional narrow hypothetical calculators, no external data or model.
 * All money input is positive decimal dollars with <=2 digits of cents.
 */
const PCT=/^calculate percentage change:\s*from\s*\$([0-9]+(?:\.[0-9]{1,2})?)\s*to\s*\$([0-9]+(?:\.[0-9]{1,2})?)\s*\.?$/i;
const PL=/^calculate hypothetical p&l:\s*([0-9]+)\s*shares?,\s*entry\s*\$([0-9]+(?:\.[0-9]{1,2})?),\s*exit\s*\$([0-9]+(?:\.[0-9]{1,2})?)\s*\.?$/i;
const validPrice=x=>Number.isSafeInteger(x)&&x>0&&x<=10000000;
export function deterministicTutorCalculation(question){
 const sizing=hypotheticalPositionSize(question);
 if(sizing)return sizing;
 const q=String(question||'').trim(),percent=PCT.exec(q);
 if(percent){
  const from=cents(percent[1]),to=cents(percent[2]);
  if(!validPrice(from)||!validPrice(to))
   return {ok:false,reason:'invalid_price',answer:'For this hypothetical percentage exercise, both positive prices must be at most $100,000.'};
  const change=(to-from)/from*100;
  return {ok:true,reason:'calculated',graded:false,masteryAwarded:false,
   answer:'Hypothetical price percentage change: (new price − initial price) ÷ initial price × 100.\\n'+
    'From $'+cash(from)+' to $'+cash(to)+': '+change.toFixed(2)+'%.\n'+
    'This is price change only, NOT net return, dividends, fees or a real observed market event.'};
 }
 const pl=PL.exec(q);
 if(pl){
  const shares=Number(pl[1]),entry=cents(pl[2]),exit=cents(pl[3]);
  if(!Number.isSafeInteger(shares)||shares<1||shares>1000000||!validPrice(entry)||!validPrice(exit))
   return {ok:false,reason:'invalid_example',answer:'For this hypothetical exercise, use 1 to 1,000,000 whole shares and positive prices no greater than $100,000.'};
  const priceOnly=(exit-entry)*shares;
  return {ok:true,reason:'calculated',graded:false,masteryAwarded:false,
   answer:'Hypothetical long-only realized price-only P&L: (exit − entry) × shares.\\n'+
    'Shares: '+shares.toLocaleString('en-US')+'; entry $'+cash(entry)+'; exit $'+cash(exit)+'.\\n'+
    (priceOnly<0?'Modeled loss':'Modeled profit')+': $'+cash(Math.abs(priceOnly))+'.\\n'+
    'This is not a broker fill or a prediction. Actual results also depend on fees, spread, slippage, execution and other costs.'};
 }
 return null;
}
