> **Historical v1 source record — superseded for current commercial and Sparks rules (October 28, 2026).** Do not use old included-Sparks expiration windows, earlier grant quantities, prelaunch flags, or old receipt instructions as customer terms. The live controlling Founder catalogue records 10/15/20 included Sparks for 14/30/60 days, respectively; all unspent issued Crownlight Sparks are nonexpiring under V2. The 14-day plan remains checkout-disabled, 30/60 live public enrollment remains closed, and Lifetime founder-discount checkout is not yet accepted. Current controlling code: `data/founding600-terms-v014170.json`, `founding600.html`, `supabase/migrations/20261028_crownlight_nonexpiring_policy_v2.sql`, and `functions/api/stripe-live-checkout-v01458.js`. The original content below is retained solely for historical evidence.\n\n# Founding 600 — Controlling Membership Rules Contract v1.0
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

## Owner change — October 27, 2026: Founding Starter and book-receipt Free access

New FOUNDING_14 Starter: $22.99 USD automatically billed every 14 days until canceled, 5% discount on eligible first-party purchases while membership is active, five included Crownlight Sparks per paid cycle, 60-day post-term Spark expiry, shared Founders Commons (not the Extended Design Council). Exactly 600 numbered founding seats are shared across the three plans; no change to Standard $49.99/30 days or Extended $59.99/60 days.

Stripe TEST item prod_VWFwFoggxZfcx3 and TEST recurring price price_1UVDQoJY9FI7byHBuiYDnHrX were created without charges. The 14-day plan is registered in Supabase with checkout_enabled=false. Existing 30/60 launch flags remain as found. The live payment-to-seat, 14-day webhook/renewal, refund, Spark award and 5% discount/Commons access gates remain incomplete; never present Starter checkout as available or award its benefits until they are verified.

Free plan is retained and public_visible=false. Owner policy: book buyer registers and sends a purchase receipt from that exact registered email, with manual matching to a valid purchased book. Valid claims must be reviewed and the purchased book activated within three calendar days from receipt. The restricted database table gu_book_receipt_claims_20261027 records case and due date; it does not automatically create rights. Receipt delivery inbox, inbound sender verification, secure storage and staff approval remain to be implemented and accepted. Existing verified first-party checkout fulfillment is a separate route.

No LIVE Stripe subscription transaction was executed. Consumer renewal notice/cancellation/refunds and historical privacy policy must be checked before opening the new tier.


## Official receipt email — Owner-confirmed October 27, 2026

Customers must send purchased-book receipts to **stockmarketfromthegroundup@gmail.com**, with the message originating from the same email address verified on their website account. Subject: **Book Purchase Verification**. Include the book title/edition, retailer, date, and an order or receipt identifying reference, and attach a legible copy of the purchase receipt with unrelated payment details redacted. Staff must match exact registered sender to the account, independently validate the eligible book and receipt (duplicates/fraud checks), and activate only the verified purchased book and applicable Free entitlement within **three calendar days of receipt of valid proof**. Book possession challenges and legacy book-key benefits remain separate; no email receipt by itself grants premium tools or founder status. Public instructions: `book-receipt-verification.html`, also linked from registration, Founding 600, Store and Book Activation.

**Inbox integration status:** The connected Gmail plugin currently authenticates a different mailbox and does not provide access to stockmarketfromthegroundup@gmail.com. Publication of the address is not proof of monitored inbox, sender authentication, receipt upload, staff triage or book grants. Existing `gu_book_receipt_claims_20261027` is a private staging queue, not an automatic mail ingestion service. No data access was attempted to the designated mailbox or claims approved. Before enforcing or guaranteeing automatic processing, link the authorized mailbox and finish secure staff authorization and entitlement fulfillment; keep the public instructions consistent with the actual staffed 3-day policy.


## Controlling change: receipt attached to signed-in Support ticket

Owner superseded the prior email-based receipt process. Members submit `Book Purchase Verification` from `dashboard.html?tab=support&purpose=book_receipt`, selecting an existing eligible catalog book, entering the retailer/order information and uploading their private PDF/JPEG/PNG receipt (up to 6 MB). The authenticated, confirmed account is the sender; matching an incoming external email is unnecessary. The existing Support ticket includes the attachment metadata and is linked to the private three-calendar-day receipt claim. The Owner-only Admin Control Center's `admin-book-receipts.html` permits protected download and a reasoned decision. Approval is transactional and permits only verified companion-book + FREE plan grants, not digital file rights or Founder memberships. Email is no longer a required receipt route. No customer receipts were created or reviewed by this change; all genuine member browser and staff-review acceptance belongs to controlled beta.
