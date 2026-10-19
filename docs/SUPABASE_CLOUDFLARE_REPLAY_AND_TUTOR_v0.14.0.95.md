# Owner Supabase / Cloudflare — verified-replay and AI Teaching handoff v0.14.0.95

**Company:** Cyber Nexus / Crown & Lantern Press. **Project:** The Stock Market: From the Ground Up.
**Prepared:** 2026-10-19. **Repository:** cybernexuspublishing/stock-market-from-the-ground-up.
**Type:** Markdown deployment handoff. **GitHub path:** docs/SUPABASE_CLOUDFLARE_REPLAY_AND_TUTOR_v0.14.0.95.md.
**Google Drive location/ID:** Not assigned; do not create duplicate documents.
**Status:** Committed source candidate only. The Owner controls and enters Supabase SQL/Cloudflare production variables. No production deployment/database verification is implied.

## Confirmed from Owner's screenshot
`gu_replay_bars_v01492`, `gu_replay_sessions_v01492` and `v01492_replay_advance(uuid,uuid,integer)` EXIST in the existing database. Do NOT rerun the v0.14.0.92 private replay migration, or any v0.6/v0.7 migration.

## Execute these files, in this exact order, ONCE in the existing Supabase SQL Editor
1. **Read-only:** `supabase/admin/v0.14.0.95_REPLAY_AND_TUTOR_DEPENDENCIES_READ_ONLY.sql`. Check `market_datasets`, `decision_journal`, `trade_plan_snapshots`, `journal_reviews`, v0.14.0.92 replay table and source ACL/trigger state. If any existing dependency is missing, STOP: identify installed schema before modifying it. Do not replace it.
2. **Migration (if not already installed):** `supabase/migrations/v0.14.0.94_REPLAY_JOURNAL_ATOMIC_OWNER_REVIEW_REQUIRED.sql`. This adds an owner-private link to EXISTING Journal and one transactionally idempotent finish RPC. No replay sessions are generated.
3. **Existing-object hardening:** `supabase/migrations/v0.14.0.95_REPLAY_GUARDRAILS_OWNER_REVIEW_REQUIRED.sql`. This upgrades the existing v0.14.0.92 advance RPC to verify monotonic candle times, current publication rights, lock the session and dataset against concurrent revocations. Adds a trigger blocking edits/deletes/additions to published dataset replay bars. Changes to licensed prices require unpublish → Owner correction → re-review → republish.
4. **Read-only verification:** `supabase/admin/v0.14.0.95_REPLAY_AND_JOURNAL_POSTFLIGHT_READ_ONLY.sql`. Expect both RPCs, RLS=true, member/anon direct privileges=false, service EXECUTE=true, trigger enabled, zero backwards timestamps, zero gaps and orphan links. Zero data rows means no real replay data yet; do not call it fully functional.
5. Separate functional acceptance: authenticated member A owns only A's session/Journal; member B denied; expiry/withdrawn license blocks new progress; no future candles or private rubric keys in browser; concurrent stale advance rejected; finish retry returns same Journal ID. Do not use real funds or fabricate OHLCV datasets.

## Cloudflare Pages — project already exists; preserve its configuration
**Project:** `stock-market-from-the-ground-up`. **Git branch:** `main`.
**Build command:** `bash scripts/build-pages.sh`. **Output:** `public`.
The root `functions/` directory MUST be deployed as Pages Functions; do not manually copy it into `public`.
**Existing environment values to LEAVE UNCHANGED:** `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (secret), all Stripe TEST/LIVE secrets, Turnstile secrets and deployed membership switches. Confirm the three Supabase names exist in Production without pasting secret values in logs or GitHub.
**New optional Production text variable:** `GU_REPLAY_JOURNAL_V01494_ENABLED` = `false` or unset UNTIL v94 + v95 migrations and live authorization/permission tests pass; then set exact value `true` and redeploy. The worker calls `rpc/v01494_replay_finish_to_journal` only with this opt-in flag. Set back to `false` immediately for operational rollback; already-written journal links remain.
**AI Tutor:** source-grounded premium instruction works WITHOUT any paid model credential. `AI_TUTOR_API_KEY` and `AI_TUTOR_MODEL` are OPTIONAL server-only secrets; leave absent until cost/privacy acceptance and the existing `v0.14.0.92_TUTOR_QUOTA_OWNER_REVIEW_REQUIRED.sql` is installed and verified. Never configure a key or invent a budget here.
**No new Stripe product, member entitlement, Supabase instance, market-data vendor, database migration history, or stock ticker is needed.**

## Reuse and corrections
- Existing Interactive Training server was sending modern `sb_secret_*` keys as fake Bearer JWTs; v95 corrects its private data adapter, retaining existing training-set tables, per-book checks, CAS server grading and URL/API contracts.
- Premium Market Tutor practice now optionally summarizes this member's REAL completed `lab_training_attempts_v014` scores for revisiting specific existing Labs. Missing learning tables degrade to the previous tag-based teaching; raw answers, grades of others, and model calls are not exposed. A score is not proof of trader competence, nor are 419 labs considered delivered.
- Existing 21 tool codes, 30 competencies, 419-ID target, 8 priced Stripe products, Books I–III approved v1.14, and Market Commons were not re-created or silently modified.
- Financial and information-security risks remain: one-dimensional OHLCV proves no execution order, slippage, licensed data rights or actual P&L; live Cloudflare/Supabase ACL and Market Commons moderation must be separately tested.

**Rollback:** set flag false; if necessary revert source SHA for v95; downgrade the in-place `v01492_replay_advance` definition only under change control. Do NOT drop existing Journal/Replay/Lab tables, remove historical IDs or delete customer evidence.
