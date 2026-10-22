# Deployment 09 of 18 — Market Tutor AI | Permanent Handoff

**Project:** The Stock Market: From the Ground Up (one unified project: books and website)  
**Company:** Cyber Nexus | **Publishing imprint:** Crown & Lantern Press  
**Document location:** GitHub `docs/DEPLOYMENT_HANDOFF_LATEST.md`  
**Document type:** Markdown  
**Document ID:** Repository path above; no separate Google Drive document ID assigned  
**Google Drive location:** Not assigned (no new file is necessary)  
**Document version:** 0.3 | **Status:** SOURCE CANDIDATE / PRODUCTION NOT ACCEPTED  
**Last updated:** 2026-10-22 | **Next review:** On receipt of exact-head CI and installed-schema evidence  
**Purpose:** Preserve cross-chat source control, testing, dependencies, owner actions and risk-based acceptance.

## Controlling release
- **Selected delivery:** 09 of 18: Complete Market Tutor AI
- **Planned source release:** v0.14.0.149, NOT yet production-installed.
- **Verified main baseline:** v0.14.0.148 at `345c2c1280d83a62e989bdc11aaed542e783ff85`.
- **Development branch:** `deployment-09-market-tutor-retrieval-20261022`
- **GitHub pull request:** https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/pull/123 (draft, unmerged).
- **Last verified working-branch commit before document update:** `f53a597af04db0a29760b53f75899d69852c045c`.
- **Prior deployment:** D08 had source release and unresolved live database/production acceptance; no inference from merging D08 to completing D09.
- **Source acceptance evidence:** `scripts/deployment09_release_evidence.mjs` (machine report at `artifacts/d09-tutor-source-evidence.json` when executed). File presence/checks are not actual production verification.

## Completed source changes in branch
1. **First-party deterministic topic retrieval:** verified-source catalog remains existing v92/v100; new whole-token terminology and abbreviation normalization, source-only ranking and uncovered-topic fallback.
2. **Provider adapter/routing:** existing OpenAI adapter now requires explicit OWNER approval and model allowlist. Cloudflare Workers AI binding adapter added with one allowlisted non-deprecated model `@cf/zai-org/glm-4.7-flash`; free plan, license and binding must be separately verified and flagged. The adapter is OFF by default. Source-only teaching remains active.
3. **Atomic inference meter:** existing v103 per-member/day and site-wide day/month reservation RPC retained. No API calls are permitted by merely receiving a browser request, without explicit consent, approved provider and a successful transaction reservation. Caps count requests, not guaranteed monetary spend or Neurons.
4. **Secure named conversations (new, proposed v149 Supabase migration):** user-scoped 30-conversation cap, RLS/revoked direct access, stable API CRUD, per-user exchange linkage and migration-compatible ungrouped history. Client never supplies authoritative identity. Requires installed v102 and Owner review. Exchange save/link is not a single transaction; separate association failure is disclosed and recoverable as an Unfiled exchange.
5. **Member workspace:** named conversation list/search/rename/delete, cross-device history when database is installed, explicit save preference, stop-waiting, source-only retry, account-switch epoch cancellation, readable safe Markdown/limited tables/inline math, existing four teaching modes, feedback, copy and exports. Client does not run untrusted HTML.
6. **Member transcript portability:** `/api/member-tutor-data-export` authenticates via Supabase Auth and exports only authenticated user's ungraded saved records even after Tutor entitlement expiry; doesn't award mastery. Privacy counsel review still required.
7. **Verified arithmetic in source:** long-only hypothetical position sizing, buying power, risk/reward and P&L with validation. Member calculator at `/api/tutor-calculator` is entitlement protected. Does not place orders or guarantee fills.
8. **Stable API paths:** `/api/market-tutor`, `/api/member-tutor-history`, `/api/member-tutor-conversations`, `/api/tutor-calculator`. Old versioned Tutor/history routes remain for compatibility.
9. **Test infrastructure:** existing Market Tutor CI workflow extended for retrieval, arithmetic, provider allowlisting, conversation isolation, member calculation and history export; consolidated source evidence script added.

