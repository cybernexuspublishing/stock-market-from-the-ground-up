# 2026-10-25-B01 — Boot Camp 1 + Private Lab Content Batch 01 — Migration Gate Evidence

## Document control
- Project: The Stock Market: From the Ground Up (website and publication companion)
- Publisher: Crown & Lantern Press / Cyber Nexus
- Date: October 25, 2026
- Content batch version: 2026-10-25-B01; website release version: **unchanged** (content and noncharging migration-gate review; **not a schema release**)
- Source repository: `cybernexuspublishing/stock-market-from-the-ground-up`
- Branch: `main`; no separate release branch
- File path / type: `docs/releases/2026-10-25_TRUTH5_AND_LAB_BATCH01_GATE.md` / Markdown
- Google Drive location: **Not assigned**; no Drive copy created
- Google Drive document ID: **Not assigned**
- Purpose: Evidence of one full five-day Boot Camp source expansion, exact twenty private instructional Lab updates, security/grade boundaries, and next acceptance gates
- Status: **IMPLEMENTED — UNGRADED SOURCE AND PRIVATE-DATA CONTENT; INDEPENDENT MEMBER / EDITORIAL / PRODUCTION ACCEPTANCE PENDING**
- Dependencies: existing Academy v0.14.0.168, canonical 419 Lab registry, 30 competency definitions, private `lab_instruction_v014`, existing `/api/lab-content`, `lab_training_sets_v014`, existing Supabase entitlement/RLS contracts and Cloudflare Pages build
- Non-scope: LIVE Stripe charge/refund, checkout changes, replacement historical OHLCV, answer-key publication, official skills award, changing prices, additional boot camps

## Scope and observed evidence
1. **Academy `truth5`** — The Truth Behind the Ticker. All five individual days received substantial original lesson paragraphs, labeled **FICTIONAL** worked cases, independently repeatable primary-source research procedures, misconceptions, transfer tasks, and an ungraded self-check. Added an accessible stepwise teaching interface that requires the learner to provide reasoning before showing the formative model answer. Official grading and mastery remain **false**.
2. **20 canonical Labs** — the next twenty by original `platform_labs.sort_order`, not new Lab IDs, were updated *in place* in private `lab_instruction_v014` with specific objectives, concept instruction, rationale, fabricated practice scenarios, at least four practice steps, formative learner question, review guide, risk/uncertainty caveat, and compatible `teaching` structure. The existing book restrictions and protected training review system were not modified.
3. The atomic Supabase content transaction checked **419 active canonical Labs** and twenty unmodified original v96 rows before updating exactly twenty; any mismatched row count would have raised an exception and rolled back.
4. Read-only postflight returned **20 batch rows, 20 content-shape passes, 20 still unreviewed, and 0 reviewed independent assessments**. The private content rows carry `lessonBatch = 2026-10-25-B01`, `authoringStatus = ORIGINAL_AUTHORED_EDUCATIONAL_DRAFT_NOT_EDITORIALLY_OR_GRADING_ACCEPTED`, and no verified historical data claim.
5. Read-only DB grants showed `service_role` grants, **no `anon`/`authenticated` direct grants** on the four touched private instruction, assessment, enrollment and progress tables. All four have RLS enabled and zero public policies; the established authenticated server/secure RPC paths are intentionally authoritative.
6. A dedicated five-day Academy source test was added to the existing Boot Camp GitHub Actions workflow. The final exact-head run and browser test must be checked separately: **a source push is not production deployment acceptance**.

## Exact Lab batch (canonical sort order)
1. `F1-C02-L01`
2. `F1-C02-L02`
3. `F1-C04-L01`
4. `F1-C06-L01`
5. `F1-C07-L01`
6. `F1-C07-L02`
7. `F1-C08-L01`
8. `F1-C08-L02`
9. `F1-C08-L03`
10. `F1-C09-L01`
11. `F1-C10-L01`
12. `F1-C10-L02`
13. `F1-C12-L01`
14. `F1-C13-L01`
15. `F1-C13-L02`
16. `F2-C01-L01`
17. `F2-C02-L01`
18. `F2-C02-L02`
19. `F2-C02-L03`
20. `F2-C03-L01`

