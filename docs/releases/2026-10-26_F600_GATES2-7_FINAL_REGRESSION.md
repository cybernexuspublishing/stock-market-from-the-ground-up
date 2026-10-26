# Founding 600 — Gates 2–7 Acceptance and Final Regression Register
**Created:** 2026-10-26 UTC | **Branch:** `main` | **Owner:** Cyber Nexus / Crown & Lantern Press  
**Release decision:** **NO-GO for LIVE sales**. **LIVE payment controls remain disabled.**
**Evidence labels:** IMPLEMENTED = written/configured; TESTED = actual test/fixture run; PROVEN = genuine Stripe TEST provider event reconciled to database (with provenance caveat).

## Gates, roles, and outcomes

### Gate 2 — Commercial rules
**Roles:** Acting Owner, PostgreSQL architect, full-stack, Stripe integration, QA and documentation.

**IMPLEMENTED:** 60-Day 20% -> 15% in `gu_founder_plans_v014173`, vested constraint, function `gu_founder_discount_eligibility_v014221`, terms, Store, Admin, checkout discount validator, source tests. 30-Day 10%, $49.99/30 days, 60-Day $59.99/60 days retained. Forward prelaunch migration `v0.14.0.274_founding600_15pct_contract_gate2.sql`; guarded rollback in `supabase/rollbacks`; membership rules contract `docs/FOUNDING_600_MEMBERSHIP_RULES_CONTRACT_v1.md`.
**TESTED:** Supabase independent readback shows values 1000/1500 bps; plan and vesting CHECK constraints 1500; eligibility function contains `THEN 1500`, not `THEN 2000`. [Founding source acceptance 40262351888](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40262351888), [Sitewide source/browser acceptance 40262351941](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40262351941).
**TESTED (additional audit-constraint correction):** Existing Gate 2 migration 274 had already applied 1000/1500 plan, vesting and eligibility policy, but the legacy `gu_founder_discount_audit_v014173_discount_bps_check` still allowed 1000/2000. Added and applied guarded migration `v0.14.0.275_founder_15pct_audit_constraint.sql` (rollback in `supabase/rollbacks/`); independent Supabase readback now shows 1000/1500 for **all three** constraints: plan, vesting, and audit ledger. Verified all founding enrollment/billing/fulfillment switches remained false. Added source regression test.\n\n**BLOCKED:** Correct discounts are not yet charged on all eligible books, tools, Lifetime and Sparks. The existing LIVE checkout deliberately fails closed when an earned founder discount lacks a verified pricing mechanism. Upgrades, permanent vesting, Sparks spending order, and each benefit are not end-to-end PROVEN. No LIVE checkout changes permitted.

### Gate 3 — Auth and role isolation
**Roles:** Identity/Auth architect, Supabase security, QA/accessibility.
**TESTED (prior CI):** Guest private-route redirects retain the intended destination, forged bearer cannot read member, Lab and Owner context, and bad Auth credential response code is 401.
**BLOCKED:** Missing real authenticated Owner and two separate member sessions on Yahoo master. No real Turnstile success, email confirmation/reset, logout invalidation, session rotation, cookie attributes or cross-user direct-ID tampering acceptance. Existing Auth users/roles alone are not proof.

### Gate 4 — Stripe Sandbox lifecycle
**Roles:** Stripe TEST engineer, webhook-security, PostgreSQL reconciliation, QA.
**PROVEN genuine Stripe TEST events into the shared shadow ledger (dual destination caveat):**
| Scenario | TEST event ID | Result |
|---|---|---|
| Founding 30 paid | `evt_1UUeLqJY9FI7byHBE8qypzKN` | $49.99 / exact 30-day cycle, 5 included Sparks |
| Founding 60 paid | `evt_1UUeM1JY9FI7byHB65vOF4nb` | $59.99 / exact 60-day cycle, 15 included Sparks |
| Founding 30 cancel scheduled | `evt_1UUeOWJY9FI7byHBKMSc6BKM` | Paid-through retained, future cancellation scheduled |
| Founding 60 full refund | `evt_3UUeLzJY9FI7byHB0DyL25fN` | Cycle reversed and remaining included Sparks zeroed |
| Founding 30 payment failed | `evt_1UUePtJY9FI7byHBfjxtZ3jm` | Past-due and **zero paid cycles** |

