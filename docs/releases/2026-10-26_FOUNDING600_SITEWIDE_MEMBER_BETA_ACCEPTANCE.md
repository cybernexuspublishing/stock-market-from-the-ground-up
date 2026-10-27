# Founding 600 — Sitewide Member Beta Acceptance Program

## Document control

| Field | Value |
| --- | --- |
| Project | The Stock Market: From the Ground Up |
| Publisher | Crown & Lantern Press / Cyber Nexus |
| Source / location | GitHub `cybernexuspublishing/stock-market-from-the-ground-up`, `main`, `docs/releases/` |
| Filename / type | `2026-10-26_FOUNDING600_SITEWIDE_MEMBER_BETA_ACCEPTANCE.md` / Markdown |
| Document ID | GU-F600-BETA-ACCEPTANCE-20261026-V1 |
| Version / date | 1.1 / October 27, 2026 (original signoff October 26) |
| Status | OWNER SIGNED OFF: ALL 7 BOOT CAMPS AND ALL 419 LAB IDS AUTHORIZED FOR CONTROLLED FOUNDER BETA TEST SCOPE; INDIVIDUAL CONTENT/PRODUCTION ACCEPTANCE OPEN |
| Google Drive location | Not assigned; GitHub is the current authoritative record |
| Google Drive file ID | Not assigned; no Drive file created |
| Purpose | Ensure all existing member-facing features receive authentic Founding 600 beta testing before public acceptance, with demonstrable defect remediation and security evidence |
| Dependencies | Founders Commons v0.14.0.174–.189; member dashboard/support and account APIs; 419 canonical Labs; seven Boot Camp programs; 30 canonical competencies; frozen Founding 600 prices and benefits; Cloudflare Pages, Supabase, Stripe TEST; existing safety and legal gates |
| Exclusions | Never activate LIVE checkout, change the 600-seat cap, change established prices/discounts, impersonate users, award mastery from ungraded content, add an in-site trading simulator, or grant additional permanent entitlements as a side effect of testing |

## 1. Controlling operating decision

All verified, currently entitled Founding Standard (30-Day) and Founding Extended (60-Day) beta members constitute the primary user-test cohort for **every member-facing workflow**, not merely the learning curriculum. Their participation is not proof of acceptance, and their permanent founder number does not itself establish a valid paid entitlement. Production gates remain controlling.

**Frozen plan terms:** exactly 600 shared places; $49.99 per 30 days and $59.99 per 60 days, renewing until cancelled; separate eligible-purchase benefits 10% Standard and 15% Extended, subject to established qualification rules. Purchased Crownlight Sparks do not expire. No LIVE payment testing or activation without separate Owner authorization.

## 2. Existing tooling reused, not duplicated

The existing protected `founders-commons.html` is the tester coordination hub. Members report defects using `market-commons.html?forum=F600_BUGS`, suggest improvements using `F600_SUGGESTIONS`, and use `dashboard.html?tab=support` for private billing/account/security matters. The Founders Commons issue tracker communicates triage and verified release state. The existing Owner Admin tools remain authoritative for support, issue management, content approval and release gates.

The sitewide beta center added October 26 gives nine member-facing navigation/test workflows, a reproducible report checklist, and privacy guidance. The UI remains inside founder-authorized content, but **server-side membership access and database RLS** are the security boundary.

## 3. Nine member acceptance workstreams

