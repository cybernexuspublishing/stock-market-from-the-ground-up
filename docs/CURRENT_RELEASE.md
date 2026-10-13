# Current Source Candidate — v0.14.0.6 (13 October 2026)

**Project:** The Stock Market: From the Ground Up + Grant Web Solutions
**Status:** source-tested security and verification update, NOT P0–P2 completion or production accepted.
**Baseline:** v0.14.0.5. Supabase / Cloudflare / GitHub remain unchanged.

This controlled release closes a set of authenticated-account security issues in reviewed assessment, membership checkout, legacy account operations, and Owner community settings. It preserves the stable filenames, existing API paths and 419 Lab identifiers. Details: `v0.14.0.6_IMPLEMENTATION_SCOPE.md`.

**77-task status register:** `v0.14.0.6_77_TASK_VERIFICATION_REGISTER.csv` and the controlling `v0.14.0.5_ORDERED_MASTER_EXECUTION_PLAN.md`. The file inventory is not evidence of verified historical data or production correctness.

**SQL for v0.14.0.6 patch:** no new write migration. Existing read-only preflight: `supabase/admin/v0.14.0.4_SAFE_CONTRACT_INSPECTION_READ_ONLY.sql`. Do not rerun previous migrations without reconciling production.