These events were independently retrieved from the Stripe TEST account (`livemode:false`) and found in `gu_f600_sandbox_events_v014215`. **Crucial provenance limitation:** both original and master TEST destinations were enabled at the time; this does not isolate which delivered the event.
**TESTED:** Exact paid invoice replay in database returned `replayed:true` without duplicate paid cycle.
**FAILED — master-only delivery:** In a separate controlled TEST-only window, original destination was disabled and only Yahoo master destination enabled. Synthetic checkout `sub_1UUegIJY9FI7byHBPkNPMIQq`, paid TEST invoice `in_1UUegJJY9FI7byHBz3GQdWpR` ($49.99), returned **zero shadow events and zero paid cycles** for isolated intent `da079c06-7d69-4ae1-9ba1-54198b2cc62a` within the verification window. Could be signature/endpoint mismatch, a delivery failure, or event delay; **cause not verified**. Before any future acceptance, verify exact **master TEST webhook destination** signing secret `whsec_` matches encrypted `GU39_STRIPE_TEST_WEBHOOK_SECRET`, check Stripe event-delivery attempts and API responses, and retry while old TEST destination is disabled. Never print secret values.
**BLOCKED:** Master-only positive signed webhook PROVEN, test-clock advance (connected Stripe plugin does not expose advance action), recurring 30/60 renewals, upgrades, disputes, provider-backed end-to-end permanent founding fulfillment.
**Restored:** Master TEST webhook `we_1UUZqGJY9FI7byHB8Ool1VaR` **disabled**, original TEST webhook `we_1URIRZJY9FI7byHBWfVaGJym` **enabled**, Supabase `gu39_sandbox_settings.enabled=false`. All actual founder members/paid cycles/reservations remain zero.

### Gate 5 — Shared 600-seat capacity
**Roles:** PostgreSQL concurrency, distributed systems, QA.
**IMPLEMENTED:** `tests/fixtures/f600-capacity-isolated-v1.sql` captures the current production `gu_founder_reserve_v014173` function; `tests/test_f600_capacity_isolated.cjs` and `.github/workflows/f600-capacity-isolated.yml` execute it in disposable PostgreSQL 17 via public GitHub Actions, never against production Supabase.
**TESTED PASS:** [Isolated capacity run 40264373244](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40264373244): **640 reservation attempts** at each concurrency **16, 32, 64**; exactly 600 accepted, 40 exhausted, 600 unique numbers/users; 300 per plan. Expired unbound seat reused; expired checkout-bound seat held and not reallocated; another applicant refused above capacity.
**BLOCKED:** 600 concurrent *actual provider checkout* attempts and late-event post-expiration reconciliation cannot be PROVEN while LIVE founding enrollment/billing switches remain off. Preserve PostgreSQL advisory lock and unique partial indexes.

### Gate 6 — Customer experience and legal
**Roles:** UX/accessibility, privacy, consumer compliance, e-commerce.
**IMPLEMENTED:** `founding600.html` removes unsupported in-site trade simulator and unlaunched full-tool access claims; adds direct links to Subscription/Billing and Refund/Cancellation policies in recurring-consent block. Regression source test extended in `tests/test_founder_discount_15_contract.mjs`. Recurring offer shows exact price/term and requires express two-part consent. Existing `legal_documents` in shared Supabase contains 10 published v1.1 policies including TERMS, SUBSCRIPTION, REFUNDS, PRIVACY and educational disclaimer; public anonymous SELECT is RLS-controlled.
**HIGH risk:** Stripe's standard Billing customer portal is only available to paid Billing users per Stripe support; pay-as-you-go Billing charges volume fees (published 0.7% of Billing volume); a custom hosted domain costs additional $10/month. Under Owner $0 rule, do not assume portal use is free; verify existing account entitlement or provide a secure, verified in-house cancel-at-period-end pathway. Existing client cancellation points to `/api/stripe-billing-portal-v014122`, but this was not exercised because it uses LIVE credentials. No actual authenticated cancel-by-member UI was proven.
**ATTORNEY REVIEW REQUIRED:** ROSCA material terms, separate affirmative recurring consent, simple cancel; applicable state ARLs (e.g. California July 2025 changes); refunds, chargeback disclosures, financial-education marketing, sales taxes, data retention. FTC 2024 Click-to-Cancel amendments were vacated July 2025; agency restored prior rule text February 12, 2026, and requested renewed comments March 2026. Do not treat vacated 2024 amendments as effective. Verify counsel before acceptance.
**BLOCKED:** WCAG 2.2 AA authenticated mobile checkout; email receipts; Owner support/exception workflow and member renewal/Sparks/cancel page against actual sessions; legal counsel approval; cancellation at $0 without paid Billing.

