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
| Founding 600 beta testing | **ACTIVE DEVELOPMENT AND CONTROLLED MEMBER TESTING** on authorized workflows; full sitewide acceptance remains individually unverified; LIVE payments remain disabled |

## Change/rollback control

Commits for this work include the guarded Store migration, rollback, SQL read-only preflight, added founder test; and the Lab publication API, its regression, and Boot Camp CI registration. Keep their GitHub commit history and verify newest `main` against the actual Yahoo Cloudflare production deployment before an Owner release verdict. There were no new LIVE prices, payment events, member records or private answer-key exports.

**Next development and beta-evidence sequence:** Continue substantive Truth5/B01 teaching, independent grading reviews and authenticated member trials while fixing shared-platform and other approved beta features in parallel. Carry each Boot Camp and Lab toward its own evidence-based acceptance; do not count draft assessments as mastery. Complete the seven-program / selected-336 roadmap, then publish one consolidated Owner evidence report by individual feature status, defect severity and remaining member-verification tasks. Beta iteration is never assigned a blanket binary launch verdict.

**Document footer:** Internal engineering acceptance evidence only; not legal or investment advice; no attorney, third-party market-data or human QA certification implied.

## Owner override: keep guided practice available (October 26, 2026)

The Owner rejected treating pending release acceptance as a stop-work order or a reason to withhold otherwise usable guided practice. This decision supersedes the preceding blanket practice-opening restriction while keeping existing authentication, privacy, grading and LIVE-payment safety rules.

**IMPLEMENTED on main:** The existing Lab release-availability endpoint now returns original authored B01 ungraded `guidedBetaIds` separately from formally approved `publishedIds`. Only Labs in the selected 336, with active registry status, exact original authored B01 metadata and substantive study steps qualify. The UI opens those lessons with an explicit ungraded beta practice label; progress and official reviewed assessments retain their own authorization. There are no new public answer-key or private lesson responses.

**PROVEN read-only source evidence:** Production Supabase contains 20 matching authored B01 private lessons (15 Book I, five Book II) with meaningful study structure, and 74 additional private instructional rows without that authored-batch evidence. The separate content API still enforces normal authenticated matching book/tool access. The 83 intentionally Upcoming Labs remain unavailable for Start.

**IMPLEMENTED test:** Existing beta publication regression now checks original authored guided practice, exclusion of the 83, nonpublication of private lesson details, and refusal to award unreviewed graded progress. CI and authentic member runtime tests remain pending; no source test is being called a production proof.

**Owner technical disposition:** Do not stop development or founder guided testing while rubric/editorial approval is pending. Preserve the separate official reviewed assessment gate and keep LIVE Stripe payment switches disabled. No member data or credentials changed.

## Continuation: usable tester entitlement and private Support (October 26, 2026)

**Roles:** Acting Owner, backend and frontend engineer, database security reviewer, educational QA, UX/accessibility reviewer and beta-program manager.

**Actual research finding, PROVEN from read-only Supabase:** The 336 selected beta Labs have 94 substantive private instructional rows and 242 distinct substantive canonical narratives. Zero of the selected 336 are without both source types. These numbers mean *candidate learning material exists*, not that teaching has been editorially reviewed, visually validated or member tested. The 83 remainder retain Upcoming status. At verification the private table had 0 independently reviewed grading sets and the Academy had 0 genuine enrollments.

**High-priority defect:** The Admin account editor could already issue a protected, audited ONDEMAND_TRAINING pass, but the individual private B01 teaching endpoint only recognized matched book grants and limited founding-plan history. No genuine founder accounts/paid cycles were present. Eligible beta testers therefore could have access to the educational tool while the original B01 authored lesson remained book-gated. We reused the existing Admin Account Management `gu78_admin_account_resource_grant` RPC rather than creating another entitlement system.

**IMPLEMENTED:** `assets/js/account-management-entitlements-v01478.js` exposes an Owner-only 30-day Guided Learning Beta Access button for an *existing real member* (no synthetic/Showcase grants), calling the existing audited `grant_resource` operation with `ONDEMAND_TRAINING`, valid expiration, and QA-specific provenance. `functions/_lib/founding-beta-learning-access.js` verifies genuine time-bounded manual passes by querying fresh server-only entitlement rows and the current Owner issuer role before opening original B01 book-aligned instructional content. The existing `functions/api/lab-content.js` still validates real identity, member status, entitlement, authored B01 content and assessment noncredit. This QA grant does not purchase or provide founder status, textbook ownership, discounts, Sparks, subscription payment or graded mastery.

**PROVEN database security:** The existing QA grant RPC is callable only by service_role (not anon/authenticated), the ONDEMAND_TRAINING tool is active with paid checkout disabled, and its writes are Owner-audited. Exactly 0 QA passes had been issued at verification, and the founder enrollment, billing and fulfillment release controls remain disabled. No unapproved role assignments or phantom beta accounts were created.

