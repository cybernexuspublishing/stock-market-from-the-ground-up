# The Stock Market: From the Ground Up — v0.14.0.21

**Delivery type:** Direct-upload GitHub nested source ZIP. Exactly the same installation format as v0.14.0.18 through v0.14.0.20. **NO batch scripts, patch scripts or ZIP-inside-ZIP.**

**Baseline:** v0.14.0.20, GitHub main `759aabd8cf2bc328235e822906893d5cb075fba5`.

## Installed by GitHub overlay

1. Real saved notification preference UI in Dashboard → Settings → Notifications, replacing a misleading static checkbox panel. Uses the v0.14.0.20 authenticated preference endpoint.
2. Real follow/unfollow UI in ungated Market Commons discussions, backed by a caller-authorized Cloudflare Function with GET and explicit idempotent SET actions.
3. Reviewed candidate additive Supabase SQL implementing new scoped subscription RPCs **for later manual staging review**. GitHub upload does not run it.
4. Version-aligned public client, service-worker cache, and shared route classification, without changing privileged routes or book commerce restrictions.
5. Regression tests, GitHub Action, read-only preflight and postflight SQL, documented sitewide backend risk register.

## Preserve

All books and approved curricula, forum posts, profiles, accounts, members, entitlements, Admin/Moderator controls, Store, pricing, ads, Grant Web Solutions, learning Labs, simulator and journal. Nothing is intentionally deleted. No live data or SQL has been changed by generating this package.

## Verification and rollout

- Commit the nested files to the existing repo, without deleting any other repo file.
- GitHub source/CI passes do not certify Cloudflare deployed SHA or installed Supabase functions.
- You already verified v0.14.0.20 database installation **8/8**. That does not verify v0.14.0.21 RPC installation.
- Before v0.14.0.21 SQL is executed anywhere, inspect `docs/BACKEND_PHASE_2_v0.14.0.21.md`, run the **read-only** preflight, review in isolated staging, and authorize any production DDL separately.
- Do not run the SQL migration twice or apply broad old cumulative migrations to production. No automatic change to production data is part of this delivery.
- New follow UI intentionally reports service unavailable until its reviewed functions are installed. It will not pretend that following succeeded.

**Known limits:** Real customer/staff E2E tests, all role and content entitlement tests, full payment lifecycle, live notifications, advanced forum migration and release parity remain open. Frontend/backend final certification is NOT complete.
