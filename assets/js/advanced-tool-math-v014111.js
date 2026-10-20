/* v0.14.0.111 — pure math validation for published beta calculators.
 * Hypothetical educational calculations only. No prices, source history,
 * brokerage fills, commissions, borrow availability or live advice claimed.
 */
(function(root){
 'use strict';
 const number=x=>(x===null||x===undefined||String(x).trim()==='')?null:
  Number.isFinite(Number(x))?Number(x):null;
 const positive=x=>Number.isFinite(x)&&x>0;
 const whole=x=>Number.isSafeInteger(x)&&x>0;
 const invalid=reason=>({ok:false,reason});
 const fixed=x=>Math.round((x+Number.EPSILON)*1e10)/1e10;
 function risk({account,risk,entry,stop,target,spread=0,slippage=0,direction='LONG'}){
  if(!positive(account)||!positive(risk)||!positive(entry)||!Number.isFinite(stop)||stop<=0||
   !Number.isFinite(spread)||spread<0||!Number.isFinite(slippage)||slippage<0)
   return invalid('Provide positive account, budget, entry and stop; spreads/slippage cannot be negative.');
  if(!['LONG','SHORT'].includes(direction))return invalid('Select a valid long or short direction.');
  if(direction==='LONG'?stop>=entry:stop<=entry)
   return invalid('Your stop must be on the loss side of the entry for this direction.');
  if(risk>account)return invalid('Dollar risk cannot exceed the account value.');
  if(target!==null&&target!==undefined&&(!positive(target)||
   (direction==='LONG'?target<=entry:target>=entry)))
   return invalid('Optional target must be on the potential profit side of the entry.');
  const perShare=Math.abs(entry-stop)+spread+slippage;
  if(!positive(perShare))return invalid('Risk per share must be positive.');
  const byRisk=Math.floor(risk/perShare),byCapital=Math.floor(account/entry);
  if(!Number.isSafeInteger(byRisk)||!Number.isSafeInteger(byCapital))
   return invalid('Calculated position exceeds the supported whole-share limit.');
  const shares=Math.min(byRisk,byCapital),exposure=shares*entry;
  return {ok:true,perShare:fixed(perShare),shares,exposure:fixed(exposure),
   accountPct:fixed(exposure/account*100),targetR:target==null?null:
    fixed(Math.abs(target-entry)/perShare),plannedLoss:fixed(shares*perShare),
   bindingLimit:byRisk<=byCapital?'risk':'cash_exposure',direction,
   notice:'Hypothetical 1× cash-equivalent exposure cap. Does not model fees, margin, borrowing or live fills.'};
 }
 function supply({floatShares,outstanding,volume,price}){
  if(!positive(floatShares)||!positive(outstanding)||floatShares>outstanding||
   !Number.isFinite(volume)||volume<0||!positive(price))
   return invalid('Float and outstanding shares must be positive, float cannot exceed outstanding, volume cannot be negative, and price must be positive.');
  return {ok:true,turnover:fixed(volume/floatShares),floatPct:fixed(floatShares/outstanding*100),
   marketCap:fixed(outstanding*price),floatValue:fixed(floatShares*price),
   notice:'Share float is an estimated sourced share count, not a live-confirmed value.'};
 }
 function liquidity({bid,ask,shares,stopDistance}){
  if(!positive(bid)||!positive(ask)||ask<bid||!whole(shares))
   return invalid('Bid and ask must be positive with ask >= bid; share count must be a positive whole number.');
  if(stopDistance!==null&&stopDistance!==undefined&&(!positive(stopDistance)))
   return invalid('Optional planned stop distance must be positive.');
  const spread=ask-bid,mid=(ask+bid)/2,spreadCost=spread*shares;
  return {ok:true,spread:fixed(spread),spreadPct:fixed(spread/mid*100),
   oneSpreadCost:fixed(spreadCost),vsRiskPct:stopDistance==null?null:
    fixed(spreadCost/(stopDistance*shares)*100),
   notice:'One quoted spread only. Does not include variable bid/ask sizes, fees, impact or market order slippage.'};
 }
 function execution({decision,fill,shares,direction,bid,ask}){
  if(!positive(decision)||!positive(fill)||!whole(shares)||
   !['LONG','SHORT'].includes(direction))
   return invalid('Decision/fill must be positive; shares must be a positive whole number; choose a direction.');
  if((bid!==null||ask!==null)&&(!positive(bid)||!positive(ask)||ask<bid))
   return invalid('Provide both positive bid and ask, with ask >= bid, or leave both empty.');
  const slippage=(direction==='LONG'?fill-decision:decision-fill);
  return {ok:true,slippagePerShare:fixed(slippage),
   signedCost:fixed(slippage*shares),quotedSpread:bid===null?null:fixed(ask-bid),
   notice:'An observed input comparison, not a simulated order fill. No commissions, venue fees, market depth, borrowing or partial fills.'};
 }
 root.GroundUpToolMath=Object.freeze({number,risk,supply,liquidity,execution});
})(globalThis);
