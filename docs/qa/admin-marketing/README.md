# Commerce / Marketing & Social Media consolidation

Project: The Stock Market: From the Ground Up
Branch: main
Status: Navigation and advertising-workspace consolidation implemented; authenticated live visual acceptance unverified. Social publishing is NOT IMPLEMENTED.
Purpose: Reduce Admin clutter and centralize the existing advertising screens under Commerce without rebuilding the Ads system.

## Architecture and implementation

- Six compact live Admin areas: Overview, People, Learning, Commerce, Community, Platform. Existing authorized controls remain in the searchable disclosure. Legacy navigation group names are normalized for presentation; no registry database settings are rewritten.
- Commerce links to Marketing & Social Media using the existing `admin-advertising.html` route. The unified module registry places its Owner-only link within Commerce; no seventh area.
- Existing Ads sections are moved into focused subviews after the existing Owner API check succeeds. Original forms, IDs, handlers, database/API paths, quote inquiries, campaigns, creatives, approvals, metrics and Sandbox functions remain connected.
- Existing data refresh emits aggregate record counts to the presentation controller. These are recorded campaign/inquiry/advertiser/creative counts, not fabricated performance indicators.
- Payment reconciliation and audit links use existing Commerce/Admin routes. No payment mode, campaign approval, ad-delivery flag, price or provider configuration was changed by this release. Existing advertising writes retain their current backend authorization and audit path.
- The intended X handle is @SMFGUAcademy. It is NOT marked connected. No credentials, new subscriptions, external posting, community joining or paid advertising were configured.

## Outstanding social module scope

NOT IMPLEMENTED: server-persisted social drafts, publishing calendar, external account connection, automated publishing, X community management, external referral attribution, social approvals and publishing audit records. These require a verified external integration and an Owner-only persistence/approval/audit contract. Their absence is stated in the workspace; there are no simulated success states or pretend publishing buttons.

## Executed validation

- JS syntax checks for changed controllers; Pages build; whitespace validation.
- Unified six-area Admin registry and permission tests, extended for the Owner-only marketing link.
- New consolidation test: original advertising IDs retained, sections moved without cloning, Owner authorization gate retained, six areas, no new network mutation/storage path, and honest connection status.
- Existing advertising security tests: six passed, including anonymous access rejection, inquiry verification, Owner release gating and absence of unsanctioned payment switches.

Not executed: existing Python Playwright Admin navigation/registry tests because Playwright is not installed in this runtime. No authenticated browser session was available for visual review. No live production mutation or payment test performed.

## Rollback

Revert this source release as a unit. No database or provider rollback required.
