# Trading Journal V1 — Implementation and Release Acceptance Register

**Company / imprint:** Cyber Nexus / Crown & Lantern Press  
**Project:** The Stock Market: From the Ground Up  
**Document ID:** SMFGU-JOURNAL-IMPROVEMENT-001  
**Filename / file type:** `docs/releases/2026-10-27_TRADING_JOURNAL_IMPROVEMENT_v1.0.md` / Markdown (.md)  
**Google Drive location and document ID:** Not assigned. GitHub main is the authoritative source; no Drive duplicate created.  
**Version:** 1.0  
**Prepared / owner approval:** October 27, 2026  
**Status:** SOURCE IMPLEMENTED; PRODUCTION SCHEMA INSTALLED; MEMBER/CI ACCEPTANCE NOT YET FULLY PROVEN  
**Purpose:** Improve the existing educational Journal without replacing its ledger, analytics, replay or membership policy.  
**Dependencies:** Existing `decision_journal`, `trade_plan_snapshots`, `journal_reviews`, Supabase Auth/RLS, Free quota RPC, paid `JOURNAL_ANALYTICS` backend gate, verified replay link, 30-competency registry, Cloudflare Pages main deployment.

## Controlling decisions

1. Maintain exactly one existing member Journal and one paid private analytics product. Avoid a second trade ledger or cloned analytics API.
2. Free membership retains 15 Journal records each UTC week, including at most 10 saved browser simulator exercises, with reset Monday 00:00 UTC. No extra Spark charge for definitions, explanations or Journal reflection.
3. Advanced Analytics remains payable only under independently valid entitlements; the $29.99 catalog reference and checkout-enabled flags are unchanged.
4. No LIVE payment, authorization, capture, test charge, Stripe mutation or checkout activation was included.
5. Preserve distinct live, paper, observation, fictional exercise and reviewed historical-replay provenance. Hypothetical education is not brokerage-confirmed execution or certified competency.
6. Original pre-decision snapshots remain locked. Corrections apply to actual and reflection fields and are privately logged when made after closure.

## Implemented source changes

| Requirement | Actual source path | Implemented behavior |
|---|---|---|
| Financial null, planned R and Eastern Time corrections | `assets/js/journal-common.js` | Missing inputs stay unmeasured; explicit $0 stays flat only when closed; planned entry-stop risk denominator; rejects ambiguous DST; validates high/low range |
| Valid pre-trade stop, target and closing-cost fields | `assets/js/journal-entry.js` | Stops on wrong side, invalid targets, nonpositive fills and absent fees block the applicable action |
| Canonical plan-adherence enum | `functions/api/advanced-journal-insights.js` | Uses YES/PARTIAL/NO instead of a boolean assumption |
| Guided/advanced view, risk panel, coaching | `assets/js/journal-guided-v1.js`, `assets/css/journal-guided-v1.css`, `journal-entry.html` | Progressive stages without duplicating the data model; factual educational risk limitations and ungraded lesson suggestions |
| Stable setup suggestions | `data/journal-taxonomy.json` | Versioned recommended setup names while preserving older and custom names |
| Private chart evidence gallery | `assets/js/journal-evidence-v1.js`, `journal-entry.html` | Image upload, short-lived private display URL, note, user-claimed capture time, deletion, private RLS metadata |
| Private image data/usage protection | `supabase/migrations/20261027_journal_evidence_v1_private_storage.sql` | Nonpublic bucket, max. 5 MB/image, MIME allowance, six images per Journal, member-owned path and metadata |
| Private actual correction history | `supabase/migrations/20261027_journal_actual_corrections_v1.sql`, `assets/js/journal-actual-history-v1.js` | A private append-only audit trigger records meaningful postclosure changes; members may read their own log but cannot directly insert or alter it |
| Weekly free process reflection | `assets/js/journal-weekly-v1.js`, `assets/js/journal.js`, `journal.html` | Week-scoped self-reported process and no-trade summary; deliberately excludes paid financial analytics |
| Regression | `tests/test_journal_guided_integrity_v1.mjs` and `.github/workflows/market-analysis-v014146.yml` | Source contract and finance/DST assertions added to main-push CI |

## Database and security acceptance

Connected production project: `oxihglyfgzywsupnyicb`, named `stock-market-from-the-ground-up`. Existing `decision_journal` confirmed RLS enabled before migration.

- `journal_evidence_v1_private_storage_20261027`: Applied successfully, without modifying the existing Journal ledger. Read-only postflight found a private image bucket; 5 MB bucket limit; RLS-enabled evidence metadata; three metadata ownership policies; three storage object policies; enabled six-image-cap trigger.
- `journal_actual_corrections_v1_20261027`: Applied successfully. Read-only postflight found private history RLS, its owner-read policy, enabled audit trigger, and no `anon` SELECT or `authenticated` direct INSERT permission.
- User-entered capture time and before-decision attestation are **self-reported**. Server upload time is independently logged. Never claim captured timestamps authenticate pre-trade evidence.
- Production member rows and screenshots were zero at postflight. Schema policies and trigger presence alone do not prove authenticated upload or cross-account isolation.
- Supabase security advisors report pre-existing informational findings elsewhere. Do not assume they were fixed by the Journal migration.

