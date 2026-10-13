# Current release candidate: v0.13.5.7.6

**Derived from:** v0.13.5.7.5 full source ZIP, which has not been confirmed deployed by the Owner. The last GitHub `main` inspected was the 338-file v0.13.5.7.4 commit `16e351186032ce601d6dc9d0ddd07960b4990590`.

**New frontend work:** 30 original illustrated skill tiles (one per real Supabase-defined competency), visual skill detail, six Admin-category illustrations, a functional directory of existing Admin workflows, direct access to the Account Management panel, authorized Pages & SEO editor preview with real existing save API, Market Commons category illustration, and 50-reply bounded thread pages.

**Unmodified:** book manuscripts; historical Lab identifiers; Owner/member production records; memberships; payments rollout state; Supabase schema; current Cloudflare project and env secrets. Canonical frontend filenames remain stable; the only release number in the download filename and metadata, except legacy compatibility endpoints/SQL provenance and worker shims.

**What this release does not magically add:** a drag-and-drop published design engine, background automation runner, full database backup/restoration, payment/webhook reconciliation, independent historical stock-market data validation, credential vault key recovery, verified live cross-role mutation tests, full community moderation/rate limits. These need backend, provider access, actual historical evidence or security testing. Admin directory links to **working existing controllers** rather than presenting those as finished.

**Cloudflare build:** `bash scripts/build-pages.sh`, output directory `public`, repository root, GitHub branch `main`. No SQL migrations required for visual changes. Optional read-only audit: `supabase/admin/database-contract-audit-read-only.sql`; see `docs/SQL_STATUS.md`.

**Before production promotion:** review `docs/DEPLOY_CURRENT.md`, test full authenticated Owner/member + anonymous paths on Cloudflare preview, view all 30 skill images, review Account Management and all directory targets, check member-specific ability and RLS, verify forum moderation and replies >50, and hard-refresh clients with previously installed service workers. Keep paid checkout, mandatory MFA/CAPTCHA, QR issuance and real Showcase entitlements OFF.
