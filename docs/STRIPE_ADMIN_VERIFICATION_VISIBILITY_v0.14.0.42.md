# Cyber Nexus — Stripe Sandbox Verification Visibility Repair

| Document control | Value |
| --- | --- |
| Company | Cyber Nexus |
| Project | The Stock Market: From the Ground Up |
| Filename | STRIPE_ADMIN_VERIFICATION_VISIBILITY_v0.14.0.42.md |
| File type | Markdown |
| Document ID | GU-WEB-ADMIN-PAY-014042-20261017 |
| Version / date | v0.14.0.42 / 2026-10-17 |
| Status | GitHub integration candidate; real Owner browser acceptance required |
| GitHub location | docs/STRIPE_ADMIN_VERIFICATION_VISIBILITY_v0.14.0.42.md |
| Google Drive location / ID | Not created; unassigned |
| Dependencies | Existing v0.14.0.41 GU39 catalog API, Admin role context, Cloudflare Pages build, eight sandbox test Price IDs |
| Purpose | Ensure Owner/Admin can find and execute the read-only eight-product Stripe verification within Payments & Billing |

## Root cause and remediation
Previously, the Stripe Admin verification UI was loaded only as a side effect of the Simple Admin Navigation component, which triggered a one-time conditional injection after detecting a visible Commerce tab. Owner-customized navigation, authentication timing, and module mount order could prevent the script from being loaded. Historical browser tests evaluated the Stripe UI script directly rather than testing whether the real Admin page loaded it.

v0.14.0.42 explicitly includes the existing Stripe test UI script and stylesheet in the Admin page. Existing navigation code checks for an already-present script before using its compatibility fallback. The UI mounts into the actual authorized Admin Commerce panel, including when its provider hub is not yet initialized. It watches delayed authentication/permission initialization without a 45-second expiry. Visibility is based on the authenticated Admin context's commerce.view permission **and** OWNER/ADMIN role, not whether the customizable navigation menu is expanded or hidden. The Payments & Billing task list includes a Stripe Sandbox Verification shortcut.

## Verification and payment restrictions
- The only visible read-only eight-product verifier remains **Verify All 8 Sandbox Products**; backend /api/gu39-sandbox?view=catalog is unchanged.
- Unauthorized roles and signed-out users must not see the controls; the backend independently checks Supabase staff authorization.
- The Admin card is rendered even when Cloudflare Stripe credentials are missing, allowing the Owner to view actionable error messages.
- Shadow test checkout remains disabled until full eight-price mapping, Owner approval and configured test environment are verified.
- **Live customer payments and real entitlements remain OFF.** No SQL migrations, Stripe product creation, prices, order writes, provider keys or subscription fulfillment changes.

## Acceptance still needed
After v42 deploy, Owner logs in and opens **Admin Control Center → Payments & Billing → Stripe Payment Testing**, sees **Verify All 8 Sandbox Products**, and runs read-only verification. Record provider product and price results independently; 8/8 is not asserted until an authenticated Stripe API response confirms it. Verify with a real Owner browser on desktop/mobile and confirm one card only.

## Revision history
| Revision | Date | Description |
| --- | --- | --- |
| v0.14.0.42 | 2026-10-17 | Direct Admin bootstrap, role-based UI visibility, delayed-auth mounting, and full-page regression. |

**Footer:** Internal deployment report — not Stripe API acceptance, legal/tax advice, or approval for live customer payments.
