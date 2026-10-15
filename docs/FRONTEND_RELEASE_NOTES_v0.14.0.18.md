# v0.14.0.18 Direct Frontend Source Overlay — Release Record

| Field | Value |
|---|---|
| Organization | Cyber Nexus |
| Project | The Stock Market: From the Ground Up |
| Repository | cybernexuspublishing/stock-market-from-the-ground-up |
| Base commit | ded55fc7955b52779bd52a8da2cfc79bf67288e3 |
| Version | v0.14.0.18 |
| Artifact type | Direct GitHub source-file overlay ZIP, nested directory layout |
| Release status | Development candidate; no production deployment |
| Supabase SQL | No migration executed |
| Dependencies | Current repository plus Cloudflare Pages Functions, Supabase Auth/PostgreSQL/RLS |
| Document location | docs/FRONTEND_RELEASE_NOTES_v0.14.0.18.md in archive |
| Google Drive location / ID | Not created / Not assigned |
| Prepared | 2026-10-14 (America/Chicago) |
| Revision | 1 |

## Verified source-level changes

- Preserved canonical site bootstrap scripts and existing reporting/admin-enhancement injections in `assets/js/site.js`.
- Added dedicated new-tab Market Commons composer using the approved `commons_create_topic` RPC, without creating a new database table or entitlement pathway.
- Added client-side reply-navigation intent with an authenticated count query. The number of posts is not evidence that a specific submission succeeded; the existing RPC remains authoritative.
- Replaced ambiguous checkout/account URL-state copy with instructions to confirm billing and permissions in an authenticated account.
- Added `new-discussion` to the member-only route policy loaded by Cloudflare middleware and the service worker.
- Advanced service-worker public cache namespace; did not expand caching to protected routes.
- Preserved KDP Select eBook exclusivity and disabled direct digital sales flags.

## Explicitly open defects and acceptance gaps

- Backend and RLS authentication and role tests were not executed; forum and paid-admin API integration cannot be certified.
- Owner-controlled report-allowance and duplicate-report SQL candidate is separate and unexecuted.
- Full staff moderation, notifications/announcements, mentions, subscriptions, polling, attachments and quota policy administration remain incomplete or unverified.
- All 419 historical Lab IDs, assessment correctness, simulator no-hindsight contract, subscriptions/renewals and Lemon Squeezy production webhook behavior require independent acceptance.
- No full WCAG 2.2 AA screen-reader/multidevice verification, complete source repository security audit, or Cloudflare live-deployment parity check was performed.
- The source still includes version strings older than v0.14.0.18 in the middleware and unrelated legacy modules. Normalization in browser runtime is not the same as fully audited source metadata.

## Rollback

Restore the pre-overlay versions of the five replaced paths (`config.js`, `sw.js`, `assets/js/site.js`, `assets/js/route-policy.js`, and `assets/js/status-platform.js`) and remove the four newly added runtime files. Keep existing database migrations untouched. Invalidate public service-worker caches according to normal release procedure.

## Revision history

| Date | Version | Change | Status |
|---|---|---|---|
| 2026-10-14 | v0.14.0.18 | Direct source files for targeted frontend corrections, without patch scripts | Candidate / NO-GO for full frontend sign-off |
