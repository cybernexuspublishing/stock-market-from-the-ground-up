# Original Author-Created Fictional Lab Replay — v0.14.0.97
**Company/Project:** Cyber Nexus / The Stock Market: From the Ground Up. **Date:** 2026-10-19.
**GitHub:** docs/ORIGINAL_FIRST_PARTY_REPLAY_v0.14.0.97.md. **Document type:** Markdown.
**Status:** Source candidate, not applied to existing Supabase, not production-deployed.
**Google Drive ID/location:** not assigned. **Development spending:** $0.

## Reuse first, no reinvention
419 canonical Lab IDs across 6 collections, existing 21 registered tools, private `market_datasets`, `gu_replay_bars_v01492`, `gu_replay_sessions_v01492`, guarded `v01492_replay_advance` and atomic `v01494_replay_finish_to_journal`. Existing 419 original draft assessments from v96 remain separate from publisher-reviewed grades. Neither Stripe nor membership products are added.

## This ORIGINAL market example is not historical
The creator owns the new made-up price paths and may license its own creations. **None of the 10,056 invented candles is asserted to be a real stock or verified event.** Scenario symbol is `SIMULATION`; fictional timestamps are in 2040. Every record carries metadata `original_synthetic=true`, `historical_evidence_verified=false`, and unambiguous original rights/provenance; prices are randomly authored on installation, persisted, and protected by the existing v95 published-bar immutability trigger. Because the model reads future bars only from the private server at an advancing cursor, client requests reveal only observed bars. This DOES NOT recreate a licensed 2024 chart, Nasdaq/NYSE order book, actual fills or ticker history. Neither historical proficiency nor historical Lab certification is awarded.

Existing replay and Journal code now distinguish these datasets: the first recorded simulated decision links to the existing Journal as a `paper` observation, not `historical_lab`; trade_date for fictional simulation is the actual decision-lock date, not the invented 2040 price timestamp. All outcome/grading fields remain unverified. For actual historical data, existing Journal classification remains historical_lab.

## Manual Owner SQL order (one existing Supabase database)
1. Confirm earlier 0.94 and 0.95 objects exist. The Owner's uploaded SQL indicates the historical-bar immutability trigger is enabled; the complete installed Journal RPC/function must still be checked.
2. Run `supabase/migrations/v0.14.0.97_419_AUTHOR_CREATED_FICTIONAL_OHLCV_OWNER_REVIEW_REQUIRED.sql`. This is additive/idempotent for scenario rows; the transaction fails atomically if 419 canonical Labs do not exist or the original scenario count is not exactly complete. It replaces the existing 0.94 RPC in place (no duplicate).
3. Run `supabase/admin/v0.14.0.97_ORIGINAL_SIMULATIONS_POSTFLIGHT_READ_ONLY.sql`. Expect 419 published author-owned fictional datasets, 10,056 bars, 419 explicitly non-historical metadata and 0 backwards timestamps. Anonymous/member RPC EXECUTE false; service role true.
4. Deploy existing Cloudflare Pages project `stock-market-from-the-ground-up`, branch `main`, build `bash scripts/build-pages.sh`, output `public`. No added secrets, vendor payments or Workers subscriptions. Keep optional paid `AI_TUTOR_*` absent.
5. Test authenticated members, second-member denied, sequential before/after lock, no future-data in JSON, retry idempotent Journal, and refusal for missing entitlements. Existing subscription access must stay unchanged. `GU_REPLAY_JOURNAL_V01494_ENABLED` only enabled after tests.
6. Each original Lab page links directly to its fictional case under `verified-replay.html?dataset=GUSIM_<Lab ID with underscores>`; the canonical UI and API identify simulations as fictional. Real historical datasets appear separately and only with accepted rights.

## Scope and limitations
This supplies **419 ORIGINAL fictional chart series**, each 24 ordered OHLCV bars, not 419 real historical case studies. It pairs with the 419 private original conceptual draft assessments, but a finished 419/419 premium experience still requires individually reviewed grade keys, curricula, skills-progression evidence, accessibility checks, simulation model acceptance and live database tests. Do not label all as finished based solely on quantity.