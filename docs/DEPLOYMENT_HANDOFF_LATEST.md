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
- **SQL:** Owner reports having executed the Tutor SQL files successfully in Supabase. Execution logs and live schema have NOT been independently verified; do NOT repeat installation. Use `supabase/admin/v0.14.0.149_MARKET_TUTOR_INSTALLED_CONTRACT_READ_ONLY.sql` to check installed contracts without writes.
- **Cloudflare:** no deployment/AI binding activation or free-tier account verification performed in this development branch.
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
- Editorial approval/status/version workflow for expanded knowledge records and unavailable-topic Owner reporting are not complete.
- Existing staff Tutor feedback is read-only. Assignment/resolution audit trail, administrative source approval and in-app AI emergency shutoff require further implementation and testing.
- Free Cloudflare AI capacity has variable per-model neuron consumption. A count of API calls is not evidence of zero cost. An approved Cloudflare Free account with correct AI binding/model license and hard caps is a required activation gate. Never activate paid fallback.
- Existing saved Tutor exchanges must not be treated as officially graded competence. No private rubrics or future historical data may be transmitted.
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

## Revision history
| Date | Version | Change |
|---|---|---|
| 2026-10-22 | 0.1 | Original source-only retrieval handoff and production blockers. |
| 2026-10-22 | 0.2 | Source-only mathematical calculation and tests. |
| 2026-10-22 | 0.3 | Workers AI guarded adapter, safe private conversations, data portability, member calculator, stable routes and explicit acceptance gates. |