## Defects / risks / recommendations
- The pre-existing generic v96 instructions were not complete standalone Labs. A long-form conceptual teaching draft improves content but is not substitute for editorial review, authentic licensed bars, independent graded assessment, and member/browser acceptance.
- The existing Academy v0.14.0.168 enroll/progress/member API was reused. Do **not** create a parallel Lab engine, another 30-day course, or independent credit/mastery ledger.
- All worked prices are fabricated for arithmetic or source-criticism teaching; ticker/date metadata must not be presented as evidence that an actual quote, bid, fill, issuer announcement or trade occurred.
- Separately review any outstanding Supabase `SECURITY DEFINER` executable grants. The current security advisor reported nine anon-executable and 77 authenticated-executable privileged functions; function-by-function contract review is required, not indiscriminate mass revocation. See https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable .
- RLS enabled with no policies is expected on service-only tables; it must remain paired with absence of direct client grants. Do not create broad public SELECT policies to clear informational advisor warnings.
- Password breach protection was flagged as not enabled by the Supabase security advisor; review its availability and Auth configuration without silently changing credentials or account access.

## Migration gate status and rollback
- **Applied:** One atomic, constrained *data/content* update of 20 existing private rows; no new DDL, tables, grants, triggers, SQL functions or formal Supabase migration history row. All historical database migrations remain untouched.
- **Not applied:** Any speculative “next numbered” schema migration. There is no verified incompatible schema contract for this batch, so manufacturing DDL would create schema drift and unwanted deployment risk.
- **Rollback:** Use a **reviewed, targeted transaction** restoring only the twenty `lab_instruction_v014` rows tagged `2026-10-25-B01` to their retained baseline content where source backups exist, without modifying reviewed grading sets or member progress. Since previous complete row snapshots were not stored with this operation, never perform a blind or destructive rollback. A per-record restore requires backup/snapshot verification first.
- **Acceptance remains open:** run the dedicated Academy CI on exact head; review all 20 authored Labs individually with authorized reference materials; verify entitlement segregation including other-book, free sample, Showcase/restricted and regular member; mobile/keyboard/screen reader; chronological replay rights; private grading and progress; and actual Yahoo Cloudflare deployment and authenticated service behavior.

## Revision history
| Version | Date | Change | Acceptance |
|---|---|---|---|
| 2026-10-25-B01 | 2026-10-25 | One Boot Camp authored; 20 private Labs updated; security and rollout gate inventoried | Pending member/editorial/browser QA |

**Document footer:** Crown & Lantern Press / Cyber Nexus — Private educational data lives in Supabase, not the public repository. No payment or historical outcome asserted.

## 2026-10-25 — Acceptance gate continuation and observed failures

### Code implementation and live production checks
- GitHub main authored source: `functions/api/lab-content.js` now authenticates a bearer **before** privileged case reads. Three approved free samples are accessible only to eligible active signed-in members, never anonymous, restricted or Showcase users.
- A premium training member lacking the matching proprietary book receives an explicit 404 from the private book-instruction API, permitting the existing member player to retry its **separately authorized** metadata-only `lab-player-context`. Missing training and book access remains denied. The canonical 419 Lab identifiers and source manuscripts are unchanged.
- `tests/test_lab_batch01_authenticated_access.mjs` covers guest denial, bad token, Showcase/restricted accounts, free samples during optional tool-RPC outages, matching-book access, cross-book isolation, and safe premium orientation, with no private rubric exposure.
- `tests/test_v014168_academy_browser.mjs` adds real Chromium **fixture** assertions for all five-day original instructional material, independent reasoning required before model explanation, fresh Day 2 material, and per-day self-check reset at mobile and desktop widths.
- Exact source commit `160ab9a7a149d9656034ecce8204df7de2178fc5`: [Boot Camp CI success](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40261287192); [Sitewide Playwright success](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40261286647). These tests use mocked credentials/member responses, not a real accepted production member.
- Yahoo-master Cloudflare Pages confirmed successful production deployment of authenticated QA script commit `193ec6dea6f92d83c72ba436aebc69225a924fc8`, preserving the existing production branch `main`.
- Independent **guest production requests** returned HTTP 401 for `/api/lab-content?id=F1-C02-L01`, `/api/lab-player-context?id=F1-C02-L01` and `/api/bootcamp-academy?program=truth5`. The intentional **public** `/api/bootcamp-academy?action=catalog` returned seven program listings. These are genuine deployed guest results, not simulated member acceptance.
- Supabase SQL read-only grading audit: **20 of 20 v96 protected training sets remain DRAFT; 0 of 20 reviewed; all 20 corresponding private instructions remain educational drafts.** No mastery, trade execution or historical authenticity can be certified.
- Supabase privilege audit: `gu_bootcamp_academy_save_v014168` is SECURITY INVOKER; only `service_role` can execute. Existing `v014_training_start` and `v014_training_answer` remain service-role-only RPCs; anonymous and regular authenticated roles cannot execute them directly.

