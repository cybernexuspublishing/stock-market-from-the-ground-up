# SMFGU — Free Member Growth & Acquisition V1
## Document control

| Attribute | Value |
|---|---|
| Document ID | SMFGU-WEB-GROWTH-20261029-001 |
| Filename | 2026-10-29_FREE_MEMBER_GROWTH_AND_ACQUISITION_V1.md |
| File type | Markdown (.md) |
| Version | 1.0 |
| Date | 2026-10-29 America/Chicago; production acceptance 2026-10-30 UTC |
| Publisher | Crown & Lantern Press |
| Project | The Stock Market: From the Ground Up |
| Status | **SOURCE, CLOUDFLARE PRODUCTION AND PUBLIC BROWSER ACCEPTED** |
| Repository | cybernexuspublishing/stock-market-from-the-ground-up |
| Branch | main (no feature branch) |
| Public origin | https://stock-market-from-the-ground-up-d1r.pages.dev |
| QA GitHub Actions run | 41005109214 |
| Browser QA source SHA | 1ca10d114a2cb1aaf3d57fcb7e2e4babea68056a |
| Project dependencies | Existing Free Foundations `free5`, original Day 1–5 course, opted-in GA4, site registration flow, Cloudflare Pages and Github Actions |
| Retained restrictions | No live charges, account grants, paid tools, new email lists, SMTP or unsolicited messaging |

## Owner-directed scope completed

**Primary acquisition path:** Public Home first asks a beginner to Create a Free Account or try a no-login exercise, then links to the five authentic Free Foundations lessons. Homepage secondary paths continue to expose the Labs and existing commerce without misrepresenting paid access.

**Public interactive practice:** `candle-practice.html` + `assets/js/public-candle-practice-v1.js` provide three original, fictional candlestick examples with five OHLCV bars each, readable table alternatives, an SVG visual representation, selectable observation answers, corrective reasoning feedback, a local completion count and restart. No browser storage, trading/market feed, grading, account requests or orders. Public test treats this as **educational, not historical data**.

**Free Foundations entry:** `free-foundations-challenge.html` uses the five actual topics from `functions/_lib/free-foundations-v1.js`: stock ownership and quotes; five-minute candlesticks; claims and source evidence; research watchlists; risk and NO TRADE. Protected `program=free5&day=1..5` links keep their existing sign-in, account entitlement, private reflection and grading boundaries. A learner may study at their own pace; no invented time-based pass or official competency.

**Onboarding/retention:** Existing Free member Dashboard launchpad and progress-resumption logic are preserved, with additional links to the free challenge and anonymous candle questions. Sign-up confirmation now explicitly explains email verification and links to a protected Day 1 sign-in destination. No new form submission, fake completion, automatic emails, or account attributes were added.

**Search discovery:** Two new evergreen original guides `market-vs-limit-orders.html` and `support-resistance-basics.html` join the two other new public learning pages. `scripts/build-public-seo.mjs` allowlists **19 canonical public pages**, each with unique metadata and sitemap entry when present; new original evergreen guides receive accurate Article JSON-LD. All other private HTML remains noindex. Indexability is not the same as confirmed Google indexing.

**Voluntary referral/sharing:** `assets/js/public-share-v1.js` uses native browser share or copy to share source-controlled public educational URLs only. There is no personalized code, friend contact capture, cookie, storage, mass message, signup attribution to another person, or third-party referral service. Any sharing is initiated by the visitor; no message has been transmitted by the website.

**Marketing kit:** `docs/marketing/2026-10-29_FREE_MEMBER_GROWTH_V1_SOCIAL_KIT.md` contains 12 original educational social posts, three original short video narration scripts and manual community-publishing rules. They are prepared for review/use but are **not posted, emailed or scheduled**.

**Analytics:** Existing opt-in GA4 now recognizes two additional public interest destinations, `candle_practice` and `free5_overview`, as fixed-value `smfgu_learning_interest` events. No user-generated query strings, answers, usernames, emails or member progress are sent. No fabricated purchase or verified-email-conversion events are introduced.

## Acceptance evidence

| Contract | Evidence and result |
|---|---|
| Cloudflare source and build | Production deploy SHA `1ca10d114a2cb1aaf3d57fcb7e2e4babea68056a` **success**; compiled Pages and uploaded assets |
| SEO and private noindex | `PASS public SEO: 19 unique titles/descriptions, canonicals, social tags, consent isolation, sitemap, protected noindex, rebuild` |
| Free growth source contract | `PASS free-member growth V1: original interactive learning, actual Free5 lessons, no-cost entry, consent and voluntary sharing` |
| Existing source curriculum | `PASS public acquisition V1`: original free guides, links and protected Free Academy deep-link checks |
| GA4 privacy contract | `PASS GA4: opt-in public intents, confirmed signup handoff, 15-minute expiry, no PII, no purchase fabrication` |
| Real Chromium anonymous browser | GitHub run **41005109214**, 390px and 1440px: **16 / 16** public page/entry checks passed, zero failed |
| Interactive candlestick questions | Same run, actual Chromium: incorrect-answer feedback, correct-answer explanation, 3-question summary and restart **PASS** |
| Account flow safety | Signup form and age check inspected without creating an account; no live membership change or sign-in acceptance inferred from this growth run |
| Member progress continuity | Existing Free5 authenticated day-1/save/reload and two-account privacy acceptance was separately completed in release `2026-10-29_PUBLIC_ACQUISITION_AND_CONVERSION_V1.md` |

**Browser run:** https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41005109214

## Distinguish acquisition from results

This release makes the website easier to discover and begin using. It is **not evidence** that search engines have indexed new pages, that conversion rate or revenue increased, that any new member registered, or that social posts generated traffic. Those outcomes require monitoring under existing opt-in consent and independently verified provider records. The existing daily GA4/Search Console watch remains in place.

Suggested success measures: public guide visits; opt-in free-lesson navigation interest; successful account creation; independently verified email status where available; actual Free5 Day 1 starts and saved reflections; Day 5 progress; and paid conversion only after independently confirmed fulfillment. Do not equate a button click with verification, a member with a payer, or a fictional practice answer with official competency. Keep QA identities out of commercial conversion claims.

## Future optional improvements, not part of V1 acceptance

- Validate live GA4 event receipt and Search Console indexing/sitemap coverage.
- Independently review marketing posts against each platform's current community rules prior to manual publishing.
- Compare cohort registration and Day 1 retention after sufficient privacy-respecting observations.
- Consider an explicit opt-in email educational newsletter only after consent capture, unsubscribe handling, suppression, and delivery provider acceptance. **No mailing list or automatic messages are introduced in V1.**
- Re-evaluate registration friction only with evidence and without weakening the current 18+ and email-verification requirements.

## Revision history

| Version | Date | Change | Status |
|---|---|---|---|
| 1.0 | 2026-10-29 | One coordinated free growth release; public interactive lesson; Free5 mapped challenge; four SEO pages; registered entry path; voluntary sharing; manual social kit; opt-in analytics, build and live browser evidence | **Accepted for the tested public scope** |
