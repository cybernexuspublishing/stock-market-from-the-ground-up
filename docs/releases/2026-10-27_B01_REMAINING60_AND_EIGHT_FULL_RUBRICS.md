# B01 — Remaining 60 Choice Reviews and Eight Complete Rubric Assessments

| Release control | Value |
|---|---|
| Project | The Stock Market: From the Ground Up |
| ID | SMFGU-B01-REMAINING60-EIGHT-RUBRICS-20261027 |
| Date/version | October 27, 2026 / v1.0 |
| Branch/repository | `main` / `cybernexuspublishing/stock-market-from-the-ground-up` |
| Status | Individual editorial CONTENT REVIEWED, technical regression TESTED, production Supabase changes PROVEN; zero formal rubric approvals and zero actual member grading |
| Google Drive | Not created or assigned |
| Human member-journey acceptance | Not verified; deliberately excluded from simulated/unauthorized tests |

## Roles and source boundaries

Acting Owner editorial reviewer, trading-market microstructure educator, curriculum architect, psychometrics/rubric specialist, information-security reviewer, Supabase/PostgreSQL architect, full-stack engineer, operations QA, and independent release auditor.

The source of truth is the existing private B01 v97 question and lesson source in stock-market Supabase `oxihglyfgzywsupnyicb`, with no new answer bank or alternate grader. Existing fictional market examples remain fictional. External primary references used to check concepts:

