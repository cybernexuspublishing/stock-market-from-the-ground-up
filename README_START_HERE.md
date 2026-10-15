# The Stock Market: From the Ground Up — v0.14.0.22 Backend Phase 3

**DIRECT-UPLOAD ZIP:** extract its nested files into the EXISTING `cybernexuspublishing/stock-market-from-the-ground-up` repository, preserving all unrelated files. This is the SAME overlay format as earlier releases: no ZIP-in-ZIP, batch script, Git patch, or automatic SQL execution.

**Baseline verified:** v0.14.0.21 GitHub `main` commit `ff458899ac4ce7a8126e2dab67d237f0ff9197ed`.  
**Current release:** v0.14.0.22.  
**Production database:** no DDL/DML changes; only two optional **read-only** SQL queries included.  
**Production status:** source delivery only; no Cloudflare/Supabase action was performed by packaging.

### Files and corrections

- Repairs **failing frontend CI** caused by old v0.14.0.18/v0.14.0.19 *version literals*, without removing the previous feature/security assertions.
- Adds strict v0.14.0.22 release/runtime/security gates, plus GitHub workflow for backend source and API tests; includes offline Chromium tests of a persisted save followed by a lost HTTP response.
- Reconciles follow/unfollow and notification preference UI after an interrupted save response using authenticated read-back, never a blind retry. This prevents false success/failure notices.
- Aligns client config, shared route policy, service-worker cache, and public build labels to v0.14.0.22.
- Adds a single-row permission/trigger/RLS verification SQL and a separate read-only aggregate notification-delivery query.
- Documents real two-member staging acceptance and sitewide unresolved release gates. No pretend complete backend.

### Safety rules

Do NOT run old SQL migrations again; v0.14.0.20 and v0.14.0.21 objects were reported installed. All v0.14.0.22 SQL is read-only. Do not change existing members, plans, KDP Select restrictions, historical training source, book text, permissions or platform entitlements. The optional prior v0.14.0.17 forum/reporting migrations remain review-gated.

### Before claiming complete

GitHub workflows must pass for the exact new commit, Cloudflare must deploy the same SHA, and live staging two-member role/notification tests must pass. The backend is **not** production-accepted merely because a source test passes.
