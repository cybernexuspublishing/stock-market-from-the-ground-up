# SMFGU — Member Growth Measurement & Verification V1

## Document control

| Field | Value |
|---|---|
| Document ID | SMFGU-OPS-GROWTH-20261029-002 |
| File | `docs/releases/2026-10-29_MEMBER_GROWTH_MEASUREMENT_V1.md` |
| Version | 1.0 |
| As-of | October 29, 2026 America/Chicago / October 30 UTC |
| Publisher | Crown & Lantern Press |
| Repository | `cybernexuspublishing/stock-market-from-the-ground-up` |
| Branch | `main` |
| System | Cloudflare Pages + Supabase + Windsor.ai GA4/Search Console |
| Release scope | Aggregated Owner-only registration, verification and Free5 engagement reporting; existing daily monitoring |
| Exclusions | Owner, staff-role and known James_Test QA identities; unclassified profile accounts are disclosed separately |
| Financial authorization | Read-only; no Stripe, subscriptions, payments or new paid service |
| Privacy | No emails, tokens, names, identities, or private study-reflection text returned in report |

## Initial genuine-provider baseline

**GA4 connector:** Windsor.ai, property `561523001`, requested interval 2026-10-26 through 2026-10-29. One daily row for **2026-10-29** returned **7 sessions, 5 users and 15 page views**. These figures come from consenting/available GA4 observations and are not proof of distinct human prospects; internal and QA traffic may contribute. The GA4 event-name report returned an empty collection. Empty event rows mean *no reportable rows were returned*, not independently proven zero learning interest.

**Google Search Console:** Windsor.ai, property `https://stock-market-from-the-ground-up-d1r.pages.dev/`, requested interval 2026-10-26 through 2026-10-29. The Search Analytics report returned no rows. No ranking improvement, indexing success, or zero impressions are inferred.

**Supabase authoritative account records:** Primary project `oxihglyfgzywsupnyicb`. Direct read-only SQL confirmed that in the interval **2026-10-01 to 2026-10-29** there were **two registered email-verified accounts, both staff/QA identities**. Since **2026-10-26**, there were **no new registrations of any kind** at the read. The existing Free5 acceptance QA recorded one Day 1 start and one saved Day 1 reflection, attributable to the excluded staff/QA population, not customer conversion. No customer-acquisition successes are manufactured from these QA data.

**Eligible non-QA account-creation cohort for October 1–29:** zero registrations; zero email-verified registrations; zero cohort Free5 enrollments, Day 1 starts, Day 1 saved reflections, and Day 5 saved reflections. Zero comes from an authoritative, complete database read, unlike an empty GA4 connector response. No strict sessions-to-registrations conversion percentage is presented because anonymous GA4 visitors and Supabase account identities are not linked.

## New Owner-only measurement system

- `functions/api/owner-growth-funnel.js` — GET-only Cloudflare Pages endpoint. Requires an actually verified Owner Supabase token, current active OWNER role, eligible member profile, and no restricted account status. Rejects anonymous, forged-token, non-Owner and SHOWCASE sessions. Uses server-only service credentials solely after successful authorization.
- `owner-growth-funnel.html`, `assets/js/owner-growth-funnel-v1.js`, `assets/css/owner-growth-funnel-v1.css` — responsive Owner report accessible through the Admin Control Center (Owner permission check). Provides selectable **7/30/90-day UTC registration cohorts**, all-time eligible member funnel, distinct counts, daily registration-cohort table, exclusion status, safe aggregate-copy control, and a clear separation of provider-sourced visitor analytics.
- Counts include genuine auth account creation, `auth.users.email_confirmed_at`, `free5` enrollment, audited Day 1 starts or actual `started_at`, Day 1 and Day 5 `reflection_saved` progress. These are distinct verified members, not button clicks, tests, official grades or purchases.
- Staff, including James_Test under its current Admin role, is excluded; accounts without an eligible member profile are disclosed but not classified as acquired members. Large or failed source pagination aborts rather than producing misleading partial counts.
- The report is noindex, authenticated, private/no-store, read-only and aggregates only. Anonymous visitors cannot read the live account funnel.
- **Limitation:** The Owner browser page is not a built-in GA4 API client. GA4/Search Console metrics remain in their authorized connected provider reports and daily monitor to avoid creating a new paid integration or exposing Google access tokens on the website.

