/* Five additive, ungraded Free Foundations lessons. Use the existing Academy
 * authenticated reflection service and v3.x guided instructor.
 * Nothing here is an official assessment key, licensed market dataset or
 * membership entitlement. All numerical cases are explicitly FICTIONAL.
 */
export const freeFoundationsV1=Object.freeze([
 Object.freeze({
  title:'What is a stock, and what does the market do?',
  objective:'Explain the difference between a share of ownership, a stock quote, and a request to buy or sell.',
  observe:'Find the issuer name, trading symbol, price timestamp, market session and whether a number is a quote or an executed price.',
  practice:'Explain why seeing a displayed price does not guarantee that your own order would execute at that price.',
  skillDomain:'Knowledge',
  lesson:Object.freeze({
   explanation:'A stock is a share of ownership in a company. A ticker symbol is a short identifier used to look up a security, but symbols can be reused or change. People submit orders to buy and sell through brokers and trading venues. A displayed quote is information about a potential bid or offer at a particular time; it is not a promise that any member can trade that quantity at that price. A trade is an actual matched execution, which this website does not perform.',
   why:'First understand what is being measured. If you confuse a company with its ticker, a quote with a trade, or an order with an execution, every chart-based decision becomes unreliable.',
   workedExample:'FICTIONAL COMPANY: Harbor Learning Tools (HBLT) has 1,000,000 shares outstanding. An imaginary learner hypothetically owns 100 shares: 100 ÷ 1,000,000 × 100 = 0.01% of the issued shares. A displayed $10.00 last trade would suggest $10 million of simple price × shares market capitalization, NOT the value of the company in a sale and NOT available cash. No shares or real prices are involved.',
   sourceProcedure:['Identify whether the text describes an issuer, a ticker, a bid, an ask, a last trade or a proposed order.','Check its timestamp and market session.','Distinguish what was actually executed from what someone hoped to execute.','Describe what information is missing, such as share class, outstanding shares, current bid/ask and available size.','Choose OBSERVE or NO TRADE if you cannot verify the inputs.'],
   investigation:'FICTIONAL TRANSFER CASE: Someone posts a screenshot with the ticker HBLT, a price of $10.00 and the words “every buyer will get in at ten.” Explain what the screenshot would and would not prove. Name the timestamp, quotation type, price/size and order state you would need to verify. You do not have to propose a real trade.',
   selfCheck:'If a screen shows a $10.00 last trade, does it prove your market order will fill at $10.00? Explain why, naming the bid, ask and available liquidity.',
   reviewGuide:'No. A last trade describes a past matched transaction. A new order faces the then-current bid, ask, available quantity, queue and changing price. Bid–ask spread and execution costs can matter. Without a real order record, no fill is confirmed.',
   reviewPrompts:Object.freeze(['Did you distinguish an ownership share from a ticker and a displayed quote?','Did you explain why a past last trade cannot guarantee the next order\'s price or fill?','Did you identify available size, bid and ask, session and timestamp as facts to verify?','Did you choose OBSERVE or NO TRADE if executable information is missing?']),
   error:'Confusing displayed price with a guaranteed executable price, or market capitalization with spendable corporate cash.',
   whenNot:'Do not practice placing a real order merely because a ticker and price appear. An account, permissions, quotes, order rules and personal circumstances are separate matters.',
   transfer:'Choose a familiar company name and describe which primary issuer or exchange source you would use to verify its identity. Do not collect or trade real-time quotes here.'
  })
 }),
 Object.freeze({
  title:'How to read a five-minute candlestick',
  objective:'Label open, high, low and close, calculate real body versus full range, and recognize an undefined range percentage.',
  observe:'Look at one complete candle and find the four labeled prices before interpreting its color or drawing a prediction.',
  practice:'Use the original fictional Simulator and calculate body, upper wick, lower wick, full range and body percentage.',
  skillDomain:'Recognition',
  lesson:Object.freeze({
   explanation:'A candlestick is a five-minute story told with four prices. OPEN is the first executed price of its interval, HIGH the highest, LOW the lowest and CLOSE the last. A bullish candle closes above its open; a bearish candle closes below. The rectangle is the real body, and thin upper and lower wicks show the rest of the observed range. The candle records that interval; it does not predict the next one.',
   why:'Before discussing VWAP, patterns or breakouts, know exactly which measured prices a drawing represents. Chart appearance alone can conceal a wide range, a tiny body, or a changed timeframe.',
   workedExample:'FICTIONAL GREEN CANDLE: Open $20.00, High $21.50, Low $19.50, Close $21.00. Real body = Close − Open = $1.00. Full range = High − Low = $2.00. Upper wick = High − Close = $0.50; lower wick = Open − Low = $0.50. Check: $0.50 + $1.00 + $0.50 = $2.00. Body percent = ($1.00 ÷ $2.00) × 100 = 50%. For a bearish candle use the larger price minus the smaller to get a positive length.',
   sourceProcedure:['Point to OPEN, HIGH, LOW and CLOSE on a single completed candle.','Compute the real body as the absolute difference between open and close.','Compute full range as high minus low; confirm each wick plus body equals the range.','Substitute known values into (Body ÷ Range) × 100.','If High equals Low, mark the body percentage undefined because dividing by zero is invalid.','Record that the next candle remains unknown.'],
   investigation:'FICTIONAL “YOUR TURN” CANDLE: Open $20.00, High $22.00, Low $19.00, Close $21.20. Compute the real body, range, upper/lower wicks and the body percentage. Then imagine a bearish candle with Open $24 and Close $23: explain why the real body is $1, not negative $1.',
   selfCheck:'For FICTIONAL OHLC 20.00 / 22.00 / 19.00 / 21.20, what is the body percentage, and why is it not the full-range percentage? What happens when High equals Low?',
   reviewGuide:'The real body is $1.20, range $3.00, so body percentage is 1.20 ÷ 3.00 × 100 = 40%. The upper wick is $0.80 and lower wick $1.00; 0.80 + 1.20 + 1.00 = 3.00. High = Low yields undefined body percent (division by zero). A candle reports past behavior, never a forecast.',
   reviewPrompts:Object.freeze(['Did you calculate body as the positive open-close difference and range as high minus low?','Did you check that the two wicks plus body add up to the full range?','Did you state 40% for the fictional practice candle, and undefined when High equals Low?','Did you avoid using candle color to predict the next candle?']),
   error:'Using the full range instead of the real body, subtracting bearish prices in the wrong direction, or treating a green candle as a buy signal.',
   whenNot:'Do not infer order flow, trader intent, future direction or your executable fill solely from the shape of one OHLC candle.',
   transfer:'Open Free fictional Simulator practice. Observe five candles, stop before the next reveal, label one OHLC example and write one reason you might choose NO TRADE.'
  })
 }),
 Object.freeze({
  title:'Claims, catalysts and what was actually known',
  objective:'Separate an original source and its publication time from a social repost, marketing claim or later price observation.',
  observe:'Read the document type, company identity, period measured, publication date and independent evidence available by the chosen decision pause.',
  practice:'Build a two-column source ledger for a fictional company claim and reject evidence first published after the decision pause.',
  skillDomain:'Knowledge',
  lesson:Object.freeze({
   explanation:'A catalyst is an event that some market participants may consider relevant, such as an issuer report, earnings release or regulatory notice. It is not proof that a price must move. Research requires an original source, the exact statement, the measurement period and a timestamp. The SEC EDGAR database provides corporate filings; issuer pages and relevant exchanges may supply other original notices. A copied screenshot or confident influencer is not an independent verification.',
   why:'Beginners are vulnerable to hindsight: a chart moves later, so a story is invented about what “everyone knew” earlier. Source chronology protects your reasoning.',
   workedExample:'FICTIONAL: At 08:10 ET, someone claims “Harbor Learning doubled sales.” A newsletter repeats it at 08:17 ET; a screenshot stamped 08:21 ET shows a hypothetical price move. At an 08:12 decision pause, those later items are unavailable evidence. Even a genuine 08:03 issuer release requires checking the stated period, meaning of sales and public availability.',
   sourceProcedure:['State the exact claim without promotional adjectives.','Identify original issuer or regulator publication and independently check the legal entity.','Record publication/acceptance time, retrieval time, measured period and time zone separately.','Remove evidence first available after the decision pause.','Explain one competing interpretation and at least one important unknown.','Classify VERIFIED, PARTLY VERIFIED, UNVERIFIED or CONTRADICTED; when unsupported, choose NO TRADE.'],
   investigation:'FICTIONAL TRANSFER: A lookalike website alleges that a company signed a guaranteed $40 million deal. Its URL resembles, but differs from, the issuer domain. List five checks you would make before calling this claim confirmed, and explain why even a genuine proposal does not guarantee revenue.',
   selfCheck:'A post at 09:05 ET is used to justify an alleged 08:50 ET decision. What is wrong with that chronology and what would make the claim verifiable?',
   reviewGuide:'The 09:05 post is future evidence relative to an 08:50 pause and cannot justify the earlier decision. You would need an independently verified original document and evidence it was publicly available by 08:50, plus the exact reported period, issuer identity and a separate timestamped market observation. Withhold conclusions when essential evidence is missing.',
   reviewPrompts:Object.freeze(['Did you reject the 09:05 publication as evidence available at the 08:50 decision pause?','Did you identify the issuer or primary filing source and distinguish publication time from reporting period?','Did you say which facts remained unverified and why a repost is not confirmation?','Did you withhold a trade conclusion rather than treating future price as past knowledge?']),
   error:'Treating the number of reposts or a persuasive screenshot as proof; confusing reporting period with publication time; using after-the-fact outcomes.',
   whenNot:'Do not label a rumor verified, infer a guaranteed catalyst impact or place a trade because you cannot find the original report.',
   transfer:'Open a public issuer or SEC filing in a new tab and practice documenting its form, date and period without selecting a trade or claiming an outcome.'
  })
 }),
 Object.freeze({
  title:'Make a watchlist, not a list of trade signals',
  objective:'Organize a small research watchlist with stated purpose, dated evidence, uncertainty and an explicit removal/no-trade rule.',
  observe:'Identify whether a candidate is independently researched, based on a watchlist note only, or tied to a documented company announcement.',
  practice:'Create three manual watchlist entries with timestamps and reasons, then put at least one in NO TRADE / needs verification.',
  skillDomain:'Decision',
  lesson:Object.freeze({
   explanation:'A watchlist is a research queue, not a purchase recommendation. A stock symbol on a list means “study this more,” not “buy.” Useful columns include symbol, research question, source and observed-at time, price and volume data status (if sourced), invalidation and next review date. A scanner result only indicates that a filter matched its data; it cannot establish news truth, executable spread or a profitable setup.',
   why:'The watchlist helps you avoid chasing attention. It gives you a documented process for adding, rejecting, ranking and removing research candidates.',
   workedExample:'FICTIONAL: GUSIM is marked “Investigate” because its original educational five-minute candle sequence shows changing ranges. Source: original fictional platform exercise, not a market feed. Another fictional symbol ABCX is removed because its claimed issuer link is unverified. Neither symbol is presented as a real trading opportunity.',
   sourceProcedure:['Define one research purpose: e.g., learn to identify a complete candle or locate an issuer filing.','Add a symbol only with a source classification and a reason.','Record a timestamp and whether the price/volume is fictional, historical verified or not collected.','Write evidence that would invalidate inclusion; add NO TRADE for missing information.','Review, keep, defer or remove entries by repeatable rules; never use popularity as proof.'],
   investigation:'FICTIONAL PRACTICE: Candidate A has an original dated company disclosure but no validated liquidity data; B has a social rumor and a screenshot; C is the GUSIM fictional exercise. Explain which entries belong on a RESEARCH list, which need verification and why none alone supports a trade. Use the Free manual watchlist exercise and keep track of source status.',
   selfCheck:'Does putting an unverified symbol on your watchlist mean you should buy? Explain two reasons that can justify leaving it as WATCH or NO TRADE.',
   reviewGuide:'No. A watchlist records research priorities, not executable orders. Missing original news, uncertain issuer identity, stale quote, thin spread or unknown liquidity can all justify waiting or rejecting an entry. A watchlist should include provenance, dates and a removal criterion.',
   reviewPrompts:Object.freeze(['Did you state why a research watchlist is not a buy recommendation?','Did you classify the source as fictional, user research or unverified without claiming independent verification?','Did you name the unknown evidence and explain a WAIT or NO TRADE decision?','Did you include a concrete next review or removal condition?']),
   error:'Treating watchlist ranking, scanner volume or social popularity as a forecast; adding a ticker with no dated source.',
   whenNot:'Do not auto-buy from the watchlist, label unsourced market data verified, or claim the watchlist can pull real-time quotes without an authorized feed.',
   transfer:'Create a watchlist with GUSIM and two manually chosen examples. Record for each: verified source? which date? what is unknown? when will you reconsider?',
   practiceLink:'free-watchlist.html'
  })
 }),
 Object.freeze({
  title:'Plan risk, choose NO TRADE and review your work',
  objective:'Use a hypothetical share-risk calculation, explain execution uncertainty and write a defensible independent NO TRADE decision.',
  observe:'Find entry assumption, protective invalidation reference, stop distance, expected spread, uncertain fills and maximum planned loss exposure.',
  practice:'Make a documented paper-only plan, or reject an unverified setup, then save a private ungraded reflection and next study step.',
  skillDomain:'Process',
  lesson:Object.freeze({
   explanation:'Risk planning begins before a hypothetical order, not after an imagined profitable outcome. Planned per-share risk is the absolute gap between entry assumption and stop reference. An illustrative position size can be estimated as floor(risk budget ÷ per-share planned risk), but actual fills can slip and costs raise losses. A stop is an instruction with execution uncertainty, not guaranteed insurance. NO TRADE is valid when evidence, capital limits, liquidity or timing are inadequate.',
   why:'Successful learning means explaining the decision process and limitations. A winning fictional candle is not proof of a good process; a disciplined decision to refrain can be correct even if prices later rise.',
   workedExample:'FICTIONAL: Entry assumption $10.00; stop reference $9.80; per-share planned risk $0.20. With an illustrative $20 maximum planned-loss budget, floor($20 ÷ $0.20) = 100 shares before spread, fees, slippage or gaps. Price exposure is 100 × $10.00 = $1,000, not $20. In real markets a stop may fill worse than $9.80; this exercise is not individualized position-size advice.',
   sourceProcedure:['State whether all data are fictional; do not call the exercise a real trade.','Identify price assumption, risk reference, difference per share, shares and total capital exposure separately.','Consider spread, liquidity, partial fills, halts, gaps and later observations not yet known.','Write a one-sentence invalidation: what evidence would change or cancel the plan?','Choose ENTER FOR PAPER PRACTICE, WATCH or NO TRADE; a missing fact is a valid reason to abstain.','Write a reflection: what was observable, what remained uncertain and what you would practice next.'],
   investigation:'FICTIONAL TRANSFER: The same $10/$9.80 entry/stop assumptions appear, but displayed ask is missing and the candle volume is not verified. Explain why the 100-share arithmetic is not permission to trade. Create a NO TRADE research plan and specify the evidence needed before making a different decision.',
   selfCheck:'For the fictional $10 entry, $9.80 stop and $20 planned-risk budget, how many shares fit the simple calculation? Why is $20 not a guaranteed maximum actual loss?',
   reviewGuide:'The simple calculation gives floor(20 ÷ (10.00 − 9.80)) = 100 whole shares. Notional exposure is $1,000. Actual fills, spreads, fees, liquidity gaps and market halts mean loss may be greater; no physical or broker trade occurs in this lesson. If original evidence is missing, choose NO TRADE.',
   reviewPrompts:Object.freeze(['Did you separate the $0.20 per-share planned risk from $1,000 of hypothetical notional exposure?','Did you calculate the simple 100-share result without calling $20 a guaranteed loss cap?','Did you consider spread, fees, adverse fills, gaps and liquidity uncertainty?','Did you state a defensible NO TRADE or invalidation rule?']),
   error:'Equating an intended stop with a guaranteed execution price, confusing buying power with planned risk, or awarding mastery because a fictional replay happened to work.',
   whenNot:'Never treat an estimated fill, fabricated candle or ungraded reflection as a broker-confirmed transaction or certified trading skill.',
   transfer:'Use the Free fictional Simulator to document a no-trade reason and then revisit the same idea with changed assumptions. Save your own observations in the Journal only when ready.'
  })
 })
]);
