# Integrated Historical Replay-to-Journal Delivery — v0.14.0.94

**Company:** Cyber Nexus / Crown & Lantern Press
**Project:** The Stock Market: From the Ground Up
**Version/date:** 0.14.0.94 / October 19, 2026
**File name/type:** `INTEGRATED_REPLAY_JOURNAL_v0.14.0.94.md` / Markdown
**Location:** GitHub `docs/INTEGRATED_REPLAY_JOURNAL_v0.14.0.94.md`
**Google Drive document ID/location:** Not established. No duplicate Google Drive file is required.
**Status:** Source development committed only; production migration, release deployment, and member acceptance unverified.
**Purpose:** Extend the EXISTING replay and Trading Journal without creating replacement databases, a duplicate Journal, a new market-data source or a paid product.

## Controlling dependencies

- Existing `gu_replay_sessions_v01492` and first-bar `gu_replay_bars_v01492` data, whose private SQL from v0.14.0.92 is subject to installation review.
- Existing `decision_journal` and `trade_plan_snapshots` from previous v0.6/v0.7 migrations.
- Active signed-in Market Simulator/Full Platform entitlement; existing `toolAccess` and account restrictions.
- Private service-role PostgREST credentials kept only in Cloudflare Functions.
- Dataset published, rights-cleared and independently evidence-verified, including source attribution and corporate-action policy.

## Source work

1. `finish` in `functions/api/learning-replay-v01492.js` now calls exactly ONE service-only Supabase RPC; no two independent network writes can leave a finished replay without a Journal record.
2. A review-required additive migration `supabase/migrations/v0.14.0.94_REPLAY_JOURNAL_ATOMIC_OWNER_REVIEW_REQUIRED.sql` creates a PRIVATE link table and a transactionally atomic routine. It locks the owner-scoped replay session, permits idempotent retries, rechecks data publication rights at commit time, creates an existing Journal record with locked first-decision evidence/snapshot and then finishes replay. It rejects unfinished or unverified sessions and duplicate finalization.
3. No actual fill, confirmed trade, outcome, process grade, P&L, R-multiple or historical Lab pass is inferred. A replay ENTER remains a **planned**, not executed, journal decision. Nonentry observations are recorded as no-trade decisions, with existing review reminders if the earlier Journal triggers apply.
4. The existing replay workbench provides a link to the resulting authorized `journal-entry.html?id=<id>`. No raw Journal ID is trusted from a browser request to finalize.
5. `tests/test_v014094_replay_journal_link.mjs` exercises auth, denied entitlements, bad IDs, locked/rights failures (mock API contract), idempotent retry, null scoring and code/security invariants.

## Important limitations

- This migration has **NOT been applied** to Supabase; the atomic RPC and new button path will not function on production until dependencies, DBA review and controlled installation succeed. The existing replay finish previously worked without the Journal; this source change introduces a **deployment dependency**. Deploy v0.14.0.94 only WITH the new, verified RPC or hold this release.
- The SQL must be reviewed against the **actual installed** Journal schema, existing triggers and grants. Run `supabase/admin/v0.14.0.94_REPLAY_JOURNAL_PREFLIGHT_READ_ONLY.sql` first; it is read-only. Never rerun old migrations blindly or create another Supabase project.
- The transaction uses service-role access only. Never grant its RPC to public/anon/authenticated or call it directly from browser code.
- The first bar's date is stored as a **UTC calendar date**, not asserted to be NYSE Eastern trade date. Owner must verify dataset ticker/date semantics and historical rights before production.
- A modelled OHLCV limit touch is only a possible, not proven fill. No simulator trades, paper P&L or grading are automatically created.
- `historical_lab` is a Journal classification for historical practice, not a claim that any one of the 419 independently graded Lab products is complete.
- Existing Owner Roadmap statuses and saved approvals, memberships, the four paid tools, eight Stripe SKUs, book v1.14 and historical Lab IDs are unchanged. No live product, payment or access setting is activated.

## Release acceptance requirements

1. Review v0.14.0.92 installed dependency tables and journal constraints through the new read-only preflight.
2. Independently review/install additive SQL with rollback plan and compare installed function definition.
3. Validate two authenticated members cannot finalize each other's sessions, sessions with revoked licensing fail, finished-session retries do not insert duplicate journals, and no future candles/actual fills/grading leak.
4. Run source CI, Cloudflare build and deployment SHA confirmation, then browser smoke-test the actual Journey: dataset -> lock -> advance -> finish -> linked Journal -> immutable plan -> reflection.
5. Confirm new Journal activity appears in the existing Journal and private Tutor practice **without** claiming earned grades or verified historical fills.

**Rollback:** Do not deploy frontend/API release unless SQL dependency is installed. If production rollback is necessary, revert the source to v0.14.0.93; do not drop or delete linked records without legal/data-retention and owner approval.

**Revision history:** v0.14.0.94 (2026-10-19) — First source implementation; private transaction pending Owner acceptance.
