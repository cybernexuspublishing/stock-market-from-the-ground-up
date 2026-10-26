# Sitewide and Social pre-beta acceptance evidence — 2026-10-26

## Product and release scope
- Repository `cybernexuspublishing/stock-market-from-the-ground-up`, direct main-branch changes only.
- Canonical Pages target: `https://stock-market-from-the-ground-up-d1r.pages.dev` in Yahoo Cloudflare account `4fe9e562905cf607b6f004d2374299fc`.
- No LIVE payment testing or transactions. No external X automation or paid-provider calls.
- Founding 600 accounts are reserved for member-facing beta acceptance; Owner marketing administration remains Owner-only.

## CI root cause and source repair
- GitHub Actions Sitewide Playwright push workflow used `cancel-in-progress: true` at a branch-wide concurrency group, causing newer commits to cancel queued or running attempts before tests were evaluated. A cancelled job is **not** an application test failure.
- Source fix [dd329405](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/commit/dd329405dd4008df4f8620aa274174bd90b92ad1) prevents newer pushes from cancelling manually dispatched workflows.
- Source fix [1fb5d98](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/commit/1fb5d98f1a89434c68370d7a3dca4b748c9e4f03) additionally protects deliberate re-runs by requiring `github.run_attempt>1` to use its own run ID as concurrency key. The existing test steps and Stripe safeguards are preserved.
- GitHub official docs confirm reruns retain original source SHA and standard GitHub-hosted runners are free for public repositories; no new paid service is needed.

## Last completed genuine sitewide test failure (historical)
- [Sitewide 40275317599](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40275317599): Sitewide browser job **FAIL**, Stripe mocked/noncharging job **PASS**.
- Failing step: `Browser-verify all Academy durations, member enrollment, private progress and account-switch isolation`.
- Assertion: `Previous account drafts must never appear in a new member session` at `tests/test_v014168_academy_browser.mjs:184`.
- Follow-up source repair [292f14c](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/commit/292f14cde14e) clears previous account's hidden DOM, day links, related content, reflection and self-check fields, and bumps the epoch to reject late responses.
- **NOT YET TESTED on a stable exact commit**: do not assert this has passed until a new Sitewide run executes the browser test successfully.

## Social workflow
- [Social acceptance run 40280687768](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/actions/runs/40280687768) **success** on SHA `7e11f015b828`, after the last modifications of source social APIs, tests, and its dedicated workflow.
- Passed stages: syntax and zero-cost social security, plus existing Ads regression. This is automated source QA, not production Owner-authenticated acceptance.
- Do not conflate this with overall sitewide Playwright acceptance.

## Exact-commit release gate
1. Run the repaired Sitewide workflow against an exact fixed commit; prefer an isolated manual dispatch or a deliberate job re-run (`run_attempt>1`).
2. Require both website Playwright (including Academy account-switch and four-width social browser test) and Stripe mocked/noncharging jobs to conclude `success`.
3. Verify Cloudflare Pages is active at the **same** tested SHA; do not equate active deployment and green CI when they refer to different commits.
4. Verify Owner and anonymous/non-Owner social API behaviors in the production environment without bypassing sign-in/CAPTCHA.
5. Preserve answer-key confidentiality, Lab ID continuity and member data.

## Independent curriculum gate
Read-only Supabase evidence on 2026-10-26: 419 Lab registry rows; 94 unreviewed instruction records; 439 draft assessment-set records; zero Academy enrollments. These records cannot be certified as member-ready based solely on a source test. See [issue #142](https://github.com/cybernexuspublishing/stock-market-from-the-ground-up/issues/142).

## Rollback
This change is **documentation only**; remove/revert this document if no longer relevant. The concurrency repair can be reverted by restoring the workflow YAML from its prior SHA; it changes CI behavior only, not database, payment, or member records.
