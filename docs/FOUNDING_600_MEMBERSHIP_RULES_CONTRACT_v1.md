# Founding 600 — Controlling Membership Rules Contract v1.0
**Status:** Approved source policy; LIVE billing disabled. Initial 30/60 TEST paid invoices, cancellation and refund are provider-PROVEN. Remaining real member, renewal, upgrade, discounted checkout and legal acceptance require further gates.

## Billing, shared capacity, and benefit pricing
| Tier | Stripe charge | Purchase discount | Included Sparks per verified paid term | Expiry measured after term end |
| --- | --- | --- | --- | --- |
| FOUNDING_30 | $49.99 every 30 days, auto-renew until cancelled | 10% (1000 basis points) | 5 | 90 days |
| FOUNDING_60 | $59.99 every 60 days, auto-renew until cancelled | 15% (1500 basis points) | 15 | 150 days |

- One non-recyclable founder number, 1–600, across both tiers. Founding membership activates only from a verified paid invoice. Failed payments never grant a number or Sparks.
- Discounts do not apply to founding subscription charges or stack with promotions; eligible first-party product categories are books with verified selling rights, tools, Lifetime, and Crownlight Sparks. The current JSON additionally lists eligible standard FULL_MONTHLY/FULL_ANNUAL; these need payment-route verification, not silent removal.
- Lifetime list $2,499.00: 10% total $2,249.10; 15% total $2,124.15. Do not charge a Founder full list price while no audited discounted checkout route is available: current server implementation rejects such attempts.
- Purchased Sparks never expire; included Sparks expire independently on their award's date, consumed earliest included expiry first and purchased last. Separate award expiry dates must never reset on renewal.
- Keep all six approved benefits: verified educational completion certificate; editorial early materials; advisory improvement voting; priority announcements; learning progress preservation; independently verified outage protection. 60-day members additionally have website design voting and enhanced premium study options. No equity, credential, personalized advice, guaranteed profit, or actual in-site trade simulator.
- 30→60 upgrade must preserve unique founder number, progress and paid history, and prevent duplicate active subscriptions or duplicated awards.
- Each verified paid invoice/event changes entitlements at most once, with independent audit rows. Reversed/refunded/disputed invoices follow the published policy, never an unreviewed silent forfeiture.
- Cancellation stops future renewal and retains earned founder identifier; subscription access ends at verified paid-through date, subject to the disclosed terms and privacy deletion policy. Must provide self-service cancellation.
- Federal ROSCA, applicable state auto-renewal law, consent receipts, terms, cancellation and refund policies require attorney review before launch. No paid Stripe Billing upgrades permitted without Owner consent.
- STRICT: LIVE checkout/webhooks/fulfillment remain OFF. GitHub main only. $0 non-LIVE spending. Owner approval required to change Cloudflare API token permissions/settings.

## Engineering evidence
Forward SQL: `supabase/migrations/v0.14.0.274_founding600_15pct_contract_gate2.sql`.
Rollback SQL: `supabase/rollbacks/v0.14.0.274_founding600_15pct_contract_gate2_ROLLBACK.sql`.
Existing append-only historical migrations remain unchanged. Rollback only while all founder ledgers remain empty and all launch controls remain OFF.

**Pending:** prove discount fulfillment for books, tools, Lifetime and Sparks; verify entitlement/Sparks/upgrade/cancellation using real Stripe TEST events; authenticated member isolation; 600 concurrent reservation acceptance; legal checkout signoff.

## TEST provider acceptance status (2026-10-26)

**PROVEN against the Yahoo-master TEST webhook in exclusive isolation:** Founding 30-Day initial paid invoice `evt_1UUfILJY9FI7byHBVGjIwaSS` -> $49.99, 30-day period and 5 included Sparks; Founding 60-Day initial paid invoice `evt_1UUfIfJY9FI7byHBeNLHgBbp` -> $59.99, 60-day period and 15 included Sparks. Both were observed as genuine Stripe TEST-mode `invoice.paid` events with matching separate Supabase shadow paid-cycle records. Further exclusive TEST events proved cancel-at-period-end `evt_1UUfL3JY9FI7byHBrSFVa4Wy` (paid-through and 5 Sparks retained) and full refund `evt_3UUfIdJY9FI7byHB0DABlAvC` (cycle reversed, remaining included Sparks zero). See `docs/releases/2026-10-26_F600_GATES2-7_FINAL_REGRESSION.md` for exact evidence and caveats.

**Not yet PROVEN:** Renewal produced by advancing Stripe TEST clock (tool operation unavailable), plan upgrade without duplicate subscription, real dispute, authentic logged-in Owner/two-member account isolation, product-specific discounted purchases, fully accessible self-service cancellation and attorney review. An attempted Stripe TEST subscription with no usable payment method was refused before invoicing; its shadow intent stayed prepared with zero paid cycles. This is not a `invoice.payment_failed` webhook proof.

**Operational hold:** Original Stripe TEST delivery path restored, Yahoo-master TEST destination standby/disabled, Sandbox database switch off. All LIVE checkout/webhook/fulfillment remains off; production founder ledgers remain empty. No LIVE Stripe keys, prices, webhook endpoints or financial payments were used.
