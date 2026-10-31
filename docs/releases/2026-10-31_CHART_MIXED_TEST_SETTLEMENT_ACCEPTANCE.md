# Chart Studio Mixed TEST Checkout — Acceptance Register

**Project:** The Stock Market: From the Ground Up  
**Document ID:** SMFGU-COMMERCE-CHART-MIXED-TEST-001  
**Filename / type:** `2026-10-31_CHART_MIXED_TEST_SETTLEMENT_ACCEPTANCE.md` / Markdown  
**Repository:** `cybernexuspublishing/stock-market-from-the-ground-up` — `main/docs/releases/`  
**Google Drive location:** Not established  
**Version:** 1.1  
**Review date:** October 31, 2026  
**Status:** **TEST purchase/refund lifecycle ACCEPTED; full commercial acceptance OPEN**  
**Dependencies:** Stripe TEST, Supabase private settlement ledger, signed Stripe webhook, Cloudflare Pages, Chart Studio effective-tier resolver  
**Purpose:** Preserve actual accepted evidence and untested risks without conflating simulated tests with genuine Stripe provider events.

## Scope and controlling rules

One-time, nonrenewing Chart Studio Advanced ($9.99/30 days) and Professional ($19.99/30 days). Mixed payments draw from the **single existing Crownlight Lumens wallet** at the approved test discount rate of $0.07/Lumen. Current member entitlement is checked before checkout. Server-side reservations, provider-verified payment, refund/dispute reversal, and $0 zero-cash fulfillment are required; no LIVE charge or commercial sale activation is authorized.

## Genuine provider-backed tests — accepted

**Professional mixed TEST order, October 31, 2026**

| Evidence | Verified value |
| --- | --- |
| Original Professional price | $19.99 |
| Lumens redeemed | 10 |
| Credit discount | $0.70 |
| Stripe TEST card payment | $19.29 |
| Stripe Checkout Session | `cs_test_a1YEVUmx0roii7uDDDSb1e0Awz0zGusLh5adHOHmGIw7ZNW70Hh85qQwIF` |
| Stripe PaymentIntent | `pi_3UWXxLJY9FI7byHB06FIrFOv` |
| Signed paid event in private settlement ledger | `evt_1UWXxOJY9FI7byHBpLOVg9dv` |
| Signed refund event in private settlement ledger | `evt_3UWXxLJY9FI7byHB018v5GHY` |
| Stripe TEST refund | `re_3UWXxLJY9FI7byHB0J0a5Y0N` |
| Final order and cash entitlement | Refunded; premium cash access revoked |
| Final existing Lumen balance | 29; all 10 applied Lumens returned |
| Saved Chart Studio workspace | 1 retained |

Signed paid and refunded events were independently present in the private event ledger. This is **genuine TEST purchase → fulfillment → refund → Lumen restoration → revocation acceptance** for Professional, not merely mock SQL.

**Separate full-price (nonmixed) checkout expiration:** The abandoned $19.99 Professional TEST session `cs_test_a11DxLJD9zfvIfrjdmNKsaQeMJ4jDWhx8IEw7V7pG3Sy7YD2dPHqsOYF04` is recorded as expired. Signed expiration event `evt_1UWXwvJY9FI7byHB004XzX7g` is recorded in the **cash-only** event ledger. This does not satisfy mixed-credit cancellation acceptance.

## Database rollback tests — verified, not genuine provider acceptance

- Atomic mixed reservation and debit calculated the correct reduced cash amount, without permanently consuming credits.
- A zero-cash Professional purchase granted a 30-day entitlement with no Stripe charge; a zero-cash refund restored credits once.
- Duplicate requests reused their original order; another unresolved reservation was blocked.
- Cancellation/expiration returned credits in a rolled-back transaction.
- A simulated disputed $19.85 Professional purchase using two Lumens revoked access and returned the two credits. A subsequent simulated refund did not restore credits twice. Entire test rolled back; final wallet remained at 29. **No genuine Stripe dispute event was produced.**
- Anonymous/authenticated clients cannot read or mutate private settlement tables or execute service-role settlement functions directly.

## Current effective access (data-layer verification)

The Professional cash entitlement is revoked. The temporary Advanced Lumen pass remains active through November 7, 2026 (UTC expiry: `2026-11-07T07:35:05.638093Z`). A previous Professional Lumen pass is expired. One saved workspace remains.

The expected effective tier is **Advanced**, but authenticated member-browser downgrade and workspace reopening have **not** been independently accepted.

## Open acceptance gates

1. **Mixed-payment cancellation/expiration:** Create an authenticated QA mixed session without paying, cancel it through the member-facing control, verify Stripe's actual expired session and the signed `checkout.session.expired` event, and confirm the Lumen reservation is returned exactly once.
2. **Actual dispute:** Use a genuine supported Stripe TEST dispute scenario on an eligible QA payment, verify signed `charge.dispute.created`, immediate entitlement protection, correct Lumen restoration, and subsequent event idempotency. SQL simulation is not acceptance.
3. **Authenticated downgrade/workspace:** Sign into James_Test, verify its actual effective Advanced tier, confirm Professional-only controls are inaccessible, and reopen the existing private saved workspace. Cross-account workspace isolation must remain enforced.
4. **Final release gate:** Review exact-commit CI and Cloudflare deployment for changes made during acceptance. LIVE checkout and unrelated product classes stay disabled.

## Revision history

| Version | Date | Summary | Status |
| --- | --- | --- | --- |
| 1.0 | 2026-10-31 | Initial implementation and database simulation evidence | Superseded |
| 1.1 | 2026-10-31 | Recorded genuine discounted TEST purchase/refund, signed events, wallet reconciliation, and separate dispute simulation | Controlling register |

**Decision:** Accept the Professional mixed TEST purchase/refund lifecycle. Do **not** classify disputes, mixed cancellation/expiration, authenticated downgrade, or public LIVE sale as accepted.
