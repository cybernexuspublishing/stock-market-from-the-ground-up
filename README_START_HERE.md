# v0.14.0.32-R2 — CAPTCHA + Password Security + Stripe Managed Payments Readiness

**This single combined ZIP SUPERSEDES the unuploaded `v0.14.0.32-R1` ZIP and original `v0.14.0.32` ZIP. Upload ONLY R2.**

| Field | Value |
|---|---|
| Project | The Stock Market: From the Ground Up |
| Company / imprint | Cyber Nexus / Crown & Lantern Press |
| Baseline | GitHub `main` commit `57ac97e6ddf498b9d28be32029aa33c13f91caed` (v0.14.0.31-R1) |
| Release | v0.14.0.32-R2 (web configuration remains 0.14.0.32 for compatible regression tests) |
| Date | 2026-10-15 |
| Deployment | GitHub direct-upload source OVERLAY; preserve all unrelated repository files. |
| Database | R1 migration THEN R2 migration after separate staging preflight and review. ZIP upload does not execute SQL. |
| Status | STAGING CANDIDATE. No provider account changes, live Stripe Managed checkout, or merchant approval performed. |
| Google Drive | No approved location / Drive ID provided; GitHub docs are controlling working copies. |

## Existing R1 content INCLUDED unchanged unless mentioned

R1 CAPTCHA/Supabase Turnstile loading, recent password reconfirmation without mandatory MFA, sensitive OWNER/ADMIN staff authorization migrations, Communications controls, signed-book staff shipping, Lemon Squeezy readiness and all associated source tests. **No old release ZIP needs to be uploaded first.**

## R2 additional changes

- Digital default preference changes to **Stripe Managed Payments**, still OFF until qualified provider test and live fulfillment infrastructure is accepted.
- Lemon Squeezy retained as independently selectable digital alternative; Standard Stripe for author-signed paper/hardcover and Lulu are separate.
- Admin → Commerce adds payment-provider readiness status and an **OWNER-only audited digital provider selection**, gated by a recently server-confirmed password.
- R2 SQL adds a **database trigger preventing legacy Lemon digital checkout intents** unless Lemon is the active enabled digital route. It does NOT modify older orders or refund history.
- Public customer Checkout fails closed if no selected and approved paid provider; Stripe Managed live customer checkout deliberately remains unavailable, not a fake working buy button.
- Stripe Managed Payments **OWNER-only sandbox** can create test Checkout sessions after the Stripe account and mapping are configured. Managed session API uses `managed_payments[enabled]=true` and verifies the mapped USD amount and recurring interval against Stripe Prices.
- A separate signed **sandbox-only** Stripe webhook records test events and session status WITHOUT granting books, subscriptions or real user entitlements.
- Source/negative-authorization tests and onboarding notes included.

## Ordered installation

1. Upload the combined R2 source overlay through the established GitHub method. Do **not** replace/delete unrelated files. Check all workflows on the same SHA; Cloudflare deployment acceptance requires independent live SHA parity.
2. Run `supabase/admin/v0.14.0.32R1_SECURITY_PREFLIGHT_READ_ONLY.sql`; review the R1 migration and staging-test step-up and Communications role-negative cases. Apply R1 **once** in staging, then run R1 postflight. R1's database function replacement must match exactly; no blanket AAL2 permission bypass.
3. Run `supabase/admin/v0.14.0.32R2_PAYMENTS_PREFLIGHT_READ_ONLY.sql`; review/apply `supabase/migrations/v0.14.0.32R2_PAYMENT_PROVIDER_ROUTING_REVIEW_REQUIRED.sql` in staging **once**, then run postflight. Start `STRIPE_MANAGED` with enabled=false.
4. Complete Owner Stripe Managed Payments onboarding and approved sandbox product/price mapping (see `docs/STRIPE_MANAGED_PROVIDER_SETUP_v0.14.0.32R2.md`). Never paste private keys into source or chat.
5. Keep `ENABLE_PAID_CHECKOUT=false`, `STRIPE_MANAGED_TEST_CHECKOUT_ENABLED=false`, `ENABLE_SIGNED_BOOK_STRIPE=false` until explicit relevant staged testing and approval. Configure Cloudflare Turnstile and Supabase CAPTCHA together. Stripe Managed Payments customer-facing digital order fulfillment is NOT present in R2.
6. Check Communications without mandatory MFA but with valid staff role, Owner-sensitive operations with recent password confirmation, and every existing entitlement path and Market Commons role boundary.

**No live payments, real buyer entitlements, KDP author-copy orders, private eBook uploads or Stripe account operations have been performed by preparing this ZIP.**
