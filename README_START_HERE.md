# v0.14.0.17 — Owner Reporting Controls + Frontend Audit

## Current answer
The screenshot confirms existing settings for **10 topics per 24 hours** and **60 replies per 24 hours**. It does not show an installed reporting policy. Current deployed/source reporting behavior is an SQL function with a hardcoded 10 reports/rolling 24 hours and 24-hour duplicate rule. **Those two protections cannot currently be toggled in the Admin Control Center.**

This package adds the actual Admin UI controls, a permission-checked Cloudflare API and an additive SQL migration candidate that makes the two settings persist and apply transactionally. Nothing was deployed or executed against Supabase.

## Features after migration and acceptance
Inside **Admin Control Center → Market Commons · Reports → Reporting Limits & Duplicate Protection**:
- Owner can independently enable/disable the configured reporting quota and duplicate-report restriction.
- Owner can configure maximum report count (1–100), rolling quota window (1–168 hours), and duplicate-restriction window (1–168 hours).
- Administrators/Moderators with `forum.view` see a read-only policy overview. Unauthorized accounts and Showcase are denied at the API layer. The database again checks actual OWNER authority for changes.
- Updates require confirmation, optimistic-lock revision matching, and write an audit record in the same transaction.
- An independent mandatory **500 reports/24 hours anti-abuse ceiling** remains, even if Owner disables the configurable limit. This ceiling is a last-resort internal guard, not a substitute for Cloudflare edge/bot rate limiting.
- Members see correct distinct responses for quota, duplicate, safety ceiling, validation and server faults.
- Existing configurable topic/reply settings (`10`/`60`) and `community.member_stats` are **not changed**.

**No prior reporting SQL A/B needs rerunning.** This is an additive post-lockdown extension. **Do not execute the included migration until you've reviewed the read-only preflight against the actual Supabase schema and tested the migration separately.**

## Archive overlay — NOT a full website ZIP
These are **complete replacement files** whose current GitHub predecessor SHA was verified at audit time:

| File | Change | Before Git blob SHA |
|---|---|---|
| `assets/js/site.js` | Replace; loads admin policy UI only on Admin page | `26f1ce478f9593b0d493d7e4293253a4310da2b7` |
| `functions/api/commons-report.js` | Replace; preserves target visibility/RLS logic while differentiating rejection messages | `84abeae799910c320641fb6e63d19901fbaf0378` |
| `learn/index.html` | Replace; add language/document metadata to existing redirect | `feea6364c67a98412ce4fd364007c1c52a7d0ef3` |
| `assets/js/admin-report-policy.js` | New frontend Admin module | n/a |
| `assets/css/admin-report-policy.css` | New responsive style | n/a |
| `functions/api/admin-report-policy.js` | New guarded Cloudflare API | n/a |

Other files in this ZIP are **unexecuted SQL, verification scripts, and documentation**.

**Safety:** Check that the listed predecessor Git blob SHAs still match your working repository before replacing existing source. Do not upload the ZIP as a standalone repository, which would delete the existing website. Make the changes to your current checked-out source. Read-only SQL first, reviewed migration once, read-only postflight and role-based preview acceptance, then production promotion.

## Current verified source
GitHub repository `cybernexuspublishing/stock-market-from-the-ground-up`, inspected `main` at `6b5809c212887f25b7242408b9cddb0c57255fb1` (2026-10-14T23:06:43Z), commit `v0.14.0.17_SITEWIDE_GOVERNANCE`. The current `PROJECT_MANIFEST.json` still declares `0.14.0.16`, so release labels remain inconsistent. This package intentionally does not overwrite the manifest.

## Frontend audit status
An initial **source-level frontend scan** was run on the current GitHub HEAD through the repository connector: all 70 HTML source files were reviewed for static asset refs and duplicate ID markers; 96 `assets/js/*.js` modules were parsed with the V8 JS parser. No definite missing static linked assets or duplicate HTML ID markers were found in those limited checks. Cloudflare Function source files were additionally screened; five `import`/`export`-containing files could not be tested by the non-module parser and must not be classified as syntax failures. This scan is not browser-based verification.

The exact complete GitHub tree **cannot be downloaded from this runtime's container** because outbound GitHub DNS is blocked. An *older local repository snapshot* (69 HTML files, 148 JS files including API Functions, 25 CSS after this overlay) was independently scanned; all 148 JS files passed Node syntax checking and 429 HTML asset references were found with no missing local asset. **20 manual-review candidates remain**: 13 inline HTML event-handler elements and 7 unlabelled search/input controls. Browser tests for the new reporting UI and mocked API passed. The old snapshot does not prove current GitHub frontend integration works.

### Not yet passed — frontend is **NOT production signed off**
- Authenticated real Owner/Admin/Moderator/Showcase negative-role tests and final staging/prod DB contract checks.
- End-to-end member reporting from a live URL with quota on/off, duplicate on/off, simultaneous submissions and real audit rows.
- Full browser regression across actual latest pages, 320px/mobile/tablet/desktop, screen reader, real Cloudflare Pages build/deploy and Web Vitals.
- A11y manual review and 20 static candidates requiring inspection.
- All payment, account, historical Lab and Market Simulator flows on live user records.
- Existing 419 Historical Lab identifiers and authored correctness verification in the live instance.

The desired frontend/backend phase boundary is **not yet reached**. The reporting controls require a verified backend contract before their frontend can be called functional. **Do not assert 'the entire frontend passed' based on syntax/links tests alone.**

## Verification sequence
1. Compare your source against the three recorded Git blob SHA values and apply the overlay without deleting existing files.
2. Run the included local frontend audit on the full current checkout: `python scripts/audit_frontend.py .` (script path is packaged here under `scripts/`).
3. Run read-only `supabase/admin/v0.14.0.17_REPORT_POLICY_PREFLIGHT_READ_ONLY.sql`; inspect results and back up before migration.
4. Review/test the additive `supabase/migrations/v0.14.0.17_OWNER_REPORTING_POLICY_REVIEW_REQUIRED.sql` on staging **only after prerequisites match**.
5. Run read-only `supabase/admin/v0.14.0.17_REPORT_POLICY_POSTFLIGHT_READ_ONLY.sql` and verify direct client grants remain revoked.
6. Preview deploy current checkout via existing `bash scripts/build-pages.sh` and output `public`. Validate all four role types and both community schemas. SQL B reporting lockdown must remain intact.
7. Before production release, resolve outstanding issues and rehearse rollback. Database rollback must preserve reports and policy-audit history; a code revert does not automatically undo the migration.
