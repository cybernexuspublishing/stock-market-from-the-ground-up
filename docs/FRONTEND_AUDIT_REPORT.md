# Frontend QA and Engineering Audit — v0.14.0.17 (partial, evidence-based)

**Requested outcome:** inspect *every* frontend screen; repair defects; declare the frontend ready to move to backend only after verification.
**Achieved outcome:** source-based coverage of current GitHub frontend file inventory plus isolated working Owner policy controls. This is **NOT** a certification of the full frontend and is **NOT** a backend-complete release.

## Current source baseline
- GitHub repository: `cybernexuspublishing/stock-market-from-the-ground-up`.
- Inspected `main` SHA: `6b5809c212887f25b7242408b9cddb0c57255fb1` (2026-10-14T23:06:43Z), labeled `v0.14.0.17_SITEWIDE_GOVERNANCE`.
- Manifest contradiction: `PROJECT_MANIFEST.json` still reports 0.14.0.16. Needs release reconciliation, not arbitrary version bump.
- The repository could be inspected through the GitHub connector; its exact current full tree was **not available for local build tests** because the container cannot resolve GitHub over the network. Older local snapshot used for build and automated static analysis is clearly identified as such.

## Results completed

| Test | Scope | Result | Meaning |
| --- | --- | --- | --- |
| Current GitHub HTML static references/ID markers | 70 `.html` source files through connected GitHub read | PASS for inspected static conditions (one `../learn.html` relative path is a valid link, not a missing asset) | Does not verify browser data/behavior |
| Current GitHub asset JS parse | 96 `assets/js/*.js` read and parsed as scripts by JavaScript parser | PASS syntax | Does not run functions or import dependencies |
| Current GitHub Cloudflare Function parse sampling | 50 `functions/**/*.js` files; five have import/export syntax outside `new Function` script mode | REVIEW: module semantics require module-aware parse | Not considered failures |
| Local historical snapshot source static checks | 69 HTML, 148 JS, 25 CSS after reporting overlay | PASS Node syntax (148/148), 0 duplicate IDs, 0 missing local asset refs across 429 references, 0 missing `lang` | Snapshot is older than current GitHub; not current deployment certification |
| Local historical snapshot manual-review flags | 13 inline event handlers, 7 input labels | **REVIEW (20)** | Non-breaking but warrants accessibility/security/maintenance review against live source |
| Reporting policy UI simulation | 375px headless Chromium: controls, disabled fields, read-only staff, post | PASS | Browser-mocked data only |
| Reporting policy API simulation | OWNER / ADMIN / MODERATOR / SHOWCASE / suspended / stale revision / invalid bounds / absent DB | PASS | Mocked Supabase; real RLS/grants not exercised |
| Existing reporting handler cases | Success, quota, duplicate, generic failure, safety limit, invalid data, expired permissions; member JWT scope | PASS | Mocked Supabase only |
| Cloudflare Pages static build (historical snapshot) | `bash scripts/build-pages.sh`: 262 files | PASS build, correct asset paths, protected `data/interactive-labs.json`, SQL and Functions excluded from `/public` | Does not certify current GitHub `main` build or production deployment |
| Real deployed mobile/desktop, all member/Admin screens | Current Cloudflare preview or production | NOT RUN | Must be tested on exact source and actual sessions |
| Supabase migration/SQL parse/integration | Current Supabase project | NOT RUN | No PostgreSQL runtime or Supabase migration applied |
| 419 Historical Labs & financial-data integrity | Complete authenticated exercise and data contracts | NOT RUN | Catalog and no-hindsight must be verified |
| Subscriptions/commerce/account creation | End-to-end actual provider/DB | NOT RUN | Protect KDP, Showcase, entitlements |

## Issues and risks to resolve before frontend sign-off

- **P0: Backend contract** — the current deployed report handler has hardcoded 10/24h reporting and duplicate checks, and generic error handling. New frontend toggles are not actually functional until independently reviewed SQL is applied. The migration is intentionally *not* run.
- **P0: Role/privilege** — the Admin UI must be tested with real Owner, Moderator, Administrator, restricted, suspended and Showcase sessions. API and SQL authorization are implemented but only mocked in tests.
- **P0: Version drift** — current main is labeled v0.14.0.17 but manifest remains v0.14.0.16. Current Cloudflare deployed SHA is not established.
- **P0: Content/data safety** — historical Lab no-hindsight, RLS gating, credit card/payment provider secrets and KDP Select rules must not be changed by UI redesign. No live verification has been done.
- **P1: Accessibility** — seven inputs with no static label association in historical snapshot; verify actual labels, programmatic naming, keyboard focus and high zoom. Legacy `learn/index.html` missing an HTML language wrapper was corrected as a full file.
- **P1: Maintainability** — 13 inline event-handler appearances in historical HTML; they are *not automatically security vulnerabilities*, but limit CSP hardening and progressive enhancement. Remove only with equivalent tested listeners.
- **P1: Design and navigation** — major website areas need manual keyboard, touch, tablet/mobile, zoom and screen-reader testing on current source. Synthetic screenshots are not adequate evidence.
- **P1: Report abuse** — disabling business quota/duplicates raises spam risk. The DB retains a fixed 500/24-hour ceiling, but stronger endpoint velocity/bot defenses remain a recommended operational layer.
- **P2: Performance** — no Lighthouse/Web Vitals or realistic concurrent backend load measurement was conducted; do not make benchmark claims.

## Required acceptance to declare frontend complete
Complete an exact-commit Cloudflare preview build and automated in-browser workflow tests for all public/member/Admin pages; test role-negative paths; validate each form with a real backend response; run a WCAG 2.2 AA review; fix or explicitly accept every P0/P1 finding; verify mobile and keyboard; reconcile release version; exercise the SQL migration under staging and postflight grants. Only then can the Owner reasonably sign off the frontend phase.

**Verdict: BLOCKED — the frontend cannot yet be declared fully complete or ready for a clean backend-only phase.**
