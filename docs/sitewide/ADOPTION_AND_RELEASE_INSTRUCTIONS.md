# Adoption of Owner Sitewide Rules — Add-Only Initial Engineering Change

## File control

**Google Drive location:** Not assigned; no Drive file or document ID has been created.  
**Repository:** `cybernexuspublishing/stock-market-from-the-ground-up`  
**Target branch:** `main` after Owner review  
**Revision:** `v0.14.0.17` rule foundation (not a new deployed website release)  
**Status:** Local staged, tested governance files; NOT uploaded or deployed.  
**Date:** 2026-10-14  
**Purpose:** Make both Owner specifications formally accessible to developers, code assistants and release automation, and begin structured sitewide implementation with baseline audit and traceability.  
**Dependencies:** Existing GitHub repository; Python 3 for audit; GitHub Actions for optional CI; no new paid services.  
**Source inputs:** Two complete Owner-approved specification documents retained verbatim.  
**Required new file:** Yes; rules, traceability, audit and CI files are new. No original website scripts are replaced in this stage.

## Installation — Owner controls GitHub manually

1. Review the local `main` source and confirm the release SHA; GitHub main HEAD was `fd378aa2…` during this audit, while `PROJECT_MANIFEST.json` still named v0.14.0.16.
2. Extract the **version-prefixed ZIP** directly into the current repository root, preserving paths. It contains new files only, apart from `PROJECT_ADVANCED_ENGINEERING_RULES.md`, which is **byte-identical to the existing GitHub file** and may be skipped.
3. Inspect GitHub Desktop's change list. Do not overwrite active site JavaScript, HTML, CSS, SQL migrations or configuration based on an old repository archive.
4. Run `python3 scripts/sitewide_governance_audit.py --root .`. It reads the rules and checks existing protected build paths; it does not modify the repository or contact external services.
5. Commit/push only if you approve making the rules part of GitHub. **Important:** a push to the production-connected branch can independently trigger Cloudflare Pages automatic deployment, even though the added GitHub Actions workflow itself does not deploy. If you want to keep this version undeployed, do not push yet or use a separately configured nonproduction branch. No Cloudflare deployment or Supabase SQL was performed by this deliverable.
6. The new GitHub Actions check will run only **after the workflow has been committed**; the workflow has read-only repository permission and runs the established Pages build without deploying. If validation fails, correct the actual defect rather than bypassing the guard.
7. Continue engineering against the **exact current source**, applying controlled isolated patches with end-to-end tests and releasing one reconciled ZIP when appropriate. Verify Cloudflare preview and Supabase read-only preflight before a production rollout.

## QA and artifact boundaries

Tests executed: `tests/test_sitewide_governance.py` (valid rules; detects injected private authored-Lab JSON; detects altered specification rows); governance integrity check on staged files; archive integrity test and SHA-256 manifests. **Tests not performed:** Live Supabase, authentic user RBAC, payment billing, Cloudflare preview/production deployment, visual WCAG manual audit and full 556-file line-by-line application review.

**Rollback:** Remove newly added rules/governance files and GitHub workflow commit. No schema or member records are changed by this stage.

## Version and naming rules

ZIP filename begins with `v0.14.0.17_`; contents use stable unversioned runtime names and descriptive document titles. Do not duplicate active runtime files with version suffixes. Original Owner specification source files retain their descriptive source names under `docs/sitewide/` for auditability.
