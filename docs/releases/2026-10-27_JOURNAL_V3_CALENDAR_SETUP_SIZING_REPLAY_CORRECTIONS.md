# Trading Journal V3 — Calendar, Setup, Share Sizing and Server Replay Corrections

**Company:** Cyber Nexus · **Imprint:** Crown & Lantern Press  
**Project:** The Stock Market: From the Ground Up  
**Document ID:** SMFGU-JOURNAL-V3-FIX-001  
**Filename / file type:** `docs/releases/2026-10-27_JOURNAL_V3_CALENDAR_SETUP_SIZING_REPLAY_CORRECTIONS.md` / Markdown (.md)  
**Version:** 3.0 corrective patch · **Owner instruction:** October 27, 2026  
**Authoritative location:** GitHub `main`, no Google Drive ID assigned.  
**Status:** Source corrections committed; publication and authenticated browser verification recorded separately.  
**Scope:** Existing Journal list, entry, risk worksheet and original first-party Market Simulator; no new account, database, payment product or chart data.

## Changes

1. **U.S. equities Trading Calendar** — `assets/js/journal-market-calendar-v3.js` implements an NYSE-market-session date policy. Weekends and scheduled exchange closures are visibly disabled and cannot be selected. NYSE's official **2026, 2027 and 2028** holiday dates override computed generic dates. Other years use exchange-rule holiday calculations with an explicit operational limitation: non-scheduled exchange closures must be added/verified; early-close days remain selectable. The calendar is for U.S. equities; the Journal list continues to show records made on closed dates, including observations, crypto/futures notes, or historical corrections, rather than erasing them. Market-calendar source: https://www.nyse.com/trade/hours-calendars . `assets/js/journal-visual-v3.js` consumes closure reasons and applies true disabled buttons with an accessible announcement; `journal.html` loads the policy before the calendar UI; CSS differentiates closed days.

2. **Setup / Exercise** — Both new-record and edit-record forms now use a native `select` populated from existing `data/journal-taxonomy.json`. The **Other — describe my setup** option reveals a required custom text input. Previously stored custom strings are preserved by adding an exact-value, previously-recorded option rather than silently replacing the value, and locked plans cannot be changed. The previous incompatible datalist was removed. The new-record setup is required; the existing entry-plan lock validation still governs completion.

3. **Position size action** — `Use suggested whole-share quantity` remains clickable while the plan is editable; it either applies a positive whole-share suggestion calculated from the member's own risk budget or provides a contextual message explaining missing direction, valid entry/stop or budget. When locked, the button remains disabled to honor immutable pre-trade decisions. Never invent a dollar budget, perform a trade or persist a position change without the member's normal Save Draft/Lock action.

4. **Simulator default replay** — Production currently has **419 published, original fictional** OHLCV datasets and **10,056 original stored bars**, passing the existing `fictionalReplayPermitted` metadata eligibility checks, but no published independent verified historical market datasets. The previous default server panel misleadingly opened historical-only replay and had nothing to select. `assets/js/verified-replay-v01492.js` now defaults to the genuine `fictional` scope **only when embedded in the Market Simulator**; the standalone verified historical workbench and explicit `?scope=historical` remain on their original stricter rights/entitlement path. Its first published fictional scenario is preselected, without automatically creating a member session. `simulator.html` and `assets/js/simulator-mode-v014112.js` now correctly describe and navigate to that default mode. The actual server still checks signed-in membership, publication metadata, right to display, per-session cursor, and chronological reveals. A real historical chart is NOT fabricated or enabled.

## Verification

- **Deterministic test:** `tests/test_journal_calendar_setup_replay_v3.mjs` checks NYSE 2026–2028 closures, observed holidays, 2028 New Year's Friday exception, early closes that must remain clickable, source imports, setup form contracts and legacy-value preservation, sizing feedback/locked behavior, and embedded fictional versus standalone historical scoping.
- **Build gates:** `scripts/build-pages.sh` and existing `.github/workflows/market-analysis-v014146.yml` run that test along with JavaScript syntax validation.
- **Read-only Supabase preflight:** production `stock-market-from-the-ground-up` project contains 419 published synthetic OHLCV datasets meeting original-fictional policy checks and 10,056 stored fictional bars over 419 dataset codes. This is an ownership/source categorization and schema observation, **not** a real signed-in server API acceptance.
- **Required authenticated browser acceptance:** actual server catalog loads on both default Simulator and standalone fictional page, Start Replay/Lock/Advance/Finish plus Journal link where eligible; Free and restricted account isolation; setup picker old-record preservation, no mistaken history value replacement; share button feedback and locked-plan behavior; holiday calendar keyboard/mouse, old-year navigation, and mobile screens. Real-page evidence cannot be inferred from tests alone.

## Limitations / rollback

- Special unscheduled exchange closures may not be reflected outside the official published date lists. Do not claim a comprehensive future closure guarantee. The exchange calendar controls navigation only, not journal-data validation, broker-session assertions, historical data or execution.
- Default server practice uses **fictional** educational prices; no genuine historical data, real fills, broker activity, certified skill grade, or live payment is invented.
- Revert only changed HTML/JS/CSS references while retaining member records, original locked snapshots, evidence files and audits. Server permissions and schema remain unchanged.
- No new paid vendor, Stripe charge, subscription or LIVE payment authorization.

**Document footer:** SMFGU-JOURNAL-V3-FIX-001 · 3.0 patch · October 27, 2026 · GitHub main.
