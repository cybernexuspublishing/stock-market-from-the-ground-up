-- Verified educational starters; additive and idempotent. 2026-10-28.
-- Source trail: user-provided StocksToTrade-Browser-Research (8).zip,
-- SEC / Investor.gov / Nasdaq, direct official URLs preserved in the topics.
-- No copyrighted source passages, market prices, or chart data are copied.
INSERT INTO public.commons_topics
 (forum_code,title,body,status,author_label,legacy_source_code,is_official,is_pinned,is_locked)
VALUES
('RISK_EXECUTION', 'Practice: Market, Limit, and Stop Orders When Price Moves', '## By the end of this discussion you should be able to
Explain what a market order controls, what a limit order controls, and why a stop price is not a guaranteed fill price.

## First, learn the difference
A market order prioritizes execution at available prices; it does not guarantee a particular execution price. A buy limit order caps the price you will pay, but it may not fill. A standard stop order is triggered when its specified price is reached and generally becomes a market order. A stop-limit order applies an additional price condition and therefore can remain unfilled during a sharp move. Availability, session eligibility and triggering rules vary by broker.

## Guided fictional example
You are studying 100 fictional shares, not a real security. The displayed ask is $10.00 for 40 shares, and the next displayed ask is $10.05 for 60 shares. If no liquidity changes and a market buy fills at these two displayed prices, the weighted average is (40 x 10.00 + 60 x 10.05) / 100 = $10.03. This is a conditional illustration, not a fill prediction; actual orders can change, disappear, or execute elsewhere. A buy limit at $10.00 may fill only partly or not at all.

## Common mistake
Treating the last sale, the displayed quote, a stop trigger, and the final execution as if they were the same price. Also distinguish a cancellation request from confirmation that the order was canceled.

## Practice discussion
Describe one plausible benefit and one risk of a market order, a limit order and a stop-limit order. Which missing evidence would prevent you from assuming a fill? Include whether your example occurs during regular or extended hours. Do not provide a real-money trade recommendation.

## Verified source trail
Owner research: RESEARCH_001_300_BATCH_XI_ORDER_INSTRUCTIONS.md (October 22, 2026); source STT-S-0087.
SEC Office of Investor Education and Assistance, Understanding Order Types, updated August 18, 2026:
https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-14
SEC, Stop, Stop-Limit, and Trailing Stop Orders:
https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-15', 'published', 'Ground-Up Editorial Team', 'SOURCE_20261028_ORDER_EXECUTION',true,false,false),
('CATALYST_FILINGS', 'Practice: Verify a Stock Catalyst With SEC EDGAR Before Drawing Conclusions', '## By the end of this discussion you should be able to
Build a source-first research record that separates what a company filed, when it filed it, and how market participants might interpret it.

## Source verification workflow
1. Record the issuer''s exact legal name, ticker and Central Index Key (CIK). Symbols and company identities can change.
2. Locate the primary filing or company release. The SEC''s EDGAR filing search is free, and it allows searches by company, ticker or CIK.
3. Record the form type, accession/filing identifier, original filing date, relevant exhibit and the timestamp visible from your source.
4. Read the actual filing language. For financing, examine the price, share amounts, warrant terms and contingencies where disclosed. Do not confuse authorized shares, outstanding shares and tradable float.
5. Separate verified facts, management statements, your interpretation and unresolved information. Note if an earlier filing was amended.

## Fictional research question
A headline says that fictional ABCD ''secured new funding.'' The company filing describes a conditional offering with warrants. Is the headline enough to classify the event as unambiguously bullish? No: the financing terms, timing and possible dilution need evaluation; a financing event is not a guaranteed price catalyst.

## Common mistake
Using a screenshot or social-media summary as the source of record without confirming the original document, issuer and publication chronology.

## Practice discussion
Choose a historical public filing you are permitted to discuss, provide its SEC filing URL and form type, then write four short labels: Verified, Attributed, Inference and Unknown. Do not post private broker records or assert an expected stock return.

## Verified source trail
Owner-curated stock-research source register and research batches, with source verification and data identity controls.
SEC EDGAR (free filing search):
https://www.sec.gov/search-filings
SEC, Using EDGAR to Research Investments:
https://www.sec.gov/search-filings/edgar-search-assistance/using-edgar-research-investments', 'published', 'Ground-Up Editorial Team', 'SOURCE_20261028_CATALYST_FILINGS',true,false,false),
('ORDER_FLOW_TAPE', 'Practice: What Level II and Nasdaq TotalView Do Not Show', '## By the end of this discussion you should be able to
State the venue coverage of a depth-of-book feed before inferring market-wide supply or demand.

## Learn first
Time & Sales records executions included by a data provider; displayed depth shows submitted, displayed interest on specific venues or in a specific feed. A displayed bid or ask is not a completed transaction. Hidden and off-exchange liquidity may not be represented in the displayed book. A market-data product covering symbols listed across many exchanges does not necessarily consolidate displayed orders from every execution venue.

Nasdaq describes TotalView as depth for orders in the Nasdaq execution system. The listed instruments can include companies listed on exchanges other than Nasdaq, but that does not transform it into a universal order book.

## Fictional interpretation exercise
Your feed displays 2,000 shares offered at $15.20. You see a sequence of green-colored trade prints. Can you conclude 2,000 shares were bought from the displayed seller? Not from these observations alone. Identify the trade-reporting rules, prints'' venue, feed scope, quote changes and whether the displayed order remained there.

## Common mistakes
Equating a large displayed order with a guaranteed fill; inferring an entire market''s liquidity from one venue; or treating colors as proof of a participant''s intention. Platform color schemes are presentation conventions and may differ.

## Practice discussion
Name the feed, the venues it includes, quote and trade timestamps, and one reason the displayed book could disagree with execution. Mark which parts you directly observed and which are inferences.

## Verified source trail
Owner research: RESEARCH_001_300_BATCH_XIV_DATA_IDENTITY_RIGHTS.md (October 22, 2026), source STT-S-0233.
Nasdaq TotalView description:
https://www.nasdaq.com/products/data/equities/nasdaq-totalview
Do not redistribute proprietary market data, screenshots or depth feeds without the applicable license.', 'published', 'Ground-Up Editorial Team', 'SOURCE_20261028_TAPE_FEED_SCOPE',true,false,false),
('HISTORICAL_LABS', 'Practice: Build a No-Look-Ahead Historical Replay Evidence Packet', '## By the end of this discussion you should be able to
Document what information was available at each decision moment and reject outcomes presented as if they were known in advance.

## Replay evidence checklist
1. Record the instrument, venue, trading date, exact local time and timezone, session type, chart interval and market-data provider.
2. Identify whether the price series is raw or corporate-action adjusted; record the adjustment assumptions.
3. Freeze the replay at a defined decision timestamp. Do not use a future candle, end-of-day high/low, or revised company information that was unavailable at that moment.
4. Record the hypothetical setup, entry trigger, invalidation, permitted order type and NO TRADE alternative before advancing time.
5. Advance only after the decision is documented, then evaluate execution assumptions, spreads, commissions, partial fills and changing liquidity.
6. Label unsupported bars, missing timestamps, feed anomalies and incomplete provenance. Missing evidence is a limitation, not permission to invent a fill.

## Fictional learning example
At 10:05 a fictional stock is approaching a prior observed high. You cannot call the later 11:30 session high an ''already-known breakout level'' at 10:05. Instead record the confirmed reference levels available at 10:05 and what would invalidate the proposed setup.

## Practice discussion
Draft a three-point decision log: what you knew, what you decided and what would make you abandon the plan. Include whether the exercise used fictional candles, licensed historical bars, or a conceptual diagram.

## Verified source trail
Owner research: STT_HISTORICAL_EXAMPLE_REGISTER.md and STT_HISTORICAL_EXAMPLE_REGISTER.csv (October 24, 2026). Candidate historical examples are research context, not validated execution or publication-ready OHLCV evidence. Never fabricate historical bars or copy licensed chart data.', 'published', 'Ground-Up Editorial Team', 'SOURCE_20261028_REPLAY_EVIDENCE',true,false,false),
('JOURNAL_ANALYTICS', 'Practice: Calculate an R-Multiple Without Confusing Outcome and Process', '## By the end of this discussion you should be able to
Calculate an R-multiple from an initial planned risk amount and evaluate whether a trade followed its process independently of profit or loss.

## Guided fictional calculation
Suppose a hypothetical long entry is $20.00, the initial stop reference is $19.80 and planned quantity is 100 shares. Planned initial price risk is ($20.00 - $19.80) x 100 = $20 before transaction costs or slippage. A hypothetical exit at $20.30 yields ($20.30 - $20.00) x 100 = $30 gross, or +1.5R gross relative to the $20 initial risk. With $3 of round-trip costs, the net result is $27, or +1.35R net. A gap beyond the stop or partial fills could cause realized risk to differ substantially from that plan.

## Track decisions as well as results
Separate setup eligibility, evidence, position sizing, entry timing, stop placement, order status, rule adherence and whether NO TRADE would have been appropriate. MFE and MAE describe historical favorable/adverse movement, not guaranteed reachable executions. Do not rewrite the initial risk after learning the outcome.

## Common mistake
Calling any profitable trade a good decision, or comparing R outcomes that use inconsistent initial-risk definitions.

## Practice discussion
Using fictional numbers, compute planned dollar risk and gross/net R. Identify one reason a losing trade could still reflect good discipline and one reason a profitable trade could violate the plan.

## Evidence standard
Original educational calculations; no real order, market-data or performance claims.', 'published', 'Ground-Up Editorial Team', 'SOURCE_20261028_JOURNAL_R_MULTIPLES',true,false,false),
('STRATEGY_VALIDATION', 'Practice: Test a Trading Setup Without Hindsight or Survivorship Bias', '## By the end of this discussion you should be able to
Design a falsifiable educational setup test before observing its outcomes.

## Define the test first
Write the precise candidate universe, session, timeframe, indicator settings, eligible catalyst conditions, trigger, invalidation, time limit, NO TRADE conditions and execution assumptions. For instance, ''VWAP reclaim'' is not reproducible until you define what constitutes a reclaim and which completed candles or prints may be used.

## Guard against misleading results
Record rejected setups and no-trade observations, not just attractive chart screenshots. Split development examples from later evaluation examples. Include spreads, partial fills, slippage, commissions, halts and missing data rather than assuming an ideal fill. A small number of favorable examples does not establish an edge.

## Fictional sample
You inspect 12 hypothetical qualifying opportunities and 8 fail your trigger conditions. These 8 are evidence of selectivity; excluding them from the candidate log would distort your measured participation and may conceal discretionary decisions. The remaining four are not a sufficient sample for a reliable profitability claim.

## Practice discussion
Propose a one-paragraph falsifiable setup definition; list your disqualifiers and data provenance. What observation would count as an outright failed hypothesis? Could an independent learner reproduce the screening without knowing tomorrow''s data?

## Evidence standard
Owner-verified research registry plus original statistical and replay-method discussion. This is educational methodology, not evidence of strategy profitability or investment advice.', 'published', 'Ground-Up Editorial Team', 'SOURCE_20261028_STRATEGY_VALIDATION',true,false,false)
ON CONFLICT (legacy_source_code) DO NOTHING;
