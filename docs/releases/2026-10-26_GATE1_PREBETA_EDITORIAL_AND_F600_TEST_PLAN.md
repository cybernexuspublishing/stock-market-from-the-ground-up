# Gate 1 Pre-Beta Readiness — Truth5 and Canonical Lab Batch B01

**Project:** The Stock Market: From the Ground Up  
**Record:** GATE1-PREBETA-2026-10-26  
**Owner authority:** Delegated nonpayment engineering review; no authority to fabricate human login evidence or reviewer attribution  
**Branch:** `main` (no secondary branch)  
**Scope:** Existing **Truth5** five-day Boot Camp plus EXACT twenty `2026-10-25-B01` Lab IDs. No B02 or other Boot Camp changes.  
**Version:** Existing platform and shared v3.2 visuals/v3.3 controls preserved; private assessment draft **97**.  
**Product state:** PRE-BETA ENGINEERING / EDITORIAL REVIEW; not certified Founding-600 member-ready until individually approved.  
**Supporting detailed record:** `docs/releases/2026-10-25_TRUTH5_AND_LAB_BATCH01_GATE.md`

## Executive decision

The Owner instructed us to **complete all work possible before real beta testers**, using the Founding 600 cohort for authentic member journeys and feedback. This separates two genuine thresholds:

- **Pre-beta acceptance:** Complete safe authored lessons and exercises, source-based educational QA, private grading and permissions, feedback/bug reporting paths, responsive automated checks, build+deployment, Owner review and editorial activation. Neither mocked-member CI nor a guest 401 establishes real member completion.
- **Beta acceptance:** Real entitled members independently enroll, work through five days, save/reload/resume, change account/session, receive teaching and remediation, complete reviewed protected rubric attempts, encounter correct entitlements and restrictions, demonstrate accessible navigation, and file actionable bugs and qualitative ratings. Evidence must include appropriately redacted member event logs and true deployed commit.

**No grading review promotion may be performed by bulk SQL or by pretending to be a signed-in Owner.** The pre-existing Owner-only `training-editor` review action records the actual reviewer and must be used for each of twenty assessments. Draft structural pass alone is not approval.

## Completed private-content authoring / individual review register

All twenty rows below have one private v97 assessment with **six** distinct items: evidence, learning focus, subject-specific fictional calculation, decision boundary, independent application and limitation. Protected correct answers remain in `lab_training_sets_v014`, NOT this repository. The four former generic questions in each assessment have been replaced in the private drafts (80 authored replacements overall, including 20 prior numeric replacements and 60 evidence/focus/boundary replacements). All original 419 v96 sets are unchanged.