- SEC Investor Bulletin, [An Introduction to Short Sales](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-51), updated 2026-09-09: upward price exposure, additional financing and margin considerations.
- SEC Investor Bulletin, [Extended-Hours Trading](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-42): liquidity, fragmentation, pricing, and broker-specific order access.
- NYSE [Trading Information](https://www.nyse.com/trade/trading-information): Eastern-time core-session boundaries, late and early trading rules.
- NYSE [Auctions](https://www.nyse.com/trade/auctions): closing-auction order eligibility, timing and clearing mechanics.

These checks are market-structure/source-concept verification, **not** independently licensed historical OHLCV replay acceptance or broker execution proof.

## Part A — Remaining 60 individual choices

Exactly 60 original questions across twelve canonical Labs (five per Lab) were read in their private source. Subjects: sparse liquidity and spreads, per-account capital limits, long and short exposure, no-trade decisions, horizons and context, market sessions, matched volume, OHLC range and direction, official close/auction mechanics, and extended-hours last trades.

**High risk defect:** Thirty-six question explanations (the `EVIDENCE`, `FOCUS`, and `BOUNDARY` cases) contained exact keyed-option echoes. The revisions were first subjected to a private server-side echo check; an initial guarded transaction was rejected for an exact match and rolled back intact. A corrected 36-question plan passed the no-key-echo preflight and was applied **atomically to twelve existing draft v97 rows**, with:
- original complete question bodies archived in `private.b01_question_backups_20261027`, schema-not-exposed, RLS enabled and no direct anonymous/authenticated access;
- the existing keyed answers, numeric question settings, canonicals, progress and member attempts unchanged;
- one narrowly justified `criticalOnWrong=true` policy on `F1-C12-L01/B01_APPLICATION`, where both rejected alternatives endorse invalid trade justification or future hindsight;
- twelve structured admin audit events that include no private questions or keys.

**No additional critical flags:** Wrong options on the other 59 questions generally reflect conceptual or calculation mistakes, not uniform unsafe execution decisions. Applying question-level `criticalOnWrong` to a mixed distractor set would over-penalize safe but mislabeled alternatives. All 60 remain multiple-choice **binary 0/1**, with no invented partial percentage.

`supabase/reviews/20261027_b01_remaining60_choices_read_only.sql` was executed on production and returned **60/60** passing unique key membership, unique wrong options, no exact answer echo, substantive remedy, no unauthorized partial, and currently enforced private grader invalid-option protection. Only boolean decisions, Lab IDs and question IDs were projected—no keys or copyrighted source text.

Individual content rationales: `docs/qa/2026-10-27_B01_REMAINING60_QUESTION_EDITORIAL_REGISTER.csv` (60 items).

## Part B — Eight complete six-question rubric reviews

Each of the eight first B01 canonical Labs has five distinct multiple-choice questions and a sixth numeric question. `supabase/reviews/20261027_b01_eight_full_rubric_read_only.sql` executed against production and returned eight individually passing records. No `review_state` change or attempt was made.

Each rubric's numeric answer was **independently recomputed from its fictional scenario**, using: elapsed minute interval, count of future candles leaked into blind practice, shares × price, OHLC close-open conversion to cents, simplified ownership percent, ETF shares × quote, and two independent issuer share-count × price market-cap products. **Eight of eight** matched their protected private key. Exact numeric tolerance is 0 for these eight, with no partial-credit policy and explicit fictional labels. These were read-only source comparisons; they do not count as a real submitted graded attempt.

Rubric controls: six distinct question IDs, five reviewable multiple choices, exact numeric key, no key echo in the private explanations, no time/quantity unit mismatch, published source conceptual validity, private checksum backups, zero graded attempts and unchanged draft status.

Key-free one-row-per-rubric record: `docs/qa/2026-10-27_B01_EIGHT_FULL_RUBRIC_CONTENT_REGISTER.csv`.

## Grading engine and CI (real isolated tests, not simulated member acceptance)

The existing `v014_training_answer(uuid,uuid,text,integer)` private grader remains the sole protected scorer; no duplicated grader, bypass of `service_role` permission, or client-side answer key was introduced. The GitHub Actions workflow `.github/workflows/b01-protected-assessment-contract.yml` runs:
- actual unmodified PostgreSQL scoring SQL in disposable PostgreSQL 16 with synthetic reviewed fixtures, covering exact/wrong/critical/partial/borderline/invalid/stale/withdrawn/other-user attempts;
- the real Cloudflare member API handler against isolated synthetic HTTP responses, covering safe 422/409/503 classification, question-by-question draft access and refusal to grade withdrawn reviews;
- the existing Owner-editor keyed-echo rejection and rollback-safety constraints;
- new source-level evidence assertions for all 60 conceptual question records and eight full rubrics.

**Both CI jobs succeeded:** [run 40475905919](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40475905919), commit `d41e9d474ba5cb23375f18fc536d11e5db9b5aa8`. Passing CI by itself is TESTED, not member PROVEN.

Production security postflight: `public.lab_training_sets_v014` has RLS on and SELECT grants for ordinary `anon=false`, `authenticated=false`, `service_role=true`; the `private` backup schema denies anon and authenticated USAGE. Production currently stores **100 B01 multiple choices without verbatim key echo, 20 numeric drafts, three individually justified critical flags, twenty matching private rubric backups, zero reviewed sets and zero recorded graded attempts**. These are point-in-time checks, not permanent readiness claims.

## Authenticated member-journey acceptance — held at the correct gate

Owner-authorized production QA must use a genuine account, satisfy real Turnstile, verify entitlement, and submit a genuinely **reviewed version**; it must test correct/incorrect/invalid and no-key-leak responses, remediation, save/resume and expiry without modifying unrelated member records.

This **cannot be marked accepted while all B01 sets remain draft**. The existing `/api/training-editor?action=review` requires a genuinely authenticated Owner plus the explicit `REVIEW BOOK RUBRIC` confirmation and updated-at CAS. Direct database promotion as service role would bypass that Owner ACL; this release deliberately did NOT forge an Owner session or silently flip `review_state`. The existing `Live Lab QA (authenticated, no billing)` workflow also acknowledges a browser-only human Turnstile challenge that may reject a standalone password grant. No CAPTCHA bypass, fake session or test member grade is claimed.

The eight full rubrics have completed technical content checks, but **formal editorial publication approval** remains the existing Owner route; member journey acceptance is therefore awaiting a reviewed and member-ready rubric. Owner authority to write source does not replace genuine authenticated Owner user identity. This dependency does not halt further canonical Lab content improvement.

## Owner acceptance / progression

| Item | Current evidence | Decision |
|---|---|---|
| Remaining 60 question-level concept reviews | Private source audit, 36 corrective edits, production 60/60 read-only checks | ACCEPT editorial content review |
| Eight complete six-question rubric content checks | Independent private arithmetic and six-question source structure on each | ACCEPT content-check evidence only |
| Private backup and rollback | Twenty original rubric bodies, checksums, RLS, audited edits | PROVEN |
| Protected grading branch/regression | Real disposable PostgreSQL plus isolated API and reviewer tests | TESTED |
| Eight formal reviewed rubric versions | Still Draft | NOT ACCEPTED / existing authenticated Owner review required |
| Real authenticated member grade and resume | No real browser test on published reviewed set | NOT PROVEN |
| B01 overall Beta Ready | No blanket promotion; 83 other canonical Upcoming Labs unaffected | NOT ACCEPTED |

### Severity and next path

**High:** Formal eight-rubric Owner review through authenticated original source editor; each approval must recheck current questions, private sources and exact revision, then run genuine signed-in member grading. **High:** public GitHub historic question-generator source needs independent key-compromise review before any official testing credential. **Medium:** full browser accessibility and cross-device QA (390, 900, 1280, 1440 px) remains open. **Medium:** market-replay source license/adjustments and no-future-bar evidence remain separate from conceptual grading.

### Rollback

The existing private source archive table `private.b01_question_backups_20261027` contains original drafts for all twenty B01 Labs. The guard in `supabase/rollbacks/20261027_b01_editorial_private_backup_ROLLBACK.sql` requires draft state, no new attempts and the exact post-edit checksum before restoring. Never force a downgrade past that guard or delete graded member histories. The new correction changed only draft explanations and one narrowly specified risk flag; no LIVE payment setting, Store entitlement or member profile was changed.

**v1.0:** 60 individual reviews, eight complete rubric content inspections, protected storage verification and CI evidence. This report does not claim authentic broker trades, professional certifications, or production member-verified grade acceptance.