### Hard blocker — actual production login / member journey
- [Authenticated read-only Lab QA run](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40261566827) attempted the intended real QA member but received **Supabase Auth HTTP 400 / `captcha_failed`** before obtaining a session. All 20 Lab and five-day Academy authenticated HTTP requests consequently remain **NOT EXECUTED**; do not misreport the pre-auth failure as an application entitlement success or as proof that the member's password is wrong.
- The standalone QA script currently attempts a direct GoTrue password grant **without a Turnstile challenge token**. With CAPTCHA enforcement, this test method itself is invalid and needs a browser-based member session with a genuine one-time human-completed challenge. The independent [Yahoo master auth diagnosis](../v0.14.0.275_YAHOO_MASTER_AUTH_LOGIN_CAPTCHA_DIAGNOSIS.md) additionally recorded provider errors of `invalid-input-secret`, requiring Supabase's CAPTCHA secret to match the Yahoo Cloudflare Turnstile widget. Both problems must be distinguished.
- **Owner private prerequisite:** Using secure Dashboards, configure the exact Yahoo Cloudflare Turnstile private widget secret in the ONE existing Supabase project under Authentication → Bot and Abuse Protection; never send the secret in chat or commit it. Keep CAPTCHA enabled. Sign in interactively as a dedicated eligible QA member after completing the CAPTCHA. Real acceptance requires adequate Book I, Book II and `ONDEMAND_TRAINING` entitlements, 20/20 authorized lessons, five-day Academy, persisted private reflections, restricted/unauthorized account denial, accessibility, and a genuinely independently reviewed private grading set.
- **Protected grading is still blocked:** twenty `draft` private answer sets cannot be promoted to `reviewed` solely from source shape or a successful browser fixture. Require exact per-Lab grading-key validation, independent learner cases, editorial signoff, and production QA before any change to review state.
- LIVE Stripe operations, billing, founding prices, credits, and payment owner approvals remain untouched.

**Acceptance decision:** Source/security hardening implemented and code regression passed. **Member E2E BLOCKED** (human CAPTCHA/provider secret); **20 assessments UNREVIEWED**; **do not advance to the next Boot Camp or Labs batch**.


## Research-to-teaching nonduplication audit — 2026-10-25 (source work, not release approval)