Sources (official):
- FTC conforming federal status: https://www.reginfo.gov/public/do/eAgendaViewRule?RIN=3084-AB84&pubId=202510
- ROSCA federal discussion: https://www.govinfo.gov/content/pkg/FR-2026-03-13/html/2026-04952.htm
- California AG: https://www.oag.ca.gov/news/press-releases/attorney-general-bonta-issues-consumer-alert-california%E2%80%99s-automatic-renewal-law
- Stripe: https://stripe.com/billing/pricing and https://support.stripe.com/questions/billing-customer-portal?locale=en-GB
Legal review is not legal advice.

### Gate 7 — Production cutover PACKAGE ONLY
**Roles:** Production release owner, DevOps, security, incident response, payment operations, privacy.
**IMPLEMENTED:** This acceptance report, owner-specific launch hold checklist, and rollback/checkpoint sequence. NO LIVE activation has occurred.
**Live controls verified from Cloudflare encrypted binding metadata:** six of six encrypted provider names present; LIVE checkout, webhook, fulfillment and global authorization all `false`; Pages linked to GitHub `main`/Yahoo master hostname `https://stock-market-from-the-ground-up-d1r.pages.dev`; Turnstile scoped to master; single worker `ground-up-billing-scheduler` with **zero cron schedules**.
**Shared Supabase:** founding enrollment, billing and fulfillment `false`, both founding plan checkout flags `false`, Founding 60 discount 1500 bps. Original TEST webhook stays enabled, staged master TEST stays disabled when not in controlled acceptance.
**LIVE Stripe provider status:** **NOT freshly checked**. Owner prohibited using LIVE keys/prices/webhooks. Historical record: original LIVE primary enabled, staged Yahoo master/interim LIVE destinations disabled. Independently re-attest ONLY during separately authorized LIVE cutover; do not presume historical state is current.
**Rollback/launch-sequence runbook (NOT EXECUTED):**
1. Freeze code, migrations, product descriptions, legal versions and owner authorization. Publish a static launch-ready snapshot.
2. Securely reconcile Supabase Auth callback/site URL and signing secret pairs for correct master origin; prove authenticated roles and real TEST delivery with original TEST route isolated.
3. Verify exact immutable Stripe LIVE price/product catalog and separate signing-secret destinations only after Owner authorization; compare 30/60 plan amounts and cadence; reconcile original/interim/master delivery destinations and pending provider events; no dual active LIVE webhook paths without verified idempotency.
4. Confirm all 600-seat indexes, full entitlement and Sparks refund policies; execute Gate4 final TEST clock/upgrade/refund/dispute lifecycle and Gate5 full concurrency/replay.
5. Only when Owner explicitly permits LIVE activation, coordinate controlled flag/endpoint enablement, webhook intake, fulfillment and automated scheduled billing ownership. Verify one scheduler, not duplicates.
6. Stop/rollback criterion: failed signature checks, unassigned founder number, duplicate invoice/cycle, price mismatch, entitlements missing, overbooked seat, failed sign-in, increased 5xx or customer inability to cancel. First stop **new checkout**; preserve active subscriber management and refund/cancellation access. Do not drop/migrate existing paid records or revoke original webhook until fully reconciled.
7. Owner alone authorizes eventual source-account retirement after zero pending deliveries, rollback window and sign-off. Cloudflare API token owner-locked (permissions/scope/name/expiry/IP) cannot be changed by Acting Owner.

