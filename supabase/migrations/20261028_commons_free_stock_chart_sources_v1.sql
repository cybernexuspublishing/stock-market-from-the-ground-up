-- No-cost primary filing, research and chart source literacy (source-grounded).
INSERT INTO public.commons_topics (forum_code,legacy_source_code,title,body,status,author_label,is_official,is_locked,is_pinned)
VALUES ('DATA_CONNECTIONS','SOURCE_20261028_FREE_MARKET_REFERENCES','Free Stock Research and Chart Websites: Match Each Source to Its Data Limits','## By the end of this discussion you should be able to
Choose a suitable no-cost research resource and document its latency, coverage and redistribution restrictions before treating it as trading evidence.

## Research and chart source comparison (checked October 28, 2026)
SEC EDGAR: free primary-source corporate filings. Best for issuer documents, financing terms and dated disclosures; not a live chart or consolidated execution feed.
https://www.sec.gov/search-filings

FINRA Market Data Center: public research service covering several asset types. The site''s market-data notices say some equity quotes are delayed at least 15 minutes and third-party provider rights apply. Do not assume every quote is real-time.
https://finra-markets.qs1ce90.eas.morningstar.com/

TradingView: offers free/basic chart capabilities, but its default real-time U.S. stock chart data may be supplied by Cboe, not the consolidated primary listing-exchange feed. TradingView documents that official primary-exchange real-time feeds may require extra subscriptions. Identify the selected symbol''s feed and delay indicator before comparing 1-minute bars.
https://www.tradingview.com/support/solutions/43000473924-is-us-stock-market-data-free-by-default/

Finviz: offers a regular stock screener/chart research site. Its FAQ reports 1-minute delay for ordinary U.S. equity quotes and separate paid Elite access for more features; terms and timing may change.
https://finviz.com/help/faq

StockCharts: some charting tools are free with feature limits; its support documentation restricts free chart bars to daily/weekly with limited history and indicators, so it is not a substitute for a free intraday replay feed.
https://help.stockcharts.com/your-account/subscribing-to-stockcharts

## Practice exercise
Pick one of the resources above and state: (1) which decision it can inform, (2) how much of the market its feed actually represents, (3) the as-of timestamp or latency, (4) which data is unavailable, and (5) whether its terms allow redistribution. Compare one chart observation against a primary company filing without assuming they share the same event time.

## Important distinction
A website offering free on-screen chart access does not grant our platform permission to copy its charts, automate extraction, mirror quote streams or redistribute its data. Never treat data from multiple providers as interchangeable without checking venue, corporate-action adjustments, session rules and timestamps.

## Verified source trail
Owner-provided RESEARCH_001_300_BATCH_XIV_DATA_IDENTITY_RIGHTS.md and RESEARCH_SOURCE_REGISTER.csv, complemented by provider documentation at the official URLs above. No third-party images, historical bars or protected API data are reproduced.','published','Ground-Up Editorial Team',true,false,false)
ON CONFLICT (legacy_source_code) DO NOTHING;