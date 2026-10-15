# The Stock Market: From the Ground Up — v0.14.0.20
## BACKEND PHASE 1 — DIRECT-UPLOAD ZIP

**Repository baseline:** `a6f1627ac1c9b13b6c0339440885ab05711a679f` (v0.14.0.19).

This is the **same nested full-source-file overlay workflow** used for previous releases. It is not a standalone website and does not contain patch scripts. Each contained file is complete at its correct path. Extract/upload over the existing repository **without deleting or replacing unrelated files**.

This ZIP **starts backend implementation** with Owner-only backend contract inventory, authenticated notification preferences, a reviewed SQL candidate for subscriber alerts, read-only SQL pre/postflight checks, automated backend security tests, and engineering documentation. It does not deploy a new Supabase schema by itself.

### Installed by GitHub upload and Cloudflare deployment
- `functions/api/backend-contract-v01420.js` — OWNER-only GET backend contract inventory.
- `functions/api/community-notification-preferences.js` — authenticated GET/POST preferences; uses member JWT, never server service-role key.
- `.github/workflows/backend-contract-v01420.yml` — CI gate on source changes.
- `tests/*v014020*` — QA contracts.
- `docs/BACKEND_PHASE_1_v0.14.0.20.md` — technical controls, risks and acceptance.

### Requires separate Owner-reviewed database operation
- `supabase/admin/v0.14.0.20_BACKEND_PREFLIGHT_READ_ONLY.sql` — read-only prerequisites.
- `supabase/migrations/v0.14.0.20_COMMONS_SUBSCRIPTION_NOTIFICATIONS_REVIEW_REQUIRED.sql` — additive, **NOT executed by uploading ZIP**; test in staging first.
- `supabase/admin/v0.14.0.20_BACKEND_POSTFLIGHT_READ_ONLY.sql` — run read-only after approved staged/prod migration.

**Important:** Until the SQL candidate is installed, the notification preference API will correctly return a backend-unavailable error. The subscription notification trigger will not run. The existing reporting-policy / advanced-forum migrations are separate review-gated work, and their installed status has not been confirmed.

**No production SQL, checkout/payment activation, role changes or data migration were executed by preparation of this package.** No changes were pushed to GitHub. Retain v0.14.0.19 frontend functionality.

**Version classification:** v0.14.0.20 — backend phase 1 source candidate; NOT full backend readiness or production acceptance.
