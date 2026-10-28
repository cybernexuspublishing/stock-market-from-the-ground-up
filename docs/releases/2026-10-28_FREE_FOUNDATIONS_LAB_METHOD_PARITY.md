# Free Foundations — Teaching Parity and Full-Lab Preview

**Company:** Cyber Nexus · **Imprint:** Crown & Lantern Press
**Project:** The Stock Market: From the Ground Up
**Document ID:** SMFGU-FREE-LAB-PARITY-001
**Filename / file type:** `docs/releases/2026-10-28_FREE_FOUNDATIONS_LAB_METHOD_PARITY.md` / Markdown (.md)
**Google Drive location:** Not assigned. Authoritative source is GitHub `main`.
**Version:** 1.0
**Prepared:** 2026-10-28
**Status:** Source implementation completed; exact-head CI, Cloudflare production synchronization and authenticated member acceptance are separate gates.
**Purpose:** Make the Free beginner journey teach using the same evidence-first, demonstration, practice and review pattern as book-companion Labs while transparently explaining eligible premium expansion.
**Dependencies:** Free Foundations `free5` Academy, Boot Camp shared API, Free studio v3, existing member entitlements, protected Lab content, fictional replay dataset provenance, skills/assessment release gates.

## Controlling decisions

- The Free Foundations program remains **five ungraded beginner lessons**. These are not converted into a paid product, seventh/eighth Boot Camp, or official assessment.
- Talia teaches first. Each lesson retains nine stages: Start, Learn, Experiment, Predict, Practice, Assess (ungraded), Review, Transfer and Results. These stages are reusable instructional organization, not a promise of certified skill.
- Each of five lessons gains a **topic-specific fictional replay-setup rehearsal** in Predict: source classification, fictional ticker, nonhistorical date notice, time zone, timeframe, decision pause and a written evidence-before-feedback checkpoint. This is a client-side lesson, not historical market playback.
- The Results stage includes an honest Free-vs-authorized-Lab feature comparison and links to Lab Registry and membership benefits. No checkout, book entitlement, graded key, private content or payment integration is added.
- Free research watchlist and Market Simulator entry points direct members to the corresponding Free Foundations teaching and explain that book-authorized and historical functionality is separate from Free. Basic Historical Replay Setup `F1-C02-L01` is an illustrative Lab teaching standard, **not independently verified historical data**.
- Maintain the earlier Founding 600 and Free Membership boundaries. No payment products, plan grants or account balances are modified.

## Source audit

- GitHub repository: `cybernexuspublishing/stock-market-from-the-ground-up`; branch `main` only.
- Cloudflare Yahoo account Pages project: `stock-market-from-the-ground-up`, production domain `stock-market-from-the-ground-up-d1r.pages.dev`.
- Supabase LIVE project: `stock-market-from-the-ground-up` (`oxihglyfgzywsupnyicb`). Includes server-owned Academy progress and member/book entitlement checks; no migration required for this presentation-only change.
- Historical provenance: 419 published **fictional** price datasets, but the Basic Historical Replay Setup historical registry's OHLCV/editorial verification is not accepted. Source and rights are not inferred from ticker/date labels.
- Attached source ZIPs: five `StocksToTrade-Browser-Research` archives; their metadata and relevant research exclusions were reviewed. Their private third-party observations are **not a public Free Foundations course library**, not authoritative licensed chart data, and must not be copied into customer pages.

## Updated source files

- `assets/js/free-foundations-lab-experience-v1.js` — reusable five-topic fictional setup, independent reasoning and comparative benefit teaching.
- `assets/css/free-foundations-lab-experience-v1.css` — responsive, accessible presentation.
- `assets/js/bootcamp-academy-v014168.js` — activate same new teaching bridge across the five Free lessons, preserving existing stages, grading boundaries and private progress.
- `bootcamp-academy.html` — register assets and explain the teaching sequence.
- `free-watchlist.html`, `simulator.html` — add concept-first direct learning paths with real limitations and premium exploration.
- `tests/test_free_foundations_lab_experience_v1.mjs`, `tests/test_free_membership_browser_v1.mjs`, `.github/workflows/free-foundations-watchlist-v1.yml` — deterministic source/browser regression gate.

## Release and acceptance

1. CI must finish for the exact final `main` commit; Free Foundations and responsive browser checks must pass.
2. Cloudflare canonical deployment must match accepted `main`.
3. Confirm at 390, 900, 1280 and 1440 pixel widths: all five lessons show the independent rehearsal and comparison; no review before an observation; no accidental grade/entitlement.
4. Authenticated production Free member journey remains separately required for user-specific persistence. Mocked QA is never represented as a production member login.
5. Historical datasets, licensed order-flow examples and protected assessments must remain unavailable until individually accepted. Optional future expansion to other courses is separate from Version 1.

**Revision history:** v1.0, 2026-10-28 — Cross-checked Cloudflare, GitHub, Supabase and project research archives; implemented reusable Free teaching parity without paywall or history invention.

**Footer:** SMFGU-FREE-LAB-PARITY-001 · v1.0 · GitHub `main` · Educational content only.
