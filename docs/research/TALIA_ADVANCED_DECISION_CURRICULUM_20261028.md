# Talia Advanced Decision Curriculum — source-controlled batch 02
Date: October 28, 2026.
User-approved scope: long-term holding versus day-trading holding; earnings, balance-sheet and fundamental changes; sector and market regime analysis; conflicting signals; order-flow evidence; options position and assignment risk.

## Original educational lesson assets
`data/tutor-advanced-decision-guides-v1.json`: 13 additional ungraded, original, fictional teaching playbooks. Each specifies a **governing time horizon**, concept, evidence to monitor, conditional entry, conditional hold, possible exit reassessment, WAIT/NO TRADE condition, a fictional example, common misinterpretation and reflection. This builds on the existing 18 decision playbooks, 32 research guides and one historical replay guide. Canonical 30 competencies and 419 Lab IDs are unchanged.

## Grounding
The user's STT.zip and StocksToTrade-Browser-Research (6).zip informed setup framing, chart/fill evidence limitations, source provenance and trading chronology. Original text only; do not redistribute third-party transcripts, proprietary charts, account files or browser data.
Independently checked public references: SEC Investor.gov's Asset Allocation and Diversification, How to Read a 10-K/10-Q, order execution bulletin (updated August 2026), Options Introduction (updated July 2026); OCC Options Industry Council's Greeks, options pricing and assignment FAQs; Charles Schwab's educational discussion of market breadth and sector rotation. Each guide carries its reference URLs.
These are educational and include no verified strategy win rate, recommendation to transact, historical market replay, prediction or promise of a fill.

## Integration and safeguards
`original-competency-tutor-v014100.js` loads the optional advanced guide catalog only for a matching decision/portfolio/earnings/option-context query and validates the source schema and allowlisted reference domain. An optional asset outage retains the original 18 decision playbooks and the original canonical Tutor. The decision-output formatter explicitly separates holding periods and includes entry, hold, exit, WAIT/NO TRADE and risk context.
The API continues to serve these as **source-only** even when an AI model is requested; paid model calls and grade/mastery writes remain disabled for this source-guided path. No authentication, payment or plan entitlements were relaxed.

## Test scope
`tests/test_tutor_advanced_decision_guides_v1.mjs`: content and provenance checks for all 13, topic-specific ranked retrieval, optional asset outage regression, safe rendering, and an authenticated **synthetic member** request verifying no billable inference or official grading. Exact-SHA CI/Cloudflare production and later real beta-member acceptance must be distinguished.

## Editorial follow-up
Review lessons with beta testers for clarity, particularly distinguishing a long-term business thesis from intraday technical invalidation and showing that theoretical option spread risk need not equal interim assignment/stock exposure. Real historical examples require separately licensed, verified market data.
