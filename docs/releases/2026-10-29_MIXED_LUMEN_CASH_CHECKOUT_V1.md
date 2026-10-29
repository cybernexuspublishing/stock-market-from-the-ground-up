# Selectable Crownlight Lumens at Checkout — Mixed Credit/Cash V1
**Date:** 2026-10-29  
**Status:** Quote and selector deployed; payment settlement and entitlement activation NOT enabled for mixed payments.
**Owner requirement:** 1 Lumen = $0.07; member chooses 0 to all usable Lumens; up to 100% of eligible product subtotal.

## Exact approved examples
A one-time eligible add-on priced at 1,999 cents with 80 available Lumens:
- Select **80 Lumens** → $5.60 reduction, **$14.39 cash due**, **0 Lumens remaining**.
- Select **40 Lumens** → $2.80 reduction, **$17.19 cash due**, **40 Lumens remaining**.
- Select **0 Lumens** → full $19.99 due and all 80 retained.
- With at least **286 Lumens**, applying 286 covers the $19.99 subtotal in full; the last Lumen covers 4 cents without cash change.
- Values are pre-tax and exclude separately priced shipping/fees; do not silently discount recurring renewals.

## Source components
- `functions/_lib/lumen-discount-policy-v1.js`: common safe-integer math, seven-cent redemption, up to 100%, non-expiring credits, eligible product classes.
- `functions/api/member-lumen-checkout-quote.js`: authenticated GET-only member quote from approved Supabase product price registry, active member-owned wallet, storefront release status and current entitlement. Never trusts a browser price. Flags low cash remainder and returns `checkoutDiscountActive:false`.
- `assets/js/checkout-lumen-selector-v1.js`: slider, exact whole-Lumen numeric field, Use max/Use 0, discount, amount due and wallet-after preview.
- `assets/js/checkout-platform.js` and `checkout.html`: mount selector on existing Checkout. **Selecting >0 Lumens disables the legacy full-price checkout instead of silently charging the wrong amount.** Selecting 0 restores existing provider-independent checkout gate.
- `gu_lumen_mixed_intents_v1` and `gu_lumen_mixed_debits_v1`: private RLS-protected quote/escrow records. Service-only SQL reserve/bind/mark-paid/release functions; no public direct RPC execution. Shared serial wallet advisory lock, idempotent request IDs, and original-bucket refund records.
- USD card minimum guard: 1–49-cent cash remainder cannot be sent to an incompatible processor. Member must choose fewer Lumens or fully fund the eligible subtotal.
- All mixed reservations, cash capture and paid-intent settlement are **not connected to the public button**. No LIVE cash charge, member credit debit, purchased digital access or paid plan was created by this release.

## Outstanding before ACTIVE mixed checkout
1. Add a new approved Stripe TEST-mode mixed-checkout contract for each class, validating provider Price IDs, currency, original amount, immutable Lumen quote, tax/shipping and membership inclusion. Current GU58 webhook expects full undiscounted price; do not alter blindly.
2. Select one-time purchase lines and first-invoice-only subscription discounts; verify subsequent recurring charges remain correctly disclosed. Manage zero-cash orders without a mock Stripe charge.
3. Reserve Lumens only once a consistent provider payment session can be created. Bind the verified session to the reservation; retry idempotently and never create duplicate unresolved sessions.
4. Implement signed and independently verified Stripe success/async failure/session expiration events with paid-amount reconciliation, real entitlement creation, no double fulfillment, and safe reversal/refund policy; handle delayed methods and out-of-order webhooks.
5. Test no-cash full-Lumen redemption for each released eligible product category, protected digital rights and physical fulfillment separately. Honor Owner inclusion and existing Founding Member benefits.
6. Authenticated browser acceptance of selected amounts (0/40/80/full), balance change, two concurrent checkouts, account switching, expired/insufficient balance, payment cancel, refund, no-revenue/no-discount abuse and tiny cash leftovers.
7. Owner release switch and pricing terms update before showing `checkoutDiscountActive:true`. Until then, member-facing preview must say mixed checkout is not yet active.

**No member is charged or loses Lumens simply by opening or changing the quote.** 
