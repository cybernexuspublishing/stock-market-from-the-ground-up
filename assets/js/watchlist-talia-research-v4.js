/* Crownlight Talia Research Curriculum v4
 * Original instructional text, adapted from owner's research corpus.
 * No prices, thresholds, trading claims or proprietary third-party charts
 * are imported as verified observations.
 * The eight research actions are NOT the canonical nine-stage Lab journey.
 */
(function(root){'use strict';
 const STEPS=Object.freeze(['Observe','Explain','Investigate','Interpret','Challenge','Plan','Practice','Review']);
 const DIMS=Object.freeze(['Knowledge','Recognition','Decision','Process']);
 // Definition, independent worked example, limitation, contradiction and transfer
 // exist for EVERY lesson. The learner is never asked to infer an absent source.
 const rows=[
 ['building','Build a Watchlist From Zero','Process','Start with an objective, holding period, instrument universe and a manageable review schedule. A ticker becomes a candidate, not a trade.',
  'Illustration: select five fictional symbols from a broad list of 35 by documenting each symbol’s reason for inclusion, source date, and an explicit disqualifier.',
  'Is the symbol the same security and issuer in the source? Which candidates lack a reason to be watched?','A long list with no review schedule consumes attention and can conceal stale candidates.','Create a three-column research shortlist: candidate, evidence, next review.'],
 ['sector','Sector Activity and Sympathy','Recognition','A sector is an industry grouping; sympathy is a possible co-movement, not proof that two issuers share a catalyst.',
  'Illustration: three fictional healthcare issuers rise while one unrelated issuer falls; only one has a verified issuer-specific event. Do not attribute all four moves to the same event.',
  'Which issuer had the event? Are sector classifications, timestamps and peer comparisons sourced?','Sector strength can reflect index flows or a broad market move rather than the company-specific story.','Compare a fictional sector leader with a weak peer and articulate why sympathy may fail.'],
 ['pricevolume','Read Price Together With Volume','Recognition','A candle describes OHLC; volume is shares traded. Compare both to historical context and distinguish intensity from actual market liquidity.',
  'Illustration: a $10.00 candle rises to $10.30 on 60,000 shares while another rises similarly on 6,000 shares. More shares signal different participation, not a guaranteed continuation.',
  'What was the candle interval, its preceding volume baseline and whether the volume figures were complete?','High volume can accompany selling, distribution or exhaustion as well as buying demand.','Describe a high-volume failed breakout without calling the volume itself bullish.'],
 ['rvol','Relative Volume and Float','Knowledge','Relative volume (RVOL) compares a volume measure with a compatible historical baseline. Float estimates shares available for public trading, not borrowable shares.',
  'Illustration: 180,000 cumulative shares versus a comparable 60,000-share time-of-day average gives RVOL 3.0×. This does not show three float rotations or unique owners.',
  'Was the baseline same session time and period? What is the as-of date of the reported float?','A low float and high RVOL can coexist with wide spreads, suspensions or poor execution.','Reject a fictional RVOL claim when the baseline uses full-day volume at 9:35 a.m.'],
 ['company','Issuer Identity and Fundamentals','Knowledge','Separate a company’s issuer identity, security class, filing history, financial condition and reported corporate events from an unsourced symbol mention.',
  'Illustration: a reported contract is in a press release, but the filing describes a nonbinding memorandum. The economic terms remain uncertain.',
  'Cross-check SEC CIK, filing acceptance time, report period, dilution and financing risks.','A share price rally cannot establish issuer solvency or the value of an unverified contract.','Explain why financial statement period and filing date must both be recorded.'],
 ['catalyst','Catalysts and Publication Time','Process','A catalyst is a potentially price-relevant public event. Record the primary source, original publication timestamp, issuer link and what was knowable before the decision.',
  'Illustration: an invented earnings release becomes public at 9:45 ET, after a 9:30 observation. It cannot justify a decision documented at 9:30.',
  'Which timestamp is publication, which is your research observation and which is the market reaction?','A headline may recycle an older event or omit a material qualifier.','Compare an initial source and later correction without using the correction as earlier evidence.'],
 ['structure','Good, Poor and Unclear Structure','Recognition','Trend structure uses repeated swing highs/lows and relevant timeframes. Clear charts make levels easier to reason about, but cannot prove an edge.',
  'Illustration: rising lows at $10.10, $10.35 and $10.55 beneath repeated $10.80 highs suggest a developing ascending consolidation, not yet a breakout.',
  'Are the swing points completed, and does a higher timeframe contradict the interpretation?','An attractive chart may be illiquid, full of gaps, or already too extended for the planned risk.','Identify what would make a neat-looking chart ineligible.'],
 ['trends','Trend, Consolidation and Reversal','Recognition','Higher highs/higher lows describe an uptrend; lower highs/lower lows describe a downtrend. Consolidation is range behavior; reversal requires more evidence than one countertrend bar.',
  'Illustration: three higher swing highs, then a pullback holding the last swing low. This is not sufficient evidence of a completed reversal.',
  'Which swing would have to break, and on which timeframe, to revise the structure label?','A single red candle in an uptrend is not proof that the trend reversed.','Contrast a pullback and a structural reversal using only completed swing points.'],
 ['candles','Candlestick Bodies, Wicks and Gaps','Knowledge','Real body = |Close − Open|; full range = High − Low. The upper/lower wicks show extremes; OHLC cannot establish the intrabar sequence.',
  'Illustration: O $20.00, H $22.00, L $19.00, C $21.20 produces body $1.20, range $3.00, body/range 40%.',
  'Is the candle completed? Is the gap relative to the appropriate prior close or session?','A doji can have a large High-to-Low range; a long wick alone does not certify rejection or order flow.','Compute candle range and explain what you cannot know about the order of trades.'],
 ['vwap','Volume-Weighted Average Price','Knowledge','Session VWAP approximates a volume-weighted benchmark when calculated from bar typical prices and volumes. True trade-level VWAP requires trade prices and sizes.',
  'Illustration: TP values $10.00 on 100 shares and $11.00 on 300 shares yield bar-based VWAP ($1,000 + $3,300) / 400 = $10.75.',
  'What is the reset session, data basis (trades or bar approximation), volume coverage and timezone?','Being above VWAP does not prove profitability of all buyers or make VWAP an automatic stop level.','Explain why a VWAP cross in choppy trading is not an independent entry.'],
 ['averages','SMA, EMA 9/20 and Lag','Knowledge','SMA weights a fixed number of completed closes equally; EMA gives newer closes more weight. Both are lagging transformations of historical price.',
  'Illustration: three completed closes of $10, $11 and $12 give SMA3 = $11. EMA3 uses weight 2/(3+1) = 0.5 after an explicit seed.',
  'How were averages seeded? Is there enough completed history for the selected period?','A moving-average crossover can whipsaw in ranges and never forecasts a certain outcome.','Compare SMA/EMA response on a fictional reversal without changing the underlying bars.'],
 ['indicators','Compare Indicators Without Chart Overload','Process','Choose an indicator to answer one specific question: VWAP for weighted session context, EMA for smoothed trend, RSI/MACD for momentum, Bollinger for dispersion.',
  'Illustration: select price/volume and one complementary study, then state the new information it contributes over the plain price chart.',
  'Is the indicator calculated from the same bars and sessions? Is it redundant with an existing overlay?','Five correlated indicators are not five independent confirmations.','Remove two redundant studies and justify the remaining one.'],
 ['levels','Reference Levels and Their Provenance','Recognition','Mark support, resistance, prior-day and premarket highs/lows only when their observation windows, timezones and data coverage are known.',
  'Illustration: $12.50 was tested twice by completed bars. It is a historical reference, not an automatic future support or precise stop execution.',
  'Was the level observed before your decision? Is it a completed interval or a later-created high of day?','A chart line is not verified liquidity, and a stop crossing can fill away from the level.','Differentiate the developing high of day from a final session high.'],
 ['breakout','Developing Breakouts and Confirmation','Recognition','A developing breakout approaches or challenges an observed boundary. Triggered means the defined condition actually occurred; it is not synonymous with success.',
  'Illustration: $15.00 resistance, two completed closes below it, then one print above it. If the plan requires a completed close and follow-through, the trigger is not yet verified.',
  'State the actual trigger definition, volume comparison, spread, and what later would invalidate the thesis.','A brief level cross can reverse rapidly; high relative volume does not guarantee continuation.','Recognize an untriggered level test rather than labeling it a failed breakout.'],
 ['failure','Failed Setup Versus Untriggered Setup','Decision','A failed setup first meets a documented trigger then breaches its invalidation. An untriggered setup never met its required entry condition.',
  'Illustration: candidate A never closes above $8.00; candidate B closes above $8.00 then breaks its prewritten $7.70 invalidation. Only B meets the stated failure sequence.',
  'What was known and written before the trigger? Were the trigger and failure timestamps both verified?','Post-hoc redefinition can make almost any chart appear to match a pattern.','Classify two cases without viewing prices past the decision boundary.'],
 ['thesis','Write a Falsifiable Trade Thesis','Process','Separate evidence, interpretation, missing information, disconfirming evidence, trigger, invalidation and reasons to cancel a proposed trade.',
  'Illustration: “Watch while $10.80 remains unbroken; consider only a completed-volume-confirmed break if spread is acceptable; cancel below $10.45.” This is a conditional plan, not an order.',
  'Which claim has a source and which is an inference? Can the thesis be disproven by an observable event?','A thesis that only says “looks strong” cannot be audited or disproven.','Rewrite an emotional trading note into objective observation and cancellation rules.'],
 ['risk','Risk and Position Size','Decision','For a simplified long, risk/share = |planned entry − stop reference|. Model shares = floor(risk budget / risk per share), then apply buying-power and liquidity limits.',
  'Illustration: $25 risk budget, entry $5.00 and stop reference $4.80 imply $0.20/share and at most 125 modeled shares before spread, fees or slippage.',
  'What if the actual fill is worse or the stop gaps? Is maximum loss only modeled rather than guaranteed?','Sizing from a target profit ignores downside and may exceed account capacity; short losses can exceed initial capital.','Recalculate with a $0.08 adverse-fill allowance and explain why share size decreases.'],
 ['spread','Bid–Ask Spread, Liquidity and Slippage','Decision','The quoted spread = ask − bid. Liquidity depends on executable depth, participation and conditions; reported daily volume alone cannot guarantee fills.',
  'Illustration: bid $4.95 and ask $5.05 give a $0.10 spread, about 2.02% of the $4.95 bid; a round trip can cost more after movement or fees.',
  'Are the quotes current, displayed sizes known, and halt/borrow/short-sale constraints relevant?','A narrow displayed spread can disappear, and a stop-market order is not a price guarantee.','Reject an attractive chart when estimated execution friction consumes the planned reward.'],
 ['compare','Compare Several Stocks Without a Winner Claim','Decision','Use a common evidence matrix: identity, timestamps, catalyst, volume/RVOL, float freshness, structure, spread, risk, data gaps and plan eligibility.',
  'Illustration: A has strong price momentum but no source; B has a verified catalyst but an excessively wide spread; C has clean data but an untriggered setup. None automatically warrants entry.',
  'Are measurement periods, instruments, currencies and comparison baselines compatible?','A single weighted “opportunity score” hides missing information and implies false precision.','Choose WATCH or NO TRADE and explain which evidence would change the comparison.'],
 ['reject','Why a Stock Does Not Qualify','Decision','A rejection is a positive research outcome when an explicit criterion is missing or contradicted. Preserve the reason and review conditions.',
  'Illustration: fictional candidate lacks primary catalyst confirmation and has a 7% quoted spread against a 3% expected move; it is not qualified for the proposed setup.',
  'Is the reason permanent, data-dependent, or time-sensitive? What later event would warrant reconsideration?','Rejection is not a prediction the price will fall, and avoiding a trade does not prove a strategy.','Write a rejection and one narrowly defined reconsideration trigger.'],
 ['maintenance','Keep the Research Watchlist Current','Process','Review candidates at an explicit cadence, verify stale source data, update status, archive resolved ideas and preserve dated notes rather than retroactively rewriting them.',
  'Illustration: a candidate with an event that has passed moves to archived; a developing setup has a next review time and a clearly named observation trigger.',
  'Which timestamp is the source’s as-of time and which is your own review time?','A saved candidate is not a live alert. Archived research can remain valuable learning evidence.','Create a daily premarket, during-session and end-of-day checklist.'],
 ['hindsight','Review Without Hindsight','Process','Separate the decision-time information set from later observations. Record what was actually knowable and assess decision quality independently of outcome.',
  'Illustration: a WATCH decision at 9:35 may be sound even if a fictional stock rises 20% afterward; the later move was not knowable at 9:35.',
  'Does the saved report preserve original decision, evidence timestamp, changes and later observations distinctly?','Calling an avoided winner a “mistake” solely because it rose is outcome bias.','Audit a fictional prior decision using a timestamped evidence cutoff.'],
 ['macd','MACD, Signal Line and Histogram','Knowledge','MACD = EMA12 − EMA26 of closes; its signal is EMA9 of valid MACD values; histogram = MACD − signal. It requires warm-up observations.',
  'Illustration: if completed-bar EMA12 = $12.40, EMA26 = $12.10 and MACD signal = $0.20, MACD = $0.30 and histogram = +$0.10.',
  'Are settings and warm-up specified? Does a crossover simply reflect already-observed prices?','MACD divergence/crossover is not independent evidence of future price direction; avoid lookahead and curve fitting.','Compare conventional 12/26/9 to a faster configuration using separate fictional test cases.'],
 ['rsi','RSI and Momentum Extremes','Knowledge','RSI is a bounded momentum oscillator, commonly Wilder-smoothed over 14 intervals. Readings describe recent gain/loss balance, not a timed reversal guarantee.',
  'Illustration: RS = 2 means RSI = 100 − 100/(1+2) ≈ 66.7. The assumed gain/loss averages must both be documented.',
  'Which window and smoothing method were used? Could a strong trend sustain a high RSI?','Overbought is not identical to “must fall,” and oversold is not identical to “must rise.”','Explain why RSI 75 plus rising price is insufficient for a short recommendation.'],
 ['bollinger','Bollinger Bands and Volatility','Knowledge','A conventional band illustration centers a 20-period SMA, with lines at SMA ± 2 standard deviations of those sampled closes.',
  'Illustration: SMA $10 and standard deviation $0.50 give illustrative upper/lower bands $11 and $9. Record population/sample convention.',
  'Is there a complete 20-bar history and what variance definition was used?','A band touch is not a mechanical sell/buy signal; volatility can expand or contract abruptly.','Compare a band expansion with a hypothetical squeeze and identify missing confirmation.'],
 ['patterns','Flags, Pullbacks, Ranges and False Moves','Recognition','Pattern names summarize completed price structure. A flag, range, triangle, dip-and-rip or reversal hypothesis needs an explicit trigger and invalidation.',
  'Illustration: a strong rise is followed by shrinking candles and lower volume; until a defined boundary break, it remains a candidate pattern.',
  'Are levels fixed before the later move and are the number of completed swings sufficient?','An attractive pattern drawing cannot establish a statistical edge without a valid sample and failed-case review.','Classify an aborted bull flag and explain why labeling after the fact is invalid.'],
 ['shorts','Short Sale, Borrow and Halts','Decision','Shorting generally requires a margin account, borrow availability, locate compliance and awareness of borrow costs, recalls and potentially unbounded price risk.',
  'Illustration: a planned short at $3.00 can lose more than the initial $3.00/share if the stock rises above $6.00; a locate is not a guaranteed future fill.',
  'Are shares currently available and is the security halted or otherwise restricted?','Reported short interest is delayed; a low float and price spike do not prove an active short squeeze.','Mark NO TRADE when borrow cannot be verified or risk is undefined.']
 ];
 const TOPICS=Object.freeze(rows.map(([id,title,dimension,definition,worked,investigate,contradiction,transfer])=>
  Object.freeze({id,title,dimension,definition,worked,investigate,contradiction,transfer})));
 const byId=id=>TOPICS.find(t=>t.id===id)||TOPICS[0];
 function stageText(topic,step){
  const t=typeof topic==='string'?byId(topic):topic;
  switch(String(step).toUpperCase()){
   case 'OBSERVE':return 'Talia — I Do: '+t.definition+' Observe only the currently available chart and named source. '+t.worked;
   case 'EXPLAIN':return 'Talia — I Do: State the relevant quantities, units, assumptions and definitions. '+t.worked+' Do not interpret the next price as known.';
   case 'INVESTIGATE':return 'Talia — We Do: '+t.investigate+' Distinguish primary-source facts from member-entered notes and missing data.';
   case 'INTERPRET':return 'Talia — We Do: What does the completed evidence permit us to classify, and what would require another observation? '+t.definition;
   case 'CHALLENGE':return 'Talia — We Do: Actively challenge your initial reading. '+t.contradiction+' Describe at least one conflicting or absent fact.';
   case 'PLAN':return 'Talia — We Do: Write the condition that would justify further attention, an invalidation boundary, cost/risk constraints and a reason to choose NO TRADE.';
   case 'PRACTICE':return 'Talia — You Do: With only currently revealed fictional observations, write what you would watch, what would cancel the idea and whether you would ENTER, WATCH, REJECT or choose NO TRADE. No future bar is evidence.';
   case 'REVIEW':return 'Talia — You Do: Preserve your prior evidence cutoff; evaluate the research process, not hypothetical profits. Transfer task: '+t.transfer;
   default:return t.definition;
  }
 }
 function prompt(topic,step){
  const t=typeof topic==='string'?byId(topic):topic;
  return ({Observe:'Which exact prices, volume figures, source dates and facts can you cite?',
   Explain:'Explain one calculation or definition with units and an independent numerical check.',
   Investigate:t.investigate,Interpret:'Which interpretation is plausible, and which alternative remains possible?',
   Challenge:'What is the strongest contradictory or missing evidence? '+t.contradiction,
   Plan:'What exactly would trigger, invalidate or cancel this research plan?',
   Practice:'Record an observable decision before you reveal another fictional bar.',
   Review:'What did you know at the cutoff? What would you change next time without hindsight? '+t.transfer})[step]||t.investigate;
 }
 // Warm-up and non-lookahead: all indicators are computed from exposed closes.
 function sma(values,n){
  return values.map((_,i)=>{
   if(i<n-1)return null;const s=values.slice(i-n+1,i+1);
   return s.every(Number.isFinite)?s.reduce((a,b)=>a+b,0)/n:null;
  });
 }
 function ema(values,n){
  const out=Array(values.length).fill(null),seed=values.findIndex((_,i)=>i>=n-1&&values.slice(i-n+1,i+1).every(Number.isFinite));
  if(seed<0)return out;
  out[seed]=values.slice(seed-n+1,seed+1).reduce((a,b)=>a+b,0)/n;
  const a=2/(n+1);for(let i=seed+1;i<values.length;i++){
   if(Number.isFinite(values[i]))out[i]=a*values[i]+(1-a)*out[i-1];
  }return out;
 }
 function rsi(closes,n=14){
  const out=Array(closes.length).fill(null);
  if(closes.length<n+1)return out;
  let gains=0,losses=0;
  for(let i=1;i<=n;i++){const d=closes[i]-closes[i-1];gains+=Math.max(d,0);losses+=Math.max(-d,0)}
  gains/=n;losses/=n;
  const compute=()=>losses===0?(gains===0?50:100):100-100/(1+gains/losses);
  out[n]=compute();
  for(let i=n+1;i<closes.length;i++){
   const d=closes[i]-closes[i-1];
   gains=(gains*(n-1)+Math.max(d,0))/n;
   losses=(losses*(n-1)+Math.max(-d,0))/n;
   out[i]=compute();
  }return out;
 }
 function macd(closes){
  const a=ema(closes,12),b=ema(closes,26),
   line=a.map((v,i)=>v===null||b[i]===null?null:v-b[i]);
  const signal=ema(line,9),hist=line.map((v,i)=>v===null||signal[i]===null?null:v-signal[i]);
  return {line,signal,hist};
 }
 function vwap(bars){
  let pv=0,v=0;
  return bars.map(b=>{pv+=((b.high+b.low+b.close)/3)*b.volume;v+=b.volume;return v>0?pv/v:null;});
 }
 function bollinger(closes,n=20){
  const center=sma(closes,n);
  return center.map((mean,i)=>{
   if(mean===null)return null;const sample=closes.slice(i-n+1,i+1);
   const sigma=Math.sqrt(sample.reduce((s,x)=>s+(x-mean)**2,0)/n);
   return {middle:mean,upper:mean+2*sigma,lower:mean-2*sigma};
  });
 }
 function risk({entry,stop,budget,slippage=0,spread=0}){
  const vals=[entry,stop,budget,slippage,spread].map(Number);
  if(!vals.every(Number.isFinite)||entry<=0||stop<0||budget<=0||slippage<0||spread<0||entry===stop)return null;
  const riskPerShare=Math.abs(entry-stop)+slippage+spread;
  // Tolerance avoids one-share errors due to decimal floating-point representation.
  const shares=Math.floor((budget+1e-10)/riskPerShare);
  return {riskPerShare,shares,modeledLoss:shares*riskPerShare};
 }
 // First-party, fully fictional deterministic series. NOT an external price or replay API.
 function fictional(kind='trend'){
  const out=[];let last=10;
  for(let i=0;i<48;i++){
   const drift=kind==='range'?.012*Math.sin(i/1.8):kind==='failure'?
    (i<28?.027:i<33?.12:-.105):.038;
   const close=Math.max(1,last+drift+.09*Math.sin(i*.85)+.035*Math.cos(i*.3));
   const high=Math.max(last,close)+.10+(i%4)*.015,low=Math.max(.01,Math.min(last,close)-.08-(i%3)*.017);
   out.push(Object.freeze({open:+last.toFixed(4),close:+close.toFixed(4),high:+high.toFixed(4),
    low:+low.toFixed(4),volume:1700+(i%7)*340+(i>30&&kind==='failure'?1800:0)}));
   last=close;
  }
  return out;
 }
 const API=Object.freeze({TOPICS,STEPS,DIMS,byId,stageText,prompt,sma,ema,rsi,macd,vwap,bollinger,risk,fictional,version:'4.0'});
 root.GroundUpTaliaResearchV4=API;
 if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(globalThis);
