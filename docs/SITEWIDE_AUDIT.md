# Site-wide source audit and acceptance status — v0.13.5.7.5

**Source examined:** GitHub `main` inventory had 338 tracked files in the current v0.13.5.7.4 tree. The 338-file release ZIP is the programmatic inspection baseline. GitHub's currently deployed application screenshots show a working Owner account, but those screenshots are not a substitute for full acceptance testing. A small number of regenerated documentation CSVs and a shell executable-bit differ between the GitHub tree and that release ZIP; critical production source assets compared by Git blob ID were identical. The new release supersedes its old release reports.

**Auditing method:** enumerated and classified every source file; ran automated syntax/asset/data tests and targeted headless Chromium fixtures. Source inspection does not validate every runtime code path. SQL files are migration provenance, not executed against Supabase. Passwords, member data, encrypted key material, payment configuration and current KDP Select status are not available for testing here.

## Implemented in this controlled release

1. **Admin sidebar:** `Account Management` is a canonical item directly under `Accounts` in `Accounts & Access`, regardless of whether the legacy sidebar grouping executes before or after the account editor. One button, one panel; the original account Users and Roles views are preserved.
2. **Dashboard:** all nine section tabs remain visible in a two-row or multi-row grid without a horizontal scrollbar, including Activity. Dashboard membership data now retries briefly and explicitly reports unavailable data instead of inventing free-plan or zero-book values.
3. **Market Commons:** each sub-forum requests only its own *published* topics, up to 30 at a time, with previous/next paging; the index deliberately shows a *recent sample* of up to 200 with clear non-total labels. Direct topic viewing requires `status=published`. Client prevents duplicate post submissions and validates lengths; Supabase RPC remains the authorization boundary.
4. **Security:** archived operational records may be restored only by OWNER in the legacy API. Legacy payment enable toggles are blocked unless the expressly unset `ENABLE_PAID_CHECKOUT` environment flag is enabled. Both checkout creation APIs fail closed unless that flag is exactly `true`. No approval to enable is implied.
5. **Deployment:** unchanged `bash scripts/build-pages.sh` build command, `public` output, existing stable file names. Service-worker public cache version increments to make the updated CSS/JS eligible for refresh; historic shims retained.

## Critical items NOT resolved or NOT production-verified

| Area | Evidence / problem | Required next action |
| --- | --- | --- |
| Supabase schema contracts | Exact v0.13.5.4 and v0.13.5.5 SQL migration sources are absent from repository; no live database introspection performed | Run **read-only** schema/RLS/function verification against current Supabase; reconcile missing objects without guessing migrations. |
| User/account writes | Live Owner account listing was shown; create, edit, delete, role changes, self/last-Owner protection and dummy vault were not exercised | Owner + admin + moderator + synthetic-only tests on staging; preserve encryption keys, do not show real passwords. |
| Dashboard membership after reload | Screenshot showed `Welcome back` without username and `Membership` rather than confirmed plan | Cold-browser sign-in, access endpoint response and role/entitlement consistency; new fallback prevents presenting zero as fact. |
| Market Commons permissions | Forum visible, but verified read/write/moderation/RLS and spam rate limiting are not established | Test published/draft/locked/removed topic visibility; rate limiting and report/ban flows with distinct test users. |
| Forum index completeness | Index uses 200 recent/pinned topics and clearly **does not claim global totals**; subforums are paginated | For a true complete global search/index, add authorized indexed server query or aggregate counts rather than scraping every topic in browser. |
| Site Builder | Admin-managed content exists; full visual editing, preview-publish-rollback, sanitization and asset upload are not complete | Separate planned build; do not call it a deployed visual builder. |
| Automations | Rule config drafts exist; no confirmed scheduler/worker execution | Implement runtime, idempotency, permissions, alerts and audit. |
| Backups | No verified database backup/restore or PITR rehearsal | Define external encrypted backups and test restoration without production data loss. |
| Historical education | 419 unique Lab IDs; 94 canonical Foundations IDs preserved; many sources have unverified ticker/date or market evidence | Validate actual date/session/ticker, adjusted bars, no-lookahead playback, trade/tape provenance and licensing. |
| KDP / checkout | Website pricing/status may not equal Amazon listing or provider billing; KDP Select prevents direct digital ebook sale | Keep checkout OFF pending publisher, KDP and Lemon Squeezy verification. |
| Showcase | Synthetic/read-only intent and guard code present, live negative testing incomplete | Test no production entitlements, writes or privilege escalation from Showcase. |
| Auth/privacy | Signed-in and public statistics worked in owner screenshots; cookie/privacy, PWA cache and all deep-link boundaries not comprehensively live-tested | Test anonymous/private API denial, CSRF/CORS considerations, CSP, client caching, Supabase RLS, production logs. |
| Data sources and education | Simulator, market-data tooling, replay and order flow have source code but live-feed constraints/accuracy unresolved | Independent test of provider permits, delayed data notices, timestamp/timezone/trading-session treatment. |

**Do not deploy direct sales, QR activation, mandatory CAPTCHA/MFA, or real Showcase entitlements as a side effect of this release.** The publisher's five approved book masters remain untouched.

### Source-level audit limits

An automated ledger (`FILE_AUDIT.csv`) enumerates every file with SHA-256, extension, size and the meaningful test coverage. The ledger records **source-presence and static testing**, not a false claim of production completion. Modules with historical version strings inside file contents are not duplicated runtime paths. Public `/api/*` URLs, versioned database migrations and legacy worker shims retain names for backward compatibility.