| Canonical Lab | Topic | Independent editorial checks | Current disposition |
|---|---|---|---|
| `F1-C02-L01` | Completed-bar replay and timestamp convention | Replay cutoff; five-minute interval; future-bar exclusion | Draft complete; Owner approval pending |
| `F1-C02-L02` | Repeatable blind replay | Contamination; evidence equivalence; extra-bar count | Draft complete; Owner approval pending |
| `F1-C04-L01` | Primary issuance versus secondary transfers | Share transfer; issuance evidence; gross trade value | Draft complete; Owner approval pending |
| `F1-C06-L01` | Completed candlesticks and attribution limits | OHLC body; unknowable participant identity | Draft complete; Owner approval pending |
| `F1-C07-L01` | Common equity ownership | Share fraction; class rights; no dividend guarantee | Draft complete; Owner approval pending |
| `F1-C07-L02` | Index versus ETF exposure | Index points versus fund shares; expenses and spread | Draft complete; Owner approval pending |
| `F1-C08-L01` | Large-company market capitalization | Shares × price; size versus execution liquidity | Draft complete; Owner approval pending |
| `F1-C08-L02` | Small-company capitalization and reverse splits | Split adjustment; capitalization preservation | Draft complete; Owner approval pending |
| `F1-C08-L03` | Sparse trading and bid–ask friction | Spread; depth; no guaranteed fill | Draft complete; Owner approval pending |
| `F1-C09-L01` | Account buying-power constraints | Share count; settled funds; separate position risk | Draft complete; Owner approval pending |
| `F1-C10-L01` | Long exposure and marked losses | Unrealized versus realized; exits and cost | Draft complete; Owner approval pending |
| `F1-C10-L02` | Short exposure and adverse price risk | Price rise; borrow costs; uncapped loss | Draft complete; Owner approval pending |
| `F1-C12-L01` | Source reliability versus trade suitability | No-trade; liquidity; no hindsight | Draft complete; Owner approval pending |
| `F1-C13-L01` | Intraday scalp horizon | Intended versus actual hold; overnight risk | Draft complete; Owner approval pending |
| `F1-C13-L02` | Trading style, setup and context | Risk invalidation; spread veto; no trade | Draft complete; Owner approval pending |
| `F2-C01-L01` | Equity session timestamps | Regular versus extended; venue/order eligibility | Draft complete; Owner approval pending |
| `F2-C02-L01` | Open versus midday share volume | Ratio; sample limits; no universal claim | Draft complete; Owner approval pending |
| `F2-C02-L02` | Late-day range comparison | High–low distance versus open–close direction | Draft complete; Owner approval pending |
| `F2-C02-L03` | Closing auction versus preclose quotes | Quoted spread; auction evidence | Draft complete; Owner approval pending |
| `F2-C03-L01` | Regular close versus after-hours trade | Relative price; volume/depth fill limits | Draft complete; Owner approval pending |

For EACH row individually, the authentic Owner reviewer must verify factual and mathematical correctness, absence of multiple plausible right answers, distinct plausible distractors, no answer leaks before completion, useful feedback for incorrect responses, no false historical price-data assertion, zero-knowledge lesson alignment, and a real no-trade/risk alternative. The Owner review action must require the explicit review phrase and record `reviewed_by`/`reviewed_at`. **The table is an editorial review worksheet, not twenty completed human sign-offs.**

## Pre-beta release technical controls

1. **Existing login/CAPTCHA:** The Owner confirmed both work. Do not reopen these without new evidence. Use the Yahoo canonical hostname; do not put credentials, session tokens or provider secrets in evidence.
2. **Private teaching and keys:** `lab_instruction_v014`, `lab_training_sets_v014`, Academy enrollment/progress use service-role-only storage and member entitlements. Anonymous responses must not reveal protected records or hidden questions.
3. **Grading:** `interactive-training` uses existing server-side `v014_training_start`/`v014_training_answer` RPCs, per-actor permissions, pinned review version and step CAS. Draft rubrics are not available. Review withdrawal is fail-closed on available/start/resume; existing graded history is retained.
4. **Training engine:** Keep shared Learning Journey `Start, Learn, Experiment, Predict, Practice, Assess, Review, Transfer, Results`; instructor Talia is the member's teaching guide. Distinguish ungraded self-check from official protected assessments.
5. **Truth5:** Each of five days teaches before checking: claimant/source credibility, SEC EDGAR filer and reporting periods, no-lookahead chronology, quantitative denominators/split adjustments, independent capstone and no-trade conclusions. SEC EDGAR acceptance timestamp does **not** equal first verified public availability. See https://www.sec.gov/about/webmaster-frequently-asked-questions.
6. **Private progress:** Enroll explicitly; typed 80–2,000-character reflections are saved only via the existing optimistic-revision-controlled API. An unsaved per-day draft is NOT server progress. Another member/account must not inherit prior DOM input. Concurrent revision conflict must preserve typed draft for conscious recovery, not award completion.
7. **Responsive QA:** Existing Chromium CI covers 390, 900, 1280 and 1440-pixel widths, stage/navigation controls, account-switch clearing, keyboard focus, return to earlier day, and no false saves. Manually verify screen reader announcements, zoom, reduced-motion preferences and 44px-equivalent interactive targets on mobile before final accessibility sign-off.
8. **Related books:** Truth5 instructions stand on their own; optional links to canonical books are separate entitlements. Do not imply a free book license, actual in-site trading simulator or guaranteed profit.
9. **Production safety:** No LIVE Stripe, no secret changes, no B02, no additional Boot Camp program, no new canonical Lab IDs. Deploy from `main` into the authorized Yahoo Cloudflare account only. Distinguish exact-head CI passes from superseded/cancelled runs.

