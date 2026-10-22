/* D09 privacy-minimized missing curriculum subject counter.
 * Fixed categories + mode + monthly aggregate only: NEVER log question text,
 * ticker, learner identity, request UUID, IP, member portfolio or transcripts.
 */
const GROUPS=[
 ['charting',/\b(?:candles?|candlesticks?|ema|moving average|vwap|chart|trend|volume|breakout|support|resistance|gap|premarket)\b/i],
 ['risk',/\b(?:risk|sizing|stop|loss|gain|r multiple|reward|drawdown|mae|mfe)\b/i],
 ['order_flow',/\b(?:level\s*(?:2|ii)|tape|time and sales|order book|bid|ask|spread|liquidity|fill|slippage)\b/i],
 ['market_structure',/\b(?:shares?|float|exchange|market cap|ipo|split|settlement|index|etf|sec|edgar)\b/i],
 ['learning_platform',/\b(?:laboratory|labs?|bootcamp|lesson|account|journal|simulator|replay|competenc|tutor)\b/i]
];
export function classifyUnansweredTopic(question){
 const value=String(question||'').slice(0,450);
 return GROUPS.find(([,re])=>re.test(value))?.[0]||'other';
}
export async function recordTutorGap(env,question,mode){
 if(!['explain','question','review','practice'].includes(mode))return false;
 const url=String(env.SUPABASE_URL||'').replace(/\/$/,''),
 key=String(env.SUPABASE_SECRET_KEY||'');
 if(!/^https:\/\/[^/]+$/.test(url)||!key)return false;
 const headers={apikey:key,accept:'application/json','content-type':'application/json'};
 if(/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key))
  headers.authorization='Bearer '+key;
 try{
  const response=await fetch(url+'/rest/v1/rpc/gu_v014149_record_tutor_gap',{
   method:'POST',cache:'no-store',headers,body:JSON.stringify({
    p_topic:classifyUnansweredTopic(question),p_mode:mode
   })});
  if(!response.ok)return false;
  return await response.json()===true;
 }catch{return false}
}
