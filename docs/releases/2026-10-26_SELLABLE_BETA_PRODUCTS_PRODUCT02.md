# Sellable Beta Products — Product 02: Interactive Learning & Historical Labs

**Document ID:** SMFGU-BETA-SELLABLE-P02-20261026  
**Project:** The Stock Market: From the Ground Up  
**Repository location:** `docs/releases/2026-10-26_SELLABLE_BETA_PRODUCTS_PRODUCT02.md`  
**Google Drive location:** Not verified; do not invent a Drive path.  
**Filename/type:** `2026-10-26_SELLABLE_BETA_PRODUCTS_PRODUCT02.md`, Markdown.  
**Version:** 1.0 · **Date:** October 26, 2026 · **Status:** IMPLEMENTED source / exact-revision CI pending at initial publication.  
**Purpose:** Evidence-based product display and original preview education for an existing tool subscription.  
**Dependencies:** Current `main`, authenticated Lab player, public Lab scope and availability APIs, Supabase `user_has_tool_access`, verified original research sources, live-branch noncharging restrictions.

## Roles and operating constraints

Acting Owner, product architect, finance/checkout engineer, curriculum designer, professional trading educator, data-provenance reviewer, accessibility and frontend engineer, AppSec and QA lead.

This is **not** a new SKU, private Lab replacement, grading service, training entitlement grant, LIVE checkout or completion certificate. Existing plan and tool entitlements remain server-controlled. The previously approved **Founding Members** branding remains unchanged.

## Source register and research limitations

- **Owner-supplied source:** `StocksToTrade-Browser-Research (8).zip`, the newest identified research archive in the conversation. Its `private/observations/deliverable-drafts/STT_Master_Stock_Trading_Concept_Inventory.md` covers STT-C-0013 **Market order**, STT-C-0014 **Limit order**, STT-C-0016 **Timing and partial fills** and STT-C-0017 **Spread and slippage**, primarily source ID STT-S-0087 and STT-S-0009. These are structured *research proposals*, and their own entries say **PARTIALLY REVIEWED** and approved manuscript coverage **UNVERIFIED**.
- `STT_Research_Completion_Declaration.md` expressly states that the research was **not complete as of October 21, 2026** and does not independently establish manuscript or production acceptance. This is compatible with using the user's verified research as a foundation; it is **not** authority to declare every associated curriculum, commercial capability or historical dataset accepted.
- `STT_Do_Not_Add_List.md` specifically excludes proprietary algorithm details, private menus/transcripts/course libraries, guessed VWAP session definitions, unproved chart history and invented performance outcomes. Preserve these exclusions.
- **Independent official verification:** SEC Investor.gov, [Understanding Order Types](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-14) (updated August 18, 2026); [Bid/Ask Prices](https://www.investor.gov/introduction-investing/investing-basics/glossary/ask-price); and [Executing an Order](https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/executing-order). These sources establish the distinction between price constraints, routing, partial fills and execution uncertainty—not a performance claim.
- Research archive includes a private browser profile and observations. **Nothing from that profile, credentials, cookies, protected course transcripts or captured proprietary interfaces has been copied into the website or committed to GitHub.** The preview uses original fictional numbers, wording and interaction.

## Product and catalog facts, independently read from Supabase

Existing `platform_tools.INTERACTIVE_LEARNING` is active and publicly visible, listed with an approved `individual_price_cents=2999`. Its `checkout_enabled` remains **false**. Existing `gu_storefront_items_v014174` SKU `tool:INTERACTIVE_LEARNING` is visible, with price label **$29.99** and `sale_ready=false`. There are 177 private Lab instructional records at the inspected snapshot and **zero** `lab_training_sets_v014` rows having `review_state='reviewed'`; none is therefore represented as independently verified graded credit.

Current `user_has_tool_access` uses an authoritative `plan_tool_access` membership mapping and scoped `user_tool_passes` for tools. It already recognizes `INTERACTIVE_LEARNING` for valid FULL_MONTHLY and FULL_ANNUAL plan access; ONDEMAND_MONTHLY maps only to ONDEMAND_TRAINING. No grant, product price, owner policy or billing flag was changed during this Product 02 release.

## Implementation in existing architecture

1. `store-tool-interactive-learning.html` retains the existing product root and the single canonical dynamic Store catalog pricing/availability script. A separate original **teaching preview** appears below it.
2. `assets/js/store-interactive-learning-v1.js` provides a worked **fictional** bid $10.00 / ask $10.12, a learner who will buy at no more than $10.05, the explanation of market versus buy-limit instructions, free-response-style decision correction through a multiple-choice option, retry, and an independent transfer/no-verified-fill problem. It saves **no attempts, no data and no grade** and is deliberately not the shared Lab Engine.
3. The same script fetches the real `/api/lab-beta-scope` and `/api/lab-release-availability` metadata; validates the canonical 336/83 selection and reports only selected candidate counts. Site-exclusive authored records outside the selected 336 are not presented as part of this paid product's verified 336 coverage. Both public APIs exclude private answers and source lesson bodies.
4. `assets/css/store-interactive-learning-v1.css` adds visible focus, native radios, tap targets, responsive cards for 390/900px and reduced-motion behavior without a second design system.
5. `tests/test_sellable_interactive_learning_research8.mjs` verifies source basis, real backend API routes, UI contracts and repeated answer-correction behavior. The Boot Camp CI workflow runs it and checks JS syntax.

## Acceptance, tradeoffs and outstanding work

- **IMPLEMENTED:** original preview, no-lookahead/fictional disclosures, precise product exclusions, accessible responsive styles, canonical Lab-status read, regression test and CI registration.
- **PROVEN earlier provider evidence:** Store SKU and tool price metadata, zero reviewed grading sets, live entitlement mapping. A matching source commit and successful Cloudflare deployment require separate verification after CI.
- **Not accepted as completed:** all 419 Labs, 336 lessons, editorial review, private answer sets, member mastery or paid checkout. The public Store has no authority to grant access. The Owner handles Founding Member testing when convenient.
- **Potentially material gap:** research materials are not a complete, independently verified reproduction of the original manuscripts or third-party historical datasets; no protected content redistribution is authorized.
- **Better alternative adopted:** show a real canonical Lab coverage snapshot and truthful paid-subscription scope instead of creating a duplicate `labs`/grading engine or promising hundreds of finished lessons.

## Change control

No SQL migration, destructive update, Stripe charge, LIVE payment toggle, enrolled-book reprint, member grant, score modification or source-archive upload occurred in Product 02. All source changes are intended for existing GitHub `main`. Technical acceptance must use exact-commit tests and provider readback; a CI green check alone does not equal member-tested capability.

**Next workstream:** independently inspect and improve the existing `JOURNAL_ANALYTICS`, `MARKET_TUTOR` and `MARKET_SIMULATOR` product fulfillment boundaries, reusing existing source-of-truth entitlement and content databases without duplicating products.
