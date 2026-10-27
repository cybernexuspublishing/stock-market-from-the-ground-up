# Interactive Learning & Historical Labs — v3.3 cross-session persistence and protected assessment boundaries

| Document control | Value |
|---|---|
| Project | The Stock Market: From the Ground Up |
| Document ID | SMFGU-LAB-V33-DUALMODE-20261027 |
| Filename | `2026-10-27_LAB_V33_DUAL_MODE_PERSISTENCE_AND_ASSESSMENT_GATES.md` |
| Type | Markdown release/acceptance record |
| Google Drive location / Drive document ID | Not assigned; no Drive copy created |
| Version / Date | 1.0 / October 27, 2026 |
| Repository / Branch | `cybernexuspublishing/stock-market-from-the-ground-up` / `main` |
| Status | IMPLEMENTED, TESTED in disposable PostgreSQL; production RPC definition and security boundary PROVEN; member save/resume not yet production-member-tested |
| Purpose | Preserve independent Guided and Practice learning drafts in one RLS-protected row, verify no official grade is implied, and eliminate stale-device overwrite cycles |
| Dependencies | Supabase Auth, `site_lab_progress`, existing Learning Engine v3.3, `gu_v33_save_lab_journey`, canonical 419-Lab registry, existing private assessment APIs, Cloudflare Pages, GitHub Actions |

## Roles and authoritative scope

Applied: Senior full-stack engineer; PostgreSQL/RLS architect; privacy/authorization engineer; assessment and learning scientist; curriculum continuity reviewer; accessibility engineer; QA/CI engineer; Cloudflare release engineer; Owner technical acceptance representative. Approved 419 IDs, the selected 336 candidates and 83 Upcoming labels, all Book/Boot Camp prerequisites, existing paid entitlements, Crownlight Sparks, old attempts, and LIVE payment controls were not changed. No second learning engine, assessment bank, database or account system was created.

The controlling User Journey is **Start, Learn, Experiment, Predict, Practice, Assess, Review, Transfer, Results**. Guided practice and reflection are ungraded. Official evidence remains wholly dependent on individually reviewed question sets, separately authenticated server-controlled submission, and the existing service-role-only grading RPC.

## Verified current evidence and critical defect

- The stock-market Supabase production project is `oxihglyfgzywsupnyicb`, verified ACTIVE_HEALTHY. At preflight, there were **zero `site_lab_progress` records**; production had 419 registered Labs, 439 **draft** training sets and **zero** reviewed sets. Counts are point-in-time only, not production readiness or the number of beta-ready lessons.
- `site_lab_progress` has member-owned SELECT/INSERT/UPDATE RLS. Prior `gu_v33_save_lab_journey` used `SECURITY INVOKER`, authenticated EXECUTE only, and a parent compare-and-set revision.
- **High, corrected:** The previous `learning_journey_v33` record held only one `mode`. Switching from Guided to Practice caused the client to treat the older revision as zero, preventing the new mode from saving; overwriting the single field could also erase the other mode's study progress. This is not an individual mastery or historical-data verification question, but a loss-of-learning-work defect.

## Implemented deliverables

1. `assets/js/lab-journey-checkpoint-v33.js`: read both legacy flat v1 and new v2 shared-revision records; retrieve only the selected mode; retain the **parent revision** even if this mode has no prior saved draft; reject malformed revision/shape instead of overwriting unknown data.
2. `supabase/migrations/20261027_lab_journey_v33_dual_mode_atomic_review.sql`: atomic, additive `CREATE OR REPLACE` on the existing RLS-invoker RPC. The saved JSON remains **in the same `responses.learning_journey_v33` namespace**: `{version:2,rev:N,modes:{guided:{...},practice:{...}}}`. On first save it lifts the existing flat record into its original mode; it does not rewrite existing member rows. It preserves the other mode via an atomic JSON merge; retains revision CAS, RLS and grants.
3. Existing database function now rejects direct submissions claiming later ungraded stages without the corresponding prediction lock/evidence, resolved practice, reflection and transfer notes. **These checks are study-stage integrity checks, not official answer grading.**
4. `assets/js/lab-engine-v32-universal.js`: on cross-device CAS conflict, show an actionable message, disable further stale saves and require reload/reconciliation. Never pretend an older draft was saved or silently reapply it.
5. `tests/test_v33_dual_mode_atomic_resume.mjs`, `tests/fixtures/v33_dual_mode_schema.sql`, `tests/fixtures/v33_dual_mode_lifecycle.sql`: real simulated client stores, old v1 upgrade, modes and CAS, production-compatible RLS ownership and fake member separation, direct stage-8 rejection, and legacy update trigger. No password/CAPTCHA bypass or real test identities were used.
6. `.github/workflows/shared-lab-engine-v33.yml`: add a disposable PostgreSQL 16 migration/RLS integration job plus shared Lab source/engine tests.
7. `supabase/rollbacks/20261027_lab_journey_v33_dual_mode_atomic_ROLLBACK.sql`: holds the prior full function; refuses a downgrade if **any** v2 checkpoints exist, because reverting to one-mode writes would lose member progress. Never force it past the guard; carry out a separately reviewed data-preserving conversion if real saved v2 data exists.

