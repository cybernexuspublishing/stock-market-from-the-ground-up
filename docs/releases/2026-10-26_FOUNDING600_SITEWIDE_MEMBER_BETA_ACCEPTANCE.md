# Founding 600 — Sitewide Member Beta Acceptance Program

## Document control

| Field | Value |
| --- | --- |
| Project | The Stock Market: From the Ground Up |
| Publisher | Crown & Lantern Press / Cyber Nexus |
| Source / location | GitHub `cybernexuspublishing/stock-market-from-the-ground-up`, `main`, `docs/releases/` |
| Filename / type | `2026-10-26_FOUNDING600_SITEWIDE_MEMBER_BETA_ACCEPTANCE.md` / Markdown |
| Document ID | GU-F600-BETA-ACCEPTANCE-20261026-V1 |
| Version / date | 1.0 / October 26, 2026 |
| Status | OPERATING STANDARD ESTABLISHED; FIRST SOURCE IMPROVEMENTS COMMITTED; AUTHENTIC MEMBER ACCEPTANCE OPEN |
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
