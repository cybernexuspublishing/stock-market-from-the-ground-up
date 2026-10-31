# B01 / truth5 — Controlled Beta Teaching Approval
**Document ID:** SMFGU-B01-BETA-DECISION-001
**Project:** The Stock Market: From the Ground Up
**Version:** 1.0
**Decision date:** 2026-10-30
**Status:** OWNER PRODUCT APPROVAL — LIMITED UNGRADED BETA; LIVE ACCESS RELEASE NOT CERTIFIED
**Repository:** cybernexuspublishing/stock-market-from-the-ground-up
**File:** docs/releases/2026-10-30_B01_CONTROLLED_BETA_TEACHING_APPROVAL.md
**Type:** Markdown
**Google Drive:** No file created / document ID not assigned
**Dependencies:** truth5 original five-day source instruction, exact canonical 20 B01 Labs, authorized Academy entitlement checks, existing private RLS/grade services, current deployed member build.
**Purpose:** Define and approve the smallest safe beta learning scope without requiring publication-grade historical cases or official mastery.

## Decision
The Owner-delegated product scope for **Boot Camp 1, The Truth Behind the Ticker (truth5)** is hereby **approved for controlled, clearly labeled BETA evaluation of ungraded teaching content**, subject to existing authorized account access. Approval is of the **content/testing scope**, not an assertion that the latest main commits deployed, that an account has completed end-to-end testing, or that 20 Lab sets are editorially accepted.

### Allowed in beta scope
- Five days of original first-principles teaching, explicitly FICTIONAL practice cases, source verification checklists, Talia-guided explanation, formative self-checks and transfer exercises.
- Saved study reflection where existing server-owned authenticated progress/entitlement paths work. Progress must be represented accurately and fail closed on error.
- The existing canonical B01 Lab identifiers may be visible as linked **beta drafts** only when separately authorized. Their unreviewed private draft question sets must **not** become an official assessed/published Lab.
- Member feedback, corrections, accessibility and usability reporting.
- Additional ungraded source-audit activities introduced on GitHub main on 2026-10-30.

### Not allowed / deliberately deferred
- Official graded assessment, competency/mastery award, completion certificate, public general release, guaranteed trading result, authentic historical claim absent validated data/rights.
- Paid checkout changes or entitlement bypass.
- Unreviewed private B01 v97 questions or answers exposed client side, or public access to unapproved Lab content.
- Disabling CAPTCHA or relaxing RLS for acceptance.

## Technical gate to actually invite beta learners
1. Confirm all relevant exact-head CI checks pass and the production Cloudflare deployment serves the approved commit; the newer source additions are not automatically certified as deployed.
2. Test a real authorized signed-in beta account in browser: enter truth5; navigate Days 1–5; distinguish additional exercises; save an expressly disposable reflection; refresh, sign out, sign in and resume; do not overwrite existing learner entries.
3. Verify guest/restricted member denial and cross-member isolation, correct error messages and no answer-key leakage.
4. Confirm mobile and keyboard basics, and free explanations without requiring rewards currency.
5. Keep official B01 grading and certificates disabled until separate individually attributable editorial approvals and protected assessment acceptance.

### Evidence currently known
- Prior read-only production member QA checked 20 B01 content/context contracts and five truth5 read contracts: GitHub Actions run 40347586489 attempt 2. It did not prove write/resume.
- Later live write QA encountered captcha_failed before enrollment/progress persistence; fixture contracts and database audit controls passed separately: see docs/releases/2026-10-26_GATE1_ACADEMY_PERSISTENCE_B01_ASSESSMENT_CONTINUATION.md.
- B01 private v97 set shapes passed 20/20, 120 draft questions; 0/20 independently marked reviewed at that evidence snapshot. Protected graded beta is not approved.
- Subsequent 2026-10-30 source enrichment is committed, but no exact-commit deployment/member UI acceptance has been provided here.

## Exit and decision authority
- **Owner decision:** approved to beta-test **ungraded teaching content**, not public release or official grading. Product requirements need no further broad curriculum expansion to begin controlled guided-learning QA.
- **Release acceptance:** OPEN until the five technical checks above are evidenced. A reviewer should record CI run URL, Cloudflare commit hash, QA account/role (not credentials), dated session logs, issues and retest results.
- **Graded B01 eligibility:** separate decision after 20/20 specific instruction and private assessment editorial records and protected QA.

## Revision history
| Version | Date | Change | Status |
| 1.0 | 2026-10-30 | Restricted five-day ungraded content beta product approval with explicit release and grading gates | Owner product approval; technical gate open |

Footer: Crown & Lantern Press / Cyber Nexus. Controlled educational beta, not financial advice or official trading certification.