## Functional and security tests
- **Source tests committed:** `tests/test_v014149_tutor_retrieval.mjs`, `test_v014149_tutor_arithmetic.mjs`, `test_v014149_tutor_provider.mjs`, `test_v014149_tutor_conversations.mjs`, `test_v014149_tutor_calculator.mjs`, and `test_v014149_tutor_data_export.mjs`.
- **Previously installed tests retained:** v92/v93/v95/v100/v102/v103/v105/v107/v147 Tutor tests, plus repository-wide regression workflows. Legacy provider mocks explicitly declare an approved test-only model; no test model is enabled in production.
- **Exact-head GitHub Actions:** QUEUED at last check; no PASS claim. Merge and production acceptance blocked pending real results. No test removed to make CI appear green.
- **Production browser:** no verified Owner/Member A/Member B/TEST/Showcase, expired membership, mobile keyboard and screen-reader acceptance has occurred.
- **SQL:** Owner executed v102/v103/v107/v149; earlier read-only checks passed. The corrected **v149b** migration also now passes Owner-supplied read-only Supabase verification: all three new private tables exist, RLS is enabled, anon/authenticated direct SELECT is denied, service SELECT is available, and Owner review, topic-gap and atomic privacy-deletion RPCs are installed. No migrations need rerunning. Evidence: `Supabase Snippet Check Existence of Replay Tables and Functions(16).csv` (Owner-uploaded, 2026-10-22). **Scope is database structure only**, not live application or functional acceptance.
- **Cloudflare:** Owner screenshots show the intended 10 Market Tutor environment variables and a Workers AI binding named `AI`. Inference remains OFF (`AI_SERVICE_ENABLED=false`); free-tier/model-license verification flags also remain false. Settings and binding are Owner-reported and screenshot-supported, while live deployment/inference remain unverified. Existing Stripe LIVE webhook configuration is Owner-locked; do not request or make changes to it as part of D09.
- **Stripe:** unchanged. No prices, subscriptions, payments, real entitlements or charges modified.

## Evidence and acceptance gates
| Gate | Evidence-based status |
|---|---|
| New source files committed | YES — proposed source, pending CI |
| Regression CI passing | NOT VERIFIED |
| Required Supabase migrations installed | NOT VERIFIED; D09 new migration NOT APPLIED |
| Cloudflare production commit deployed | NOT VERIFIED |
| Four-mode functional acceptance | NOT VERIFIED in production |
| Browser privacy/session isolation | NOT VERIFIED in production |
| Human educational content approval | NOT VERIFIED |
| Authoritative source-grounded model citation quality | NOT VERIFIED |
| Workers AI free quota and account plan | NOT VERIFIED; disable inference |
| Admin Tutor comprehensive editorial workflow and emergency control | PARTIAL; runtime environment kill-switch exists; full audited in-app controls not accepted |
| All 419 Labs individually accepted | NOT VERIFIED; 419 registrations only |
| 30-day Bootcamp accepted | NOT VERIFIED |
| 30 competencies production accepted | NOT VERIFIED; 30 definitions tracked |
| Production acceptance | **NO** |

## Known remaining work and risks
- Privacy-safe topic-gap aggregation and Owner dashboard code are now implemented on this branch; v149b installation and real endpoint acceptance are still required. A comprehensive editorial source approval/versioning workflow remains outstanding.
- Existing Tutor feedback inbox now has proposed Owner-only case status controls and a new append-only audit/RPC in v149b; production remains unverified until SQL and authenticated tests. Curriculum source approval/versioning and in-app emergency AI switch are still distinct outstanding acceptance gates.
- Free Cloudflare AI capacity has variable per-model neuron consumption. A count of API calls is not evidence of zero cost. An approved Cloudflare Free account with correct AI binding/model license and hard caps is a required activation gate. Never activate paid fallback.
- Existing saved Tutor exchanges are ungraded. Explicit canonical 419-Lab ID guidance uses only public Lab/competency metadata and never private rubrics, future bars or unlicensed historical data. A new one-transaction member privacy deletion covers both saved exchanges and named conversations, including after Tutor entitlement expiry. v149b is structurally confirmed installed, but functional tests remain outstanding.
- Browser-only stop requests do not guarantee cancellation of already-reserved server inference.
- GDPR/consumer privacy, copyright/source licenses, AI vendor data processing and policy retention require jurisdiction-sensitive review.
- Historical market-data rights, Labs and Bootcamp are separately governed by D10–D14.
- Avoid “100%” or “accepted” language until all required evidence is recorded.

