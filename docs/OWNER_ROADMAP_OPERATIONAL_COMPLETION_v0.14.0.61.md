# Owner Website Roadmap — Operational Completion Pack v0.14.0.61

| Document control | Value |
| --- | --- |
| Organization / product | Cyber Nexus — The Stock Market: From the Ground Up |
| Project | Companion Learning Website · Owner Roadmap |
| Document ID | GU-WEB-OWNER-ROADMAP-014061-20261018 |
| Filename | `OWNER_ROADMAP_OPERATIONAL_COMPLETION_v0.14.0.61.md` |
| File type / location | Markdown — `docs/OWNER_ROADMAP_OPERATIONAL_COMPLETION_v0.14.0.61.md` |
| Google Drive folder / file ID | Unassigned; no Drive document created |
| Version/date | v0.14.0.61 / October 18, 2026 |
| Source baseline | `main` at `83844724c7be06f1544fcd7689032cabf2007ab2`, v0.14.0.60 |
| Lifecycle | Development candidate; GitHub checks and runtime acceptance recorded separately |
| Responsibility | Delegated website engineering/project review; only authenticated OWNER may accept database writes |
| Purpose | Complete safe roadmap-source improvements, preserve all owner decisions, and defer acceptance testing and any required Supabase execution until the end. |

## Locked decisions retained

- The latest authoritative eight-product catalog, four membership checkout locks and four tool entitlements remain exactly as reviewed. Eight TEST-reference matches in Supabase do **not** certify Stripe LIVE prices; the release manifest preserves the distinction between Owner TEST evidence and automated full LIVE acceptance.
- Full Platform Monthly, Annual, Lifetime, OnDemand Monthly and the four a-la-carte tools retain their existing provider-independent controls. No plan, price, enrollment, subscription, trial, library entitlement, or Stripe LIVE gate is changed.
- `v0.14.0.60` GU58 membership lifecycle acceptance used disposable PostgreSQL 16. It does not prove real customer payment-to-entitlement integration in deployed Supabase.
- The OWNER / SUPER ADMIN role remains the sole reader/writer of authenticated checklist data. Owner-delegated technical source reviews are visibly distinct from authenticated Owner approvals. Existing Supabase-saved Owner progress takes precedence.
- Five canonical books, controlled v1.14 approved Foundations curricula, KDP Select restrictions, Market Commons authoritative write controls, SHOWCASE isolation and staff MFA policy remain unchanged.

## Repository and production observations

The original private registry contains 281 primary items and 1,815 historical source/trace records (2,096 entries). On October 18, the Owner added 94 additional current commitments in a separate version-controlled source, so the operational register has **375 primary items, 1,815 source/trace items and 2,190 total entries**. No original historical record is deleted, renamed, deduplicated without record, or bulk-marked completed.

Roadmap HTML, CSS, client code and Cloudflare Pages Function are already available. The production public release metadata before this update displayed `v0.14.0.60`, GitHub commit `83844724...`, and `customerCheckoutApproved=false`. The non-authenticated API was expected to deny access; no private Owner token or Cloudflare/Supabase secret was obtained for a real owner write test.

## v0.14.0.61 Owner Roadmap source deliverables

1. **Protected coordinated action queue.** Four operational lanes: current integration, source implemented and requiring acceptance, blocked dependencies, and future backlog. Each lane opens the exact original requirement; no invented status or database migration is implied. The original 2,190 records stay searchable.
2. **Traceable progress and delegated decisions.** Owner-progress totals distinguish an actual Owner-saved confirmation from a dated delegated GitHub source assessment. Manually saved state remains authoritative and is never silently overwritten by changes in the engineering review source.
3. **Live release provenance display.** The page reads the deployed public `release-manifest.json` with a no-store request and shows version plus short SHA. This is deployment evidence, not evidence of successful payments or security acceptance.
4. **Sorting and filtering.** Priority-first, original order, work area, stored status and most recent Owner change; independent filters by engineering stage, decision origin and workstream. Clear-filters and exact task navigation are available without another workflow or separate report.
5. **Accessible interface.** The owner dashboard remains responsive, supports keyboard left/right/home/end navigation between tabs, and provides focused task links, accessible action controls and visible provenance.
6. **CSV and JSON exports.** Exports preserve raw archived requirements and saved notes, including separate stage/approval origin. CSV escapes spreadsheet formula-leading content to avoid inadvertent spreadsheet execution. No public static registry is exposed.
7. **Concurrent-Owner edit protection.** The API issues an opaque revision and uses PostgREST's existing `site_settings.updated_at` to reject stale writes with HTTP 409. A new entry is inserted only if its key is not already present; existing updates require a matching timestamp. No schema migration is required for these changes.
8. **Protected validation.** Custom tasks cannot be modified after archive; a task may be labeled `Evidence verified` only after the Owner records a meaningful acceptance note (minimum 20 characters). Backend authorization, account-kind and status checks remain in place.
9. **Configuration parity.** `release-manifest.json`, `config.js`, `sw.js`, `assets/js/route-policy.js` and `data/commerce-config.json` synchronized to v0.14.0.61 without activating checkout.
10. **Owner action handoff.** A read-only Supabase metadata/RLS/permission inspection is prepared at `supabase/preflight/v0.14.0.61_OWNER_ROADMAP_READ_ONLY.sql` for the final integration test. It does **not** mutate tables or permissions and need not be run to deploy these source-only UI/API changes.

