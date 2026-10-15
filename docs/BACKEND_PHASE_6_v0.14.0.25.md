# v0.14.0.25 — Backend Phase 6 | Audited Report History and CI Correctness

**Document ID:** GU-WEB-BE-20261015-006  
**Owner:** Cyber Nexus  
**Application:** The Stock Market: From the Ground Up  
**Status:** Candidate; production DB migration review and role E2E pending  
**Source SHA:** `7c03889561979cc67b28ec280449311e2493d40d`  
**Release method:** Direct-upload GitHub source overlay; preserve unrelated files.  
**Document storage:** Attached to release ZIP. No Google Drive file assigned.

## Changes

- CI: v024 workflow had a red browser step because it omitted a Playwright/Chromium install step. Added explicit pinned package and browser installation with system dependencies; v025 workflow applies the same setup. This is a likely root cause but requires post-deployment GitHub rerun to confirm. CI checks are retained, not silenced.
- Version: v025 config, route policy and service-worker cache synchronized. Historic v024 source test now dynamically accepts later release versions while preserving functional/security assertions.
- Audited moderator UX: existing v024 report queue now has 'View decision history'. Status transitions are not edited through the new control. Accessible lazy read; note display is text-only and safe against HTML/script injection.
- Backend: new JWT-bound GET endpoint calls only `gu_mod_case_history_v01425` via caller's auth; **no service-role token**. Whitelisted fields only. Always `no-store`.
- SQL: reviewed-additive candidate creates one SECURITY DEFINER read-only RPC reusing v024 staff authorization. Only v024 transactional case audit actions are included; no reporter IDs, staff IDs or non-case audit records are returned. No table writes except function installation.
- Verification: SQL read-only pre/postflight, Node API role-negative mocks, isolated Chromium security/layout regression and source validations.

## Security and audit boundary

This release does **not** fix the older admin endpoints that update a report and write its audit record in separate operations. Historical records created via those endpoints are not guaranteed atomically audited and intentionally do not appear as v024 case transitions. Do not overstate sitewide moderation audit integrity. The correct follow-on is endpoint consolidation, a carefully reviewed action table, and same-transaction Postgres RPCs; avoid a global API middleware interception without careful deployment tests.

## Acceptance criteria

The new GitHub v024/v025 workflows pass (including Chromium). Supabase staging migration compiles and permissions are correct (`authenticated` has EXECUTE but actor check denies unauthorized members; `anon` lacks EXECUTE). Browser with OWNER and moderator can read sanitized history. Normal members, Showcase, suspended users and signed-out sessions cannot. No private identity or arbitrary metadata are returned. History displays only after user click; a missing database function gives a clear error without false success. Production changes require explicit authorization after staging.
