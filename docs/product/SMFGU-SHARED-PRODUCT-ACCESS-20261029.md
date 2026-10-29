# Shared Product Access Configuration — Implementation Register

**Document ID:** SMFGU-PRODUCT-ACCESS-001
**Version:** 1.0
**Date:** October 29, 2026
**Company:** Cyber Nexus Publishing / The Stock Market: From the Ground Up
**Google Drive location:** Not assigned
**Repository source of truth:** `main`, `supabase/migrations/20261029_shared_product_access_config_v1.sql`
**Status:** Additive schema applied; Admin editor and server integration committed; CI/deployment and authenticated Owner acceptance must be verified.
**Commercial state:** No trial checkout, cash payment, credit debit, pricing, automatic grant or Stripe change was introduced.

## One configuration per product
Each `product_code` has exactly one policy record in `public.gu_product_access_config_v1` with:
- `free_access`: availability of an ungraded Free experience (where existing product renderer supports it).
- `trial_access`: whether a separately implemented and priced trial may be sold/issued.
- `paid_access`: whether a separately authorized standalone paid offer may exist.
- `included_memberships`: approved membership codes in the product policy, not a substitute for a verified active membership.
- `purchase_durations`: available 1, 7, 14, 30 and/or 180 day fixed terms; one month and six months are explicitly **30 days and 180 days** for this version.
- `access_expiration_policy`: fixed_term, membership_bound, non_expiring, or session_only.
- `policy_mode`: legacy or configured. Every migrated product is LEGACY by default.
- `version`, `updated_by`, `updated_at`: optimistic concurrency, ownership and audit metadata.

A single record serves Free Research Watchlist, Advanced Watchlist & Trade-Plan Workbench, Studio tiers, Market Tutor and other registered learning tools. There are no duplicate tool implementations, no new separate saved research stores, and no change in existing SKU identities.

## Current integration and safeguards
1. The Owner finds **Products & Prices → Tools → Shared Product Access** in `admin.html`. Configuration remains within the existing Admin Control Center.
2. `GET /api/product-access-config` lists policies after live Auth/session verification, active member profile verification and explicit **OWNER** role check. Showcase, restricted and suspended accounts are denied.
3. `POST /api/product-access-config` validates fields, exact approved fixed durations, unique membership codes and expected version. Only a matching revision updates, with one row affected, and the SQL trigger writes previous/new snapshots to the restricted audit table.
4. Both `functions/_lib/advanced-tool-access-v014110.js` and `functions/api/member-tool-access.js` read the shared server-side policy. Advanced tools use configured `free_access` to control the ungraded preview. Premium access and premium workspace saves still depend on existing `user_has_tool_access` authority; neither `paid_access` nor `trial_access` alone grants anything.
5. Core training tools return the policy separately from the current verified authorization; Free teaching behavior and paid entitlements are unchanged until service-specific, authenticated rollout review.
6. RLS is on for configuration and audit. `anon` and `authenticated` are explicitly denied direct table access; Cloudflare uses the server-only service credential after Owner authentication. No secret is included in client requests or returned policy data.

## Next gated functionality, not active in this release
- Atomic paid trial purchase and entitlement issuance using one authorized product code, configured duration, expiration and idempotency.
- Validated membership-code policy enforcement and changes to plan-tool mapping; preserve customer-purchased and existing contract rights, do not reinterpret a configuration flag as a verified payment.
- Trial expiry and renewal cancellation lifecycle, refund or chargeback reconciliation, cash + Crownlight-credit discount combination and controlled one-time signup bonus.
- Owner authenticated browser edit, stale-revision conflict, non-Owner denial, end-to-end Free/paid entitlement, expiry, Store and Stripe TEST acceptance.
- Owner-approved LIVE sale activation is a separate gate. This implementation does **not** activate a paid offer.

## Acceptance evidence
Migration deployed to project `stock-market-from-the-ground-up` (Supabase project `oxihglyfgzywsupnyicb`) and verified 26 seeded policies, all in legacy mode, zero configured. Existing platform_tools and staff/role paths were not altered in SQL.
GitHub research workflow `.github/workflows/research-tools-v014145.yml` now checks `tests/test_shared_product_access_config_v1.mjs` and parses new server and Admin JavaScript.
