# Founding Membership Stripe TEST — Provider-Driven Acceptance
**Date:** 2026-10-30
**Provider environment:** Stripe TEST `acct_1URGkDJY9FI7byHB`; no live money
**Database:** private server-owned `gu_f600_sandbox_*_v014215` shadow records only
**Scope:** Founding 14-Day / Founding 30-Day / Founding 60-Day

## Production-code path verified using actual Stripe TEST
Three fresh Stripe TEST customers, test-only Visa payment methods, and matching
TEST subscriptions were created against the exact catalog Prices; each
subscription carried `f600_qa_program=FOUNDING600_TEST` and was bound to a
different private sandbox intent. Stripe itself generated the paid invoices,
sent the signed events to the existing production-domain GU39 TEST webhook,
and the isolated PostgreSQL RPC recorded the resulting cycles.

| Plan | Subscription | Initial paid invoice | Cents | Exact term | Provider event result |
|---|---|---|---:|---:|---|
| FOUNDING_14 | `sub_1UWAA3JY9FI7byHBypHauYdf` | `in_1UWAA3JY9FI7byHB9JrvCHzD` | 2299 | 14 days | invoice.paid -> QA cycle |
| FOUNDING_30 | `sub_1UWAAuJY9FI7byHBiKmIqlMm` | `in_1UWAAuJY9FI7byHBswSRBEmi` | 4999 | 30 days | invoice.paid -> QA cycle |
| FOUNDING_60 | `sub_1UWAAyJY9FI7byHB4p2T2V1F` | `in_1UWAAyJY9FI7byHBGP4dFfBM` | 5999 | 60 days | invoice.paid -> QA cycle |

Signed subscription.updated with `cancel_at_period_end=true` successfully
marked the 14-day QA intent as cancel_scheduled. Each paid TEST charge was
then refunded **in full via Stripe TEST**; all three signed charge.refunded
events reversed exactly one matching QA billing cycle and zeroed the
respective *shadow* Sparks balances. Each TEST subscription was canceled,
and each signed customer.subscription.deleted event was recorded. Final
status for all three private intents: canceled, refunded cycle: true,
remaining shadow Sparks: 0. Three provider-delivered invoice.paid events,
three charge.refunded events, three subscription.deleted events, and one
subscription.updated event were recorded.

No actual website member or payment account was created; there are zero
live Founding-member records, zero live Founder paid cycles, and zero real
site-subscriptions for Founding 14/30/60 at the final readback.

## Reliability corrections independently tested
- The signed Stripe TEST shadow RPC accepts repeated exact-invoice evidence
  as idempotent with **zero additional Sparks/cycles**.
- A late invoice.payment_failed referencing an older paid billing period
  cannot downgrade the newer paid cycle. A future valid failure can record
  past_due. Protected via source-signed tests and PostgreSQL rollback tests,
  **not** yet revalidated as actual provider-generated renewal failures.
- Standalone Free-signup CI regression used outdated homepage copy; corrected
  to assert current Free registration/chart-practice pages and gated Founding
  CTA. Founding 600 Source & Security Gate passed afterward.

## Test hygiene
Earlier TEST-clock attempts created incomplete initial invoices (they used
default_incomplete) and did not constitute paid acceptance. Their test-only
subscriptions were canceled/incomplete_expired, their abandoned QA metadata
removed where needed, and the unused prepared shadow intents cleaned.
The three fully paid acceptance subscriptions were all canceled and refunded.
No real Stripe charge, LIVE setting, real Founding seat, member entitlement,
website Sparks wallet, or Chart Studio configuration was touched.

## Still open
- **Genuine automatic renewal** using Stripe Test Clock advancement,
  including a second provider-created `invoice.paid` for the same
  subscription with a later billing period.
- **Genuine provider-generated failed renewal**, retry recovery, and
  stale-event ordering using the same Stripe Test Clock environment.
  The connected Stripe API interface permits test-clock creation but did
  not expose test-clock advancement or PaymentIntent confirmation.
  Do not substitute controlled synthetic webhook fixtures as proof.
- Independent Beta acceptance and final commercial eligibility.

**Release decision:** Real TEST initial paid enrollment, signed fulfillment,
refund and cancellation **passed for all three plans**. Renewal and
failed-renewal provider tests remain **open**; no LIVE commercial launch
approval is inferred.