**First-hour launch watchlist (prepared, not armed):** live checkout success/error counts, 2xx and 4xx/5xx provider delivery with independent event IDs, signing error rate, entitlements per paid invoice, sold/reserved/available founder count, duplicate allocations, Sparks credit ledger reconciliation, cancellations, owner support queue, pages-function/Turnstile errors, request quota and paid-service usage guard. Stop launch on any revenue-without-access incident.
**Independent security acceptance checklist:** Cloudflare source-root exposure still blocked, no private .git/.mcp/migrations served, enforce RLS and server-only RPC, verify direct IDOR, CSRF, cookie flags, rate limits, audit logs, minimum webhook grants, exact origin/signature pairing, replay/idempotency and cache no-store for private responses. Review and remediate earlier Workers Builds repository-root exposure; do not rotate owner-locked Cloudflare API token without explicit approval.

## FINAL FULL REGRESSION — evidence matrix
| Gate | Test | Expected | Actual | Evidence | Status | Label |
|---|---|---|---|---|---|---|
| 2 | Discount terms in DB, constraints and source | 10/15% | Verified 1000/1500 with check constraints & live Supabase function; source CI passed | Migrations 274/275; Supabase postmigration 3-constraint readback; runs 40262351888, 40265658744 | PASS | TESTED |
| 2 | Eligible item discounted purchases | Correct amounts books/tools/Lifetime/Sparks | Explicit full-price checkout block, no discounted payment path | `stripe-live-checkout-v01458.js` | BLOCKED | IMPLEMENTED |
| 3 | Guest API denial/protected page return | No private data, same-origin preserved redirect | Earlier browser and forged bearer CI PASS | Browser 40254490964, security 40255159772 | PASS | TESTED |
| 3 | Real Owner and two members, CAPTCHA, reset/IDOR/logout | End-to-end role and session proof | Credentials/sessions not available in this evaluation | No authenticated session recording | BLOCKED | IMPLEMENTED |
| 4 | 30/60 paid TEST invoices with correct Sparks | $49.99/5 and $59.99/15; paid event IDs | Two genuine Stripe TEST events and shadow rows matched (dual-endpoint caveat) | `evt_1UUeLq...`, `evt_1UUeM1...`, shadow ledger | PASS | PROVEN |
| 4 | Full TEST refund/cancel/failed invoice | Correct reversal, paid-through, zero paid for fail | Stripe TEST event IDs matched shadow states | `evt_3UUeLz...`, `evt_1UUeOW...`, `evt_1UUePt...` | PASS | PROVEN |
| 4 | Idempotent duplicate invoice | No double-grant | Isolated DB RPC `replayed:true` on repeated same provider id | `gu_f600_sandbox_apply_v014215` | PASS | TESTED |
| 4 | Exclusive Yahoo master signed webhook delivery | Paid TEST event recorded ONLY via master | New 30/60 paid TEST invoice events exclusively reached master, with correct shadow amount, term and Sparks | `evt_1UUfILJ...`, `evt_1UUfIf...`; above detailed evidence | PASS | PROVEN |
| 4 | Master-only TEST cancel and refund | Scheduled cancellation preserves paid-through; refund reverses paid cycle and remaining included Sparks | Both cases matched real provider events and isolated master shadow rows | `evt_1UUfL3...`, `evt_3UUfId...` | PASS | PROVEN |
| 4 | Real TEST clock renewals, upgrades and disputes | Provider events and correct cycles | TEST clock created; plugin did not expose advance operation; no proof | `clock_1UUeJ8JY9FI7byHBsTE8Qa9l` | BLOCKED | IMPLEMENTED |
| 5 | Isolated 600-seat concurrency 16/32/64 | 600 unique, 40 rejects per run, both plans, expiry | Exactly as expected; 1920 total calls | CI 40264373244 | PASS | TESTED |
| 5 | Simultaneous actual TEST checkouts | No 601st paid founder | Cannot exercise production allocator without enabling LIVE gate | Founding switches remain off | BLOCKED | IMPLEMENTED |
| 6 | Founding Store and recurring consent source | Correct prices/15%, no nonexistent simulator; terms linked | Source corrected; Founding 600 Source & Security Gate 40265658744 PASS after correcting stale free-beta simulator expectation; broader sitewide CI 40265658824 pending | Founding source test | PASS / subject to current CI | IMPLEMENTED |
| 6 | Member cancellation, email receipts, WCAG AA, legal | Verified nonpaid portal path; attorney sign-off | Not established; published v1.1 legal policies present | Legal tables, portal source, federal guidance | BLOCKED | IMPLEMENTED |
| 7 | Prelaunch hold and rollback documentation | No LIVE activation, docs complete | Controls verified and this package prepared | Cloudflare read-only, TEST API, Supabase | PASS | IMPLEMENTED |
| 7 | Actual authorized LIVE launch | Requires Owner permission and successful earlier gates | Not attempted, as required | Owner policy | BLOCKED | NOT AUTHORIZED |

