-- Options fundamentals education, not an interactive simulator release.
INSERT INTO public.commons_topics(forum_code,legacy_source_code,title,body,status,author_label,is_official,is_pinned,is_locked)
VALUES('OPTIONS_PLANNED','SOURCE_20261028_OPTIONS_RIGHTS','Options Fundamentals: Calls, Puts, Rights, Obligations and Risk','## By the end of this discussion you should be able to
Distinguish the right held by an option buyer from the obligation accepted by its writer, without assuming a simulation or options trading feature is available on this website.

## Start with the contract
A standard equity call gives its holder a contractual right to buy underlying shares at a specified strike price under the contract''s terms. A standard equity put gives its holder a right to sell. The writer (seller) bears the corresponding delivery or purchase obligation if assigned. Contract type, style, deliverable, strike, premium and expiration all matter; do not assume every option controls 100 shares or has identical exercise features without reviewing the contract specifications.

## Fictional calculation
An illustrative call option with a $1.20 per-share premium and a standard 100-share deliverable would require $120 of premium before transaction costs for one contract. This describes the premium expenditure for a long option; it is not the total risk profile of a short-option writer or a recommendation. A contract can expire worthless, and some short-option positions can present losses far exceeding the premium received.

## Common mistakes
Confusing holding a contractual right with owning the underlying shares; assuming that a call is guaranteed to gain whenever the stock rises; assuming exercise, assignment and settlement never matter; or treating an unbuilt educational feature as an available simulator.

## Practice discussion
Give a fictional strike, premium and expiration and identify the call buyer''s right and the writer''s obligation. What contract details must be checked before computing the total premium? Why might the holder choose NO TRADE?

## Availability statement
The Options Learning & Simulator feature remains a planned product area. This discussion is standalone concept education, not an interactive options simulator, broker connection or options execution feature.

## Primary educational references
SEC Investor Bulletin, An Introduction to Options (updated July 16, 2026):
https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-63
Options Industry Council (OIC), Options Basics:
https://www.optionseducation.org/referencelibrary/faq/basics
OCC, Characteristics and Risks of Standardized Options:
https://www.theocc.com/company-information/documents-and-archives/options-disclosure-document
Educational only; options carry substantial risk.','published','Ground-Up Editorial Team',true,false,false)
ON CONFLICT(legacy_source_code) DO NOTHING;