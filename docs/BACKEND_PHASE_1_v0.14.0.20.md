# Backend phase 1 — v0.14.0.20

**Project:** The Stock Market: From the Ground Up (Cyber Nexus)  
**Base GitHub commit:** `a6f1627ac1c9b13b6c0339440885ab05711a679f` (v0.14.0.19)  
**Status:** Backend source candidate; verified local source/unit contracts; production database NOT changed or verified  
**Date:** 2026-10-14, America/Chicago  
**Delivery:** Direct-upload nested ZIP, same process as frontend releases  
**Owner production approval:** Not recorded  
**Google Drive location:** Not supplied  

## Implemented source

- `GET /api/backend-contract-v01420`: **OWNER-only** read-only table-contract inventory, verified JWT, active OWNER role, production member identity, restricted-account checks and conditional AAL2 verification; no service keys or member data in response.
- `GET /api/community-notification-preferences`: authenticated caller-scoped current in-app subscription notification preference; no service-role key.
- `POST /api/community-notification-preferences`: authenticated caller-scoped boolean update; strict validation, secure PostgREST RPC.
- Reviewed additive SQL candidate for private notification preferences and new-reply **in-app** notifications to existing subscribers in active **ungated** Market Commons areas. Trigger fires on insert of published replies only; no body/usernames in notification; no backfill; per-topic cooldown and per-post dedup; author excluded; restricted accounts excluded; delivery opt-out.
- Two separate **READ ONLY** SQL verification files: preflight (before approval), postflight (after staged installation).
- Backend CI unit/schema safety checks, without connecting to Supabase production.

## Critical operator rules

1. Upload ZIP to GitHub using the existing repository file-overlay process; this **does not execute SQL**. Preserve every existing file and keep `supabase/migrations/*REVIEW_REQUIRED.sql` review-gated.
2. Run `supabase/admin/v0.14.0.20_BACKEND_PREFLIGHT_READ_ONLY.sql` in the selected Supabase project. Check expected tables, columns, RLS and grants. Never interpret a missing result as permission to override production schema.
3. Test the migration and both Cloudflare APIs in an isolated Supabase staging environment. Test two signed-in members, an unsubscribed/opted-out member, suspended and Showcase accounts, a restricted Book/Lab forum, concurrent posts and cooldown, and subscription lifecycle.
4. Apply the reviewed SQL in production **only after** complete staging and explicit Owner authorization. Run postflight and role-negative tests. This release **does not represent the SQL as installed**.
5. Make sure the installed v0.14.0.17 reporting policy and advanced forum interaction candidates are separately preflighted/reviewed; their installation is **not** assumed.

## Dependencies / intentionally deferred

- In-app alert UI uses existing `/api/ui-state?action=notifications` to read `user_notifications`; client preference toggle has not been added, although the GET/POST backend API is ready.
- This first release covers **subscriptions**, not @mention notification fan-out, email, push, WhatsApp, or any external communication.
- Reply fan-out is synchronous and best effort (warnings on failure). Before high-volume adoption, transition to transactional outbox plus queued worker with metrics/retry/dead-letter semantics. Source-only tests are **not** proof of production-delivered alerts.
- Full moderation actions, reporting policy installation, advanced polls/uploads, entitlement lifecycle, paid webhook audit, all 419 lab authoring/answer provenance, Simulator, Journal, AI Tutor, and complete system RLS still require dedicated backend phases and end-to-end acceptance.
- Protect GitHub main using required checks and an approval process; this ZIP cannot change repository branch protection.

## Acceptance criteria for THIS stage

- All new source/API unit and structure tests pass at the exact commit.
- Public and ADMIN cannot read OWNER diagnostics; suspended and Showcase accounts cannot.
- Caller cannot set another user's notification preference; invalid bodies cannot be written.
- No direct anonymous/authenticated SQL access to notification preference table.
- Only existing subscribed eligible members get an in-app notification for published replies in ungated forums. One notice per recipient per topic over 15 minutes; no self-notification.
- No notification contains private book/lab/forum body or personally identifiable contributor data.
- Live database and production deployment parity need independent evidence before marking any test 'PASS'.
