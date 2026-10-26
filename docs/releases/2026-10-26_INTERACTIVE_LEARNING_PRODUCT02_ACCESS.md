# Sellable beta Product 02 — Interactive Learning & Historical Labs

**Date:** 2026-10-26 · **Branch:** `main` · **Provider checkout mode:** no LIVE Stripe use; no sales switches changed.

## Applied roles

Owner's technical representative, product and instructional designer, Cloudflare backend/API architect, Supabase entitlement engineer, application security reviewer, storefront UX copywriter and automated-test engineer.

## Critical discovery

The previously existing `INTERACTIVE_LEARNING` standalone tool is listed at $29.99/month in `public.platform_tools`, but the Cloudflare member-tool-access allowlist did not recognize its identifier. `/api/lab-player-context` and `/api/lab-content` previously checked `ONDEMAND_TRAINING` only. Thus, a future paid Interactive Learning customer could purchase the standalone tool, yet the primary Lab player would deny it. Display text claiming Interactive Learning access cannot substitute for server-side authorization.

This is a frontend/backend/entitlement mismatch, not a valid reason to stop the whole beta release. The security fix must still avoid turning a $29.99 Lab orientation into automatic book ownership, private reviewed assessment results, or SITE-only QA material.

## Source changes

- `functions/api/member-tool-access.js`: recognize **INTERACTIVE_LEARNING** as a valid paid-tool code. This does not alter `public.user_has_tool_access(uuid,text)` or any database grants, plan prices, or membership records.
- `functions/api/lab-player-context.js`: independently check two existing tool entitlements `ONDEMAND_TRAINING` and `INTERACTIVE_LEARNING`. Any independently confirmed entitlement can authorize a canonical candidate Lab's **metadata-only guided orientation**. A confirmed book entitlement is still separately protected. The 83 SITE-exclusive private lessons require `ONDEMAND_TRAINING` and exact individual authored records; they are not unlocked by a standalone INTERACTIVE_LEARNING product. An outage without another confirmed book/sample entitlement produces an explicit 503; absent payment produces 403.
- `functions/api/lab-content.js`: accept independently verified INTERACTIVE_LEARNING for available Labs but preserve matching-book authorization for full book-authored private teaching. A subscribed member does not receive unseen proprietary manuscripts or private answer rubrics. Upcoming SITE learning remains under its separately scoped training authorization.
- `assets/js/store-product-detail-v01484.js`: accurately disclose the **real** current scope: original canonical Lab orientation and eligible guided beta exercises, reviewed grading not yet broadly published, separate private book-authored lessons require their corresponding book, and no promised verified historical chart feed.

## Regression test

`tests/test_interactive_learning_purchase_access_v1.mjs` tests:
1. Authenticated standalone Interactive Learning entitlement accepted by the shared server API.
2. Canonical `F2-C07-L01` guided metadata-only context succeeds with `advancedAllowed=true`.
3. No book ownership means the private Book II lesson cannot be retrieved. Matching book ownership separately permits a protected whitelisted lesson; private `grader`/`correctAnswer` fields do not leak.
4. Standalone subscription alone cannot open `SITE-018` among the 83 Upcoming Site-exclusive lessons.
5. Independent valid training entitlement remains able to access strictly authored ungraded SITE instruction without graded credit.
6. Missing entitlement, suspended account, anonymous caller and failed required entitlement lookup cannot produce an authorization success.

The test is registered in the normal Boot Camp CI workflow. This is mocked role/contract evidence, **not** a genuine TEST Stripe subscriber signing into a production account. No sales amount or earned Founder benefits were changed. No LIVE Stripe secrets were read or written.

## Current status and acceptance

- **IMPLEMENTED:** Single shared authorization fix, truthful product copy and protected access fixture.
- **TESTED:** When a completed exact-source GitHub Boot Camp job passes `tests/test_interactive_learning_purchase_access_v1.mjs`. Record its commit SHA separately from deployed Cloudflare SHA.
- **PROVEN:** Only when Cloudflare reports a successful deployment of the matching commit, and a legitimate member account with server-side authorized tool access completes a privacy-preserving real member journey. Member-facing release can continue without fabricating that future evidence.
- **CARRIED FORWARD:** TEST-mode checkout/webhook fulfillment, lifecycle cancellations, retry idempotency, wider browser/accessibility regression and independent rubrics for future graded assessments.
- **NOT MODIFIED:** Founding Member 30/60 terms, exact 419 Lab registry, all 83 Upcoming Start exclusions, existing 30 competencies, KDP Select, LIVE provider shutdowns and all member attempts.

**Owner authorization already covers continued engineering and code release to `main`.** Human Founding Member beta feedback may arrive later; source development is not stopped waiting for it.
