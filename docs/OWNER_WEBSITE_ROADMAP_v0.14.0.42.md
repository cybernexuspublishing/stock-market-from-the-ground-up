# Website Development Roadmap — Owner / Super Admin

| Document control | Value |
| --- | --- |
| Company | Cyber Nexus |
| Product | The Stock Market: From the Ground Up — Companion Learning Platform |
| Project | Website Development |
| Document ID | GU-WEB-ROADMAP-014042-20261017 |
| Filename | `OWNER_WEBSITE_ROADMAP_v0.14.0.42.md` |
| File type | Markdown (`.md`) |
| GitHub location | `docs/OWNER_WEBSITE_ROADMAP_v0.14.0.42.md` |
| Google Drive location / file ID | Unassigned; no Google Drive copy or document ID created |
| Version / prepared | v0.14.0.42 / 2026-10-17 |
| Status | Source implementation candidate on feature branch; **not deployed or production certified** |
| Repository | `cybernexuspublishing/stock-market-from-the-ground-up` |
| Branch | `feature/owner-website-roadmap-v014042` |
| Dependencies | Existing Supabase Auth, `admin_user_roles`, `profiles`, `admin_user_flags`, `site_settings`, `admin_audit_log`; existing Cloudflare Pages Functions |
| Purpose | Private, persistent Owner checklist of all recoverable website commitments and historic requirement sources; evidence-aware progress tracking |

## Access, location, and behavior

1. Authorized active account with the server-verified `OWNER` role (displayed as **OWNER / SUPER ADMIN**) sees **Website Development Roadmap** in the username profile dropdown, both desktop and responsive mobile menu.
2. The new page is `/owner-roadmap.html`. It requires a verified login and Owner API authorization; ordinary Admins, Moderators, members, TEST/SHOWCASE, restricted and suspended accounts cannot retrieve the roadmap or modify progress. The HTML shell is a static publicly deliverable file, but private catalog/status data are delivered only after the server checks Owner authorization.
3. The status tracker has per-item **completion checkbox**, more granular workflow selector (Not Owner-reviewed, In Progress, Implemented/Needs Verification, Blocked, Deferred, Owner Marked Complete, Evidence Verified), optional notes and acceptance evidence. A checkmark means Owner attestation, **not** automatic verification that an implementation is in production.
4. Search by title, acceptance description, source, ID, or Owner notes; filter by workstream and status; paginate; view current counts; export private CSV or JSON; append Owner-defined tasks and archive them without rewriting approved source records.
5. Statuses are shared across Owner accounts, persist server-side in the same Supabase instance, survive browser/device changes, and record `updated_at` and `updated_by`. The API writes an `admin_audit_log` record where possible and reports audit failures rather than falsely indicating audit success.
6. The tracker does **not** toggle live business features, activate payments, disable security controls, edit book rights, change product pricing, run migrations, or deploy production.

## Coverage inventory

| Source and view | Records | Meaning |
| --- | ---: | --- |
| Consolidated current project commitments | 166 | Explicit website scope organized by foundation, public, identity, membership, books, Stripe, learning, journal/simulator, Market Commons, administration, security and operations. |
| 77-step acceptance register | 77 | Historical engineering, integration, deployment and production release gates with remaining checks. |
| Preserved promises/readiness matrix | 38 | Previously documented Owner commitments with earlier evidence levels and remaining work. |
| **Project commitments total** | **281** | All status toggles are initially unreviewed unless the Owner saves a newer status. |
| Master website and advanced-engineering requirement trace | 1,815 | Source lines extracted from the preserved comprehensive requirement source texts; 1,668 actionable/statement rows and 147 structural/metadata rows. |
| **All records** | **2,096** | Structural records displayed in their own reference tab; duplicate requirement statements are not silently discarded. |

The 1,815-row historical trace is an exhaustive reproduction of the repository's **existing recorded source-line register**, not a guarantee that every sentence from every old chat is independently accessible. Older source lines may be redundant and some are instructions or aspirations rather than approved Version 1 scope. Current decisions and later corrections take precedence over conflicting old source rows. New Owner decisions may be entered as additional tasks.

