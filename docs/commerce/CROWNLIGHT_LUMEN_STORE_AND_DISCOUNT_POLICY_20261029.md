# Crownlight Lumens — Current Prelaunch Policy and Acceptance

**Revision:** October 29, 2026 (supersedes this document's former 10-cent, 20% and $10 maximum proposals)  
**Status:** Prelaunch; published legal policies, existing authorized Lumen rewards, prospective catalog and checkout. Not a claim of customer sales.

## Controlling terms

1. **Lumens have no cash-out value.** They cannot be exchanged for money, withdrawn, returned to the platform for cash, sold between members for consideration, moved to external financial accounts, or converted into cryptocurrency or brokerage funds. The **$0.07-per-Lumen checkout rate is only an internal discount calculation**, not an exchange rate or cash balance. Applicable legal or payment-processor refund remedies for an underlying paid transaction remain enforceable.
2. **Unused Lumens do not expire.** This includes eligible earned, purchased, included, promotional and administrative Lumens. A trial, rental or temporary access right acquired with Lumens can have a fixed expiration date.
3. **Member-selectable whole Lumens.** When the new mixed checkout is accepted, members may apply any approved whole number from 0 to the lesser of their actual wallet balance or the amount required to cover up to **100% of the eligible product subtotal**, before separately assessed shipping or taxes. The last Lumen may cover fewer than 7 cents with no cash change.
4. **No accidental double charge.** A member with an included membership right or Owner access is not separately charged for that right. Failed/canceled payment must not strand Lumens; credits are reserved, verified, reversed and fulfilled atomically and idempotently.
5. **Member-visible disclosure.** Summarize the non-cash rule adjacent to Lumen offers, checkout and welcome-credit announcements, and link to published Terms and the Lumen-specific legal page. Do not hide a material financial restriction solely inside a collapsed disclosure.
6. **No new spending or selling from policy publication.** The 286-Lumen prospective sign-up award, new unpriced tool passes, mixed cash+Lumens checkout, credit bundles and physical goods require their separate commerce and benefit acceptance. No real paid LIVE diagnostic is authorized by this policy.

## Verified release contracts

- Current published legal documents: **TERMS 2.7** and **CROWNLIGHT_SPARKS 2.6** (member-facing name: Crownlight Lumens). Prior versions retained in `legal_documents_publication_history_v2`. Migration: `supabase/migrations/20261029_lumens_no_cash_exchange_prelaunch_legal_v1.sql`.
- The effective unit denomination remains **seven cents**. Owner can stage a changed value without silently applying it; audited Draft per-SKU full-Lumen cost overrides are distinct from the cash-checkout conversion.
- Example at $19.99, wallet 80 Lumens: spend 80 → $5.60 discount, $14.39 cash; spend 40 → $2.80 discount, $17.19 cash and 40 Lumens left; spend 0 → $19.99 cash. 286 Lumens can cover the eligible $19.99 item entirely.
- Primary member terms: `/terms.html` and `/crownlight-sparks-terms.html`. Member-facing Store: `/store-sparks.html`, `/store.html`. Prospective quote: `/checkout.html`.
- Operational acceptance register: `gu_release_acceptance_v1`, preserving work stages until independently verified cloud, DB, Stripe, source, rights, member browser and fulfillment gates pass.
- **No cash-out API, Stripe refund to Lumen value, or unrestricted balance exchange is implemented or permitted**. Any legitimate refund of underlying payment is separately verified against payment provider policy and law.