### Audited sources and evidence boundaries
- Owner-provided `StocksToTrade-Browser-Research (6).zip`, the newest designated archive, was inspected **without importing its private Chrome browser-profile data**. Its `private/observations/RESEARCH_001_300_QA.json` records 300 educational research-complete topic decisions, 317 source rows, zero duplicate source IDs or URLs, and **zero fully complete publication-ready topics**. These 300 entries are a research basis, **not** 300 missing features or 300 accepted lessons.
- Reused rather than recollected the archive's `RESEARCH_001_300_README.md`, `STT_UNIVERSITY_COLLECTION_TRACKER_2026-10-24.md`, `STT_UNIVERSITY_TARGETED_GAPS_2026-10-24.md`, `STT_HISTORICAL_EXAMPLES_SOURCE_SIDE_2026-10-24.md`, and `STT_SITE_ONLY_GAP_AND_API_AUDIT_2026-10-23.md`. Course listings and inaccessible transcripts do not substantiate trading mechanics or profitability. Owner-trusted site observation is not a transferable market-data license.
- Inspected production public pages: `/`, `/learn.html`, `/labs.html`, `/bootcamp-academy.html?program=truth5`, `/bootcamp.html`, `/skills.html`, `/journal.html` and `/ondemand-training.html`. A public page exists for the Registry and Academy, **not** a verified signed-in graduate journey. Existing `functions/_lib/owner-lab-readiness-v01493.js` is the canonical read-only Owner evidence precheck: do not create a parallel status store or count `certifiedComplete:0` as a pass.
- Public outside references used for a separate *demand-signal* cross-check, not a performance study:
  - FINRA Foundation 2025 investor report: https://www.finrafoundation.org/sites/finrafoundation/files/2025-11/NFCS_Investor_Survey_Report_White_Paper.pdf — knowledge weaknesses in margin, short-selling, and past-performance interpretation. This is representative investor-literacy data, **not** a survey of this course's beta users.
  - SEC investor order bulletin updated August 2026: https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-14 — stop orders can become market orders; last price is not a fill guarantee; limit orders can remain unfilled; partial fills and time-in-force differ.
  - Official thinkorswim OnDemand instructions: https://toslc.thinkorswim.com/center/faq/Analyze — explicitly external historical replay with play, pause, step and reset, and limitations.
  - Individual qualitative trading questions (not representative prevalence data): https://www.reddit.com/r/Daytrading/comments/1ppx3wk/newbie_questions_finding_stocks_scanners_setups_how/ ; https://www.reddit.com/r/Daytrading/comments/1vtnyiq/beginner_question_vwap/ ; https://www.reddit.com/r/Daytrading/comments/1vgls0f/what_are_your_must_have_indicators_and_how_do/ ; https://www.reddit.com/r/Daytrading/comments/1w3e1zg/the_hardest_pill_to_swallow_was_realizing_my/ . These motivate learner questions, not strategy validity.

### Priority crosswalk: improve existing modules, do NOT add duplicate courses or competencies

| Priority | Specific learner problem and evidence | Existing destination (not a new SKU/Lab ID) | Distinct required teaching and beta acceptance test |
|---|---|---|---|
| P0 | Cannot separate a source claim from proof; screenshots, lookalike domains, historical periods | **truth5**, existing 5 days; Lab B01 source-foundation exercises | Five **new fictional independent investigations** added directly to original truth5 lessons; test source URL identity, original SEC filing/exhibit, availability cutoff, reverse-split normalization and unsupported catalyst; ungraded model feedback only; no fabricated historical tape |
| P0 | Trade orders confuse trigger, displayed quote and fill; limit order can fail to fill | **risk60** and original **foundations30** order-operations days; existing execution Labs | Fictional limit/market/stop/stop-limit orders with book depth, partial fill, changed best quote, cancellation uncertainty and time-in-force; compare total executed shares and realized cost, not only quoted price. Ground conceptual rules in SEC bulletin and relevant source batch XI/XII |
| P0 | New traders know chart names but cannot justify risk or refrain from a trade | **risk60**, **practicum90**, shared no-trade labs and Journal | Written entry/invalidation/risk decision *before* any reveal; simulate alternate spread, costs, gap-loss and unfilled-order branches; process decisions separate from P&L; include negative and unresolved cases |
| P1 | Scanner settings produce misleading candidates when universe, refresh interval, or data age is unknown | Existing **watchlist7** and **scanners10** days | Show explicit price/float/volume units, current market session, stale/missing fields and rejected false positives; reproduce a candidate with an independent filtering worksheet; never advertise access to StocksToTrade proprietary live scanner inputs |
| P1 | VWAP/EMA lines differ with session, input, history, and provisional vs closed candles | Existing **charts45** and relevant VWAP/candle Labs | Teach VWAP from zero, label input population and reset, show the actual line when referenced, compare equal-interval cases; freeze a historical decision and reject future bars. Use archive batches XVIII/XIX; do not imply VWAP reveals traders' inventory or a guaranteed bounce |
| P1 | Nominal price gains after a split or a volume-to-float headline look like execution edge | Existing **truth5** Day 4, **scanners10**, source-critical share-structure Labs | Verify as-of float, corporate action, source period and denominator; calculate a one-for-ten reverse split with unchanged illustrative holding value; teach repeat transactions versus unique owners |
| P1 | Watchlists are confused with next-day certainty; catalyst article dates and market timestamps differ | Existing **watchlist7**, **truth5** Day 3 and capstone | Create candidate ledger with issuer source, original publish time, candidate removal reasons and an independent no-trade ranking. Archive's UAVS/NETE/IPWR historical pointers are **not** verified ex-ante outcomes |
| P1 | Replay learners use later price data in earlier decisions | Existing **practicum90**, **charts45**, shared blinded replay and external `ondemand-training.html` | Lock decision timestamp and pre-outcome reasoning, step forward only after commit, log accessible versus hindsight data; independent dataset rights/date/timezone/adjustment review before any real ticker case |
| P1 | Bid/ask, Level II and Time & Sales screens are treated as proof of market participants' intent | **risk60**, **charts45**, existing Reading the Tape Labs | Explain displayed depth vs traded volume, cancellations, crossed/locked states, venue/feed scope, latency and inference uncertainty; use clearly fictional quote snapshots until licensed timestamped evidence exists |
| P2 | Psychological discipline anecdotes are treated as proof a strategy works | Existing **risk60** and **practicum90** process-compliance days | Track plan deviation, moving stop, revenge or bored entries, and no-trade records over repeated fictional cases; do not promise a profitability improvement or recommend a unique indicator combination |

