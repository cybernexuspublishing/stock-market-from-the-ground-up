-- Add high-value moderated starter discussions to previously empty active community categories.
-- No paid features, live transactions, or personal account records are asserted.
INSERT INTO public.commons_topics (forum_code,legacy_source_code,title,body,status,author_label,is_official,is_locked,is_pinned)
VALUES
('BILLING_ACCESS','SOURCE_20261028_ACCOUNT_ACCESS_SAFE','Membership and Access Questions: What to Post Publicly and What Must Stay Private','## Purpose
Use this forum to understand general membership access, renewal terminology, account eligibility, book entitlements and how to find the right help page. Never publish private billing records in a discussion.

## First, understand the boundaries
A plan shown in a storefront is not proof of a completed purchase. A successful charge, entitlement grant, refund, renewal and cancellation are different lifecycle events. An advertisement or preliminary checkout screen is not the authoritative account record. Only an authenticated account view and a verified provider-backed transaction record can establish the relevant status.

Founding subscriptions, Lifetime Membership, book purchases and Crownlight Sparks can have different rules. Where published materials disagree, do not guess which rule applies. Refer to the current account/terms information and open a private Support request for an individual case.

## Safe support workflow
1. Describe the general feature or page and the user-visible behavior without account identifiers.
2. For a specific charge, payment method, receipt, refund, email address or subscription dispute, use private Dashboard Support instead of this forum.
3. Never include passwords, session tokens, API keys, bank details, billing addresses or screenshots displaying them.
4. If you believe a page makes a misleading promise, link the public page and quote only the relevant short wording; staff should investigate and publish a corrected status.

## Practice discussion
Which status is being discussed: purchase intent, provider confirmation, granted access, expiration, cancellation or refund? State what would be necessary to verify the status safely.

## Editorial basis
Project-controlled membership, privacy and billing workflows. This is general product education, not an account determination or representation that any live payment has occurred.','published','Ground-Up Editorial Team',true,false,false),
('MARKET_DISCUSSION','SOURCE_20261028_EVIDENCE_FIRST_DISCUSSION','Evidence-First Market Discussion: Separate Price Observations, Filings and Opinions','## By the end of this discussion you should be able to
Express a market hypothesis in a way another member could verify, disagree with or test.

## Use four evidence labels
Verified observation: a specific chart value, dated filing, timestamp or calculation from an identified source.
Attributed claim: something a company, news outlet or analyst says, not independently verified as true.
Inference: your interpretation of available observations.
Unknown: a missing fact, uncertain feed scope or unresolved source conflict.

## Example with fictional data
''The price was above VWAP at 10:20'' is an observation only if your chart data, session, VWAP definition and timestamp are specified. ''Buyers now control the market'' is an interpretation, not a guaranteed conclusion. A later gain or loss cannot retroactively prove the reasoning was sound.

## Post a useful question
Include ticker only when material; date, timezone, data provider, timeframe, relevant filing or original chart link, observed conditions and the alternative interpretation. State what evidence would change your mind. A member is not required to disclose holdings, trade size, personal finances or broker account details.

## Avoid
Price targets presented as guarantees, coordinated trading requests, unreleased/private information, purported insider tips and screenshots distributed without permission. Treat unfamiliar third-party links as untrusted.

## Practice discussion
Write a two-sentence hypothetical claim followed by one testable counterargument. Mark the four evidence labels and decide whether NO TRADE is a defensible result.

## Source foundation
Owner-verified market research and SEC''s free corporate filing database: https://www.sec.gov/search-filings
This forum is for education and peer analysis, not personalized investment advice.','published','Ground-Up Editorial Team',true,false,false),
('QUESTIONS','SOURCE_20261028_GOOD_LEARNING_QUESTION','Ask a Question That Can Be Taught, Tested and Answered','## What makes an answerable learning question?
Identify the concept, the evidence you are using, what you expected, what happened and the precise step you do not understand. Ask one question at a time when possible.

## Structured teaching question
Topic: candle real body.
Given fictional OHLC prices: Open $10.00, High $10.80, Low $9.80, Close $10.50.
Your attempt: real body = |Close - Open| = $0.50; full range = High - Low = $1.00; body-to-range ratio = 50%.
Your question: ''Why is the real body not $1.00, and which prices determine the wicks?''
A useful response explains the real body, wicks, signs and denominator; it does not merely supply a final answer.

## Before posting
Check the relevant chapter or Lab ID and search for an existing question. Include your calculation or observation and indicate whether the chart is fictional, conceptual or licensed historical data. Remove personal identifiers and assessment answers. If your question concerns a protected exam, discuss the underlying skill instead of publishing answer keys.

## For members answering
Teach the definition, show one worked example, identify the likely misconception, invite a retry, and explain how to verify the reasoning. Label any assumption. Do not present speculation as a sourced fact.

## Discussion exercise
What would you ask if a VWAP line seems wrong? Supply session hours, source, timestamp and whether prices are corporate-action adjusted rather than asserting the tool is broken.

## Source foundation
Owner-approved 9-stage Talia teaching method and Foundations candlestick lessons. Numbers above are purely fictional and not an observed stock bar.','published','Ground-Up Editorial Team',true,false,false)
ON CONFLICT (legacy_source_code) DO NOTHING;