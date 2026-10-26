# Free Membership — Personalized Talia Study and Server-Controlled Fictional Replay
**Document ID:** SMFGU-FREE-REPLAY-20261026-V1  
**Project:** The Stock Market: From the Ground Up  
**Owner:** Cyber Nexus / authorized Owner delegate  
**Branch:** `main`, repository `cybernexuspublishing/stock-market-from-the-ground-up`  
**File:** `docs/releases/2026-10-26_FREE_PERSONALIZED_SERVER_REPLAY_V1.md` (Markdown)  
**Google Drive location / ID:** Not created; authoritative source remains this GitHub repository.  
**Issued:** October 26, 2026  
**Version:** 1.0  
**Status:** IMPLEMENTED source; TESTED API contracts and Supabase migration; full Free member production browser acceptance tracked independently.

## Owner controlling decisions and prerequisite
The Owner reported the previously tested entire Free member journey **completed**. This is an Owner attestation; the current implementation must still preserve independent provider evidence. Free membership V1 prioritizes a beginner journey, Talia coaching, fictional practice, real progress evidence, watchlist research, honest weekly use, moderated community and noncoercive upgrades. Teaching remains available without Sparks. The seven official Boot Camps, 419 Lab canonical IDs, all member attempts, founding benefits/prices and LIVE payment safeguards are unchanged.

## Roles
Product architect, instructional designer, beginner educator, market data provenance specialist, Cloudflare full-stack engineer, Supabase DBA, access-control reviewer, privacy engineer, accessibility lead, GitHub CI engineer, release auditor, Owner acceptance authority.

## Existing system reused, not duplicated
- Replay candles and private session cursor: `gu_replay_bars_v01492`, `gu_replay_sessions_v01492`, `v01492_replay_advance`. The existing first-decision/forward-only triggers remain authoritative.
- Auth/entitlements: `toolAccess()` checks real GoTrue bearer, member profile, deleted state, suspensions, Showcase and grants. A denied premium entitlement alone **never** implies Free eligibility.
- Study progress: `gu_bootcamp_academy_progress_v014168` for `free5`, **not** a second progress ledger. No official grade or mastery is granted from self-report or reflections.
- New preferences: a separate purpose-limited profile table; never a substitute for assessed educational performance.
- Historical market datasets: `verifiedHistoricalDataset` and its existing authorization remain unchanged; fictitious datasets explicitly FAIL that authentic-history predicate.

## New engineering deliverables
1. `functions/_lib/fictional-replay-policy-v1.js`: strict positive metadata and classification gate. Requires original synthetic 2040 education, fictional provenance, licensed display and non-real-market flags. Excludes unreviewed/withdrawn/misclassified sources.
2. `functions/api/learning-replay-v01492.js`: extends ONE existing route with `scope=fictional`. For fictional use, requires `toolAccess.freeEligible===true`; historical defaults and paid entitlement remain unchanged. Catalog gives metadata only. Start returns one bar. Subsequent operations re-validate rights and member ownership, enforce immutable first decision and compare-and-swap cursor. Visible history is <= the server-owned cursor, never client-selected future indices. Free fiction cannot call paid historical Journal-finish RPC and never creates simulated fills, trading profits or grades.
3. `assets/js/verified-replay-v01492.js`: shared UI accepts `verified-replay.html?scope=fictional`; labels original invented prices, displays existing bounded chart/table, records evidence before advancing, resumes server cursor and explicitly hides execution controls that would suggest a fictional fill.
4. `dashboard.html` and `simulator.html`: entry points to the Free server-controlled fictional experience alongside the already approved client-inspectable Free candle exercise.
5. `supabase/migrations/20261026_free_learning_coach_preferences_v1.sql`: private Auth-owned preferences `focus`, self-reported experience, session length, monotonic revision, timestamps, plus append-only metadata-only audit event table and trigger. RLS ON, direct anon/member access revoked, service-only validated API. No lesson/assessment answer bodies in audit.
6. `functions/api/free-learning-coach.js`: authenticated account-scoped read/update, optimistic revision compare, disabled Showcase/restricted accounts, prerequisite-aware next Free Foundations lesson, and optional topic-aligned practice. Self-reported preferences never mark a learning competency mastered.
7. `assets/js/dashboard.js`: saves and retrieves Talia's learner choices. `dashboard.html` contains focus, study minutes and starting experience fields with accessible status and link for optional practice. Failed persistence is surfaced; no fictitious completion is presented.