**IMPLEMENTED Support repair:** `dashboard.html?tab=support` previously advertised a member Support route but `assets/js/dashboard.js` did not honor the tab. The existing Support API already provided private ticket creation, listing, detail, reply and reopen. A member-only `assets/js/member-support-panel.js` now calls those real endpoints, validates current session identity, scrubs sensitive content on account switch, creates DOM through `textContent` rather than arbitrary HTML and offers accessible error feedback. `dashboard.html` and `assets/css/member-support-panel.css` provide responsive fields and keyboard focus. `lab-player.html` and `assets/js/lab-player.js` link directly into the private report form with a validated canonical Lab identifier. No duplicate Support database or outsourced paid service was added.

**Security correction:** The original Support caller accepted an authenticated synthetic Showcase/test account without a verified real member profile. It now requires `profiles.account_kind='member'` before any support-row access, while retaining support for genuine suspended members seeking appeal. Supabase independently confirms `support_tickets` and `support_ticket_messages` are RLS protected and deny direct anon/authenticated SELECT/INSERT; the existing server service applies `requester_user_id` and excludes internal messages.

**Reliability correction:** The Support create route performs the required ticket insert, then a separate optional conversation mirror insert. Previously a failure of the second step could return HTTP 503 although the first ticket persisted, encouraging duplicates. It now truthfully returns HTTP 200 with `initialMessageRecorded=false` and a notice when the ticket is durable but mirroring failed. The member UI displays the original saved description if no conversation rows exist. No retry issues an automatic second ticket. Work remains to evaluate an atomic database RPC rather than the two existing calls for future higher-volume use.

**IMPLEMENTED regression coverage:** `tests/test_f600_guided_qa_access.mjs`, `tests/test_member_beta_support_surface.mjs`, `tests/test_support_partial_create_resilience.mjs`, and updates to `tests/test_v014157_support_security.mjs` and `tests/test_v014160_d17_support_authorization.mjs`. The existing Boot Camp CI workflow invokes new tests and syntax checks. CI completion, Chromium widths, authentic Owner issuance, authentic member use, distinct-member privacy and cross-session persistence remain independently open; no source test is labeled PROVEN.

**Owner decisions:** Accepted as IMPLEMENTED for the isolated new guided QA workflow and corrected private Support path. Not declared full Beta Ready or production member tested. Keep building and supporting beta practice instead of freezing the site for draft assessment review. Official reviewed grading, safe Auth, 83 Upcoming labs and all LIVE payment shutdowns remain independent safety constraints.

**Owner action using existing UI, not a new credential request:** An authenticated Owner can open Admin → Account Management → an existing real beta member → Manage All Account Entitlements → Authorize 30-Day Guided Beta Access. Record the resulting successful grant readback. Then sign in as that separate member, open Labs and Academy, record and resume work, submit a support report and ensure another member cannot read it. Do not type account credentials in public bug reports or grant Founder financial benefits for these QA passes.

## Current Owner policy — iterative Founding 600 beta classification (2026-10-26)

**Controlling correction:** Founding 600 tester access is an ongoing development, instruction, feedback, remediation and verification process. A missing member acceptance record is **not** a stop-work instruction, nor a reason to impose a blanket binary verdict on the entire beta. Any older binary wording in historical engineering snapshots is superseded for *current beta operations*, without rewriting the underlying test results or authorizing LIVE financial activity.

Record every member-facing item using the most specific supported status: **Available for Beta Testing**, **Testing in Progress**, **Improvement Required**, **Fix Implemented**, **Member Verified**, or **Beta Accepted**. Keep the separate technical evidence label **IMPLEMENTED**, **TESTED**, or **PROVEN** and the seven-stage individual educational acceptance progression unchanged. These dimensions must not be conflated: beta-accessible material is not automatically assessment-verified, and a deployment is not automatically a genuine member test.

For a material P0 defect (cross-account exposure, data loss, unsafe assessment award, payment/identity compromise), temporarily contain only the impacted workflow while repairs and testing of unaffected systems continue. Continue offering other properly authorized beta features; disclose limitations accurately. Retain server-enforced authentication/entitlements, CAPTCHA/Turnstile, protected answers, member isolation, market-data provenance, the 83 explicitly Upcoming Labs and the existing LIVE payment shutdowns. These are non-negotiable behavioral controls, not launch-label rhetoric.

**Current evidence carried forward:** 336 selected Labs have available instructional source coverage (94 substantive private records plus 242 substantive canonical narratives). This supports controlled, ungraded study candidates; it does not demonstrate 336 fully completed instructional products or confer graded mastery. Current genuine-member tests, boot-camp completion, protected rubric review, responsive device checks and provider-backed lifecycle tests continue to accrue evidence independently.

**Acceptance reporting requirement:** State what members can actually open today, what they can do end to end, any known limitations, issue owner and next test. Present counts for individually Beta Accepted Labs and Boot Camps, but never replace open engineering work with a platform-wide binary restriction.
