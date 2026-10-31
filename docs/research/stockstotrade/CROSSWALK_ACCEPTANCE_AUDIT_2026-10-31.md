# StocksToTrade research crosswalk — source-specific matching acceptance audit
**Document ID:** SMFGU-RESEARCH-STT-CROSSWALK-007
**Project:** The Stock Market: From the Ground Up
**Version:** 1.0
**Date:** 2026-10-31
**Status:** Canonical source IDs and day topics mapped provisionally; external source/assessment acceptance not certified
**File type:** Markdown
**Google Drive:** Not created
**Dependencies:** 419-Lab Editorial Acceptance register, Boot Camp Academy source JS, STT research registries and archives
**Purpose:** Account for all intended curriculum positions; prioritize individual verification.

## Results of this implementation pass
1. Exactly **419** canonical Lab-ID rows were carried forward. The earlier **106** entirely unmapped Labs now have explicit **competency-based external source candidates** in `canonical_419_lab_source_candidates_v2.csv`. There are zero empty candidate IDs in that register. Some links are topical background rather than direct instruction on the precise topic; treat these as **weak candidates**, not verified coverage.
2. Exactly **252** Academy/Free position rows were extracted from controlling Academy code: five Truth, seven Watchlist, ten Scanners, thirty Foundations, forty-five Charts, sixty Risk, ninety Practicum, and five Free Foundations.
3. Replaced blanket per-program source suggestions with **day-topic candidates** using the original 30-day source lesson titles/objectives, original 5/7/10-day authored module topic titles/objectives, and the defined 15/20/30-topic day cycles. **199/252** day topics received topical candidates; **53/252** remain without a direct matching source.
4. The five Free Foundations topics in this generated register remain placeholder titles: their canonical precise lesson titles require further extraction from `free-foundations-v1.js` and `free-foundations-phase-a-v1.js`. Do not call them day-validated.
5. Sources identified for market-depth education (StocksToTrade Level I/II support), watchlists, volatility, scanners, VWAP, ABCD, catalysts, and trading plans are teaching sources, not authoritative support for FINRA, SEC, exchange rules, performance statistics or broker execution.

## Nonnegotiable acceptance boundary
An index row having a `source_id` means only an observed source candidate. `source_validation` and `editorial_status` remain unapproved. No independent review of 419 lesson scripts or 252 daily cases is implied. New sources that merely mention a competency cannot satisfy evidence-based curricular acceptance.

## Next evidence actions
- Inspect the 53 unmatched day-specific topics and link stronger sources or mark `original_explanation_no_stt_source_required` with review rationale.
- Confirm every source ID resolves to a committed source registry record and every source URL resolves to a valid canonical issuer/article/video record.
- Extract real Free Foundations day titles and rerun the 252-day crosswalk.
- Reconcile the 500-pass archive source URLs against the public source registry, retaining archive filename and row provenance.
- Where an original trading assertion is market or regulatory fact, verify against official SEC, FINRA, exchange and issuer sources with the effective date.
- Conduct independent editorial/graded-answer-key acceptance; do not release protected keys.

## GitHub locations
- `docs/research/stockstotrade/canonical_419_lab_source_candidates_v2.csv`
- `docs/research/stockstotrade/canonical_academy_252_day_source_candidates_v2.csv`
- `docs/research/stockstotrade/CROSSWALK_ACCEPTANCE_AUDIT_2026-10-31.md`

No production or member record changes were made.