### Content implementation made in this pass
1. Appended a discrete `lesson.investigation` to **each of the existing five** `truth5` lessons within `functions/_lib/bootcamp-academy-v014168.js`. These are substantive new original application scenarios, not copies of the existing `workedExample`, additional official competencies, or new products.
2. Exposed these in the existing `assets/js/bootcamp-academy-v014168.js` instructor lesson flow as **Independent evidence investigation**, while retaining a **single** ungraded learner self-check, no Sparks charge, no score, no answer-key exposure and no second progress service.
3. Expanded `tests/test_v014168_academy_family.mjs` and `tests/test_v014168_academy_browser.mjs` to require five distinct fictional application cases, mobile/desktop instructional visibility and day-specific case changes. Source CI passes must be verified at the exact new commit.
4. Corrected stale `learn.html` and `bootcamp.html` copy that misleadingly implied this website included a trading **Simulator**. Both now explicitly locate simulated brokerage orders in external **thinkorswim OnDemand**; `tests/test_v014168_academy_family.mjs` prevents reintroducing that claim.
5. Reused all original course identities, 419 canonical Lab IDs, thirty official competencies, existing Owner readiness precheck, Supabase service-role assessment protection and the approved v3.2/v3.3 shared Learning Engine. No new schema, Stripe workflow, credentials, source-data publication, or user history changes.

### Production and editorial boundaries still open
- P0 CAPTCHA: actual Yahoo Turnstile-to-Supabase Auth **secret equality** and interactive human challenge remain unproven. Do not disable CAPTCHA or claim a CI password grant proves successful login.
- P0 all 419 existing protected `lab_training_sets_v014` are drafts; **zero** have verified independently approved rubrics. Do not convert them to reviewed or grant official mastery.
- P0 five-day ungraded self-check is **not** the independently persisted graded answer record; private reflection and genuine member resume must be tested separately. Five new case texts are **IMPLEMENTED**, not editorially reviewed or proven in a production member session.
- P0 historical examples in the latest archive (including KNOS, UAVS, WKHS, CREX and CIDM) contain selected source pointers, not comprehensive licensed timestamped OHLCV, broker fills or independently verified profitability. Use hypothetical examples until each evidence packet passes.
- P1 336-Lab minimum beta target is not the 419 source-record count. The current release remains B01; do not promote B02 or another Boot Camp before individual gating.
- P1 `docs/CAPABILITIES_AND_GAPS.md` contains obsolete planning claims and historical product states; the current main branch plus per-item evidence ledger supersede old proposals. Never reconcile by deleting historical release documents.

**Gate sign-off:** Research audit and original application-content increments **IMPLEMENTED**. Source/browser tests subject to exact-head CI confirmation; external-source claims independently qualified. Actual signed-in Gate 0, protected grading, and each individual's editorial/production Beta Ready state remain **BLOCKED**.


## Gate 1 continuation — new B01 protected draft cases (October 26, 2026)

