# v0.14.0.19 — Sitewide Frontend Completion Candidate / Controlled Corrections

| Control field | Record |
|---|---|
| Company | Cyber Nexus |
| Product | The Stock Market: From the Ground Up |
| Repository | cybernexuspublishing/stock-market-from-the-ground-up |
| Source baseline | `main` commit `15ae62ce590325434bedcba1789e4df76c91d72e` |
| Version | v0.14.0.19 |
| Status | **Source QA passed, production frontend final acceptance NOT PASSED** |
| Prepared | October 14, 2026 (America/Chicago) |
| File type | Direct-upload nested source ZIP; full replacement files, not a patch script |
| Installation | Extract over the **same repository** keeping all unrelated files, review changed files, commit, then validate deployment |
| Document control | Development record, rev. 1; owner production approval not recorded |
| Google Drive location | Not placed in Google Drive |
| Google Drive document ID | Not assigned |
| Backend dependencies | Existing Supabase Auth, Commons RLS, 2026-10-14 reporting policy migration candidate, Cloudflare Pages Functions |
| Production deployment | Not initiated in this delivery |
| SQL execution | None |
| Destructive operations | None |

## Corrected in source

1. Preserves v0.14.0.18 separate-tab discussion composer, including authenticated RPC and existing Supabase permission boundaries.
2. Intercepts legacy Forum 'Create topic' action rather than opening the retired inline entry form. Legacy route ordinarily redirects to Commons; both routes remain supported.
3. Replaces the prior speculative last-reply navigation with a one-submission, server-RPC-based reply flow. Returned IDs, if present, become permalink anchors; otherwise an authenticated author's exact published content is used to correlate the reply, and count determines final page. No claim of posted content when RPC reports an error. Ambiguous post-acceptance failures do not automatically resubmit.
4. Adds URL-selectable reply anchors, focus, and navigation support for new and previously rendered Commons posts.
5. Adds accessible verified mention picker and typed `@` autocomplete. The Cloudflare Function searches *only recently published contributor names visible through the logged-in member's Supabase RLS*, not a global member directory, email, or staff account list. No notification delivery is implied. Contributors who have never visibly posted will not appear.
6. Adds sitewide semantic repair for known unlabeled search/filter fields, keyboard skip link, focus indicators, wrapping and reduced-motion treatment. This is not a WCAG certification.
7. Adds a read-only Admin interface integration-check console under System, using established permissions and authenticated data. These tests cannot write account, reporting or payment records.
8. Protects v0.14.0.19 service-worker versioning and retains no-private-page CacheStorage behavior.
9. Adds a new GitHub Actions frontend-source contract workflow; branch protection and full E2E status checks still require Owner configuration.
10. Adds a **report-only**, non-enforcing CSP trial that must be reviewed before script or connect directives are enforced.
11. Preserves KDP Select direct eBook exclusivity, checkout disabled-state rules, and earlier v0.14.0.18 unverified-payment-status copy.

## Tests run in an isolated source directory

- `python tests/test_v014019_frontend.py` — PASS, Node syntax and structural/security guards.
- `node tests/test_v014019_mentions.mjs` — PASS, requester authorization, public contributor filtering and no global profile enumeration.
- `python tests/test_v014019_browser.py` — PASS, isolated Chromium 320px component test with mocked URL/redirect and Supabase: mention selector; rejection of legacy prompt handler; exactly one publish RPC; reply target/pagination contract.
- ZIP member integrity and SHA256 manifest verification — required before release link is issued.

**These are isolated unit/component checks, not actual Cloudflare, full-site accessibility, Supabase staging, staff-role penetration or live payment tests.** No live database query has been executed through production credentials.

## Known open release gates

- Existing SQL candidate for owner-controlled reporting limits must be preflighted, staged, migrated once and postflighted. Toggle UI alone is not proof of server enforcement.
- Notification delivery, mention preferences/opt-outs, per-thread subscriptions, verified polling, attachments, moderation workflows and cross-role authorization must be implemented/integrated as backend work. Do not show fake confirmations for nonexistent capabilities.
- Global limits registry is broader than the reporting quota module. Owner must retain control and non-overridable provider limits must remain truthful.
- All 419 lab identifiers, original source provenance, answers, grading and no-lookahead replay need authenticated acceptance against owner-approved curriculum.
- Admin and moderator workflows, paid entitlement lifecycle, KDP links, website publishing/domain separation, and verified webhook processing require backend and staging evidence.
- Legacy middleware still adds older build labels; this version normalizes browser-visible labels after loading but does not itself change middleware. Root `PROJECT_MANIFEST.json` and `RELEASE_MANIFEST.json` have not been overwritten because their existing content cannot be safely superseded with a partial reconstruction.
- Only automated basic component checks have passed. Final full-source browser/accessibility test matrix and exact Cloudflare deployment parity remain unverified.
- GitHub default branch protection and mandatory multi-role CI release gates are not enabled by this ZIP.

**Release recommendation: DO NOT certify the entire frontend as finished until the remaining frontend-level blockers and live acceptance are resolved. Backend contract work can proceed without treating unverified features as complete.**
