# Permanent Development Handoff — The Stock Market: From the Ground Up

**Project:** The Stock Market: From the Ground Up (unified books + website)  
**Company / imprint:** Cyber Nexus / Crown & Lantern Press  
**Document control:** GU-PROJECT-DEPLOYMENT-HANDOFF / Markdown  
**Repository location:** `cybernexuspublishing/stock-market-from-the-ground-up/docs/DEPLOYMENT_HANDOFF_LATEST.md`  
**Google Drive location / document ID:** Not assigned; GitHub source record only.  
**Last revised:** 2026-10-21 CDT  
**Current selected delivery:** 09 of 18 — Market Tutor AI  
**Source candidate:** v0.14.0.149, branch `deployment-09-of-18-market-tutor-v014149`  
**Controlling main baseline when D09 began:** v0.14.0.148, commit `345c2c1280d83a62e989bdc11aaed542e783ff85`  
**Current main and deployed Cloudflare commit:** Recheck directly at next chat; branch changes are NOT an accepted live deployment.  
**Handoff status:** D09 implementation candidate. Pull request/CI/merge must be verified separately and recorded when available.  
**Purpose:** Make the actual source and acceptance state retrievable by the next development conversation without relying on prior chat summaries.

## Prior delivery 01–08

The eight-delivery source program is merged according to `functions/_lib/owner-release-plan-v014141.js` and D08 notes. PR #119 (source release), #120 (postflight), and #121 (read-only SQL fix) were merged. Commit `345c2c1` is the latest known main SHA when D09 started. D08 Supabase preflight SQL was corrected, **but actual SQL execution result, secure multi-user production testing, positive-dollar signed Stripe lifecycle, complete historical-data licenses and disaster restore acceptance remain unverified**.

Historical file: `docs/v0.14.0.148_DEPLOYMENT_08_OF_08_SITEWIDE_RELEASE_AND_ACCEPTANCE.md`. Do not overwrite prior acceptance evidence.

## D09 concrete source change inventory

- New `functions/_lib/tutor-position-math-v014149.js`: safe hypothetical whole-share math in integer cents.
- Modified existing `functions/api/market-tutor-v01492.js`: no-LLM sizing path; retained four modes, auth, throttle and source-only fallback.
- Modified existing `functions/_lib/tutor-provider-v014107.js`: pinned Workers AI adapter and optional approved OpenAI model allowlist.
- Modified existing `functions/_lib/first-party-ai-service-v014103.js`: existing atomic budgeting supports approved provider configuration; not activated.
- Added stable `functions/api/market-tutor.js`, `functions/api/member-tutor-history.js`, and `functions/api/member-ai-service.js`, preserving versioned endpoints.
- Updated browser to stable paths; original consent, saved exchange, keyboard support and account switching remain.
- Extended validated generation label in original server-save / history allowlists.
- Added `tests/test_v014149_tutor_provider_and_math.mjs` and `scripts/deployment09_verify.mjs`.
- Added existing-framework CI workflow `.github/workflows/market-tutor-v014149.yml`.
- Documented protected user research ZIP intake without uploading private archives, vendor lesson transcripts or customer data.
- Existing v102/v103/v107 installation required: no duplicate tables or migrations created.

## Acceptance ledger — D09

| Acceptance category | Status at source proposal | Evidence / next action |
|---|---|---|
| Source implemented | PARTIAL | Defined D09 scope above; many 09.1–09.15 features outstanding |
| Automated tests | PENDING | GitHub PR run + artifact `artifacts/d09-tutor-source-evidence.json` |
| Database installed | NOT CLAIMED | Existing v102, v103, v107 production RPCs require Owner-approved read-only checks |
| Cloudflare deployed | NOT CLAIMED | Verify exact main commit after merge |
| Functional tests | NOT VERIFIED | Signed-in member and Owner multi-role UX, history, error paths |
| Security tests | PARTIAL SOURCE ONLY | Real RLS member isolation, accounting and provider controls outstanding |
| Editorial review | NOT VERIFIED | Independent review of 22 source topics / 30 guides / any new lessons |
| Commercial tests | NOT VERIFIED | No live charges or AI spending authorized |
| Operational tests | NOT VERIFIED | Free-plan usage, outage and emergency stop require real evidence |
| Production accepted | NO | Never convert green source CI to customer acceptance |

## Educational accounting — counts are targets, not claims

| System | Required canonical registrations | Individually editorially AND production accepted |
|---|---:|---|
| Foundations Book I Labs | 15 | Not verified |
| Foundations Book II Labs | 46 | Not verified |
| Foundations Book III Labs | 33 | Not verified |
| Day Trading Labs | 150 | Not verified |
| Reading the Tape Labs | 75 | Not verified |
| Website-Exclusive Labs | 100 | Not verified |
| **Total Labs** | **419** | **Not verified / 419** |
| Bootcamp instructional days | 30 | Not verified / 30 |
| Official competencies | 30 | Individual mastery/integration acceptance not verified / 30 |

The repository has 419 registered canonical Labs, 30 existing official competency definitions, and a 30-day Bootcamp framework; that is NOT 419 complete teaching exercises, 30 accepted days or graded competency evidence.

## Required Owner actions

**None to review this source-only pull request.** No production SQL, Stripe, publishing or Cloudflare setting should be altered from this branch without verification.

For optional Workers AI at a later acceptance stage: first confirm the Cloudflare plan has a hard $0 free-tier stop, verify current model terms/licensing, add the Pages Functions `AI` binding, confirm atomic quota RPC existence and rate-limit coverage, and only then enable `AI_SERVICE_ENABLED` with deliberately conservative explicit caps. On a paid plan, a request count is not a guaranteed budget cap.

## Blocks and next delivery dependencies

D09 remains OPEN for: educational taxonomy expansion, reviewed knowledge content and citations, privacy-preserving unanswered topics, multi-conversation storage and export after entitlement expiry, Lab-step Tutor integration, Owner resolution/approval workflows, full provider controls, member/mobile/accessibility QA and production verification. Do not mark complete because source-only provider/math improvements passed.

**Next planned:** 10 of 18 — market data/trading tools, but D09 leftovers must stay visibly open and cannot be silently marked accepted. Preserve any additional manual/production steps in Owner Roadmap without resetting previously Owner-saved decisions.

## Revision history

| Date | Version | Change |
|---|---|---|
| 2026-10-21 | 0.14.0.149-candidate | First durable numbered delivery handoff; records D08 baseline, D09 changes and explicit pending gates |