## Next work / Owner actions
1. Obtain successful exact-head GitHub CI and correct any regressions before PR review/merge.
2. Owner reported SQL installation. Verify with new v149 **read-only** installed-contract query and the actual user-scoped storage tests; apply no duplicate migrations without a detected gap.
3. Complete source/editorial workflows, unanswered-topic aggregation, owned Admin resolution/approval UI and review of all four Tutor modes.
4. Verify production Account A/B isolation, expiry/export, authorized Lab context, keyboard/mobile, provider timeouts, rollback, cost caps and historical-data separation.
5. Confirm Cloudflare Free plan and licensing; keep AI disabled unless all authorization/limit switches explicitly pass. Do not activate new paid services.
6. After D09 passes all independent gates, proceed to D10 Market Data, Trading Intelligence and Replay.

## D09 source QA and latest follow-up
- **Browser integrity repair:** removed a duplicated invalid JavaScript tail and restored complete calculator/privacy-export methods in `assets/js/market-tutor.js`. The repaired source passed an independent JavaScript syntax compilation smoke check; all 31 statically referenced Tutor element IDs exist in `market-tutor.html`.
- **Independent pure-logic checks:** deterministic arithmetic, retrieval, canonical Lab lookup, and anonymous gap taxonomy modules compiled and passed direct smoke cases; these are not a substitute for Node/GitHub Actions.
- **CI:** existing GitHub Actions still QUEUED, not PASS. Browser-integrity and D09 new owner/privacy regressions are now in the workflow.
- **Cloudflare:** no user configuration changes verified; `AI_SERVICE_ENABLED=false` until account and licensing checks are passed.
- **Owner action:** D09 SQL installation and structural verification are complete; no further SQL is currently requested. Cloudflare AI variables and `AI` binding are configured with inference disabled. Remaining actions depend on exact-head CI, merge, deployment, and functional acceptance.


- **October 22 v149b SQL correction:** Owner-reported SQLSTATE 42601 at line 110 traced to malformed single-dollar PL/pgSQL delimiters in atomic Tutor privacy deletion. Corrected the opening and closing to matching double-dollar markers. Verified updated SQL blob and added a D09 source-gate invariant to detect recurrence. Original owner execution failed; v149b remains UNVERIFIED/NOT CONFIRMED INSTALLED. Do not reinstall prior v102/v103/v107/v149 migrations.

- **October 22, Owner follow-up:** Supabase v149b read-only verification passed for 3/3 tables and 3/3 RPCs with the expected role permissions; Cloudflare Market Tutor variables and `AI` binding are screenshot-confirmed. Stripe LIVE webhook Text/Secret configuration is not to be modified under the Owner's explicit direction. GitHub PR #123 remains draft/unmerged; exact-head CI is queued, not passed.

## Revision history
| Date | Version | Change |
|---|---|---|
| 2026-10-22 | 0.1 | Original source-only retrieval handoff and production blockers. |
| 2026-10-22 | 0.2 | Source-only mathematical calculation and tests. |
| 2026-10-22 | 0.3 | Workers AI guarded adapter, safe private conversations, data portability, member calculator, stable routes and explicit acceptance gates. |
| 2026-10-22 | 0.4 | Audited Owner cases, privacy-safe gap counts, canonical Lab ID guidance, atomic post-entitlement deletion and Browser syntax repair; source CI and production acceptance pending. |
| 2026-10-22 | 0.5 | Recorded verified Supabase v149b schema/RPC report, Cloudflare screenshot-based setup, and locked decision not to change the previously tested Stripe LIVE webhook settings. |
