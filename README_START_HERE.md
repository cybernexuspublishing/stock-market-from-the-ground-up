# v0.14.0.23 — Backend Phase 4 — Direct-Upload Source ZIP

Product: The Stock Market: From the Ground Up — Cyber Nexus / Crown & Lantern Press  
Source baseline: GitHub `main` `8113f497f015b23c8682a520eebaf09dbb2ed2a2` (v0.14.0.22).  
Installation type: **Full source files in original repository paths**, not executable patches, batch scripts or a replacement full repository.  
Production SQL: **NOT EXECUTED** by this package. New v0.14.0.23 migration is review-required and optional.  
Production changes: None made by packaging this ZIP.  
Owner's source changes: Preserve every unrelated file and prior approval.

## Repository installation

Use the same GitHub direct-upload/overlay process as v0.14.0.22. Extract ZIP files at the **repository root**, preserving the `assets`, `functions`, `supabase`, `tests`, `.github` and `docs` directories. Do not upload this ZIP as a static Cloudflare `public/` directory or overwrite/delete unlisted repository files. Commit, then verify ALL required GitHub workflows. Do not reveal private environment secrets.

## Improvements

1. Member Dashboard > Settings > Notifications: new saved **OFF-by-default, separate** in-app mention preference. It is disabled/error-aware until reviewed database functions exist; no fake success.
2. Market Commons: new database candidate for mention alerts on published topics and replies in active, ungated sections, to eligible opted-in, visibly participating members. Only `[mention]VerifiedUsername[/mention]` tags trigger alerts, limited to five distinct names/post and 25 attempted names/author/UTC day. No @name guessing, no raw content or username in alert, no self-alert, no Showcase, no restricted accounts, unique per recipient/content, best-effort failure handling; no email/push or private book/Lab disclosure.
3. Admin Control Center > System: new manual **OWNER-only, read-only** community database record counters, separate from billing and moderation, authenticated and MFA-gated where configured. Counters are not proof of delivery.
4. Version synchronization, CI source/API regression and negative-role test coverage, local isolated Chromium component QA, read-only SQL pre/postflight and sitewide risk register.

## IMPORTANT: exact next operations

1. Upload to GitHub. Verify `Backend Contract v0.14.0.23`, `Backend Contract v0.14.0.22`, `Frontend Source Contract Gate`, and `Sitewide Engineering Governance` all pass. The SQL does **not** auto-run.
2. In Supabase, run **only** `supabase/admin/v0.14.0.23_MENTION_PREFLIGHT_READ_ONLY.sql`, and review its results against actual schema.
3. Review/test `supabase/migrations/v0.14.0.23_COMMONS_MENTION_NOTIFICATIONS_REVIEW_REQUIRED.sql` in an isolated staging project. After explicit owner approval, apply to production once and run `supabase/admin/v0.14.0.23_MENTION_POSTFLIGHT_READ_ONLY.sql`.
4. Run staged role-positive/negative and two-member browser E2E to confirm email/notification preferences, mention insertion, read and opt-outs. Never assume an installed trigger is proof that a notification was received.

## Deliberate boundaries

- The existing v0.14.0.20 reply notification and v0.14.0.21 subscribe/unsubscribe migration must not be rerun.
- No destructive SQL, book curriculum changes, sitewide commerce alterations, payment activation, real broker orders, or speculative entitlements.
- Website remains a stock-market **education** environment. Historical Lab answers and private market data must not be leaked.
- No claims of live E2E, production safety, or complete backend readiness are made by source QA.

Read `docs/BACKEND_PHASE_4_v0.14.0.23.md` and `docs/BACKEND_PHASE_4_ACCEPTANCE_MATRIX.csv` before enabling new notification delivery.
