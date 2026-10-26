# Supabase Advanced Backend Baseline — Evidence and Operations
**Document ID:** SMFGU-DB-ARCH-2026-10-26-01  
**Project:** The Stock Market: From the Ground Up (Founding 600 pre-beta)  
**Owner:** Cyber Nexus / platform Owner  
**File type:** Markdown (.md)  
**GitHub location:** `docs/backend/2026-10-26_SUPABASE_ADVANCED_BACKEND_BASELINE.md`, branch `main`  
**Google Drive location:** Not configured or created; this is a repository-controlled engineering record.  
**Version:** 1.0  
**Status:** Implemented with verified provider migration and SQL evidence; complete release acceptance remains independently gated.  
**Issued:** 2026-10-26  
**Dependencies:** Supabase project `oxihglyfgzywsupnyicb`, Auth, PostgREST, Cloudflare Pages Functions, versioned Lab grading service, Founding 600, and existing project rules.

## Purpose and governing standard
Strengthen the **existing** authoritative PostgreSQL and Supabase data plane before expanding the UI. Preserve all 419 Lab IDs, private grading material, user attempts, Founder pricing, $0 spending, existing service-role boundaries, and LIVE payment shutdowns. All changes are on `main`, without secondary engines, credentials, payments, or member-record overwrites.

The Owner attested to completing semantic source review and a genuine authenticated acceptance run. This record does **not** fabricate a new provider audit record for that attestation; further acceptance must cite the actual test and deployment evidence when available.

## Implemented changes and proof
| Migration | Purpose | Result | Rollback |
| --- | --- | --- | --- |
| `v0.14.0.290_supabase_member_rls_initplan_v2` | Convert 23 per-row `auth.uid()` policy calls into statement-stable scalar lookups without changing roles or ownership predicates. | Applied to live Supabase; RLS-initplan advisor warnings 23 → 0. | `supabase/rollbacks/v0.14.0.290_supabase_member_rls_initplan_v2_ROLLBACK.sql` |
| `v0.14.0.291_high_value_foreign_key_indexes` | Add eight targeted indexes on existing FK columns for editorial, roles, Commons, market provenance, Founder sandbox evidence and moderation. | Applied; 8/8 valid/ready indexes, FK notices 114 → 106. | `supabase/rollbacks/v0.14.0.291_high_value_foreign_key_indexes_ROLLBACK.sql` |
| `v0.14.0.292_reviewed_learning_version_integrity` | Attribute reviews, require active Owner role for first rubric approval, freeze reviewed grading content and preserve pinned attempt semantics. | Applied; temp-only negative SQL regression rejects direct approvals, unauthorized reviewer promotions and edits to frozen answer keys. | `supabase/rollbacks/v0.14.0.292_reviewed_learning_version_integrity_ROLLBACK.sql` |
| `v0.14.0.293_editorial_audit_schema_reconciliation` | Attest to already-installed B01 review triggers and grant restrictions without rerunning old SQL or inventing historical migration events. | Live schema gate succeeded and is recorded with a new true application timestamp. | Non-mutating gate; rollback is explicitly a no-op. |

SQL acceptance source: `supabase/reviews/2026-10-26_BACKEND_ZERO_TRUST_RELEASE_GATE.sql`.  
Negative test source: `supabase/reviews/2026-10-26_v014292_GRADING_NEGATIVE_REGRESSION_TEMP_ONLY.sql`.  
The zero-trust gate completed against the provider and returned PASS on 2026-10-26.

## Current provider facts after migrations
- Supabase PostgreSQL 17.11, ACTIVE_HEALTHY at time of inspection.
- Public schema: 189 tables; **zero** public tables with RLS disabled.
- 419 canonical Lab records, 439 private grading-set records, 94 private instructional records, unchanged by this work.
- 8 publicly callable and 78 authenticated-callable SECURITY DEFINER function advisor warnings remain. These are **review inventory**, not proof of exploitability. Registration and member RPCs require their documented interface grants; do not blanket revoke.
- 132 RLS-enabled tables with no client policy remain intentionally deny-all pending role-by-role contract evidence; do not create permissive policies merely to remove advisory info.
- Performance notices: zero `auth_rls_initplan`, 106 unindexed foreign keys, 41 unused indexes (including eight newly installed indexes that have not yet accumulated usage).
- Private ebook Storage bucket remains private. Sensitive administrative and grading tables remain inaccessible by ordinary direct client SELECT/UPDATE as tested.
- Founder plans are still $49.99/30 days and $59.99/60 days, with respective 10% and 15% purchase benefits. LIVE provider shutdowns untouched.

## Transactional negative tests
The only write tests were inside a rollback-only PostgreSQL transaction on a temporary `gu_v014292_fixture` relation. No production approval, answer key, member identity, payment or Lab record was inserted or modified.
1. A draft remained writable and not frozen.
2. Direct insertion as `reviewed` was rejected.
3. Promotion to `reviewed` using an invalid reviewer UUID was rejected.
4. Attempted answer-key modification after synthetic fixture freezing was rejected.
All paths ran successfully and the transaction rolled back.

