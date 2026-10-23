# Main-branch Lab access repair and acceptance record — 2026-10-23

**Requirement:** preserve the 419 canonical IDs and the existing v3.2/v3.3 player; make member learning usable without exposing book instruction or answer keys. Billing and Stripe changes are outside this release.

**Baseline inspected:** `main` at `df82917f1230ee228adf4881825731fc79283832`; Cloudflare Pages production deployment `1834a981-b52f-4d0f-bf04-b06c3a109923` succeeded for that merge. This file records a later source repair; its production status must be checked against the new commit after deployment.

## Findings and corrections

| Requirement / failure | Evidence | Repair and security boundary | Status |
| --- | --- | --- | --- |
| Player opened at `/lab-player` with no ID | Production route returned HTTP 200 but the old player sent an empty ID to `/api/lab-content`, yielding `Invalid Lab.` | The player now links to the 419-Lab Registry before making an API request. Invalid IDs also get a Registry link. | Browser regression passed locally; deployment pending. |
| Private instruction store unavailable | Old `/api/lab-content` returned the Owner-seed message on any Supabase REST error; the player only tried canonical fallback for 404. | A 503 from the private store now has a narrow machine-readable code. Only that code or an absent lesson (404) prompts `/api/lab-player-context`, whose server independently requires authentication, a published Lab, and matching book or learning access. A 401/403 is never bypassed. No private text, keys, bars, or grade are added to the fallback. | Local API and browser regressions passed; live authenticated acceptance pending. |
| Authored Day Trading and Reading the Tape lessons could not pass the book check | Numeric book 4/5 incorrectly mapped to nonexistent `FOUNDATION_BOOK_4/5`. | Map to existing `DAY_TRADING_BOOK_1` / `READING_THE_TAPE` entitlements. Site-Exclusive authored instruction requires active Interactive Learning access. | Local role tests passed; live entitlement acceptance pending. |
| Unified Admin Shell workflow | Run `39995590367`, job `120558160345`: `test_v014156_admin_stage_b_members_audit.mjs` expected 200 but received 400. The endpoint UUID pattern omitted its third four-character group. | Correct UUID validation only on the minimal, permission-scoped member summary endpoint. It still rejects malformed IDs before privileged data queries. | Local Admin shell, service-key, and member audit tests passed; new CI pending. |
| Stripe Shadow Sandbox workflow | Run `39995590255`, job `120558160530`: Admin browser test expected Stripe script query `014155`, found `014150`. | Investigated only. | Failed; payment code and bundles untouched. |
| Locked LIVE Membership Fulfillment workflow | Run `39995589784`, job `120558155401`: `test_v014072_zero_store_contract.py` failed its `storeZeroMonthlyQA(request,env)` assertion. | Investigated only. | Failed; payment code untouched. |

## Production and curriculum evidence

- Before this repair, read-only production HTTP checks returned 200 for `/lab-player` and `/lab-player.html`; unauthenticated `/api/lab-player-context?id=DT-C01-L01` returned 401.
- The three public sample instruction requests (`F1-C02-L01`, `F2-C01-L01`, `F3-C01-L01`) returned 200. Checked `DT-C01-L01` and `SITE-001` returned 404 from the private instruction API. This proves neither that all 94 Foundations rows exist nor that a photographed store failure is currently persistent.
- The existing curriculum evidence generator reports **0/419** Labs and **0/30** Bootcamp days with every review field recorded. The Foundations report reports **0/94** individually reviewed under all criteria. Registry presence and the shared instructional engine do not satisfy individual editorial, historical-data rights, reviewed rubric, accessibility, or production acceptance.
- Source metadata and the 30 existing competency guides support ungraded conceptual orientation. Private authored lessons and reviewed grading remain authoritative where present. This release adds no private seed, schema migration, historical feed, or assessment approval.

## Owner Supabase action, if an authored lesson is still missing

1. In the **existing** Supabase project, run `supabase/admin/v0.14.0.0_PREFLIGHT_READ_ONLY.sql` to confirm the schema, then `supabase/admin/v0.14.0.0_POSTFLIGHT_READ_ONLY.sql` to obtain the current instruction and reviewed-set counts. Also run `supabase/admin/v0.14.0.99_419_LAB_AND_30_SKILLS_ACCEPTANCE_READ_ONLY.sql` for the canonical registry and draft inventory. Export only counts/statuses, never lesson bodies or answer keys.
2. Compare any missing exact Lab IDs against the separate Owner-held private SQL seed and the current Training Editor. Do not infer that a 404 means the schema is absent, or that a row means the teaching is substantive. If the schema or seed is actually missing, the Owner must review the existing project state and the original private artifact before any one-time application. Never upload the seed or answer key to GitHub or the Pages build, and never rerun historical SQL blindly.
3. For a claimed complete Lab, record its distinct teaching, source/rights, frozen observation boundary, private reviewed rubric, allowed role/book access, real attempt storage, mobile/keyboard/screen-reader checks, and production result in the existing per-ID acceptance process.

## Verification and rollback

Local source checks: Lab API book/site entitlement and unavailable-store tests; canonical context authorization test; all-419 shared-engine test; v3.3 engine test; Admin read tests; JavaScript syntax. Local Playwright in Chrome passed at 390 and 1280 pixels with a mocked member and local source server. It checked 404 and 503 fallback, 403 denial, mode lock/restart, and the missing-ID Registry link. These do not replace authenticated production testing.

After the new `main` deployment succeeds, verify the deployed Lab JavaScript contains the chooser, open `/lab-player` with no ID, then use an authorized member account to open one published Lab in each eligible collection. Confirm matching book-only Guided access, denied nonmatching access, reviewed assessment only where a private rubric exists, and saved attempt behavior. If any new behavior is unsafe, revert the source commit on `main`; no database rollback is needed because this change has no SQL or data write.
