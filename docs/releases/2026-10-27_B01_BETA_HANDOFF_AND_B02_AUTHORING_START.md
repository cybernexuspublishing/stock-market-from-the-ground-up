# Owner release correction — B01 beta handoff and B02 development start

| Control | Value |
| --- | --- |
| Project | The Stock Market: From the Ground Up |
| ID | SMFGU-B01-BETA-B02-START-20261027 |
| Revision | 1.0 / 2026-10-27 |
| Scope | Existing 419-Lab canonical registry; no duplicate IDs |
| Decision authority | Owner, explicitly correcting the earlier development dependency |
| B01 status | **Owner-designated Beta Candidate / beta test authorized; production member NOT accepted** |
| B02 status | **Development authorized; source teaching briefs created, full lessons and protected grading still draft** |
| Branch | `main` only |
| Payment | No LIVE transactions or provider setup changes |
| Google Drive | Not created; no assigned document ID |

## Controlling release sequence — supersedes the old B01-gates-B02 rule

**Create the educational material → test everything feasible internally → hand it to real beta members → correct issues demonstrated by beta members → verify and release to ordinary production members.**

The former statement "do not begin B02 until B01 passes production-member tests" is **superseded**. B01 beta feedback and B02 authoring may run in parallel; there is no need to hold all 419 Labs behind the first beta group.

The Owner has authorized B01 beta testing and has already granted its editorial publication decision. That project-level authorization is a distinct fact from the **per-rubric authenticated `reviewed_by` sign-off** and **actual member-test evidence** required by the protected application. The latter controls remain intact rather than faking their completion.

B01's fictional 20 numeric arithmetic cases now match exactly, the two-decimal grading defect is repaired and backed up, and the 100 choice-option integrity checks pass. This makes B01 suitable to hand off its *available guided/practice paths* to beta members. Any not-yet-authenticated protected assessment remains disabled. That limitation must be represented accurately in the beta testing instructions; do not promise beta testers a graded result until its exact version is legitimately published.

B01 production-member access is conditional on beta results and resolution of relevant defects, and must not be conflated with a Store membership simply being sellable.

## B02 canonical batch — development approved

**Exact original canonical IDs:** B02 consists of twenty already-registered Foundation Book II Lab IDs `F2-C03-L02` through `F2-C09-L03`, sort order 20006–20025. The complete single-source instructional requirements, including twenty separately authored objectives, fictional examples, guided decisions, independent transfers and learning/risk limitations, are in:

- `docs/qa/2026-10-27_B02_CANONICAL20_TEACHING_MANIFEST.json`
- `tests/test_b02_canonical20_teaching_scope.mjs`
- `.github/workflows/bootcamp-v014144.yml` — includes the B02 deterministic source contract.

These are the **development authoring briefs**, not a claim that B02's lessons or assessments have been individually reviewed, installed or graded. The existing original Lab instructions and v96 protected assessment drafts remain untouched until their substantive replacements have been authored, checked, privately backed up and independently assessed.

### Teaching work required per Lab

1. Talia provides an accessible, zero-knowledge explanation of the exact concept, with vocabulary and a calculation where applicable.
2. A real worked fictional example displays the underlying OHLC or data values and explains every step without assuming the learner has prior trading experience.
3. The learner observes a completed-bar, time-bounded example, experiments and predicts **before** any outcome reveal.
4. Feedback addresses a realistic misconception, offers a different explanation after difficulty and includes an explicit NO TRADE or NOT ENOUGH EVIDENCE decision where appropriate.
5. Guided, independent and transfer cases are **different**; no future chart bars may influence prior decisions.
6. The private assessment rubric has individually written plausible distractors, one valid keyed answer, protected arithmetic, feedback with no key echo, and justified risk-policy flags.
7. Session persistence, revision conflict, entitlement, source attribution, responsive layouts and screen-reader behavior are tested.
8. The source must clearly distinguish fictional teaching from actually licensed historical evidence; no unverified market data, order fills or replay-rights claim.

### B02 beta readiness remains a separate gate

Not yet satisfied: twenty complete lessons, protected authored rubrics with individually authenticated review, genuine test-member saved steps and rubric attempts, responsive usability and remediation results, controlled beta entitlements and QA evidence. **Do not describe the twenty briefs as twenty released B02 Labs.**

### Parallel beta operations

B01 testers should exercise their actual authorized sign-in, teaching, fictional prediction, Journal save/return and access boundaries; when protected grading becomes reviewed, test correct/wrong/scaffolded feedback, session recovery and privacy isolation. Their test reports must stay separate from synthetic CI and not be misrepresented as ordinary-member production acceptance.

No owner identity impersonation, no service-role review-state bypass, no LIVE payment, no additional paid tool, and no sitewide membership/entitlement expansion is authorized by this B02 start.

## Version history

- 1.0: Owner corrected release order; B01 beta handoff authorized; B02 20-Lab authoring launched in the canonical registry. Supersedes only the B02 blocking dependency in older Gate 1 planning documents, not protected grading or security requirements.
