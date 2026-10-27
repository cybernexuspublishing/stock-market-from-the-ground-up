# Foundations Book I — Isolated Stripe TEST Purchase & Refund Integration
Date: 2026-10-27 | Status: **CODE + DB CONTRACT ACCEPTED; REAL STRIPE TEST CHECKOUT NOT YET ACCEPTED**

## TEST-only infrastructure implemented
- Supabase TEST-only QA allowlist, intent ledger and signed event ledger installed in stock market production project `oxihglyfgzywsupnyicb`. Exactly `QaPaid26` is allowlisted by server-held user UUID, not by user-editable username at runtime.
- Database tables use RLS and prohibit `anon`/`authenticated` direct access; service-role-only reservation, Checkout binding and idempotent paid/refunded/disputed events.
- The two QA library functions return only TEST books and TEST-verified current private EPUBs; they do NOT add anything to standard `site_orders`, `user_plan_grants`, `site_subscriptions`, `gu_digital_books_v01430` or the real My Books purchase predicates.
- TEST checkout: `/api/book-stripe-test-checkout-v1` requires signed-in allowlisted user, correct Stripe TEST account, exact Book I product, exact one-time $10.99 price, correct authenticated Session binding and enabled TEST gate.
- Signed HMAC TEST webhook: `/api/book-stripe-test-webhook-v1`, verifies Stripe account, Stripe Session, one line item, PaymentIntent, expected price and amount before atomic RPC. Handles paid, duplicate delivery, refund, dispute and expired/failed checkout.
- Restricted 60-second QA download: `/api/book-stripe-test-download-v1`. Missing or refunded/disputed payment always denies TEST signed file.
- `my-books.html` has separate QaPaid-only TEST controls; it never presents a TEST ebook as a real customer-owned digital edition.

## Provider details (all TEST, no secrets)
- Stripe account `acct_1URGkDJY9FI7byHB`.
- Existing Book I TEST product `prod_VVF9MJLGagIs8Q` now active for TEST, but metadata `site_checkout_enabled=false` and `launch_state=coming_soon` remain unchanged.
- Existing matching one-time $10.99 Price `price_1UV603JY9FI7byHBAcdpKMKb` is its default.

## Verified
- Owner private EPUB v2 download and opening previously confirmed.
- Real Supabase policy validation: QaFree26 and unpurchased QaPaid26 both denied.
- Rollback-only SQL proved test paid ledger gives QaPaid26 TEST-only EPUB v2 access, and refund removes it. No test purchase/entitlement was committed.
- GitHub Owner Store CI run 40525903712 passed all automated TEST Checkout, HMAC, duplicate, private download, refund, dispute and webhook processing after Checkout disabled.

## Required to begin actual Stripe TEST card acceptance
1. Correct Yahoo Cloudflare Pages **Production environment**, without touching LIVE sale/entitlement flags: configure dedicated `GU_BOOK_STRIPE_TEST_SECRET_KEY` from the above Stripe TEST account as Secret and `GU_BOOK_STRIPE_TEST_WEBHOOK_SECRET` as Secret. Never place secret values in GitHub or chat.
2. Register a TEST-mode Stripe webhook endpoint `https://stock-market-from-the-ground-up-d1r.pages.dev/api/book-stripe-test-webhook-v1` in that same TEST account; subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`. Store the endpoint signing secret as the Cloudflare Secret above.
3. Only after both values are correct, set `GU_BOOK_STRIPE_TEST_ENABLED=true` as a plain-text Cloudflare variable. Default is OFF. GET `/api/book-stripe-test-checkout-v1` returns `ready:false` otherwise.
4. Sign in as QA account QaPaid26, visit My Books and complete actual Stripe TEST-mode Checkout with an official Stripe test payment method (never a LIVE card). Verify signed webhook, TEST-only library, downloaded EPUB, event replay, TEST refund and test entitlement disappearance.
5. Disable new TEST checkout after verification without disabling webhook refund processing. Test refund requires an authenticated Stripe TEST refund action; do not claim it from mocks.

## Explicitly outside this gate
- No LIVE payments, product fulfillment activation, customer rights attestations, or real book entitlement were changed.
- Production `gu_digital_paid_owned_v01430` still recognizes Lemon Squeezy, NOT Stripe digital book ownership. TEST ledger is isolated and does NOT fix LIVE fulfillment. Build and verify an independent signed Stripe LIVE digital-book order mapping before selling eBooks to customers.
- Owner publishing rights and primary customer delivery asset remain under the existing separate Owner password-confirmation control.