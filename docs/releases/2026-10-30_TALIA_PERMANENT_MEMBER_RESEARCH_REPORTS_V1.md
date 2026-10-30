# Crownlight Talia — Permanent Member Research Reports V1

## Document control
| Field | Controlling value |
|---|---|
| Project | The Stock Market: From the Ground Up |
| Owner / imprint | Crown & Lantern Press |
| Document ID | SMFGU-TALIA-PERSIST-001 |
| File | docs/releases/2026-10-30_TALIA_PERMANENT_MEMBER_RESEARCH_REPORTS_V1.md |
| Type | Markdown |
| GitHub | cybernexuspublishing/stock-market-from-the-ground-up / main |
| Google Drive location | Proposed: SMFGU / Website / Learning / Talia / Research Reports / Releases; not uploaded |
| Google Drive document ID | Not assigned |
| Version | 1.0 |
| Date | October 30, 2026 |
| Source status | Implemented on main; production verified only against exact confirmed deployment |
| Acceptance status | Production build and database security tests available; true authenticated Free and Advanced browser acceptance remains open |
| Related specification | SMFGU-TALIA-WL-RESEARCH-V4-001 |
| Dependencies | Supabase Auth, production profile and flags, Cloudflare Pages Functions, existing Free/Advanced Watchlists, existing Talia V4 curriculum |
| Purpose | Restore permanent, account-scoped Talia research checkpoint history and report metrics without conflating practice with official competency |

## Owner decision
Implement an existing-product capability at **no new recurring price or Lumen charge**. Both the Free Research Watchlist and an entitled Advanced Watchlist use the same Talia report service; the existing Free 20-symbol quota and Advanced workbench entitlement are unchanged. This is **not** a new market-data service, paid tier, brokerage order flow, official exam or second reward currency.

An educational checkpoint is a member-authored evidence note. "Permanent" means the record survives browser reload, tab closure and session expiry until the member explicitly deletes the full report, the member account is deleted, or a future approved data-retention policy applies. It does not mean legally immutable or guaranteed indefinite retention outside existing backup/recovery operations.

## Data design
1. \`public.gu_talia_watchlist_checkpoints_v1\`: append-only checkpoint history. Compound \`(user_id,event_id)\` primary key makes save retries idempotent. Server timestamps, topic, one of eight research actions, the corresponding one of four skill dimensions, member reasoning, self-identified misconception, optional member-selected ticker, fictional scenario and revealed-bar cutoff are recorded. The supplied ticker is **not** mapped to fictional prices or treated as source verification.
2. \`public.gu_talia_watchlist_reports_v1\`: server-maintained, one-row-per-member report containing all-time attempt count, counts by Knowledge/Recognition/Decision/Process, counts by misconception and topic, first/last saved timestamps and an explicit \`MEMBER_REPORTED_UNGRADED\` data status. One database trigger updates the report transactionally on each newly inserted checkpoint.
3. Deletion RPC \`public.gu_talia_watchlist_clear_v1\`: service-role-only, transactionally deletes the member's checkpoints and summary. Account deletion cascades to these records.
4. Explicit database RLS \`SELECT\` policies only allow the authenticated owner to read their own rows. Direct client INSERT/UPDATE/DELETE privileges are revoked; the browser cannot supply \`user_id\` to the API.

**Not created:** official scores or mastery, skill-badge awards, algorithmic trade rankings, market data samples, purchase transactions, a second Journal, or new wallet balances.

## API security and behavior
\`functions/api/talia-watchlist-reports-v1.js\`:
- \`GET\` returns the signed-in user's complete all-time rollup and one paginated history page (100 maximum). The UI can request older pages without pretending the latest page represents all saved attempts.
- \`POST\` checks bearer identity using the existing production \`toolAccess('MARKET_SIMULATOR')\` Free-eligibility contract, profile/account restrictions, same-origin mutation, strict allowlisted fields and length/enum/UUID constraints. It inserts exactly one immutable checkpoint, then returns the canonical saved record and refreshed summary.
- Duplicate \`event_id\` requests do not increment totals. An attempt to reuse the ID with changed values returns a conflict.
- \`DELETE\` requires explicit text confirmation in the member's own browser, authenticated status and a server-only clear RPC.
- All responses are private, no-store, no-index and omit Supabase service credentials. Server-side Service Role remains in Cloudflare secrets, not JavaScript.
- Ineligible, restricted, showcase, unauthenticated and cross-origin requests fail closed.

## Member interface
\`assets/js/watchlist-talia-workstation-v4.js\` now:
- Loads the member's server report after a verified session is available.
- Persists the reasoning note *only* after a successful server acknowledgement; a network/storage error is never reported as saved.
- Uses an idempotent per-note UUID for same-content retries.
- Restores saved checkpoints and all-time four-dimension and misconception counts across sessions, with Load Older and Refresh actions.
- Provides explicit Delete All functionality after a confirmation dialog.
- Clears the private displayed state on logout/account switch and checks identity before and after requests.
- Offers manual clipboard copying; the exported text is limited to currently loaded detailed records while the summary contains the all-time totals.
- Preserves the existing 27-topic curriculum, ungraded eight research actions, nine-stage protected Labs, original ECharts fictional samples and all free explanations.

## Tests and independent evidence

**Database migration:** \`supabase/migrations/20261030_talia_watchlist_reports_v1.sql\`. Applied to primary project \`oxihglyfgzywsupnyicb\` on October 30, 2026.

**Database checks executed:** RLS enabled on both tables; one owner-read policy per table; authenticated SELECT allowed but INSERT denied; anon SELECT denied. A rollback-only SQL fixture verified transactional rollup, duplicate-ID deduplication, report clearing and private ownership. A second rollback-only role-based fixture demonstrated that a different authenticated account cannot read another member's checkpoint/report, while the rightful member can.

**Repository regression:** \`tests/test_talia_watchlist_persistence_v1.mjs\`, added to \`scripts/build-pages.sh\`. Includes mocked authenticated request routing, member scoping, cross-origin rejection, schema whitelist, duplicate retry, conflict, explicit deletion and front-end persistence wiring.

**Cloudflare release gate:** Confirm latest deployment against the exact main commit and ensure both the existing 27-topic Talia V4 regression and the new persistence regression pass. This document does not substitute for authenticated browser confirmation.

## Open acceptance and governance
- **Free signed-in browser acceptance**: save two checkpoints; reload; change devices/sessions; verify restored reports and notes; verify old data invisible after logout, sign-in change, suspension and deletion.
- **Advanced authenticated browser acceptance**: same report available to the *same* member from the entitled Workbench, without granting Free users unauthorized premium tools.
- **Accessibility**: keyboard/tab order, screen reader announcements, long notes and mobile report layout.
- **Privacy notice and retention review**: member-authored decision notes are private account data. Review published privacy disclosures, export and retention policies with the appropriate professional before asserting legal compliance.
- **No verified live P&L or historical signals**: official Lab mastery still requires separate protected assessment evidence.

## Revision history
| Date | Version | Change | Approval |
|---|---|---|---|
| 2026-10-30 | 1.0 | New immutable member checkpoints, transactional stored rollup, authorized API, shared member UI, database security tests and production build gate | Acting Owner delegated routine noncommercial implementation decisions |

**Footer:** SMFGU-TALIA-PERSIST-001 · Version 1.0 · Crown & Lantern Press · Not an independent regulatory or attorney review.
