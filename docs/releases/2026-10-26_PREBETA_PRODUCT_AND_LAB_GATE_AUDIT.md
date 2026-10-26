# Founding 600 — Pre-Beta Product and Lab Release Gate Evidence

| Control | Value |
| --- | --- |
| Project | The Stock Market: From the Ground Up |
| Publisher | Crown & Lantern Press / Cyber Nexus |
| GitHub location | `cybernexuspublishing/stock-market-from-the-ground-up`, `main` |
| Filename | `docs/releases/2026-10-26_PREBETA_PRODUCT_AND_LAB_GATE_AUDIT.md` |
| Type | Markdown |
| Document ID | GU-PREBETA-PRODUCT-LAB-GATE-20261026 |
| Version | 1.0 |
| Prepared | 2026-10-26 |
| Status | PRODUCT COPY PROVEN; LAB PUBLICATION SOURCE IMPLEMENTED, CI AND MEMBER ACCEPTANCE OPEN |
| Google Drive | Not assigned; no Drive file or document ID created |
| Dependencies | Existing founder plan contract, Store catalog, Supabase Auth and private Lab sets, shared Engine v3.2/v3.3, GitHub main, Yahoo Cloudflare Pages, Founding 600 genuine member accounts |
| Purpose | Preserve evidence-based acceptance and rollback for the authorized zero-spend pre-beta corrections without enabling LIVE payments or unapproved instruction |

## Roles and release constraints

Reviewed as Owner technical delegate, commerce architect, PostgreSQL release engineer, authentication/API engineer, curriculum release manager, assessment auditor, QA engineer and market-data licensing reviewer. LIVE Stripe accounts, products, prices, billing, webhooks, transactions, refunds and launch flags remain out of scope. No fabricated sign-in, historical bars, member progress or human editorial approval.

## Finding A — Incorrect 60-Day public Store contract (HIGH)

**Before:** `gu_founder_plans_v014173` contained the Owner-approved 15% purchase benefit (1500 bps), but `gu_storefront_items_v014174` still presented the obsolete 20% benefit for `founding:FOUNDING_60`.

**Remedy:** One-row, expected-content and commercial-release-gated migration `supabase/migrations/20261026_founding60_store_copy_15pct_alignment.sql`. The owner-authored 60-Day $59.99 / 60-day plan remains unchanged. Correction records a system audit event, increments the display revision, and leaves sale-ready and all payment switches OFF.

**Provider evidence:** Migration `20261026071638` successfully applied in the one existing Supabase project. An independent SELECT verified exact approved public description, 5999 cents, 60 days, 1500 bps, one correction audit row, `sale_ready=false`, and all founder enrollment/billing/fulfillment switches false.

**Rollback:** `supabase/rollbacks/20261026_founding60_store_copy_ROLLBACK.sql` is a guarded emergency *fail-closed hide*, not a return to the knowingly incorrect 20% offer. Do not execute routinely. Preflight: `supabase/admin/20261026_founding60_store_copy_PREFLIGHT_READ_ONLY.sql`.

**Owner decision:** Database copy correction **PROVEN and accepted**. Real customer purchase/benefit fulfillment remains **NOT ACCEPTED**.

## Finding B — Public Lab publication could omit 336/83 and lesson editorial review (HIGH)

**Before:** `functions/api/lab-release-availability.js` required a reviewed grading-set record and existence of a private lesson row, but did not restrict to the owner-selected 336 beta candidates or reject unreviewed lesson source statuses. Such conditions would permit a premature Start action after unrelated grading approval.

**Remedy:** Reuse the existing authoritative `functions/_lib/lab-beta-scope-v014286.js` candidate membership check and require an explicitly recognized editorially reviewed/approved/published private lesson status before including any published ID. An empty/missing/incomplete readiness response fails closed; private questions, keys, and content are not returned. Scope metadata still says `betaReadyCertified:false`.

**Source changes:** `functions/api/lab-release-availability.js`, `tests/test_lab_beta_publication_gate.mjs`, and existing `.github/workflows/bootcamp-v014144.yml`. No DB changes, new canonical Lab IDs, new grading service, member data mutation or achievement grant.

**Independent read-only data verification:** Current Supabase has 419 canonical active/visible Labs; 94 private instruction rows (all `original_hypothetical_unreviewed_v01496`); 439 grading-set versions spanning 419 Lab IDs; 0 reviewed grading versions; 30 competencies; 0 Academy enrollments/progress rows. Existing static scope of 336 candidates and 83 upcoming was compared against actual ordered platform_labs rows and matched exactly, without overlap.

**QA evidence:** A deterministic no-network Node regression test was written and wired into Boot Camp CI for selected, draft, upcoming, upstream 503, and method 405 cases. **The new CI test execution is NOT YET PROVEN** at this release memo. An attempted local full-repository checkout failed due external DNS, not an application test failure. No authenticated production session was run.