**Final release decision: NO-GO.** The former master-exclusive TEST webhook failure is FIXED and now proven with fresh paid 30/60-day TEST invoices, cancellation and refund events. The remaining blockers are Further blockers: authenticated Owner/member acceptance, TEST renewals/upgrade/dispute, discounted eligible product commerce, member cancellation without metered Billing, attorney approval and complete provider-backed concurrency.
**Owner-only actions:** (1) validate or reinstall correct master Stripe TEST endpoint signing secret (`GU39_STRIPE_TEST_WEBHOOK_SECRET`) in encrypted Yahoo Pages Production after matching exact endpoint; never paste in chat; (2) authorize genuine owner/member session QA or supply securely connected testing mechanism, not passwords in public repo; (3) attorney review for automatic renewal/refund/cancellation; (4) later separately authorize any LIVE transaction/cutover or paid billing service.
**No Cloudflare build-token permissions/scope/name/expiration/IP settings were modified. No LIVE Stripe keys, prices, webhooks or payments were accessed by this run.**

**Post-audit CI note:** The first Gate 2 follow-up source run failed on an obsolete test that incorrectly expected an in-site simulator allocation on the Founding 600 page. Corrected `tests/test_beta_public_free_open_v014269.mjs` to require the truthful educational-only disclaimer. [Founding 600 Source & Security Gate run 40265658744](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40265658744) is **SUCCESS**. The full sitewide Playwright job [40265658824](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40265658824) is not yet proven complete as of this record. No LIVE operations performed.

## TEST-only Yahoo master webhook signing-pair repair (2026-10-26)

**IMPLEMENTED; positive provider delivery still unverified at recording:** Created replacement Stripe **TEST-only** endpoint `we_1UUf6eJY9FI7byHB0FuUEutL` at `https://stock-market-from-the-ground-up-d1r.pages.dev/api/gu39-stripe-webhook`. Captured its creation-only `whsec_` value in a transient plugin call and installed the value as Cloudflare Pages **encrypted** Production binding `GU39_STRIPE_TEST_WEBHOOK_SECRET`, without logging, exporting or returning the value. Cloudflare's Pages project API verified 46 Production variables and all other encrypted credentials retained after the scoped PATCH; LIVE launch remains false. The former Yahoo master TEST endpoint and original TEST endpoint must be reconciled before acceptance. The TEST shadow owner switch stays disabled outside a controlled acceptance window. **Do not count this infrastructure repair as PROVEN until a new genuine Stripe TEST event is delivered exclusively to the Yahoo master and the matching shadow row is observed.** The two Stripe LIVE destinations and original payment path were not accessed or changed. Cloudflare API build-token permissions/name/scope/expiration/IP filter were not touched.

### Verified remediation — Yahoo master-only Stripe TEST signing and delivery (2026-10-26)

**Status: PROVEN, for a genuine subscription-update webhook; full paid-cycle lifecycle still open.**

