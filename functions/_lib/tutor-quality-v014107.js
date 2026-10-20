/* v0.14.0.107 — original Market Tutor safety, retrieval and citation controls.
 * No external data, no private rubric, no guaranteed semantic understanding.
 */
const synonyms=[
 [/\b(stopped out|stop got hit|stops? hit|stop loss triggered|cut my loss)\b/gi,'stop placement invalidation risk adverse excursion MAE'],
 [/\b(spread widened|bid ask|bid-ask)\b/gi,'spread liquidity slippage'],
 [/\b(chased|chasing|late entry)\b/gi,'entry trigger risk confirmation'],
 [/\b(fakeout|bull trap|false breakout)\b/gi,'failure invalidation chart structure'],
 [/\b(trade went against me|drawdown|went red)\b/gi,'MAE adverse excursion risk stop'],
 [/\b(no setup|sit out|skip a trade)\b/gi,'no trade risk invalidation'],
 [/\b(tape|level two|order book)\b/gi,'level2 tape reading bid ask liquidity'],
 [/\b(where to exit|exit early|gave back profit)\b/gi,'exit management MFE plan versus actual']
];
export function expandTutorQuery(q){
 const input=String(q||'').slice(0,600);
 let extra='';
 for(const [pattern,terms] of synonyms)if(pattern.test(input)){extra+=' '+terms;pattern.lastIndex=0}
 return (input+extra).slice(0,1200);
}
const advice=[
 /\bshould\s+i\s+(?:buy|sell|short|invest|enter|exit|hold)\b/i,
 /\b(?:is|would)\s+[A-Z$.\w-]{1,18}\s+(?:a\s+)?(?:good|great|smart|safe)\s+(?:buy|investment|short|trade)\b/i,
 /\b(?:should|can)\s+i\s+invest\s+in\b/i,
 /\b(?:price\s+target|target\s+price|buy\s+signal|sell\s+signal|entry\s+price\s+for)\b/i,
 /\b(?:what|which)\s+(?:stocks?|shares?|options?|etfs?)\s+(?:should|do)\s+i\s+(?:buy|sell|pick)\b/i,
 /\b(?:tell|give)\s+me\s+(?:the\s+)?(?:exact\s+)?(?:buy|sell|short|entry|exit)\b/i,
 /\b(?:guaranteed|risk.free|sure.fire)\s+(?:profit|return|trade)\b/i
];
export function seeksPersonalTradeAdvice(...texts){
 return texts.some(v=>advice.some(re=>re.test(String(v||''))));
}
const actionable=[
 /\b(?:you\s+(?:should|must|need\s+to)|i\s+(?:recommend|urge)|my\s+recommendation\s+is\s+to)\s+(?:immediately\s+)?(?:buy|sell|short|invest\s+in|hold|enter|exit)\b/i,
 /\b(?:buy|sell|short)\s+(?:\d+(?:\.\d+)?\s+)?(?:shares?|contracts?)\s+(?:of\s+)?[A-Za-z$]{1,12}\b/i,
 /\b(?:set\s+(?:a|your)\s+price\s+target|your\s+price\s+target\s+is)\s+(?:at\s+)?\$?\d/i,
 /\b(?:guaranteed|risk.free|sure.fire)\s+(?:profit|returns?|gains?)\b/i
];
export function validateTutorModelAnswer(answer,sourceCount){
 const text=String(answer||'').trim();
 if(text.length<30||text.length>2400||!Number.isSafeInteger(sourceCount)||sourceCount<1||sourceCount>3)
  return {valid:false,reason:'invalid_length_or_sources'};
 const found=[...text.matchAll(/\[(\d+)\]/g)].map(x=>Number(x[1]));
 if(!found.length)return {valid:false,reason:'missing_citation'};
 if(found.some(n=>!Number.isSafeInteger(n)||n<1||n>sourceCount))
  return {valid:false,reason:'invalid_citation'};
 if(actionable.some(re=>re.test(text)))return {valid:false,reason:'actionable_trading_advice'};
 return {valid:true,reason:'accepted'};
}
export function safeTutorMetric(event,details={}){
 const validEvent=/^[a-z][a-z0-9_]{1,60}$/;
 const allowed=new Set(['retrieval','ai_request','provider','quota','safety','history','status']);
 const parts={};
 for(const [k,v] of Object.entries(details)){
  if(['reason','mode','generation','provider'].includes(k) && typeof v==='string'&&/^[a-z0-9_]{1,48}$/.test(v))
   parts[k]=v;
  if(['sourceCount','durationMs'].includes(k)&&Number.isSafeInteger(v)&&v>=0&&v<=60000)
   parts[k]=v;
 }
 if(!validEvent.test(event)||!allowed.has(event))return;
 // Only finite enumerated metadata; never prompt/reasoning, user ID, request ID,
 // IP, credentials, historical trade details, or provider response text.
 console.info(JSON.stringify({component:'market_tutor',event,...parts}));
}