## Required exact-revision acceptance before declaring beta-ready

1. GitHub: all triggered checks for final `main` revision must finish successfully. Check Journal regression, syntax and Pages build. A deployment status cannot substitute for a GitHub Actions result.
2. Cloudflare: confirm production account `stock_market_from_the_ground_up@yahoo.com`, project `stock-market-from-the-ground-up`, production branch `main`, and latest Git commit SHA.
3. Signed-in Free: create within quota, save draft, lock plan, reject invalid stop, close trade/no-trade, reload, check weekly review and spaced review, export, logout/relogin; verify limit after 15 weekly records and no unauthorized premium analytics.
4. Signed-in premium/Owner-granted tool: confirm private analytics API access consistent with actual entitlement, expired/canceled/restricted grants denied, and live versus paper source isolation.
5. Evidence: account A creates a Journal, saves and views a valid screenshot, deletes it, and sees it vanish after reload; account B fails to access A's metadata or image, direct storage bypass fails, oversize and seventh upload fail.
6. Corrections: after closure, edit an actual amount and explanation, confirm before/after history; cross-account and direct member audit writes denied; locked pre-plan unchanged.
7. Responsive/assistive technology: keyboard focus, meaningful input labels, stage navigation, readable compact layout, screenshot alt text, and accessible error messages.
8. Operational recovery: review rollback order, data retention of private attachments, retained history, recovery from metadata/upload partial failure and notification of affected members.

## Explicitly outside Journal V1

- Brokerage connection/import, automatic trade reconciliation, account equity and tax reporting.
- Multi-fill accounting and complex scale-in/scale-out position-path mathematics. Do not force such executions into a constant-size approximation.
- Automatic certified grading from a personal journal; this remains dependent on reviewed canonical rubrics and evidence.
- Market data redistribution or reconstruction from commercial platform screenshots without rights review.
- New paid services, recurring SaaS costs or LIVE Stripe transactions.

## Safe rollback order

1. Revert affected Journal source revisions on `main` only after reviewing the latest source compatibility and exact deployed SHA.
2. Preserve existing evidence and corrections; neither new table should be dropped in a routine rollback. Disable the new UI first if storage or row-policy issues are detected.
3. For security issues, close access with reviewed RLS/grant updates and investigate; do not make the image bucket public to work around a permission error.
4. Full DB rollback requires a separate reviewed migration and retention/deletion decision. SQL changes are not safely reverted by a Git revert.


## Verified implementation evidence — October 28, 2026 UTC

**GitHub source/build revision:** `7be2e6ceb5df6c03a99f88bba8e4109f392f164f`, branch `main`. Cloudflare Pages production deployment `9dd72b5a-3c2c-412c-bb0a-6af061c45545`, Yahoo-owned account, project `stock-market-from-the-ground-up`, completed with `deploy/success`.

**Build evidence:** Cloudflare deployment logs show `bash scripts/build-pages.sh` and the exact line `PASS Journal v1: null/flat, planned R, fee validation, MFE range, ET/DST, enum, guided UI.` All six new/updated Journal JavaScript modules passed `node --check`, the site output generated 572 static files, and Pages Functions compiled. This proves the deterministic source regression and production build, not a genuine authenticated user journey or a passing comprehensive GitHub Actions suite.

**SQL transaction QA:** On the correct production project, a single transaction inserted temporary Journal/evidence records using two existing account identities, simulated the authenticated database role and each subject in turn, verified own-row reads versus cross-account denial, verified six-image limit and seventh-image rejection, exercised post-closure correction-history generation, verified that the second identity could not see it, and rolled back. No test records remained: `decision_journal=0`, `journal_evidence_v1=0`, `journal_actual_history_v1=0`, `journal_reviews=0`. This is database-level simulation, **not** a substitute for real signed-in HTTP authorization and browser testing.

**Remaining release gate:** Real member sign-in, signed URL expiry and image download, file upload/deletion, two-browser session isolation, Free quota, payment entitlement segregation, mobile/keyboard/screen-reader acceptance, and exact-head GitHub Actions completion evidence still need independently observed results. No LIVE payments were initiated.

## Revision history

| Version | Date | Change | Status |
|---|---|---|---|
| 1.0 | 2026-10-27 | Approved Journal improvements, source implementation, two additive production migrations, private evidence and correction controls, CI gate and remaining acceptance criteria | Implemented; end-to-end acceptance pending |

**Document control footer:** SMFGU-JOURNAL-IMPROVEMENT-001 · v1.0 · October 27, 2026 · GitHub main · No LIVE payment authorization.
