# Curriculum instructional QA batch — 2026-10-31
**Document ID:** SMFGU-EDU-QA-671-001
**Version:** 1.0
**Status:** Partial source-code audit; no blanket editorial acceptance
**Project:** The Stock Market: From the Ground Up
**Repository:** docs/research/stockstotrade/ on main
**Google Drive:** Not created
**Scope:** The controlling 419 Labs, 247 Boot Camp days, and 5 Free Foundations days.

## Direct source inspections
- Read exact 419-row `docs/419_LAB_EDITORIAL_ACCEPTANCE_v014100.csv`. **419/419** contain `NOT_CONFIRMED` editorial/acceptance gates. **94** Foundations records are flagged `NO_PRIVATE_BOOK_INSTRUCTION_ONLY`: the public register does not supply complete independent lesson bodies.
- Read `functions/_lib/free-foundations-v1.js`. All **five** canonical Free Foundations lessons contain `explanation`, `workedExample`, `sourceProcedure`, `selfCheck`, `reviewGuide`, `transfer`, and `whenNot` fields. This confirms *structural presence*, not factual correctness or independent pedagogical acceptance.
- Confirmed the first Free lesson’s fictional worked arithmetic: 100 shares / 1,000,000 shares × 100 = 0.01%; $10 × 1,000,000 shares = $10 million simplified equity capitalization, not available corporate cash.
- Confirmed the second Free lesson’s fictional five-minute example: O=20, H=21.50, L=19.50, C=21.00; body=1.00, range=2.00, upper and lower wicks 0.50 each, body ratio=50%. If H=L, percentage denominator is zero and the ratio is undefined.
- Read `functions/_lib/bootcamp-academy-v014168.js`: grade/mastery restrictions are present in the static source. This is not runtime authorization or protected-answer leak testing.
- Attempted to fetch `data/lab-teaching-bridges-v014168.json` through GitHub file connector; content came back empty. Accordingly, **419 bridge texts could not be content-audited in this pass**. Do not infer a valid or empty file from a tool output without a separate retrieval.

## Audit disposition
| Evidence | Tested | Result |
|---|---|---|
| Canonical inventory and identifiers | 419 Labs, 252 day positions | Indexed baseline only |
| Foundations narrative gaps | 419 editorial register | 94 require private-source or standalone lesson verification |
| Five Free Foundations lesson field sets | Source file | 5/5 structurally present |
| First two Free Foundations fictional calculations | Source-file arithmetic | Verified at the illustrated values |
| 419 teaching bridges | GitHub fetch attempted | Inconclusive, no body returned |
| Lesson-to-source claim verification | Across 671 | Not completed |
| Independent editorial QA on each complete unit | Across 671 | Not completed |
| Protected grading and real authenticated persistence | Browser and test evidence | Not performed |

## Acceptance requirements to close
1. Retrieve all 419 source bodies, inspect individual narrative objectives, demonstrations, misconceptions, limitations, separate fresh-case assessment, transfer, and safety constraints.
2. Inspect all 252 actual day-level lesson bodies, not merely generated objectives and topical source keywords.
3. Verify each numerical case, primary sourced market/regulatory fact with publication/effective date, historical chart license, and no-lookahead use.
4. Independently review each assessment and role/entitlement boundary without exposing protected keys.
5. Record exact source hashes, reviewer, test evidence, acceptance status and counterexamples per unit. Only then set an item to accepted.

**No production lesson, assessment, entitlement, or commerce changes were made.**
