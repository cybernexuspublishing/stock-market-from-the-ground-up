# Free Foundations transcript-informed beginner teaching update — 2026-10-29

| Document control | Value |
|---|---|
| Project | The Stock Market: From the Ground Up |
| Document ID | SMFGU-FREE-STT-20261029-001 |
| Filename | docs/releases/2026-10-29_STT_TRANSCRIPT_FREE_FOUNDATIONS_EXTENSION.md |
| Type | Markdown release note |
| Version | 1.0 |
| Status | Source committed; CI and matching production verification separately required |
| Date | October 29, 2026 |
| Google Drive location | Unassigned; GitHub main is controlling source repository |
| Purpose | Improve source-grounded beginner instruction without changing Free program entitlements or curriculum count |
| Dependencies | Free Foundations knowledge asset, existing 12-topic contract and CI, Cloudflare Pages build |

## Change summary

Five existing, original Free Foundations teaching topics are improved without changing the approved five-lesson Free Academy structure, twelve reference topics, five original program demos, nine-stage learning path, account persistence, or grading controls.

- **Orders:** Differentiates trailing-stop adjustment from a guaranteed sell price.
- **Accounts:** Adds the current June 2026 FINRA intraday-margin transition and broker-specific implementation warning.
- **Sessions and liquidity:** Distinguishes reported trading volume from executable bid depth at the planned exit time.
- **Candlestick charts:** Adds small-body doji versus full trading range and the impossibility of inferring intrabar high/low sequence from OHLC.
- **Practice journal:** Separates precommitted plan fields from later trading observations and treats a first completed red five-minute candle as a review cue, not a sure reversal.

Sources: owner-supplied StocksToTrade transcripts dated October 29, 2026, original educational adaptation at `docs/research/STT_VIDEO_TRANSCRIPT_RESEARCH_INTAKE_20261029.md`; SEC Investor.gov stop and order types bulletin (updated August 2026), and FINRA 2026 intraday-margin guidance with broker transition through October 2027. These are teaching concepts, not copied transcripts or licensed market data.

## Acceptance and rollback

The existing `tests/test_free_foundations_knowledge_v1.mjs` now asserts all five corrections. It continues to require twelve source-linked original topics, private-data isolation, no paid actions, and no grading. No billing provider, database schema, member information, entitlement, Labs, Boot Camp duration, publisher ebook or real account is modified. Exact-commit Free Foundations CI and matching production deployment are required before marking live acceptance. Revert this source commit if any required regression fails.

## Revision history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-29 | Five Free Fundamentals original research-informed instructional upgrades |

**Footer:** SMFGU-FREE-STT-20261029-001 · Crown & Lantern Press · Educational only.
