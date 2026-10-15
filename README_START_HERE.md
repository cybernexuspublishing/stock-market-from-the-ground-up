# v0.14.0.26 — BACKEND PHASE 7 · DIRECT-UPLOAD ZIP

**Project:** The Stock Market: From the Ground Up (Cyber Nexus)  
**Package type:** COMPLETE replacement source files at the correct paths, no manual patch scripts.  
**Source basis:** GitHub `main` `7c03889561979cc67b28ec280449311e2493d40d` (v0.14.0.24).  
**Package includes:** Previous v0.14.0.25 source overlay **plus** v0.14.0.26 changes. The owner reported v0.14.0.25 SQL installed, but GitHub `main` still showed v0.14.0.24 at packaging. Including v0.14.0.25 source dependencies avoids producing a broken partial v0.14.0.26 overlay.

## Deployment

Upload the ZIP source files using the same GitHub overlay procedure. **Preserve unrelated files** and exact nested directories. Do not use the ZIP as a complete repository replacement, do not upload it directly to the Cloudflare public asset root, and do not publish SQL files. Uploading a ZIP to GitHub does not execute any SQL.

## v0.14.0.26 implementation

The former Admin report endpoints update status then separately attempt audit writes; a lost audit write can leave a report changed but unlogged. A new **review-required, fail-closed PostgreSQL status-audit trigger** records EVERY report status transition in the *same transaction* across old and new endpoints, without changing their browser/API contracts. Trigger entries deliberately lack unverifiable staff-attribution assertions; new case RPCs continue to create their more detailed transactional decision entries separately. This does not fix other moderation action audits or eliminate other security tasks.

## Owner-only SQL procedure

1. Inspect `supabase/admin/v0.14.0.26_AUDIT_GUARD_PREFLIGHT_READ_ONLY.sql` on staging.
2. Review and test `supabase/migrations/v0.14.0.26_REPORT_STATUS_AUDIT_GUARD_REVIEW_REQUIRED.sql` on a separate staging project, including forced audit failure tests. **DO NOT blindly execute on production.**
3. Only after explicit authorization, apply reviewed SQL and run `supabase/admin/v0.14.0.26_AUDIT_GUARD_POSTFLIGHT_READ_ONLY.sql`.
4. Read `docs/BACKEND_PHASE_7_v0.14.0.26.md` for exact checks and limitations.

## CI / files

New `.github/workflows/backend-contract-v01426.yml` checks current plus earlier source/API/browser boundaries. The old v0.14.0.25 source check is updated to accept a later build while enforcing matching config/route policy/service-worker versions. No test is disabled. ZIP includes `RELEASE_MANIFEST_v0.14.0.26.json` with file hashes. Production authentication E2E and Supabase SQL execution **have not occurred** in the packaging environment.
