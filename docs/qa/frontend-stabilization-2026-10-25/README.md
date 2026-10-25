# Frontend stabilization — 25 October 2026

Project: The Stock Market: From the Ground Up. Branch: main.
Release identifier: frontend-stabilization-2026-10-25 (commit-scoped; no global version change).
Baseline: eb4b0fd00c7bcf7624add515cd68d3206a4e509e.
Status at commit: local verification passed; production deployment/behavior pending.
Purpose: repair confirmed shared initialization/accessibility defects and restore meaningful QA.

## Confirmed defects and corrections

| Requirement | Evidence and defect | Correction |
| --- | --- | --- |
| Master §§6, 26, 34 | Production Learn and Dashboard expose two keyboard bypass links; build uses class and runtime checked ID only. | Runtime reuses the existing link and maintains its main-landmark target. |
| Master §§6, 8, 23, 34 | Production console reports multiple GoTrue clients sharing one storage key; concurrent callers race across dynamic import. | One shared in-flight initialization, with retry after failure. |
| Master §§5.6, 26, 34 | Built-static Admin provider-failure notice expands mobile document to 435px at 390px. | Long notice text wraps within existing shared composition stylesheet. |
| Master §§28, 34 | Premium source test fails to parse due to duplicate const declaration. | Remove duplicate declaration, retain all assertions. |
| Master §§11, 34 | Premium live run 40214793264 falsely fails on expected Commons sign-in redirect. | Verify same-origin sign-in form, layout, return destination, protected content exclusion and containment. |
| Master §§28, 34 | Runs 40216868397 and 40216868364 fail because historical mocks omit the new founder eligibility RPC. | Explicit ordinary-member, zero-discount fixture response. Production financial code unchanged; five founder safety cases pass. |

## Executed local verification

- Build: `bash scripts/build-pages.sh` — PASS, 458 static files; protected sources excluded.
- Browser: `python tests/test_frontend_stabilization_browser.py` — PASS, six pages × 1440/900/390, device scale and visual viewport scale 1; one keyboard-first skip link, valid landmark, document containment. Screenshots generated for all 18 cases.
- Shared client: `node tests/test_supabase_client_singleton.mjs` — PASS, 12 concurrent callers share initialization, failure shared, retry succeeds, one client created.
- Premium shell, build skip-navigation idempotency, route contracts and correlated-OID regression — PASS.
- Store inventory, Owner overlays, public visibility, Owner storefront acceptance, display contracts — PASS (five suites).
- Historical checkout fulfillment/recovery mocks and founder full-price safeguard — PASS; all provider calls mocked. No payments performed.
- Stable billing endpoint, forum direct-DML boundary and Owner delivery governance — PASS.
- Governance audit — 16 passes, zero errors, one pre-existing version-metadata warning.
- Syntax checks and diff whitespace checks — PASS.

The built-static browser fixture returns unavailable responses for APIs and external services. It does not execute Cloudflare middleware or authenticate a member/Owner. Production reachability from local Chromium failed with ERR_EMPTY_RESPONSE; this is not counted as a website failure or test pass. Cloud browser independently inspected production Learn, Dashboard and the Commons sign-in redirect.

## Integration and limits

Cloudflare plugin confirmed baseline deployment c50e0e2c-c8aa-4190-bedc-2bdc3d32997f succeeded for baseline SHA. Supabase plugin reports existing project ACTIVE_HEALTHY; security advisories remain unaccepted. Stripe plugin confirmed separate TEST and LIVE account contexts; no payment write or price inspection/change performed.

No database/API contract, role, entitlement, pricing, LIVE switch, Lab definition or competency definition changed. No SQL migration required. Browser QA now runs the new singleton, source, build and offline browser checks before production checks, and uploads screenshots as workflow artifacts.

Remaining gates: CI and deployment for this exact commit; production behavior readback; authenticated member/Owner save/readback; genuine Stripe TEST lifecycle; security-advisory review. Production website-design API returned HTML to the theme client during cloud-browser inspection; this remains a separately recorded integration issue, not repaired or certified in this release.

Rollback: revert this commit through main and the existing Cloudflare pipeline. No data migration or payment rollback required. Do not relax launch gates to make tests green.
