/* Free Foundations Phase A supplemental teaching. Public, fictional, ungraded;
 * not a protected answer bank or an investment recommendation.
 * Day indexes correspond to the existing five Free Foundations lessons.
 */
export const phaseAFreeFoundations=Object.freeze([
 {day:1,terms:[
  ['Share','A unit of corporation ownership; specific share classes can have different rights.'],
  ['Ticker','An identifier for a security, not proof of the legal issuer on its own.'],
  ['Quote','A time-dependent bid or offer with displayed size, not a completed trade.'],
  ['Execution','An actually matched order supported by a broker transaction record.']],
 steps:[
  'Begin with fictional Harbor Learning Tools and its hypothetical 1,000,000 outstanding shares. This is a share count, not its available cash.',
  'Divide the learner’s fictional 100 shares by 1,000,000 outstanding shares and multiply by 100: the result is 0.01% of issued shares in this simplified one-class example.',
  'A last trade at $10.00 records a past transaction; it does not tell you the current ask, displayed size, or future execution price.',
  'Before making any decision, label ownership facts separately from historical trades, live quotations, unknown liquidity and any unexecuted order.'],
 corrections:[
  {name:'I thought the last price guaranteed my fill',why:'The displayed last price reports an earlier transaction, not an offer to execute a new order.',how:'Compare the last trade, timestamped bid/ask and actual broker execution as three separate pieces of evidence.',case:'FICTIONAL: last trade $8.00; later ask $8.12 for 30 shares. Can a new 100-share order be guaranteed at $8.00 or $8.12?',review:'No. The earlier $8.00 execution is historical, and the later ask displays only 30 shares that may change. No new fill is established.'},
  {name:'I treated market capitalization as company cash',why:'Price times outstanding shares produces a simplified valuation figure, not the cash balance on the issuer’s financial statements.',how:'Calculate equity market value separately from reported cash, and verify the share count basis and financial-report date.',case:'FICTIONAL: 500,000 shares at $4.00 imply $2 million market capitalization. Does that prove $2 million cash?',review:'No. The figure is simple price times shares; cash must be supported by the issuer’s dated financial disclosures.'}]},
 {day:2,terms:[
  ['OHLC','Open, high, low and close measured within one specified candle interval.'],
  ['Real body','The absolute difference between open and close, always a nonnegative length.'],
  ['Full range','High minus low, encompassing the body and both wicks.'],
  ['Body percentage','Body divided by full range times 100; undefined when range is zero.']],
 steps:[
  'Label the FICTIONAL five-minute candle: Open $20.00, High $21.50, Low $19.50, Close $21.00. Check all four labels before using chart color.',
  'Real body = absolute value of (21.00 minus 20.00) = $1.00. It is bullish because close is above open, not because the next candle is predictable.',
  'Full range = 21.50 minus 19.50 = $2.00; upper wick $0.50, lower wick $0.50. Confirm $0.50 + $1.00 + $0.50 = $2.00.',
  'Body percentage = $1.00 / $2.00 times 100 = 50%. Always check the denominator first; if high equals low, the percentage is undefined.'],
 corrections:[
  {name:'I used high minus low for the body',why:'High minus low includes the wicks and therefore calculates the full range, not the open-to-close distance.',how:'Mark open and close, use the absolute difference for body, then compute high minus low separately.',case:'FICTIONAL bearish OHLC: Open $14, High $14.50, Low $12.50, Close $13. What are body and range?',review:'Body $1.00; range $2.00. Upper and lower wicks each measure $0.50, so the parts reconcile.'},
  {name:'I used the green candle to predict the next candle',why:'OHLC describes the completed interval; it cannot reveal an unseen future candle or establish a fill.',how:'State the completed observation, then separately identify the information that remains unknown.',case:'FICTIONAL: a completed candle closes above its open, but the next bar is hidden. What can you know?',review:'You can identify prior OHLC and its direction; not the next direction, order fill, or cause of movement.'},
  {name:'I called a zero-range candle 0% body',why:'Zero divided by zero is undefined, not zero percent.',how:'Check high minus low before dividing. If it is zero, report undefined rather than guessing.',case:'FICTIONAL: Open = High = Low = Close = $25. What is body percentage?',review:'Body and range both equal zero, so the ratio is undefined. Equal open/close with a positive range is different and does yield 0%.'}]},
 {day:3,terms:[
  ['Primary source','An original identifiable issuer or regulatory record supporting a specific statement.'],
  ['Reporting period','The measured accounting period, different from the document publication date.'],
  ['Decision pause','The point in time used to exclude information that was not yet available.'],
  ['Corroboration','Independent support; repeating a rumor is not independent proof.']],
 steps:[
  'Write the exact FICTIONAL claim that Harbor Learning doubled sales. Identify which accounting measure and comparator period would make the assertion meaningful.',
  'Set a decision pause at 08:12 ET. A later newsletter published at 08:17 and screenshot stamped 08:21 cannot justify the 08:12 decision.',
  'Verify an original issuer document: legal entity, exact wording, reporting period, public availability, time zone, and whether a number is historical or guidance.',
  'Classify the supported and unresolved claims and specify alternative interpretations. With missing primary records or unreliable chronology, select NO TRADE.'],
 corrections:[
  {name:'I used future evidence at an earlier decision pause',why:'A later-publication screenshot or repost was not available at the earlier timestamp.',how:'Build separate columns for evidence independently available by the pause and evidence available only later or with unknown timing.',case:'FICTIONAL: decision 08:10 ET, issuer item 08:00, repost 08:14, screenshot 08:22. Which can qualify?',review:'Only the issuer item, if its actual public availability by 08:10 is verified. The later repost and screenshot cannot qualify.'},
  {name:'I confused filing date with the reporting period',why:'An earnings filing submitted today can describe a prior quarter rather than today’s business results.',how:'Record form, issuer, publication and public-availability time, the financial period, units, and historical versus projected status.',case:'FICTIONAL: a filing published in May reports January–March revenue. Was that revenue earned in May?',review:'No. May is publication timing, while January–March is the reporting period.'}]},
 {day:4,terms:[
  ['Watchlist','A list of research interests, not an order queue or recommendation.'],
  ['Scanner','A filter based on inputs that may be incomplete or stale, not a news verifier.'],
  ['Invalidation','A stated condition under which a research decision should be reconsidered.'],
  ['Source status','An explicit label such as fictional, primary-source verified, or unverified.']],
 steps:[
  'Write one learning purpose for a watchlist, such as reviewing a FICTIONAL five-minute price sequence without predicting future bars.',
  'For each candidate, record its source status, observation date and session, and whether the data were fictional or independently sourced.',
  'Separate WATCH, VERIFY MORE and NO TRADE. A scanner rank or viral claim does not supply a verified catalyst, current executable price or reason to buy.',
  'Document missing information, a next review time and an objective removal condition. Adding an item never submits an order.'],
 corrections:[
  {name:'I treated adding a watchlist symbol as buying advice',why:'A watchlist organizes research but does not validate quality, timing, liquidity or the member’s circumstances.',how:'For each item write a research purpose, missing evidence, next check and a reason to remove it.',case:'FICTIONAL: dated issuer announcement, but no verified bid/ask or liquidity. Does this establish a buy?',review:'No. Keep any research conditional or choose NO TRADE while execution-relevant data are missing.'},
  {name:'I assumed the scanner had verified social news',why:'Filtering on price or volume is not independent confirmation of a source claim.',how:'Check legal issuer identity, original dated disclosure, observation timestamp, and the filter’s feed coverage.',case:'FICTIONAL: scanner finds ABCX, but the alleged catalyst is an anonymous repost. Is the catalyst verified?',review:'No. It remains unverified until an original source and its timing are established.'}]},
 {day:5,terms:[
  ['Planned per-share risk','The assumed entry-to-invalidation price difference, not a guaranteed outcome.'],
  ['Notional exposure','Share quantity multiplied by assumed entry price, separate from planned loss.'],
  ['Slippage','A difference between the expected and actual execution price.'],
  ['No-trade decision','A decision not to act when evidence, execution or loss constraints are inadequate.']],
 steps:[
  'Label the FICTIONAL assumptions: entry $10.00, protective reference $9.80, and planned-loss budget $20. No broker order is entered.',
  'Per-share planned risk = $10.00 minus $9.80 = $0.20. The simple whole-share quantity is floor(20 / 0.20) = 100.',
  'Notional exposure is 100 times $10.00 = $1,000. Neither this capital figure nor the $20 planned price gap establishes what a trade would actually lose.',
  'Discuss quoted spread, possible slippage, gaps, fees, partial fills and halts. Missing evidence supports NO TRADE, not an assumption of ideal execution.'],
 corrections:[
  {name:'I thought the stop guaranteed my $20 maximum loss',why:'A stop reference is not a guaranteed execution; gaps, slippage and fees can increase losses.',how:'Distinguish the planned stop price and quantity from an actual broker-confirmed execution and realized result.',case:'FICTIONAL: 100 shares bought at $10, stop reference $9.80, actual exit $9.65. What is price-distance loss?',review:'The illustrative price difference is $0.35 per share, or $35 total before costs, not the planned $20.'},
  {name:'I thought a $20 risk budget meant $20 needed for shares',why:'Planned price risk and notional cost are different amounts; account and buying-power constraints add further considerations.',how:'Compute per-share risk, whole-share quantity and notional capital separately, and state what remains uncertain.',case:'FICTIONAL: $18 assumed entry, $17.70 risk reference, $30 planned budget. What quantity and exposure result?',review:'Price gap $0.30; floor(30 / 0.30) = 100 shares and notional exposure = $1,800. Neither guarantees actual loss.'}]}
].map((x,i)=>{if(x.day!==i+1||x.terms.length!==4||x.steps.length!==4||x.corrections.length<2)throw Error('Free Phase A curriculum mismatch');return Object.freeze(x);}));
