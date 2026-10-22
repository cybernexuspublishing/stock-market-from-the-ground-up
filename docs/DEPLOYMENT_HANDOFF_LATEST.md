# Deployment 09 of 18 — Market Tutor AI (in progress)
**Project:** The Stock Market: From the Ground Up — unified website and books workstreams  
**Company / imprint:** Cyber Nexus / Crown & Lantern Press  
**Date:** 2026-10-22  
**Target release:** v0.14.0.149 (proposed; not production deployed)  
**Source baseline:** main commit `345c2c1280d83a62e989bdc11aaed542e783ff85`  
**Branch:** `deployment-09-market-tutor-retrieval-20261022`  
**Status:** PARTIAL SOURCE IMPLEMENTATION; NOT PRODUCTION ACCEPTED  
**Document control:** GitHub `docs/DEPLOYMENT_HANDOFF_LATEST.md` | Markdown | version 0.1 | Google Drive: not assigned | Drive document ID: not assigned.  
**Purpose:** Preserve cross-chat engineering continuity and verifiable blockers for Deployment 09.

## Actual changes
- Introduced isolated deterministic approved-topic retrieval with abbreviation/synonym normalization and whole-token ranking. Prevents accidental substring matches, ignores common question boilerplate, and deterministically breaks rank ties. Existing source catalogs retained.
- Wired the **existing** premium Tutor API to that shared retrieval routine; no parallel Tutor app, database, Stripe product, or AI provider was introduced.
- Added a Node regression test for known aliases, topic matches, unrelated queries and empty results.
- Added independently testable **hypothetical long-only** risk sizing, buying-power bound, target reward/risk and P&L arithmetic in `functions/_lib/tutor-arithmetic-v014149.js`. This is a verified source implementation only, not yet wired into a member calculator or independently accepted.
- Retained existing mandatory Tutor entitlement, four modes, request validation, history, rate-meter path, source-only fallback, and provider safeguards unchanged.

## Uploaded research review
The supplied `StocksToTrade-Browser-Research (3).zip` includes automated browser research, source indexes, evidence artifacts, and draft editorial materials. Material is **not automatically approved content** or licensed market data. Do not reproduce raw third-party research in a member-facing Tutor knowledge base without source verification, editorial review and rights checking. Zero new expense.

## Previous release dependency
Deployment 08 source is at v0.14.0.148, with main most recently committed `345c2c1`; prior v147 Tutor handoff reports outstanding SQL installation, live role-isolation checks, provider approval and verified educational content. Deployment 08 production/Supabase acceptance has not been independently established in this deployment.

## Acceptance / blockers
- **Source work:** partial. PR review and exact-head CI required.
- **Tests:** retrieval and hypothetical arithmetic regression suites added to existing GitHub Actions workflow. Results not claimed passing until GitHub Actions or a local runner verifies.
- **Supabase:** no new migration in this slice; existing v102/v103/v107 contracts require read-only verification before production acceptance.
- **Cloudflare:** no production release triggered by branch.
- **AI providers:** paid inference never enabled; approved Workers AI model and zero-cost quota eligibility have NOT been established. Do not infer free per-question allowance.
- **Editorial:** 419 registered Labs, 30 competencies and 30 Bootcamp days are mandatory; accepted-count evidence unavailable. Do not report 100%.
- **Still required in D09:** approved and versioned knowledge records, measured retrieval evaluation, private multi-conversation workflows, full accessible chat rendering, unanswered-topic governance, owner approvals, cost-protected Workers AI adapter, secure Lab context, human-reviewed instruction and all acceptance gates.
- **Security:** unchanged authorization architecture must be tested against Member A/Member B, OWNER, TEST and Showcase in the deployed environment.
- **Production acceptance:** NOT VERIFIED.

## Next work
Continue Deployment 09 until its functional, security, editorial, accessibility and operational evidence is met; only then proceed to Deployment 10. Keep previous deployment reports. Preserve all approved price and entitlement decisions and never silently install migrations.

## Revision history
| Date | Version | Description |
|---|---|---|
| 2026-10-22 | 0.1 | First Deployment 09 retrieval hardening handoff; all external acceptance explicitly pending. |
| 2026-10-22 | 0.2 | Source-only risk arithmetic and numerical tests added; acceptance still pending. |