## Source classification and licensing
Live Supabase query confirmed 419 published original FICTIONAL teaching datasets with 10,056 total replay bars (24 bars per dataset). Every current dataset has original-synthetic, nonhistorical, licensed-for-member-display and invented-year 2040 metadata. No authentic historical dataset was manufactured. The Free learner receives only the selected dataset's authorized bars as released, not all 24 on session start. The older, fully client-inspectable starter remains clearly identified as a separate ungraded exercise.

## Security, quality and operational assumptions
- Private replay and personalization tables remain RLS enabled, and anonymous/ordinary authenticated direct SELECT is revoked. Real API access uses a verified bearer and server-owned member ID, never an arbitrary client user ID.
- Replay mutations reject cross-origin requests, lock the original decision once, enforce session ownership and CAS cursor, honor immediate account suspension and withdrawn source permissions. No secret, private Lab answer, raw future bar, service key, or privileged rubric is sent to the browser.
- Free preferences use whitelisted focus/experience/duration and monotonically increasing revision, with conflict errors for concurrent writes.
- Browser-visible replay is NOT professional execution simulation; no guaranteed fill, historical forecast, independent mastery, personalized investment advice or broker-confirmed trades.
- All writes remain inside established free Cloudflare/Supabase/GitHub infrastructure. No LIVE Stripe or paid service changes.

## Verification and labels
- Provider: Supabase migration applied successfully. Read-only schema audit confirmed RLS and service-role-only access for preferences/audit and replay bars/sessions.
- Provider: a controlled transaction exercised preference insert, revisioned update, stale-revision rejection and 2 append-only audit entries; the transaction was rolled back. Follow-up confirmed zero persistent test records. **TESTED / PROVEN schema**.
- API tests: `tests/test_free_server_fictional_replay_v1.mjs` and `tests/test_free_learning_coach_v1.mjs`, using real API handlers with simulated Auth/PostgREST dependencies. Cover guest/premium isolation, no-lookahead, owner-scoping, suspensions, concurrency, classification, topic-based coaching, prerequisite progression and no mastery. **TESTED, not genuine member production acceptance**.
- Regression: existing `tests/test_v014092_replay_contract.mjs`, `tests/test_v014092_replay_visibility.mjs`, and `tests/test_free_foundations_shared_v1.mjs`. CI: [Free Personalized Server Replay V1](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/workflows/free-personalized-server-replay-v1.yml).
- UI: `tests/test_free_server_replay_browser_v1.mjs` uses pinned Playwright Chromium at 390/900/1280/1440 pixels with simulated endpoint responses and the real checked-in browser interface. CI: [Free Server Replay Responsive Browser QA](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/workflows/free-server-replay-browser-v1.yml). This does not constitute genuine authenticated production member testing.
- Cloudflare source-deploy acceptance must match exact release commit and successful production stage, independently checked from source CI.

## Status and acceptance boundaries
**Implemented:** all source files and private profile database.  
**Tested:** API contract and provider rollback-only preferences write checks, additional regression and Chromium outcomes according to linked runs.  
**Proven:** Supabase migration application and RLS/grant/catalog invariants; Cloudflare deployed exact commit only when separately observed.  
**Not automatically Beta Ready:** the new fictional session's actual authenticated production member journey, cross-device resume, accessibility manual/screen-reader verification, real sustained load and course-level content editorial acceptance. The Owner's completed earlier Free journey does not automatically prove this new replay scope.  
**Explicitly future:** advanced paper-order lifecycle/partial fills, synthetic lesson-response grading and real historical licensed datasets.

## Rollback / incident response
- To disable the Free fictional route, revert `scope=fictional` changes in `functions/api/learning-replay-v01492.js` while preserving the verified historical pathway; do not delete existing replay-session rows.
- To disable personalization while preserving existing member choices and audit history, run `supabase/rollbacks/20261026_free_learning_coach_preferences_v1_ROLLBACK.sql`. It removes the audit trigger/function only and intentionally retains the additive tables and all recorded rows.
- Never replay a historic migration or truncate member progress. Recheck exact main SHA, Cloudflare deployment, provider migration history, no future bars and Store entitlements after rollback.

