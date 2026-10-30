# SMFGU — Free Member Growth & Acquisition V2: Promotion, Conversion & Retention

## Document control

| Field | Value |
|---|---|
| Document ID | SMFGU-GROWTH-V2-20261030-001 |
| Owner | Crown & Lantern Press |
| Site | The Stock Market: From the Ground Up |
| Date | 2026-10-30 UTC |
| Branch | `main`, without feature branches |
| Scope | Free discovery, voluntary education sharing, consent-led return reminders, SEO discovery notifications and evidence-based conversion |
| Retained V1 | Original 19-page public SEO set; five Free Foundations lessons; real chart practice; protected onboarding; Owner Growth Funnel and daily GA4/Search Console/Supabase monitor |
| Budget | No paid advertising or new paid platform |
| Commercial authorization | No payment, purchase, credit consumption, membership changes or checkout modifications |
| Messaging consent | No email sends, automatic outreach, contact imports, platform posting, or cross-site person tracking |

## V2 implementation

### Return to learning

`dashboard.html` now has an optional calendar-control section inside the existing progress-aware Free learner launchpad. A member can select **1, 3 or 7 days**, then click **Download optional calendar reminder**. The script `assets/js/free-return-calendar-v2.js` generates one local `.ics` event for 6:00 p.m. in the visitor's own browser time zone, lasting 25 minutes. It links back to the sign-in-protected Dashboard, not to a private member-specific record. No contact address, saved reflection, skill grade or personal identifier enters the calendar file. The visitor decides whether to import it. There is **no site-initiated reminder**, notification, email, local browser persistence or subscription; those would require separately reviewed consent and infrastructure.

### Educational content syndication

`scripts/build-public-seo.mjs` now creates a six-item original Free Learning RSS 2.0 feed, `/feed.xml`, from the public allowlist and existing educational metadata. It lists the five-day overview, fictional practice, market/limit orders, support/resistance and two established beginner lessons. No member, Admin, checkout or protected content belongs to the feed. Article publication dates are not invented. Home, Learning and the Free Foundations challenge include RSS autodiscovery; the challenge also offers a link that the visitor may add to a feed reader voluntarily.

### Search-engine discovery

A public IndexNow ownership file is included in the Cloudflare Pages build and is verified on the actual published host before any request. `scripts/submit-indexnow-v2.mjs` checks the production verification file, actual sitemap, exact four public canonical pages, HTTPS hostname and indexability. Only an explicit `--submit` option may make a single HTTP POST to `https://api.indexnow.org/indexnow` for the four original V1 learning pages.

[GitHub Actions IndexNow run 41010448874](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41010448874) **passed** production key/sitemap/page checks and received **HTTP 202 — received, pending key verification** from IndexNow on 2026-10-30. This is not evidence of crawling, indexing, ranking, or Google submission. Google continues to discover via the site's existing sitemap and the verified Search Console property; Search Console had not yet reported performance rows as of the baseline. There was **no submission to Google via IndexNow**.

### Owner manual outreach

`owner-growth-publishing.html` is a noindex, middleware-classified **staff** page, linked to the Owner Admin Control Center. It presents the original 12 V1 education posts and 3 short-video scripts from `docs/marketing/2026-10-29_FREE_MEMBER_GROWTH_V1_SOCIAL_KIT.md`, each with a manual copy control. `assets/js/growth-manual-publishing-v2.js` cannot send posts, send email, upload contacts, operate social platforms or automatically track recipients. Material still requires human editorial/platform-rule review before publication. No social content has been posted or scheduled as part of V2.

### Measurement and restrictions

Continue using the existing Owner Growth Funnel and scheduled daily GA4, Search Console and Supabase watch, rather than creating duplicate analytics services. A registration is not a verified member without email confirmation; an ungraded saved reflection is not mastery; and a staff QA session is not customer acquisition.

Initial verified acquisition baseline remains **0 eligible non-QA new accounts and 0 confirmed non-QA Day 1 starts**. GA4's initial October 29 report showed 7 sessions, 5 users and 15 page views, which may include internal activity. Neither genuine growth, search indexing, social engagement nor future paid conversions can be inferred from deployed code alone.

## Acceptance evidence

| Contract | Status |
|---|---|
| V2 calendar, RSS allowlist and IndexNow source | Covered by `tests/test_growth_v2.mjs` and Pages build gate |
| IndexNow production key/sitemap/public URL verification | **PASS**, run `41010448874` |
| IndexNow request receipt | **HTTP 202 — pending key verification** (not indexed) |
| V1 mobile and desktop public learning pages | Previously accepted via GitHub run `41005109214`, 16/16 |
| Owner-only manual publishing desk | Staff route and source test; no actual external posts |
| V2 real production feed/retention/publishing smoke | `tests/test_growth_v2_live_smoke.mjs`; final run conclusion must be checked before marking accepted |
| Live customer registrations and conversion uplift | **Not demonstrated**; no non-QA registrations in observed baseline |
| Future marketing email and social automation | **Not implemented**; requires explicit consent, allowed provider and separate acceptance |

**Remaining real-world work:** search engines independently crawl and index pages; Owner manually publishes relevant, approved educational material or authorizes an external account integration; consented visitors register, verify email and begin Free Foundations; and resulting acquisition/retention metrics accumulate. None can be honestly marked complete from automated deployment or index-submission receipt.

## Revision history

| Version | Date | Change |
|---|---|---|
| 2.0 | 2026-10-30 | Added voluntary calendar reminders, original RSS content discovery, one validated IndexNow receipt and Owner publishing desk; retained zero-cost/consent rules |
