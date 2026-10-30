# Crownlight Watchlist — Free/Advanced continuity and fictional ECharts teaching V1
**Date:** 2026-10-30  
**Project:** THE STOCK MARKET: FROM THE GROUND UP  
**Change type:** Main-branch code release, noncommercial  
**Owner decision:** Complete existing Watchlist without creating another product/backend  
**Status:** Source committed; production and authenticated acceptance independently verified only when matching deployed commit and real-member checks pass.

## What changed
- Each saved Free Watchlist symbol now offers an authenticated continuation link into the existing premium Watchlist Workbench. The premium editor only reads that same signed-in member's Free record after current premium access is checked; the URL contains a symbol, never a note or a bearer token. No automatic premium record, grade, Journal entry, payment, or Sparks use is created.
- Existing premium candidates are opened for editing instead of silently duplicating the same ticker. A member must manually review and save copied notes. Free last-edit time is expressly not treated as an original exchange/source observation time.
- Basic premium Watchlist edits now retain the existing extended payload, including folders, tags, lifecycle history, annotations, monitoring rules, Talia reflections and other previously saved research. Existing optimistic concurrency checks remain in force.
- Added a separate ECharts educational practice panel using 42 wholly fictional candles, volume, EMA 9/20 and a session typical-price VWAP proxy. It is not attached to the currently saved symbol, a licensed provider, true tick VWAP, or historical data. No data is downloaded for chart bars.
- Updated the existing Watchlist V3 GitHub Actions workflow to execute the new regression tests, preserving the prior test jobs.

## Acceptance boundaries
- Free Watchlist: existing 20-symbol server-enforced cap unchanged. Free Journal weekly cap and Simulator saves unchanged.
- Premium rights: existing `advancedToolContext` enforcement and current `WATCHLIST_WORKBENCH` entitlement unchanged; no bypass from Free.
- No database migration, Stripe, LIVE charge, Spark balance, public provider feed, or member role changes.
- Full source and CI checks do not substitute for signed-in Free/paid/excluded-role production acceptance. Historical data rights and automated external catalyst collection remain separate gated features; not silently claimed complete.