## Live monitoring

Reused the existing scheduled automation **SMFGU Search & GA4 Watch**, ID `6ae3f0bd125081918714a783d3d57229`. Its state was discovered to be disabled and was **explicitly re-enabled** during this change, retaining **08:00 America/Chicago daily**. The prompt now evaluates GA4, Search Console and authoritative Supabase non-QA cohorts; it suppresses unchanged/no-data reports and distinguishes zero from unavailable. No second or duplicate daily watch was created. Scheduling/enabling does not establish that a run has delivered a notification yet.

## Testing and acceptance

- Deterministic fixture test `tests/test_owner_growth_funnel_v1.mjs` asserts authorization, distinct member count, email verification, staff and QA exclusion, genuine Free5 audit and progress stages, no identity leakage, and read-only access.
- The source test is required by production `scripts/build-pages.sh`. Cloudflare successfully built the source test in an accepted production deployment including this code.
- Production smoke `tests/test_owner_growth_production_smoke_v1.mjs` and GitHub Actions `.github/workflows/owner-growth-funnel-v1.yml` test that the real site serves the report with noindex and refuses unsigned and forged access. A genuine Owner sign-in is intentionally not embedded in CI; a signed-in Owner can view the aggregate report without GitHub credentials.
- A full end-to-end Owner-browser success remains a separate manual acceptance item until the Owner visits the report; anonymous denial and fixture tests are not a substitute.
- **No marketing mail, follower tracking, visitor ID joining, paid checkout, role update or account creation was performed.**

## Follow-up decision rules

Repeat these measurements weekly and after promotional posts. Report new non-QA email confirmations and real Day 1 starts separately. Track evidence of day-1 saves, day-5 progress and later paid fulfillment only when independently confirmed. With a zero genuine signup baseline and extremely small GA4 sample, avoid claiming conversion improvements or estimating statistical uplift. Keep content improvements and outreach compliant with community guidelines and permission-based communication.

## Revision history

| Version | Date | Description |
|---|---|---|
| 1.0 | 2026-10-29 CT | Established provider-backed acquisition baseline, Owner-only verified funnel and re-enabled daily growth watch |


## Final production privacy and deployment acceptance — October 30, 2026 UTC

- Cloudflare deployment containing the strengthened shared route policy: `5e86f7cd9eaac34705807b50d721a170b2bea2c3` — **success**. Subsequent `main` deployments have also succeeded. Source fixtures passed during the Pages build.
- GitHub Actions: [Owner Growth Funnel V1 production and security run 41006627810](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/41006627810) — **success**.
- Exact passing output: `PASS owner growth funnel V1: OWNER auth, QA exclusion, verified email, real Free5 starts, read-only and no identity leak`.
- Exact passing output: `PASS Owner Free5 isolation QA: server-verified Owner role, private read checks, noindex and zero-credential UI`.
- Exact passing output: `PASS production Owner growth privacy: owner page noindex, anonymous 401, forged token 403, no data leak`.
- During acceptance, a previous smoke run discovered that the shared middleware classified newly added Owner HTML as public despite static `data-route-access="staff"`. This was corrected by registering both `owner-growth-funnel` and `owner-free5-isolation-qa` as STAFF routes in `assets/js/route-policy.js`, which is consumed by Pages middleware and the service worker. The final production test verifies the effective access marker, not merely source HTML.
- Reporting backend authentication, aggregation, privacy limits and real anonymous/rejected-token boundaries are **accepted**. A real signed-in Owner run of the new dashboard remains available for further user-level assurance and must not be represented as executed merely because CI passed.
- The enabled existing daily watch is scheduled for 08:00 America/Chicago; an enabled scheduled task is not proof that a future report has already been delivered.

**Release classification:** Production deployed; owner-only member-funnel source and privacy acceptance **PASSED**; operational notification receipt and genuinely authenticated Owner-browser dashboard rendering have not yet been observed.

### Revision history

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-30 UTC | Recorded positive production deny tests, hardened shared STAFF route policy for both Owner pages, confirmed Cloudflare and CI acceptance |
