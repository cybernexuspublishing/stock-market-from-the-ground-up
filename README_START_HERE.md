# The Stock Market: From the Ground Up — v0.14.0.24

**Package:** BACKEND PHASE 5 — Direct Upload

This is the established nested **source-file overlay ZIP** for the existing `cybernexuspublishing/stock-market-from-the-ground-up` GitHub repository. It is **not** a standalone website, repository replacement, executable patch script, or Cloudflare ZIP upload. All files are complete replacement/new source files at their canonical paths. Keep EVERY unrelated file in GitHub.

## What's new

- Admin > Market Commons: audited report case management (Start review / Resolve / Dismiss / Owner-only Reopen).
- Cloudflare `/api/admin-report-cases-v01424` uses real signed-in member JWT and delegates authority to Supabase RPCs (no service-role credential).
- New *review-gated* SQL builds transactional report state + mandatory audit, role checks and concurrency locks.
- Read-only Supabase prerequisite and post-installation checks, automated source/API tests, release evidence.
- Release version synchronized for config, route policy, service worker and current test constraints.

## Deployment rules

1. Upload the **file contents** into the existing GitHub repository, preserving directory structure and every unrelated file. Never overwrite the repository with only this ZIP.
2. Monitor GitHub workflow results; Cloudflare deployment is not proof SQL is applied.
3. The SQL file at `supabase/migrations/v0.14.0.24_MODERATION_CASES_REVIEW_REQUIRED.sql` **does not execute automatically**. It is for reviewed staged installation **only**, following the read-only SQL preflight.
4. **Do not run SQL against production merely because this ZIP has been uploaded.** Real staff roles, privileges, MFA enforcement, case disposition and audit constraints must be validated in staging and explicitly authorized by the Owner.
5. The new UI will show a meaningful error until its SQL is installed; it does not fabricate report actions. Other existing admin/market functions are preserved.

**QA:** Local source checks and mocked API tests must be run as part of GitHub workflow. No claim of production role-E2E or migration validation is made.

Full findings, staged test plan, and limitations: `docs/BACKEND_PHASE_5_v0.14.0.24.md`.
