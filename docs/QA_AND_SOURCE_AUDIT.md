# v0.13.5.7 — Source Review and Known Risks

**Baseline material:** full 441-file v0.13.5.6 consolidated ZIP, derived from previously audited GitHub main 452-file inventory and its cleanup branch. Files were analyzed programmatically for type, content, references and digest; key runtime/education/security code was also examined directly. This is not a claim of manual semantic validation of every sentence/market datum or live Cloudflare/Supabase acceptance.

## Confirmed improvements

1. The v0.11 profile navigation remains the **authoritative desktop renderer**. Duplicative frontend mobile menu and hover augmentation are no-ops, preserving the v0.13.4.1 mobile drawer. Canonical menu generates exactly one Dashboard. Legacy scripts are not deleted when needed elsewhere.
2. Member Lab Registry (`assets/js/lab-registry.js`) does not query Labs until a collection is selected. Server queries are constrained to a single `book_code`, return up to 51 to detect the next 50-record page, and member progress queries only the visible Lab IDs.
3. New Owner Lab Manager (`assets/js/admin-core.js` + `functions/api/admin-site-v01354.js`) requires `bookCode` and bounded page in GET; the `lab_one` endpoint retrieves a single Lab on explicit Edit. It does not blindly load 419 Labs.
4. Legacy Learning Operations (`assets/js/v0.13.5-admin-ops-link.js` + `functions/api/admin-operations-v0135.js`) has its own book/site selector. Snapshot Lab counts are scoped to a book using cheap exact counts, not a 1000-row read.
5. Operations & Intelligence → Learning Analytics loads a sample from only a selected collection; non-Lab assessment counts remain site-wide.
6. Service worker cache namespace was bumped to force new assets to replace v0.13.5.6. Old Worker registration URLs remain as compatibility wrappers for existing browsers; no private member HTML is meant to be persistently cached.
7. Five additional unreferenced v0.13.2 Dashboard/Live Fix JS/CSS are retired after checking active runtime source references. Prior thirteen v0.13.5.6 removals are already excluded.
8. One current README replaces the many historic upgrade notes; older source versions and their instructions remain preserved in the Owner's backup and Git history. The exact file disposition is in `docs/FILE_BY_FILE_DISPOSITION.csv` and `docs/REMOVED_BASELINE_FILES.csv`.

## Known blocking or material risks

- **SQL migration gap — HIGH:** exact historical v0.13.5.4/v0.13.5.5 schema migration files are not available in the provided source. Their actual state in Supabase is unverified. Do not deploy/activate privileged access changes until read-only contract verification passes.
- **Profile link duplication — MEDIUM:** canonical nav renderer tested with mock Owner, but no direct access to an authenticated live production browser means a stale client worker or undiscovered runtime mutation remains possible; test in fresh+existing browsers before merging.
- **Old browser compatibility — MEDIUM:** several historical service-worker URLs/scripts retained intentionally because already-installed browsers may reference them. Later pruning needs actual upgrade-path tests.
- **Authorization — HIGH:** existing Admin enhancement generations coexist. Browser disabled controls are not security; server-side Owner and Showcase enforcement must be verified with real role fixtures and RLS.
- **Billing — HIGH:** manual grants are not payment-provider subscriptions. Paid checkout remains OFF; KDP exclusivity and Lemon Squeezy webhooks require integrated sandbox checks before sales.
- **Curriculum provenance — HIGH:** the 419-Lab catalog is structurally consistent, but only 122 records contain ticker and historical-date fields. This does NOT verify exact timestamps, raw/adjusted corporate actions, market-data licensing, historical tape availability, or correctness of trade mechanics.
- **Documentation/operational recoverability — MEDIUM:** old docs were intentionally archived out of the clean branch. Owner must preserve the original repository backup and release packages to reconstruct missing history.

## Validation classification

- **Verified locally:** source integrity, syntax, JSON parsing, internal references, catalog counts, mock browser navigation (Owner signed-in/signed-out at 1440/768/390px), scoped Lab registry queries at 1440/390px, scoped Admin Lab paging (1440/760px), and mocked Owner API book validation/paging.
- **Not verified:** production Supabase tables/functions, Cloudflare preview, permissions with actual accounts, payment provider webhooks, true real-time member counts, Kindle listing publication, historical OHLCV/tape source provenance and PWA upgrades on existing end-user devices.

**Rollback:** revert the single full-tree replacement commit in GitHub. No production SQL is executed by the ZIP.
