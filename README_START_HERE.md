# v0.14.0.33 — ADMIN PAYMENT CENTER & GLOBAL SEARCH — DIRECT UPLOAD

**Project:** The Stock Market: From the Ground Up — Cyber Nexus / Crown & Lantern Press  
**Baseline:** GitHub main `09087f8c7d928a4ed84ba263b1809250f22a11a6` (v0.14.0.32-R2)  
**Package status:** SOURCE READY; GitHub/Cloudflare deployment NOT DONE; no payment account settings changed.  
**Format:** Direct-upload ZIP, full files with repository relative paths. **Overlay only. Do not remove unrelated files.**

## What you will see

Admin Control Center → Commerce: **Payments & Billing Center** at the top, with Stripe Managed Payments (sandbox), Lemon Squeezy (optional digital), Standard Stripe (signed print), Lulu Direct, existing subscriptions/orders, reconciliation and eBook controls linked together. The hub displays server-authorized configuration evidence, not credentials. It adds a read-only **Stripe Digital Products & Price Mapping** table and button.

All Admin sections: **Find a control, setting or section** search field (Ctrl+K). The search is a navigation index — not a search of members' private data — and hides controls that the current account cannot use.

## Important implementation boundaries

- The existing `Checkout & Payments → Membership Variant Mapping` is **Lemon Squeezy** configuration, not Stripe. Do not paste Stripe `price_` IDs into its Variant ID fields.
- Stripe Price IDs are currently configured securely using Cloudflare Pages `STRIPE_MANAGED_PRICE_MAP_JSON` (server-only). We provide a mapped/unmapped inventory in Admin, **not a secret editor**.
- Stripe Managed Payments is test/OWNER-only until verified customer fulfillment and idempotent paid entitlement creation are implemented. A configured provider route is **not** live payment approval.
- No Supabase migration is needed for this UI release. The new protected read-only catalog endpoint uses the existing v32-R2 staff read authorization RPC.

## Steps

1. Apply all files in this ZIP to GitHub preserving paths and unrelated files. Do not upload this package to Supabase or copy `functions/` into `public/`.
2. Check all GitHub Actions on the deployed commit. Old v32 tests have version-forward-only compatibility changes. No security assertions were disabled.
3. Deploy through the existing Cloudflare Pages build; inspect the Admin Console after reloading to clear cached source assets.
4. Sign in as an authorized OWNER/ADMIN; open **Commerce → Payments & Billing**; click **Refresh Payment Readiness** then **Check Stripe Product Mapping**.
5. Create Stripe Sandbox products/subscriptions and map their `price_` IDs to existing database SKU codes. Cloudflare secrets are server-only; do not share private keys in chat/screenshots.
6. Leave ALL live customer checkout/entitlement switches OFF until a complete Stripe Managed Payments webhook-to-entitlement integration has passed sandbox/refund and subscriptions tests.

**Documentation:** `docs/ADMIN_PAYMENT_CENTER_v0.14.0.33.md`. A blank (not activated) Stripe Price ID mapping template is at `docs/STRIPE_MANAGED_PRICE_MAP_TEMPLATE_v014033.json`.