| ID | Member feature family | Required user acceptance evidence | Source status as of this document |
| --- | --- | --- | --- |
| M-01 | Account and security | Sign in/out, recovery, email confirmation, session expiry, profile privacy, restricted-user and direct-link denial, safe redirect | Actual multi-account browser acceptance outstanding; Owner reports normal login working |
| M-02 | Dashboard and navigation | Correct entitlement display, persistent navigation, keyboard/mobility and 390px/1280px UI, correct link targets | Source exists; complete member acceptance open |
| M-03 | Books and purchases | Library, Book Key redemption, separate-book isolation, purchase history and refund visibility; no unauthorized purchase | Source exists; full member/provider read-after-write open |
| M-04 | Labs, Talia and grading | Teach-before-test; approved nine-stage flow; answer input; graded-assessment separation; retries; rubric review; 419 individually accepted items | 419 active Labs; grading version drafts and historical evidence require independent acceptance |
| M-05 | Boot Camps and skills | All seven Academy programs at their approved release states; save/resume; 30 competencies, independent four-dimensional evidence; no fabricated mastery | Catalog and source implementation exist; member readiness and editorial review open |
| M-06 | Educational tools | Journal, Market Tutor and authorized read-only trading tools; source labels, pricing/access, export/data deletion and no live-trading claims | Source exists; genuine member/provider acceptance open |
| M-07 | Community and safety | Founders Commons/Market Commons posts, report/appeal, moderation, votes, privacy, tier-specific council access, XSS and cross-account isolation | Existing forums and issue tracker reused; browser/security acceptance open |
| M-08 | Membership and benefits | Exactly 600-seat cap, Standard/Extended billing terms, earned discounts, Sparks spending order, certificates, cancellations, entitlements and refunds | DB release remains closed; TEST results are partial; LIVE disabled |
| M-09 | Support and accessibility | Support create/list/reply/reopen, owner response, notification, keyboard/focus/screen-reader operation, responsive display, meaningful error messages | Existing private Support API is in source; authenticated browser acceptance open |

## 4. Mandatory test roles, not a new privileged beta role

Run each applicable workflow from the following independent sessions: founder Standard, founder Extended, ordinary Free, member with access to a different book, suspended/restricted member, Showcase/test account, unauthenticated visitor, and authorized Owner. Use two *different* member identities to test private-record isolation. A tier may test only functions it is entitled to use. If full feature testing requires temporary QA-only grants, authorize a separately auditable **time-bounded, noncommercial entitlement** in the existing entitlement infrastructure; never silently convert a testing grant into a permanent founding benefit or use production live charges for the purpose.

No production beta account is to be silently created or allocated a founding seat for a browser fixture. A passing mock or sandbox test remains distinct from a real human-authenticated experience.

## 5. Required defect reporting and lifecycle

A complete non-sensitive report records: feature/page and Lab ID where applicable; reproduction steps; expected result; observed result; device/browser; recurrence; and impact. Private account data, credentials, invoices, answer keys and full auth tokens must never go into Commons. Use the authenticated private Support system for member-specific issues.

Severity: **P0** identity crossover, payments, data loss, unauthorized access or false competence award; **P1** broken core member journey; **P2** usable but incorrect or inaccessible feature; **P3** copy, clarity, or cosmetic quality defect. P0 requires narrowly containing the directly affected unsafe workflow (and keeping LIVE payment shutdowns intact), while unaffected authorized beta activities continue. Reproduction, root-cause determination, code fix, regression test and authentic member retest must be linked to the existing issue before it is marked **Member Verified**; mere merge or source CI is not member verification.

Use the existing issue states (Submitted, Under Review, Accepted, In Development, Released, Deferred or Declined); do not create a duplicate parallel tracking ledger.

## 6. Acceptance and launch gates

1. **Source and exact-head CI:** supported regression suites pass against the same source SHA. Cancelled, queued, mocked or stale checks are not evidence of production acceptance.
2. **Provider and security isolation:** Supabase read-only grants, RLS, entitlement and session tests; Cloudflare routing/Functions availability; Stripe TEST signed-event provenance and reconciliation; no premature LIVE.
3. **Actual user journeys:** one qualified Standard and one Extended authenticated member; two distinct real user identities; mobile 390px and desktop 1280px, keyboard and appropriate screen-reader checks; saved data persists and remains private.
4. **Educational authenticity:** instructional content and topic-specific rubrics reviewed; no "Not Yet Assessed" advancement without approved evidence; no invented historical bars or trading results.
5. **Founder commerce:** provider-backed 30/60-day TEST lifecycle, 600-seat boundary, renewal/failure/cancellation/refund, all six benefits and discounts; legal review of recurring terms and cancellation.
6. **Production evidence:** the correct Cloudflare master origin serves actual protected Functions, code version, founder access, Support, private Labs and nonpayment flows; a tester independently confirms defect fixes. The Owner alone approves any later LIVE payment launch.

## 7. Current observed evidence (October 26, 2026)

