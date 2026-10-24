/* Shared Learning Engine 3.4 — chart-linked micro-teaching.
 * Adapted to the depth of the owner-approved v3.2 Candlestick and VWAP
 * reference. One reusable engine; topic-dependent content, no fabricated
 * historical candles, client-side official grades or invented entitlement.
 */
(function(root){'use strict';
const clean=(v,n=220)=>String(v||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n);
const entry=(title,definition,why,method,example,mistake,limit,question,expected)=>Object.freeze({
 title,definition,why,method,example,mistake,limit,question,expected});
// Authored one-to-one teaching: five DIFFERENT tabs, not the generic
// competency fallback. These are clearly labeled public teaching examples,
// never historical ticker records, private graded keys or future candle data.
const candleTabs=Object.freeze({
 understand:[
  'A candlestick is a picture of prices during one chosen time period. Imagine watching a stock for five minutes. Rather than recording every trade, the candle summarizes four prices.',
  'OPEN (O) is the first recorded price: $31.00. HIGH (H) is the highest: $32.50. LOW (L) is the lowest: $30.50. CLOSE (C) is the last: $32.00.',
  'The thick rectangle, called the BODY, stretches from Open to Close. The thin lines, called WICKS, reach toward High and Low.',
  'This candle is bullish because its Close ($32.00) is higher than its Open ($31.00). Green is a common chart color for a rising candle, but always check the actual numbers.',
  'One important limit: these four prices do not tell us whether the high or the low happened first, or what price will do next.'
 ],
 recognize:[
  'Look at the highlighted candle. We will find each price together before doing any math.',
  'Step 1 — Find the body. Its bottom edge is OPEN $31.00 and its top edge is CLOSE $32.00. That makes this a bullish candle.',
  'Step 2 — Find the thin lines above and below the body. The highest tip is HIGH $32.50; the lowest tip is LOW $30.50.',
  'Step 3 — Click Open, then Close on the chart. Next click High, then Low. The highlighted part should agree with its printed price label.',
  'If the closing price slips below the opening price, the body becomes bearish. A candle with equal Open and Close has zero body even when its wicks are long.',
  'Describe the four visible values. Do not assume which wick was reached first.'
 ],
 apply:[
  'Now let us measure the completed $31.00 candle. I will show each formula, then the actual prices, and then the result.',
  'Step 1 — Real body (bullish):\nClose − Open = Body\n$32.00 (Close) − $31.00 (Open) = $1.00 (Body)\nThe price finished $1.00 above where this interval began.',
  'Step 2 — Full range:\nHigh − Low = Full Range\n$32.50 (High) − $30.50 (Low) = $2.00 (Range)\nThis is the entire distance from the upper wick tip to the lower tip.',
  'Step 3 — Upper wick:\nHigh − Close = Upper Wick\n$32.50 (High) − $32.00 (Close) = $0.50 (Upper Wick)',
  'Step 4 — Lower wick:\nOpen − Low = Lower Wick\n$31.00 (Open) − $30.50 (Low) = $0.50 (Lower Wick)',
  'Step 5 — Check the pieces:\nLower Wick + Body + Upper Wick = Full Range\n$0.50 + $1.00 + $0.50 = $2.00. The calculation matches the full range.',
  'Step 6 — Body percentage:\n(Body ÷ Full Range) × 100 = Body Percentage\n($1.00 ÷ $2.00) × 100 = 0.50 × 100 = 50%\nThe dollar units cancel in the ratio, leaving a percentage.',
  'Different worked example, not the selected $31.00 candle: Open $20.00, High $22.00, Low $19.00, Close $21.20. Body $1.20, range $3.00, upper wick $0.80, lower wick $1.00, body percentage 40%.',
  'Now try the closing-price slider: keep Open, High, and Low fixed, move only Close, and watch which body and wick measurements change.'
 ],
 mistake:[
  'The most common mistake is mixing up the real body and the full range. They answer two different questions.',
  'Wrong: High − Low is the body. That is actually the FULL RANGE, because it includes both wicks.',
  'Correct body (bullish):\nClose − Open = Body\n$32.00 (Close) − $31.00 (Open) = $1.00 (Body)',
  'Correct full range:\nHigh − Low = Full Range\n$32.50 (High) − $30.50 (Low) = $2.00 (Range)',
  'For a bearish example with Open $12.40 and Close $12.10, use Open − Close = Body: $12.40 − $12.10 = $0.30. A body is a nonnegative DISTANCE; the direction is described separately.',
  'A second error is treating a green candle as a promise that price will continue rising. It simply shows how that completed interval ended.'
 ],
 limits:[
  'A candlestick is a summary, not a recording of every trade. It cannot tell us the order of its highest and lowest prices.',
  'It cannot identify why price changed, who bought or sold, whether an actual order was filled, or what the next candle will do.',
  'A special case: if Open, High, Low, and Close are all $25.00, the real body is $0.00 and the range is $0.00. The calculation ($0.00 ÷ $0.00) × 100 is UNDEFINED, not 0% or 100%, because dividing by zero is not allowed.',
  'If Close equals Open but High is above Low, the body is $0.00 and the range is greater than zero. Then body percentage really is 0%. A flat body is not necessarily a zero-range candle.',
  'When describing a candle, say: It opened at $31.00, its high was $32.50, its low was $30.50, and it closed at $32.00. Do not invent the order in which the extremes occurred.'
 ]
});

const candleBearishTabs=Object.freeze({
 understand:[
  'A bearish candle finishes lower than it opened. We will use a different, clearly labeled example: Open $12.40, High $12.70, Low $11.90, and Close $12.10.',
  'OPEN is the first price; CLOSE is the last price of this interval. HIGH and LOW are the extremes. The thick body reaches from $12.40 down to $12.10.',
  'Because $12.10 (Close) is below $12.40 (Open), this completed candle is bearish. Red is a common color, but the price labels—not the color—tell the direction.'
 ],
 recognize:[
  'Find the OPEN at $12.40: on a bearish candle it is at the TOP of the body.',
  'Find the CLOSE at $12.10: it is at the BOTTOM of the body. The upper wick ends at HIGH $12.70 and the lower wick at LOW $11.90.',
  'Compare the printed numbers before trusting color. The candle itself does not tell you whether it reached $12.70 before or after $11.90.'
 ],
 apply:[
  'Let us calculate a bearish candle step by step. We subtract Open − Close for the positive body DISTANCE.',
  'Step 1 — Body:\nOpen − Close = Body\n$12.40 (Open) − $12.10 (Close) = $0.30 (Body)',
  'Step 2 — Full range:\nHigh − Low = Full Range\n$12.70 (High) − $11.90 (Low) = $0.80 (Range)',
  'Step 3 — Upper wick:\nHigh − Open = Upper Wick\n$12.70 (High) − $12.40 (Open) = $0.30 (Upper Wick)',
  'Step 4 — Lower wick:\nClose − Low = Lower Wick\n$12.10 (Close) − $11.90 (Low) = $0.20 (Lower Wick)',
  'Step 5 — Check:\nLower Wick + Body + Upper Wick = Full Range\n$0.20 + $0.30 + $0.30 = $0.80. The pieces match.',
  'Step 6 — Body percentage:\n(Body ÷ Full Range) × 100 = Body Percentage\n($0.30 ÷ $0.80) × 100 = 0.375 × 100 = 37.5%',
  'In Experiment, move the closing-price slider from above the opening price to below it. Notice how the top and bottom edges of the body switch meanings.'
 ],
 mistake:[
  'A bearish body is a positive distance, even though the candle closes lower. Subtract the lower number from the higher number.',
  'Correct:\nOpen − Close = Body\n$12.40 − $12.10 = $0.30. Do not report −$0.30 as the BODY size.',
  'The full range is different:\nHigh − Low = Full Range\n$12.70 − $11.90 = $0.80.',
  'Do not infer that a red candle guarantees a further decline, or that its high was reached before its low.'
 ],
 limits:[
  'This bearish candle does not show the order of transactions, the reason for the decline, actual fills, or the next candle.',
  'The same OHLC prices can arise from several different within-interval paths. Use a valid time-and-sales record if the order of prints matters.',
  'If High and Low are both $12.40, the whole candle must have Open and Close equal to $12.40, so body and range are both zero. Body percentage is undefined because the range is zero.'
 ]
});

// Source-agnostic numerical instruction. Every value below is a clearly
// SIMULATED practice input, not a historical market print or broker fill.
// Formula, substituted quantities, result, interpretation and limitations
// are presented separately for the relevant official competencies.
const quantitativeWork=Object.freeze({
 VWAP_CONTEXT:[
  'Worked VWAP calculation — simulated trades, not actual market VWAP.',
  'Step 1 — Traded dollars:\nPrice × Shares = Traded Dollars\n$8.00 × 200 shares = $1,600; $10.00 × 100 shares = $1,000.',
  'Step 2 — Totals:\n$1,600 + $1,000 = $2,600 traded dollars.\n200 + 100 = 300 traded shares.',
  'Step 3 — Weighted average:\nTotal Traded Dollars ÷ Total Shares = VWAP\n$2,600 ÷ 300 shares = $8.666… per share, rounded to $8.67.',
  'This two-price example is not a verified full-session VWAP. The data feed and scope must match the intended market benchmark.'
 ],
 EMA_CONTEXT:[
  'Worked EMA illustration — simulated closes and an assumed previously initialized EMA.',
  'Step 1 — Weight:\n2 ÷ (Periods + 1) = EMA Multiplier\n2 ÷ (3 + 1) = 0.50 for a 3-period EMA.',
  'Step 2 — Update:\nMultiplier × Current Close + (1 − Multiplier) × Previous EMA = New EMA\n0.50 × $11.00 + 0.50 × $10.00 = $10.50.',
  'The $10.00 previous EMA is an assumed initialized value. Real chart EMA needs prior completed closes, a declared seed rule and no future prices.'
 ],
 VOLUME_ANALYSIS:[
  'Worked relative-volume illustration — two comparable simulated periods.',
  'Step 1 — Check that both intervals cover the same duration and reporting universe.',
  'Step 2 — Ratio:\nCurrent Volume ÷ Comparable Average Volume = Relative Volume\n600 shares ÷ 200 average shares = 3.0 times the average.',
  'Relative volume of 3.0× is not a 300% probability of continuation. It does not establish buyer identity.'
 ],
 RISK_PER_SHARE:[
  'Worked planned long-position risk — simulated assumptions, not an actual trade.',
  'Step 1 — State proposed Entry $10.00 and Stop $9.70 before looking at later prices.',
  'Step 2 — Distance:\nEntry − Stop = Planned Risk per Share\n$10.00 − $9.70 = $0.30 per share.',
  'This planned loss distance excludes fees, gaps and slippage. A stop price is not a guaranteed execution price.'
 ],
 POSITION_SIZING:[
  'Worked hypothetical share-count limit — not an order recommendation.',
  'Step 1 — Risk budget $30.00; assumed entry $10.00 and stop $9.70.',
  'Step 2 — Per-share loss:\nEntry − Stop = Planned Risk per Share\n$10.00 − $9.70 = $0.30 per share.',
  'Step 3 — Whole shares:\nFloor(Risk Budget ÷ Risk per Share) = Maximum Planned Shares\nFloor($30.00 ÷ $0.30) = 100 shares.',
  'Recheck buying power, liquidity, execution uncertainty and order size. A planned stop does not cap every possible actual loss.'
 ],
 RISK_REWARD:[
  'Worked long-only risk/reward planning — all prices are proposed, not filled.',
  'Step 1 — Planned Entry $10.00, Stop $9.70, Target $10.60.',
  'Step 2 — Distances:\nEntry − Stop = Risk; Target − Entry = Reward\n$10.00 − $9.70 = $0.30 risk; $10.60 − $10.00 = $0.60 reward.',
  'Step 3 — Ratio:\nPlanned Reward ÷ Planned Risk = Reward-to-Risk\n$0.60 ÷ $0.30 = 2 to 1.',
  'A 2-to-1 planned ratio is not an expected return or a guarantee that either price will trade or fill.'
 ],
 SLIPPAGE_SPREAD:[
  'Worked quote and hypothetical execution difference — not an actual fill.',
  'Step 1 — Same-timestamp best Bid $10.00 and Ask $10.04.',
  'Step 2 — Quoted spread:\nAsk − Bid = Spread\n$10.04 − $10.00 = $0.04 per share.',
  'Step 3 — Midpoint:\n(Bid + Ask) ÷ 2 = Midpoint\n($10.00 + $10.04) ÷ 2 = $10.02.',
  'Step 4 — Relative spread:\n(Spread ÷ Midpoint) × 100 = Spread Percent\n($0.04 ÷ $10.02) × 100 ≈ 0.40%.',
  'For a hypothetical buy planned at $10.04 but modeled to execute at $10.07, adverse slippage is $0.03/share. Neither quote guarantees a fill.'
 ],
 FLOAT_SUPPLY:[
  'Worked turnover calculation — reported float estimates may be stale.',
  'Step 1 — Assume 5,000,000 reported free-trading shares and 10,000,000 shares of session volume.',
  'Step 2 — Turnover:\nSession Shares Traded ÷ Reported Float = Float Turnover Multiple\n10,000,000 ÷ 5,000,000 = 2.0×.',
  'A 2.0× share-volume/float ratio does not mean each share changed owners twice. Shares can trade repeatedly; source dates and split adjustments matter.'
 ],
 MFE_MAE_REVIEW:[
  'Worked retrospective long-side excursion — hypothetical entry and observation window.',
  'Step 1 — Assume entry $10.00; the largest visible subsequent high before the selected endpoint is $10.70, and lowest visible low is $9.80.',
  'Step 2 — Favorable excursion:\nHighest Observed Price − Entry = MFE\n$10.70 − $10.00 = $0.70 per share.',
  'Step 3 — Adverse excursion:\nEntry − Lowest Observed Price = MAE\n$10.00 − $9.80 = $0.20 per share.',
  'The metric measures price extrema inside a specified retrospective window, not executable profits or guaranteed order fills.'
 ],
 LEVEL2_READING:[
  'Worked top-of-book arithmetic — example quotes, not guaranteed executable depth.',
  'Step 1 — Assume best displayed Bid $10.00 and Ask $10.03 from the same quote snapshot.',
  'Step 2 — Spread:\nAsk − Bid = Quoted Spread\n$10.03 − $10.00 = $0.03 per share.',
  'Quote size is unexecuted displayed interest. Only a verified trade print proves shares actually traded.'
 ]
});

const lessons=Object.freeze({
 candle:Object.freeze({
  all:entry('The completed candlestick','One candle summarizes the Open (O), High (H), Low (L), and Close (C) of a specified time interval.','The four prices show what was observed in that interval; one candle is not an entire trend.','Find the top and bottom of the wicks, then identify where the body starts and ends.','In this illustrative five-minute example O=$31.00, H=$32.50, L=$30.50, C=$32.00.','Confusing the close with the highest price, or treating one candle as a prediction.','OHLC cannot reveal the order of intrabar transactions or the next bar.','What four prices does OHLC represent?','open high low close'),
  open:entry('Opening price','The open is the first recorded price of the completed time interval.','It defines one endpoint of the real body and is the starting comparison for candle direction.','Find the OPEN price label and trace it to the bottom or top of the body.','The five-minute example opens at $31.00 and closes at $32.00, making a $1.00 bullish body.','Assuming the open must equal the low, or confusing it with the prior day close.','The open alone does not reveal what happened after it.','What does Open measure within one candle?','first price'),
  close:entry('Closing price','The close is the last recorded price of the specified, completed interval.','Comparing the close with the open establishes whether the candle body rose or fell.','Read CLOSE, compare it with OPEN, then describe direction without predicting the next bar.','The $32.00 close is $1.00 above the $31.00 open for this completed five-minute candle.','Mistaking the last price of a five-minute candle for the daily closing price.','A close above open alone is not a validated breakout.','What establishes whether a completed candle is bullish or bearish?','close open'),
  high:entry('Highest observed price','The high is the maximum price reached during the completed interval.','The high defines the top of the full range; the upper wick may show movement beyond the real body.','Point to the upper extreme on the displayed wick and read HIGH.','For the illustrative candle, High=$32.50; $32.50−$30.50=$2.00 is the full range.','Substituting the close for the high when the candle has an upper wick.','A high cannot tell you when during the interval that extreme occurred.','Which two values do you need to calculate a candle’s full range?','high low'),
  low:entry('Lowest observed price','The low is the minimum price reached during the completed interval.','It defines the bottom of the full range and one end of the lower wick.','Select LOW, identify the lowest endpoint, and compare it with the open and close.','In this illustrative example the low is $30.50, beneath the $31.00 open.','Treating the low as the first price or assuming a low wick proves buyers reversed the market.','One low does not establish a swing low or reversal without further observations.','What does Low measure, and can it prove a reversal?','lowest price'),
  body:entry('Real body','The real body is the distance between the completed candle’s open and close. Body size = |Close − Open|; absolute-value bars mean distance is nonnegative.','It measures the net opening-to-closing change within that interval.','Locate OPEN and CLOSE; subtract and take the absolute value; keep dollar units.','|$32.00−$31.00|=$1.00 of real body in this illustrative example.','Using High−Low to compute body; that instead gives the full range.','A large body cannot prove continuation or identify who traded.','Which two prices define the real body?','open close'),
  range:entry('Full candle range','Full range = High − Low. It includes the real body and any upper/lower wick.','This expresses total observed price dispersion during a single interval.','Read HIGH and LOW at the wick extremes, then subtract with price units.','Illustrative $32.50−$30.50=$2.00 of full range.','Using Close−Open and accidentally calculating the body.','The full range does not reveal the path of prices within the interval.','How is the full candle range calculated?','high low'),
  percent:entry('Body-to-range percentage','Percentage = (|Close − Open| ÷ (High − Low)) × 100, when the full range is greater than zero.','The body is the part, the entire range is the whole; a percentage expresses their ratio out of 100.','Calculate body and range separately with dollar units. Divide the dollar amounts so units cancel; multiply the decimal by 100.','In the illustrative example $1.00 ÷ $2.00 = 0.50; 0.50 × 100 = 50%.','Entering $1.00, 0.50, or 0.5 instead of 50%; dividing by zero for a flat candle.','Body percentage describes the completed candle, not a probability that price rises.','What operation converts the body-to-range decimal into a percentage?','multiply 100')
 }),
 vwap:Object.freeze({
  price:entry('Completed candle prices','Candle prices summarize completed OHLC intervals; they are not individual trade prints.','A market benchmark must be evaluated against observations that existed at the pause.','Inspect completed closes and each candle timestamp before comparing a VWAP value.','An illustrative sequence of five-minute closes can be compared with a session-running reference.','Mistaking a wick crossing for a confirmed completed close.','A close alone does not establish entry quality or future continuation.','Which candle price is used in this clearly labeled bar-close VWAP approximation?','close'),
  both:entry('Volume-weighted average price','VWAP = Σ(price × shares) ÷ Σ(shares). Σ (sigma) means add the individual values.','Prices accompanied by more shares exert more influence on the weighted average.','Multiply each observed price by its shares; add traded dollars, add shares, then divide dollars by shares.','Reference: 200 shares × $8 = $1,600; 100 × $10 = $1,000; $2,600 ÷ 300 shares = $8.67/share.','Taking ($8+$10)÷2 = $9 ignores unequal trade sizes.','The displayed line uses completed bar-close × volume and is an approximation, not tick-accurate VWAP.','Why does a 200-share trade group affect VWAP more than a 100-share group?','more shares'),
  volume:entry('Share volume and VWAP','Volume counts shares, not dollars. VWAP divides accumulated traded-dollar value by accumulated share volume.','The denominator gives the average dollars-per-share unit.','Inspect the volume bars aligned to the same completed candle periods.','200 + 100 = 300 shares; $2,600 ÷ 300 shares = $8.67/share.','Putting $2,600 in the denominator instead of 300 shares, or mixing two different intervals.','Share counts do not identify buyer or seller motives.','What is the denominator of the VWAP formula?','total shares')
 }),
 ema:Object.freeze({
  price:entry('Completed closing prices','A moving average is calculated from a historical sequence of completed observations, commonly closes.','It reduces some price noise but responds after prices change.','Identify the chart timeframe, use only completed closes, and compare price with the historical reference.','A rising close will influence EMA9 more strongly than EMA20 because EMA9 uses a larger smoothing multiplier.','Describing an EMA crossover as a guaranteed buy signal.','EMA values depend on prior observations and their initialization.','Can one completed candle prove a new EMA trend?','no'),
  both:entry('EMA9 and EMA20','EMA = current close × α + prior EMA × (1−α), where α=2÷(period+1).','The shorter nine-period average reacts faster than the 20-period average.','Compare the two lines with price, the sequence of prior closes, and the chart interval.','For EMA9, α=2/10=0.20; for EMA20, α=2/21≈0.0952.','Assuming the lines lead price or that a crossover eliminates risk.','A crossover by itself does not establish liquidity, spread or an entry plan.','Which EMA responds faster to a new closing price, EMA9 or EMA20?','ema9'),
  volume:entry('Volume beside EMA','Each blue bar records shares exchanged during its corresponding illustrative candle.','Participation can help interpret an EMA move without proving causation.','Align the time of the volume bar and the close used by the EMA.','Compare a relatively large volume bar with earlier bars from the same interval length.','Inferring a specific trader’s identity from aggregate volume.','Volume does not prove that a crossover will hold.','What must match when comparing volume with an EMA candle?','timeframe')
 }),
 structure:Object.freeze({
  price:entry('Price structure','Structure compares confirmed, meaningfully defined highs and lows across completed candles.','A sequence is required to distinguish upward, downward and ranging price action.','Identify comparable swing pivots, annotate the relevant levels, then check the sequence.','Higher highs accompanied by higher lows may support an advancing structure.','Calling one upward candle a confirmed uptrend.','Different swing definitions can yield different classifications.','How many completed observations are needed to establish a sequence?','more than one'),
  both:entry('Price and reference levels','A reference level gives price action a defined location for comparison.','A level can distinguish an attempt from confirmation under a stated rule.','State whether your rule requires a wick test, a close, or multiple completed closes.','A candle whose wick crosses a level but closes below may be an unconfirmed attempt.','Changing confirmation rules after seeing future candles.','No drawn line predicts that support or resistance must hold.','Does a wick above resistance automatically confirm a close-based breakout?','no'),
  volume:entry('Volume confirming context','Volume accompanies price structure as participation data, not a direction guarantee.','A breakout interpretation is stronger when compared against a relevant, clearly defined baseline.','Align volume with the same candle that tested the reference level.','Compare a breakout-attempt candle’s shares to previous same-duration intervals.','Treating high shares alone as a confirmed breakout.','Volume cannot show market participants’ intentions.','Can high volume alone establish a valid breakout?','no')
 }),
 volume:Object.freeze({
  price:entry('Price and volume relationship','Every volume bar describes shares traded in the same interval as its price candle.','Together they describe observed movement and participation, rather than who initiated it.','Match the two timestamps, read the candle’s OHLC, and compare volume to a baseline.','A large candle with 500 illustrative shares can be compared with earlier 100-share periods.','Treating candle color as proof of buy/sell trade direction.','Price-volume agreement does not guarantee the next bar.','Which two observations must refer to the same time interval?','price volume'),
  both:entry('Relative volume','Relative volume compares current volume with a defined historical average for comparable periods.','This distinguishes relatively active periods from quieter periods.','Compute current shares ÷ average shares, explicitly stating the period and sample length.','300 shares ÷ 100 average shares = 3.0× relative volume.','Comparing incompatible time intervals or interpreting 3× as 300%.','Relative volume alone cannot prove directional continuation.','If the current period has 300 shares and the comparable average is 100, what is relative volume?','3'),
  volume:entry('Reading volume bars','Volume is the count of shares traded, not a net bullish/bearish vote.','It expresses how much trading occurred within the completed interval.','Inspect the volume-axis units and compare bars of identical duration.','500 shares in one illustrative five-minute bar exceeds 100 in another.','Using a tall blue bar to infer an institutional buyer.','Volume cannot identify traders without additional verified information.','What does a volume bar measure?','shares')
 }),
 tape:Object.freeze({
  prints:entry('Reading Time & Sales','A completed tape print shows execution time, trade price, and traded share quantity.','Execution records differ from current quotes and help establish what actually traded.','Read the timestamp, execution price, share size and any documented bid/ask context.','An invented 09:30:04 trade at $10.02 for 250 shares records a completed execution.','Treating red/green display color as proof of the buyer’s or seller’s motive.','Trade-print displays cannot reveal the participant’s actual intention.','Which three primary facts are present in a completed tape print?','time price shares')
 }),
 depth:Object.freeze({
  quotes:entry('Reading Level II quotes','Bid is the highest displayed buying quote; ask is the lowest displayed selling quote.','The difference is the quoted spread and displayed sizes describe visible, changeable liquidity.','Read best bid, ask, and sizes; calculate spread = ask − bid.','Illustrative best bid $10.00 and ask $10.03 give a $0.03 quoted spread.','Assuming displayed shares guarantee your order will fill.','Quotes can change, cancel, or execute before your order reaches the venue.','What is the formula for quoted spread?','ask bid')
 }),
 routing:Object.freeze({
  order:entry('Order submission and execution','Submitting, accepting and executing an order are distinct stages.','An accepted limit order can remain open or fill partially when available liquidity is insufficient.','Check the submitted price, time in force, available shares and confirmed execution report.','If 100 shares are ordered but only 40 are available, a 40-share partial execution may occur.','Treating a price touch as proof that 100 shares traded.','Actual execution depends on queue, routing, eligibility and confirmed broker records.','Does an accepted order guarantee a full execution?','no')
 })
});
const aliases={body:'body',range:'range',percent:'percent',all:'all',open:'open',close:'close',high:'high',low:'low',
 price:'price',both:'both',volume:'volume',prints:'prints',quotes:'quotes',order:'order'};
function get({type='',feature='',concept='',guide={},labId='',bridge=null,teaching={}}={}){
 const subject=clean(concept,120)||clean(guide.title,120)||'market evidence';
 const key=aliases[feature]||feature;
 const found=lessons[type]?.[key];
 // Boot Camp daily objectives override the related Lab's instructional
 // topic, without changing that Lab's independent official assessment.
 const own=teaching&&typeof teaching==='object'&&typeof teaching.what==='string'&&
  teaching.what.trim().length>20?teaching:null;
 if(own&&['understand','recognize','apply','mistake','limits'].includes(key)){
  const steps=Array.isArray(own.how)?own.how.filter(x=>typeof x==='string'&&x.trim()).slice(0,5):[];
  const phrases={
   understand:['Our lesson is '+subject+'.',clean(own.what,550),
    'Why we are studying this: '+clean(own.why||own.when||own.what,550)],
   recognize:['Let us look for the evidence behind '+subject+'.',clean(own.when||own.why,550),
    'Find the exact source, timestamp and visible units before making any claim.'],
   apply:['Now let us practice '+subject+'.',
    ...steps.map((line,i)=>'Step '+(i+1)+' — '+clean(line,650)),
    'Our practice objective: '+clean(own.what,550)],
   mistake:['A common mistake to avoid while practicing '+subject+':',
    clean(own.commonError||'Treating a missing or unverified value as observed evidence.',550),
    'Try the method again: '+clean(steps[0]||own.when||own.what,550)],
   limits:['What this lesson does not establish:',
    clean(own.limitation||'A completed example cannot verify a future result or actual execution.',550),
    'Your reflection and attendance do not grant official competency mastery.']
  };
  return {...(found||lessons.candle.all),title:subject+' — '+key,
   script:phrases[key].filter(Boolean).join('\n\n'),concept:subject,
   type,feature:key,verifiedHistory:false,editorialFallback:false};
 }
 if(type==='candle'&&Object.prototype.hasOwnProperty.call(candleTabs,key)){
  const base=lessons.candle.all;
  const bearish=/\bbearish\b|\bdown candle\b/i.test(subject);
  return {...base,title:({understand:'Understand the candle',recognize:'Recognize each price',
   apply:'Apply the calculations',mistake:'Correct a common mistake',
   limits:'What the candle cannot show'})[key],
   script:(bearish?candleBearishTabs[key]:candleTabs[key]).join('\n\n'),
   concept:subject,type,feature:key,verifiedHistory:false};
 }
 // Original public instructional bridges — no individual private grade or
 // verified source bar is claimed by an editorially provisional crosswalk.
 if(bridge&&bridge.labId===labId&&bridge.tabs&&
    ['understand','recognize','apply','mistake','limits'].includes(key)&&
    Array.isArray(bridge.tabs[key])&&bridge.tabs[key].length>=3){
  const plan=found||lessons.candle.all;
  return {...plan,title:bridge.title+' — '+key,
   script:[...bridge.tabs[key].filter(x=>typeof x==='string'),
    ...(key==='apply'?(quantitativeWork[bridge.mappedGuideCode]||[]):[])].join('\n\n'),
   concept:subject,type,feature:key,verifiedHistory:false,
   sourceStatus:bridge.sourceStatus,editorialFallback:false};
 }
 if(found)return {...found,concept:subject,type,feature:key,verifiedHistory:false};
 // Subject-specific competency bridge. Never fabricate calculations, ticker
 // prices, an assessment key or an unseen chart when editorial data is absent.
 const caseStudy=root.GroundUpLabV34CompetencyExamples?.get?.(guide.code);
 const caseIndex=/^case-(\d+)$/.exec(String(feature||''));
 const exampleIndex=caseIndex?Number(caseIndex[1]):-1;
 const definition=clean(guide.concept||guide.definition||subject,480);
 const method=clean(guide.procedure||guide.method,500);
 const limits=clean(guide.limit||guide.invalidation,350);
 const mistake=clean(guide.commonError,350);
 const caseSteps=Array.isArray(caseStudy?.steps)?caseStudy.steps.filter(x=>typeof x==='string').slice(0,5):[];
 // Five topic-specific paths for Labs without an authored micro-feature.
 // Do not invent ticker prices, future bars, assessment keys or examples.
 const tabScripts={
  understand:[subject+'.',definition,
   method?'Why the method matters: '+method:'We begin by defining what is observable.'],
  recognize:['Here is what to recognize for '+subject+'.',
   method||'Start with the visible labeled observations.',
   limits?'Check this boundary: '+limits:'Mark anything you cannot observe as unknown.'],
  apply:['Now apply '+subject+' to a documented example.',
   method||'Identify the available data before making the comparison.',
   ...(caseSteps.length?caseSteps:['A separately reviewed numerical worked case is not available for this Lab. Do not invent missing inputs.'])],
  mistake:['The common mistake: '+(mistake||'treating an observation as a future outcome.'),
   method?'How to correct it: '+method:'Identify which evidence is missing.',
   limits?'A limit to remember: '+limits:''],
  limits:['What cannot be concluded from this example:',
   limits||'It does not establish an unseen market outcome or verified trade fill.',
   'State recorded facts separately from hypotheses and future possibilities.']
 };
 return {
  title:subject+' — '+(clean(feature,60)||'guided observation'),
  definition:definition||subject+' is the skill examined in this lesson.',
  why:'The purpose is to recognize and explain this exact subject using evidence available at the pause.',
  method:method||'Identify the observation, timeframe, comparison rule, and one competing interpretation.',
  example:caseStudy?.steps?.length?(exampleIndex>=0&&exampleIndex<caseStudy.steps.length?
   caseStudy.steps[exampleIndex]:caseStudy.steps.join(' ')):
   'Apply this method to the current illustrated or book-authored case. Do not invent missing values.',
  mistake:mistake||'Do not treat an interpretation as a known future outcome.',
  limit:limits||'Unseen bars and unverified historical candles cannot support a conclusion.',
  question:'What specific evidence supports your interpretation of '+subject+', and what would invalidate it?',
  expected:'reasoned evidence',
  script:tabScripts[key]?.filter(Boolean).join('\n\n'),
  concept:subject,type,feature:key,verifiedHistory:false,editorialFallback:true
 };
}
function narration(plan){
 return [
  plan.title+'.',
  'What it means: '+plan.definition,
  'Why it matters: '+plan.why,
  'Follow the method: '+plan.method,
  'Worked explanation: '+plan.example,
  'Common mistake: '+plan.mistake,
  'Limitations: '+plan.limit
 ].join('\n\n');
}
// The v3.2 reference separates three intermediate calculations. These
// illustrative cases are for learning only and cannot award an official grade.
const practiceCases=Object.freeze({
 candle:[
  {id:'body',prompt:'Calculate the real body when Open is $31.00 and Close is $32.00. Enter dollars.',answer:1,
   help:'Body is the absolute difference |Close − Open| = |$32.00 − $31.00| = $1.00. It is not High − Low.',
   newExample:'Open $12.20 and Close $11.70 produce a $0.50 real body.'},
  {id:'range',prompt:'Calculate the full range when High is $32.50 and Low is $30.50. Enter dollars.',answer:2,
   help:'Full range = High − Low = $32.50 − $30.50 = $2.00, including both wicks and the body.',
   newExample:'High $7.80 and Low $7.10 give a $0.70 full range.'},
  {id:'percent',prompt:'What percentage of the $2.00 range does a $1.00 body occupy? Enter a percentage.',answer:50,
   help:'Body is the part: $1.00; range is the whole: $2.00. Divide 1 ÷ 2 = 0.5, then multiply by 100 = 50%.',
   newExample:'$0.60 body ÷ $1.50 range × 100 = 40%.'}
 ],
 vwap:[
  {id:'dollars',prompt:'What is combined traded dollar value for 200 shares at $8 and 100 shares at $10? Enter dollars.',answer:2600,
   help:'$8×200 = $1,600; $10×100 = $1,000. Add = $2,600. The dollar value is the numerator, not the VWAP.',
   newExample:'100 shares at $5 plus 100 shares at $7 create $1,200 traded dollars.'},
  {id:'shares',prompt:'How many shares traded across groups of 200 shares and 100 shares? Enter shares.',answer:300,
   help:'Add the shares, not the dollars: 200+100 = 300 shares. This is the denominator.',
   newExample:'Four groups of 50 shares give 200 shares.'},
  {id:'vwap',prompt:'Divide $2,600 traded dollars by 300 shares to calculate VWAP. Enter dollars per share to two decimals.',answer:2600/300,
   help:'VWAP=$2,600÷300=$8.666…/share, or $8.67 rounded. A simple ($8+$10)/2=$9 omits volumes.',
   newExample:'150 shares at $12 and 50 at $16 give ($1,800+$800)/200=$13/share.'}
 ]
});
// Source-of-truth introductory teaching adapted from the uploaded v3.2
// source/labs.mjs. Only PUBLIC instructional examples are copied; private
// independent assessments, keyed answers and future replay candles are not.
const referenceIntros=Object.freeze({
 candle:Object.freeze({
  title:'Build and Understand a Candlestick',
  term:'OHLC',
  definition:'O is the opening price, H is the high, L is the low, and C is the closing price.',
  why:'Each candlestick records the price movement during a defined time interval.',
  example:'An illustrative five-minute candle opens at $31.00, has a high of $32.50 and low of $30.50 (their order is unknown), and closes at $32.00.',
  steps:Object.freeze([
   'Find OPEN ($31.00), the interval’s first recorded price, and CLOSE ($32.00), its last recorded price. Those values mark the body edges.',
   'Find HIGH ($32.50), the greatest recorded price, and LOW ($30.50), the least. These are the wick extremes; their order is unknown.',
   'Compare direction:\nIs Close higher than Open?\n$32.00 (Close) is higher than $31.00 (Open). Yes: this candle is bullish.',
   'Calculate the body:\nClose − Open = Body\n$32.00 (Close) − $31.00 (Open) = $1.00 (Body). This is the net change, not the path taken.',
   'Calculate the full range:\nHigh − Low = Full Range\n$32.50 (High) − $30.50 (Low) = $2.00 (Full Range).',
   'Calculate the upper wick:\nHigh − Close = Upper Wick\n$32.50 (High) − $32.00 (Close) = $0.50 (Upper Wick).',
   'Calculate the lower wick:\nOpen − Low = Lower Wick\n$31.00 (Open) − $30.50 (Low) = $0.50 (Lower Wick).',
   'Check the parts:\nLower Wick + Body + Upper Wick = Full Range\n$0.50 + $1.00 + $0.50 = $2.00. It matches.',
   'Calculate the body percentage:\n(Body ÷ Full Range) × 100 = Body Percentage\n($1.00 ÷ $2.00) × 100 = 0.50 × 100 = 50%. Dollars cancel, leaving percent.'
  ]),
  caution:'OHLC cannot establish the sequence of trades inside the candle or whether another candle will rise.'
 }),
 vwap:Object.freeze({
  title:'Understand VWAP and Replay the Market',
  term:'Volume-Weighted Average Price',
  definition:'VWAP is the average traded price weighted by the number of shares associated with each price.',
  why:'High-volume prices contribute more heavily to the result.',
  example:'In an illustrative demonstration, 100 shares trade at $10 and 300 shares at $11.',
  steps:Object.freeze([
   'Calculate traded dollars: 100 × $10 = $1,000; 300 × $11 = $3,300.',
   'Add the dollar values: $1,000 + $3,300 = $4,300.',
   'Add the shares: 100 + 300 = 400 shares.',
   'Divide dollars by shares: $4,300 ÷ 400 = $10.75 per share. Σ means sum; it is not a future-price prediction.'
  ]),
  caution:'The reference replay uses cumulative completed-bar close × volume as an approximation. Tick-accurate VWAP requires individual trades.'
 })
});
function referenceIntro(type){return referenceIntros[type]||null;}
const practiceFor=kind=>(practiceCases[kind]||[]).map(x=>({...x}));
root.GroundUpLabV34InteractiveLessons=Object.freeze({get,narration,practiceFor,referenceIntro,version:'3.4.1'});
})(globalThis);
