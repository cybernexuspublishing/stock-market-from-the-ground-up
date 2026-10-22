/* D10 v0.14.0.150 — fail-closed validation of member-owned OHLCV provider observations.
 * A well-formed provider response is NOT evidence of feed completeness, venue
 * consolidation, copyright/redistribution rights or replay certification.
 * The trading date must be evaluated in America/New_York, not UTC.
 */
const fail=(message,status=503)=>Object.assign(new Error(message),{status});
const clock=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/i;
const etParts=new Intl.DateTimeFormat('en-US',{
 timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'
});
export function strictTradingDate(input){
 if(typeof input!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(input))
  throw fail('Trading date must be YYYY-MM-DD.',400);
 const parsed=Date.parse(input+'T00:00:00Z');
 if(!Number.isFinite(parsed)||new Date(parsed).toISOString().slice(0,10)!==input)
  throw fail('Invalid calendar date.',400);
 return input;
}
function etDate(ms){
 const parts=etParts.formatToParts(new Date(ms));
 const pick=k=>parts.find(p=>p.type===k)?.value;
 return pick('year')+'-'+pick('month')+'-'+pick('day');
}
export function validateHistoricalOhlcv(rows,{startDate,endDate}={}){
 const first=strictTradingDate(startDate),last=strictTradingDate(endDate);
 if(first>last||Date.parse(last+'T00:00:00Z')-Date.parse(first+'T00:00:00Z')>31*86400000)
  throw fail('Historical date range exceeds 32 inclusive days.',400);
 if(!Array.isArray(rows)||rows.length>20000)
  throw fail('Invalid or excessive provider OHLCV data.');
 let prior=-Infinity;
 const bars=[];
 for(const r of rows){
  if(!r||typeof r!=='object'||Array.isArray(r))throw fail('Invalid provider OHLCV record.');
  const timestamp=r.timestamp??r.date;
  if(typeof timestamp!=='string'||!clock.test(timestamp))
   throw fail('Provider timestamp must include an explicit UTC or numeric time-zone offset.');
  const ms=Date.parse(timestamp);
  if(!Number.isFinite(ms)||ms<=prior)
   throw fail('Provider OHLCV timestamps are duplicate, invalid, or not strictly chronological.');
  if(etDate(ms)<first||etDate(ms)>last)
   throw fail('Provider OHLCV observation is outside requested New York trading dates.');
  const values=['open','high','low','close','volume'].map(k=>r[k]);
  if(values.some(v=>typeof v!=='number'||!Number.isFinite(v)))
   throw fail('Provider OHLCV contains missing or nonnumeric observations.');
  const [open,high,low,close,volume]=values;
  if(open<=0||high<=0||low<=0||close<=0||low>high||
   high<Math.max(open,close)||low>Math.min(open,close)||
   !Number.isSafeInteger(volume)||volume<0)
   throw fail('Provider OHLCV contains impossible prices or invalid reported share volume.');
  bars.push({timestamp:new Date(ms).toISOString(),open,high,low,close,volume});
  prior=ms;
 }
 return bars;
}