**Source references preserved:** `docs/sitewide/REQUIREMENTS_REGISTER.csv`, `docs/sitewide/SOURCE_MASTER_WEBSITE_REQUIREMENTS.md`, `docs/sitewide/SOURCE_ADVANCED_FORUM_REQUIREMENTS.md`, `docs/v0.14.0.6_77_TASK_VERIFICATION_REGISTER.csv`, `docs/PROMISES_AND_READINESS_MATRIX.csv`, `docs/STRIPE_CATALOG_UNIFICATION_v0.14.0.41.md` and the owner's prior website project decisions.

## New files required (added on feature branch)

| File | Function |
| --- | --- |
| `owner-roadmap.html` | Private tracking page's browser shell |
| `assets/css/owner-roadmap.css` | Scoped responsive design and accessible controls |
| `assets/js/owner-roadmap.js` | Client UI, search/filter/pagination, checkboxes, notes, export |
| `functions/api/owner-roadmap.js` | Owner-authenticated, private status API and audit |
| `functions/_lib/owner-roadmap-catalog.js` | Server-only comprehensive source requirements |
| `docs/OWNER_WEBSITE_ROADMAP_v0.14.0.42.md` | This document-control and handoff record |
| `tests/test_owner_roadmap_v014042.py` | Static security/release contract checks |
| `.github/workflows/owner-roadmap-v014042.yml` | Source/Pages-build validation |

Existing files amended: `assets/js/navigation.js` and `assets/js/route-policy.js`. No other approved menu destination, account behavior, price, membership, curriculum, Stripe configuration, deployment setting, or database migration is intentionally changed.

## Persistence, database and risk controls

- **No new SQL migration required**, assuming preexisting `public.site_settings` and `public.admin_audit_log` are correctly deployed.
- `site_settings` rows use private prefixed keys `owner_roadmap.task.*` and `owner_roadmap.custom.*`, `public_read=false`; ordinary anon/authenticated Supabase clients cannot read these rows under existing RLS.
- The `functions/_lib` catalog is not copied into the static Pages `public/` build. It is bundled in the private Pages Function. There are no tokens, keys, account records or financial private data in the catalog.
- All writes validate the authenticated Supabase user, active `OWNER` role, member account kind, unblocked status, optional enforced staff MFA, bounded payload, allowed status values, task IDs and origin.
- Owner-added tasks are only soft-archived. Existing source records remain immutable; completion changes only stored progress.
- A failed audit-log write is signaled to the browser; a stricter transactional audit should be implemented if the Owner later determines every status update must be committed atomically with an audit record.
- If any privately namespaced `site_settings` row is found marked public, the API fails closed rather than returning roadmap content.
- Supabase storage and Cloudflare backend availability remain operational dependencies; there is no browser-only fabricated progress fallback.

## Pending acceptance — do not call production complete

1. Run `python3 tests/test_owner_roadmap_v014042.py` and the standard release test/build pipelines on this branch.
2. Review the code diff and open/approve the feature PR; avoid direct production merge before acceptance.
3. Verify the Cloudflare Pages build includes `owner-roadmap.html`, CSS/JS, `/api/owner-roadmap`, and does not publish `functions/_lib/owner-roadmap-catalog.js` or private source files.
4. Verify the actual Supabase production tables, permissions and row-level security using read-only checks before deployment. Do not blindly run historic migrations.
5. In a controlled preview with approved Owner account, verify desktop/mobile dropdown navigation, full 2,096-record response, status saving after reload/device change, multi-Owner visibility, exports and custom tasks.
6. Verify unauthenticated user receives 401, normal Member/Admin/Moderator/SHOWCASE/TEST and blocked Owner receive 403, and forged post/invalid ID/cross-origin input is denied.
7. Confirm a real audit row for every status update and archive action; review the impact of audit best-effort behavior.
8. Test keyboard/screen-reader and mobile behavior (small viewport and 200% zoom) plus partial network/provider failures.
9. Do **not** mark 281 items completed automatically; Owner must validate and record individual evidence. Release manifest v0.14.0.41 remains the currently observed base and is **not** modified by this feature PR.
10. Do not enable any Stripe checkout, direct eBook sales under KDP Select, mandatory staff MFA, payment fulfillment, or other gated capability from this checklist.

## Revision history

| Version | Date | Summary | Status |
| --- | --- | --- | --- |
| v0.14.0.42 | 2026-10-17 | Complete repository-backed Owner roadmap inventory and private tracker implementation candidate | Pending code review and live acceptance |
