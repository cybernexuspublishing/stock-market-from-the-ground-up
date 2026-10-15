# The Stock Market: From the Ground Up — v0.14.0.27
## Direct-upload GitHub ZIP (complete replacement source files, NOT a patch script)

**Owner-controlled GitHub source baseline:** `18b0624fda0c7b18dcc29d84c66da3583b922ec5` (v0.14.0.26).

This increment was built after reviewing the Owner's 230-row Supabase SQL CSV export. It repairs the broken v0.14.0.25 GitHub Actions YAML, provides a new source-level CI gate, aligns application version identifiers, and supplies catalog-based READ-ONLY SQL to identify the exact anonymous SECURITY DEFINER functions and real v0.14.0.26 audit-guard configuration.

**How to deploy:** Copy/upload the ZIP's nested files to the corresponding paths in the existing GitHub repository, preserving every unrelated file. DO NOT replace the entire repository with the contents of this source overlay; DO NOT upload source SQL to Cloudflare Pages static output. No batch/patch script or manual code edits are necessary. The SQL scripts are deliberately kept under `supabase/admin` and excluded from the site's public build.

**Database:** No v0.14.0.27 production migration. Read-only SQL may be run individually in the Supabase SQL Editor. The `v0.14.0.17_OWNER_REPORTING_POLICY_REVIEW_REQUIRED.sql` migration is ALREADY present in the repository but is NOT INSTALLED in this Supabase export. Test it in staging, do not run it blindly. Do not rerun v0.14.0.24 / 25 / 26 migrations.

**Expected existing issue:** Anonymous EXECUTE on `my_platform_access()` is an intentional v0.11 source grant and returns FREE-tier data if `auth.uid()` is null. A flag alone is NOT a demonstrated exploit; inspect the new inventory and do not revoke blindly.

**Known NO-GO items:** production E2E; staging audit failure rollback; Cloudflare SHA; payment/refund entitlements; forum reports policy; gated learning/privacy; all 419 lab answers, simulator, journal, tutor, tenant authorization.

Details: `docs/BACKEND_PHASE_8_v0.14.0.27.md`.
