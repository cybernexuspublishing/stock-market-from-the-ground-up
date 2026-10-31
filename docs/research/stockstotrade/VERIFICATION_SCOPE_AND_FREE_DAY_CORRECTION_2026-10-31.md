# Crosswalk verification — actual source check, 2026-10-31

Scope: review of source code and SEC/FINRA primary material. **No blanket certification of 419 + 252 teaching units**.

1. Read the source code `functions/_lib/free-foundations-v1.js`, not the old placeholder titles; extracted all five exact lesson titles and objectives. Matched all five to specific research candidates in `canonical_academy_252_day_source_candidates_v3.csv`.
2. Verified against SEC Investor.gov the execution-risk claim for Free Foundations Day 1: a displayed quote or last trade does not guarantee a later fill, and reviewed August 18 2026 order-type guidance; these are primary regulator-backed points.
3. For Free Foundations Days 2–4, StocksToTrade titles are study candidates, not authoritative verification of teaching examples or formulas. For Day 5, SEC order guidance verifies market-order price limitations but does not prove the entire lesson's editorial readiness.
4. The 419-Lab crosswalk in `canonical_419_lab_source_candidates_v2.csv` provides 419 **unreviewed candidate mappings**. Some broad competency matches are plainly insufficient for exact lesson verification (e.g., Level II topics linked to generic support-page metadata and historical replay linked to generic trading rules). They require exact claim-by-claim review rather than auto-approval.
5. Other 247 Boot Camp day candidates are derived from their actual titles and source day relationships but have not had source content verified individually. They are not certified.
6. All fixes are research only. No grade, private answer key, entitlement, production lesson or real-money system changed.

Next approval gate: ensure each source ID resolves to an actual source document and URL; cite observed evidence for each day and Lab; validate exact original calculations, counterexamples, no-lookahead and editorial quality. Use statuses `source_text_reviewed`, `primary_fact_verified` and `editorially_accepted` separately.
