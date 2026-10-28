# Owner Website Roadmap — Infrastructure, Market-Data and Member Dashboard Audit

| Document control | Value |
| --- | --- |
| Organization | Cyber Nexus / Crown & Lantern Press |
| Project | The Stock Market: From the Ground Up — Companion Website |
| Document ID | SMFGU-WEB-ROADMAP-AUDIT-20261028-01 |
| File name | `2026-10-28_OWNER_ROADMAP_INFRA_PROVIDER_DASHBOARD_AUDIT.md` |
| File type | Markdown (.md) |
| Canonical location | GitHub `cybernexuspublishing/stock-market-from-the-ground-up/docs/releases/` |
| Google Drive location | Not assigned; this file was not uploaded to Google Drive |
| Version / date | 1.0 / October 28, 2026 |
| Status | Evidence-scoped review and source corrections; independent production acceptance remains open |
| Purpose | Update the private Owner Website Roadmap without overwriting saved Owner approvals, protected entitlements, or existing release gates |
| Dependencies | GitHub main, Yahoo-master Cloudflare Pages, Supabase project `oxihglyfgzywsupnyicb`, authorized Owner roadmap API, authenticated member browser acceptance |
| Approval | Owner-directed engineering and catalog corrections; not a LIVE payment authorization |

## Executive findings

1. **Repository scope:** The recursive GitHub `main` tree enumerated 2,515 entries without truncation, comprising tests, assets, Supabase migration and admin source, documentation, Cloudflare Functions, workflows and scripts. This is a complete **file-tree inventory**, not an individual 2,515-file code audit.
2. **Cloudflare:** The authorized Yahoo master account hosts the single GitHub-connected `stock-market-from-the-ground-up` Pages project, production branch `main`, and one billing-scheduler Worker. Changes are deployed through the existing pipeline. Deployment/CI parity must be checked at the accepted head SHA.
3. **Supabase:** Project was ACTIVE_HEALTHY during read-only inspection. The public catalog held 419 active and visible canonical Labs, 22 active platform-tool records and 141 recorded migrations. A catalog entry is not a reviewed assessment, an entitlement, or a passing member journey.
4. **Tiingo BYO:** Two connected encrypted credential records and two connected market-data connection records existed. A recent connection test timestamp was recorded on October 28 UTC. Catalog status remains `beta`. Do not imply universal provider availability or redistribution rights.
5. **Alpaca market-data IEX:** Two `ALPACA_BYO` connected private credential records existed, and the guarded read-only IEX OHLCV API path and regression tests are present. Its `market_data_providers` row was corrected from `planned` to `beta` with accurate IEX single-venue wording. No premium access or broker order authorization was added.
6. **Dashboard:** The previous CSS hid the sidebar containing the only profile picture. The saved `av-n6.webp` avatar for the pictured profile is present in the canonical asset library. Desktop sidebar and responsive avatar presentation were restored; dashboard width was rebalanced. The 419-catalog-as-accessible-Labs metric was corrected to intersect release availability with relevant tool rights and sample/book entitlements.
7. **Owner roadmap:** A new authenticated read-only audit section is returned through the existing protected `/api/owner-roadmap` response and displayed in the current Owner Roadmap UI. Existing custom tasks and all stored Owner statuses continue to take precedence; neither source task counts nor financial gates were rewritten.
8. **About page:** The published page source now describes the Free beginner pathway, canonical Labs, no-look-ahead instruction, fictional/browser versus historical data, optional Tiingo and Alpaca IEX connections, and separate optional paper trading.
9. **Security/advisors:** Supabase reported RLS-enabled/no-policy and unindexed-foreign-key categories (152 and 116 findings in the initial advisor summaries). The former includes deliberately private service-access tables. Individual role and query-plan triage is required before remediation; do not bulk create RLS policies or indexes.
10. **Acceptance boundaries:** Existing Founder/commerce terms, actual authenticated provider reads, independent editorial and graded-assessment review, responsive Chromium browser coverage, TEST billing lifecycles, and explicit Owner-controlled LIVE payments remain separate gates.

## Required acceptance order

- Complete the matching GitHub CI checks and confirm final accepted `main` SHA.
- Verify Cloudflare production deployment matches that SHA, not merely that an earlier deployment succeeded.
- Sign in as a real authorized member at 390px, tablet and desktop widths. Check sidebar/avatar, tabs, hidden sections, dynamic metric values, settings, and account-switch isolation.
- Check Tiingo and Alpaca IEX requests using legitimate connected user credentials, appropriate exchange/time windows and expected error/restriction paths. Do not expose tokens or conflate IEX with consolidated data.
- Validate 419-Lab release metadata against actual guided lesson availability; preserve ungraded/graded distinctions.
- Review Supabase advisor findings individually and document evidence, priority and any safe migration before database changes.
- Keep LIVE Stripe and payment transactions outside the acceptance gate until separately authorized.

## Revision history

| Version | Date | Change | Status |
| --- | --- | --- | --- |
| 1.0 | 2026-10-28 | GitHub/Cloudflare/Supabase inventory, provider catalog correction, dashboard/root cause and roadmap evidence addendum | Source implemented; production sign-off pending |

**Document footer:** Cyber Nexus · The Stock Market: From the Ground Up · SMFGU-WEB-ROADMAP-AUDIT-20261028-01 · v1.0 · October 28, 2026 · Internal Owner operations. 
