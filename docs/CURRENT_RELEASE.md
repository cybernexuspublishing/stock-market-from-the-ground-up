# Current Source Candidate — v0.14.0.5 (13 October 2026)

**Not yet deployed or production accepted. The Owner controls GitHub, Supabase, Cloudflare and billing.**

Controlling source release: v0.14.0.5 (v0.14.0.4 baseline). Scope: restrict suspended/restricted Owners at the Membership Plans and private Grant Web Solutions draft API boundaries; update active release/cache markers; maintain the complete prioritized implementation register.

Read in order: `v0.14.0.5_ORDERED_MASTER_EXECUTION_PLAN.md`, `v0.14.0.5_CHANGE_REPORT.md`, `v0.14.0.5_RELEASE_QA.md`.

No new SQL write migration is required for these changes, but the **existing** production-schema preflight is still a release dependency. The owner must confirm the table/status contract. Do not rerun historical SQL files by default. Protect private seeds, old encryption keys and active member records.

**Mandatory flags remain OFF:** paid checkout, direct KDP Select eBook distribution, production Showcase entitlements, QR production activation; staff MFA/Turnstile rollout requires separate explicit authorization.

Historical release records in the `docs/` folder remain part of the audit trail; they do not supersede this file.
