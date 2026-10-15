# v0.14.0.22 — Backend Phase 3: CI repair and notification workflow verification

**Owner:** Cyber Nexus / The Stock Market: From the Ground Up  
**Document:** GU-WEB-BE-20261015-003 | Revision 1  
**Source baseline:** GitHub `main` commit `ff458899ac4ce7a8126e2dab67d237f0ff9197ed` (v0.14.0.21)  
**Delivery:** Direct-upload nested source ZIP; full replacement files, no patch/batch scripts.  
**Database changes in this release:** NONE. The SQL scripts included here are **READ ONLY**.  
**Production acceptance:** NOT COMPLETE. The Owner reported v0.14.0.21 deployment and installed functions.  
**Google Drive:** Not placed in Drive; no document ID assigned.

## Findings repaired in source

1. **Failing CI gate**: the v0.14.0.19 frontend test expected 0.14.0.19 in `config.js`, route-policy and service-worker cache. The v0.14.0.21 site correctly identifies itself as a later version, so the test falsely rejected it. Retained functional/security assertions, replaced obsolete version pins with version-consistency + minimum-baseline checks. Also updated the v0.14.0.18 feature test to remain runnable on newer builds. Added v0.14.0.22 checks and expanded CI workflow. Updated the prior isolated browser regression to treat a fully unverified save as unknown, not as a rollback. A new isolated Chromium test simulates a completed database write whose POST response is lost, confirming that follow and preference controls reconcile using a single GET and never resubmit automatically. Do **not** silence CI failures or bypass them.
2. **Retry ambiguity in Commons subscriptions**: after an interrupted POST response, UI previously said the change *was not made* even if Supabase committed it. Now the client attempts a caller-authorized `GET` to reconcile the actual state, with no blind second POST; if GET also fails, controls disable until refresh. This is important for idempotency across dropped connections.
3. **Retry ambiguity in member preferences**: the checkbox similarly reloads canonical state after a failed POST response rather than inventing rollback. It does not expose sensitive records or invoke service-role code.
4. **Version parity**: client source, shared route policy, and public service-worker cache share v0.14.0.22. Browser display labels derive from the public config instead of a stale literal string; displaying a version is not proof of live deployment commit.

## Supabase database contract already reported by Owner

- v0.14.0.20 preference table/RPCs/RLS/trigger were verified in 8/8 earlier read-only result columns.
- v0.14.0.21 migration reported success; screenshot showed `gu_commons_subscription_get_v01421(bigint)` and `gu_commons_subscription_set_v01421(bigint,boolean)` installed, `SECURITY DEFINER` and hardened `search_path`.
- Permission columns were cut off; **member true/true and anon false/false still need explicit evidence**. Run `supabase/admin/v0.14.0.22_NOTIFICATION_CONTRACT_READ_ONLY.sql` (one row). Expected: all columns `true` except `anon_may_get`, `anon_may_set`, `member_direct_preferences_read`, and `anon_direct_preferences_read` must be `false`.
- `supabase/admin/v0.14.0.22_NOTIFICATION_DELIVERY_EVIDENCE_READ_ONLY.sql` returns aggregated telemetry only. An alert count of zero does not mean install failed; no recipient content or identifiers are selected.

## Real two-member end-to-end acceptance — staging first

Use a separate Supabase staging project and Cloudflare preview deployment of the **same commit**. Never run scripted write tests against production. Use two eligible, non-showcase member accounts, A and B. Ensure the topic is a new benign test discussion in an active **ungated** Market Commons forum. Keep billing accounts and financial results out of QA data.

| Case | Procedure | Expected | Evidence |
| --- | --- | --- | --- |
| S01 | A visits discussion -> Follow | Button changes to Unfollow after verified server SET; refresh retains state | Two browser screenshots plus network 200 JSON |
| S02 | A's Dashboard -> Settings -> Notifications | Saved preference reflects server GET; disable persists after refresh | Response screenshot (omit tokens) |
| S03 | B replies while A opted out | New reply appears; no new `forum_reply` notice to A | Member Alerts + aggregate SQL |
| S04 | A opts back in; B posts new reply | A receives exactly one private in-app alert; B receives none for own reply | Two sessions and Alerts screenshots |
| S05 | B posts again within 15 minutes | Cooldown prevents a duplicate A alert for same topic | Read-only SQL aggregate |
| S06 | A unfollows; B replies | No further A notifications from topic | Follow UI + Alerts |
| S07 | A tries direct RPC for another user, or anon | No user ID parameter; anonymous EXECUTE denied | Postflight SQL + HTTP 401/403 |
| S08 | TEST/SHOWCASE/suspended member tries follow | Denied; no production subscription row | Negative role audit |
| S09 | Member tries following a Book/Lab-gated topic | Operation unavailable, no restricted text in alert | Authorized and unauthorized role test |
| S10 | Simulate client disconnect **after** persisted SET in staging | Client re-GETs state, never blind-retries POST | Browser network mock |

**Important:** The existing trigger skips notifications for replies within a 15-minute per-topic cooldown. Staging tests must be sequenced accordingly; do not incorrectly declare a failure for an immediate second reply. Avoid using personal accounts or real market recommendations as test content.

## Release blockers beyond this increment

Branch protection and Cloudflare deployed commit SHA; installed v0.14.0.17 reporting policy and optional forum interactions; full role-negative testing; privacy of mention recipients, attachments/polls and moderation; commerce webhook sandbox and refunds; verified historical data provenance, no lookahead and all 419 training cases; investor education disclaimers; Admin, GWS, Tutor, Journal and simulator authorization. No claim that these systems are production-complete is made here.

## Owner-controlled deployment

Overlay the source files into the same GitHub repo, retaining all other files. Watch **both** Frontend Source Contract Gate and Backend Contract v0.14.0.22. Source-only tests cannot certify Cloudflare routing or Supabase E2E. The read-only SQL is optional acceptance evidence; no DDL/DML is included. Do not rerun v0.14.0.20 or v0.14.0.21 migrations merely because the public release number increases.

## QA execution scope

The v0.14.0.18, v0.14.0.19, v0.14.0.20 and v0.14.0.21 source/API regressions passed in a reconstructed prior-release overlay, together with the new v0.14.0.22 source contract test. Chromium component checks passed locally on mocked network/auth; these do not prove a real deployed two-user workflow. Full repository Cloudflare Pages build and GitHub CI must still run on the actual new commit.
