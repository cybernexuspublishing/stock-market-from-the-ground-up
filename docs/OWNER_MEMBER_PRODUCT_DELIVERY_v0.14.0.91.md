# Owner Member Product Delivery — v0.14.0.91

**Company:** Cyber Nexus / Crown & Lantern Press  
**Project:** The Stock Market: From the Ground Up  
**System:** Owner Website Development Roadmap  
**Document:** OWNER_MEMBER_PRODUCT_DELIVERY_v0.14.0.91.md  
**File type:** Markdown (.md)  
**Source location:** GitHub `docs/OWNER_MEMBER_PRODUCT_DELIVERY_v0.14.0.91.md`  
**Google Drive location / document ID:** Not created or supplied; do not invent an ID or assert it is synchronized  
**Version:** 0.14.0.91  
**Prepared:** 2026-10-19  
**Status:** Source implemented; GitHub CI, Cloudflare publication, database inspection, private Owner permissions and live functional acceptance separately pending  
**Purpose:** Preserve all prior site decisions; add actionable product-development inventory and unambiguous Owner progress metrics, without granting customer entitlements or changing approved book files.

## Scope and preservation

- Retain **2,096 original requirement records** (281 primary commitments + 1,815 historical source trace lines).
- Retain **94 supplemental core commitments**. The current fixed register is **375 primary commitments and 1,815 source references = 2,190 source records**.
- The Owner may add private `OWN-*` tasks; those are **additional** task rows and must not trigger a historical-register checksum warning.
- Preserve all original IDs, revisions, private Owner progress, delegated source-only reviews, approved pricing, books, Stripe/Supabase access controls and checkout flags. No Owner account checkboxes were automatically saved or changed.
- Do not infer completed work from a source commit, database row, UI status, CI pass or hidden historical trace entry.
- The screenshot showing **1,668** trace lines does **not** match the v0.14.0.90 GitHub source baseline, which has **1,815**. Check the active Cloudflare deployment and authenticated API response for version skew before altering the registry.

## What changed

1. A **Product Development** tab lists all 21 registered first-party tool codes, 13 supporting learning/member-service systems and a prioritized existing-task work sequence. The four individually priced principal tools are identified separately from 17 beta/planned tool definitions.
2. A **Verification & SQL** tab explains the status categories, 375-versus-1,815 scope, eight commercial SKU boundaries, read-only Supabase checks and pending Cloudflare verification.
3. Six separate status cards replace the misleading compound “30 Blocked · 1668 source requirements tracked” card. Their categories are **scoped approvals, source implemented, in progress, blocked, deferred/unreviewed and preserved trace references**. Neither blocked nor source-trace count indicates how many pages or files were changed.
4. Product-readiness percentages are explicitly **planning ranges** based on reviewed code plus an earlier Owner database audit; they are **not objective completed percentages**. They change only following recorded delivery evidence and review—not merely from commits.
5. The source-level v0.14.0.89–90 Store/Admin Products milestone `CORE-0194` is now treated as `source_implemented`, not `deployed_verified`; the v0.14.0.91 product dashboard is likewise source-only. No backend commercial approval is implied.
6. The existing Owner API serves the readiness matrix only **after** role and account-status verification, using existing Supabase database read endpoints. No new database, schema or credentials are needed for the new tab.
7. Added a new Owner-operated **SELECT-only** SQL preflight and a CI contract test. The SQL is **not applied** by this change.

## Product and publication status boundaries

The **four paid tool SKUs** are INTERACTIVE_LEARNING, JOURNAL_ANALYTICS, MARKET_SIMULATOR and MARKET_TUTOR. The **four paid memberships** are FULL_MONTHLY, FULL_ANNUAL, LIFETIME and ONDEMAND_MONTHLY. Existing Free, Flex and Founding draft definitions are not extra launched Stripe prices. Six prior Store coming-soon previews are educational features, not six additional paid SKUs. The standalone tool field `status='live'` is catalog configuration, not proof that historical data, AI execution, assessments or real member fulfillment work.

The source confirms that the current Market Tutor is largely static indexed explanations and simple mistake-history rules, not a verified model-backed AI Tutor. Historical Labs, graded cases and simulator data require source-verification, licensed datasets and private answer keys. No released performance statistics or historical tick/tape claims should be fabricated.

## Owner Supabase verification — **read-only**

