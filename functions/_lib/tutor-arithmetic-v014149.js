/* D09 pure educational arithmetic: hypothetical only, never broker fills.
 * Monetary computations use integer cents and strict input validation.
 */
function integerCents(value){
 if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100000000)return null;
 const scaled=value*100;
 if(Math.abs(scaled-Math.round(scaled))>1e-6)return null;
 return Math.round(scaled);
}
const finitePositive=value=>typeof value==='number'&&Number.isFinite(value)&&value>0;
export function hypotheticalPosition({accountEquity,riskPercent,entry,stop,target=null}={}){
 const equity=integerCents(accountEquity),entryC=integerCents(entry),stopC=integerCents(stop);
 if(equity===null||entryC===null||stopC===null||!finitePositive(riskPercent)||riskPercent>100||entryC<=stopC||stopC===0)
  return {ok:false,code:'INVALID_INPUT',message:'Use a long-only example with positive equity, entry above stop, and a risk percentage greater than zero and at most 100.'};
 const targetC=target===null?null:integerCents(target);
 if(target!==null&&(targetC===null||targetC<=entryC))
  return {ok:false,code:'INVALID_TARGET',message:'A long-only reward target must exceed the entry price.'};
 const centsAtRisk=entryC-stopC;
 const budgetCents=Math.floor(equity*riskPercent/100);
 const shares=Math.min(Math.floor(budgetCents/centsAtRisk),Math.floor(equity/entryC));
 if(!Number.isSafeInteger(shares)||shares<0)return {ok:false,code:'OUT_OF_RANGE'};
 const exposure=shares*entryC;
 const actualRisk=shares*centsAtRisk;
 return {ok:true,hypothetical:true,side:'long',shares,riskBudget:budgetCents/100,actualRisk:actualRisk/100,
  perShareRisk:centsAtRisk/100,capitalRequired:exposure/100,
  maxBuyingPowerShares:Math.floor(equity/entryC),
  targetReward:targetC===null?null:shares*(targetC-entryC)/100,
  rewardRiskRatio:targetC===null?null:(targetC-entryC)/centsAtRisk,
  warning:'Hypothetical calculation. Stop orders may fill at different prices; commissions, fees, slippage and liquidity may change actual losses.'};
}
export function hypotheticalLongPnL({entry,exit,shares}={}){
 const a=integerCents(entry),b=integerCents(exit);
 if(a===null||b===null||a<=0||b<=0||!Number.isSafeInteger(shares)||shares<0||shares>10000000)return {ok:false,code:'INVALID_INPUT'};
 const delta=(b-a)*shares;
 if(!Number.isSafeInteger(delta))return {ok:false,code:'OUT_OF_RANGE'};
 return {ok:true,hypothetical:true,pnl:delta/100,perShare:(b-a)/100,returnPercent:(b-a)*100/a,
  warning:'Hypothetical, before costs; not an authenticated broker fill.'};
}