### Applied roles
Curriculum architect, market-structure subject specialist, assessment author, private database engineer, frontend instructor engineer, and browser QA reviewer.

### Updated Gate 0 prerequisite
The Owner explicitly confirmed that account login and human CAPTCHA now operate correctly. Accept that **user-reported operating status**, discontinue repetitive CAPTCHA troubleshooting, and proceed with Gate 1. This report is not a replay of the Owner's authenticated session, and no independently observed signed-in learner save/resume trace has yet been provided. Further Gate 1 acceptance therefore remains evidence-gated.

### Private individualized assessment authoring
- The **twenty same IDs** and `lessonBatch='2026-10-25-B01'` were checked transactionally before write.
- One new **version 97 draft** was added to each existing Lab's protected `lab_training_sets_v014`. Each version contains the four unchanged generic v96 questions plus **two original concept-specific questions**, one applied hypothetical case and one evidence/limitation diagnostic, totaling **six** for each Lab and **40 new individual questions** overall.
- A single constrained transaction verified all 20 new records, exact question count, required private key IDs, and `reviewed_by` / `reviewed_at` null before commit. Read-only Supabase postflight independently showed **20/20 v97 drafts with six questions and both key IDs present; 0 reviewed sets**. Each correct choice is stored in existing service-role-only protected grading data, not written into the public GitHub repository.
- New `source_status='original_hypothetical_b01_individual_review_pending_v01497'`; `review_state='draft'`, NOT published or graded. The original v96 records, all earlier grading versions, member attempts and snapshots are preserved. The existing API offers reviewed versions only; new questions are **not** offered for assessment until independent QA and editorial acceptance.
- No additional canonical Lab IDs, teaching engine, competency definitions, market feeds, payment objects, or production-grading approvals were created.
- Each of these independently written application and limitation items needs human/independent subject review, option ambiguity checks, learner correct/incorrect/partial/invalid test cases, entitlement security and real production member grading proof before Beta Ready.

### Existing Boot Camp 1 progress improvement
- `assets/js/bootcamp-academy-v014168.js`: after a learner writes an answer to the established **ungraded** self-check, a button **Add reasoning to my private reflection** allows explicit copying into the existing stored-reflection draft, without changing program status or auto-saving. A clearly worded notice tells members to enroll and select Save Reflection. Oversized and duplicate insertions are rejected, and the existing private reflection is preserved on append.
- On account change, the prior member's unsaved teaching inputs are removed from the DOM alongside the established stored-reflection clearing. The original private Academy API, versioned revision checking, progress table, protected grading service and canonical 30-day competency records remain authoritative.
- `tests/test_v014168_academy_browser.mjs` was updated for the copied-to-reflection flow, no implicit backend save, save/resume through the existing mock member API, and the cleared self-check DOM after account change. **Passing local/CI fixtures remain TESTED, not real-member PROVEN.**
- Code commits: [explicit copy](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/commit/b522fdfc13d482e7b81ec2f62e6f07698253b5a4), [newline and account switching](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/commit/13ff2528e7ab2a361d55b500fd8d218b9b310e08), [browser regression](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/commit/a3856168e6d2075e72cfd2df0b1413f507b0fcf5).