A separate read-only SQL test using `SET LOCAL ROLE authenticated` **without a valid JWT** returned zero visible member profiles, 419 public registry Labs, and no direct permission to private grading, private teaching, Owner site settings or account classification. This is a negative authorization test, **not** proof of a real authenticated member journey.

## Operational discovery — why the five registered beta accounts cannot yet enter paid-tier member paths
At this read-only provider check, **5 Auth accounts** existed but there were **0 active ONDEMAND_TRAINING passes, 0 F600_GUIDED_QA_V1 passes, 0 active Founding 30/60 grants, 0 active Founding 30/60 subscriptions, 0 founder seat records and 0 Academy enrollments**. These values are not a grading test failure: they mean no protected beta entitlements have actually been provisioned for the registered accounts. Identity creation and course authorization are distinct.

The platform ALREADY has a nonpayment Owner approval workflow in `assets/js/account-management-entitlements-v01478.js` under the existing Admin Member editor, labeled **Founding 600 · Guided Learning Beta Access** and **Authorize 30-Day Guided Beta Access**. It calls the established, auditable `grant_resource` API with `kind=manual_tool`, `code=ONDEMAND_TRAINING`, and reason prefix `F600_GUIDED_QA_V1:`. The backend verifies the Owner issuer, active pass dates, account status and noncommercial provenance. This permission opens narrowly scoped ungraded B01/Boot Camp QA, not purchased ebook access, founding seats, Store discounts, LIVE billing or reviewed-grading credit.

**Required safe operational action:** The human-authenticated Owner must issue a pass to each actual designated member through the existing Member editor and verify the member inventory; do not create artificial Founding subscription rows, bypass Turnstile or impersonate an Owner through service-role SQL. A true Founding 30/60 paid-tier lifecycle remains a separate Stripe TEST/Sandbox contract test. The lack of current passes does not justify disabling the already functional registration or guided-beta code.

## Security posture and open review categories
- **High — Authentication operations:** earlier Auth logs contained failed Turnstile verifications, including invalid secrets; this pass did not alter provider CAPTCHA configuration. Real sign-in and token validation remain an independent production acceptance concern.
- **High — Privileged functions:** 8 anon-executable and 78 authenticated-executable SECURITY DEFINER functions require endpoint-specific review and abuse rate limiting. Existing anonymous signup and public catalog functionality must not be broken through blanket revocation.
- **High — Legacy migration history:** v280/v281 historical entries remain absent. v293 verifies installed objects without manufacturing missing history or rerunning old migrations. Preserve provenance discrepancy until traceable application records are recovered.
- **Medium — Remaining FK notices:** index by measured workload and FK deletion cost, not indiscriminately. Immediate new-index unused notices are expected.
- **Medium — Password protection:** leaked-password protection may require a paid Supabase tier. Do not upgrade under the Owner's $0 spending ceiling; retain existing strong password rules and real Turnstile protection.
- **Operational — User journey evidence:** a migration or mocked CI success does not certify all 7 Boot Camps or 336 target Labs Beta Ready. Individual course readiness, real member persistence, verified rubric approvals and grading QA are separate acceptance tracks.

## Reusable operations and release procedure
1. Read the latest `main` commit and the controlling project rules; inspect provider migration history for drift, not merely file version numbers.
2. Run `supabase/reviews/2026-10-26_BACKEND_ZERO_TRUST_RELEASE_GATE.sql` read-only and capture the PASS/FAIL outcome.
3. Run Supabase Security and Performance Advisors. Compare **differences** rather than trying to reach zero by widening grants.
4. Review migration preconditions, compatible schema/data baselines, rollback and how each protected member/API workflow uses the proposed change.
5. Commit migration, rollback, and read-only postflight to `main`. Apply once through the Supabase provider migration mechanism; never replay historic SQL.
6. Run postflight, negative-role tests, role-specific real auth tests and concurrency/retry tests; separate local TESTED from production PROVEN.
7. Confirm exact GitHub commit and Yahoo Cloudflare deployment **when runtime files changed**. SQL provider application alone does not establish a Cloudflare deployment.
8. Verify backups and restoration capability with independently maintained evidence before destructive production operations; no destructive production operation was part of this pass.
9. Keep LIVE Stripe transactions and configuration changes excluded. Sandbox/TEST lifecycle remains separately authorized.

## Revision history
| Date | Version | Revision | Acceptance |
| --- | --- | --- | --- |
| 2026-10-26 | 1.0 | Four controlled migrations, SQL negative fixtures, provider advisor checks and zero-trust schema baseline | Database-level corrections accepted on recorded evidence; overall launch status not certified |

## Section sign-off
**Implemented:** migrations v290–v293, rollback scripts, SQL postflight scripts and recurring read-only release gate.  
**Tested:** temporary grading integrity negative cases and unauthenticated role-isolation checks.  
**Proven:** provider migrations applied, index validity, zero-trust PASS and advisor performance changes.  
**Carried forward:** genuine browser authentication evidence, migration provenance, individual learning-content approval, other privileged-function reviews and load/recovery tests.
