/* Stock Market Foundations Knowledge Database V2. Original ungraded study library.
 * 12 existing core topics stay authoritative. Research-derived heuristics are not
 * forecasts, licensed third-party signal data, live market observations or trades.
 */
(function(root){'use strict';
const SEC='https://www.investor.gov/introduction-investing';
const FILINGS='https://www.investor.gov/introduction-investing/getting-started/researching-investments/using-edgar-research-investments';
const ORDERS='https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-14';
const STOP='https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-15';
const SOURCES=Object.freeze({SEC,FILINGS,ORDERS,STOP});
const categoryNames=Object.freeze({
 chart:'Chart Reading & Market Structure',
 indicators:'Indicators, Volume & Execution',
 patterns:'Setups, Failures & Conditions',
 company:'Company, Catalysts & Filings',
 research:'Watchlists & Research Decisions',
 risk:'Risk, Planning & Review'
});
// Each advanced entry has primary explanation, reasoning, four concrete steps,
// numerical or fictional worked case, contradiction, independent self-check,
// answer-review and source classification. No third-party text reproduced.
function T(id,category,title,definition,why,steps,caseStudy,challenge,review,limits,source,link){
 return Object.freeze({id,category,title,definition,why,steps:Object.freeze(steps),
  caseStudy,challenge,review,limits,source,link});
}
const entries=Object.freeze([
 T('candle-anatomy','chart','The candle body, upper wick and lower wick',
 'Open and close define the body of a completed candle; its high and low define the wick extremes and full range. A green body means close exceeds open under the selected chart convention, not that the security must rise in the next interval. High minus low is the range; the absolute difference between close and open is the body size.',
 'A trader who confuses a long wick with a guaranteed reversal may misread a single bar as a complete trading decision.',
 ['Identify the interval and whether the bar is finished.','Record open, high, low and close in price units.','Calculate body and total range separately.','Examine neighboring completed bars and relevant volume before forming a tentative interpretation.'],
 'FICTIONAL five-minute candle: open $5.00, high $5.40, low $4.90 and close $5.30. Body is $0.30, range is $0.50, upper wick is $0.10 and lower wick is $0.10. The same OHLC cannot tell whether $4.90 came before $5.40.',
 'Explain the candle body and range, then identify the detail that OHLC cannot reveal about event order.',
 'The candle closes $0.30 above its open; the $0.50 range includes both wicks. Its OHLC does not reveal intrabar high/low order or a future direction.',
 'A wick alone proves neither absorption nor a particular trader’s intent. Completed candles still require context and source timestamps.',
 'Original price-chart educational synthesis',SEC),
 T('swing-structure','chart','Higher highs, higher lows and changing structure',
 'A swing high is a local price peak, and a swing low is a local trough under an explicitly chosen method. Higher highs (HH) and higher lows (HL) may describe an observed advance; lower highs (LH) and lower lows (LL) may describe a decline. A single move against that pattern can create uncertainty without conclusively reversing the trend.',
 'Recognizing the sequence is more reliable than declaring an uptrend merely because the last candle is green.',
 ['Choose a timeframe and a reproducible swing-identification rule.','Mark the last two confirmed peaks and troughs.','Compare each new high/low to its appropriate predecessor.','Document a level whose failure would change the structure hypothesis.'],
 'FICTIONAL confirmed peaks $10.00 then $10.80, and troughs $9.40 then $9.75: both comparisons increase. A later low of $9.50 breaks the most recent higher-low reference but does not reveal the next bar.',
 'What would a break under the latest $9.75 trough weaken, and what additional evidence would you require?',
 'It weakens the observed HH/HL sequence. Confirmed structure, subsequent price acceptance, relevant timeframe and volume are needed before a stronger claim.',
 'Swing points sometimes require subsequent bars for confirmation; historical charts must not reveal those future bars early.',
 'Original historical-structure synthesis',SEC),
 T('levels','chart','Support, resistance and decision boundaries',
 'Support and resistance are observed price regions where trading behavior has previously changed. They are references, not walls. A decision boundary specifies what future observation would invalidate a working hypothesis, ideally before an entry is considered.',
 'A price near yesterday’s high might attract attention, but the level itself provides neither a fill guarantee nor a probability of breakout.',
 ['Mark the source and date of each important level.','Identify repeated tests, rejections and accepted movement through the region.','Define a breakout, rejection and no-trade alternative separately.','Check whether the level is intraday, multi-day or split-adjusted.'],
 'FICTIONAL: prior highs cluster around $12.00. Price briefly prints $12.08, then closes below $11.95. A one-trade tick over $12 is not equivalent to a sustained completed-bar breakout.',
 'Why is a momentary high above a prior level inadequate evidence of a durable breakout?',
 'The print confirms only that a trade occurred above the reference; later acceptance, volume and invalidation conditions must still be examined.',
 'Avoid inventing precise horizontal levels from an unsourced or adjusted chart.',
 'Original support/resistance synthesis',SEC),
 T('timeframes','chart','One-minute, three-minute, five-minute and daily context',
 'A timeframe aggregates transactions over its own interval. Short bars expose more near-term variation, while longer bars compress that variation. A developing five-minute bar may display a high that disappears from a closing-price-only comparison. Multi-timeframe alignment is a way to compare observations, not proof of safety.',
 'Trading plans often fail because a minute-chart signal conflicts with a broader trend or was drawn from an unfinished bar.',
 ['Label each chart’s market session, timezone and interval.','Compare completed daily and five-minute structure first.','Use one-minute detail to study a scenario without overriding its higher-timeframe context.','Identify exactly which bar was complete when the decision was made.'],
 'FICTIONAL: five successive one-minute closes are $5.10, $5.05, $5.15, $5.08 and $5.02. The completed five-minute bar closes at $5.02; it was not a steady five-minute rise despite interim green minutes.',
 'What information is lost when five one-minute candles are condensed into one five-minute candle?',
 'The sequence of minute-level closes and many possible intrabar paths are no longer visible; the larger candle only summarizes aggregate prices.',
 'Do not compare extended-hours and regular-session bars without stating that difference.',
 'Original multi-timeframe study',SEC),
 T('market-sessions','chart','Pre-market, open, midday and afternoon conditions',
 'Market participation, spread, volume and urgency can vary through a session. A pattern associated with a particular time of day is a descriptive research framework, not a universal rule. U.S. regular-session time and exchange holidays should be established before converting timestamps.',
 'Apparent continuation at the open may differ from low-volume midday movement even if the candle shapes look similar.',
 ['Record exchange-local time and whether the session is regular or extended.','Compare spread and executed volume at the relevant times.','Observe whether the latest bar has closed.','Use the same timeframe and session definitions across historical cases.'],
 'FICTIONAL: at 9:35 a security trades 80,000 shares in five minutes with a $0.03 spread; at 13:10 it trades 6,000 shares with a $0.13 spread. Matching candle bodies do not imply comparable exit conditions.',
 'Why might the two matching-looking candles represent different execution risks?',
 'Liquidity conditions differ: the wider spread and lower participation may increase transaction cost and uncertainty about exits.',
 'No specific clock time assures a reversal, profitable setup, or executable order.',
 'Original session-comparison synthesis',SEC),

 T('vwap','indicators','VWAP — price weighted by traded volume',
 'Volume-weighted average price (VWAP) is the sum of a chosen price proxy multiplied by executed volume divided by total volume over a defined period. For OHLCV-only demonstrations, typical price (high + low + close) / 3 can be used as a proxy; it is not the same as tick-by-tick trade-price VWAP.',
 'VWAP helps compare observed price with an executed-volume-weighted reference, but does not identify every buyer or guarantee that price will hold a line.',
 ['Specify the reset session and the price proxy or trade source.','Calculate each bar’s typical price and multiply by its volume.','Keep cumulative price×volume and cumulative volume separate.','Divide the totals and compare completed prices with the computed reference.'],
 'FICTIONAL: bar A has typical price $10 and 100 shares; bar B has typical price $11 and 300 shares. Approximate two-bar VWAP = ($1,000 + $3,300) / 400 = $10.75, not the simple price average of $10.50.',
 'Why is the approximate VWAP nearer $11, and why must the session reset rule be stated?',
 'The higher-priced bar has three times the recorded volume, so it contributes more weight; a changed session reset changes the cumulative denominator.',
 'Intrabar trade distribution, odd-lot inclusion, venue and feed adjustments can alter a true trade-based VWAP.',
 'Original indicator-math synthesis',SEC),
 T('ema','indicators','EMA 9, EMA 20 and moving-average lag',
 'An exponential moving average gives greater weight to newer closes. Its smoothing factor is 2/(period+1): EMA 9 uses 0.20 and EMA 20 uses about 0.09524. Calculation requires a defined seed; charting services may initialize differently. A crossing describes recent averages, not an automatic order trigger.',
 'Using EMA 9 and EMA 20 without understanding initialization, intervals and lag can produce false confidence in a noisy market.',
 ['Select a completed-bar closing-price series.','Define the EMA length and starting value.','Apply EMA-new = alpha×close + (1-alpha)×EMA-old.','Check whether a cross persists and whether higher-timeframe evidence contradicts it.'],
 'FICTIONAL EMA 9: previous EMA $10.00, new completed close $10.50. New EMA = 0.20×$10.50 + 0.80×$10.00 = $10.10.',
 'If the newest price falls from $10.50 to $9.50 while the old EMA remains $10, what is the updated EMA 9?',
 'New EMA is 0.20×$9.50 + 0.80×$10.00 = $9.90. The average responds but lags the new close.',
 'Do not treat a moving-average touch as an objectively verified support level or guaranteed fill.',
 'Original EMA calculation',SEC),
 T('relative-volume','indicators','Raw volume, relative volume and comparability',
 'Share volume counts executions; relative volume compares observed volume with a specified benchmark. The ratio is meaningless without its denominator and window. Comparing a partial day with an entire 60-day average daily total can be misleading; matched elapsed-time or completed-session comparisons are often more informative.',
 'Large headline volume can coexist with thin executable depth at the specific price and moment a trader wants to exit.',
 ['State cumulative or per-bar volume and its cutoff time.','Describe the historical reference and inclusion of nontrading days.','Divide like-for-like observed volume by the benchmark.','Review contemporaneous quotes and spreads independently of volume.'],
 'FICTIONAL: 600,000 shares at 11:00 compared with a matched prior-session 11:00 average of 200,000 yields 3.0× relative volume. This does not demonstrate how many shares are offered at the current bid.',
 'What does a 3.0× matched-time volume ratio show, and what does it fail to show?',
 'It shows three times the specified historical benchmark by that cutoff, but not a probability, available depth, catalyst quality or order fill.',
 'Historical lookbacks can include split changes, exceptional events and different sessions.',
 'Original volume-analysis synthesis',SEC),
 T('spread-depth','indicators','Bid, ask, spread, Level II and Time & Sales',
 'The bid is a displayed buying quotation and the ask a displayed selling quotation. Spread = ask minus bid. Level II shows selected displayed quotes and depth by venue/source, while Time & Sales shows reported trades; neither reveals every hidden order or guarantees that displayed quantity remains available.',
 'The last trade is a backward-looking execution, not the price at which the next market order must fill.',
 ['Observe bid, ask, quoted size and time.','Compute the dollar spread and percentage of a reference midpoint.','Distinguish trade prints from quotes and broker-confirmed fills.','Stress-test how rapidly displayed depth might change.'],
 'FICTIONAL: bid $4.95, ask $5.05, midpoint $5.00. Spread is $0.10 or 2% of midpoint. A theoretical round trip across those quotes costs about $0.10/share before fees and price movement.',
 'Why could buying 500 shares be more expensive than simply paying 500 × the displayed ask?',
 'Only limited shares may be available at that ask; later shares could require higher prices, or the quote may change before execution.',
 'Tape colors and quote flags vary by platform. They are not proof of market participant intent.',
 'SEC order and execution reference',ORDERS),
 T('indicator-conflict','indicators','Indicators as context, not votes or predictions',
 'VWAP, moving averages, RSI and support/resistance may overlap or contradict each other because they summarize different transformations of past data. Adding many correlated indicators does not create independent evidence. A signal can look precise and still fail out of sample.',
 'Counting five indicators as five independent confirmations can exaggerate confidence when all are driven by the same closing-price history.',
 ['Identify the raw measurements each indicator uses.','Separate observations from predictions or preferred narratives.','Look for contradictory volume, price structure and risk evidence.','Test one additional indicator at a time with timestamped independent cases.'],
 'FICTIONAL: EMA 9 and EMA 20 turn upward, yet price remains beneath a session VWAP and fails twice at a prior high. The completed-bar evidence conflicts, so WATCH or NO TRADE is a defensible decision.',
 'Why does agreement among two moving averages not automatically outweigh the VWAP and resistance conflict?',
 'The averages are related measures of past prices; their agreement is not independent proof, and the conflict matters for the hypothesis.',
 'Neither a scanner label nor a technical indicator establishes a verified winning probability.',
 'Original indicator-critical-thinking synthesis',SEC),

 T('breakout','patterns','Breakouts, confirmation and failed acceptance',
 'A breakout hypothesis says price has moved beyond a defined reference area and may continue. A failure hypothesis concerns price returning through that reference rather than accepting the higher/lower region. A temporary wick beyond a level is not equivalent to sustained trading above it.',
 'A trader needs a prewritten observation and invalidation rule; otherwise any move can be described afterward as successful or failed.',
 ['Record the level from only the available historical bars.','Define confirmation using completed bars, volumes and time.','Define what would invalidate the setup and when it becomes a failed breakout.','Practice a NO TRADE decision when evidence is incomplete.'],
 'FICTIONAL: resistance is $8.00. A bar prints $8.15 but closes $7.92 on weak relative volume; the next closes $7.80. Calling the initial $8.15 a confirmed continuing breakout would rely on a single high print.',
 'What observable facts undermine the breakout hypothesis in this case?',
 'The first bar failed to close above $8.00 and subsequent closing prices fell; the given volume context also weakens any continuation claim.',
 'No pattern is reliable by name alone. Label historical outcomes only after the decision point.',
 'Original breakout/failure research synthesis',SEC),
 T('pullback','patterns','Pullbacks, consolidation and continuation uncertainty',
 'A pullback is an observable move against the prior direction. Consolidation is a period of relatively contained price movement under a stated measurement window. Either may precede continuation, reversal or more sideways action. A low-volume pullback can be informative only when compared with an appropriate volume benchmark.',
 'Not every decline after a rise is an attractive dip; structural invalidation and available liquidity remain decisive.',
 ['Define the impulse leg and its actual completed-bar boundaries.','Measure pullback size and compare session volume.','Mark higher-timeframe levels and possible invalidation.','Prepare continuation, failure and no-trade outcomes before seeing later bars.'],
 'FICTIONAL: price rises from $4.00 to $5.00 and retreats to $4.70. The $0.30 retreat is 30% of the $1.00 impulse, not a 30% decline in share price; volume and later structure remain unknown.',
 'Why is “30% pullback” ambiguous unless the measurement basis is stated?',
 'It can mean 30% of the prior impulse or a 30% decline from the peak, which are different numbers. Here it is 30% of the dollar impulse.',
 'Do not label a pullback safe because it touched an EMA or previous level.',
 'Original pullback-method synthesis',SEC),
 T('dip-rip','patterns','Dip-and-rip as a hypothesis, not a recommendation',
 '“Dip-and-rip” is a trader-defined name for an early decline followed by a stronger recovery. The label has no standardized exchange definition. It requires explicit rules for a meaningful dip, reversal confirmation, time window and invalidation; a subsequent recovery cannot be assumed when the dip first appears.',
 'Historical chart hindsight makes a successful rebound look obvious when the earlier, incomplete sequence did not reveal it.',
 ['State what initial price decline qualifies as a dip.','Require an observable recovery condition using completed bars.','Check liquidity, source quality and chase distance.','Identify what failure and NO TRADE would look like before testing.'],
 'FICTIONAL: a $6.00 open falls to $5.40 and later recovers to $6.10. The full chart shows a rebound, but a learner paused at $5.40 cannot know the $6.10 outcome.',
 'At the $5.40 pause, what information is still missing before declaring that a dip-and-rip has occurred?',
 'The future recovery is unavailable. One can describe the dip, set a conditional recovery test, and choose WAIT or NO TRADE.',
 'The pattern name is research vocabulary, not a statistically validated edge or guaranteed reversion.',
 'Source-inspired setup description rewritten as original education',SEC),
 T('vwap-hod','patterns','VWAP holds and high-of-day references',
 'A VWAP hold refers to observed prices remaining near or above a defined VWAP reference under the trader’s criteria. High of day (HOD) is the maximum traded price reached so far in the defined session; it changes when a new high occurs. A HOD break must use the HOD known before the candidate break, not the final day’s maximum.',
 'Using the eventual HOD in an early-day analysis leaks future information and makes a replay exercise invalid.',
 ['Fix the research timestamp and chart session.','Compute or display VWAP using only available observations.','Identify the HOD reached as of that timestamp.','Specify an entry scenario, price risk, failure scenario and no-trade alternative.'],
 'FICTIONAL: by 13:30 the HOD is $7.20 and price is $7.05 near VWAP $7.00. A 14:00 bar later prints $7.35, but that future price must stay hidden in a 13:30 replay.',
 'Why would labeling $7.35 as the 13:30 HOD be an invalid historical decision exercise?',
 'Because that price did not exist among the revealed observations at 13:30. The known HOD was $7.20.',
 'Holding a VWAP line is neither a guaranteed support test nor proof of afternoon continuation.',
 'Original session-specific pattern synthesis',SEC),

 T('news-chronology','company','News, filing and price-reaction chronology',
 'A source publication timestamp, the time a researcher first saw the news, and the time of any observed price response are three different timestamps. An issuer release is not automatically an independently verified financial fact or an explanation for every subsequent candle. Evidence should be tied to its original publication and known-at-time status.',
 'Confusing event time with chart observation time can produce hindsight leakage and false causal attribution.',
 ['Find the original issuer or SEC disclosure and record its publication time and timezone.','Separate headline claim from primary supporting facts and uncertainty.','Compare only candles available after the source became public.','List competing explanations and missing data before labeling a catalyst.'],
 'FICTIONAL: an issuer posts an announcement at 10:12 ET; candles up to 10:10 ET belong to the pre-announcement interval. A 10:15 candle may overlap the release but does not prove the release caused its entire high-low range.',
 'Why should a 10:10 candle never be labeled a reaction to a 10:12 release?',
 'Its interval predates the stated public release. Later price coincidence cannot establish sole causation.',
 'Source timestamps may be corrected or delayed. Historical exercise provenance needs explicit review.',
 'SEC company filing research',FILINGS),
 T('edgar-filings','company','SEC EDGAR: 10-K, 10-Q and 8-K research',
 'An annual 10-K contains extensive business, risk and audited-financial information for many U.S. issuers. A 10-Q supplies periodic quarterly updates, while an 8-K reports specified current events. These are distinct from promotional press releases. Filings carry dates, periods and issuer identities that must match the security researched.',
 'A large headline contract or earnings claim may be incomplete without the filing’s contingencies, obligations and share-count context.',
 ['Verify the exact legal issuer and ticker history.','Locate its original 10-K, 10-Q or 8-K on EDGAR.','Read relevant risks, MD&A, financial statements and event exhibits.','Record the filing time and what remained unresolved.'],
 'FICTIONAL: a release claims a $40 million prospective agreement, but an attached disclosure states performance milestones and termination conditions. The headline is not the same as $40 million collected revenue.',
 'How does a contractual maximum differ from recognized revenue and cash received?',
 'A possible contract value is contingent and forward-looking; recognized revenue follows applicable accounting and performed obligations.',
 'Not all issuers use identical forms. An SEC filing is a primary source, not SEC endorsement of its accuracy.',
 'SEC EDGAR investor guide',FILINGS),
 T('float-supply','company','Float, shares outstanding, dilution and turnover',
 'Shares outstanding measure issued shares under the stated accounting definition; float is a separate estimate of shares typically available for public trading. Float turnover divides share volume by a specified float, but one share can trade multiple times. Offerings, warrants, splits and conversions can change supply or the share-price scale.',
 'A small float estimate and large volume do not by themselves establish who owns the shares, a short squeeze or a future price direction.',
 ['Find the share-count date and source.','Separate float from outstanding and authorized shares.','Compute volume ÷ sourced float as a descriptive turnover ratio.','Review offerings, splits, shelf registrations and later disclosure changes.'],
 'FICTIONAL: daily volume is 12 million shares and a dated float estimate is 3 million. Reported turnover = 4.0×. This does not mean 12 million unique shares or buyers, because shares may change hands repeatedly.',
 'Why is four-times reported float turnover not evidence that four times as many distinct shares exist?',
 'The same share can be traded repeatedly. The float estimate itself can also be incomplete or stale.',
 'Corporate action adjustments and vendor float methodology must be documented.',
 'SEC corporate filing research',FILINGS),
 T('financial-statements','company','Revenue, earnings, cash flow and valuation context',
 'Revenue is not net income; earnings per share (EPS) uses an explicitly stated numerator and share denominator. Operating cash flow differs from accounting net income. P/E is price divided by comparable EPS when meaningful. A rapidly changing share count, negative EPS or mismatched reporting periods can make simplistic ratios unsuitable.',
 'A headline about revenue growth should be checked against expenses, working capital, financing and actual share dilution.',
 ['Record reporting date, period, units and currency.','Separate revenue, profit, cash flows, outstanding shares and forecasts.','Calculate ratios only when denominators are comparable and meaningful.','Compare with an appropriate period or peer while recording limitations.'],
 'FICTIONAL: price is $24, trailing EPS $2.00, so simple P/E = 12. Revenue increases by 20% while net income decreases by 10%; neither statistic alone proves a positive investment result.',
 'What is the simple P/E, and why is higher revenue not synonymous with higher earnings?',
 'P/E is 12; profit also reflects expenses and other accounting items, which can grow faster than sales.',
 'Negative or zero EPS makes a conventional positive P/E interpretation inappropriate.',
 'SEC annual-report reading guide',FILINGS),

 T('research-watchlist','research','Watchlists as evolving research records',
 'A research watchlist is not a list of buy instructions. Each candidate should have a dated reason for discovery, primary source, observable chart state, unresolved issues and a next-review trigger. Candidate labels such as DISCOVERY, WATCH, READY, INVALID and NO TRADE document a changing research state, not certainty.',
 'A watchlist becomes useful when it preserves why a candidate was considered, why it was rejected and what evidence was available at the time.',
 ['Record identifier, market, watchlist date and discovery trigger.','Separate facts, member interpretation and contradictions.','Define an event-driven reason to revisit or invalidate.','Preserve earlier snapshots rather than rewriting history after outcomes.'],
 'FICTIONAL: ABCD is on WATCH after a sourced filing, but its spread is $0.18 on a $3.00 midpoint (6%). The member marks NO TRADE and records the spread rather than forcing a plan.',
 'Why can NO TRADE represent a documented research decision rather than a failure?',
 'The candidate had identifiable execution uncertainty. Recording the reason improves discipline without claiming a future result.',
 'Actual membership limits and private record permissions are enforced by existing watchlist services, not these lessons.',
 'Original watchlist workflow synthesis',SEC),
 T('scanners','research','Scanners, filters and false positives',
 'A scanner evaluates explicit rules over a defined dataset. A result is a candidate satisfying those rules at a timestamp, not an independently validated trade. Exchange, float, volume, price change, market session and missing data all influence what appears. Filters can select historical winners while hiding all unsuccessful matches.',
 'A rank or signal is easy to overinterpret if the selection criteria, denominators and rejected results are not recorded.',
 ['Write each threshold and its unit before observing outputs.','Identify provider, update lag and missing data.','Preserve all triggered candidates, not only subsequent runners.','Review how many matches were invalidated and why.'],
 'FICTIONAL: a filter flags 18 securities after volume increases. Three later rise and 15 do not meet the plan trigger. Reporting “three winners” without the 18-candidate denominator exaggerates the evidence.',
 'What denominator should be disclosed when discussing results of this 18-match scan?',
 'The full eligible match set of 18, with specified outcome definitions, time window, incomplete data and exclusions.',
 'A filtering rule is not a probability forecast; do not infer predictive edge from selected examples.',
 'Original scanner-research synthesis',SEC),
 T('sector-context','research','Sector activity, peer comparison and former runners',
 'Sector associations, related-company moves and historical large-range days can suggest topics for investigation. Former runner is a descriptive history label, not a verified repeatability characteristic. Correlated moves may share a catalyst, benchmark, liquidity regime or unrelated coincidence.',
 'A company can move with peers even if its business exposure differs materially from the headline theme.',
 ['Define how the sector group was selected.','Confirm issuer business and original news source.','Compare price, volume and time across the same session and units.','Record alternative explanations and why no comparison may be appropriate.'],
 'FICTIONAL: one battery-related issuer releases earnings and three peers rise. Without peer-specific news and liquidity checks, the shared rise does not prove each peer has the same financial catalyst.',
 'What evidence would distinguish a genuine peer catalyst from simple category association?',
 'Issuer-specific disclosures, business exposures, timestamps and independent volume/price context can support a narrower explanation.',
 'Past large moves are not evidence of a statistically validated future recurrence.',
 'Original sector-research synthesis',FILINGS),
 T('research-evidence','research','Facts, inferences, contradictions and missing information',
 'Research quality depends on classifying each statement: directly observed measurement, sourced issuer statement, member inference, hypothesis or unanswered question. A primary-source headline does not establish future earnings or executable liquidity. The best analysis also records evidence that would contradict the favored explanation.',
 'Strong-sounding narratives can make an unsupported decision feel inevitable unless the negative case is written down first.',
 ['Write what is known and cite when it became public.','Label conclusions as interpretation instead of fact.','Identify at least one contradiction or missing observation.','Choose PLAN, WATCH, REJECT or NO TRADE without relying on outcome hindsight.'],
 'FICTIONAL: company news references a partnership, but the agreement size and start date are unspecified. “Partnership announced” is sourced; “revenue will double” is an unsupported inference.',
 'How should a learner distinguish the press-release fact from the forecast in this example?',
 'Record the announcement as a dated claim with source. Mark doubling of revenue as unverified and avoid inventing probability or timing.',
 'External news/filing feeds need authorization and provenance before any automatic website integration.',
 'Original evidence-literacy synthesis',FILINGS),

 T('risk-sizing','risk','Risk per share, position size and exposure limits',
 'For a hypothetical long scenario, planned price risk per share = entry minus stop reference, provided the stop is below entry. The mathematical whole-share risk cap is floor(risk budget ÷ per-share distance). An optional cash-capital limit may reduce it. A stop reference is not a guaranteed fill or a hard ceiling on loss.',
 'Mathematical sizing is only a model: slippage, halts, gaps, fees, liquidity and concentration can make actual results very different.',
 ['Identify direction, entry, invalidation and intended order mechanism.','Measure positive stop distance in dollars per share.','Divide the independently chosen budget by the distance and round down.','Check capital, exposure, liquidity and loss in an adverse-fill scenario.'],
 'FICTIONAL long: entry $5.00, stop reference $4.80, budget $25. Distance $0.20; pure mathematical cap floor($25/$0.20) = 125 shares. The site’s conservative one-share classroom reserve yields 124 shares, modeled loss $24.80 and position cost $620.',
 'What is the difference between the mathematical cap and the conservative classroom quantity?',
 '125 is the pure budget/distance maximum; 124 is the explicitly chosen one-share reserve. Neither guarantees that a real stop can fill at $4.80.',
 'Short selling adds borrow availability, financing and potentially uncapped losses; those are not solved by this simple equation.',
 'SEC stop-order bulletin',STOP),
 T('order-risk','risk','Stop, stop-limit, trailing and partial fills',
 'A market order prioritizes attempting execution without specifying a firm price. A limit controls the maximum buy/minimum sell price but can remain unfilled. A triggered stop generally becomes a market order and can fill worse than its trigger; a stop-limit adds a price constraint and may fail to fill. Trailing-stop triggers change under broker-specific rules.',
 'A trader can be correct about the proposed price boundary and still lose more than modeled if markets gap or displayed liquidity disappears.',
 ['Define the broker order type rather than using “stop” loosely.','Specify the intended trigger and any limit or time-in-force.','Model fast gaps, rejected/partial fills and stale quotes.','Verify actual broker execution details if studying a real account record.'],
 'FICTIONAL: long entry $10 with a sell stop at $9.50. A gap from $9.70 to a $9.10 next available market may yield an execution around $9.10 or worse, not necessarily $9.50. A stop-limit may remain unfilled.',
 'Does a sell stop at $9.50 guarantee no worse execution, and what trade-off does a stop-limit add?',
 'No. A stop can execute below the trigger; a stop-limit constrains price but risks no execution and continued adverse exposure.',
 'Broker activation criteria, extended sessions and conditional-order behavior vary.',
 'SEC stop and trailing order bulletin',STOP),
 T('spread-slippage','risk','Spread, slippage, gaps and scenario stress',
 'A spread is the difference between quoted ask and bid. Slippage is a difference between intended and actual execution price, which can be favorable or adverse. A gap skips intermediate prices between observed trading periods. Scenario analysis adds adverse execution assumptions to modeled price risk without pretending those assumptions bound the worst loss.',
 'In fast-moving or illiquid securities, a carefully calculated stop distance can understate plausible execution costs.',
 ['Record the current bid/ask source and time.','Model spread cost separately from stop-distance price risk.','Add a clearly hypothetical slippage and gap stress per share.','Explain how a stressed loss differs from the intended risk budget.'],
 'FICTIONAL: 100 shares have a $0.20 stop-distance model ($20 loss). Add adverse spread $0.03, slippage $0.05 and gap $0.12 per share: stressed loss = 100×($0.20+$0.03+$0.05+$0.12) = $40 before fees.',
 'Why can a $20 nominal stop-distance model correspond to $40 in the stated stress case?',
 'The stress adds $0.20 per share beyond nominal risk, producing a total modeled $0.40 per share for 100 shares.',
 'Scenario assumptions are not forecast distributions or guaranteed bounds.',
 'SEC order-types reference',ORDERS),
 T('plan-no-trade','risk','Conditional plans, invalidation and NO TRADE',
 'A trading plan is a conditional statement describing the evidence that would justify further consideration, the entry condition, risk reference, objectives, alternative and cancellation triggers. WATCH and NO TRADE are legitimate outcomes. A plan should exist before a hypothetical execution rather than being rewritten to explain an outcome.',
 'A good process separates decision quality from the P&L that happens afterward; forcing participation can introduce preventable risk.',
 ['Define ticker, thesis, data sources and time.','Write observable if/then entry and invalidation rules.','Model risk and reasons to cancel or wait.','Record the decision before revealing later bars, then review independently.'],
 'FICTIONAL: a candidate has strong volume but an uncertain issuer claim, a $0.25 spread and no clean invalidation. The member writes NO TRADE; a later price rise does not prove the earlier decision was defective.',
 'How can an apparently missed profit coexist with a sound NO TRADE decision?',
 'The decision is evaluated against known evidence, risk and the written plan at that time, not selected hindsight.',
 'This site teaches an educational decision method, not individualized recommendations.',
 'Original planning and NO TRADE synthesis',SEC)
]);
const linkByCategory=Object.freeze({
 chart:[['Chart Studio practice','simulator.html?practice=free'],['Related Labs','labs.html']],
 indicators:[['Chart Studio practice','simulator.html?practice=free'],['Learn about the Labs','labs.html']],
 patterns:[['Historical replay practice','verified-replay.html?scope=fictional'],['Related Labs','labs.html']],
 company:[['Free Research Watchlist','free-watchlist.html'],['Market Tutor','market-tutor.html']],
 research:[['Free Research Watchlist','free-watchlist.html'],['Advanced Workbench','advanced-tool.html?tool=WATCHLIST_WORKBENCH']],
 risk:[['Trade-Plan Workbench','advanced-tool.html?tool=WATCHLIST_WORKBENCH'],['Trading Journal','journal.html']]
});
function n(tag,txt,cl){const x=document.createElement(tag);if(txt!==undefined)x.textContent=String(txt);if(cl)x.className=cl;return x}
function render(){
 const target=document.getElementById('knowledge-expansion'),core=document.getElementById('academy-free-knowledge');
 if(!target||!core)return;
 const searchBar=n('div',undefined,'kd-searchbar');
 const label=n('label','Search all Stock Market Foundations topics');label.htmlFor='kd-search';
 const search=n('input');search.id='kd-search';search.type='search';search.placeholder='Try VWAP, float, candles, earnings, slippage, watchlist…';
 const summary=n('p','', 'kd-search-summary');summary.setAttribute('role','status');summary.setAttribute('aria-live','polite');
 const categories=n('div',undefined,'kd-categorybar');categories.setAttribute('role','group');categories.setAttribute('aria-label','Filter database categories');
 const types=[['all','All topics'],['core','12 Foundation Essentials'],...Object.entries(categoryNames)];
 const buttons=[];
 for(const [key,name] of types){const button=n('button',name,'kd-filter');button.type='button';button.dataset.category=key;
  button.setAttribute('aria-pressed',String(key==='all'));categories.append(button);buttons.push(button);}
 searchBar.append(label,search,categories,summary);
 core.parentNode.insertBefore(searchBar,core);
 const top=n('div',undefined,'kd-expansion-head');
 const eyebrow=n('p','DEEP-DIVE REFERENCE · UNGRADED · INCLUDED','kd-eyebrow');
 const heading=n('h2','Research, chart interpretation and disciplined decision-making','kd-title');
 heading.id='kd-deep-dive-title';
 // Use title-local declarations to protect size and centering from the
 // later-loaded sitewide typography rules, without changing lesson headings.
 heading.style.setProperty('font-size','clamp(1.45rem,1.95vw,2.1rem)','important');
 heading.style.setProperty('font-weight','760','important');
 heading.style.setProperty('line-height','1.24','important');
 heading.style.setProperty('text-align','center','important');
 heading.style.setProperty('margin','10px auto 0','important');
 heading.style.setProperty('color','#e5f5fc','important');
 heading.style.setProperty('-webkit-text-fill-color','#e5f5fc','important');
 heading.style.setProperty('background','none','important');
 const accent=n('span',undefined,'kd-title-accent');
 accent.setAttribute('aria-hidden','true');
 const intro=n('p','Twenty-six additional original reference lessons connect the Foundations to research watchlists, Chart Studio, Market Tutor, historical replay and trade planning. All examples are fictional; a named trading pattern is not a validated predictive signal.','kd-deep-dive-intro');
 top.append(eyebrow,heading,accent,intro);
 target.append(top);
 const groups=new Map();
 for(const [key,name] of Object.entries(categoryNames)){
  const section=n('section',undefined,'kd-topic-group');section.dataset.category=key;
  section.append(n('h3',name));const body=n('div',undefined,'kd-card-list');section.append(body);target.append(section);groups.set(key,{section,body});
 }
 for(const [index,t] of entries.entries()){
  const details=n('details',undefined,'kd-article');details.dataset.search=(t.title+' '+t.definition+' '+t.category+' '+t.why+' '+t.caseStudy).toLowerCase();
  details.id='knowledge-'+t.id;
  details.append(n('summary',String(index+13).padStart(2,'0')+' · '+t.title));
  const content=n('div',undefined,'kd-article-body');
  const status=n('p','Original educational synthesis · Research heuristic does not imply verified predictive power','kd-status');
  content.append(status,n('h4','What this means'),n('p',t.definition),n('h4','Why this matters'),n('p',t.why),n('h4','Talia’s step-by-step method'));
  const ol=n('ol');for(const x of t.steps)ol.append(n('li',x));content.append(ol);
  content.append(n('h4','Worked fictional example'),n('p',t.caseStudy),
   n('h4','What this cannot prove'),n('p',t.limits),
   n('h4','Practice independently'),n('p',t.challenge));
  const field=n('label','Explain your decision in your own words (ungated help is below)');const textarea=n('textarea');
  textarea.rows=4;textarea.maxLength=1600;field.append(textarea);content.append(field);
  const tools=n('div',undefined,'kd-actions');
  const explain=n('button','Explain this concept','btn secondary');explain.type='button';
  const depth=n('button','Teach this in more depth','btn secondary');depth.type='button';
  const compare=n('button','Compare my reasoning','btn');compare.type='button';compare.disabled=true;
  const feedback=n('div',undefined,'kd-feedback');feedback.hidden=true;feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  explain.addEventListener('click',()=>{feedback.hidden=false;feedback.textContent=t.definition+' '+t.why});
  depth.addEventListener('click',()=>{feedback.hidden=false;feedback.textContent=t.steps.join(' ')+' Worked example: '+t.caseStudy+' Limitation: '+t.limits});
  textarea.addEventListener('input',()=>{compare.disabled=textarea.value.trim().length<25;feedback.hidden=true});
  compare.addEventListener('click',()=>{if(compare.disabled)return;feedback.hidden=false;feedback.textContent='Talia’s comparison: '+t.review+' Common limitation: '+t.limits+' No answer or grade was saved.'});
  tools.append(explain,depth,compare);content.append(tools,feedback);
  const related=n('div',undefined,'kd-related');
  const provenance=n('p','Research framing: '+t.source+'. Source primer is general educational context, not independent proof of this pattern or its effectiveness.','kd-status');
  const source=n('a','Open public source primer');source.href=t.link;source.target='_blank';source.rel='noopener noreferrer';
  related.append(provenance,source);
  for(const [name,url] of linkByCategory[t.category]){
   const a=n('a',name);a.href=url;related.append(a);
  }
  content.append(related,n('p','No real orders, member grades, chart-data licensing, winning probabilities or actual fills are created by this ungraded reference.','kd-boundary'));
  details.append(content);groups.get(t.category).body.append(details);
 }
 let selected='all';
 const coreItems=[...core.querySelectorAll('details.gu-free-reference-topic')];
 const allAdvanced=[...target.querySelectorAll('details.kd-article')];
 // Filtering uses visible text and category; never sends searches to third parties.
 function apply(){
  const term=search.value.trim().toLowerCase();let count=0;
  const coreAllowed=(selected==='all'||selected==='core');
  for(const el of coreItems){
   const visible=coreAllowed&&(!term||el.textContent.toLowerCase().includes(term));
   el.hidden=!visible;if(!visible)el.open=false;if(visible)count++;
  }
  core.hidden=!coreItems.some(el=>!el.hidden);
  for(const [key,group] of groups){
   let nVisible=0;
   for(const el of group.body.children){
    const visible=(selected==='all'||selected===key)&&(!term||el.dataset.search.includes(term));
    el.hidden=!visible;if(!visible)el.open=false;if(visible){count++;nVisible++}
   }
   group.section.hidden=nVisible===0;
  }
  top.hidden=!allAdvanced.some(el=>!el.hidden);
  summary.textContent=count+' reference '+(count===1?'topic':'topics')+' shown of '+(12+entries.length)+'. Education and self-checks remain free.';
 }
 search.addEventListener('input',apply);
 for(const btn of buttons)btn.addEventListener('click',()=>{
  selected=btn.dataset.category;
  for(const b of buttons)b.setAttribute('aria-pressed',String(b===btn));
  apply();
 });
 // Support a direct link to either a core or a deep-dive topic without bypassing filters.
 const id=decodeURIComponent((root.location?.hash||'').slice(1));
 if(id&&(id.startsWith('knowledge-')||id.startsWith('free-topic-'))){
  const node=document.getElementById(id);
  if(node?.tagName==='DETAILS'){selected='all';node.open=true}
 }
 apply();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
root.GroundUpKnowledgeDatabaseV2=Object.freeze({entries,categoryNames,SOURCES,version:'2.0'});
})(typeof window==='undefined'?globalThis:window);