## Founding 600 beta acceptance — use real members, not fixtures

**Pilot account roles:** Existing Owner and test-member accounts may exercise authorized dry-run navigation, but do not invent their sign-in results. The 600 founding seats are shared across the 30-day and 60-day offers, and permission to run this education beta is not authorization to charge LIVE Stripe.

### Cohort member journeys

- **A. Entitlement matrix:** Founding members see only included courses/books/tools; separate Book I/II rights checked. Free/expired/restricted/Showcase/nonmember roles must be denied appropriately. Opening a deep Lab link before sign-in returns to the intended Lab after login.
- **B. Boot Camp 1 five-day continuity:** Enroll, complete Day 1 source ledger, use Day 2 EDGAR reference, Day 3 chronology replay, Day 4 quantitative check and Day 5 independent source-audit transfer. Sign out and return; verify each saved day, expected revision and no fabricated mastery/grade.
- **C. Twenty Lab assessments:** After individual Owner review, check exactly those twenty Lab routes and all appropriate question modes. Include one correct, incorrect, free response and correction/remediation pathway; confirm protected answer feedback only at allowed stage and current version remains pinned through resumes.
- **D. Privacy and concurrency:** Two different members, two browser tabs for one member, refresh, revoked access, permission changes and account switch. Test stale revision handling and no cross-account leakage.
- **E. Accessible learning:** Keyboard-only, voiceover/screen reader on representative devices, mobile 390px, desktop 1440px, focus order, aria live notices, contrast, touch size and charts/candlestick descriptions.
- **F. Founding beta feedback:** Use the existing Founders Commons `F600_BUGS` and `F600_SUGGESTIONS` forums plus the existing support queue; do not build a duplicate beta issue tracker. File findings with Lab/day, source version, steps to reproduce, expected/actual behavior and redacted screenshots only.
- **G. Founding 600 wide-member platform checks (separate release gates):** Library, profile, subscription display, Sparks wallet and purchase distinction, Owner messaging, community rights, watchlist, Tools, Help, UI themes and renewal/cancel surfaces. Do not start LIVE payments under Gate 1 authority.

### Beta sign-off rule

A release ticket needs (1) exact source/deployed SHA, (2) verified signed-in member role and matching entitlement without revealing PII, (3) reproducible steps, (4) real progress/attempt record or denial evidence, (5) responsive/accessibility outcome, (6) no unauthorized answer-key exposure, and (7) explicitly adjudicated failures.

**Beta ready is not beta tested.** Opening Founding 600 beta is an Owner-controlled rollout decision. Passing fixtures or checking an endpoint as a guest is insufficient to mark any real-member criterion passed.

## Pending at creation

- Latest exact-head GitHub checks and Yahoo deployment must be read independently. Superseded workflows do not count.
- There are no genuine saved `truth5` day rows or B01 v97 member assessment attempts at the most recent database checkpoint. These are **expected beta evidence gaps**, not grounds to falsify results.
- **Twenty separate authentic Owner assessment approvals** still required before enabling version-97 protected grading for members. This cannot be faked through direct database writes or guessed identity.
- Full independent manual accessibility and real-member acceptance are delegated to the Founding 600 beta stage.

**Rollback and privacy:** Revert source via `main` and redeploy only when authorized; do not delete study progress or scored attempts. Newly authored v97 remains private draft until individually reviewed. Keep answer keys and member records in Supabase private tables.

