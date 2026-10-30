# SMFGU — GA4, Search Console and Conversion Measurement Release Record

## Document control

| Field | Value |
|---|---|
| Project | The Stock Market: From the Ground Up — Public Website |
| Document title | GA4, Search Console and Conversion Measurement Release Record |
| Document ID | SMFGU-WEB-ANALYTICS-20261029-001 |
| Version | 1.0 |
| Prepared | 2026-10-29 (America/Chicago) |
| File type | Markdown (.md) |
| Filename | `2026-10-29_GA4_SEARCH_AND_CONVERSION_TRACKING_v1.md` |
| Repository | `cybernexuspublishing/stock-market-from-the-ground-up` |
| Repository path | `docs/releases/2026-10-29_GA4_SEARCH_AND_CONVERSION_TRACKING_v1.md` |
| Google Drive location and document ID | Not assigned; no duplicate Drive file requested |
| Authority | GitHub `main`; this record is informative, not policy approval |
| Status | Public intent instrumentation and source regression completed; production deployment and live Analytics receipt require confirmation; paid conversion integration pending |
| Purpose | Preserve actual analytics readiness, event definitions, privacy boundaries and acceptance requirements |

## Verified connections and initial baseline

- Connected Google Analytics 4 account: SMFGU property `561523001`, Measurement ID `G-6BDZQGVPD2`.
- Connected Search Console URL-prefix property: `https://stock-market-from-the-ground-up-d1r.pages.dev/`.
- Windsor.ai connections: Google Analytics 4 and Search Console.
- On 2026-10-29, Windsor.ai returned **no reporting rows** for the queried GA4 traffic, event and attribution ranges and for Search Console search performance and sitemap rows. This is **not evidence of zero traffic, no indexed pages, or a failed sitemap**; new properties and connector pipelines can be delayed.
- Search Console indexed-page coverage is **not exposed** by the currently available Windsor.ai reporting fields. No inferred indexed-page count is authorized.

## First-party marketing events

| GA4 event | Source and gate | Meaning | Production reporting status |
|---|---|---|---|
| `page_view` | Google tag on 10 indexable public pages, only after explicit visitor analytics consent | Consented public page visit | Live GA4 receipt not independently confirmed |
| `smfgu_registration_start` | Opted-in public-page link click to Create Account | Signup **interest**, not completion | Source-controlled and fixture-tested |
| `smfgu_catalog_interest` | Opted-in same-origin public link to Books, Store, Membership or Tools | Product discovery intent only | Source-controlled and fixture-tested |
| `smfgu_learning_interest` | Opted-in same-origin public link to Learning or Sample Labs | Learning discovery intent only | Source-controlled and fixture-tested |
| `sign_up` | Only after successful `/api/account?action=signup`; if public Analytics consent was already granted, an ephemeral anonymous marker can emit the GA4 event on the next eligible **public** page within 15 minutes | Server-accepted account creation, **not verified email** | Source-controlled and fixture-tested; intentionally incomplete when the user does not return to a public page |
| `purchase` | Not emitted | **Reserved** for provider-confirmed paid/fulfilled purchase with deduplication and consent | Not implemented; do not equate checkout clicks, redirects or test payments to sales |

The signup handoff stores no account identifiers, names, DOB, emails or passwords; it stores only the recent event timestamp in browser session storage and discards it after one eligible visit or expiry. This conversion count can undercount registrations and is **not a financial or membership system of record**. Subscription renewals are not included in this release.

All public funnel events have a source-controlled allowlist with only fixed `content_type`, `item_id`, or `method` parameters; URL queries, fragments, external links, cart/order/user IDs and form field values are never transmitted as these event parameters. No GA4 script is loaded on account registration, authenticated member pages, private lessons or checkout in this implementation. No new tracking consent is inferred from account creation.

## Purchase conversion design gate — still open

Do not send `purchase` events until these requirements are verified:

1. Trusted server-side payment signal: validated provider signature and successful payment status, appropriate production/test environment, successful fulfillment and unique transaction.
2. Prevent duplicate reporting on webhooks, retries, subscriptions, redirects and browser reloads. Identify a single canonical counted transaction and define handling for refunds and renewals separately.
3. Establish a lawful, auditable **opt-in analytics preference** for the payer and an approved mechanism to associate it with the provider event, without transmitting personally identifying information.
4. Implement an approved backend analytics transport and provider secret storage. Never embed a Measurement Protocol secret in browser code or GitHub.
5. Explicitly exclude zero-dollar diagnostics, synthetic QA/test accounts, unpaid/failed checkouts and fraudulent purchases from production revenue reporting.
6. Validate test-environment events and manually review a real permitted transaction only with Owner authorization. **No paid live charge is approved by this analytics project.**

## Privacy, security and legal review

- The existing opt-in GA4 module defaults analytics and advertising consent to denied until acceptance on the public website.
- Privacy/Cookie Policy vendor disclosures must be reviewed for actual Google Analytics and retention practices. Publishing revised legal terms is outside this change.
- Do not send personally identifiable information, raw journal contents, market-data credentials, private lesson answers, search inputs, user IDs, DOB, billing addresses, or payment tokens to GA4.
- Consent and data-protection obligations may differ by jurisdiction; qualified legal review is required for claims of compliance.
- No SEO guarantee, Google indexing guarantee or claim of paid-sales analytics acceptance is made.

## Monitoring

A separate scheduled **SMFGU Search & GA4 Watch** checks connected reporting for meaningful changes to GA4 traffic, funnel events, Search Console search performance and sitemap metadata. It does not assert the Google indexed-page count when unavailable. It does not submit indexing requests, alter Google settings or spend money. The Search Console Page Indexing screen remains the controlling source for indexing status until a dedicated approved reporting integration exists.

## Release acceptance

- [x] GA4 and Search Console connector read access verified.
- [x] Initial baseline queries performed; no rows returned.
- [x] Public consent boundary preserved; no Google code loaded on private/account pages.
- [x] Public funnel intent tracking and one-time opt-in signup handoff committed.
- [x] Deterministic Node fixture tests introduced into the Cloudflare Pages build.
- [ ] Confirm final production Cloudflare commit passed build and deploy.
- [ ] Observe an opt-in public page view in GA4 Realtime / DebugView (noncommercial).
- [ ] Observe a real server-accepted signup event on the next public visit with consent (authorized disposable QA identity only).
- [ ] Verify email-confirmation funnel separately (not counted by `sign_up` here).
- [ ] Complete a consent-aware, webhook-verified `purchase` integration.
- [ ] Validate Search Console indexed-page status from Google directly.

## Revision history

| Version | Date | Change | Status |
|---|---|---|---|
| 1.0 | 2026-10-29 | Baseline, public funnel intent and consented signup handoff, purchase safety gate, monitoring plan | Source implementation; acceptance pending |
