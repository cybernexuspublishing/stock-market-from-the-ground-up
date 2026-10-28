# Founding 600 — Prelaunch Dry-Run Acceptance Policy

**Document ID:** SMFGU-F600-PRELAUNCH-ACCEPTANCE-001  
**Version:** 1.0  
**Date:** October 28, 2026  
**Project:** The Stock Market: From the Ground Up  
**Owner authority:** Founder enrollment, public visibility and LIVE payment authorization remain with the Owner.  
**Status:** Controlling prelaunch acceptance criteria; individual tests must be evidenced separately.

## Governing principle

**No paying Founding 600 members are required to accept the prelaunch dry run.** A zero-count production Founder ledger is normal before marketing and enrollment. It is a data-integrity and noncharging baseline, **not an acceptance failure**.

Distinguish **prelaunch functional readiness** from **post-launch operational assurance**. The former must be completed before marketing/launch without real users; the latter is checked against actual customer events after authorized purchases begin. Do not silently reclassify a missing paid account as an application defect.

## Dry-run identities, systems and safety

- Use synthetic 14-, 30-, and 60-day subscription states in local/isolated browser and API fixtures, tested at mobile and desktop sizes. QA identity may be a legitimate designated *noncommercial* member account for real sign-in navigation; an Owner-controlled, short-lived QA grant must never invent a paid Founder record, grant permanent purchase discounts, assign a numbered founder seat, or enable Council votes.
- Use only the project-specific **Stripe TEST account** for provider billing lifecycle checks. Never connect a TEST-mode result to a LIVE paid ledger, real member access, live settlement or Stripe LIVE mode.
- Supabase production RLS can be verified through READ ONLY role/JWT simulations and rollback-only transactions; rollback is mandatory. Do not persist fake paid subscriptions, invoice receipts, founder member numbers or permanent staff grants in the live database.
- Use the Yahoo-master Cloudflare Pages project and only GitHub `main`; pin acceptance to the **same exact SHA** with all required GitHub checks completed successfully and the matching production Pages deployment successful.
- Do not store passwords, session tokens, personal payment information, secret keys or protected grading answers in reports, browser traces or forum posts.

## Founder plan and entitlement matrix

| Scenario | Founders Commons shared forums | Published ordinary member and book/tool discussion topics | Extended Design Council topics and voting | Paid tools/books | Account commercial benefits |
|---|---|---|---|---|---|
| Active synthetic 14-Day Starter | Allow | Allow | Deny | Only independently granted entitlements | Fixture-only 14-day term |
| Active synthetic 30-Day Standard | Allow | Allow | Deny | Only independently granted entitlements | Fixture-only 30-day term |
| Active synthetic 60-Day Extended | Allow | Allow | Allow when independently eligible | Only independently granted entitlements | Fixture-only 60-day term |
| Expired/cancelled with no residual rights | Deny private Founders access | Ordinary public/member access only | Deny absent a separate earned entitlement | No implied new entitlements | No new paid benefits |
| Free member with no Founder grant | Deny | Public/member-accessible boards only | Deny | No premium access without grants | Free tier only |
| Owner/Admin/Moderator | Authorized oversight of all forums, including hidden/restricted discussion | Authorized oversight | Read/moderate but **no founding vote** by virtue of staff role | No automatic purchase grants | No implied founder benefits |
| Time-limited approved noncommercial QA grant | Only explicitly scoped permitted pages | As specified by QA grant | Deny | Do not grant paid subscriptions | No paid identity, invoice or seat |

Forum **read** permissions and commercial content **entitlements** are separate. Published discussion visibility does not provide access to book files, tool APIs, protected answer keys or subscription-only program functions. Hidden topics remain limited to authorized staff.

## Required prelaunch noncharging checks

1. **Founder forums:** Synthetic 14/30/60 login and session state; shared 8-board directory, discussion read/replies and permissions; active-to-expired transitions; unauthorized topic rejection; staff oversight and Council voting denial for 14/30. Validate desktop, 390px mobile, keyboard navigation and private-topic leakage.
2. **Member learning experience:** For each tier, open the genuine page source in local isolated Chromium using a fixture; verify Learning Studio content, benefit record privacy, shared discussion, allowed links, and 60-day-only extended path. Do not confuse mock-auth tests with real production sign-in.
3. **Real sign-in smoke:** Use an authorized, expiring **noncommercial** production QA credential to confirm actual authentication and its limited grant. Do not fabricate three real paid identities to satisfy prelaunch acceptance. Record grant expiry, redacted environment, denial of paid Founder identity/Council rights, and cleanup.
4. **Catalogue and checkout safety:** Validate the 14-day, 30-day and 60-day prices, cadence and Admin publication independently; hidden product must be absent from Store and denied on direct purchase API; merely published coming-soon products cannot start payment. Founder capacity is 600 **shared**, not 600 each.
5. **Stripe TEST lifecycle:** Test-mode session creation, session completion/expiration, signed webhook idempotency, recurring invoice paid/failed, subscription modification/cancellation, refund/dispute and restoration/withdrawal according to actual policy. Assert all fixture billing remains in TEST and that LIVE endpoints remain closed. Do not mark complete from static source inspection alone.
6. **Data and security:** RLS prevents unauthorized access; no PII leakage, fake master records or paid provider mutations. Protect against repeated events/double allocations and failed-payment overgrant. Record exact relevant tests, revision, run URLs and outcomes.
7. **Release gate:** Every required GitHub check completed successfully on one stable `main` SHA, matching Cloudflare production SHA deployed successfully. Cancelled/skipped workflows require explicit scope assessment. No unreviewed LIVE payment activation.

## Evidence that exists and limits

- Production billing ledger was verified as **0 Founder memberships, 0 paid Founder cycles and 0 active paid Founder subscriptions** on October 28, 2026 — correct expected prelaunch state.
- Existing production QA has demonstrated an actual signed-in noncommercial member reading shared Founders Commons and being denied Extended Council and purchased Founder identity. This **does not** constitute 14/30/60 paid member acceptance.
- Rollback-only Supabase tests previously demonstrated 14/30/60 forum read access, Council restriction and expired membership denial. These tests do not replace an independent authenticated browser journey.
- The locally mocked Founders Commons browser tests cover 14/30/60 at multiple widths. The Learning Studio synthetic browser suite has been expanded to include 14-Day Starter alongside Standard and Extended.
- Stripe TEST subscription prices have been inspected: $22.99/14-day, $49.99/30-day and $59.99/60-day. TEST product/price registration and webhook presence alone are **not** completed event-lifecycle acceptance.
- Current GitHub CI and deployment acceptance must be checked and recorded for **the latest single revision**, not combined across unrelated revisions.

## Separate post-launch operational assurance

After the Owner expressly authorizes LIVE payment activation and genuine customers join, verify actual per-tier first enrollment, invoice and refund events, ongoing renewals, founder number uniqueness, shared 600-seat concurrency, customer-access restoration and customer support. These production customer events cannot be demanded *before* the first customer exists. Failure to have production customers during dry-run is not a reason to block the prelaunch engineering acceptance.

**Document control:** SMFGU-F600-PRELAUNCH-ACCEPTANCE-001 · v1.0 · Owner-controlled `main` · No LIVE payment authorization.