- Read-only production Supabase: **419 active canonical Labs; 30 active competencies; 439 draft grading-set versions; 0 reviewed grading sets; 0 existing founder-member records; 0 founder reservations.** The 439 rows are versioned grading sets, not a count of unique Labs.
- Founders Commons: **8 active forums; 32 published official starting topics**. Official topics `F600_OFFICIAL_V1_02` and `_22` previously showed the obsolete 20% Extended benefit; a narrowly guarded migration updated both to 15%. Independent read-only postflight verified both corrected.
- New member UI: private Sitewide Beta Test Center in existing Founders Commons; nine member workflow cards; existing issue, suggestion and private Support destinations; capacity clarified as **maximum 600**, not 600 enrolled.
- Tests: the existing Founders Commons browser regression has been extended for denied/Standard/Extended roles and mobile/desktop widths, and the existing Founding 600 member-browser CI now includes it. **CI and real-member results require separately confirmed finished runs.**
- No payment, enrollment, fulfillment, grading review or launch flags were enabled as part of this increment.

## 8. Next backlog order

**Immediate:** Finish exact-head CI; verify master-site deployed revision; complete a real founder/ordinary-member/Owner session and permission-isolation matrix; triage P0 and P1 failures. **Parallel:** review independent grading rubrics and Talia remediation; Book/Library and Tool entitlements; Support/Commons quality; 390px and 1280px usability. **Before beta charge:** finish isolated Stripe TEST master webhook, service cancellation path, founder-term consent and six-benefit reconciliation. **Never substitute** QA checkmarks for evidence or change the protected Lab layout without approval.

## Revision history

| Version | Date | Revision | Acceptance status |
| --- | --- | --- | --- |
| 1.0 | 2026-10-26 | Sitewide founding-member beta standard, nine-module matrix, guarded official discount correction and unified existing member feedback workflows | Operating standard established; source and member QA pending |

**Footer:** Crown & Lantern Press / Cyber Nexus — Internal release engineering and beta acceptance. This is not financial, investment, or legal advice. Live payment activation remains Owner-controlled.

## Founding 600 iterative beta status — Owner clarification (October 26, 2026)

This is a **member testing and improvement program**. It is not subject to an overall pass/fail launch designation at every checkpoint. Existing beta accounts and legitimate time-bounded QA tool grants should be able to evaluate any workflow for which they are genuinely authorized. An unreviewed answer bank must not be represented as graded mastery; that does not prevent appropriately labeled ungraded instruction or member bug reporting.

The operational statuses are:
| Beta status | Owner meaning |
| --- | --- |
| Available for Beta Testing | The specific authorized member journey is open for controlled evaluation. |
| Testing in Progress | Actual beta member or targeted test evidence is being collected. |
| Improvement Required | A reproducible defect, content gap or accessibility issue requires correction. |
| Fix Implemented | Source/runtime correction exists and needs verification by the appropriate tester. |
| Member Verified | A genuine signed-in tester demonstrated the corrected behavior with retained evidence. |
| Beta Accepted | That individual feature completed its beta acceptance criteria, including authorization and negative-role checks. |

Record technical evidence separately as IMPLEMENTED, TESTED, and PROVEN; record curriculum readiness separately using the canonical seven-stage learning-content progression. No label in this table certifies an untested learning result, unrelated payment lifecycle, or private member-data isolation. Audit evidence remains immutable. Repeat testing after material changes and keep a transparent actionable issue queue.

Only a demonstrably unsafe *affected* workflow may be temporarily contained while a repair is made; do not stop the 600-member beta program or freeze unrelated Labs, Academy activities, Support, Journal, or community testing because another item is still under review. This is an operational prioritization change, not a relaxation of the Owner's prohibition on LIVE transactions or requirements for real login, CAPTCHA, RLS, licensing, answer protection, or market-evidence provenance.

**Reporting standard:** Replace any blanket beta verdict in current status summaries with per-workstream current capability, access requirements, tested version, bug severity, repair state and genuine member verification evidence.

## Continuous development releases — latest Owner instruction (2026-10-26)

**Owner-approved release practice:** Publish working portions of the unified platform continuously to the existing connected Yahoo production site, with honest in-feature labels such as guided/ungraded beta, in development, testing, or improvement required. Do not postpone a usable feature solely until every Lab, Boot Camp, rubric, or member-verification activity is complete. The Owner will conduct human Founding 600 testing and provide findings when available; engineering, safe rollouts and defect repair proceed independently in the meantime.

