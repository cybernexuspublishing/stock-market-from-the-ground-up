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

### Gate 1 source-correctness and persistent-study acceptance addendum

- Independently reviewed the original B01 Lab-specific application/limitation cases against all twenty canonical individual objectives. Discovered two **classification-specific educational errors** that structural rubric tests alone did not detect: `F1-C08-L01` was labeled mega-cap while illustrating $150B (below FINRA's illustrative $200B mega-cap floor), and `F1-C08-L02` was labeled small-cap while illustrating $120M (within FINRA's micro-cap range). Source: [FINRA market-cap definitions](https://www.finra.org/investors/insights/market-cap) and [SEC microcap guide](https://www.sec.gov/investor/pubs/microcapstock.htm).
- Corrected those two fictional private lessons in **existing** `lab_instruction_v014`, and their matching private v97 application prompts, options, explanations and protected correct-answer values atomically. New examples: 5B shares × $50 = **$250B mega-cap** and 100M shares × $4 = **$400M small-cap**. Transaction enforced B01 source/status, unchanged canonical IDs and unreviewed version. No original v96, personal attempts or historical dataset was changed.
- Existing member assessment API `functions/api/interactive-training.js` **already shuffles** choices deterministically per pinned attempt and question while answer keys remain server-side. It was inspected and reused, not duplicated or replaced.
- Strengthened original Boot Camp Academy save flow: responses for a background Day 1 write cannot overwrite visible Day 2's status message; a concurrent stale-revision failure preserves the typed draft. Existing `tests/test_v014168_academy_browser.mjs` now tests **reload-to-server-restored-reflection** and a forced version conflict against its local Chromium fixture. This is *not* an independently authenticated production browser session.
- **Status:** Content corrections implemented; mechanical postflight and exact-commit CI remain required. No B01 assessment is editorially approved solely from automated subject-alignment checks. No LIVE Stripe or B02 changes.

- **Enrollment/status truthfulness:** fixed misleading Academy messaging that previously claimed notes were saved immediately upon enrollment; only an explicit persisted reflection can qualify. An idempotent Start on a previously saved day now reports the retained reflection rather than suggesting no note exists. The Chromium Academy fixture mirrors the actual SQL `ON CONFLICT DO NOTHING` behavior and checks saved revision/content preservation. Tests do not fabricate real production sign-ins.
\n## Gate 1 integrated learning-integrity and accessibility increment — 2026-10-26\n\n- Source implementation: the **existing** Academy controller now retains each Truth5 ungraded self-check answer **only within the current in-memory member session**, independently by day. It marks local unsaved work explicitly in the day navigator, never records an attempt automatically, and never awards grading or Crownlight Sparks. The original user-authenticated, revision-controlled Save Reflection remains the only private persistence path. Account changes and page reloads discard unsaved self-check drafts.\n- The optional related-Lab area explicitly explains the difference between a Boot Camp lesson and separately book-entitled Labs; external book purchases are not silently included. No entitlement policy or Lab ID was changed.\n- Updated Academy browser fixture exercises 390px, 900px, 1280px, and 1440px, per-day isolation and return, focusability, fictional-source teaching, account-switch clearing, and the existing save/conflict behavior. Passing fixture CI is TESTED, **not a real authenticated production save**.\n- No new content is independently editorially reviewed by these UI changes. Original twenty private v97 rubric drafts remain unreviewed; version-96 records and thirty approved Boot Camp competencies remain untouched.\n

## Gate 1 assessment-feedback and browser-regression follow-up — 2026-10-26

- B01 private assessment editorial authoring improved **both** teaching explanations for the application and limitation question across **all 20 existing v97 drafts** (40 expanded subject-specific responses). The updates explicitly teach arithmetic, evidence boundaries, uncertainty and common misconceptions. Example evidence includes secondary issuance versus share transfer, market cap versus liquidity, short-sale adverse exposure, bid/ask versus executable order depth, ordinary versus extended sessions, and no-hindsight replay.
- Guarded single transaction confirmed the canonical twenty version-97 sets were all unreviewed and contained the expected two IDs; updates changed only `questions[4].explanation`, `questions[5].explanation`, and row `updated_at`. Original v96 assessments, protected keys, prompts, answers, member attempts, entitlement policies and LIVE payments were not changed. Postflight: **20/20 sets remained draft; 20/20 case and limitation feedback now exceed 120 characters; 20/20 keys retained; 0 reviewed**.
- A new **read-only, exact twenty-ID** SQL audit at `supabase/reviews/2026-10-26_B01_v97_feedback_audit_read_only.sql` independently checks content shape and records **FALSE** for editorial approval and production member acceptance. It exposes only booleans and IDs, not protected answers.
- Initial four-breakpoint Playwright regression failed because a test asserted a Day 1 self-check would be empty after navigating away. The improved behavior intentionally retains the same account's Day 1 draft; the regression expectation was corrected and strengthened to require **clearing on full reload and account switch**, while preserving only server-saved reflections. Exact-head rerun is required before TESTED status.


## Gate 1 coordinated continuation — grading withdrawal, EDGAR chronology and B01 editorial triage

**Scope:** The same Truth5 Boot Camp and exactly twenty canonical B01 Labs. Main branch only. No member attempt, original v96 assessment, official 30-day competency, LIVE billing or secondary Boot Camp was modified.

### Production grading review-withdrawal gap — corrected in API source

- `functions/api/interactive-training.js` now refuses to serve pinned question text from a previously reviewed rubric when its `review_state` has since changed away from `reviewed`. This applies to both resumed `start` responses and the direct `resume` endpoint; HTTP 409 replaces unreviewed question delivery. Scored records are not deleted and remain in separately authorized learning history.
- `tests/test_b01_review_withdrawal_and_private_grading.mjs` covers the **same twenty** canonical B01 IDs, availability and start denial for drafts, revoked pinned attempt denial, and a positive original-version continuation example after review. These are mock network fixtures, not an authenticated production student.
- The existing SQL grading RPC `v014_training_answer` already requires `review_state='reviewed'` before grading. Do not replace it or invent a parallel grader. Private tables retain RLS and lack direct `anon` / `authenticated` SELECT grants.
- The Lab Topic GitHub workflow includes the new regression. [Verified passing Lab Topic gate](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40276894463) on `e2d2496bb11f`. Subsequent `main` commits require their own exact-head acceptance.

### Subject factual review

- Truth5 Days 2–3 now explicitly distinguish SEC EDGAR **filing acceptance time**, **observed public availability** and **the fiscal period represented**. The SEC explains that website availability often lags acceptance, generally by 1–3 minutes and potentially longer; do not backdate public knowability based solely on a filing timestamp. Source: https://www.sec.gov/about/webmaster-frequently-asked-questions
- This is a teaching correction, not a verified historical price replay or evidence that members learned the distinction. Source family and browser fixtures must run on the exact affected commit.

### Twenty-Lab rubric quality audit

- All **twenty B01 v97** rubrics were checked against the private database; **zero** were approved, and **zero** historical attempts were pinned to B01 v97 during the guarded editorial correction.
- Replaced **twenty unrelated high-minus-low v96 template numerics** with twenty individual Lab-specific hypothetical calculations and matching privately stored numeric correct values. Subject-specific examples cover replay duration, contamination count, secondary trade gross value, candle body, percent common ownership, ETF notional exposure, capitalization, spread, account quantity, long and short exposure, trading horizon, session minutes, relative bar volume, auction quote spread and after-hours price difference. A single atomic guarded transaction returned **20 updated rows**; postflight independently confirmed 20 specific numeric questions, 20 valid numeric answers and **20 still draft**.
- **Editorial blockers not cleared:** The inherited `EVIDENCE`, `FOCUS`, and `BOUNDARY` questions remain generic template items in all twenty sets (**60 question prompts require replacement and independent subject review**). An attempt to stage those replacements did not satisfy pre-execution authoring checks and was NOT sent to the database; do not imply it was implemented.
- Even after the remaining 60 items are rewritten, each of the twenty Lab rubrics still requires individually checked correct and incorrect answer reasoning, ambiguity testing, accessible feedback, member entitlement, and genuine authenticated end-to-end grading. No bulk review promotion is allowed.
- A member-persistence blocker also remains: the real database still reports **no truth5 Academy enrollments/day progress evidence**. Source CI and guest 401 responses are separate from a real signed-in save, logout, return and resume.

**Sign-off:** Technical source safeguards IMPLEMENTED and independently audited private numeric records PROVEN; Lab Subject Editorially Reviewed **0/20**, Beta Ready **0/20**, Boot Camp 1 Beta Ready **NO**. Gate 1 stays open; B02 and all LIVE payment testing remain outside scope.


## Gate 1 pre-beta consolidation — October 26, 2026

**Authority and boundary.** The Founding 600 accounts are designated for real signed-in member acceptance of all member features. No additional user accounts or testing portal were created. The existing Founder-only Commons Beta Test Center now includes targeted Truth5 and cross-book B01 workflows, with private Support escalation and safeguards against publishing credentials or answers.

**Protected original source.** A guarded, exactly twenty-row update replaced all **60 remaining generic v96 EVIDENCE/FOCUS/BOUNDARY prompts** within the **existing** v97 draft grading sets. This follows the previously completed 20 individual numerical exercises and 40 original application/limitation questions. No question IDs, canonical Lab IDs, v96 records, historical attempted grades, or LIVE billing settings were created or overwritten. A data postflight found **20/20** six-question rubrics with **six distinct IDs and private keys per set**, **five distinct-answer multiple-choice items per Lab**, no over-limit choice, and 20/20 still marked **draft**. An inaccurate phrase describing market capitalization as a secondary transfer was also repaired, still in the draft only.

**Approval control.** The existing Owner Training Editor API now refuses B01 v97 review if any of its six questions is missing, generic-template, ambiguous, unkeyed or not properly explained. The Editor warns that the structural precheck is **not** independent content review. Promotions must still take place through the authorized single-Lab Owner review action with a truthful reviewer record. We did not forge Owner signatures or use an unlogged bulk SQL review update.

**New repeatable evidence.** Run `supabase/reviews/2026-10-26_GATE1_FOUNDING600_B01_PREFLIGHT_READ_ONLY.sql` to list exact Lab-by-Lab outcomes without revealing private keys or member details. The Founder test center contract is asserted by `tests/test_gate1_founders_beta_handoff.mjs`, included in the existing Boot Camp workflow.

**Pending before any beta-ready certification.** Editorial correctness and individual Owner approval for all twenty rubrics, exact-head CI acceptance, authenticated browser save/logout/resume and live protected grading, keyboard/screen-reader review and Founding 600 member observations remain distinct. The beta member tests are the final designated real-account gate; do not falsely certify them through fixture tests or guest-only checks. The baseline user-approved seven-Boot-Camp, 336-Lab eventual beta target is unchanged; do not start a second Boot Camp/B02 while Truth5/B01 is open.


## Gate 1 Owner-grade integrity acceptance increment — 2026-10-26

**Roles:** Owner delegate, application security, database architecture, assessment QA, DevOps/release engineering, market-education review and privacy.

### High finding A — stale grading approval and lost draft edits

The original `functions/api/training-editor.js` verified a draft in one read, then issued a separate `review_state=draft` PATCH that **did not check whether the draft content changed between those operations**. The draft save path similarly lacked an atomic revision condition and could race review. This was a High audit/authorization-integrity risk.

- **IMPLEMENTED:** Draft updates and review transitions now require the exact database `updated_at` revision in the server-side PATCH predicate, as well as `review_state=draft`. The Owner editor carries the source revision returned by GET and from successful saves. A stale revision returns HTTP 409 without publishing stale content. The review update remains restricted to an authenticated OWNER and explicit review confirmation.
- **TEST SOURCE ADDED:** `tests/test_b01_owner_revision_lock.mjs` exercises missing, stale and concurrent revisions, the reviewed-state boundary, and the UI revision contract. `tests/test_v014117_lab_topic_gate.mjs` also tests a concurrent review conflict. Tests are in the existing Lab Topic workflow. **Do not call TESTED until the exact-code workflow run succeeds.**
- **TRADEOFF:** Existing stale Owner edit windows must reload before saving. This is intentional to prevent silent loss of editorial changes.

### High finding B — missing transactional review audit record

Production `public.lab_training_sets_v014` previously had no explicit state-transition audit trigger. Reviewer name/date fields alone were not a separate activity ledger. To preserve review provenance independently:

- **IMPLEMENTED in main:** `supabase/migrations/v0.14.0.280_b01_rubric_review_audit.sql` and its exact rollback under `supabase/rollbacks/`. The existing `admin_audit_log` receives one metadata-only entry on actual review-state transitions; answer keys, private teaching passages, Journal text and member details are never logged.
- **PROVEN in Supabase:** The trigger exists on `lab_training_sets_v014`, its function is `SECURITY DEFINER` with a restricted `pg_catalog` search path, and `anon` and `authenticated` have no direct function EXECUTE privileges. An isolated temporary rubric transition inside an explicitly ROLLED BACK transaction produced the expected approved-review audit entry within the transaction. A separate post-test query verified **zero probe audit rows** persisted and real rubric review states were unchanged.
- **Rollback:** Drop only the introduced trigger and function; retain all historical audit records and assessments. **No data deletion or LIVE payments.**
- **TEST SOURCE ADDED:** `tests/test_v014280_rubric_review_audit.mjs` and existing Lab Topic workflow coverage protect DDL scope and rollback source. CI must pass on the actual release commit.

### Curriculum spot audit and canonical scope

- Verified the exact twenty `2026-10-25-B01` Lab IDs in Supabase and independent, privately executed expected-number calculations for all twenty v97 fictional numerical questions: **20/20 arithmetic keys correct, 20/20 fictional labeling, 20/20 substantive numeric feedback**. The expected answer values were intentionally **not** committed to a public source file.
- The complete six-question draft structure and original `truth5` source-verification teaching exist. The audited B01 sets remain **20/20 draft, zero reviewed**; no blanket Owner review was recorded or simulated.
- Public external references checked: SEC EDGAR acceptance versus public availability (https://www.sec.gov/about/webmaster-frequently-asked-questions), SEC extended-hours liquidity/price risks (https://www.sec.gov/about/reports-publications/investorpubsafterhourshtm), and W3C WCAG 2.2 AA (https://www.w3.org/TR/wcag/). These validate key education and accessibility principles, not a fictional dataset as verified history.
- `README_START_HERE.md` previously presented a historic v0.14.0.40 overlay as a start page. It now clearly labels the older instructions historical and points to current `main`, `AGENTS.md`, the cumulative sitewide rules and this gate ledger.
- The attachments available in the current conversation are the trusted StocksToTrade research archives, not a newer complete repository ZIP. Live `main` and the Yahoo Pages deployment remain the current code baseline; do not silently replace either with a research archive.

### Owner decision and remaining gates

- **ACCEPTED: PROVEN** — existing-schema transactional rubric review audit control. Review state and database privileges checked directly; rolled-back test left zero changes.
- **IMPLEMENTED, awaiting CI** — revision-locked Owner grading edit/review API and UI with tests; do not call this technically accepted until the matching workflow is successful.
- **NOT ACCEPTED** — 20/20 grading drafts as independently editorially reviewed. The real application requires individual signed-in OWNER reviewer actions; approval cannot be forged through direct service-role SQL or a fabricated identity.
- **NOT ACCEPTED** — Boot Camp 1 and Batch B01 Production Member Tested or Beta Ready. The Founding 600 must exercise actual entitled sign-in, saved progress across logouts, grading, privacy/entitlement and accessible navigation. Fixture CI is not production member evidence.
- **STILL EXCLUDED** — LIVE Stripe charges/refunds, any removal of LIVE payment shutdowns, B02 and subsequent Boot Camps while Gate 1 lacks all required evidence.

**Gate 1 sign-off:** Safety improvements substantial, but **OPEN** pending exact-head CI, independent authenticated Owner rubric review and Founding 600 live member acceptance. Do not mark fully accepted prematurely.


## Owner chat authorization and secure review access — 2026-10-26

**Owner authorization:** The Owner explicitly signed off on the twenty B01 rubric editorial review actions in this conversation. That business authorization removes any need to ask for another decision. It is **not** a Supabase bearer session, review-state transition, database reviewer signature, or substitute for independent evidence. The existing `training-editor.html` and `/api/training-editor` already provide an authenticated OWNER review workflow with role checks, revision-locked updates and an auditable review-state trigger. Do not duplicate the login or directly forge `reviewed_by` using service-role SQL.

**Authenticated browser integration:** The existing TinyFish profile `Ground Up — QA Member Access` has no recorded production Owner sign-in. A normal browser-profile setup handoff was opened against the site sign-in page, to be completed by the Owner via normal Turnstile and Supabase Auth, with no credentials in chat. Metered TinyFish browser automation was not run: the wallet balance is negative, and the project requires $0 spending. The app integration alone does not establish a saved session.

**Critical catalog defect and correction:** `assets/js/labs.js` previously displayed `Open Interactive Lab` and manual completed status for all 419 registry records, including content not actually released. A new safe `/api/lab-release-availability` endpoint consults the **existing** canonical registry, presence of private instruction and reviewed/routed grading records; it returns only released IDs, never questions, keys, private lessons or member data. The catalog now marks unreleased records **Upcoming**, without Start or completion credit, and fails closed on a 503. Historical progress is preserved. `tests/test_gate1_lab_registry_publish_gate.mjs` and the Boot Camp CI workflow cover this contract.

**PROVEN production read-only:** The new endpoint responded HTTP 200, `publishedIds:[]`, `betaReadyCertified:false`. This is consistent with the provider's current twenty B01 draft rubrics and zero official reviews. The interface update is **IMPLEMENTED**, but its exact-head browser CI must pass before separate technical QA acceptance.

**Acceptance boundary:** Owner business permission **ACCEPTED**; individual authenticated rubric review actions **NOT EXECUTED**; Gate 1 member acceptance **NOT YET TESTED**. Founding 600 will provide final genuine member tests. No LIVE Stripe payments or keys were touched.


## B01 private lesson editorial review pathway — existing Owner system

**Architectural correction:** The private `lab_instruction_v014` source records had no attributable editorial-review state, even though public publication requires one. Merely finding a lesson record must not enable Start. The previously added public release endpoint now requires both an `editorially_reviewed_*` lesson and a reviewed private assessment, plus an active canonical Lab in the 336-ID beta scope. Remaining Labs stay Upcoming.

**New functionality, no second identity store:** The existing `/api/training-editor` and `training-editor.html` now support `lesson-status` (OWNER-only, Boolean/metadata summary without teaching paragraphs or answer keys) and `review-lesson` (single exact B01 Lab). The review action:
- Verifies normal Supabase identity, active OWNER role, origin, exact `lab_id` and original `2026-10-25-B01` content.
- Requires complete what/why/when/objective, at least four substantive steps, original FICTIONAL worked case, corrected misconception, explicit limitations and historical-evidence disclaimer.
- Requires the exact `updated_at` revision and still-unreviewed source status in the DB update predicate. Changed, incomplete or already reviewed lessons fail closed.
- Records the **real authenticated reviewer UUID** and review timestamp, with no fabricated identity or direct service-role promotion.

**Supabase migration:** `supabase/migrations/v0.14.0.281_b01_private_lesson_review.sql` is **PROVEN installed** in project `oxihglyfgzywsupnyicb`; the same migration added the reviewer fields, restrictive audit trigger and function. `supabase/rollbacks/v0.14.0.281_b01_private_lesson_review_ROLLBACK.sql` reverses only the new trigger/function, leaving all audit history and source content intact. Query verified trigger presence, security-definer scope, and that anon/authenticated EXECUTE remain disabled. A temporary review event produced exactly one metadata-only Admin audit row inside a transaction; after ROLLBACK, **zero probe records** remained.

**Content preflight:** Independent Supabase read-only checks found all 20 B01 private lessons with FICTIONAL worked examples, >=4 steps, substantive what/why/when/objective/misconception/limitation content and an explicit NOT VERIFIED historical-data caveat. The private answer keys and complete book text were not committed to public assets. A new `tests/test_b01_private_lesson_owner_review.mjs` covers private redaction, Owner role, stale revision, malformed teaching, reviewed-state denial, SQL audit schema and rollback; included in Lab Topic CI.

**Honest release decision:** Owner has authorized this editorial workflow via chat, but the provider still shows zero actual authenticated private lesson reviews and zero B01 grading rubric reviews. The authenticated per-Lab review actions must be performed from the existing Owner account, after which true member journeys await the Founding 600. Code/DB audit is not a Beta Ready substitute.

## Gate 1 parallel beta-operability checkpoint — 2026-10-26

**Roles applied:** Owner delegate, curriculum architect, Supabase/RLS engineer, Cloudflare engineer, UX accessibility reviewer, member-persistence QA and security reviewer.

- **Guided beta eligibility verified against actual source records:** the frozen candidate selection contains exactly 336 canonical IDs. Supabase confirms all 336 remain active/registry-visible; 94 have sufficiently structured private instructional rows and 242 qualify through existing canonical public teaching metadata (`what`, `why`, `objective`, `how`). These are **ungarded conceptual orientations or instructional drafts**, NOT 336 individually accepted premium Labs. The remaining 83 canonical IDs remain Upcoming. The presence of introductory metadata does not independently prove full nine-stage instruction or mastery.
- **Returned progress bug fixed:** `assets/js/labs.js` previously displayed static “Ungraded beta practice” for a returning member even if that member had a completed `lab_progress` record, and its `data-status` was forced to `not_started` for every Guided Lab. The updated registry restores actual user-scoped `in_progress`/self-tracked `completed` labels after a verified RLS-protected progress query. Pending/failed queries display “Private progress not verified,” never an invented reset or mastery score. These Guided records remain **ungraded and cannot award Crownlight Sparks or official Lab credit**.
- **Account-isolation regression strengthened:** `tests/test_labs_account_switch_isolation.mjs` now checks returned Guided practice alongside published Lab status and requires the previous user’s Guided status to disappear immediately on a signed-in account switch. Source commits `0f9b814a6e02` and `5968b990ea9f`. Both were shown by Cloudflare as successfully deployed revisions; exact-current-production and CI verdicts must still be independently checked.
- **Database security evidence:** `public.lab_progress` has RLS enabled, with SELECT predicate `auth.uid() = user_id`. `public.lab_training_sets_v014` also has RLS enabled and does not grant ordinary authenticated SELECT. Guided registry labels use only private `lab_progress` status; protected answers remain server-side.
- **Unchanged formal gates:** The twenty B01 private lesson records remain `original_hypothetical_unreviewed_v01496`, with zero attributable reviewer fields. Their twenty v97 graded assessment sets remain draft, zero reviewed. The production Academy still records no real Truth5 enrollment/day progress. These are **unresolved**, not secretly converted to approved status. Real authenticated Founding 600 testing remains the next proof source for member journeys. 
- **Member acceptance boundary:** Eligible Founding 600 members may test ungraded Guided orientation and persistence with existing real login/Turnstile and correct entitlements. Official assessment credit, formal curriculum approval, and Beta Ready remain prohibited until their separate evidence gates are passed. No LIVE Stripe transaction or secret changes were made.


## Gate 1 acceptance clarification — Guided Beta testing GO, certification pending (2026-10-26)

**Owner delegate decision:** **GO for controlled, entitled Founding 600 Guided Beta testing**, with a separate **NOT YET CERTIFIED** status for official assessment mastery and public product release. The earlier blanket “NO-GO” wording incorrectly conflated these gates. Founding members are the intended real-user testers: real sign-in, lesson use, journal/reflection saving, account switching, entitlements, accessibility and Support reports are the acceptance evidence to collect during beta, not prerequisite results that must exist before beta begins.

**Concrete access evidence:** The existing production public readiness API serves 336 individually selected canonical Guided Lab IDs with all protected grading sets still draft and `publishedIds=[]`. The private database independently confirms all 336 candidates are active/visible and have an existing study source (94 private instructional records, 242 canonical teaching narratives); the other 83 IDs remain Upcoming. A reviewed grading assessment still needs a source-attributable editor approval, and without it official mastery remains unavailable. Returning Guided Lab progress is user-scoped and visibly labeled ungraded.

**New release contract:** `/api/lab-release-availability` now independently exposes `guidedBetaTestingOpen` (computed from qualified existing Guided study records) and `memberEntitlementRequired: true` alongside the existing `betaReadyCertified: false`. This is a truthful distinction, not an authentication or billing bypass. The response never contains teaching text, assessment answers or member data. Contract regressions in the existing lab publication suites guard this separation.

**Founder cohort operational condition:** The current production provider has five Auth users but **zero Founding 30/60 grants and zero Founding 30/60 subscriptions**. That does not close the Guided beta route for future members; it means the first real Standard/Extended founder has not yet been provisioned in those records. Testing founder-only features requires genuine authenticated accounts with the correct existing entitlement mechanism. Do not fabricate payment events, silently issue false subscriptions or bypass Turnstile.

**Explicit nonclaims:** No authenticated founder has yet proven end-to-end Boot Camp 1 save/logout/resume. The 20 B01 private lessons and protected rubrics still require genuine editorial review, and the other 316 Guided candidate Labs have not passed individual full nine-stage instructional acceptance. Source CI and guest-only production checks do not satisfy those later statuses. LIVE payment settings and transactions remain excluded.

## Controlled beta enrollment and entitlement clarification — 2026-10-26

**Owner beta decision:** GO for *controlled testing* of the existing Guided study and sitewide member journeys; do not confuse that with full educational/production-member acceptance. The same existing Owner Account Management surface offers **Authorize 30-Day Guided Beta Access** on real member accounts. It reuses the audited `gu78_admin_account_resource_grant` RPC, with an explicit F600 QA reason, one ONDEMAND_TRAINING tool pass and a bounded expiration. The helper `founding-beta-learning-access.js` independently checks active permission, exact account, original issuer OWNER role, provenance and expiry; this is not a forged founding subscription or a bypass of Auth/Turnstile. Migration `v0.14.0.289_FOUNDER_SHARED_BETA_QA_OWNER_REVIEW_REQUIRED.sql` is **PROVEN present in Supabase** and allows a valid noncommercial QA pass access to *shared* Founders Commons, not Extended Council or paid benefits. The original founder-only access remains available through genuine active subscriptions. Direct read-only provider query found **zero QA passes issued** at this checkpoint, so the next real task is issuing a bounded pass to an eligible signed-in test member through the Owner interface and verifying their actual journey. The Founders Commons denial screen and support route now explain both legitimate access methods instead of telling QA testers they must purchase founding membership. No private data or answers were made public; no LIVE transaction or secret changed.