**Owner decision:** Publication gate **IMPLEMENTED, NOT TECHNICALLY ACCEPTED** until exact-head CI, Cloudflare runtime, editorial-status authoring workflow, and genuine member tests pass.

## Gate 1 — Truth5 and B01, genuine read-only assessment evidence

Executed existing SQL review queries `supabase/reviews/2026-10-26_B01_v97_feedback_audit_read_only.sql` and `supabase/reviews/2026-10-26_GATE1_FOUNDING600_B01_PREFLIGHT_READ_ONLY.sql`. All 20 B01 sets contain version 97, exactly six unique questions, five choice questions, one numeric question, complete private-key *shape*, valid unique choices, case/limitation feedback and expected individualized placeholders replaced with topic-specific drafts. All twenty remain `draft`, with no attributable reviewer or independent editorial approval and no authentic beta journey. Structural checks **PROVEN**; correctness, pedagogy, historical evidence and approved member grading **NOT PROVEN**.

Current `truth5` has five original formative source-investigation lessons, but no independently signed-off member assessment or authenticated longitudinal enrollment. The six other programs are represented by curriculum structures and reused foundational modules. Do not claim 247 fully published, independently taught, assessed and member-tested days.

## Research source and externally verified risk boundaries

User-authorized StocksToTrade ZIP (6) contains a QA research register reporting 300 educational research topics across 30 groups, 317 source records, zero duplicate IDs, and **zero fully completed publishable topics**. ZIP includes a private browser profile: do not extract secrets/cookies or commit source-owned media/course transcripts. Primary SEC documents distinguish acceptance/public-availability timestamps and non-guaranteed stop-order execution prices. Source trust is not a market-data feed or redistribution license.

## Remaining blockers ranked by severity

| Rank | Blocker | Required evidence |
| --- | --- | --- |
| P0 | 0/419 independent reviewed assessment versions | One authenticated Owner-editor approval per protected set after correctness and rubric QA |
| P0 | 0 authentic Founding 600 member journeys | Real account/session, cross-account isolation, save/resume, accessibility, response/error tests |
| P1 | Editorial approval workflow must write a safe, attributable reviewed lesson state accepted by the public publication gate | Owner-only API, revision CAS, audit, RLS, negative-role tests; no direct public update |
| P1 | Six additional Boot Camps not individually substantively accepted | Day-by-day original instruction and transfer, case correctness, grading, source rights and approvals |
| P1 | Master-only Stripe TEST webhook route historically failed isolated delivery | Correct signed TEST delivery into shadow ledger, retries/dupes/refunds; **no LIVE** |
| P1 | Exact-head GitHub CI and current deployed browser behavior | Completed successful relevant jobs and verified Yahoo deployment at identical commit |
| P1 | Market-data usage, replay chronology and rights | Licensed ticker/date/interval data as required; no future-bar exposure |
| P2 | Store tool/add-on sales currently fail-closed by configuration | TEST entitlement and digital fulfillment QA without prematurely enabling public sale |
| P2 | Manual WCAG 2.2 AA, backup restoration and security operations | Genuine user/device/manual audits and disaster recovery proof |

## Readiness ledger / explicit acceptance

| Workstream | Stage |
| --- | --- |
| Founding 60-Day public copy | Database contract **PROVEN**, accepted only for display alignment |
| Lab availability safety | **IMPLEMENTED**, independent CI and runtime QA open |
| 336/83 target selection | **PROVEN** IDs/data alignment; candidate selection is not editorial acceptance |
| Truth5 | **Authored**, editorial/assessment/member QA open |
| B01 Labs (20) | **Authored**, structural grading preflight PROVEN; **0 reviewed / 0 Beta Ready** |
| Remaining 399 Labs | **Not accepted**; separate stage evidence required |
| Seven Boot Camps | **0/7 Beta Ready** |
| Overall website | **NO-GO** for final member-ready acceptance, LIVE payments remain prohibited |

## Change/rollback control

Commits for this work include the guarded Store migration, rollback, SQL read-only preflight, added founder test; and the Lab publication API, its regression, and Boot Camp CI registration. Keep their GitHub commit history and verify newest `main` against the actual Yahoo Cloudflare production deployment before an Owner release verdict. There were no new LIVE prices, payment events, member records or private answer-key exports.

**Next authoritatively ordered gate:** Complete and independently review Truth5 plus exact B01 twenty authored Labs first. Then undertake Gate 2 Watchlist7 + B02. Never start B02 merely because B01 structural tests pass. When all seven programs and 336 selected Labs have individual acceptance and real Founding 600 tests, run one consolidated Owner acceptance and record its genuine GO/NO-GO result.

**Document footer:** Internal engineering acceptance evidence only; not legal or investment advice; no attorney, third-party market-data or human QA certification implied.
