# Backend Phase 4 — v0.14.0.23 — Market Commons Mention Delivery and Owner Observability

| Field | Value |
| --- | --- |
| Company | Cyber Nexus |
| Product | The Stock Market: From the Ground Up |
| Version | v0.14.0.23 |
| Source baseline | `main` `8113f497f015b23c8682a520eebaf09dbb2ed2a2` (v0.14.0.22) |
| Document ID | GU-WEB-BE-20261015-004 |
| Revision | 1 |
| Date | October 15, 2026 |
| Google Drive | Not uploaded / not assigned |
| Delivery | Direct GitHub source overlay, **not** a complete repo checkout |
| SQL execution | None performed; migration remains `REVIEW_REQUIRED` |
| QA classification | Isolated source/API/browser component PASS; production role E2E NOT TESTED |
| Production signoff | **NO-GO pending staging / authorization / integration acceptance** |

## 1. Defects and requirements addressed

**BE23-001 — Mentions had no delivery mechanism.** The v0.14.0.19 member picker inserts `[mention]Username[/mention]` but deliberately stated it did not send alerts. This release adds an explicit, individually saved OFF-by-default preference and an additive, review-gated database implementation. It does not infer consent from a username, following a thread, or general marketing consent.

**BE23-002 — Abuse/privacy limits.** Mentions are only generated on INSERT of published Commons topics/replies in active ungated categories; never in book/tool/Lab-gated areas. Both actor and recipient must be eligible production members; restricted/suspended/Showcase accounts are excluded. The recipient must be an opted-in participant with an already-published contribution in an ungated forum. Only verified BBCode tags count; five unique usernames per content item and twenty-five attempts per sender/UTC day are bounded with an atomic quota ledger. Unique recipient/content indexes and `ON CONFLICT DO NOTHING` enforce deduplication. No stock recommendations, usernames, member IDs, or forum bodies go into alerts.

**BE23-003 — Missing OWNER telemetry.** A new read-only API and Admin/System panel show aggregate follow rows, stored reply-alert rows, optional mention opt-ins and stored mention-alert rows. Both JWT identity and current active OWNER role are checked server-side, with restricted account/Showcase/MFA checks; no identities are returned. A metric without `Content-Range` remains **unavailable**, not fabricated zero. All responses and data requests are no-store. The UI must not imply stored rows mean device notification delivery.

**BE23-004 — Unsupported toggles/claims.** The dedicated member mention checkbox remains disabled if the reviewed migration is absent, and a dropped POST is reconciled through an authorized GET without blind retries. Existing reply-alert setting, subscriber follow controls, payment/access logic, Admin navigation, and moderation surfaces are preserved. The verified member picker now truthfully states that recipient opt-in and active backend deployment are necessary.

## 2. Security and correctness analysis

- **Authentication:** `/api/community-mention-preferences-v01423` uses the actual bearer JWT for Supabase REST RPC and verifies `/auth/v1/user`. No supplied `user_id` argument; forbidden states are rejected by SQL as well. `service_role` is never used in this member API.
- **SQL:** Preferences and quotas are RLS-enabled and have no direct `anon`/`authenticated` table access. SECURITY DEFINER functions have explicit `search_path=public,auth,pg_temp`; GET/SET run only as authenticated and bind to `auth.uid()`. Trigger privileges are revoked from anonymous/authenticated roles. No direct client writes to notification records.
- **Race conditions:** atomic daily quota via `INSERT .. ON CONFLICT DO UPDATE .. WHERE < 25`, separate immutable recipient/content dedupe index; notifications emitted in the source INSERT transaction. A client-lost POST response results in a single authoritative recheck.
- **Threat model:** users can create spammy tags or mention a public contributor not in their thread; per-item/daily caps mitigate but do not eliminate harassment. Moderators still need full abuse controls, audit, account blocking and user muting. Consider an outbound queue rather than synchronous trigger at scale.
- **Known limitations:** the CURRENT release has no user block-list/mention-approval workflow, per-post edit mention notifications, or external push/email. Quoted BBCode may contain user-supplied `[mention]` text, so moderation/rate policies must remain enforced. Name eligibility and visibility should be explicitly retested against real RLS and membership roles.
- **Execution boundary:** neither GitHub nor Cloudflare runs the SQL. Source CI is not a substitute for a staged PostgreSQL compile/apply and function role tests; SQL grammar must be validated on actual Supabase before release approval.

## 3. Prerequisites and migration order

Required existing tables: `profiles`, `admin_user_flags`, `admin_user_roles`, `commons_forums`, `commons_topics`, `commons_posts`, `user_notifications`. Requires `auth.uid()`. The new migration creates only two private tables, two user-bound RPCs, one emitter function, one unique index, and two INSERT triggers. It does not alter existing notification preference tables or the previously installed reply trigger.

Run `supabase/admin/v0.14.0.23_MENTION_PREFLIGHT_READ_ONLY.sql` before staging, then test the migration on isolated data and `supabase/admin/v0.14.0.23_MENTION_POSTFLIGHT_READ_ONLY.sql` afterward. If any preflight prerequisite is missing, STOP; do not create a second, incompatible schema. **Production execution requires explicit Owner authorization after successful staging.**

## 4. Acceptance plan

1. Reviewer verifies preflight, function bodies, RLS, GRANT/REVOKE, triggers and index on staging.
2. Opted-out member A is mentioned by eligible member B in an ungated discussion: no new mention notification.
3. A explicitly enables mention alert, refreshes Settings, and sees persisted `true`; B posts new tagged mention in published content: exactly one A notice, no B self-notice.
4. Unmarked `@username`, private book/Lab category, unqualified handle, restricted recipient, TEST/SHOWCASE, unpublished post and >5-tag submission: no notification.
5. Rate-bound posting, duplicate notifications, concurrent posts and suspended actor: no over-issue. Verify quota and uniqueness using read-only checks; no protected details in Alerts or logs.
6. Role-negative API tests: unsigned, TEST/SHOWCASE, restricted, expired JWT, STAFF without OWNER all rejected; check authenticated members cannot directly SELECT private prefs or quota tables.
7. Admin/System OWNER sees metrics; Moderator/Admin without OWNER receives 403. Alerts are **visibly received by the intended user** in a separate logged-in browser session.
8. If SQL omitted, checkbox stays unavailable, no fake success, existing replies/follow functionality unchanged.

## 5. Sitewide unresolved blockers outside this release

- **Security P0:** require production/staging multi-role RLS and Cloudflare API testing, paywall/entitlement isolation, deployment SHA parity, branch rules and service-role misuse review.
- **Admin/Commons P1:** reporting policy migration status, all owner-configurable limits, moderation escalation/appeals, polls/uploads/subscriptions in restricted forums, actionable announcements, content-retention and user-block systems.
- **Commerce P0:** Lemon Squeezy live/sandbox webhook handling including idempotency, refunds/chargebacks, entitlements, billing restrictions, customer notices, and KDP Select eBook exclusivity; no fake checkout success.
- **Teaching P1:** source/provenance of all 419 historical Lab IDs, answer grading, future-bar leakage, per-timeframe historical no-hindsight tests, trading simulations (not executions), market-data license constraints and educational risk disclosures.
- **Operations P1:** SLOs, logs, audit/incident alerts, transactional outbox/retry/dead-letter, account deletion/retention, encryption/key rotation, safe GWS tenant isolation, AI tutor budget/accuracy and student privacy.

**Recommendation:** Advance backend development and source deployment; do NOT mark mention delivery or the full website production-ready without reviewed migration and staged browser acceptance. No other prior owner-approved functionality should be changed.