## Explicitly unresolved: do not mark complete

| Priority | Dependency or remaining acceptance | Owner action needed after code/source work |
| --- | --- | --- |
| P0 | Confirm Owner API can load all 2,190 items and save/reload; role-negative endpoints deny ordinary Admin/SHOWCASE and disabled Owner | Open deployed Roadmap as OWNER and confirm test records; if an API error occurs, share sanitized network status or run prepared read-only SQL |
| P0 | Admin audit writes in `admin_audit_log` are **best effort**, not an atomic database transaction with progress update | Future database RPC/migration requires approved preflight and Supabase SQL review; audit warning already displayed if storage works but audit insert fails |
| P0 | GU58 staging checkout-to-real-member lifecycle and Stripe TEST price binding | Separate controlled staging/Supabase tasks; all real charges remain locked |
| P0 | Production Supabase role/status rows, RLS and schema | Owner read-only `v0.14.0.61_OWNER_ROADMAP_READ_ONLY.sql` output; run at final acceptance, not before |
| P1 | Screen-reader, touch, zoom, session expiry, multiple tabs and simultaneous Owner save conflict handling | Last-phase real-browser acceptance; do not infer from code or CI |
| P1 | Historical market data, Lab rubrics, AI Tutor, Journal, Simulator, Market Commons notifications, KDP downloadable rights, backups and 24/7 monitoring | Preserve roadmap as separate future acceptance tasks; do not grant paid rights or mark completion |

## Security and risk record

**Caution: audit events are not yet atomic with checklist writes.** An otherwise successful Save may show an audit warning. This is not silently treated as success. Implementing an atomic Owner-RPC transaction would be a separate reviewed Supabase migration; it is not secretly applied in this frontend release.

**Concurrency:** stale Owner writes are rejected rather than silently overwriting the other Owner. An HTTP 409 means refresh the private status from Supabase and reapply the decision deliberately. The API must never fall back to localStorage or unsaved simulated Owner status.

**Proof of acceptance:** GitHub tests/builds show source correctness only. Full feature-completion and regulated commercial operation require provider, live database, and potentially licensed-professional review. A delegated checkbox cannot activate commerce or waive copyright/tax/privacy policies.

## Final verification sequence — execute after all requested source work

1. Run the new unit/contract tests for approved source decisions, 2,190 records, Owner/non-Owner, legacy and modern Supabase headers, concurrent edits, archived cases, CSV escaping, and client accessibility controls.
2. Run all applicable GitHub Actions and static Cloudflare Pages build contracts.
3. Confirm the deployed Cloudflare manifest version/commit and HTML page; verify a signed-out GET to `/api/owner-roadmap` returns 401 and `/functions/_lib` files return 404.
4. Only then ask the Owner to verify private signed-in save and concurrent Owner edit behavior; run the prepared Supabase read-only SQL only if needed to diagnose installation or policy.
5. Continue full website validation after development is complete. No real customer checkout is authorized by this Owner Roadmap release.

## Revision history

| Date | Version | Change | Status |
| --- | --- | --- | --- |
| 2026-10-18 | 0.14.0.61 | Complete prioritized Owner Roadmap workflow, independent status provenance, safe export, no-schema concurrency and controlled handoff | Development source complete; QA/production acceptance remains a separate record |