### B01 per-item authoring progression (individual production acceptance not inferred)
| Canonical Lab ID | Topic of new independent case | Verified source and review status |
|---|---|---|
| `F1-C02-L01` | Replay completion boundary | Authored (draft), v97 6 questions; editorial/production pending |
| `F1-C02-L02` | Independent no-hindsight replay | Authored (draft), v97 6 questions; editorial/production pending |
| `F1-C04-L01` | Secondary share transactions | Authored (draft), v97 6 questions; editorial/production pending |
| `F1-C06-L01` | Candles versus inferred motives | Authored (draft), v97 6 questions; editorial/production pending |
| `F1-C07-L01` | Common equity ownership | Authored (draft), v97 6 questions; editorial/production pending |
| `F1-C07-L02` | Index versus ETF exposure | Authored (draft), v97 6 questions; editorial/production pending |
| `F1-C08-L01` | Large-company market cap | Authored (draft), v97 6 questions; editorial/production pending |
| `F1-C08-L02` | Small-company market cap and split | Authored (draft), v97 6 questions; editorial/production pending |
| `F1-C08-L03` | Quoted spread and available liquidity | Authored (draft), v97 6 questions; editorial/production pending |
| `F1-C09-L01` | Account-specific buying limits | Authored (draft), v97 6 questions; editorial/production pending |
| `F1-C10-L01` | Long-position mark and cost | Authored (draft), v97 6 questions; editorial/production pending |
| `F1-C10-L02` | Short exposure and unbounded risk | Authored (draft), v97 6 questions; editorial/production pending |
| `F1-C12-L01` | Credible sources versus trade suitability | Authored (draft), v97 6 questions; editorial/production pending |
| `F1-C13-L01` | Scalping horizon versus overnight | Authored (draft), v97 6 questions; editorial/production pending |
| `F1-C13-L02` | Style, approach, setup and context | Authored (draft), v97 6 questions; editorial/production pending |
| `F2-C01-L01` | Equity market sessions in ET | Authored (draft), v97 6 questions; editorial/production pending |
| `F2-C02-L01` | Opening versus midday volume | Authored (draft), v97 6 questions; editorial/production pending |
| `F2-C02-L02` | Midday versus afternoon range | Authored (draft), v97 6 questions; editorial/production pending |
| `F2-C02-L03` | Late quote versus closing auction | Authored (draft), v97 6 questions; editorial/production pending |
| `F2-C03-L01` | Regular-close versus after-hours print | Authored (draft), v97 6 questions; editorial/production pending |

### Release decision
- **IMPLEMENTED**: Five original truth5 daily lessons and 20 Lab private instructional drafts already present; 40 additional specific v97 protected draft assessment items; learner-initiated reflection-copy UI with member-switch privacy cleanup; new browser assertions.
- **TESTED**: Database postflight 20/20 private v97 rows and key-field presence; GitHub browser fixtures require actual CI success evidence before asserting a pass.
- **PROVEN**: The new private DB draft rows exist. This does not prove editorial correctness, learner experience, protected grading execution, or production member persistence.
- **BLOCKED / carried forward**: Independent editorial review for each of twenty, true production member progress and access, reviewed version activation, real graded attempts, and complete mobile/keyboard/screen reader acceptance.
- **No advancement**: Keep `truth5` and B01 open. Do not start B02 or a second Boot Camp until Gate 1 passes on real-member evidence. Keep LIVE Stripe untouched.


### Batched Gate 1 technical acceptance — twenty-ID cross-book checks and honest review status
- Fixed the technical B01 v97 review-bypass defect in the **existing** Training Editor, with new topic-specific application/limitation validation and Owner-only explicit review. Exact GitHub code `f244862924c6320fbb56c423a1ebb77371c2389a`, CI: [419 Lab Topic Rubric Gate success](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40269967843). [Issue #140](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/issues/140) closed for the review-contract fix; **not** for final B01 educational acceptance.
- Existing read-only Owner Lab readiness precheck now reports `individualizedB01Drafts` (plus per-item boolean) while keeping `substantivePrivateLessonPrecheck=false` on original unreviewed content and `certifiedComplete=0`. UI does not mislabel those drafts as reviewed.
- Private DB read-only per-item audit: **20 of 20** v97 draft sets contain exactly six distinct question IDs, corresponding private keyed answers, both distinct application/limitation questions, and minimum case prompt/explanation lengths. Count of reviewed rubrics remains **zero**. Original 419 v96 drafts preserved.
- New extension of `tests/test_lab_batch01_authenticated_access.mjs` evaluates *every* one of the same twenty B01 Lab IDs through the existing Cloudflare/Supabase API fixture, with matching Book I or Book II ownership, cross-book denial, private teaching batch label, and no reviewed assessment claim or answer-key exposure. This is a mocked authenticated contract **not** real member persistence; record successful CI separately before claiming TESTED.
- Boot Camp member reflection draft retention and multi-day account isolation remain integrated into the original Academy controller and test suite. Never treat unsaved in-memory drafts as backend progress. The real `truth5` progress table still had **zero** recorded day saves at the last read-only check. Human-authenticated on-site return visits remain a distinct release gate.