**Implemented directly on main:**
- Existing `/labs.html` uses `assets/js/labs.js`. That active registry now separately verifies the canonical Owner-approved 336/83 scope; if only the optional publication-status listing is unavailable, it offers a *navigation-only* study-access check for verified candidates while preserving 83 Upcoming/no Start. The independent `/api/lab-content` or `/api/lab-player-context` still enforces the member account, active status, entitlement and private-instruction boundary. No assessment result is inferred.
- The alternate `assets/js/lab-registry.js` also keeps verified candidate links navigable during a release-status read error. Its private progress lookup now degrades to "unverified" instead of concealing the collection. Do not claim this alternate renderer is what `/labs.html` executes; the active renderer is `assets/js/labs.js`.
- `/dashboard.html?tab=beta` is the new, existing-Dashboard-based Beta Testing Workspace. It contains real links to Lab Registry, all seven authorized Academy routes, Journal, Tutor, Skills, Market Commons, trading research workbench, Store and private Support. It reads existing release APIs independently so a single optional service outage cannot remove the rest of the beta navigation. The actual destination always verifies entitlement and permissions.
- Regression coverage: `tests/test_beta_partial_release_registry.mjs`, `tests/test_active_lab_beta_resilience.mjs`, `tests/test_continuous_beta_releases.mjs`, wired into the existing Boot Camp GitHub Actions job. These are engineering tests, not fabricated authenticated member evidence.

**Release ledger:** Code implemented and committed; successful exact-head CI and successful matching Cloudflare deployment must be checked separately. A queued deployment is not a successful runtime release. If one build fails, repair that issue while unrelated beta development continues. This Owner direction is not a license to bypass authentication/Turnstile, break row isolation, publish private keys/answer sets, invent market history, award grades on reflections, activate LIVE payments or put the 83 Upcoming Labs into Start.


## Owner release authorization — October 26, 2026: all 7 Boot Camps and 419 Labs

The Owner explicitly signs off on **all seven Boot Camp programs and all 419 canonical Lab identifiers FOR FOUNDING MEMBER BETA TESTING**. This replaces any interpretation of "0/7 accepted" or "0/419 accepted" as a prohibition on *testing*. The whole catalog is eligible for discovery, access checks, navigation, accessibility review, broken-link reporting and usability feedback by authorized beta members.

**Two independent statuses are required and cannot be conflated:**

| Dimension | Boot Camps | Canonical Labs | Interpretation |
| --- | ---: | ---: | --- |
| Owner authorized for controlled Founding Member beta testing | 7 / 7 | 419 / 419 | Owner has approved inclusion of every existing program and canonical Lab ID in the test program. |
| Editorially and assessment verified / technical QA passed / production member tested / Beta Ready | Per-item evidence pending | Per-item evidence pending | Owner authorization alone is not evidence of content completeness, grading validity or genuine member progress. |

**Operational interpretation:**

1. Existing seven Boot Camp routes and the 419-ID Lab registry are in scope for the designated member testing cohort. Founders Commons and private Support are the established feedback paths. Do not create another beta dashboard or permission system.
2. A Lab that has substantive authorized teaching and passes server-side account/entitlement checks may offer **ungraded Guided Beta instruction**. If a Lab does not yet have appropriate instructional content, members can still evaluate its listing and report content/access defects, but the system must not manufacture a lesson, pretend an assessment is reviewed, or allow unsupported earning of credit.
3. The current release scope still contains **336 teaching candidates** and **83 Upcoming** IDs. This is a source/content progression, not an exclusion of the 83 from catalog testing. The Owner's testing authorization does **not** silently grant an unreviewed Lab a Start or graded-assessment path. If the Owner separately authorizes authored learning for the 83, implement it individually with real source material and relevant regression evidence rather than toggling everything indiscriminately.
4. Official graded assessments require individual rubric review, protected server grading, correct identity/entitlement and recorded evidence. A Guided Beta exercise, skipped/revealed answer or ungraded reflection never awards official mastery.
5. Existing member attempts and all canonical IDs remain unchanged. No LIVE payments, paid external tools, bypassed Turnstile/Auth, data migrations or permanent entitlement grants are authorized by this sign-off.
6. In Admin and engineering reports, track **owner beta-testing authorization** separately from **test execution, editorial review and product acceptance**. Do not use "GO" to imply an unexecuted browser or member test passed.