- Previously failed dual-destination signing arrangement replaced with TEST-only Stripe endpoint `we_1UUf6eJY9FI7byHB0FuUEutL`, bound to the Yahoo master URL. Its creation-only `whsec_` was transmitted directly into Cloudflare encrypted Production binding `GU39_STRIPE_TEST_WEBHOOK_SECRET` without displaying or persisting the value outside the provider and Cloudflare; readback confirmed 46 intact Production bindings and LIVE launch switch false.
- Isolated routing by disabling the original Stripe **TEST** webhook while keeping the replacement Yahoo master TEST endpoint enabled. Temporarily set `gu39_sandbox_settings.enabled=true` and updated **TEST** subscription metadata on `sub_1UUegIJY9FI7byHBPkNPMIQq`, without changing billing amounts.
- Stripe TEST returned event **`evt_1UUf9mJY9FI7byHBHmylSUuY`**, type `customer.subscription.updated`, `livemode:false`, associated with that subscription.
- Independently observed **the exact event ID** in `public.gu_f600_sandbox_events_v014215` with corresponding plan `FOUNDING_30`, test founder number `8`, and `processed_at=2026-10-26T04:05:11.700966Z`. Since the original and interim TEST webhook endpoints were disabled at delivery, this is master-exclusive signed delivery evidence.
- **Restored TEST safety** immediately: `gu39_sandbox_settings.enabled=false`; original TEST webhook `we_1URIRZJY9FI7byHBWfVaGJym` enabled; new Yahoo master TEST endpoint and previous master TEST endpoint disabled. No LIVE Stripe resource was accessed or changed.
- Former Gate 4 master-exclusive signed-webhook FAIL is now **PASS / PROVEN for subscription.updated**. Master-exclusive `invoice.paid` and cycle grant, renewed invoice, test-clock advance, upgrade, dispute and all authentic signed-in member tests are *not yet* proven. Keep NO-GO for real sales.


### Yahoo master-only TEST payment lifecycle expansion — 2026-10-26

**Genuine provider evidence; all actions Stripe TEST (livemode=false) and shadow tables only. No LIVE Stripe resources accessed.** Repeated controlled windows with original TEST webhook disabled and replacement Yahoo master TEST endpoint `we_1UUf6eJY9FI7byHB0FuUEutL` enabled; independent `gu39_sandbox_settings.enabled=true` only during test. Each window restored original TEST endpoint enabled, new master endpoint disabled, and test shadow switch disabled. No real customer founder memberships or LIVE paid-cycle rows were created.

| Scenario | Genuine TEST event ID | Result in `gu_f600_sandbox_*` | Evidence |
| --- | --- | --- | --- |
| 30-Day initial paid invoice | `evt_1UUfILJY9FI7byHBVGjIwaSS` | Intent founder #9, `$49.99`, 30-day cycle, 5 Sparks, `active` | TEST invoice `in_1UUfIJJY9FI7byHBbtKEMIgD` |
| 60-Day initial paid invoice | `evt_1UUfIfJY9FI7byHBeNLHgBbp` | Intent founder #10, `$59.99`, 60-day cycle, 15 Sparks, `active` | TEST invoice `in_1UUfIcJY9FI7byHBrYl5MoZN` |
| 30-Day cancel at paid-through | `evt_1UUfL3JY9FI7byHBrSFVa4Wy` | `cancel_scheduled`; original paid invoice retained, 5 Sparks retained | TEST subscription `sub_1UUfIJJY9FI7byHBtuVQOi87` |
| 60-Day full refund | `evt_3UUfIdJY9FI7byHB0DABlAvC` | `refunded`, paid cycle reversed, remaining included Sparks 0 | TEST payment intent `pi_3UUfIdJY9FI7byHB0Qo2GTdJ` |
| Existing subscription update signing verification | `evt_1UUf9mJY9FI7byHBHmylSUuY` | Exact event ID matched shadow ledger exclusively via master | TEST subscription `sub_1UUegIJY9FI7byHBPkNPMIQq` |

All listed event IDs were read back from Stripe TEST (`livemode:false`) and matched to Supabase shadow records. **THIS CLOSES THE HISTORICAL FAILED YAHOO MASTER-ONLY WEBHOOK DELIVERY CASE** and proves master-only initial paid invoice, cancellation scheduling and refund handling. It does **not** prove future scheduled renewal via TEST clock, mid-term upgrade without a duplicate active subscription, dispute creation, fully authenticated production member journey, or provider-integrated 600-person concurrency. A subsequent billing-cycle-anchor reset produced only a `customer.subscription.updated` event; do not label that a renewal. These remain release blockers.

**Restored controls independently checked:** original TEST endpoint `we_1URIRZJY9FI7byHBWfVaGJym` enabled; new master TEST endpoint `we_1UUf6eJY9FI7byHB0FuUEutL` disabled; retired master TEST endpoint disabled; Supabase shadow switch false; live founding members and live paid cycles both zero. Old LIVE webhook, LIVE Stripe prices and all LIVE keys were not touched.

