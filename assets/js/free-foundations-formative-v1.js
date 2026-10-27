/* Free Foundations Phase A. Local wording prompts only, never semantic grading.
 * Original answers stay in the browser; no remote calls or stored grade.
 */
(function(root){'use strict';
const plans={
 1:[
  ['past last trade vs future order',/\b(last (?:trade|price)|past transaction|previous trade)\b/i,'How is the previously executed last trade different from a new quote?'],
  ['bid, ask, size and liquidity',/\b(bid|ask|spread|quote|liquidity|available (?:size|shares|quantity))\b/i,'Which dated bid, ask, available size and session still need checking?'],
  ['no guaranteed execution',/\b(not guarante|no guarantee|cannot guarante|can.t guarante|uncertain|no confirmed fill|no trade|may change)\b/i,'Why does a previous print not guarantee your own fill?']],
 2:[
  ['open-close body',/\b(open|close|body)\b/i,'Which prices determine the nonnegative real body?'],
  ['high-low range',/\b(high|low|range|wick)\b/i,'How do body and both wicks add up to High minus Low?'],
  ['division and unknown next candle',/\b(undefined|zero|divide|0\/0|percentage|next candle|predict|50%|40%)\b/i,'When is the percentage undefined, and what cannot a candle predict?']],
 3:[
  ['decision time',/\b(pause|chronolog|before|after|later|09:05|08:50|time)\b/i,'Which records were publicly available by the decision pause?'],
  ['primary issuer evidence',/\b(source|issuer|original|primary|filing|edgar|document)\b/i,'What independently accessible original document supports the claim?'],
  ['reported period and uncertainty',/\b(quarter|period|reporting|unverified|unknown|no trade|withhold)\b/i,'Which period and missing evidence prevent a confident conclusion?']],
 4:[
  ['watchlist is research',/\b(watchlist|watch|research|no trade|verify more)\b/i,'Why is a watchlist entry not automatically a buy?'],
  ['source status and dated data',/\b(source|fictional|scanner|dated|time|verified|unverified|quote)\b/i,'How would you record source type and observed-at time?'],
  ['remove or defer rule',/\b(remove|review|invalid|missing|defer|uncertain|liquidity|spread)\b/i,'What rule would cause you to remove or defer the candidate?']],
 5:[
  ['planned price risk',/\b(stop|entry|risk|per.share|9\.80|0\.20)\b/i,'How is the planned per-share risk calculated?'],
  ['quantity and notional exposure',/\b(share|quantity|notional|capital|exposure|100|1,000)\b/i,'Why is planned risk different from the full notional exposure?'],
  ['fill uncertainty and no trade',/\b(slippage|gap|fee|halt|liquidity|spread|no trade|partial fill|uncertain)\b/i,'Why might an actual loss exceed the planned loss, and when is NO TRADE appropriate?']]
};
const cautions={
 1:[/\blast (?:trade|price) (?:guarantees?|ensures?|will always fill)\b/i,'An earlier last trade is not a guaranteed new fill.'],
 2:[/\bhigh\s*(?:minus|-)\s*low\s*(?:is|equals)\s*(?:the )?(?:real )?body\b/i,'High minus Low measures the full range, not the real body.'],
 3:[/\b(?:later|future) (?:post|repost|screenshot) (?:proves?|justifies?) (?:the )?earlier\b/i,'Later publications cannot justify an earlier decision.'],
 4:[/\bwatchlist (?:means|guarantees?) (?:a )?buy\b/i,'Watchlist inclusion is not a trading instruction.'],
 5:[/\bstop (?:order |loss )?guarantees?\b/i,'A stop does not guarantee a realized exit price or loss cap.']
};
function review(day,reply){
 if(!Object.hasOwn(plans,day))return null;
 const text=String(reply??'').trim().slice(0,1200),noted=[],followUps=[];
 for(const [topic,regex,question] of plans[day]){
  if(regex.test(text))noted.push(topic);else followUps.push(question);
 }
 const [pattern,tip]=cautions[day];
 return Object.freeze({kind:'UNGRADED_WORDING_AID',noted,followUps:followUps.slice(0,3),
  ambiguous:pattern.test(text)?[tip]:[],sentToServer:false,masteryAwarded:false,
  limitation:'This only recognizes some words, not whether your reasoning is right. Missing terms may be expressed another way, and mentioned terms can still be misunderstood.'});
}
root.GroundUpFreeFormativeV1=Object.freeze({review});
})(typeof window==='undefined'?globalThis:window);