## Revision history
| Date | Version | Status | Revision |
| --- | --- | --- | --- |
| 2026-10-26 | 1.0 | Engineering implementation | Free server-owned fictional scope, recorded member preferences and no-lookahead/role regression gates |

## 2026-10-26 Provider replay-CAS acceptance addendum

**Role:** Independent release auditor, PostgreSQL and replay security lead.  
**Trigger:** Follow-up request to complete the next acceptance gate after successful Chromium source tests.  
**Source revision:** `25e7753e582fa6bdb8f7401d06bce09aeb12e8c6` includes the recorded read-only regression script.  
**Provider:** Supabase `oxihglyfgzywsupnyicb`.  
**Evidence script:** `supabase/reviews/20261026_fictional_replay_real_rpc_transaction_QA_ROLLBACK.sql`.

### Initial apparent defect corrected using live evidence
A preliminary code reading suggested that `v01492_replay_advance` required authentic **historical** evidence and might exclude fictional datasets. Direct inspection of the installed SQL function revealed that it tests **`metadata.evidence_verified`**, which the provider uses for source-integrity/OHLCV validation, separately from **`metadata.historical_evidence_verified`**. The published fictional teaching rows correctly have `evidence_verified=true` (internal validation) while `historical_evidence_verified=false` (not authentic history). Both classifications can coexist without misleading members because the **Cloudflare API enforces the separate historical-versus-fictional source policy before calling the RPC**.

The initially suspected High defect is therefore **rejected as a false positive**. Do not broaden or rewrite the core replay RPC based on that misinterpretation.

### Real provider transaction result: TESTED — PASS
The rollback-only SQL script executed successfully inside production PostgreSQL:

- Confirmed a published original fictional dataset with 2040 timestamps and rights metadata.
- Confirmed anonymous and ordinary authenticated clients cannot execute the privileged replay-advance function; the service role can.
- Created a **temporary QA replay session** using an existing user UUID as an FK, without impersonating that user through GoTrue.
- Denied advancement before the first reasoned decision was locked.
- Locked a clearly labeled **NO_TRADE** decision and advanced **exactly one** candle with the real `v01492_replay_advance` RPC.
- Denied a stale cursor and a different existing member identity.
- Finished the temporary session, denied subsequent advancement and modification of immutable finished state.
- Executed `ROLLBACK` and verified **zero persistent replay sessions**, all **419 canonical Labs** preserved, and all **10,056 replay bars** unchanged.

This is an authentic provider **database unit/integration test**, not a real member web login: the QA script runs under the database administrative connection and does not exercise Turnstile, Supabase GoTrue token creation, Cloudflare authorization headers, actual browser device switch, or client-issued post-authenticated persistence. Never label it as **Production Member Tested**.

### Runtime configuration and launch compatibility
Cloudflare production environment was inspected using variable **names only**, not secret values: the published Pages project includes `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `ENFORCE_AUTH_TURNSTILE_V135`, `TURNSTILE_SITE_KEY`, and `TURNSTILE_SECRET_KEY`. Exact-run Cloudflare deployment success and source CI should be recorded separately; existence of binding names does not prove secret validity.

The existing genuine-member Free onboarding journey was accepted by the Owner, but **no active original fictional replay sessions existed in Supabase at the provider-check timestamp**. Thus the new replay scope's real member start/reload/resume remains to be proven with a legitimate Turnstile-completed session. Do not disable CAPTCHA or manufacture tokens for acceptance. No LIVE Stripe payments or records were touched.

### Owner acceptance
**ACCEPT:** replay data plane, locked-decision RPC, stale update protection, member-ID filtering, transactional rollback, no-look-ahead source tests, and deploy metadata where independently verified.  
**CARRY FORWARD:** true QA member sign-in → Start fictional dataset → Lock → Advance → reload/new session → Resume → Finish, with real GoTrue credentials already held through an authorized verified browser; second signed-in account denial and no grade/Journal credit. No automatic Beta Ready promotion until that trace is recorded.
