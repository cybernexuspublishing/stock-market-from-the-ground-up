# v0.14.0.25 — BACKEND PHASE 6 · DIRECT-UPLOAD SOURCE OVERLAY

**Project:** The Stock Market: From the Ground Up (Cyber Nexus)  
**Source baseline:** GitHub main `7c03889561979cc67b28ec280449311e2493d40d` (v0.14.0.24)  
**Deliverable:** Entire replacement source FILES in correct repository paths. This ZIP is an overlay, NOT a complete GitHub repository export.  
**Deploy:** Upload this ZIP using the established GitHub file-overlay procedure. Preserve all files not in this ZIP. No patch scripts, no automated database writes.  
**SQL:** `supabase/migrations/v0.14.0.25_MODERATION_AUDIT_HISTORY_REVIEW_REQUIRED.sql` requires staging review and separate authorization. Uploading the ZIP does not run it.  
**Status:** Locally checked source release candidate. Live database role tests and production browser acceptance NOT performed.

## Verified source issue from v0.14.0.24

GitHub main v0.14.0.24 `7c038895...`: 5 workflows succeeded but **Backend Contract v0.14.0.24 FAILED**. In GitHub run 38771798011, the **Isolated Chromium moderation case component test** step failed; source and API checks succeeded. The workflow did not install Playwright/Chromium after setting up Python. Install steps added to both v024 and v025 CI. The true remote traceback was not accessible, so browser dependency setup is a strongly indicated cause, not an established complete root-cause analysis. Recheck actual CI after deployment.

## New functionality

OWNER / authorized moderators can open a report's **View decision history** in the existing Admin > Market Commons audited case panel. The lazy-loaded history uses the real JWT, the v0.14.0.24 moderation actor policy and an additive read-only SECURITY DEFINER RPC. Only the last 50 v024+ transactional report-case transitions are returned (status from/to, decision note, timestamp). No reporter/staff identifiers, unrelated audit details or member content is exposed. All text is inserted via textContent, never interpolated as untrusted HTML. If SQL is not installed, UI reports unavailability without inventing records.

## SQL review order

1. Run `supabase/admin/v0.14.0.25_AUDIT_PREFLIGHT_READ_ONLY.sql`. All prerequisites must be present.
2. Test migration on a **staging** Supabase project. Check `SECURITY DEFINER`, `search_path`, RPC permissions, active OWNER/staff permission, signed-out/Showcase/suspended denial, nonexistent report, sample previously audited report, idempotent repeated reads. Use synthetic reports and audit entries only.
3. With explicit authorization, install the reviewed SQL on production **if and only if staging passes**. Run `supabase/admin/v0.14.0.25_AUDIT_POSTFLIGHT_READ_ONLY.sql`. Expected history installed=true, member_execute=true, anon_execute=false; search_path configured.
4. In the Admin UI inspect two reports, one with v024 transitions and one without. Ensure historical legacy actions correctly show the coverage limitation.

## Existing high-priority risks NOT resolved by this release

- The legacy `/api/admin?action=report_resolve`, `/api/admin-v0133`, and some moderation actions still use separate database writes and best-effort audit. Their transitions are **not** atomic with audit, unlike the v024 audited case endpoint. Consolidate them before declaring moderation-wide audit integrity.
- Followed-discussion and mention delivery have not passed signed-in multi-member browser tests; source-only CI and SQL object checks cannot certify delivery.
- Installed report policy v01417 has not been independently verified in Supabase; do not assume policy is available.
- Production member-role RLS, checkout/payment idempotency/reversals, user data retention, book key/access, all 419 historical labs and no-hindsight controls, simulator, journal, Tutor and GWS tenant isolation all require separate acceptance evidence.
- GitHub main branch is not protected by mandatory passing checks. Cloudflare deployed SHA parity was not independently measured.