## Actual tests and acceptance

- GitHub Actions shared engine: [run 40465330379](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40465330379). Both `dual-mode-postgres-contract` and `source-and-curriculum-contract` completed successfully. The database job executed the real SQL migration against disposable PostgreSQL 16 with RLS and identity fixtures. These fixtures do **not** substitute for member browser acceptance.
- Production SQL read-only preflight: RLS enabled, `SECURITY INVOKER`, `anon` not allowed EXECUTE, `authenticated` permitted EXECUTE, zero current member-progress records. The old function definition was preserved in the rollback and source history.
- Authorized additive production migration: executed in an explicit transaction after CI. Read-only postflight confirmed `v_wrapper` and `jsonb_set(v_modes...)` were installed, `anon_execute=false`, `auth_execute=true`, `rls_enabled=true`, and still zero saved rows.
- Cloudflare production: exact-source deployment of the previously verified revision **`42376890d62e83ac5c2d990dc19594b329931b1c`** succeeded. That revision includes the improved browser source; current `main` SHA must be checked before any new release signoff.
- The independent assessment bank still has **zero independently reviewed sets**; no official Lab or certification status is advanced by this release. No answer keys/rubrics or future bars are transmitted by the checkpoint protocol.

## Open release tests and severity

| Level | Remaining evidence or requirement | Treatment |
|---|---|---|
| High | True signed-in member Guided → Practice → Guided across devices, with real refresh and session expiration | Owner-designated member beta acceptance; no simulated browser claim |
| High | Individually review/protect/QA each required Lab's questions and grading for correct/incorrect/partial/borderline/invalid answers | Continue in batches; unreviewed sets remain Not Yet Assessed |
| High | Source-licensed historical replay and no-look-ahead verification at each chronological reveal | Test independently; neither fictional nor static lesson counts prove this |
| Medium | Keyboard, screen-reader, 390/900/1280/1440 px visual validation on actual member pages | Requires actual device/browser evidence |
| Medium | Reconcile cross-device conflicting edits, user acknowledgement and version history in a real session | Current behavior fails closed and asks learner to reload rather than overwriting |
| Medium | Operational monitoring for RPC 40001 conflicts, client save errors and member support | Include in existing Owner Admin error dashboard, without new paid services |

## Owner technical decision, rollback and sign-off

**Accepted:** Implementation of separate mode checkpoints inside existing member-owned progress records, PostgreSQL RLS/CAS protection, study-state validation and stale conflict guidance; recorded evidence is source-tested, PostgreSQL TESTED and installed in actual production provider. **Not accepted as a fully completed Lab, graded assessment, human member cross-device proof, historical replay or beta-certified mastery.** Free Talia explanations and guided retries remain available subject to current member access. Zero new paid tools. The production write made no destructive member-data changes.

**Rollback:** Prefer revert of the compatible client source if necessary; do not restore the original server function after v2 records appear, because that would silently drop a mode. Before any operational rollback, take read-only JSON backups, inspect member row counts/revisions and execute the guarded rollback only if no v2 records exist. Keep existing RLS rules and service permissions intact.

**Revision history:** v1.0, October 27, 2026 — dual-mode persistence, rollback guard, protected study-state validation, real CI PostgreSQL acceptance and production provider verification.

**Footer:** SMFGU-LAB-V33-DUALMODE-20261027 · Technical release evidence · Member acceptance remains separate.