**SQL source:** `supabase/admin/v0.14.0.91_OWNER_PRODUCT_READINESS_READ_ONLY.sql`  
**Target:** Existing authorized Supabase SQL Editor  
**Expected transaction behavior:** `BEGIN READ ONLY` … only `SELECT` … `ROLLBACK`  
**No schema or data alteration.** No separate Supabase project, new database, migration or Stripe charge.

Run each numbered query separately if the SQL Editor displays only the final result. Export nine outputs labeled **01–09** and attach the CSVs/screenshots for technical review. Avoid uploading account identifiers, user information or keys.

| Query | Review | Evidence expected / interpretation |
| --- | --- | --- |
| 01_OBJECT_PRESENCE | Existing schema | One boolean per required object. `false` means reconcile installed migrations; **do not run blind old seeds**. |
| 02_PLANS | Plan flags | Review product code, cents, billing interval and active/visible/checkout flags. Four paid memberships exist in source; real provider readiness requires separate work. |
| 03_TOOLS | Tool coverage | Source defines 21 tool codes, of which four principal priced SKUs were previously audited. A missing/mismatched live record is an issue, not a reason to insert records blindly. |
| 04_LAB_IDS | Lab registry | 419 catalog IDs in prior evidence. An ID is **not** a finished assessed Lab. Any count change requires reason. |
| 05_CONTENT_COUNTS | Private lessons and grading | An earlier Owner audit found zero in inspected instruction, training-set and competency-case tables; report actual current counts. After an authorized private load, expected Foundations-authored instruction count is 94, not 419. Count alone does not validate quality. |
| 06_DATASET_COUNTS | Historical replay | Earlier audit found zero market datasets/envelopes. A positive number still requires license, ticker/date and corporate-action verification. |
| 07_TUTOR_CONTENT | Tutor knowledge | Earlier audit found zero managed tutor topics. This is content inventory only, not proof an external model-backed tutor operates. |
| 08_DESTRUCTIVE_GRANTS | Security | Ideally **FALSE** for `anon` and `authenticated` `TRUNCATE`/`TRIGGER` across audited member/content tables. A TRUE result requires privileged DBA review; table RLS cannot control TRUNCATE. |
| 09_RPC_PRESENCE | Authentication/access architecture | RPC name present/absent. A present name does **not** prove correct entitlements, executed migrations or production access rights. |

If any SQL query errors on a missing table or column, preserve the error message and stop that portion of the preflight. Do not add, alter or drop objects just to clear a warning. Source/actual-schema conflicts require a separate reviewed, additive migration with explicit Owner approval.

## Cloudflare deployment check

1. Commit already exists in GitHub main under the v0.14.0.91 release family; if Cloudflare auto-build is connected, inspect that build, otherwise deploy through the Owner's existing process.
2. Confirm the Cloudflare Pages build command is `bash scripts/build-pages.sh` with output directory `public`; do not copy `functions/_lib`, private SQL, tests, answer keys or secure database scripts into `public`.
3. On the deployed Owner site, sign in as a real eligible OWNER, open `/owner-roadmap.html`, select **Product Development** and **Verification & SQL** and confirm that the panels load through the protected API.
4. Verify six status tiles, **375 primary source commitments + 1,815 trace references**, with any additional `OWN-*` tasks properly counted separately; confirm the displayed manifest is **v0.14.0.91** and compare its `gitCommit` with the actual deployed commit. The release manifest reports its observed build SHA; it does not certify signed payment delivery.
5. Check a normal member, unauthenticated browser and restricted/suspended Owner **cannot** retrieve the private API inventory. Confirm normal Owner notes and statuses survive page reload; no status is automatically rewritten.
6. Run the new CI test and inherited Owner Roadmap contracts. If failing, keep release acceptance pending and inspect the logs before any manual SQL or financial configuration changes.

## Phase approval

**Source complete, provisional:** Owner product tabs, scoped read-only product metadata, no-write SQL file, six-card status categorization and CI contract source.  
**Not Owner-verified:** Actual Cloudflare deployment/version parity, current database counts and grants, production Owner/negative-role E2E, live payments and product educational content.  
**No changes:** User product prices, subscriptions, book manuscripts, retailer channels, Stripe Provider IDs, private learning datasets, Owner saved checkboxes or operational permissions.

**Next accepted output:** Owner returns 01–09 preflight results and deployment/CI evidence; status updates then apply only to the specific tasks actually proved.