**Owner business acceptance:** GO to include 7/7 Boot Camps and 419/419 Lab IDs in the controlled Founder beta test program. **Engineering/content release acceptance:** evidence-based per-item progression remains open. The beta cohort, rather than Owner-level access, performs genuine member-facing experience tests.

## October 26 follow-through: privately authored remaining 83 Site-Exclusive Labs

Following the Owner's authorization to test all 419 canonical Labs, the previously unstarted Site-Exclusive IDs `SITE-018`–`SITE-100` were authored as original, topic-specific **nine-stage ungraded educational drafts** in the **existing private `lab_instruction_v014`** storage. The source import was verified directly against Supabase: 83/83 records, 83/83 nine-stage arrays, 83/83 official source-link arrays, **zero** review attributions and no new graded sets. These are not copied book manuscripts, certified actual history, or trade recommendations.

The earlier 336/83 classification remains a canonical **development-scope** selection, not a permanent ban on practice. The additional 83 are now independently eligible for Guided Beta when (and only when) the existing member account, training entitlement, complete private instructional source and release availability service all verify successfully. The active Lab registry uses those verified IDs. If one is unavailable or the service cannot verify it, the account must receive a safe, honest denial and be able to report a bug.

The original 419 canonical IDs, private grading restrictions, member progress, sold product entitlements and all seven Boot Camp programs remain unchanged. Official assessment questions, independently reviewed answer keys and mastery credit remain **unreleased** for the newly authored 83. A member's ungraded Guided Beta completion never becomes an official competency score.

**Implementation:** `supabase/migrations/v0.14.0.294_site_exclusive_private_instruction_book6.sql`, `functions/_lib/site-exclusive-private-lesson-v014294.js`, existing `functions/api/{lab-content,lab-player-context,lab-release-availability}.js`, official private audit event `admin_audit_log.id=74`. Details, topic inventory and guarded rollback: `docs/releases/2026-10-26_SITE_EXCLUSIVE_83_GUIDED_BETA_AUTHORING.md`.

**Release evidence remains separate:** Authored 83/83; source-contract tested on specific GitHub Actions commits; provider deployment checked against source SHA; independent per-Lab editorial review and authentic beta-member journey evidence remain to be collected. Owner GO for controlled testing remains in force.


## October 27 Owner reaffirmation — authentic member tests performed by the Founding 600

The Owner explicitly confirms **Founding 600 beta participants themselves** perform the real authenticated Free Foundations and other member-facing acceptance journeys during the controlled beta. No Owner impersonation and no fabricated Auth browser sessions are required before inviting eligible testers.

**Controlled beta entry:** ensure technically safe source, deployment, legitimate Turnstile/Auth, privacy/RLS, entitlements, progress persistence, appropriate test instructions, and fail-closed Draft grading for the paths made available. No completed future beta journey is required as an entry prerequisite.

**Participant execution:** using their own valid accounts and correct plans, founding testers cover Free onboarding, Talia educational lessons, correction and retries, fictional no-trade exercises, watchlist and Journal saves and limits, sign-out and new sign-in, multi-session resume, accessible/mobile presentation, entitlement denials and account isolation. Collect privacy-safe defect and acceptance evidence, with per-scenario expected/actual result, date, build SHA, role and platform, and retest after fixes. A passing fixture is not a real participant test.

**Protected grading:** the Owner must separately review each exact B01 rubric through authenticated authorized private editor action before testers can receive an official score for it. Ungraded Guided/Practice may be tested while rubric review remains pending. Never bypass Turnstile or release private draft keys, grant false mastery or create LIVE payment activity.

**Final acceptance:** beta participation alone does not prove an individual feature passed. Require executed observations and resolved defects. Distinguish testing authorization, test execution, reviewed assessment publication and final product acceptance.

Status: Founding 600 cohort authorized for controlled beta scope; human journey execution assigned to cohort but NOT YET ACCEPTED; B01 formal rubric Owner approval remains separate. Revision: v1.1 — October 27, 2026.
