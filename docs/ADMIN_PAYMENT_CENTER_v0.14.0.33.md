# The Stock Market: From the Ground Up — Admin Payment Center & Global Search

## Document control

| Field | Value |
|---|---|
| Project | The Stock Market: From the Ground Up — companion website |
| Organization | Cyber Nexus / Crown & Lantern Press |
| Document ID | GU-WEB-ADMIN-PAYMENTS-20261015-033 |
| Document title | Admin Payment Center and Control-Finder Implementation |
| File name | `ADMIN_PAYMENT_CENTER_v0.14.0.33.md` |
| File type | Markdown technical release document |
| Version | v0.14.0.33 |
| Revision | 1 |
| Prepared | 2026-10-15 |
| Status | Development candidate — local source/browser tests completed; deployment unverified |
| Google Drive location | Not assigned; do not invent a location or Drive document ID |
| Source location | GitHub: `cybernexuspublishing/stock-market-from-the-ground-up/docs/` |
| Source baseline | GitHub main SHA `09087f8c7d928a4ed84ba263b1809250f22a11a6` (v0.14.0.32-R2) |
| Dependencies | Existing `admin.html`, `admin.js`, `admin-navigation.js`, `site.js`, existing payment/provider R2 and print modules, existing `gu_owner_digital_payment_route_read_v01432r2` RPC; Cloudflare Pages environment; Supabase |
| Purpose | Surface Stripe and other payment settings in one discoverable, accessible hub without duplicating controls or weakening backend authorizations; provide a global Admin control finder and server-authenticated read-only Stripe SKU price mapping inventory |

## Why this release exists

In the existing Admin Control Center, one screen titled **Checkout & Payments** presents a **Lemon Squeezy** readiness checker and **membership Variant ID** fields. The other existing screen holds Stripe Managed Payments routing, Stripe OWNER sandbox checkout, signed-book physical Stripe settings, Lulu Direct and eBook rights. The interface does not tell the OWNER the distinction between them. This is a serious usability/operational risk: **Lemon Variant IDs and Stripe Price IDs are not interchangeable**.

The v32-R2 Stripe Managed Payments source exists, but the customer entitlement and renewal webhooks for Stripe Managed Payments are sandbox-only and have not been implemented for production. A green readiness indicator is not proof of an approved merchant account or production-safe checkout.

## What changed

- Admin Commerce now begins with a **Payments & Billing Center**: one payment overview with clearly separated **Stripe Managed Payments (digital sandbox)**, **Lemon Squeezy (optional digital)**, **Standard Stripe (signed physical copies)** and **Lulu Direct (optional print)**.
- Four cards report **server-side configuration evidence** when available. None changes the payment route or enables a checkout.
- **Payment Tasks & Shortcuts** links to the authoritative existing forms, price and physical fulfillment controls, digital book controls, orders, notifications, reconciliation and Settings. Original mounted elements, event handlers, roles and audit trails stay in place. No duplicate provider editor is created.
- A prominent **global Admin search** appears above the currently authorized control-center panels. Ctrl+K opens it. The finder indexes visible, enabled navigation controls and prescribed payment tasks, with keyboard arrow/Enter/Escape support. It does not search user records, private member messages, emails, API credentials or security-sensitive content.
- **Stripe Digital Products & Price Mapping** gives authorized OWNER/ADMIN staff a read-only table of the current membership, tool and eBook catalog from Supabase, including product code, posted price, cadence, eligibility *candidate* state and whether a Stripe sandbox Price ID has been mapped in Cloudflare. Product mapping presence is reported as **Mapped/Unmapped**; the private mapping and Stripe API key are never transmitted to the browser. No confirmation of Stripe product creation is asserted until the provider API sandbox validates amount/currency/cadence.
- Existing payment controls, communications, Market Commons, book catalog and membership frontend remain untouched. This is a source overlay, not a full site replacement.
- Existing v32-R1/R2 source tests requiring the **exact old version number** are adjusted to verify version >=v32 and match the route policy/service worker. No authorization checks are removed or bypassed.
- No Supabase migration is needed for this interface. This does **not** activate production payments or write any existing database rows.

## Current provider boundaries — do not confuse

| Channel | Control location | Status | Secrets source |
|---|---|---|---|
| Stripe Managed Payments | Payments & Billing → Stripe Managed Payments | OWNER sandbox checkout only; **production customer fulfillment not implemented** | Cloudflare Pages server secrets `STRIPE_MANAGED_SECRET_KEY`, `STRIPE_MANAGED_WEBHOOK_SECRET`, `STRIPE_MANAGED_PRICE_MAP_JSON` |
| Lemon Squeezy | Payments & Billing → Lemon Squeezy and historical checkout Variant ID editors | Optional digital provider; legacy payment path must remain behind route/global gates | Cloudflare server secrets and provider dashboard |
| Standard Stripe Payments | Payments & Billing → Signed Book Payments & Fulfillment | Owner-operated, physical product pricing and manual KDP author-copy process; separately staged | Cloudflare server-only Stripe account secrets |
| Lulu Direct | Payments & Billing → Lulu Direct | Optional provider-direct paperback/hardcover checkout | Owner-managed provider links |
| eBooks | Payments & Billing → eBook Sales & Downloads | Per-title legal rights and KDP Select gates remain authoritative | Private Supabase Storage |

## Initial Stripe product steps (for the owner)

1. Sign in to the **Stripe Dashboard** and select **Sandbox/Test mode**. Verify the account has **Managed Payments** eligibility for the website's exact course/membership/ebook products. An onboarding recommendation does not prove approval.
2. Run the existing read-only website product catalog snapshot in Supabase to verify approved prices (e.g., monthly, annual, Lifetime and released tools). The older migration's prices are historical only. Do not enter guessed prices.
3. In Stripe **Product Catalog**, create the approved memberships and any eligible live digital-tool products; use appropriate recurring monthly/yearly and one-time prices. **Do not** put signed paperback/hardcover products into Managed Payments.
4. Store approved `price_...` mappings in Cloudflare server-side `STRIPE_MANAGED_PRICE_MAP_JSON` using keys `plan:FULL_MONTHLY`, `plan:FULL_ANNUAL`, `plan:LIFETIME`, `tool:...`, `book:...`. Match website SKU codes exactly. A starter map with **empty values, not invented Price IDs**, is included as `docs/STRIPE_MANAGED_PRICE_MAP_TEMPLATE_v014033.json`; add only actual Stripe sandbox Price IDs after verifying current Supabase product price and publication status. **Do not** paste keys/secrets into an Admin text field, GitHub or chat.
5. Configure the Stripe test API key and webhook signing secret in Cloudflare server-side settings; configure the Stripe webhook URL `https://stock-market-from-the-ground-up.pages.dev/api/stripe-managed-webhook-v01432r2` in sandbox only and select the documented test events.
6. Return to **Admin → Commerce / Payments & Billing**. Select **Refresh Payment Readiness** and **Check Stripe Product Mapping**. A mapped SKU merely confirms your Cloudflare configuration exists; the existing OWNER sandbox checkout validates the Price ID and currency/cadence with Stripe.
7. Complete unsigned/signed webhook, replay, refund, failed payment and subscription-renewal acceptance **without issuing real membership entitlements**. Customer Managed Payments checkout remains blocked until the separate production entitlements release is implemented and tested.

## Authorized access and operational security

- New API: `GET /api/payment-catalog-v01433`. The backend verifies an authenticated OWNER/ADMIN session using installed staff payment-route RPC **before using the service-role key** to read only public product catalog fields. Anonymous/members receive a denied response; the endpoint has no write method. Neither secret keys nor Stripe Price ID values are sent to the browser.
- Global search is navigational only; it calls **existing authorized navigation** and never grants permission to a disabled/hidden control. No stored member PII or report content is indexed by this feature.
- The site remains private behind Admin's established sign-in/session checks. The new script is loaded by `site.js` only when the user is on `/admin.html`.
- No custom payment links are generated from browser input and no checkout fields are modified.
- If the provider readiness endpoint is unavailable, the hub visibly reports unavailable rather than showing a fictitious success.

## Acceptance checklist and outstanding limitations

- Local `node --check`, version-parity, mock catalog authorization-negative tests and headless browser nav tests pass. Passing source tests does **not** certify Cloudflare deployment, production RLS, payment approval or real payment settlement.
- Deploy ZIP as a **path-preserving source overlay** against baseline v32-R2. Verify **all GitHub Actions pass on one commit**; confirm deployed Cloudflare SHA and no protected files are copied into public directory.
- Test authorized OWNER and ADMIN sessions, restricted/Showcase accounts, Ctrl+K keyboard navigation, payment-category links and the current browser's accessibility behavior.
- Verify backend provider readiness vs Cloudflare environment, test Price ID mapping, and actual Stripe Sandbox product amounts/intervals.
- **Production Stripe Managed Payments entitlement issuance remains disabled and unimplemented**, so do not switch checkout live. Payment account KYC, tax treatment, memberships, refund/chargeback and delivery acceptance remain separate go-live gates.
- The original Checkout & Payments **Lemon variant mapping editor** is intentionally preserved; a larger navigation/permissions refactor would require identifying every existing backend and admin dependency first.
- The existing `main` branch was observed unprotected. Required status checks and branch protection are recommended before production activation.

## Revision history

| Revision | Date | Change |
|---|---|---|
| 1 | 2026-10-15 | Added single payment operations hub, global authorized-control search, protected read-only Stripe mapping report, forward-compatible historical release assertions, tests and release manifest. |

**Approval status:** Source package complete; owner deployment and production acceptance pending.
